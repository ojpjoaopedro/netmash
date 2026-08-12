-- ============================================================================
-- Índices de performance. Deixam as buscas mais rápidas, principalmente quando
-- a base de clientes crescer. Seguro rodar: usa "create index if not exists".
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================

-- Dados por empresa (o que mais pesa no dia a dia do painel)
create index if not exists idx_lancamentos_empresa_data
  on public.lancamentos (empresa_id, data_competencia desc);
create index if not exists idx_funcionarios_empresa_nome
  on public.funcionarios (empresa_id, nome);
create index if not exists idx_clientes_empresa_nome
  on public.clientes (empresa_id, nome);
create index if not exists idx_indicadores_empresa
  on public.indicadores (empresa_id);
create index if not exists idx_painel_estado_empresa_chave
  on public.painel_estado (empresa_id, chave);

-- Descoberta de empresa / perfil do usuário logado
create index if not exists idx_perfis_empresa
  on public.perfis (empresa_id);
create index if not exists idx_empresas_dono
  on public.empresas (dono_id);
create index if not exists idx_empresas_criado_em
  on public.empresas (criado_em desc);

-- Endereço público da empresa (/slug) — precisa ser único e rápido
create unique index if not exists uix_empresas_slug
  on public.empresas (slug) where slug is not null;

-- Documentos LGPD (a lista do admin ordena por data de aceite)
create index if not exists idx_lgpd_aceito_em
  on public.lgpd_consentimentos (aceito_em desc);
