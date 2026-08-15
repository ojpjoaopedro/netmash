# Como o app foi feito

_Última atualização: 14/08/2026_

Resumo técnico do **Minhas Métricas**: linguagens, ferramentas e o porquê de cada escolha.
Escrito para ser entendido também por quem não é da área.

## Linguagens

- **TypeScript** — a linguagem principal (um JavaScript com "tipos" que ajudam a evitar erros). _Por quê:_ mais segurança e menos bugs.
- **JSX / React** — como as telas são escritas, em blocos reutilizáveis (componentes).
- **CSS** — o visual (cores, espaçamento, responsivo no celular).
- **SQL** — as instruções do banco de dados (tabelas e permissões).

## Base do app

- **Next.js 16** (com Turbopack) — o "esqueleto" que junta num projeto só as telas do cliente, o painel admin e as APIs de servidor. _Por quê:_ moderno, rápido e roda tela + servidor juntos.
- **React 19** — a biblioteca que desenha as telas.

## Banco de dados e publicação

- **Supabase** — banco de dados (PostgreSQL), login dos usuários (Auth) e armazenamento de imagens (Storage). _Por quê:_ pronto, seguro e com isolamento de dados por empresa (RLS).
- **Dokploy** — publica o app automaticamente quando o código sobe. _Por quê:_ simples, sem passo manual.

## Bibliotecas (ferramentas de código)

- **Tailwind CSS** — atalhos para estilizar as telas.
- **lucide-react** — os ícones do app.
- **framer-motion** — animações suaves.
- **xlsx / xlsx-js-style** — ler e gerar planilhas Excel (importação e exportação).
- **jspdf + html2canvas** — gerar PDF (relatórios e apresentações).
- **tesseract.js** — ler texto de imagens (OCR, usado na importação).
- **web-push** — notificações no celular (o app é instalável como PWA).

## Formatos usados

- **JSON** — como os dados trafegam entre tela e servidor.
- **Excel / CSV** — importação e exportação de lançamentos.
- **PDF** — relatórios e apresentações.
- **Markdown** — a documentação (como este arquivo).

## Como está organizado

- **Multiempresa (white-label):** um único sistema atende várias empresas, com os dados isolados por empresa e cada uma com a sua marca.
- **PWA:** dá para instalar no celular como um aplicativo.
- **Duas áreas separadas:** painel do cliente (`/dashboard`) e área interna da equipe (`/admin`).

Para o mapa completo de telas → arquivos e a estrutura de pastas, veja o **README**.
