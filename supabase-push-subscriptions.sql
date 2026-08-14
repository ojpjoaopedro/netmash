-- ============================================================================
-- Inscrições de notificação push (um por aparelho/navegador do usuário).
-- Só o servidor (service key) acessa: RLS ligado, sem policies.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  user_id    uuid,
  empresa_id uuid,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_push_subs_empresa on public.push_subscriptions (empresa_id);

alter table public.push_subscriptions enable row level security;
-- Nenhuma policy de propósito: só o servidor lê e grava.
