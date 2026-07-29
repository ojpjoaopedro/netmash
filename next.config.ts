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
};

export default nextConfig;
