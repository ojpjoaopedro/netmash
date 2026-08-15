# Métricas

_Última atualização: 14/08/2026_

Plataforma de **gestão financeira para empresários**: visão completa da empresa num app só
(fluxo de caixa, DRE/lucro, contas a pagar e receber, indicadores, calendário financeiro,
equipe/folha, relatórios e apresentações). É **white-label** e **multiempresa**: cada cliente
tem sua marca, e os dados ficam isolados por empresa.

**Stack:** Next.js 16 (Turbopack) + React + TypeScript + Tailwind + Supabase. Roda como **PWA**
(instala no celular) com **Web Push** (notificações).

---

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000 (usa outra porta se a 3000 estiver ocupada)
```

> **Modo demonstração:** sem as chaves do Supabase, o app roda com dados de exemplo salvos no
> navegador (localStorage). Dá pra explorar tudo sem banco. A tela do cliente fica em
> **`/dashboard`** (ou `/dashboard/home`).

Build de produção: `npm run build`.

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. As essenciais para conectar ao Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=chave-publica
SUPABASE_SERVICE_KEY=chave-de-servico   # usada só nas rotas de API (servidor)
```

As demais (Web Push/VAPID, superadmins) estão comentadas no
`.env.example`. Detalhe: em produção as **chaves VAPID do push** ficam na tabela `app_kv`
do banco (não no ambiente), porque o time não tem acesso ao painel de deploy.

---

## Banco de dados

Os scripts SQL ficam em **`migrations/`** (rodados manualmente no SQL Editor do Supabase).
Comece por `migrations/supabase-schema.sql` para montar do zero. O `migrations/README.md`
explica o que cada arquivo faz.

Projeto de produção no Supabase: `gaormginkujgisardsjk`.

---

## Deploy

Deploy automático via **Dokploy**: todo `push` na branch `main` publica em produção em poucos
minutos. Não há passo manual.

---

## Estrutura de pastas

```
src/
  app/                 # rotas (Next.js App Router)
    dashboard/         # rota do painel do cliente  -> renderiza minhasmetricas/page.tsx
    minhasmetricas/    # o painel do cliente (tela principal)
    admin/             # painel interno (superadmin)
    api/               # endpoints de servidor (cadastro, admin, push, upload de logo, etc.)
    login/ senha/      # acesso
    site/ vendas/ app/ # páginas de marketing
  components/          # componentes de tela
    dash/              # blocos do dashboard, assistente e apresentação
  lib/                 # regras de negócio, dados e utilitários (sem UI)
migrations/            # scripts SQL do Supabase
public/                # PWA: sw.js (service worker), manifest, ícones
```

### Arquivos-chave em `src/lib/`
- `db.ts` — camada de dados (Supabase **ou** modo demo via localStorage).
- `calc.ts` — cálculos: KPIs, fluxo de caixa, DRE, folha.
- `indicadores.ts` — indicadores/metas.
- `format.ts` — formatação de moeda (BRL) e datas.
- `brand.ts` — marca white-label (logo/cor) + tema claro/escuro.
- `empresa-atual.ts` — resolve qual empresa é a do usuário logado.
- `estado-remoto.ts` — espelha o que está no navegador (localStorage) para a tabela
  `painel_estado` no banco, para persistir entre dispositivos.
- `supabase.ts` — cliente do Supabase. `superadmin.ts` — lista de superadmins.
- `nav.ts` — navegação entre as telas. `apresentacao.ts` — gera o HTML do relatório/slides.
- `push-server.ts` / `notificacoes.ts` — Web Push. `precos.ts` — preços dos planos.

---

## Mapa de telas → arquivos

O sistema tem **duas áreas bem separadas**, cada uma com seu login e sua URL:

- **Painel do cliente** (a empresa que usa o Métricas): rota **`/dashboard`**.
- **Área interna** (equipe Minhas Métricas / superadmin, para gerir os clientes): rota **`/admin`**.

### A) Telas do cliente (empresa) — `/dashboard`

É o que a empresa contratante vê. Tudo parte de **um componente** (`Home`) em
`src/app/minhasmetricas/page.tsx`, que troca de "view" conforme a navegação. Cada área é montada por:

| Tela | Arquivo principal |
|---|---|
| Casca do painel (Home, menu, topo, PWA) | `src/app/minhasmetricas/page.tsx` |
| Painel financeiro (Dashboard) | `components/FinancasDashboard.tsx` |
| Estrutura de Receitas e Custos | `src/app/minhasmetricas/financas-estrutura.tsx` |
| Calendário financeiro | `components/CalendarioPagamentos.tsx` (+ `BarraMeses`, `CalendarioRecebimento`) |
| Análises financeiras | `components/RelatoriosFinancas.tsx` (+ `AnaliseResultados`, `GraficosFinancas`, `GerarDRE`) |
| Contas a pagar / receber | `components/PainelCobrancas.tsx` |
| Folha de pagamento / Equipe | `components/FolhaPagamento.tsx` + `components/Funcionarios.tsx` (+ `RelatorioEquipe`) |
| Assistente | `components/dash/Assistente.tsx` |
| Relatório / Apresentação | `components/dash/GerarApresentacao.tsx` (+ `lib/apresentacao.ts`, `dash/Kit.tsx`) |
| Configurações (Dados / Logomarca) | `components/Config.tsx` |
| Plano / Benefícios / Guia | `components/MeuPlano.tsx`, `components/MeusBeneficios.tsx`, `components/GuiaConfiguracao.tsx` |
| Importar planilha (Excel/CSV) | `components/Importar.tsx` (+ `lib/lancParser.ts`) |

### B) Área interna (admin) — `/admin`

Usada **só pela equipe Minhas Métricas** (superadmin) para cadastrar e gerir as empresas clientes,
usuários e planos. **O cliente não acessa isso.**

| Tela | Arquivo principal |
|---|---|
| Painel de administração (empresas, clientes, usuários, planos) | `src/app/admin/page.tsx` |
| Endpoints de servidor (cadastro, admin, push, upload de logo, etc.) | `src/app/api/` |

---

## Conceitos importantes

- **Multiempresa (multi-tenant):** todos os dados são isolados por `empresa_id`, com RLS no
  Supabase (função `meu_empresa_id()`). Ver os scripts `migrations/supabase-rls*.sql`.
- **White-label:** cada empresa tem logo, cor e tema próprios (`lib/brand.ts`).
- **Persistência híbrida:** o projeto nasceu como MVP em localStorage; hoje muita coisa é
  espelhada para o banco pela tabela `painel_estado` via `lib/estado-remoto.ts`.
- **PWA + Web Push:** `public/sw.js`, `public/manifest.webmanifest` e as rotas `src/app/api/push/`.
