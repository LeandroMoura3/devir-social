-- Devir Social — migração 0002: ciclos de participação, espectadores, voto indiferente
-- e parâmetros versionados.
-- Como aplicar: Supabase → SQL Editor → New query → cole este arquivo inteiro → Run.
--
-- Regras novas:
--   * O tempo é dividido em ciclos fixos (dias_ciclo). O status de cada pessoa no ciclo N
--     depende dos conteúdos que fecharam no ciclo N−1: quem votou (sim, indiferente ou não)
--     em pelo menos participacao_minima% deles é participante; quem votou menos é espectador.
--   * Quem entrou no ciclo atual é espectador nele e participante garantido no seguinte.
--   * Ciclo anterior sem conteúdos fechados: participante.
--   * Só contam no resultado os votos de quem é participante no ciclo em que o conteúdo fecha.
--   * Indiferente é ilustrativo: não entra na porcentagem nem no quórum.
--   * Quórum = quorum% dos participantes do ciclo em que o conteúdo fecha.
--   * Parâmetros nunca são editados: muda-se inserindo uma versão nova com "inicio" no futuro,
--     de preferência no começo de um ciclo. Assim os resultados antigos não mudam.

-- ============================================================================
-- Parâmetros versionados (públicos)
-- ============================================================================

create table public.parametros (
  id bigint generated always as identity primary key,
  inicio timestamptz not null unique,
  dias_conteudo int not null check (dias_conteudo between 1 and 90),
  dias_ciclo int not null check (dias_ciclo between 1 and 90),
  participacao_minima int not null check (participacao_minima between 0 and 100),
  quorum int not null check (quorum between 0 and 100),
  criado_em timestamptz not null default now()
);

alter table public.parametros enable row level security;

create policy "parâmetros são públicos" on public.parametros
  for select to anon, authenticated using (true);

-- Primeira versão: ciclos de 14 dias a partir do domingo 25/10/2026, 0h de Brasília.
insert into public.parametros (inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum)
values ('2026-10-25 00:00:00-03', 14, 14, 50, 20);

create or replace function public.parametros_em(ts timestamptz)
returns public.parametros
language plpgsql stable set search_path = ''
as $$
declare
  p public.parametros;
begin
  select * into p from public.parametros where inicio <= ts order by inicio desc limit 1;
  if not found then
    select * into p from public.parametros order by inicio limit 1;
  end if;
  return p;
end;
$$;

create or replace function public.ciclo_em(ts timestamptz)
returns table (ciclo_inicio timestamptz, ciclo_fim timestamptz)
language plpgsql stable set search_path = ''
as $$
declare
  p public.parametros;
  n int;
  proxima timestamptz;
begin
  p := public.parametros_em(ts);
  n := floor(extract(epoch from (ts - p.inicio)) / (p.dias_ciclo * 86400));
  ciclo_inicio := p.inicio + make_interval(days => n * p.dias_ciclo);
  ciclo_fim := ciclo_inicio + make_interval(days => p.dias_ciclo);
  -- Se uma versão nova começa no meio do ciclo, o ciclo termina nela.
  select min(x.inicio) into proxima from public.parametros x where x.inicio > ciclo_inicio;
  ciclo_fim := least(ciclo_fim, proxima);
  return next;
end;
$$;

-- ============================================================================
-- Voto: sim | indiferente | não
-- ============================================================================

alter table public.votos add column voto text check (voto in ('sim', 'indiferente', 'nao'));
update public.votos set voto = case when a_favor then 'sim' else 'nao' end;
alter table public.votos alter column voto set not null;
alter table public.votos drop column a_favor;

alter table public.votos_eventos add column voto text check (voto in ('sim', 'indiferente', 'nao'));
update public.votos_eventos set voto = case when a_favor then 'sim' else 'nao' end;
alter table public.votos_eventos alter column voto set not null;
alter table public.votos_eventos drop column a_favor;

drop function public.votar(bigint, boolean);

create or replace function public.votar(p_conteudo bigint, p_voto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.conteudos;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de votar';
  end if;
  if p_voto not in ('sim', 'indiferente', 'nao') then
    raise exception 'Voto inválido';
  end if;
  select * into c from public.conteudos where id = p_conteudo;
  if not found or c.removido_em is not null then
    raise exception 'Conteúdo não encontrado';
  end if;
  if now() >= c.fecha_em then
    raise exception 'A votação deste conteúdo já fechou';
  end if;
  if c.autor_id = auth.uid() then
    raise exception 'Você não pode votar no próprio conteúdo';
  end if;
  insert into public.votos (conteudo_id, eleitor_id, voto)
  values (p_conteudo, auth.uid(), p_voto)
  on conflict (conteudo_id, eleitor_id) do update
    set voto = excluded.voto, atualizado_em = now();
  insert into public.votos_eventos (conteudo_id, eleitor_id, voto)
  values (p_conteudo, auth.uid(), p_voto);
end;
$$;

-- Duração do conteúdo vem dos parâmetros em vigor no envio.
create or replace function public.enviar_conteudo(p_texto text, p_imagem_path text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  novo_id bigint;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de enviar';
  end if;
  if p_imagem_path is null or p_imagem_path not like auth.uid()::text || '/%' then
    raise exception 'Imagem inválida';
  end if;
  insert into public.conteudos (autor_id, texto, imagem_path, fecha_em)
  values (
    auth.uid(),
    trim(p_texto),
    p_imagem_path,
    now() + make_interval(days => (public.parametros_em(now())).dias_conteudo)
  )
  returning id into novo_id;
  return novo_id;
end;
$$;

-- ============================================================================
-- Status por ciclo: participante ou espectador
-- ============================================================================

create or replace function public.eh_participante_no_ciclo(p_perfil uuid, p_ciclo_inicio timestamptz)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  criado timestamptz;
  anterior timestamptz;
  total int;
  votados int;
begin
  select criado_em into criado from public.perfis where id = p_perfil and not removido;
  if criado is null or criado >= p_ciclo_inicio then
    return false; -- entrou neste ciclo: espectador
  end if;
  select c.ciclo_inicio into anterior from public.ciclo_em(p_ciclo_inicio - interval '1 second') c;
  if criado >= anterior then
    return true; -- entrou no ciclo anterior: participante garantido
  end if;
  select count(*), count(v.eleitor_id) into total, votados
  from public.conteudos ct
  left join public.votos v on v.conteudo_id = ct.id and v.eleitor_id = p_perfil
  where ct.fecha_em >= anterior
    and ct.fecha_em < p_ciclo_inicio
    and ct.removido_em is null
    and ct.autor_id <> p_perfil;
  if total = 0 then
    return true;
  end if;
  return votados * 100 >= (public.parametros_em(p_ciclo_inicio)).participacao_minima * total;
end;
$$;

-- Status de quem está logado no ciclo atual, com o progresso para o próximo ciclo.
create or replace function public.meu_status()
returns table (
  ciclo_inicio timestamptz, ciclo_fim timestamptz, participante boolean, novo boolean,
  votados int, total int, participacao_minima int
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  c record;
begin
  if not public.eh_participante() then
    return;
  end if;
  select * into c from public.ciclo_em(now());
  ciclo_inicio := c.ciclo_inicio;
  ciclo_fim := c.ciclo_fim;
  participante := public.eh_participante_no_ciclo(auth.uid(), c.ciclo_inicio);
  novo := (select criado_em >= c.ciclo_inicio from public.perfis where id = auth.uid());
  participacao_minima := (public.parametros_em(c.ciclo_fim)).participacao_minima;
  select count(*), count(v.eleitor_id) into total, votados
  from public.conteudos ct
  left join public.votos v on v.conteudo_id = ct.id and v.eleitor_id = auth.uid()
  where ct.fecha_em >= c.ciclo_inicio
    and ct.fecha_em < c.ciclo_fim
    and ct.removido_em is null
    and ct.autor_id <> auth.uid();
  return next;
end;
$$;

-- ============================================================================
-- Resultados (contagens brutas; a classificação fica em src/lib/regras.ts)
-- ============================================================================

drop function public.painel_fechados();
drop function public.resultados();
drop function public._resultados();
drop function public.participantes_janela(bigint);

create or replace function public._participantes_do_ciclo(p_ciclo_inicio timestamptz)
returns table (perfil_id uuid)
language sql stable security definer set search_path = ''
as $$
  select p.id from public.perfis p where public.eh_participante_no_ciclo(p.id, p_ciclo_inicio);
$$;

-- favor = sim, contra = não, contando só votos de participantes do ciclo do fechamento.
create or replace function public._resultados()
returns table (
  conteudo_id bigint, fecha_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int
)
language sql stable security definer set search_path = ''
as $$
  with fechados as (
    select c.id, c.fecha_em, (select ci.ciclo_inicio from public.ciclo_em(c.fecha_em) ci) as ciclo_inicio
    from public.conteudos c
    where c.fecha_em <= now() and c.removido_em is null
  ),
  participantes as (
    select f.ciclo_inicio, pc.perfil_id
    from (select distinct ciclo_inicio from fechados) f
    cross join lateral public._participantes_do_ciclo(f.ciclo_inicio) pc
  ),
  contagem as (
    select
      f.id,
      count(*) filter (where v.voto = 'sim') as favor,
      count(*) filter (where v.voto = 'nao') as contra,
      count(*) filter (where v.voto = 'indiferente') as indiferente
    from fechados f
    join public.votos v on v.conteudo_id = f.id
    join participantes pa on pa.perfil_id = v.eleitor_id and pa.ciclo_inicio = f.ciclo_inicio
    group by f.id
  ),
  bases as (
    select ciclo_inicio, count(*) as base from participantes group by ciclo_inicio
  )
  select
    f.id,
    f.fecha_em,
    f.ciclo_inicio,
    coalesce(ct.favor, 0)::int,
    coalesce(ct.contra, 0)::int,
    coalesce(ct.indiferente, 0)::int,
    coalesce(b.base, 0)::int,
    ceil(coalesce(b.base, 0) * (public.parametros_em(f.ciclo_inicio)).quorum / 100.0)::int
  from fechados f
  left join contagem ct on ct.id = f.id
  left join bases b on b.ciclo_inicio = f.ciclo_inicio;
$$;

create or replace function public.resultados()
returns table (
  conteudo_id bigint, fecha_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int
)
language sql stable security definer set search_path = ''
as $$
  select * from public._resultados() where public.eh_participante();
$$;

-- Participantes do ciclo em que o conteúdo fechou (base do quórum).
create or replace function public.participantes_ciclo(p_conteudo bigint)
returns table (perfil_id uuid, nome_publico text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nome_publico
  from public.conteudos c
  cross join lateral public.ciclo_em(c.fecha_em) ci
  cross join lateral public._participantes_do_ciclo(ci.ciclo_inicio) pc
  join public.perfis p on p.id = pc.perfil_id
  where c.id = p_conteudo and c.fecha_em <= now() and public.eh_participante()
  order by p.nome_publico;
$$;

-- ============================================================================
-- Painel público
-- ============================================================================

create or replace function public.painel_fechados()
returns table (semana date, favor int, contra int, indiferente int, quorum_necessario int)
language sql stable security definer set search_path = ''
as $$
  select public.semana_de(r.fecha_em), r.favor, r.contra, r.indiferente, r.quorum_necessario
  from public._resultados() r;
$$;

create or replace function public.painel_ciclos()
returns table (ciclo_inicio timestamptz, ciclo_fim timestamptz, membros int, participantes int, conteudos_fechados int)
language plpgsql stable security definer set search_path = ''
as $$
declare
  atual record;
  cursor_ts timestamptz;
  limite timestamptz;
begin
  select min(inicio) into cursor_ts from public.parametros;
  select c.ciclo_fim into limite from public.ciclo_em(now()) c;
  while cursor_ts < limite loop
    select * into atual from public.ciclo_em(cursor_ts);
    ciclo_inicio := atual.ciclo_inicio;
    ciclo_fim := atual.ciclo_fim;
    membros := (select count(*) from public.perfis p where p.criado_em < atual.ciclo_fim and not p.removido);
    participantes := (select count(*) from public._participantes_do_ciclo(atual.ciclo_inicio));
    conteudos_fechados := (
      select count(*) from public.conteudos ct
      where ct.fecha_em >= atual.ciclo_inicio and ct.fecha_em < atual.ciclo_fim and ct.removido_em is null
    );
    return next;
    cursor_ts := atual.ciclo_fim;
  end loop;
end;
$$;

-- ============================================================================
-- Mudança de parâmetros: sempre vale a partir do próximo ciclo
-- ============================================================================

-- Exemplo, no SQL Editor (lá não há login, então a função aceita a chamada):
--   select public.agendar_parametros(14, 14, 50, 20);
-- Chamar de novo antes do próximo ciclo começar substitui o agendamento.
create or replace function public.agendar_parametros(
  p_dias_conteudo int, p_dias_ciclo int, p_participacao_minima int, p_quorum int
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
  insert into public.parametros (inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum)
  values (proximo, p_dias_conteudo, p_dias_ciclo, p_participacao_minima, p_quorum)
  on conflict (inicio) do update
    set dias_conteudo = excluded.dias_conteudo,
        dias_ciclo = excluded.dias_ciclo,
        participacao_minima = excluded.participacao_minima,
        quorum = excluded.quorum,
        criado_em = now();
  return proximo;
end;
$$;

-- ============================================================================
-- Permissões das funções (o Supabase libera tudo por padrão; aqui liberamos só o necessário)
-- ============================================================================

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.eh_participante() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.semana_de(timestamptz) to anon, authenticated;
grant execute on function public.parametros_em(timestamptz) to anon, authenticated;
grant execute on function public.ciclo_em(timestamptz) to anon, authenticated;
grant execute on function public.concluir_cadastro(text, text, text) to authenticated;
grant execute on function public.enviar_conteudo(text, text) to authenticated;
grant execute on function public.votar(bigint, text) to authenticated;
grant execute on function public.comentar(bigint, bigint, text) to authenticated;
grant execute on function public.registrar_atividade() to authenticated;
grant execute on function public.meu_status() to authenticated;
grant execute on function public.resultados() to authenticated;
grant execute on function public.participantes_ciclo(bigint) to authenticated;
grant execute on function public.painel_semanal() to anon, authenticated;
grant execute on function public.painel_fechados() to anon, authenticated;
grant execute on function public.painel_ciclos() to anon, authenticated;
grant execute on function public.marcar_publicado(bigint[]) to authenticated;
grant execute on function public.remover_conteudo(bigint, text) to authenticated;
grant execute on function public.agendar_parametros(int, int, int, int) to authenticated;

-- Faz a API enxergar as funções novas imediatamente.
notify pgrst, 'reload schema';
