-- ============================================================
-- Migração 1: Estrutura de Receitas e Custos no banco
-- Rode UMA VEZ no SQL Editor do Supabase.
-- Guarda a estrutura inteira (JSON) por empresa e por ano.
-- ============================================================
create table if not exists public.financas_estrutura (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ano int not null,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (empresa_id, ano)
);

-- Já nasce com a trava por empresa (depende de public.meu_empresa_id(),
-- criada em supabase-rls-fix-p0.sql / supabase-rls.sql).
alter table public.financas_estrutura enable row level security;

drop policy if exists "fin_estrutura_auth_all" on public.financas_estrutura;
drop policy if exists "fin_estrutura_rls" on public.financas_estrutura;
create policy "fin_estrutura_rls" on public.financas_estrutura
  for all to authenticated
  using (empresa_id = public.meu_empresa_id())
  with check (empresa_id = public.meu_empresa_id());
