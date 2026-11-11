-- Devir Social — migração 0023 (regras v0.15): cancelamento rápido não conta na cota de envios.
--
-- Um conteúdo cancelado pelo autor em até 15 minutos depois do envio, sem nenhum voto nem comentário, não conta
-- na cota de envios do autor. Continua registrado no blog, com o motivo, como qualquer cancelamento.
-- Vale para conteúdos enviados a partir do ciclo que começa em 15/11/2026 (sem efeito retroativo).
-- O volume do ciclo, usado para ajustar a cota do ciclo seguinte, continua contando todos os envios.

create or replace function public.envios_no_ciclo(p_perfil uuid, p_ciclo_inicio timestamptz, p_ciclo_fim timestamptz)
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.conteudos c
  where c.autor_id = p_perfil and c.criado_em >= p_ciclo_inicio and c.criado_em < p_ciclo_fim
    and not (
      c.criado_em >= timestamptz '2026-11-15 03:00:00+00'
      and c.cancelado
      and c.removido_em <= c.criado_em + interval '15 minutes'
      and not exists (select 1 from public.votos v where v.conteudo_id = c.id)
      and not exists (select 1 from public.comentarios m where m.conteudo_id = c.id)
    );
$$;
revoke execute on function public.envios_no_ciclo(uuid, timestamptz, timestamptz) from public, anon, authenticated;
