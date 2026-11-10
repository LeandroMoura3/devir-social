-- Devir Social — migração 0021 (regras v0.14, continuação): unicidade só de WhatsApp confirmado.
--
-- Problema da 0019/0020: um pedido pendente (ou o contato autodeclarado de um membro) com o WhatsApp ou o e-mail
-- de outra pessoa fazia o pedido verdadeiro dela ser ignorado. Agora:
--   • pedidos pendentes repetidos entram todos na fila (a coordenação vê o aviso e quem responder é o dono);
--   • só bloqueia pedido novo o e-mail que já é de uma conta ou o WhatsApp já confirmado num pedido aprovado;
--   • o WhatsApp confirmado fica guardado só como HMAC (calculado no servidor com o segredo do app, que o banco
--     não conhece), para durar além dos 30 dias sem guardar o número. Se o segredo mudar, a lista recomeça.

alter table public.pedidos_convite add column whatsapp_hash text;

create table public.whatsapps_confirmados (
  hash text primary key,
  confirmado_em timestamptz not null default now(),
  pedido_id bigint references public.pedidos_convite (id)
);
alter table public.whatsapps_confirmados enable row level security;
revoke all on public.whatsapps_confirmados from anon, authenticated;

create or replace function public._limpar_pedidos_convite()
returns void
language sql security definer set search_path = ''
as $$
  update public.pedidos_convite
     set situacao = 'recusado', motivo = 'expirado', decidido_em = now()
   where situacao = 'pendente' and criado_em < now() - interval '30 days';
  update public.pedidos_convite
     set nome = null, email = null, whatsapp = null, whatsapp_hash = null, como_conheceu = null,
         origem_hash = null, anonimizado_em = now()
   where anonimizado_em is null and decidido_em < now() - interval '30 days';
$$;

drop function public.pedir_convite(text, text, text, text, text, text);
create function public.pedir_convite(
  p_segredo text, p_nome text, p_email text, p_whatsapp text, p_como_conheceu text, p_origem_hash text,
  p_whatsapp_hash text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  email_limpo text := lower(trim(coalesce(p_email, '')));
  digitos text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Pedido não autorizado';
  end if;
  perform public._limpar_pedidos_convite();

  if char_length(trim(coalesce(p_nome, ''))) not between 2 and 80 then
    raise exception 'Informe seu nome (de 2 a 80 caracteres).';
  end if;
  if email_limpo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(email_limpo) > 200 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if char_length(digitos) not between 10 and 15 then
    raise exception 'Informe um WhatsApp com DDD.';
  end if;
  if char_length(coalesce(p_como_conheceu, '')) > 300 then
    raise exception 'O campo "como conheceu" aceita até 300 caracteres.';
  end if;
  if coalesce(p_whatsapp_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Pedido não autorizado';
  end if;

  if (select count(*) from public.pedidos_convite
       where origem_hash = p_origem_hash and criado_em > now() - interval '1 hour') >= 3
     or (select count(*) from public.pedidos_convite
          where origem_hash = p_origem_hash and criado_em > now() - interval '1 day') >= 10
     or (select count(*) from public.pedidos_convite where criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitos pedidos agora. Tente de novo mais tarde.';
  end if;

  -- Mesma resposta de sucesso quando o e-mail já é de uma conta ou o WhatsApp já foi confirmado.
  if exists (select 1 from auth.users where lower(email) = email_limpo)
     or exists (select 1 from public.whatsapps_confirmados where hash = p_whatsapp_hash) then
    return;
  end if;

  insert into public.pedidos_convite (nome, email, whatsapp, whatsapp_hash, como_conheceu, origem_hash)
  values (trim(p_nome), email_limpo, digitos, p_whatsapp_hash, nullif(trim(coalesce(p_como_conheceu, '')), ''),
          p_origem_hash);
end;
$$;
revoke execute on function public.pedir_convite(text, text, text, text, text, text, text) from public;
grant execute on function public.pedir_convite(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.decidir_pedido(p_id bigint, p_decisao text, p_detalhe text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pedido public.pedidos_convite;
  vagas record;
  mais_antigos int;
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  select * into pedido from public.pedidos_convite where id = p_id for update;
  if pedido.id is null or pedido.situacao <> 'pendente' then
    raise exception 'Este pedido já foi decidido. Recarregue a página.';
  end if;

  if p_decisao = 'aprovado' then
    if p_detalhe not in ('whatsapp', 'conhecido') then
      raise exception 'Forma de confirmação inválida';
    end if;
    if p_detalhe = 'whatsapp' and exists (select 1 from public.whatsapps_confirmados where hash = pedido.whatsapp_hash) then
      raise exception 'Este WhatsApp já foi confirmado em outro pedido aprovado. Recuse como "já tem conta".';
    end if;
    select * into vagas from public.vagas_de_entrada();
    select count(*) into mais_antigos from public.pedidos_convite
     where situacao = 'pendente' and (criado_em, id) < (pedido.criado_em, pedido.id);
    if vagas.usadas + mais_antigos >= vagas.limite then
      raise exception 'Sem vaga para este pedido neste ciclo: % de % vagas usadas e % pedido(s) mais antigo(s) na fila. Decida os mais antigos primeiro ou espere o próximo ciclo.',
        vagas.usadas, vagas.limite, mais_antigos;
    end if;
    update public.pedidos_convite
       set situacao = 'aprovado', forma = p_detalhe, decidido_em = now(), decidido_por = auth.uid()
     where id = p_id;
    if p_detalhe = 'whatsapp' and pedido.whatsapp_hash is not null then
      insert into public.whatsapps_confirmados (hash, pedido_id) values (pedido.whatsapp_hash, pedido.id);
    end if;
  elsif p_decisao = 'recusado' then
    if p_detalhe not in ('nao_respondeu', 'identidade_nao_confere', 'ja_tem_conta', 'pedido_invalido') then
      raise exception 'Motivo de recusa inválido';
    end if;
    update public.pedidos_convite
       set situacao = 'recusado', motivo = p_detalhe, decidido_em = now(), decidido_por = auth.uid()
     where id = p_id;
  else
    raise exception 'Decisão inválida';
  end if;
end;
$$;

-- Fila da coordenação, com aviso de outros pedidos pendentes com o mesmo WhatsApp ou e-mail.
drop function public.pedidos_convite_admin();
create function public.pedidos_convite_admin()
returns table (
  id bigint, nome text, email text, whatsapp text, como_conheceu text, criado_em timestamptz,
  situacao text, forma text, motivo text, decidido_em timestamptz, convidado boolean,
  mesmo_whatsapp int, mesmo_email int
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  perform public._limpar_pedidos_convite();
  return query
    select p.id, p.nome, p.email, p.whatsapp, p.como_conheceu, p.criado_em, p.situacao, p.forma, p.motivo,
           p.decidido_em, exists (select 1 from auth.users u where lower(u.email) = lower(p.email)),
           (select count(*)::int from public.pedidos_convite o
             where o.id <> p.id and o.situacao = 'pendente' and o.whatsapp = p.whatsapp),
           (select count(*)::int from public.pedidos_convite o
             where o.id <> p.id and o.situacao = 'pendente' and lower(o.email) = lower(p.email))
    from public.pedidos_convite p
    where p.anonimizado_em is null
    order by p.criado_em, p.id;
end;
$$;
grant execute on function public.pedidos_convite_admin() to authenticated;
