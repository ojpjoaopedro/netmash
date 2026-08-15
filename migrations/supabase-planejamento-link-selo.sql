-- ============================================================================
-- Link de pagamento do Planejamento estratégico + selo "30 dias grátis".
-- Cria a coluna de selo (etiqueta promocional) e preenche o Planejamento.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
alter table public.planos_catalogo
  add column if not exists selo text;

update public.planos_catalogo
  set link_pagamento = 'https://checkout.wiven.com.br/checkout/cmsqe7oiy069h01q4e77oiyj7?offer=PDOQOXV',
      selo = '30 dias grátis'
  where chave = 'planejamento';
