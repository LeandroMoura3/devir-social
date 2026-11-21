-- Devir Social — migração 0030 (regras v0.23): Bluesky como canal de publicação.
-- Credenciais (senha de app, revogável no Bluesky) ficam no banco, só acessíveis pelo robô com o segredo dele,
-- como a conexão do Instagram. Cada post publicado no Bluesky fica registrado (para repostar na quarta).
create table public.bluesky_conexao (
  id int primary key default 1 check (id = 1),
  identificador text not null,
  senha_app text not null,
  atualizada_em timestamptz not null default now()
);
alter table public.bluesky_conexao enable row level security;
revoke all on public.bluesky_conexao from anon, authenticated;

create table public.bluesky_posts (
  id bigserial primary key,
  publicado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('conteudo', 'codigos', 'resumo', 'andamento', 'repost', 'devolta', 'fixado')),
  conteudo_id bigint references public.conteudos (id),
  uri text not null,
  cid text not null
);
create index bluesky_posts_conteudo on public.bluesky_posts (conteudo_id);
alter table public.bluesky_posts enable row level security;
create policy "posts do bluesky são públicos" on public.bluesky_posts for select to anon, authenticated using (true);
revoke insert, update, delete on public.bluesky_posts from anon, authenticated;

create or replace function public.robo_bluesky(p_segredo text)
returns table (identificador text, senha_app text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  return query select b.identificador, b.senha_app from public.bluesky_conexao b where b.id = 1;
end;
$$;
revoke execute on function public.robo_bluesky(text) from public;
grant execute on function public.robo_bluesky(text) to anon, authenticated;

create or replace function public.robo_registrar_bluesky(
  p_segredo text, p_tipo text, p_conteudo_id bigint, p_uri text, p_cid text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  insert into public.bluesky_posts (tipo, conteudo_id, uri, cid) values (p_tipo, p_conteudo_id, p_uri, p_cid);
end;
$$;
revoke execute on function public.robo_registrar_bluesky(text, text, bigint, text, text) from public;
grant execute on function public.robo_registrar_bluesky(text, text, bigint, text, text) to anon, authenticated;
