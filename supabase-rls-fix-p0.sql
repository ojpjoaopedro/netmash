-- ============================================================================
-- CORREÇÃO CRÍTICA DE ISOLAMENTO (P0) — vazamento entre empresas
-- ----------------------------------------------------------------------------
-- As tabelas `painel_estado` e `financas_estrutura` estavam com política RLS
-- ABERTA (`using (true) with check (true)`), permitindo que QUALQUER usuário
-- logado lesse/alterasse/apagasse os dados de QUALQUER empresa:
--   • painel_estado      = equipe (CPF/PIX/e-mail/nascimento), calendários, marca, termos
--   • financas_estrutura = toda a estrutura de receitas e custos por ano
--
-- Este arquivo é AUTOSSUFICIENTE: cria a função public.meu_empresa_id() (se ainda
-- não existir) e troca as políticas dessas DUAS tabelas para filtrar por empresa
-- do usuário logado. Ele NÃO liga o RLS das tabelas do núcleo (empresas, perfis,
-- lançamentos etc.) — isso fica para uma etapa posterior (supabase-rls.sql).
--
-- Rode UMA vez no SQL Editor do Supabase → Run. Pode rodar de novo sem problema
-- (é idempotente: só substitui o que precisa).
--
-- A função abaixo é a MESMA lógica que o app usa em @/lib/empresa-atual.ts:
-- primeiro a empresa do perfil (colaborador), senão a empresa da qual o usuário
-- é dono. Assim a trava resolve exatamente o mesmo id que o app grava.
--
-- Como testar: com DUAS contas de empresas diferentes, confirme que uma NÃO lê
-- os dados da outra (nem em painel_estado, nem em financas_estrutura).
-- Se algo travar, o ROLLBACK está no rodapé.
-- ============================================================================

-- 1) Empresa do usuário logado (colaborador OU dono).
--    SECURITY DEFINER lê perfis/empresas sem passar pelo RLS (evita recursão).
create or replace function public.meu_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select empresa_id from public.perfis   where id = auth.uid()),
    (select id         from public.empresas where dono_id = auth.uid()
       order by criado_em asc limit 1)
  )
$$;

revoke all on function public.meu_empresa_id() from public;
grant execute on function public.meu_empresa_id() to authenticated;

-- 2) painel_estado — trocar a política aberta pela filtrada por empresa
--    (só se a tabela existir neste banco; senão pula sem erro)
do $$
begin
  if to_regclass('public.painel_estado') is not null then
    execute 'alter table public.painel_estado enable row level security';
    execute 'drop policy if exists "painel_estado_all" on public.painel_estado';
    execute 'drop policy if exists "painel_estado_rls" on public.painel_estado';
    execute 'create policy "painel_estado_rls" on public.painel_estado for all to authenticated using (empresa_id = public.meu_empresa_id()) with check (empresa_id = public.meu_empresa_id())';
  end if;
end $$;

-- 3) financas_estrutura — trocar a política aberta pela filtrada por empresa
--    (só se a tabela existir neste banco; senão pula sem erro)
do $$
begin
  if to_regclass('public.financas_estrutura') is not null then
    execute 'alter table public.financas_estrutura enable row level security';
    execute 'drop policy if exists "fin_estrutura_auth_all" on public.financas_estrutura';
    execute 'drop policy if exists "fin_estrutura_rls" on public.financas_estrutura';
    execute 'create policy "fin_estrutura_rls" on public.financas_estrutura for all to authenticated using (empresa_id = public.meu_empresa_id()) with check (empresa_id = public.meu_empresa_id())';
  end if;
end $$;

-- ============================================================================
-- ROLLBACK (só se algo travar): volta as duas tabelas ao estado aberto anterior
--   drop policy if exists "painel_estado_rls" on public.painel_estado;
--   create policy "painel_estado_all" on public.painel_estado
--     for all to authenticated using (true) with check (true);
--   drop policy if exists "fin_estrutura_rls" on public.financas_estrutura;
--   create policy "fin_estrutura_auth_all" on public.financas_estrutura
--     for all to authenticated using (true) with check (true);
-- ============================================================================
