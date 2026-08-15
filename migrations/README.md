# migrations/

_Última atualização: 14/08/2026_

Scripts SQL do Supabase deste projeto, reunidos num lugar só (antes ficavam soltos na raiz).

São rodados **manualmente** no SQL Editor do Supabase (o app não os importa em tempo de execução). Estão aqui como histórico e para montar um banco novo do zero.

## Estrutura base (criam tabelas)
- `supabase-schema.sql` — schema base: empresas, perfis, funcionarios, clientes, lancamentos + índices.
- `supabase-app-kv.sql` — tabela `app_kv` (chave-valor) + RLS.
- `supabase-financas-estrutura.sql` — tabela `financas_estrutura` + RLS.
- `supabase-lgpd.sql` — tabela `lgpd_consentimentos` + RLS.
- `supabase-notificacoes-config.sql` — tabela `notificacoes_config` + RLS.
- `supabase-painel-estado.sql` — tabela `painel_estado` + RLS.
- `supabase-planos-catalogo.sql` — tabela `planos_catalogo` + seed inicial.
- `supabase-push-subscriptions.sql` — tabela `push_subscriptions` + RLS.

## Ajustes aplicados depois (ALTER / policies / índices / seeds)
- `supabase-empresas-planos.sql` — coluna `planos` (jsonb) em empresas.
- `supabase-empresas-responsavel-cpf.sql` — coluna `responsavel_cpf` em empresas.
- `supabase-lgpd-localizacao.sql` — coluna `localizacao` em lgpd_consentimentos.
- `supabase-planejamento-link-selo.sql` — coluna `selo` em planos_catalogo.
- `supabase-planos-catalogo-imagem.sql` — coluna `imagem` em planos_catalogo.
- `supabase-planos-link-pagamento.sql` — coluna `link_pagamento` em planos_catalogo.
- `supabase-planos-catalogo-leitura-publica.sql` — policy de leitura pública em planos_catalogo.
- `supabase-indices-performance.sql` — índices de performance.
- `supabase-rls.sql` — RLS + função `meu_empresa_id()` + policies principais.
- `supabase-rls-parte2.sql` — RLS em vendas/produtos/cupons/config_app.
- `supabase-rls-fix-p0.sql` — hotfix: recria `meu_empresa_id()` e reajusta policies.
