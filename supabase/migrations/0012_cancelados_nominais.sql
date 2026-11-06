-- Devir Social — migração 0012 (regras v0.8): cancelados ganham registro no mesmo formato dos publicados,
-- com votos nominais. Como o conteúdo cancelado não fecha, participantes e espectadores são os do ciclo
-- em que o cancelamento aconteceu.
-- Aplicada em 06/11/2026.

create or replace function public.blog_participantes(p_conteudo bigint)
returns table (nome_publico text)
language sql stable security definer set search_path = ''
as $$
  select p.nome_publico
  from public.conteudos c
  cross join lateral public.ciclo_em(case when c.cancelado then c.removido_em else c.fecha_em end) ci
  cross join lateral public._participantes_do_ciclo(ci.ciclo_inicio) pc
  join public.perfis p on p.id = pc.perfil_id
  where c.id = p_conteudo and (c.cancelado or (c.fecha_em <= now() and c.removido_em is null))
  order by p.nome_publico;
$$;

create or replace function public.blog_votacao(p_conteudo bigint)
returns table (nome_publico text, voto text, participante boolean)
language sql stable security definer set search_path = ''
as $$
  with conteudo as (
    select c.id, ci.ciclo_inicio
    from public.conteudos c
    cross join lateral public.ciclo_em(case when c.cancelado then c.removido_em else c.fecha_em end) ci
    where c.id = p_conteudo and (c.cancelado or (c.fecha_em <= now() and c.removido_em is null))
  ),
  participantes as (
    select pc.perfil_id from conteudo, public._participantes_do_ciclo(conteudo.ciclo_inicio) pc
  )
  select p.nome_publico, v.voto, v.eleitor_id in (select perfil_id from participantes)
  from conteudo
  join public.votos v on v.conteudo_id = conteudo.id
  join public.perfis p on p.id = v.eleitor_id
  order by p.nome_publico;
$$;

-- Lista de cancelados: contagem por sentimento só de participantes do ciclo do cancelamento,
-- igual à dos publicados.
drop function public.blog_cancelados();
create function public.blog_cancelados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, cancelado_em timestamptz,
  motivo text, ciclo_inicio timestamptz, detalhe jsonb
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.removido_em, c.removido_motivo, ci.ciclo_inicio,
         coalesce((select jsonb_object_agg(x.voto, x.n)
                   from (select v.voto, count(*) as n
                         from public.votos v
                         join public._participantes_do_ciclo(ci.ciclo_inicio) pc on pc.perfil_id = v.eleitor_id
                         where v.conteudo_id = c.id
                         group by v.voto) x),
                  '{}'::jsonb)
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  cross join lateral public.ciclo_em(c.removido_em) ci
  where c.cancelado
  order by c.removido_em desc, c.id;
$$;

grant execute on function public.blog_participantes(bigint) to anon, authenticated;
grant execute on function public.blog_votacao(bigint) to anon, authenticated;
grant execute on function public.blog_cancelados() to anon, authenticated;

notify pgrst, 'reload schema';
