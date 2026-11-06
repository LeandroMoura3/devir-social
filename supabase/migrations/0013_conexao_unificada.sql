-- Devir Social — migração 0013: conexão com o Instagram pelo login unificado da Meta.
-- O token (Business Integration System User Access Token) chega pela rota de retorno do app e é usado
-- em graph.facebook.com, como no caminho "facebook"; por isso a conexão é gravada com via = 'facebook'.
-- Só a coordenação grava. Aplicada em 06/11/2026.

create or replace function public.salvar_conexao_instagram(p_usuario_id text, p_token text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente a coordenação';
  end if;
  if coalesce(p_usuario_id, '') = '' or coalesce(p_token, '') = '' then
    raise exception 'Conexão incompleta';
  end if;
  insert into public.instagram_conexao (id, usuario_id, token, renovado_em, via)
  values (1, p_usuario_id, p_token, now(), 'facebook')
  on conflict (id) do update
    set usuario_id = excluded.usuario_id,
        token = excluded.token,
        renovado_em = excluded.renovado_em,
        via = excluded.via;
end;
$$;

revoke execute on function public.salvar_conexao_instagram(text, text) from public, anon;
grant execute on function public.salvar_conexao_instagram(text, text) to authenticated;

notify pgrst, 'reload schema';
