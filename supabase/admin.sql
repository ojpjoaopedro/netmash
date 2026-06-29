-- ============================================================
-- PAINEL SUPER ADMIN — colunas extras na empresa (B2B / white-label)
-- Rodar no SQL Editor do Supabase.
-- ============================================================
alter table empresas add column if not exists plano text;
alter table empresas add column if not exists valor numeric(14,2) not null default 0;
alter table empresas add column if not exists slug text;
alter table empresas add column if not exists responsavel text;

-- endereço público único por empresa (minhasmetricas.com/<slug>)
create unique index if not exists idx_empresas_slug on empresas(slug) where slug is not null;

notify pgrst, 'reload schema';
