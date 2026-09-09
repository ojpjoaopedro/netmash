-- ============================================================================
-- Troca do gateway: Wiven -> Cakto
-- ----------------------------------------------------------------------------
-- O que este script faz:
--   1. renomeia as colunas de identificação do gateway na tabela `vendas`
--   2. troca os links de pagamento dos produtos pelos links da Cakto
--   3. acerta os preços de reserva com os valores que estão na Cakto
--   4. tira o "2º acesso" do catálogo de venda (não existe produto na Cakto)
--   5. limpa as chaves da Wiven no app_kv
--
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- Pode rodar de novo sem problema.
-- ============================================================================

-- 1. Colunas do gateway em `vendas` ------------------------------------------
-- Na Cakto o que identifica a compra é o PEDIDO (order) e, quando é recorrente,
-- a ASSINATURA (subscription). Renomeia preservando o que já está gravado.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vendas' and column_name = 'wiven_transaction_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vendas' and column_name = 'cakto_order_id') then
    alter table public.vendas rename column wiven_transaction_id to cakto_order_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vendas' and column_name = 'wiven_subscription_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vendas' and column_name = 'cakto_subscription_id') then
    alter table public.vendas rename column wiven_subscription_id to cakto_subscription_id;
  end if;
end $$;

-- Banco novo (sem a migration antiga): garante que as colunas existem.
alter table public.vendas add column if not exists cakto_order_id        text;
alter table public.vendas add column if not exists cakto_subscription_id text;

drop index if exists public.vendas_tx_idx;
create index if not exists vendas_pedido_idx on public.vendas (cakto_order_id);

-- 2 e 3. Links de pagamento e preços da Cakto ---------------------------------
-- Os links são https://pay.cakto.com.br/<id_da_oferta>, tirados do checkout
-- padrão de cada produto na Cakto. Os preços aqui são só reserva: quem manda é
-- a oferta lá (o app lê pela API).

-- Folha de pagamento (produto "Folha de Pagamento", assinatura)
update public.planos_catalogo
  set link_pagamento = 'https://pay.cakto.com.br/378rtwu',
      preco = 39.90
  where chave = 'folha';

-- Planejamento estratégico (produto "Planejamento Estratégico", pagamento único)
update public.planos_catalogo
  set link_pagamento = 'https://pay.cakto.com.br/3g2xais',
      preco = 69.90
  where chave = 'planejamento';

-- Plano base / Super Admin (produto "Indicadores", assinatura)
insert into public.app_kv (chave, valor)
  values ('link_superadmin', 'https://pay.cakto.com.br/jgyw3d8')
  on conflict (chave) do update set valor = excluded.valor;

insert into public.config_app (chave, valor)
  values ('preco_superadmin', 49.90)
  on conflict (chave) do update set valor = excluded.valor;

-- 4. "2º acesso" sai do catálogo de venda ------------------------------------
-- Não há produto correspondente na Cakto. A feature continua existindo no
-- painel (empresas.planos -> "acesso2", ligada à mão na aba Empresas do Admin):
-- o que some é a possibilidade de comprar o módulo pela landing.
delete from public.planos_catalogo where chave = 'acesso2';

-- 5. Credenciais ---------------------------------------------------------------
-- Fora do ambiente, o app aceita as credenciais no app_kv. Preencha pelo SQL
-- Editor quando tiver as chaves em mãos:
--
--   insert into public.app_kv (chave, valor) values
--     ('cakto_client_id',      'SEU_CLIENT_ID'),
--     ('cakto_client_secret',  'SEU_CLIENT_SECRET'),
--     ('cakto_webhook_secret', 'O_SECRET_QUE_A_CAKTO_GEROU_NO_WEBHOOK'),
--     ('checkout_secret',      'UMA_FRASE_LONGA_E_ALEATORIA')
--   on conflict (chave) do update set valor = excluded.valor;
--
-- O 'cakto_webhook_secret' é gerado pela Cakto quando você cria o webhook
-- (Integrações > Webhooks, URL https://SEU-DOMINIO/api/webhooks/cakto). Sem ele
-- o app recusa todos os avisos recebidos.
delete from public.app_kv where chave in ('wiven_public_key', 'wiven_secret_key', 'wiven_webhook_token');
