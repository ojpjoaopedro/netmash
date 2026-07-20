-- Tabela de consentimentos LGPD (rode uma vez no SQL Editor do Supabase)
create table if not exists public.lgpd_consentimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  nome text,
  empresa_id uuid,
  versao text default '1.0',
  user_agent text,
  aceito_em timestamptz not null default now()
);

alter table public.lgpd_consentimentos enable row level security;

-- Cada usuário pode inserir o próprio aceite
create policy "lgpd_insert_own" on public.lgpd_consentimentos
  for insert to authenticated
  with check (auth.uid() = user_id);

-- (A área de Admin lê os registros pelo backend com a service key, que ignora o RLS.)

create index if not exists lgpd_consentimentos_aceito_em_idx on public.lgpd_consentimentos (aceito_em desc);
