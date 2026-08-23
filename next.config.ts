import type { NextConfig } from "next";

// Content-Security-Policy: libera só o que o app realmente usa e bloqueia o resto.
// (inline liberado porque o app usa muito estilo inline e o Next injeta scripts inline)
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://www.facebook.com https://app.wiven.com.br https://checkout.wiven.com.br",
  "frame-src 'self'",
  "media-src 'self' data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

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
          // restringe de onde o navegador pode carregar scripts/estilos/imagens/conexões
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
