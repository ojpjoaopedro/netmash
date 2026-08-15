-- ============================================================================
-- CPF do responsável principal (Super Admin) de cada empresa.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
alter table public.empresas
  add column if not exists responsavel_cpf text;
