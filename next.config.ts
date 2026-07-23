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
};

export default nextConfig;
