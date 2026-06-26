# Gestor Financeiro

Plataforma de **gestão financeira para empresários** — visão completa da empresa em um só lugar:
fluxo de caixa, DRE/lucro, contas a pagar e receber, indicadores (KPIs), controle de equipe/folha
e importação de planilhas.

Construído reaproveitando a estrutura do Hub da Dynamis: **Next.js 16 + React 19 + Tailwind v4 + Supabase**.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000 (ou 3001 se 3000 ocupada)
```

> **Modo demonstração:** sem as chaves do Supabase no `.env.local`, o app roda com dados de
> exemplo salvos no navegador (localStorage) — dá pra explorar tudo sem banco.

## Conectar o Supabase (produção)

1. Crie um projeto no Supabase.
2. Rode `supabase/schema.sql` no SQL Editor (cria tabelas, RLS e o gatilho que cria a
   empresa no 1º cadastro).
3. Crie `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publishable
```

## Arquitetura

- **Modelo:** 1 empresário = 1 empresa. Todos os dados isolados por `empresa_id` via RLS.
- `src/lib/db.ts` — camada de dados (Supabase **ou** modo demo via localStorage).
- `src/lib/calc.ts` — KPIs, fluxo de caixa, DRE, folha.
- `src/lib/format.ts` — formatação BRL/datas.
- `src/components/Charts.tsx` — gráficos SVG próprios (sem dependências).
- `src/components/*` — Dashboard, Lançamentos, Contas, Funcionários, Importar, Config.
- `supabase/schema.sql` — schema + RLS + trigger de cadastro.

## Funcionalidades (MVP)

- 📊 **Painel:** saldo, faturamento, despesas, lucro/margem, a pagar/receber, custo de folha,
  gráfico entradas×saídas, evolução do saldo, donut de despesas, DRE e próximos vencimentos.
- 💸 **Lançamentos:** receitas e despesas (CRUD), busca e filtros, marcar pago/recebido.
- 📅 **Contas:** a pagar e a receber com vencimentos e alerta de vencidas.
- 👥 **Equipe:** colaboradores, salários, benefícios e custo total da folha.
- 📤 **Importar:** Excel/CSV com reconhecimento automático de colunas + prévia.
- ⚙️ **Empresa:** dados e saldo inicial.
