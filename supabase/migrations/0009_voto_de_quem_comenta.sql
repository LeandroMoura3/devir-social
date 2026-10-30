-- Devir Social — migração 0009: o voto atual de quem comenta aparece ao lado do nome, durante o debate.
-- Só o voto de quem comentou naquele conteúdo; as contagens e os votos de quem não comentou
-- continuam escondidos até o fechamento (política "votos visíveis após o fechamento", 0001).
-- Aplicada em 30/10/2026 (regras v0.4, revisada), sem nenhum voto registrado.

create or replace function public.votos_de_comentaristas(p_conteudo bigint)
returns table (perfil_id uuid, voto text)
language sql stable security definer set search_path = ''
as $$
  select v.eleitor_id, v.voto
  from public.votos v
  where public.eh_participante()
    and v.conteudo_id = p_conteudo
    and exists (
      select 1 from public.comentarios m
      where m.conteudo_id = p_conteudo and m.autor_id = v.eleitor_id
    );
$$;

revoke execute on function public.votos_de_comentaristas(bigint) from public, anon;
grant execute on function public.votos_de_comentaristas(bigint) to authenticated;

notify pgrst, 'reload schema';
