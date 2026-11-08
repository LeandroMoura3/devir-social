-- Devir Social — migração 0018 (regras v0.12): o debate fica público no blog.
-- Os comentários aparecem na página do conteúdo depois que a votação fecha (ou no cancelado).
-- Removidos por exceção legal continuam sem debate público. Comentários removidos aparecem só com o motivo.
-- Aplicada em 08/11/2026.

create or replace function public.blog_debate(p_conteudo bigint)
returns table (id bigint, pai_id bigint, autor text, texto text, criado_em timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.pai_id, p.nome_publico,
         case when m.removido_motivo is not null then 'Comentário removido: ' || m.removido_motivo else m.texto end,
         m.criado_em
  from public.comentarios m
  join public.conteudos c on c.id = m.conteudo_id
  join public.perfis p on p.id = m.autor_id
  where m.conteudo_id = p_conteudo
    and (c.cancelado or (c.fecha_em <= now() and c.removido_em is null))
  order by m.criado_em;
$$;
grant execute on function public.blog_debate(bigint) to anon, authenticated;

notify pgrst, 'reload schema';
