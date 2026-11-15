-- Devir Social — migração 0026 (regras v0.18): publicação substituída.
-- Os posts de 15/11 (#9 e #2) saíram no modelo de legenda anterior, sem interação, e foram apagados e
-- republicados no modelo novo. A publicação original continua registrada, marcada como substituída.
alter table public.publicacoes
  add column substituida_em timestamptz,
  add column substituida_por bigint references public.publicacoes (id),
  add column observacao text;
