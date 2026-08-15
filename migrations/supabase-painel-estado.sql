-- ============================================================================
-- Painel /minhasmetricas — persistência COMPLETA no banco
-- ----------------------------------------------------------------------------
-- Tabela genérica "chave -> dados" por empresa. Guarda tudo o que o painel
-- salvava só no navegador: calendário (despesas/faturamento), equipe, dados
-- extras da empresa, marca/tema, foto de perfil, aceites de termos e as
-- preferências (guia concluído, tour, som, ocultar valores etc.).
--
-- O valor de "dados" é o mesmo texto que ficava no localStorage (uma string),
-- então serve para qualquer tipo de informação sem precisar de uma coluna nova
-- a cada campo. É o mesmo padrão já usado na tabela financas_estrutura.
--
-- Rode este arquivo UMA vez no SQL Editor do Supabase.
-- ============================================================================

create table if not exists public.painel_estado (
  empresa_id uuid  not null references public.empresas(id) on delete cascade,
  chave      text  not null,
  dados      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (empresa_id, chave)
);

alter table public.painel_estado enable row level security;

drop policy if exists "painel_estado_all" on public.painel_estado;
create policy "painel_estado_all"
  on public.painel_estado
  for all
  to authenticated
  using (true)
  with check (true);
