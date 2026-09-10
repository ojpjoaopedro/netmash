-- ============================================================================
-- Tráfego Pago (Análise de marketing do /admin). Espelha o modelo do Hub:
-- dados por (mês, semana, campanha). A semana é bloco de 7 dias (S1 01-07 ...
-- S5 29-fim); o mês fechado é a soma das semanas. Preenchido à mão ou puxado
-- da Meta (Facebook). Só o servidor (service key) acessa: RLS ligado, sem policy.
--
-- Configs (pixel, token/conta da Meta, meta de CPL, meta de leads, imposto) ficam
-- na tabela app_kv. Rodar UMA vez no SQL Editor do Supabase (gaormginkujgisardsjk).
-- ============================================================================

-- versão antiga (mensal), se você chegou a rodar: pode remover.
drop table if exists public.trafego_mensal;

create table if not exists public.trafego_resultados (
  id                uuid primary key default gen_random_uuid(),
  mes               text     not null,               -- 'YYYY-MM'
  semana            smallint not null,               -- 1..5
  campanha          text     not null,
  investido         numeric  not null default 0,
  impressoes        bigint   not null default 0,
  cliques           integer  not null default 0,
  leads             integer  not null default 0,     -- leads gerados
  leads_plataforma  integer  not null default 0,
  leads_planilha    integer  not null default 0,
  origem            text     not null default 'manual',  -- 'manual' | 'meta'
  posicao           integer  not null default 0,
  atualizado_em     timestamptz not null default now(),
  unique (mes, semana, campanha)
);

create index if not exists idx_trafego_resultados_mes on public.trafego_resultados (mes);

alter table public.trafego_resultados enable row level security;
-- Nenhuma policy de propósito: só o servidor (service key) lê e grava.
