-- Devir Social — migração 0015: registro de cada post publicado e conferência da coordenação.
-- A conferência é uma salvaguarda técnica (a automação pode falhar), não uma regra: o post publicado é
-- sempre o que o algoritmo montou, e "publicar novamente" repete exatamente o mesmo post (mesmas imagens,
-- mesma ordem, mesma legenda). As imagens só são apagadas do app depois da conferência, para permitir
-- publicar de novo se algo sair errado no Instagram.
-- Aplicada em 06/11/2026.

create table public.publicacoes (
  id bigint generated always as identity primary key,
  conteudo_ids bigint[] not null,
  imagem_ids bigint[] not null,
  legenda text not null,
  instagram_media_id text,
  origem text not null check (origem in ('robo', 'coordenacao', 'manual')),
  publicado_em timestamptz not null default now(),
  conferido_em timestamptz,
  conferido_por uuid references public.perfis (id)
);
alter table public.publicacoes enable row level security;
create policy "coordenação vê as publicações" on public.publicacoes
  for select to authenticated using (public.eh_admin());
revoke all on public.publicacoes from anon;

-- Marca os conteúdos e registra o post. Não apaga imagens (isso fica para a conferência).
create or replace function public._registrar_publicacao(
  p_conteudo_ids bigint[], p_imagem_ids bigint[], p_legenda text, p_media_id text, p_origem text
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  novo_id bigint;
begin
  update public.conteudos
  set publicado_em = now(), instagram_media_id = p_media_id
  where id = any (p_conteudo_ids) and fecha_em <= now() and publicado_em is null;
  insert into public.publicacoes (conteudo_ids, imagem_ids, legenda, instagram_media_id, origem)
  values (p_conteudo_ids, p_imagem_ids, p_legenda, p_media_id, p_origem)
  returning id into novo_id;
  return novo_id;
end;
$$;
revoke execute on function public._registrar_publicacao(bigint[], bigint[], text, text, text) from public, anon, authenticated;

drop function public.robo_marcar_publicado(text, bigint[], text);
create function public.robo_registrar_publicacao(
  p_segredo text, p_conteudo_ids bigint[], p_imagem_ids bigint[], p_legenda text, p_media_id text
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  return public._registrar_publicacao(p_conteudo_ids, p_imagem_ids, p_legenda, p_media_id, 'robo');
end;
$$;
revoke execute on function public.robo_registrar_publicacao(text, bigint[], bigint[], text, text) from public, authenticated;
grant execute on function public.robo_registrar_publicacao(text, bigint[], bigint[], text, text) to anon;

-- Coordenação: publicação pelo botão (com media id) ou marcada à mão (sem).
create or replace function public.registrar_publicacao(
  p_conteudo_ids bigint[], p_imagem_ids bigint[], p_legenda text, p_media_id text
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  return public._registrar_publicacao(
    p_conteudo_ids, p_imagem_ids, p_legenda, p_media_id,
    case when p_media_id is null then 'manual' else 'coordenacao' end
  );
end;
$$;

-- Publicar novamente: o mesmo post saiu de novo no Instagram; atualiza o id da mídia.
create or replace function public.republicar(p_publicacao bigint, p_media_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  p public.publicacoes;
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  select * into p from public.publicacoes where id = p_publicacao and conferido_em is null;
  if not found then
    raise exception 'Publicação não encontrada ou já conferida';
  end if;
  update public.publicacoes set instagram_media_id = p_media_id, publicado_em = now() where id = p.id;
  update public.conteudos set instagram_media_id = p_media_id where id = any (p.conteudo_ids);
end;
$$;

-- Conferido: tudo certo no Instagram. Devolve os caminhos das imagens para o app apagar do armazenamento.
create or replace function public.conferir_publicacao(p_publicacao bigint)
returns table (imagem_path text)
language plpgsql security definer set search_path = ''
as $$
declare
  p public.publicacoes;
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  select * into p from public.publicacoes where id = p_publicacao and conferido_em is null;
  if not found then
    raise exception 'Publicação não encontrada ou já conferida';
  end if;
  update public.publicacoes set conferido_em = now(), conferido_por = auth.uid() where id = p.id;
  return query
    update public.conteudos c set imagem_apagada = true
    where c.id = any (p.conteudo_ids) and not c.imagem_apagada
    returning c.imagem_path;
end;
$$;

revoke execute on function public.registrar_publicacao(bigint[], bigint[], text, text) from public, anon;
revoke execute on function public.republicar(bigint, text) from public, anon;
revoke execute on function public.conferir_publicacao(bigint) from public, anon;
grant execute on function public.registrar_publicacao(bigint[], bigint[], text, text) to authenticated;
grant execute on function public.republicar(bigint, text) to authenticated;
grant execute on function public.conferir_publicacao(bigint) to authenticated;

-- O robô não apaga mais imagens.
drop policy "robô apaga imagens já publicadas" on storage.objects;
drop function public.imagem_ja_publicada(text);

notify pgrst, 'reload schema';
