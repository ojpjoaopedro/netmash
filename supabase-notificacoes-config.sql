-- ============================================================================
-- Configuração das notificações do cliente (liga/desliga cada tipo no Admin).
-- O painel do cliente LÊ esta tabela para saber o que mostrar no sininho.
-- Leitura pública (só liga/desliga, nada sensível); escrita só pelo Admin.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
create table if not exists public.notificacoes_config (
  chave         text primary key,
  ligado        boolean not null default true,
  atualizado_em timestamptz not null default now()
);

alter table public.notificacoes_config enable row level security;

drop policy if exists "notificacoes_config_leitura_publica" on public.notificacoes_config;
create policy "notificacoes_config_leitura_publica"
  on public.notificacoes_config
  for select
  to anon, authenticated
  using (true);
