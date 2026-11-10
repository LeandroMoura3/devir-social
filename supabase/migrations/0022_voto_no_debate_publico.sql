-- Devir Social — migração 0022: o debate do blog mostra o voto de quem comentou, como o app mostra durante o
-- debate. Depois do fechamento (ou do cancelamento) o voto está congelado e já é público no bloco de votos.
-- "espectador": quem comentou não era participante do ciclo em que o conteúdo fechou (ou foi cancelado), então
-- o voto dele não contou. "autor": quem enviou o conteúdo (não vota nele).

drop function public.blog_debate(bigint);
create function public.blog_debate(p_conteudo bigint)
returns table (
  id bigint, pai_id bigint, autor text, texto text, criado_em timestamptz,
  voto text, espectador boolean, eh_autor boolean
)
language sql stable security definer set search_path = ''
as $$
  with conteudo as (
    select c.id, c.autor_id, ci.ciclo_inicio
    from public.conteudos c
    cross join lateral public.ciclo_em(case when c.cancelado then c.removido_em else c.fecha_em end) ci
    where c.id = p_conteudo and (c.cancelado or (c.fecha_em <= now() and c.removido_em is null))
  ),
  participantes as (
    select pc.perfil_id from conteudo, public._participantes_do_ciclo(conteudo.ciclo_inicio) pc
  )
  select m.id, m.pai_id, p.nome_publico,
         case when m.removido_motivo is not null then 'Comentário removido: ' || m.removido_motivo else m.texto end,
         m.criado_em,
         v.voto::text,
         m.autor_id <> conteudo.autor_id and not exists (select 1 from participantes pa where pa.perfil_id = m.autor_id),
         m.autor_id = conteudo.autor_id
  from conteudo
  join public.comentarios m on m.conteudo_id = conteudo.id
  join public.perfis p on p.id = m.autor_id
  left join public.votos v on v.conteudo_id = conteudo.id and v.eleitor_id = m.autor_id
  order by m.criado_em;
$$;
grant execute on function public.blog_debate(bigint) to anon, authenticated;

notify pgrst, 'reload schema';
