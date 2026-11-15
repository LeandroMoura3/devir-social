-- Devir Social — migração 0027 (regras v0.21): Story "Resultado da semana", publicado pelo robô no domingo,
-- depois dos avisos de post novo. Não se refere a um conteúdo nem a um grupo de Destaques.
alter table public.stories drop constraint stories_tipo_check;
alter table public.stories add constraint stories_tipo_check
  check (tipo in ('aviso', 'institucional', 'republicacao', 'resumo'));
alter table public.stories drop constraint stories_check1;
alter table public.stories add constraint stories_check1
  check ((tipo in ('aviso', 'republicacao')) = (conteudo_id is not null));
