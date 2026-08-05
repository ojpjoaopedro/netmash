-- =====================================================================
-- RLS — PARTE 2: tabelas acessadas SÓ pelo servidor (/api com service key)
-- Rode no Supabase → SQL Editor → Run.
--
-- Ligar o RLS SEM criar policy para "authenticated" faz o navegador NÃO
-- conseguir ler/escrever essas tabelas. Só a service key (usada no /api e no
-- Admin) ignora o RLS e continua funcionando. Protege dados de vendas,
-- catálogo e configuração de qualquer acesso pelo cliente.
-- =====================================================================

alter table public.vendas     enable row level security;
alter table public.produtos   enable row level security;
alter table public.cupons     enable row level security;
alter table public.config_app enable row level security;

-- (Opcional) recursos de treino/MBA — também só via servidor:
-- alter table public.quiz_mba01   enable row level security;
-- alter table public.treino_mba01 enable row level security;

-- NENHUMA policy é criada de propósito: sem policy, o "authenticated" não
-- acessa direto. O Admin e o checkout usam a service key e seguem normais.

-- ROLLBACK, se algo do checkout/admin parar:
--   alter table public.<tabela> disable row level security;
-- =====================================================================
