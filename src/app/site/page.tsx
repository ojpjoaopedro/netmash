import type { Metadata } from "next";
import SiteClient from "./SiteClient";

export const metadata: Metadata = {
  title: "Minhas Métricas — Tire sua empresa do escuro",
  description:
    "O painel que reúne faturamento, custos, lucro e indicadores da sua empresa num só lugar. Pare de decidir no achismo e veja o número real do seu negócio.",
};

export default function SitePage() {
  return <SiteClient />;
}
