-- Devir Social — esquema do banco (v1)
-- Como aplicar: Supabase → SQL Editor → New query → cole este arquivo inteiro → Run.
--
-- Princípio de segurança: as tabelas só aceitam escrita por funções (RPC) que
-- conferem as regras. Ninguém grava direto em conteudos, votos ou comentarios.

-- ============================================================================
-- Perfis
-- ============================================================================

create table public.perfis (
  id uuid primary key,
  nome_publico text not null check (char_length(trim(nome_publico)) between 2 and 40),
  is_admin boolean not null default false,
  removido boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Nome real e consentimento: só a própria pessoa lê (e a coordenação, pelo painel do Supabase).
create table public.perfis_privados (
  id uuid primary key references public.perfis (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 100),
  consentimento_versao text not null,
  consentimento_em timestamptz not null default now()
);

create or replace function public.eh_participante()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis_privados pp
    join public.perfis p on p.id = pp.id
    where pp.id = auth.uid() and not p.removido
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.perfis where id = auth.uid() and not removido),
    false
  );
$$;

-- Semana do Devir: domingo 0h a sábado 23h59, horário de Brasília. Retorna o domingo.
create or replace function public.semana_de(ts timestamptz)
returns date
language sql stable set search_path = ''
as $$
  select (ts at time zone 'America/Sao_Paulo')::date
         - extract(dow from (ts at time zone 'America/Sao_Paulo'))::int;
$$;

create or replace function public.concluir_cadastro(p_nome text, p_nome_publico text, p_versao text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;
  insert into public.perfis (id, nome_publico)
  values (auth.uid(), trim(p_nome_publico))
  on conflict (id) do update set nome_publico = excluded.nome_publico;
  insert into public.perfis_privados (id, nome, consentimento_versao)
  values (auth.uid(), trim(p_nome), p_versao)
  on conflict (id) do update
    set nome = excluded.nome,
        consentimento_versao = excluded.consentimento_versao,
        consentimento_em = now();
  insert into public.atividade_semanal (perfil_id, semana)
  values (auth.uid(), public.semana_de(now()))
  on conflict do nothing;
end;
$$;

-- ============================================================================
-- Conteúdos
-- ============================================================================

create table public.conteudos (
  id bigint generated always as identity primary key,
  autor_id uuid not null references public.perfis (id),
  texto text not null check (char_length(trim(texto)) between 1 and 5000),
  imagem_path text not null,
  imagem_apagada boolean not null default false,
  criado_em timestamptz not null default now(),
  fecha_em timestamptz not null,
  publicado_em timestamptz,
  removido_motivo text,
  removido_em timestamptz
);

create index conteudos_fecha_em_idx on public.conteudos (fecha_em);

-- Cada conteúdo fica aberto (debate + votação) por 14 dias.
create or replace function public.enviar_conteudo(p_texto text, p_imagem_path text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  novo_id bigint;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de enviar';
  end if;
  if p_imagem_path is null or p_imagem_path not like auth.uid()::text || '/%' then
    raise exception 'Imagem inválida';
  end if;
  insert into public.conteudos (autor_id, texto, imagem_path, fecha_em)
  values (auth.uid(), trim(p_texto), p_imagem_path, now() + interval '14 days')
  returning id into novo_id;
  return novo_id;
end;
$$;

-- ============================================================================
-- Votos (nominais; podem ser mudados até o fechamento)
-- ============================================================================

create table public.votos (
  conteudo_id bigint not null references public.conteudos (id),
  eleitor_id uuid not null references public.perfis (id),
  a_favor boolean not null,
  primeiro_voto_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (conteudo_id, eleitor_id)
);

-- Histórico de cada voto dado ou mudado. É a base do quórum ("participantes da janela").
create table public.votos_eventos (
  id bigint generated always as identity primary key,
  conteudo_id bigint not null references public.conteudos (id),
  eleitor_id uuid not null references public.perfis (id),
  a_favor boolean not null,
  em timestamptz not null default now()
);

create index votos_eventos_em_idx on public.votos_eventos (em);

create or replace function public.votar(p_conteudo bigint, p_a_favor boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.conteudos;
begin
  if not public.eh_participante() then
    raise exception 'Conclua seu cadastro antes de votar';
  end if;
  select * into c from public.conteudos where id = p_conteudo;
  if not found or c.removido_em is not null then
    raise exception 'Conteúdo não encontrado';
  end if;
  if now() >= c.fecha_em then
    raise exception 'A votação deste conteúdo já fechou';
  end if;
  if c.autor_id = auth.uid() then
    raise exception 'Você não pode votar no próprio conteúdo';
  end if;
  insert into public.votos (conteudo_id, eleitor_id, a_favor)
  values (p_conteudo, auth.uid(), p_a_favor)
  on conflict (conteudo_id, eleitor_id) do update
    set a_favor = excluded.a_favor, atualizado_em = now();
  insert into public.votos_eventos (conteudo_id, eleitor_id, a_favor)
  values (p_conteudo, auth.uid(), p_a_favor);
end;
$$;

-- ============================================================================
-- Comentários (com respostas em thread; abertos enquanto o conteúdo está aberto)
-- ============================================================================

create table public.comentarios (
  id bigint generated always as identity primary key,
  conteudo_id bigint not null references public.conteudos (id),
  autor_id uuid not null references public.perfis (id),
  pai_id bigint references public.comentarios (id),
  texto text not null check (char_length(trim(texto)) between 1 and 2000),
  criado_em timestamptz not null default now(),
  removido_motivo text
);

create index comentarios_conteudo_idx on public.comentarios (conteudo_id);

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
  if not found or c.removido_em is not null then
    raise exception 'Conteúdo não encontrado';
  end if;
  if now() >= c.fecha_em then
    raise exception 'O debate deste conteúdo já fechou';
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

-- ============================================================================
-- Atividade semanal (ativo = abriu o app na semana)
-- ============================================================================

create table public.atividade_semanal (
  perfil_id uuid not null references public.perfis (id),
  semana date not null,
  primary key (perfil_id, semana)
);

create or replace function public.registrar_atividade()
returns void
language sql security definer set search_path = ''
as $$
  insert into public.atividade_semanal (perfil_id, semana)
  select p.id, public.semana_de(now())
  from public.perfis p
  where p.id = auth.uid()
  on conflict do nothing;
$$;

-- ============================================================================
-- Resultados (contagens brutas; a classificação fica em src/lib/regras.ts)
-- ============================================================================

-- base = pessoas que votaram em qualquer conteúdo durante a janela deste conteúdo.
create or replace function public._resultados()
returns table (conteudo_id bigint, fecha_em timestamptz, favor int, contra int, base int)
language sql stable security definer set search_path = ''
as $$
  select
    c.id,
    c.fecha_em,
    (select count(*) from public.votos v where v.conteudo_id = c.id and v.a_favor)::int,
    (select count(*) from public.votos v where v.conteudo_id = c.id and not v.a_favor)::int,
    (select count(distinct e.eleitor_id) from public.votos_eventos e
      where e.em >= c.criado_em and e.em < c.fecha_em)::int
  from public.conteudos c
  where c.fecha_em <= now() and c.removido_em is null;
$$;

create or replace function public.resultados()
returns table (conteudo_id bigint, fecha_em timestamptz, favor int, contra int, base int)
language sql stable security definer set search_path = ''
as $$
  select * from public._resultados() where public.eh_participante();
$$;

create or replace function public.participantes_janela(p_conteudo bigint)
returns table (nome_publico text)
language sql stable security definer set search_path = ''
as $$
  select distinct p.nome_publico
  from public.conteudos c
  join public.votos_eventos e on e.em >= c.criado_em and e.em < c.fecha_em
  join public.perfis p on p.id = e.eleitor_id
  where c.id = p_conteudo and c.fecha_em <= now() and public.eh_participante()
  order by p.nome_publico;
$$;

-- ============================================================================
-- Painel público (só totais; acessível sem login)
-- ============================================================================

create or replace function public.painel_semanal()
returns table (
  semana date, membros int, novos int, ativos int, participantes int,
  envios int, votos int, comentarios int, inativos_4_semanas int
)
language sql stable security definer set search_path = ''
as $$
  with semanas as (
    select gs::date as semana
    from generate_series(
      (select public.semana_de(min(criado_em)) from public.perfis)::timestamp,
      public.semana_de(now())::timestamp,
      interval '7 days'
    ) gs
  )
  select
    s.semana,
    (select count(*) from public.perfis p where public.semana_de(p.criado_em) <= s.semana)::int,
    (select count(*) from public.perfis p where public.semana_de(p.criado_em) = s.semana)::int,
    (select count(*) from public.atividade_semanal a where a.semana = s.semana)::int,
    (select count(distinct e.eleitor_id) from public.votos_eventos e
      where public.semana_de(e.em) = s.semana)::int,
    (select count(*) from public.conteudos c where public.semana_de(c.criado_em) = s.semana)::int,
    (select count(*) from public.votos v where public.semana_de(v.primeiro_voto_em) = s.semana)::int,
    (select count(*) from public.comentarios m where public.semana_de(m.criado_em) = s.semana)::int,
    (select count(*) from public.perfis p
      where public.semana_de(p.criado_em) <= s.semana - 21
        and not exists (
          select 1 from public.atividade_semanal a
          where a.perfil_id = p.id and a.semana between s.semana - 21 and s.semana
        ))::int
  from semanas s
  order by s.semana;
$$;

-- Conteúdos fechados por semana de fechamento, sem texto nem nomes.
create or replace function public.painel_fechados()
returns table (semana date, favor int, contra int, base int)
language sql stable security definer set search_path = ''
as $$
  select public.semana_de(r.fecha_em), r.favor, r.contra, r.base
  from public._resultados() r;
$$;

-- ============================================================================
-- Administração
-- ============================================================================

create or replace function public.marcar_publicado(p_ids bigint[])
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  update public.conteudos
  set publicado_em = now(), imagem_apagada = true
  where id = any (p_ids) and fecha_em <= now() and publicado_em is null;
end;
$$;

-- Exceção legal: o conteúdo sai da publicação e o motivo fica registrado.
create or replace function public.remover_conteudo(p_id bigint, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo';
  end if;
  update public.conteudos
  set removido_motivo = trim(p_motivo), removido_em = now()
  where id = p_id and removido_em is null;
end;
$$;

-- ============================================================================
-- Permissões (RLS)
-- ============================================================================

alter table public.perfis enable row level security;
alter table public.perfis_privados enable row level security;
alter table public.conteudos enable row level security;
alter table public.votos enable row level security;
alter table public.votos_eventos enable row level security;
alter table public.comentarios enable row level security;
alter table public.atividade_semanal enable row level security;

create policy "participantes veem perfis" on public.perfis
  for select to authenticated using (public.eh_participante() or id = (select auth.uid()));

create policy "cada um vê seu perfil privado" on public.perfis_privados
  for select to authenticated using (id = (select auth.uid()));

create policy "participantes veem conteúdos" on public.conteudos
  for select to authenticated using (public.eh_participante());

-- O próprio voto sempre; os dos outros só depois do fechamento.
create policy "votos visíveis após o fechamento" on public.votos
  for select to authenticated using (
    public.eh_participante() and (
      eleitor_id = (select auth.uid())
      or exists (select 1 from public.conteudos c where c.id = conteudo_id and c.fecha_em <= now())
    )
  );

create policy "participantes veem comentários" on public.comentarios
  for select to authenticated using (public.eh_participante());

-- votos_eventos e atividade_semanal: sem política de leitura (só via funções).

-- Funções: o Supabase libera tudo por padrão; aqui liberamos só o necessário.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.eh_participante() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.semana_de(timestamptz) to anon, authenticated;
grant execute on function public.concluir_cadastro(text, text, text) to authenticated;
grant execute on function public.enviar_conteudo(text, text) to authenticated;
grant execute on function public.votar(bigint, boolean) to authenticated;
grant execute on function public.comentar(bigint, bigint, text) to authenticated;
grant execute on function public.registrar_atividade() to authenticated;
grant execute on function public.resultados() to authenticated;
grant execute on function public.participantes_janela(bigint) to authenticated;
grant execute on function public.painel_semanal() to anon, authenticated;
grant execute on function public.painel_fechados() to anon, authenticated;
grant execute on function public.marcar_publicado(bigint[]) to authenticated;
grant execute on function public.remover_conteudo(bigint, text) to authenticated;

-- ============================================================================
-- Armazenamento de imagens (privado; até 5 MB; JPG, PNG ou WebP)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "participantes enviam imagens na própria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.eh_participante()
  );

create policy "participantes veem imagens" on storage.objects
  for select to authenticated using (bucket_id = 'imagens' and public.eh_participante());

create policy "coordenação apaga imagens" on storage.objects
  for delete to authenticated using (bucket_id = 'imagens' and public.eh_admin());
