-- Devir Social — migração 0020 (regras v0.14): a videochamada sai; a entrada passa a ser confirmada pelo WhatsApp.
--
-- A coordenação manda uma mensagem e a pessoa responde (prova que o número é real). Um WhatsApp já usado por
-- outro membro ou por outro pedido pendente não gera pedido novo, como já acontecia com o e-mail.
-- Formas antigas ('videochamada') e motivos antigos ('nao_compareceu') continuam válidos para o histórico.

alter table public.pedidos_convite drop constraint pedidos_convite_forma_check;
alter table public.pedidos_convite add constraint pedidos_convite_forma_check
  check (forma in ('whatsapp', 'videochamada', 'conhecido'));
alter table public.pedidos_convite drop constraint pedidos_convite_motivo_check;
alter table public.pedidos_convite add constraint pedidos_convite_motivo_check
  check (motivo in ('nao_respondeu', 'nao_compareceu', 'identidade_nao_confere', 'ja_tem_conta', 'pedido_invalido', 'expirado'));

create or replace function public.pedir_convite(
  p_segredo text, p_nome text, p_email text, p_whatsapp text, p_como_conheceu text, p_origem_hash text
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

  if (select count(*) from public.pedidos_convite
       where origem_hash = p_origem_hash and criado_em > now() - interval '1 hour') >= 3
     or (select count(*) from public.pedidos_convite
          where origem_hash = p_origem_hash and criado_em > now() - interval '1 day') >= 10
     or (select count(*) from public.pedidos_convite where criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitos pedidos agora. Tente de novo mais tarde.';
  end if;

  -- Mesma resposta de sucesso quando o e-mail ou o WhatsApp já têm pedido ou conta: não revela quem é membro.
  if exists (select 1 from public.pedidos_convite
              where situacao = 'pendente' and (lower(email) = email_limpo or whatsapp = digitos))
     or exists (select 1 from auth.users where lower(email) = email_limpo)
     or exists (select 1 from public.perfis_privados where whatsapp = digitos) then
    return;
  end if;

  insert into public.pedidos_convite (nome, email, whatsapp, como_conheceu, origem_hash)
  values (trim(p_nome), email_limpo, digitos, nullif(trim(coalesce(p_como_conheceu, '')), ''), p_origem_hash);
end;
$$;

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

drop function public.painel_convites();
create function public.painel_convites()
returns table (
  recebidos int, pendentes int, aprovados_whatsapp int, aprovados_videochamada int, aprovados_conhecido int,
  recusados_nao_respondeu int, recusados_nao_compareceu int, recusados_identidade int, recusados_ja_tem_conta int,
  recusados_invalido int, expirados int
)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int,
         count(*) filter (where situacao = 'pendente')::int,
         count(*) filter (where forma = 'whatsapp')::int,
         count(*) filter (where forma = 'videochamada')::int,
         count(*) filter (where forma = 'conhecido')::int,
         count(*) filter (where motivo = 'nao_respondeu')::int,
         count(*) filter (where motivo = 'nao_compareceu')::int,
         count(*) filter (where motivo = 'identidade_nao_confere')::int,
         count(*) filter (where motivo = 'ja_tem_conta')::int,
         count(*) filter (where motivo = 'pedido_invalido')::int,
         count(*) filter (where motivo = 'expirado')::int
  from public.pedidos_convite;
$$;
grant execute on function public.painel_convites() to anon, authenticated;
