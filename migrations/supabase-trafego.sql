-- ============================================================================
-- trafego_mensal: dados de tráfego pago por mês (Análise de Tráfego do /admin).
-- Uma linha por mês ('YYYY-MM'). Preenchida à mão ou puxada da Meta (Facebook).
-- Só o servidor (service key) acessa: RLS ligado, sem policies.
-- As configs (pixel, token da Meta, meta de CPL, imposto) ficam na tabela app_kv
-- (chaves: pixel_id, meta_access_token, meta_ad_account_id, trafego_meta_cpl,
--  trafego_imposto). Rodar UMA vez no SQL Editor do Supabase (gaormginkujgisardsjk).
-- ============================================================================
create table if not exists public.trafego_mensal (
  mes            text primary key,          -- 'YYYY-MM'
  investido      numeric  not null default 0,
  leads          integer  not null default 0,
  impressoes     bigint   not null default 0,
  cliques        integer  not null default 0,
  vendas         integer  not null default 0,
  campanhas      integer  not null default 0,
  origem         text     not null default 'manual',  -- 'manual' | 'meta'
  atualizado_em  timestamptz not null default now()
);

alter table public.trafego_mensal enable row level security;
-- Nenhuma policy de propósito: só o servidor (service key) lê e grava.
