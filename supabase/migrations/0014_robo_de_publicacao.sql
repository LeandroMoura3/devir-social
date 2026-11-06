-- Devir Social — migração 0014 (regras v0.9): publicação automática no Instagram aos domingos.
-- Um agendamento da Vercel chama /api/cron/publicar sem sessão de usuário. Em vez da chave mestra do
-- Supabase, o robô usa um segredo próprio (só o hash fica no banco) e só pode:
--   ler os conteúdos fechados ainda não publicados, ler a conexão com o Instagram e marcar como publicados.
-- Imagens: o robô gera links temporários das imagens fechadas e ainda não publicadas (o Instagram precisa
-- baixá-las) e apaga as já publicadas. Os caminhos têm UUID e só existem nessa janela.
-- Aplicada em 06/11/2026.

create table public.robo (
  id int primary key default 1 check (id = 1),
  segredo_hash text not null
);
alter table public.robo enable row level security;
revoke all on public.robo from anon, authenticated;

create or replace function public._robo_autorizado(p_segredo text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.robo
    where segredo_hash = encode(extensions.digest(coalesce(p_segredo, ''), 'sha256'), 'hex')
  );
$$;
revoke execute on function public._robo_autorizado(text) from public, anon, authenticated;

-- Mesmas entradas do plano de publicação da coordenação (src/lib/plano.ts).
create or replace function public.robo_pendentes(p_segredo text)
returns table (
  conteudo_id bigint, texto text, imagem_path text, criado_em timestamptz, fecha_em timestamptz,
  favor int, contra int, indiferente int, quorum_necessario int, detalhe jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  return query
    select c.id, c.texto, c.imagem_path, c.criado_em, c.fecha_em,
           r.favor, r.contra, r.indiferente, r.quorum_necessario, r.detalhe
    from public.conteudos c
    join public._resultados() r on r.conteudo_id = c.id
    where c.fecha_em <= now() and c.removido_em is null and c.publicado_em is null
    order by c.id;
end;
$$;

create or replace function public.robo_conexao(p_segredo text)
returns table (via text, usuario_id text, token text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  return query select ic.via, ic.usuario_id, ic.token from public.instagram_conexao ic;
end;
$$;

create or replace function public.robo_marcar_publicado(p_segredo text, p_ids bigint[], p_instagram_media_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  update public.conteudos
  set publicado_em = now(), imagem_apagada = true, instagram_media_id = p_instagram_media_id
  where id = any (p_ids) and fecha_em <= now() and publicado_em is null;
end;
$$;

revoke execute on function public.robo_pendentes(text) from public, authenticated;
revoke execute on function public.robo_conexao(text) from public, authenticated;
revoke execute on function public.robo_marcar_publicado(text, bigint[], text) from public, authenticated;
grant execute on function public.robo_pendentes(text) to anon;
grant execute on function public.robo_conexao(text) to anon;
grant execute on function public.robo_marcar_publicado(text, bigint[], text) to anon;

-- Imagens: o robô (sem login) gera links das que vão sair e apaga as que já saíram.
create policy "robô lê imagens prontas para publicar" on storage.objects
  for select to anon using (
    bucket_id = 'imagens' and exists (
      select 1 from public.conteudos c
      where c.imagem_path = name and c.fecha_em <= now() and c.removido_em is null and c.publicado_em is null
    )
  );

create policy "robô apaga imagens já publicadas" on storage.objects
  for delete to anon using (
    bucket_id = 'imagens' and exists (
      select 1 from public.conteudos c where c.imagem_path = name and c.publicado_em is not null
    )
  );

notify pgrst, 'reload schema';
