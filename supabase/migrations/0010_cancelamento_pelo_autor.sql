-- Devir Social — migração 0010 (regras v0.6): o autor pode cancelar o próprio conteúdo enquanto ele está aberto.
-- Cancelar usa o mesmo caminho da remoção (removido_em), então o conteúdo sai da classificação, do Instagram
-- e da conta de participação, e votos e comentários fecham. A diferença: cancelado = true, motivo opcional,
-- e o blog registra o texto completo e os votos dados até o cancelamento.
-- Aplicada em 05/11/2026.

alter table public.conteudos add column cancelado boolean not null default false;

create or replace function public.cancelar_conteudo(p_id bigint, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.conteudos;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro primeiro';
  end if;
  select * into c from public.conteudos where id = p_id;
  if not found or c.autor_id <> auth.uid() then
    raise exception 'Só o autor pode cancelar o conteúdo';
  end if;
  if c.removido_em is not null then
    raise exception 'Este conteúdo já foi cancelado ou removido';
  end if;
  if now() >= c.fecha_em then
    raise exception 'A votação já fechou; não dá mais para cancelar';
  end if;
  update public.conteudos
  set removido_em = now(), removido_motivo = nullif(trim(p_motivo), ''), cancelado = true
  where id = p_id;
end;
$$;

-- Remoções da coordenação (exceção legal) não incluem cancelamentos.
create or replace function public.blog_remocoes()
returns table (conteudo_id bigint, motivo text, removido_em timestamptz)
language sql stable security definer set search_path = ''
as $$
  select id, removido_motivo, removido_em
  from public.conteudos
  where removido_em is not null and not cancelado
  order by removido_em desc;
$$;

-- Cancelados pelo autor: texto completo e contagem por sentimento de todos os votos até o cancelamento
-- (participantes e espectadores; não é resultado, porque o conteúdo não chegou a fechar).
create or replace function public.blog_cancelados()
returns table (
  conteudo_id bigint, texto text, autor text, criado_em timestamptz, cancelado_em timestamptz,
  motivo text, detalhe jsonb
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.texto, p.nome_publico, c.criado_em, c.removido_em, c.removido_motivo,
         coalesce((select jsonb_object_agg(x.voto, x.n)
                   from (select v.voto, count(*) as n from public.votos v where v.conteudo_id = c.id group by v.voto) x),
                  '{}'::jsonb)
  from public.conteudos c
  join public.perfis p on p.id = c.autor_id
  where c.cancelado
  order by c.removido_em desc, c.id;
$$;

revoke execute on function public.cancelar_conteudo(bigint, text) from public, anon;
grant execute on function public.cancelar_conteudo(bigint, text) to authenticated;
grant execute on function public.blog_remocoes() to anon, authenticated;
grant execute on function public.blog_cancelados() to anon, authenticated;

notify pgrst, 'reload schema';
