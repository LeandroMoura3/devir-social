-- Devir Social — migração 0028 (regras v0.22): Story "Andamento da semana" (sexta).
-- Só contagens: quantos conteúdos estão em debate e quantos fecham até a próxima publicação. Nada de tema,
-- autor ou placar (as contagens de votos continuam escondidas até o fechamento).
alter table public.stories drop constraint stories_tipo_check;
alter table public.stories add constraint stories_tipo_check
  check (tipo in ('aviso', 'institucional', 'republicacao', 'resumo', 'andamento'));

create or replace function public.andamento_semana(p_limite timestamptz)
returns table (abertos int, fecham_ate_o_limite int)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int, count(*) filter (where c.fecha_em <= p_limite)::int
  from public.conteudos c
  where c.fecha_em > now() and c.removido_em is null and not c.cancelado;
$$;
grant execute on function public.andamento_semana(timestamptz) to anon, authenticated;
