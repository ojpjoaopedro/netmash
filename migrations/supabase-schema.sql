-- ============================================================
-- Minhas Métricas — schema principal do Supabase
-- Rode UMA VEZ no SQL Editor do seu projeto Supabase.
-- (As chaves NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
--  devem estar configuradas no Vercel, em Settings > Environment Variables.)
-- ============================================================

-- Empresa (o app usa 1 empresa por projeto)
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Minha Empresa',
  cnpj text,
  segmento text,
  saldo_inicial numeric not null default 0,
  criado_em timestamptz not null default now()
);

-- Perfil do usuário logado (id = id do usuário no Auth)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  nome text,
  email text,
  papel text not null default 'dono',   -- 'dono' | 'colaborador'
  areas text[],
  criado_em timestamptz not null default now()
);

-- Colaboradores (equipe)
create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  cargo text,
  departamento text,
  salario numeric not null default 0,
  beneficios numeric not null default 0,
  admissao date,
  ativo boolean not null default true,
  contato text,
  criado_em timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  obs text,
  criado_em timestamptz not null default now()
);

-- Lançamentos financeiros (entradas e saídas)
create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  tipo text not null,                    -- 'entrada' | 'saida'
  descricao text not null default '',
  categoria text,
  valor numeric not null default 0,
  data_competencia date not null default current_date,
  vencimento date,
  pago boolean not null default false,
  data_pagamento date,
  forma text,
  contato text,
  origem text default 'manual',
  cliente_id uuid references public.clientes(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists lancamentos_empresa_idx on public.lancamentos (empresa_id, data_competencia desc);
create index if not exists funcionarios_empresa_idx on public.funcionarios (empresa_id);
create index if not exists clientes_empresa_idx on public.clientes (empresa_id);

-- ============================================================
-- RLS (segurança por linha). Modelo simples: qualquer usuário
-- LOGADO acessa os dados. Como é 1 empresa por projeto e o login
-- é controlado, isso é suficiente. (Dá pra restringir por empresa depois.)
-- ============================================================
alter table public.empresas      enable row level security;
alter table public.perfis        enable row level security;
alter table public.funcionarios  enable row level security;
alter table public.clientes      enable row level security;
alter table public.lancamentos   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['empresas','funcionarios','clientes','lancamentos']
  loop
    execute format('drop policy if exists "%s_auth_all" on public.%I;', t, t);
    execute format('create policy "%s_auth_all" on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Perfil: cada usuário lê/edita o próprio; pode criar o próprio
drop policy if exists "perfis_self" on public.perfis;
create policy "perfis_self" on public.perfis
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- SEED inicial — rode DEPOIS de criar o seu usuário em Authentication > Users.
-- Troque 'SEU_USER_ID_DO_AUTH' pelo id do usuário (copie em Authentication > Users).
-- ============================================================
-- insert into public.empresas (nome) values ('Hubix') returning id;
-- insert into public.perfis (id, empresa_id, nome, papel)
--   values ('SEU_USER_ID_DO_AUTH', (select id from public.empresas limit 1), 'Diogo', 'dono');
