-- Devir Social — migração 0029: registro de cada execução do robô (agendamento diário).
-- Para saber se o agendamento disparou e o que aconteceu, sem depender dos registros da Vercel.
-- Só a coordenação lê; só o robô (com o segredo dele) grava.
create table public.robo_execucoes (
  id bigserial primary key,
  iniciada_em timestamptz not null default now(),
  dia int not null,
  tarefa text,
  status int,
  resposta jsonb
);
alter table public.robo_execucoes enable row level security;
revoke all on public.robo_execucoes from anon, authenticated;

create or replace function public.robo_registrar_execucao(p_segredo text, p_dia int, p_tarefa text, p_status int, p_resposta jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public._robo_autorizado(p_segredo) then
    raise exception 'Robô não autorizado';
  end if;
  insert into public.robo_execucoes (dia, tarefa, status, resposta) values (p_dia, p_tarefa, p_status, p_resposta);
end;
$$;
revoke execute on function public.robo_registrar_execucao(text, int, text, int, jsonb) from public;
grant execute on function public.robo_registrar_execucao(text, int, text, int, jsonb) to anon, authenticated;

create or replace function public.execucoes_do_robo()
returns table (iniciada_em timestamptz, dia int, tarefa text, status int, resposta jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  return query select e.iniciada_em, e.dia, e.tarefa, e.status, e.resposta
    from public.robo_execucoes e order by e.iniciada_em desc limit 20;
end;
$$;
grant execute on function public.execucoes_do_robo() to authenticated;
