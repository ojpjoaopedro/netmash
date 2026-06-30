-- ============================================================
-- CUPONS de desconto (checkout)
-- Rodar no SQL Editor do Supabase.
-- ============================================================
create table if not exists cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,              -- sempre em MAIÚSCULAS (ex.: BEMVINDO10)
  descricao text,
  percentual numeric(5,2) not null default 0, -- % de desconto (0 a 100)
  ativo boolean default true,
  criado_em timestamptz default now()
);

alter table cupons enable row level security; -- só o servidor (service role) mexe

notify pgrst, 'reload schema';
