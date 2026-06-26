import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetMash — Gestão para empresários",
  description:
    "Plataforma de gestão para empresários: dashboards, finanças, saúde do cliente, comercial, marketing, indicadores e ferramentas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
