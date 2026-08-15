-- ============================================================================
-- Catálogo de produtos (planos) do Minhas Métricas
-- ----------------------------------------------------------------------------
-- Lista dos planos que vendemos. Cadastrar um produto aqui faz ele aparecer
-- automaticamente como coluna (desativada) na tela de Empresas do Admin, e
-- os toggles por empresa ficam em empresas.planos (jsonb, pela chave).
-- O "Super Admin" é o plano base (fixo no código, sempre ativo, não entra aqui).
--
-- Rode UMA vez no SQL Editor do Supabase (projeto "minha metricas app").
-- ============================================================================

create table if not exists public.planos_catalogo (
  chave      text primary key,
  nome       text not null,
  descricao  text,
  preco      numeric not null default 0,
  ordem      int not null default 0,
  criado_em  timestamptz not null default now()
);

-- planos que já existiam (não sobrescreve se já houver)
insert into public.planos_catalogo (chave, nome, descricao, preco, ordem) values
  ('folha',        'Folha de pagamento',      'Salários, benefícios e encargos da equipe', 39.90, 1),
  ('acesso2',      '2º acesso',               'Login adicional de administrador',          9.90,  2),
  ('planejamento', 'Planejamento estratégico','Metas e pilares da empresa',                29.90, 3)
on conflict (chave) do nothing;
