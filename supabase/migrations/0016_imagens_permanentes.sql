-- Devir Social — migração 0016 (regras v0.10): as imagens ficam guardadas para sempre e aparecem no blog.
-- Antes, eram apagadas depois da publicação no Instagram (e, desde a 0015, depois da conferência).
-- Nenhuma imagem tinha sido apagada até aqui (07/11/2026), então nada se perde.
-- O bucket continua privado: o blog gera links temporários das imagens de conteúdos fechados que não foram
-- cancelados nem removidos. Cancelados e removidos por exceção legal não têm imagem pública.

-- Imagens visíveis sem login: conteúdo fechado, não cancelado nem removido.
-- (Também cobre o robô de domingo, que precisa dos links das imagens que vão sair.)
create or replace function public.imagem_publica(p_nome text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conteudos c
    where c.imagem_path = p_nome and c.fecha_em <= now() and c.removido_em is null
  );
$$;
grant execute on function public.imagem_publica(text) to anon;

drop policy "robô lê imagens prontas para publicar" on storage.objects;
drop function public.imagem_pronta_para_publicar(text);
create policy "imagens de conteúdos fechados são públicas" on storage.objects
  for select to anon using (bucket_id = 'imagens' and public.imagem_publica(name));

-- Conferido passa a só registrar a conferência; as imagens ficam.
drop function public.conferir_publicacao(bigint);
create function public.conferir_publicacao(p_publicacao bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  update public.publicacoes set conferido_em = now(), conferido_por = auth.uid()
  where id = p_publicacao and conferido_em is null;
  if not found then
    raise exception 'Publicação não encontrada ou já conferida';
  end if;
end;
$$;
revoke execute on function public.conferir_publicacao(bigint) from public, anon;
grant execute on function public.conferir_publicacao(bigint) to authenticated;

-- Blog: agora com o caminho da imagem.
drop function public.blog_publicados();
create function public.blog_publicados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, fecha_em timestamptz,
  instagram_em timestamptz, ciclo_inicio timestamptz,
  favor int, contra int, indiferente int, base int, quorum_necessario int, detalhe jsonb, imagem_path text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.fecha_em, c.publicado_em, r.ciclo_inicio,
         r.favor, r.contra, r.indiferente, r.base, r.quorum_necessario, r.detalhe,
         case when c.imagem_apagada then null else c.imagem_path end
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  join public._resultados() r on r.conteudo_id = c.id
  where c.fecha_em <= now() and c.removido_em is null
  order by c.fecha_em desc, c.id;
$$;
grant execute on function public.blog_publicados() to anon, authenticated;

notify pgrst, 'reload schema';

-- Membros que aceitaram uma versão anterior do consentimento veem um aviso no app e confirmam a leitura.
create or replace function public.aceitar_consentimento(p_versao text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro primeiro';
  end if;
  update public.perfis_privados
  set consentimento_versao = p_versao, consentimento_em = now()
  where id = auth.uid();
end;
$$;
revoke execute on function public.aceitar_consentimento(text) from public, anon;
grant execute on function public.aceitar_consentimento(text) to authenticated;
notify pgrst, 'reload schema';
