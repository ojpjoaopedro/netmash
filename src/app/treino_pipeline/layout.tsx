import type { Metadata } from "next";

/**
 * Simulador de CRM da aula. Tema claro, como os outros exercícios do MBA —
 * a classe `mba-scope` desliga o design system escuro do app aqui dentro
 * (ver a regra dos inputs em globals.css).
 */
export const metadata: Metadata = {
  title: "Simulador de Pipeline & Forecast",
};

export default function TreinoPipelineLayout({ children }: { children: React.ReactNode }) {
  return <div className="mba-scope">{children}</div>;
}
