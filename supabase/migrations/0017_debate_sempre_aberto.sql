-- Devir Social — migração 0017 (regras v0.11): o debate não fecha, só a votação.
-- Comentários continuam aceitos depois do fechamento e no conteúdo cancelado; o app marca os que vieram
-- depois ("após o fechamento" / "após o cancelamento"). Exceção: removidos por exceção legal fecham o debate.
-- Cancelados passam a ter imagem pública, como o texto. Removidos por exceção legal, não.
-- Aplicada em 08/11/2026.

create or replace function public.comentar(p_conteudo bigint, p_pai bigint, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.conteudos;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de comentar';
  end if;
  select * into c from public.conteudos where id = p_conteudo;
  if not found or (c.removido_em is not null and not c.cancelado) then
    raise exception 'Conteúdo não encontrado';
  end if;
  if p_pai is not null and not exists (
    select 1 from public.comentarios where id = p_pai and conteudo_id = p_conteudo
  ) then
    raise exception 'Comentário de origem inválido';
  end if;
  insert into public.comentarios (conteudo_id, autor_id, pai_id, texto)
  values (p_conteudo, auth.uid(), p_pai, trim(p_texto));
end;
$$;

create or replace function public.imagem_publica(p_nome text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conteudos c
    where c.imagem_path = p_nome
      and (c.cancelado or (c.fecha_em <= now() and c.removido_em is null))
  );
$$;

-- Lista de cancelados com o caminho da imagem.
drop function public.blog_cancelados();
create function public.blog_cancelados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, cancelado_em timestamptz,
  motivo text, ciclo_inicio timestamptz, detalhe jsonb, imagem_path text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.removido_em, c.removido_motivo, ci.ciclo_inicio,
         coalesce((select jsonb_object_agg(x.voto, x.n)
                   from (select v.voto, count(*) as n
                         from public.votos v
                         join public._participantes_do_ciclo(ci.ciclo_inicio) pc on pc.perfil_id = v.eleitor_id
                         where v.conteudo_id = c.id
                         group by v.voto) x),
                  '{}'::jsonb),
         case when c.imagem_apagada then null else c.imagem_path end
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  cross join lateral public.ciclo_em(c.removido_em) ci
  where c.cancelado
  order by c.removido_em desc, c.id;
$$;
grant execute on function public.blog_cancelados() to anon, authenticated;

notify pgrst, 'reload schema';
