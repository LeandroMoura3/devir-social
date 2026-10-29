-- Devir Social — migração 0007: status de cada membro no ciclo atual, visível para os membros.
-- Mostra quem é participante ou espectador e o progresso de cada um para o próximo ciclo.
-- Fica restrito a membros logados: o termo de consentimento cobre o nome público como autor e votante,
-- não uma lista pública de quem é membro.

create or replace function public.membros_ciclo_atual()
returns table (
  perfil_id uuid, nome_publico text, participante boolean, novo boolean, votados int, total int
)
language sql stable security definer set search_path = ''
as $$
  with c as (select * from public.ciclo_em(now()))
  select
    p.id,
    p.nome_publico,
    public.eh_participante_no_ciclo(p.id, c.ciclo_inicio),
    p.criado_em >= c.ciclo_inicio,
    (select count(v.eleitor_id)
       from public.conteudos ct
       left join public.votos v on v.conteudo_id = ct.id and v.eleitor_id = p.id
      where ct.fecha_em >= c.ciclo_inicio and ct.fecha_em < c.ciclo_fim
        and ct.removido_em is null and ct.autor_id <> p.id)::int,
    (select count(*)
       from public.conteudos ct
      where ct.fecha_em >= c.ciclo_inicio and ct.fecha_em < c.ciclo_fim
        and ct.removido_em is null and ct.autor_id <> p.id)::int
  from public.perfis p
  cross join c
  where not p.removido and public.eh_participante()
  order by p.nome_publico;
$$;

revoke execute on function public.membros_ciclo_atual() from public, anon;
grant execute on function public.membros_ciclo_atual() to authenticated;

notify pgrst, 'reload schema';
