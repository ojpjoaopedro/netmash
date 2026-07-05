-- ============================================================
-- CHECKOUT (Stripe) — catálogo de produtos + registro de vendas
-- Rodar no SQL Editor do Supabase.
-- ============================================================

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  imagem text,                              -- URL ou data-URL da imagem
  slug text unique not null,
  preco numeric(12,2) not null default 0,   -- em reais (ex.: 19.99)
  modo text not null default 'pagamento',   -- 'pagamento' (único) | 'assinatura'
  intervalo text default 'month',           -- p/ assinatura: 'month' | 'year'
  parcelas int default 1,                    -- nº máx. de parcelas no cartão
  libera_acesso boolean default true,        -- comprar libera o acesso ao app?
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete set null,
  email text,
  nome text,
  valor numeric(12,2) default 0,
  modo text,                                 -- 'payment' | 'subscription'
  status text default 'pago',                -- 'pago' | 'reembolsado' | 'cancelado'
  stripe_session_id text,
  stripe_customer_id text,
  criado_em timestamptz default now()
);

create index if not exists vendas_email_idx on vendas (lower(email));

-- Só o super admin (service role) mexe nessas tabelas; o checkout público lê via servidor.
alter table produtos enable row level security;
alter table vendas enable row level security;

-- Produto de exemplo (acesso ao app). Pode editar/excluir depois.
insert into produtos (nome, descricao, slug, preco, modo, libera_acesso, ativo)
values ('Minhas Métricas — Acesso', 'Acesso completo ao painel de métricas e finanças da sua empresa.', 'minhas-metricas', 19.99, 'pagamento', true, true)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
