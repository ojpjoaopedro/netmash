-- ============================================================================
-- Vendas / checkout (Wiven)
-- ----------------------------------------------------------------------------
-- Guarda as compras feitas na landing de assinatura (/assinar). O fluxo é:
--   1. o visitante preenche os dados e a senha  -> nasce uma venda "pendente"
--   2. ele paga no checkout da Wiven
--   3. a Wiven chama /api/webhooks/wiven        -> a venda vira "pago", e o app
--      cria a empresa + o acesso no Supabase (ou liga o módulo, se já é cliente)
--
-- A senha fica CIFRADA (AES-256-GCM, chave em CHECKOUT_SECRET) e é apagada
-- assim que a conta é criada. Nenhuma senha em texto puro no banco.
--
-- Sem policy de RLS: só o servidor (SUPABASE_SERVICE_KEY) enxerga estas tabelas.
-- Rode UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- Pode rodar de novo sem problema.
-- ============================================================================

create table if not exists public.vendas (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,                       -- nosso id da venda (vai para a Wiven)
  email       text not null,
  criado_em   timestamptz not null default now()
);

-- Colunas (com "if not exists" porque a tabela pode já existir de antes)
alter table public.vendas add column if not exists identifier            text;
alter table public.vendas add column if not exists plano_chave           text not null default 'superadmin';
alter table public.vendas add column if not exists plano_nome            text;
alter table public.vendas add column if not exists nome                  text;   -- responsável
alter table public.vendas add column if not exists empresa               text;   -- nome da empresa
alter table public.vendas add column if not exists telefone              text;
alter table public.vendas add column if not exists documento             text;   -- CPF ou CNPJ
alter table public.vendas add column if not exists valor                 numeric not null default 0;
alter table public.vendas add column if not exists modo                  text not null default 'assinatura';  -- 'assinatura' | 'pagamento'
alter table public.vendas add column if not exists status                text not null default 'pendente';
alter table public.vendas add column if not exists senha_cifrada         text;
alter table public.vendas add column if not exists checkout_url          text;
alter table public.vendas add column if not exists origem                text;   -- 'api' | 'link' | 'simulado'
alter table public.vendas add column if not exists wiven_transaction_id  text;
alter table public.vendas add column if not exists wiven_subscription_id text;
alter table public.vendas add column if not exists empresa_id            uuid references public.empresas(id) on delete set null;
alter table public.vendas add column if not exists user_id               uuid;
alter table public.vendas add column if not exists alerta                boolean not null default false;  -- precisa de atenção (reembolso, chargeback, erro)
alter table public.vendas add column if not exists erro                  text;
alter table public.vendas add column if not exists pago_em               timestamptz;
alter table public.vendas add column if not exists atualizado_em         timestamptz not null default now();

-- A tabela pode existir de uma versão anterior (esqueleto de loja própria), com
-- colunas obrigatórias que o checkout novo não preenche. Solta a obrigatoriedade
-- delas, sem apagar nada.
do $$
declare c text;
begin
  foreach c in array array['produto_id', 'modo']
  loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'vendas'
                 and column_name = c and is_nullable = 'NO') then
      execute format('alter table public.vendas alter column %I drop not null;', c);
    end if;
  end loop;
end $$;

-- status possíveis: pendente | pago | reembolsado | chargeback | cancelado | falhou
create unique index if not exists vendas_identifier_uidx on public.vendas (identifier);
create index if not exists vendas_email_idx  on public.vendas (lower(email));
create index if not exists vendas_status_idx on public.vendas (status, criado_em desc);
create index if not exists vendas_tx_idx     on public.vendas (wiven_transaction_id);

-- Histórico bruto do que a Wiven mandou (auditoria e reprocessamento)
create table if not exists public.vendas_eventos (
  id         uuid primary key default gen_random_uuid(),
  venda_id   uuid references public.vendas(id) on delete cascade,
  evento     text not null,                 -- TRANSACTION_PAID, TRANSACTION_REFUNDED, ...
  transacao  text,                          -- id da transação na Wiven
  payload    jsonb,
  criado_em  timestamptz not null default now()
);
create index if not exists vendas_eventos_venda_idx on public.vendas_eventos (venda_id, criado_em desc);
-- evita processar o mesmo evento duas vezes (a Wiven repete o disparo se não receber 2xx)
create unique index if not exists vendas_eventos_uidx on public.vendas_eventos (transacao, evento) where transacao is not null;

alter table public.vendas          enable row level security;
alter table public.vendas_eventos  enable row level security;
-- sem policies de propósito: nenhum usuário logado lê isso, só o servidor.

-- ============================================================================
-- Credenciais da Wiven (alternativa ao .env, igual às chaves VAPID do push).
-- Preencha pelo SQL Editor quando tiver as chaves em mãos:
--
--   insert into public.app_kv (chave, valor) values
--     ('wiven_public_key',    'SUA_CHAVE_PUBLICA'),
--     ('wiven_secret_key',    'SUA_CHAVE_PRIVADA'),
--     ('wiven_webhook_token', 'UM_TOKEN_QUE_VOCE_INVENTA'),
--     ('checkout_secret',     'UMA_FRASE_LONGA_E_ALEATORIA')
--   on conflict (chave) do update set valor = excluded.valor;
--
-- O 'wiven_webhook_token' é o mesmo token cadastrado no webhook dentro do painel
-- da Wiven (Configurações > Webhooks). Sem ele o app recusa os avisos recebidos.
-- O 'checkout_secret' é a chave que cifra a senha do cliente até ele pagar:
-- se trocar essa chave, as vendas pendentes não conseguem mais criar a conta.
-- ============================================================================
