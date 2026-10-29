-- Devir Social — migração 0004: o blog publica sozinho no fechamento da votação.
-- Antes, o registro só aparecia depois que a coordenação marcava o post do Instagram como publicado.
-- Agora a data de publicação no blog é a data de fechamento: regra, não clique.
-- O prazo para a exceção legal passa a ser o período em que o conteúdo está aberto;
-- remoções depois disso continuam possíveis e ficam registradas.

drop function public.blog_publicados();

create or replace function public.blog_publicados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, fecha_em timestamptz,
  instagram_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.fecha_em, c.publicado_em, r.ciclo_inicio,
         r.favor, r.contra, r.indiferente, r.base, r.quorum_necessario
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  join public._resultados() r on r.conteudo_id = c.id
  where c.fecha_em <= now() and c.removido_em is null
  order by c.fecha_em desc, c.id;
$$;

create or replace function public.blog_votacao(p_conteudo bigint)
returns table (nome_publico text, voto text, participante boolean)
language sql stable security definer set search_path = ''
as $$
  with conteudo as (
    select c.id, ci.ciclo_inicio
    from public.conteudos c
    cross join lateral public.ciclo_em(c.fecha_em) ci
    where c.id = p_conteudo and c.fecha_em <= now() and c.removido_em is null
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

create or replace function public.blog_participantes(p_conteudo bigint)
returns table (nome_publico text)
language sql stable security definer set search_path = ''
as $$
  select p.nome_publico
  from public.conteudos c
  cross join lateral public.ciclo_em(c.fecha_em) ci
  cross join lateral public._participantes_do_ciclo(ci.ciclo_inicio) pc
  join public.perfis p on p.id = pc.perfil_id
  where c.id = p_conteudo and c.fecha_em <= now() and c.removido_em is null
  order by p.nome_publico;
$$;

grant execute on function public.blog_publicados() to anon, authenticated;

notify pgrst, 'reload schema';
