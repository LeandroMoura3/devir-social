-- Devir Social — migração 0025 (regras v0.17): Stories publicados pelo robô, com histórico público.
--   aviso: domingo, depois de cada post do feed ("post novo");
--   institucional: quarta, um grupo dos Destaques, em rodízio;
--   republicacao: quarta, um post antigo de volta, pelo rodízio com peso por faixa (src/lib/rodizio.ts).
-- O histórico é público (é dele que sai o contador do rodízio) e só o robô registra, com o segredo dele.

create table public.stories (
  id bigserial primary key,
  publicado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('aviso', 'institucional', 'republicacao')),
  conteudo_id bigint references public.conteudos (id),
  grupo text,
  instagram_media_id text not null,
  check ((tipo = 'institucional') = (grupo is not null)),
  check ((tipo = 'institucional') = (conteudo_id is null))
);
create index stories_conteudo on public.stories (conteudo_id);

alter table public.stories enable row level security;
create policy "stories são públicos" on public.stories for select to anon, authenticated using (true);
revoke insert, update, delete on public.stories from anon, authenticated;

create or replace function public.robo_registrar_story(
  p_segredo text, p_tipo text, p_conteudo_id bigint, p_grupo text, p_media_id text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  insert into public.stories (tipo, conteudo_id, grupo, instagram_media_id)
  values (p_tipo, p_conteudo_id, p_grupo, p_media_id);
end;
$$;
revoke execute on function public.robo_registrar_story(text, text, bigint, text, text) from public;
grant execute on function public.robo_registrar_story(text, text, bigint, text, text) to anon, authenticated;
