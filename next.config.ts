import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve a proposta (HTML estático em /public) numa URL limpa: /gerarproposta
  async rewrites() {
    return [
      { source: "/gerarproposta", destination: "/gerarproposta.html" },
      { source: "/proposta", destination: "/proposta.html" },
    ];
  },
};

export default nextConfig;
