-- Devir Social — migração 0011 (regras v0.7): cota de envios por ciclo e contatos entre membros.
--
-- Cota: cada membro pode enviar até "cota" conteúdos por ciclo. A cota é a mesma para todos e se ajusta
-- sozinha pelo volume do ciclo anterior (conteúdos enviados, incluindo cancelados e removidos):
--   volume > alvo            → cai 1
--   volume < metade do alvo  → sobe 1
--   entre os dois            → mantém
-- Sempre entre 1 e 5; no primeiro ciclo do piloto, 3. O alvo é um parâmetro público versionado.
-- Espelho em src/lib/cota.ts (proximaCota), com testes.
--
-- Contatos: WhatsApp e e-mail de contato opcionais, visíveis só para membros e só se a pessoa permitir.
-- Aplicada em 06/11/2026.

alter table public.parametros add column alvo_conteudos int not null default 20 check (alvo_conteudos > 0);

drop function public.agendar_parametros(int, int, int, int);
create function public.agendar_parametros(
  p_dias_conteudo int, p_dias_ciclo int, p_participacao_minima int, p_quorum int, p_alvo_conteudos int
)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  proximo timestamptz;
begin
  if auth.uid() is not null and not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  select c.ciclo_fim into proximo from public.ciclo_em(now()) c;
  insert into public.parametros (inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum, alvo_conteudos)
  values (proximo, p_dias_conteudo, p_dias_ciclo, p_participacao_minima, p_quorum, p_alvo_conteudos)
  on conflict (inicio) do update
    set dias_conteudo = excluded.dias_conteudo,
        dias_ciclo = excluded.dias_ciclo,
        participacao_minima = excluded.participacao_minima,
        quorum = excluded.quorum,
        alvo_conteudos = excluded.alvo_conteudos,
        criado_em = now();
  return proximo;
end;
$$;
revoke execute on function public.agendar_parametros(int, int, int, int, int) from public, anon;
grant execute on function public.agendar_parametros(int, int, int, int, int) to authenticated;

-- Histórico público da cota, ciclo a ciclo, até o ciclo atual (inclusive).
create or replace function public.cotas_por_ciclo()
returns table (ciclo_inicio timestamptz, ciclo_fim timestamptz, cota int, volume int, alvo int)
language plpgsql stable security definer set search_path = ''
as $$
declare
  atual record;
  cursor_ts timestamptz;
  limite timestamptz;
  q int := 3;
begin
  select min(inicio) into cursor_ts from public.parametros;
  select c.ciclo_fim into limite from public.ciclo_em(now()) c;
  while cursor_ts < limite loop
    select * into atual from public.ciclo_em(cursor_ts);
    ciclo_inicio := atual.ciclo_inicio;
    ciclo_fim := atual.ciclo_fim;
    cota := q;
    alvo := (public.parametros_em(atual.ciclo_inicio)).alvo_conteudos;
    volume := (
      select count(*) from public.conteudos ct
      where ct.criado_em >= atual.ciclo_inicio and ct.criado_em < atual.ciclo_fim
    );
    return next;
    if volume > alvo then
      q := greatest(1, q - 1);
    elsif volume * 2 < alvo then
      q := least(5, q + 1);
    end if;
    cursor_ts := atual.ciclo_fim;
  end loop;
end;
$$;

create or replace function public.envios_no_ciclo(p_perfil uuid, p_ciclo_inicio timestamptz, p_ciclo_fim timestamptz)
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.conteudos
  where autor_id = p_perfil and criado_em >= p_ciclo_inicio and criado_em < p_ciclo_fim;
$$;
revoke execute on function public.envios_no_ciclo(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.minha_cota()
returns table (ciclo_inicio timestamptz, ciclo_fim timestamptz, cota int, usados int)
language sql stable security definer set search_path = ''
as $$
  select c.ciclo_inicio, c.ciclo_fim, c.cota, public.envios_no_ciclo(auth.uid(), c.ciclo_inicio, c.ciclo_fim)
  from public.cotas_por_ciclo() c
  where public.eh_participante()
  order by c.ciclo_inicio desc
  limit 1;
$$;

create or replace function public.enviar_conteudo(p_texto text, p_imagem_path text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  novo_id bigint;
  c record;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de enviar';
  end if;
  if p_imagem_path is null or p_imagem_path not like auth.uid()::text || '/%' then
    raise exception 'Imagem inválida';
  end if;
  select * into c from public.minha_cota();
  if c.usados >= c.cota then
    raise exception 'Você já usou seus % envios deste ciclo. Novos envios a partir de %.',
      c.cota, to_char(c.ciclo_fim at time zone 'America/Sao_Paulo', 'DD/MM');
  end if;
  insert into public.conteudos (autor_id, texto, imagem_path, fecha_em)
  values (
    auth.uid(),
    trim(p_texto),
    p_imagem_path,
    now() + make_interval(days => (public.parametros_em(now())).dias_conteudo)
  )
  returning id into novo_id;
  return novo_id;
end;
$$;

-- Contatos
alter table public.perfis_privados
  add column whatsapp text check (whatsapp ~ '^[0-9]{12,15}$'),
  add column email_contato text,
  add column usar_email_cadastro boolean not null default false,
  add column mostrar_contato boolean not null default false;

create or replace function public.salvar_contato(
  p_whatsapp text, p_email text, p_usar_email_cadastro boolean, p_mostrar boolean
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  numero text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  email text := nullif(trim(coalesce(p_email, '')), '');
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro primeiro';
  end if;
  -- Número brasileiro sem código do país (DDD + número): acrescenta 55.
  if length(numero) in (10, 11) then
    numero := '55' || numero;
  end if;
  if numero <> '' and numero !~ '^[0-9]{12,15}$' then
    raise exception 'WhatsApp inválido. Use DDD + número, ou o código do país.';
  end if;
  if p_usar_email_cadastro then
    email := null;
  elsif email is not null and email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail de contato inválido';
  end if;
  update public.perfis_privados
  set whatsapp = nullif(numero, ''),
      email_contato = email,
      usar_email_cadastro = coalesce(p_usar_email_cadastro, false),
      mostrar_contato = coalesce(p_mostrar, false)
  where id = auth.uid();
end;
$$;

-- Membros: agora com envios disponíveis no ciclo e contato (só de quem permitiu).
drop function public.membros_ciclo_atual();
create function public.membros_ciclo_atual()
returns table (
  perfil_id uuid, nome_publico text, participante boolean, novo boolean, votados int, total int,
  envios_disponiveis int, whatsapp text, email text
)
language sql stable security definer set search_path = ''
as $$
  with c as (select * from public.ciclo_em(now())),
  q as (select cota from public.cotas_por_ciclo() order by ciclo_inicio desc limit 1)
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
        and ct.removido_em is null and ct.autor_id <> p.id)::int,
    greatest(0, q.cota - public.envios_no_ciclo(p.id, c.ciclo_inicio, c.ciclo_fim)),
    case when pp.mostrar_contato then pp.whatsapp end,
    case when pp.mostrar_contato then
      case when pp.usar_email_cadastro then (select u.email from auth.users u where u.id = p.id)::text
           else pp.email_contato end
    end
  from public.perfis p
  cross join c
  cross join q
  left join public.perfis_privados pp on pp.id = p.id
  where not p.removido and public.eh_participante()
  order by p.nome_publico;
$$;

revoke execute on function public.minha_cota() from public, anon;
revoke execute on function public.salvar_contato(text, text, boolean, boolean) from public, anon;
revoke execute on function public.membros_ciclo_atual() from public, anon;
grant execute on function public.cotas_por_ciclo() to anon, authenticated;
grant execute on function public.minha_cota() to authenticated;
grant execute on function public.salvar_contato(text, text, boolean, boolean) to authenticated;
grant execute on function public.membros_ciclo_atual() to authenticated;

notify pgrst, 'reload schema';
