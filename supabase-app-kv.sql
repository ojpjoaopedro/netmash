-- ============================================================================
-- app_kv: guarda pequenos textos de configuração do painel (chave -> valor).
-- Hoje é usada para a imagem do Super Admin (chave = 'imagem_superadmin'),
-- que é o plano base fixo, fora do catálogo de produtos.
-- Só o servidor (service key) acessa: RLS ligado, sem policies.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
create table if not exists public.app_kv (
  chave      text primary key,
  valor      text,
  criado_em  timestamptz not null default now()
);

alter table public.app_kv enable row level security;
-- Nenhuma policy de propósito: só o servidor (service key) lê e grava.
