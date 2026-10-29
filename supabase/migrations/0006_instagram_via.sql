-- Devir Social — migração 0006: qual caminho da Meta a conexão do Instagram usa.
-- "instagram": login do Instagram, token renovável de 60 dias.
-- "facebook": login do Facebook com Página vinculada, token de página que não vence.

alter table public.instagram_conexao
  add column via text not null default 'instagram' check (via in ('instagram', 'facebook'));
