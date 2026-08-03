-- =====================================================================
-- ISOLAMENTO POR EMPRESA (RLS) — Minhas Métricas
-- Rode UMA vez no Supabase → SQL Editor → Run.
-- Depois disso, o BANCO garante que cada usuário só enxerga/edita os
-- dados da própria empresa (mesmo que o código falhe ou alguém tente burlar).
-- A área de Admin continua vendo tudo (usa a service key, que ignora o RLS).
--
-- IMPORTANTE: o modelo tem DONO (empresas.dono_id) e COLABORADOR
-- (perfis.empresa_id). A função abaixo cobre os DOIS para não trancar
-- ninguém para fora.
-- =====================================================================

-- 1) Empresa do usuário logado (dono OU colaborador).
--    SECURITY DEFINER lê perfis/empresas sem passar pelo RLS (evita recursão).
create or replace function public.meu_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select empresa_id from public.perfis   where id = auth.uid()),
    (select id         from public.empresas where dono_id = auth.uid()
       order by criado_em asc limit 1)
  )
$$;

revoke all on function public.meu_empresa_id() from public;
grant execute on function public.meu_empresa_id() to authenticated;

-- 2) Liga o RLS nas tabelas com dados de empresa
alter table public.empresas       enable row level security;
alter table public.perfis         enable row level security;
alter table public.lancamentos    enable row level security;
alter table public.funcionarios   enable row level security;
alter table public.clientes       enable row level security;
alter table public.indicadores    enable row level security;
alter table public.despesas_fixas enable row level security;

-- 3) EMPRESAS — vê/edita a própria (por vínculo OU por ser o dono); pode criar a própria
drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated
  using (id = public.meu_empresa_id() or dono_id = auth.uid());
drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas
  for update to authenticated
  using (id = public.meu_empresa_id() or dono_id = auth.uid())
  with check (id = public.meu_empresa_id() or dono_id = auth.uid());
drop policy if exists empresas_insert on public.empresas;
create policy empresas_insert on public.empresas
  for insert to authenticated
  with check (dono_id = auth.uid());

-- 4) PERFIS — vê a si e aos colegas da mesma empresa; cria/edita só o próprio
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or empresa_id = public.meu_empresa_id());
drop policy if exists perfis_insert_self on public.perfis;
create policy perfis_insert_self on public.perfis
  for insert to authenticated
  with check (id = auth.uid());
drop policy if exists perfis_update_self on public.perfis;
create policy perfis_update_self on public.perfis
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 5) DADOS POR EMPRESA — ler/inserir/editar/apagar só da própria empresa
create or replace function public._rls_tabela_empresa(p_tabela text) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists %I_rls on public.%I', p_tabela, p_tabela);
  execute format(
    'create policy %I_rls on public.%I for all to authenticated using (empresa_id = public.meu_empresa_id()) with check (empresa_id = public.meu_empresa_id())',
    p_tabela, p_tabela);
end $$;

select public._rls_tabela_empresa('lancamentos');
select public._rls_tabela_empresa('funcionarios');
select public._rls_tabela_empresa('clientes');
select public._rls_tabela_empresa('indicadores');
select public._rls_tabela_empresa('despesas_fixas');

drop function public._rls_tabela_empresa(text);

-- =====================================================================
-- TESTE depois de rodar:
--   1) Entre com a empresa A  -> só vê dados de A
--   2) Entre com a empresa B  -> só vê dados de B
--   3) Crie um cadastro novo  -> consegue criar empresa/perfil e ver seus dados
--   4) Admin (/admin)         -> continua vendo tudo
-- ROLLBACK (se algo travar), desligue o RLS de uma tabela:
--   alter table public.<tabela> disable row level security;
-- =====================================================================
