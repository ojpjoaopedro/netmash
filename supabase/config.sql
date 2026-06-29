-- ============================================================
-- CONFIG do app (preços do plano editáveis pelo super admin)
-- Rodar no SQL Editor do Supabase.
-- ============================================================
create table if not exists config_app (
  chave text primary key,
  valor numeric(14,2) not null default 0
);
insert into config_app (chave, valor) values ('preco_superadmin', 79.9) on conflict (chave) do nothing;
insert into config_app (chave, valor) values ('preco_acesso', 39.9) on conflict (chave) do nothing;

-- só o super admin (service role) mexe nisso
alter table config_app enable row level security;

notify pgrst, 'reload schema';
