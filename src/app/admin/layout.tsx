import type { Metadata } from "next";

/**
 * A aba do navegador na área /admin é a do dono da plataforma: título "Super
 * Admin" e um favicon próprio (carteira verde = controle financeiro), diferente
 * do ícone azul do painel dos clientes. Vale só nesta rota — o resto do site
 * segue com o título e o ícone Minhas Métricas.
 *
 * O metadata mora aqui, num layout de servidor, porque a page.tsx do admin é
 * "use client" e componente client não exporta metadata.
 */
export const metadata: Metadata = {
  title: "Super Admin",
  icons: { icon: "/icon-admin.svg", apple: "/icon-admin.svg" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
