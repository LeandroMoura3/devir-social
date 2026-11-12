-- Devir Social — migração 0024 (regras v0.16): a participação garantida de quem entrou exige um voto.
--
-- Antes: quem entrou num ciclo era participante garantido no ciclo seguinte, mesmo sem fazer nada — e assim
-- inflava a base do quórum por um ciclo. Agora a garantia exige pelo menos um voto (em qualquer conteúdo, com
-- qualquer opção) dado no ciclo em que a pessoa entrou. Quem não votou segue espectador até votar o suficiente.
-- Vale para quem entrou a partir de 15/11/2026; quem entrou antes mantém a promessa antiga.

create or replace function public.eh_participante_no_ciclo(p_perfil uuid, p_ciclo_inicio timestamptz)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  criado timestamptz;
  anterior timestamptz;
  total int;
  votados int;
begin
  select criado_em into criado from public.perfis where id = p_perfil and not removido;
  if criado is null or criado >= p_ciclo_inicio then
    return false; -- entrou neste ciclo: espectador
  end if;
  select c.ciclo_inicio into anterior from public.ciclo_em(p_ciclo_inicio - interval '1 second') c;
  if criado >= anterior then
    -- entrou no ciclo anterior: participante garantido (desde 15/11/2026, só se votou ao menos uma vez nele)
    return criado < timestamptz '2026-11-15 03:00:00+00'
      or exists (
        select 1 from public.votos v
        where v.eleitor_id = p_perfil and v.primeiro_voto_em >= anterior and v.primeiro_voto_em < p_ciclo_inicio
      );
  end if;
  select count(*), count(v.eleitor_id) into total, votados
  from public.conteudos ct
  left join public.votos v on v.conteudo_id = ct.id and v.eleitor_id = p_perfil
  where ct.fecha_em >= anterior
    and ct.fecha_em < p_ciclo_inicio
    and ct.removido_em is null
    and ct.autor_id <> p_perfil;
  if total = 0 then
    return true;
  end if;
  return votados * 100 >= (public.parametros_em(p_ciclo_inicio)).participacao_minima * total;
end;
$$;
