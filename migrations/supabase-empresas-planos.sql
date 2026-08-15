-- ============================================================================
-- Coluna "planos" na tabela empresas
-- ----------------------------------------------------------------------------
-- Guarda quais módulos (planos) cada empresa tem ATIVOS, controlados pelos
-- toggles do painel Admin (aba Empresas). Ex.: { "folha": true, "acesso2": false,
-- "planejamento": true }. O Super Admin é o plano base (sempre ativo, não entra aqui).
--
-- Rode UMA vez no SQL Editor do Supabase (projeto "minha metricas app"
-- = gaormginkujgisardsjk). Pode rodar de novo sem problema.
-- ============================================================================

alter table public.empresas
  add column if not exists planos jsonb not null default '{}'::jsonb;
