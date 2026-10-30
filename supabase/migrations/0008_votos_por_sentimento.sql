-- Devir Social — migração 0008: voto por sentimento (4 de apoio + indiferente + 4 de protesto).
--   Apoio:    me_representa | utilidade_publica | expoe_injustica | merece_ser_ouvido
--   Indiferente (ilustrativo: não entra na classificação, conta para a participação)
--   Protesto: nao_me_representa | falso_ou_enganoso | ofende_ou_ataca | so_gera_briga
-- A classificação continua binária: apoio conta como "favor", protesto como "contra".
-- O detalhamento por sentimento vai para o blog e para a legenda do Instagram.
-- Aplicada em 30/10/2026, sem nenhum voto registrado (conversão abaixo é só por segurança).

alter table public.votos drop constraint votos_voto_check;
alter table public.votos_eventos drop constraint votos_eventos_voto_check;

update public.votos set voto = case voto when 'sim' then 'me_representa' when 'nao' then 'nao_me_representa' else voto end;
update public.votos_eventos set voto = case voto when 'sim' then 'me_representa' when 'nao' then 'nao_me_representa' else voto end;

create or replace function public.lado_do_voto(v text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when v in ('me_representa', 'utilidade_publica', 'expoe_injustica', 'merece_ser_ouvido') then 'apoio'
    when v in ('nao_me_representa', 'falso_ou_enganoso', 'ofende_ou_ataca', 'so_gera_briga') then 'protesto'
    when v = 'indiferente' then 'indiferente'
  end;
$$;

alter table public.votos add constraint votos_voto_check check (public.lado_do_voto(voto) is not null);
alter table public.votos_eventos add constraint votos_eventos_voto_check check (public.lado_do_voto(voto) is not null);

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
  if public.lado_do_voto(p_voto) is null then
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

-- Resultados: favor = apoio, contra = protesto, mais o detalhamento por sentimento
-- (só votos de participantes do ciclo em que o conteúdo fecha).
drop function public.blog_publicados();
drop function public.painel_fechados();
drop function public.resultados();
drop function public._resultados();

create or replace function public._resultados()
returns table (
  conteudo_id bigint, fecha_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int, detalhe jsonb
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
  votos_validos as (
    select f.id, v.voto, public.lado_do_voto(v.voto) as lado
    from fechados f
    join public.votos v on v.conteudo_id = f.id
    join participantes pa on pa.perfil_id = v.eleitor_id and pa.ciclo_inicio = f.ciclo_inicio
  ),
  contagem as (
    select
      id,
      count(*) filter (where lado = 'apoio') as favor,
      count(*) filter (where lado = 'protesto') as contra,
      count(*) filter (where lado = 'indiferente') as indiferente
    from votos_validos
    group by id
  ),
  detalhes as (
    select id, jsonb_object_agg(voto, n) as detalhe
    from (select id, voto, count(*) as n from votos_validos group by id, voto) x
    group by id
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
    ceil(coalesce(b.base, 0) * (public.parametros_em(f.ciclo_inicio)).quorum / 100.0)::int,
    coalesce(d.detalhe, '{}'::jsonb)
  from fechados f
  left join contagem ct on ct.id = f.id
  left join detalhes d on d.id = f.id
  left join bases b on b.ciclo_inicio = f.ciclo_inicio;
$$;

create or replace function public.resultados()
returns table (
  conteudo_id bigint, fecha_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int, detalhe jsonb
)
language sql stable security definer set search_path = ''
as $$
  select * from public._resultados() where public.eh_participante();
$$;

create or replace function public.painel_fechados()
returns table (semana date, favor int, contra int, indiferente int, quorum_necessario int)
language sql stable security definer set search_path = ''
as $$
  select public.semana_de(r.fecha_em), r.favor, r.contra, r.indiferente, r.quorum_necessario
  from public._resultados() r;
$$;

create or replace function public.blog_publicados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, fecha_em timestamptz,
  instagram_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int, detalhe jsonb
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.fecha_em, c.publicado_em, r.ciclo_inicio,
         r.favor, r.contra, r.indiferente, r.base, r.quorum_necessario, r.detalhe
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  join public._resultados() r on r.conteudo_id = c.id
  where c.fecha_em <= now() and c.removido_em is null
  order by c.fecha_em desc, c.id;
$$;

revoke execute on function public._resultados() from public, anon, authenticated;
revoke execute on function public.resultados() from public, anon;
revoke execute on function public.votar(bigint, text) from public, anon;
grant execute on function public.lado_do_voto(text) to anon, authenticated;
grant execute on function public.votar(bigint, text) to authenticated;
grant execute on function public.resultados() to authenticated;
grant execute on function public.painel_fechados() to anon, authenticated;
grant execute on function public.blog_publicados() to anon, authenticated;

notify pgrst, 'reload schema';
