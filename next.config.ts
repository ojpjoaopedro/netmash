import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // esconde o balãozinho de desenvolvimento do Next (Route/Bundler/Preferences)
  devIndicators: false,
  // Serve a proposta (HTML estático em /public) numa URL limpa: /gerarproposta
  async rewrites() {
    return [
      { source: "/gerarproposta", destination: "/gerarproposta.html" },
    ];
  },
  // Endereço fixo do painel: todos usam /dashboard/home (o /minhasmetricas antigo
  // continua funcionando, mas encaminha para o endereço novo).
  async redirects() {
    return [
      { source: "/minhasmetricas", destination: "/dashboard/home", permanent: false },
    ];
  },
  // Cabeçalhos de segurança aplicados a todas as rotas (reforço junto do Cloudflare).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // força HTTPS por 2 anos (o navegador nunca mais tenta http)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // impede que o site seja embutido em iframe de outro domínio (anti-clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // impede o navegador de "adivinhar" o tipo do arquivo (anti-MIME sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // não vaza a URL completa ao sair para outro site
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // libera só o que o app usa (microfone do Assistente); bloqueia o resto
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
