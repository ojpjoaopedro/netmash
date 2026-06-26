-- ============================================================
-- GESTOR FINANCEIRO — Schema base
-- Modelo: 1 empresário = 1 empresa. Dados isolados por RLS.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- ---------- EMPRESAS ----------
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  segmento text,
  dono_id uuid references auth.users(id),
  saldo_inicial numeric(14,2) not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- PERFIS (usuário) ----------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nome text,
  email text,
  papel text not null default 'dono', -- 'dono' | 'colaborador'
  criado_em timestamptz not null default now()
);

-- ---------- LANÇAMENTOS (caixa + contas a pagar/receber) ----------
create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo text not null,                    -- 'receita' | 'despesa'
  descricao text not null,
  categoria text,
  valor numeric(14,2) not null,
  data_competencia date not null default current_date, -- conta na DRE
  vencimento date,                       -- contas a pagar/receber
  pago boolean not null default true,
  data_pagamento date,                   -- quando entrou/saiu do caixa
  forma text,                            -- pix/dinheiro/cartao/boleto/transferencia
  contato text,                          -- cliente ou fornecedor
  origem text not null default 'manual', -- 'manual' | 'planilha'
  criado_em timestamptz not null default now()
);
create index if not exists idx_lanc_empresa on lancamentos(empresa_id);
create index if not exists idx_lanc_data on lancamentos(empresa_id, data_competencia);

-- ---------- FUNCIONÁRIOS ----------
create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  cargo text,
  departamento text,
  salario numeric(14,2) not null default 0,
  beneficios numeric(14,2) not null default 0,
  admissao date,
  ativo boolean not null default true,
  contato text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_func_empresa on funcionarios(empresa_id);

-- ============================================================
-- HELPER: empresa do usuário logado (SECURITY DEFINER evita recursão de RLS)
-- ============================================================
create or replace function minha_empresa()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from perfis where id = auth.uid()
$$;

-- ============================================================
-- TRIGGER: novo usuário -> cria empresa + perfil (1º acesso)
-- Lê nome/empresa de raw_user_meta_data (vindo do signUp).
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare nova_empresa uuid;
begin
  insert into empresas (nome, dono_id)
  values (coalesce(nullif(new.raw_user_meta_data->>'empresa',''), 'Minha Empresa'), new.id)
  returning id into nova_empresa;

  insert into perfis (id, empresa_id, nome, email, papel)
  values (
    new.id,
    nova_empresa,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    'dono'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table empresas enable row level security;
alter table perfis enable row level security;
alter table lancamentos enable row level security;
alter table funcionarios enable row level security;

-- empresas: dono lê/edita a própria
drop policy if exists emp_sel on empresas;
create policy emp_sel on empresas for select using (id = minha_empresa());
drop policy if exists emp_upd on empresas;
create policy emp_upd on empresas for update using (id = minha_empresa());

-- perfis: cada um lê/edita o próprio
drop policy if exists perf_sel on perfis;
create policy perf_sel on perfis for select using (id = auth.uid() or empresa_id = minha_empresa());
drop policy if exists perf_upd on perfis;
create policy perf_upd on perfis for update using (id = auth.uid());

-- lancamentos: tudo escopado pela empresa
drop policy if exists lanc_all on lancamentos;
create policy lanc_all on lancamentos for all
  using (empresa_id = minha_empresa())
  with check (empresa_id = minha_empresa());

-- funcionarios: idem
drop policy if exists func_all on funcionarios;
create policy func_all on funcionarios for all
  using (empresa_id = minha_empresa())
  with check (empresa_id = minha_empresa());

notify pgrst, 'reload schema';

-- ============================================================
-- INDICADORES (métricas estratégicas por empresa)
-- ============================================================
create table if not exists indicadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  key text not null,
  period text not null,            -- "YYYY-MM"
  value numeric(16,2) not null default 0,
  target numeric(16,2) not null default 0,
  unidade text not null,           -- BRL | % | count | score
  categoria text not null,         -- financeiro | cliente | comercial | marketing
  criado_em timestamptz not null default now(),
  unique (empresa_id, key, period)
);
create index if not exists idx_ind_empresa on indicadores(empresa_id);

-- ============================================================
-- DESPESAS FIXAS (recorrentes por empresa)
-- ============================================================
create table if not exists despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  categoria text,
  valor numeric(14,2) not null default 0,
  dia_venc int not null default 5,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists idx_df_empresa on despesas_fixas(empresa_id);

-- Marca/white-label na própria empresa
alter table empresas add column if not exists cor text;
alter table empresas add column if not exists logo_url text;

-- RLS
alter table indicadores enable row level security;
alter table despesas_fixas enable row level security;

drop policy if exists ind_all on indicadores;
create policy ind_all on indicadores for all
  using (empresa_id = minha_empresa()) with check (empresa_id = minha_empresa());

drop policy if exists df_all on despesas_fixas;
create policy df_all on despesas_fixas for all
  using (empresa_id = minha_empresa()) with check (empresa_id = minha_empresa());

notify pgrst, 'reload schema';
