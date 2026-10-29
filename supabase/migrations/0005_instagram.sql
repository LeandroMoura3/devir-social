-- Devir Social — migração 0005: publicação no Instagram pelo app.
-- O token de acesso fica numa tabela que só a coordenação lê e atualiza (o app renova antes de vencer).
-- Cada conteúdo guarda o id do post do Instagram onde saiu.

create table public.instagram_conexao (
  id int primary key default 1 check (id = 1),
  usuario_id text not null,
  token text not null,
  renovado_em timestamptz not null default now()
);

alter table public.instagram_conexao enable row level security;

create policy "coordenação lê a conexão" on public.instagram_conexao
  for select to authenticated using (public.eh_admin());

create policy "coordenação renova o token" on public.instagram_conexao
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

revoke all on public.instagram_conexao from anon;

alter table public.conteudos add column instagram_media_id text;

drop function public.marcar_publicado(bigint[]);

create or replace function public.marcar_publicado(p_ids bigint[], p_instagram_media_id text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  update public.conteudos
  set publicado_em = now(), imagem_apagada = true, instagram_media_id = p_instagram_media_id
  where id = any (p_ids) and fecha_em <= now() and publicado_em is null;
end;
$$;

revoke execute on function public.marcar_publicado(bigint[], text) from public, anon;
grant execute on function public.marcar_publicado(bigint[], text) to authenticated;

notify pgrst, 'reload schema';
