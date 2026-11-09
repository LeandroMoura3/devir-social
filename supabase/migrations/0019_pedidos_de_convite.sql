-- Devir Social — migração 0019 (regras v0.13): pedido de convite pela página pública.
--
-- Fluxo: a pessoa pede em /convite → a coordenação faz uma videochamada curta (ou dispensa, se já conhece a
-- pessoa pessoalmente, e isso fica marcado) → aprova ou recusa com motivo objetivo → manda o convite pelo
-- Supabase, como antes.
--
-- Vagas: há um limite público de entradas por ciclo (parâmetro versionado). Contam todos os convites enviados no
-- ciclo, inclusive os diretos, mais os pedidos aprovados ainda sem convite. As vagas são reservadas por ordem de
-- chegada: um pedido só pode ser aprovado se sobrar vaga depois de reservar uma para cada pedido mais antigo
-- ainda pendente.
--
-- Dados pessoais: 30 dias depois da decisão (ou do pedido, se ninguém decidir), nome, e-mail, WhatsApp,
-- "como conheceu" e a origem são apagados; só ficam situação, forma, motivo e datas, para o painel público.
--
-- Robôs: a página só chama pedir_convite pelo servidor do app, que tem o mesmo segredo do robô de publicação
-- (só o hash fica no banco). Quem chamar a função direto, sem o segredo, é recusado.

alter table public.parametros add column entradas_por_ciclo int not null default 5 check (entradas_por_ciclo >= 0);

drop function public.agendar_parametros(int, int, int, int, int);
create function public.agendar_parametros(
  p_dias_conteudo int, p_dias_ciclo int, p_participacao_minima int, p_quorum int, p_alvo_conteudos int,
  p_entradas_por_ciclo int
)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  proximo timestamptz;
begin
  if auth.uid() is not null and not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  select c.ciclo_fim into proximo from public.ciclo_em(now()) c;
  insert into public.parametros (
    inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum, alvo_conteudos, entradas_por_ciclo
  )
  values (
    proximo, p_dias_conteudo, p_dias_ciclo, p_participacao_minima, p_quorum, p_alvo_conteudos, p_entradas_por_ciclo
  )
  on conflict (inicio) do update
    set dias_conteudo = excluded.dias_conteudo,
        dias_ciclo = excluded.dias_ciclo,
        participacao_minima = excluded.participacao_minima,
        quorum = excluded.quorum,
        alvo_conteudos = excluded.alvo_conteudos,
        entradas_por_ciclo = excluded.entradas_por_ciclo,
        criado_em = now();
  return proximo;
end;
$$;
revoke execute on function public.agendar_parametros(int, int, int, int, int, int) from public, anon;
grant execute on function public.agendar_parametros(int, int, int, int, int, int) to authenticated;

create table public.pedidos_convite (
  id bigserial primary key,
  nome text,
  email text,
  whatsapp text,
  como_conheceu text,
  origem_hash text,
  criado_em timestamptz not null default now(),
  situacao text not null default 'pendente' check (situacao in ('pendente', 'aprovado', 'recusado')),
  forma text check (forma in ('videochamada', 'conhecido')),
  motivo text check (motivo in ('nao_compareceu', 'identidade_nao_confere', 'ja_tem_conta', 'pedido_invalido', 'expirado')),
  decidido_em timestamptz,
  decidido_por uuid references public.perfis (id),
  anonimizado_em timestamptz,
  check ((situacao = 'aprovado') = (forma is not null)),
  check ((situacao = 'recusado') = (motivo is not null))
);
create index pedidos_convite_email on public.pedidos_convite (lower(email)) where anonimizado_em is null;
create index pedidos_convite_origem on public.pedidos_convite (origem_hash, criado_em);

-- Ninguém lê nem escreve direto: só pelas funções abaixo.
alter table public.pedidos_convite enable row level security;
revoke all on public.pedidos_convite from anon, authenticated;

-- Pedidos sem decisão em 30 dias expiram; dados pessoais saem 30 dias depois da decisão.
create or replace function public._limpar_pedidos_convite()
returns void
language sql security definer set search_path = ''
as $$
  update public.pedidos_convite
     set situacao = 'recusado', motivo = 'expirado', decidido_em = now()
   where situacao = 'pendente' and criado_em < now() - interval '30 days';
  update public.pedidos_convite
     set nome = null, email = null, whatsapp = null, como_conheceu = null, origem_hash = null,
         anonimizado_em = now()
   where anonimizado_em is null and decidido_em < now() - interval '30 days';
$$;
revoke execute on function public._limpar_pedidos_convite() from public, anon, authenticated;

-- Vagas do ciclo atual: limite, usadas (convites enviados no ciclo + aprovados ainda sem convite) e fim do ciclo.
create or replace function public.vagas_de_entrada()
returns table (limite int, usadas int, pendentes int, ciclo_fim timestamptz)
language sql stable security definer set search_path = ''
as $$
  with ciclo as (select c.ciclo_inicio, c.ciclo_fim from public.ciclo_em(now()) c)
  select
    (public.parametros_em(ciclo.ciclo_inicio)).entradas_por_ciclo,
    (
      (select count(*) from auth.users u where u.invited_at >= ciclo.ciclo_inicio)
      + (select count(*) from public.pedidos_convite p
          where p.situacao = 'aprovado' and p.decidido_em >= ciclo.ciclo_inicio
            and not exists (select 1 from auth.users u where lower(u.email) = lower(p.email)))
    )::int,
    (select count(*) from public.pedidos_convite p where p.situacao = 'pendente')::int,
    ciclo.ciclo_fim
  from ciclo;
$$;
grant execute on function public.vagas_de_entrada() to anon, authenticated;

-- Chamado só pelo servidor do app (/convite). Responde igual quando o e-mail já tem pedido ou conta, para não
-- revelar quem é membro.
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

  if exists (select 1 from public.pedidos_convite where lower(email) = email_limpo and situacao = 'pendente')
     or exists (select 1 from auth.users where lower(email) = email_limpo) then
    return;
  end if;

  insert into public.pedidos_convite (nome, email, whatsapp, como_conheceu, origem_hash)
  values (trim(p_nome), email_limpo, digitos, nullif(trim(coalesce(p_como_conheceu, '')), ''), p_origem_hash);
end;
$$;
revoke execute on function public.pedir_convite(text, text, text, text, text, text) from public;
grant execute on function public.pedir_convite(text, text, text, text, text, text) to anon, authenticated;

-- Fila da coordenação, por ordem de chegada. "convidado": o e-mail já recebeu convite pelo Supabase.
create or replace function public.pedidos_convite_admin()
returns table (
  id bigint, nome text, email text, whatsapp text, como_conheceu text, criado_em timestamptz,
  situacao text, forma text, motivo text, decidido_em timestamptz, convidado boolean
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
           p.decidido_em, exists (select 1 from auth.users u where lower(u.email) = lower(p.email))
    from public.pedidos_convite p
    where p.anonimizado_em is null
    order by p.criado_em, p.id;
end;
$$;
grant execute on function public.pedidos_convite_admin() to authenticated;

-- Aprovar: p_detalhe = 'videochamada' ou 'conhecido'. Recusar: p_detalhe = motivo objetivo.
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
    if p_detalhe not in ('videochamada', 'conhecido') then
      raise exception 'Forma de verificação inválida';
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
    if p_detalhe not in ('nao_compareceu', 'identidade_nao_confere', 'ja_tem_conta', 'pedido_invalido') then
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
grant execute on function public.decidir_pedido(bigint, text, text) to authenticated;

-- Números públicos: nada de dado pessoal, só contagens.
create or replace function public.painel_convites()
returns table (
  recebidos int, pendentes int, aprovados_videochamada int, aprovados_conhecido int,
  recusados_nao_compareceu int, recusados_identidade int, recusados_ja_tem_conta int,
  recusados_invalido int, expirados int
)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int,
         count(*) filter (where situacao = 'pendente')::int,
         count(*) filter (where forma = 'videochamada')::int,
         count(*) filter (where forma = 'conhecido')::int,
         count(*) filter (where motivo = 'nao_compareceu')::int,
         count(*) filter (where motivo = 'identidade_nao_confere')::int,
         count(*) filter (where motivo = 'ja_tem_conta')::int,
         count(*) filter (where motivo = 'pedido_invalido')::int,
         count(*) filter (where motivo = 'expirado')::int
  from public.pedidos_convite;
$$;
grant execute on function public.painel_convites() to anon, authenticated;
