# CLAUDE.md

_Última atualização: 14/08/2026_

Guia para IAs (e devs) trabalharem neste repositório. Comece pelo `README.md`, que tem a visão
geral, o mapa de telas → arquivos e a estrutura de pastas. Este arquivo cobre as **regras e
convenções** do projeto.

## O que é

**Métricas**: plataforma de gestão financeira white-label e multiempresa (Next.js 16 + React +
TypeScript + Tailwind + Supabase), instalável como PWA com Web Push.

## Comandos

```bash
npm install
npm run dev      # desenvolvimento (localhost)
npm run build    # build de produção (rode antes de publicar para pegar erros)
npm run lint     # ESLint
```

## Deploy

`push` na branch **`main`** publica em produção via **Dokploy** em poucos minutos. Não há passo
manual. Portanto: **rode `npm run build` antes de subir** e evite quebrar a `main`.

## Convenções (importante)

- **Idioma:** todo texto que o usuário vê é em **português (PT-BR)**, claro e simples.
- **Nunca usar travessão (—)** em nada (interface, textos, comentários, commits). Trocar por
  vírgula, dois-pontos ou parênteses. É uma regra de estilo do produto.
- **Multiempresa:** todo dado é isolado por `empresa_id`. Qualquer `select` por empresa deve
  filtrar por `empresa_id`, e o banco tem RLS (função `meu_empresa_id()`). Nunca vazar dado
  entre empresas.
- **Segredos ficam locais:** não comitar `.env.local` nem chaves reais. Em produção as chaves
  VAPID do push ficam na tabela `app_kv` (não no ambiente).
- **Um único Supabase de produção:** projeto `gaormginkujgisardsjk`. Não apontar para outro.

## Arquitetura em 1 minuto

- **Duas áreas bem separadas** (cada uma com seu login e URL):
  - **Painel do cliente** (a empresa que usa o Métricas), rota **`/dashboard`**: é **um componente**
    (`Home` em `src/app/minhasmetricas/page.tsx`) que troca de "view"; cada área é montada por um
    componente em `src/components/` (ver o mapa de telas no README).
  - **Área interna** (equipe Minhas Métricas / superadmin), rota **`/admin`** (`src/app/admin/page.tsx`):
    cadastro e gestão das empresas clientes e planos. O cliente NÃO acessa isso.
  - **Compra (público)**, rotas **`/assinar`** e **`/obrigado`**: a empresa contrata o plano,
    paga no checkout da **Wiven** e a conta nasce sozinha quando o webhook
    (`/api/webhooks/wiven`) confirma o pagamento. As regras ficam em `src/lib/vendas.ts` e
    `src/lib/wiven.ts`; o acompanhamento é a aba **Vendas** do `/admin`.
- `src/lib/` concentra a lógica sem UI: `db.ts` (dados), `calc.ts` (cálculos), `indicadores.ts`,
  `brand.ts` (marca white-label), `estado-remoto.ts`, `apresentacao.ts`, etc.
- **Modo demonstração:** sem as chaves do Supabase, o app roda com dados de exemplo no
  `localStorage` (útil para desenvolver sem banco).
- **Persistência híbrida:** o projeto nasceu como MVP em `localStorage`; hoje muita coisa é
  espelhada para o banco pela tabela `painel_estado` via `lib/estado-remoto.ts`.
- Scripts SQL do banco ficam em **`migrations/`** (rodados manualmente no SQL Editor do Supabase).

## Armadilhas conhecidas

- **`npm run build` apaga o `.next` do servidor de dev**, e o `localhost` passa a dar erro 500.
  Se acontecer, limpe o `.next` e reinicie o `npm run dev`.
- A URL do painel do cliente é **`/dashboard`** (`/dashboard/home`), não `/minhasmetricas`.
- Ao mexer na barra lateral e nas permissões, os dois andam juntos (sidebar em `page.tsx` e o
  modal de permissões em `Funcionarios.tsx`).
