-- ============================================================================
-- CORREÇÃO CRÍTICA DE ISOLAMENTO (P0) — vazamento entre empresas
-- ----------------------------------------------------------------------------
-- As tabelas `painel_estado` e `financas_estrutura` estavam com política RLS
-- ABERTA (`using (true) with check (true)`), permitindo que QUALQUER usuário
-- logado lesse/alterasse/apagasse os dados de QUALQUER empresa:
--   • painel_estado    = equipe (CPF/PIX/e-mail/nascimento), calendários, marca, termos
--   • financas_estrutura = toda a estrutura de receitas e custos por ano
--
-- Este arquivo troca essas políticas para filtrar por empresa do usuário logado,
-- usando a função public.meu_empresa_id() (definida em `supabase-rls.sql`).
--
-- PRÉ-REQUISITO: rode ANTES o `supabase-rls.sql` (cria meu_empresa_id() e o RLS
-- das demais tabelas). Depois rode este arquivo UMA vez no SQL Editor do Supabase.
--
-- Como testar: com DUAS contas de empresas diferentes, confirme que uma NÃO lê
-- os dados da outra (nem em painel_estado, nem em financas_estrutura).
-- ============================================================================

-- Garante que a função exista (falha claramente se o supabase-rls.sql não rodou)
do $$
begin
  if to_regprocedure('public.meu_empresa_id()') is null then
    raise exception 'Rode supabase-rls.sql primeiro: a função public.meu_empresa_id() não existe.';
  end if;
end $$;

-- ---- painel_estado -----------------------------------------------------------
alter table public.painel_estado enable row level security;
drop policy if exists "painel_estado_all" on public.painel_estado;
drop policy if exists "painel_estado_rls" on public.painel_estado;
create policy "painel_estado_rls"
  on public.painel_estado
  for all
  to authenticated
  using (empresa_id = public.meu_empresa_id())
  with check (empresa_id = public.meu_empresa_id());

-- ---- financas_estrutura ------------------------------------------------------
alter table public.financas_estrutura enable row level security;
drop policy if exists "fin_estrutura_auth_all" on public.financas_estrutura;
drop policy if exists "fin_estrutura_rls" on public.financas_estrutura;
create policy "fin_estrutura_rls"
  on public.financas_estrutura
  for all
  to authenticated
  using (empresa_id = public.meu_empresa_id())
  with check (empresa_id = public.meu_empresa_id());
