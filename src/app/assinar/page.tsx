import type { Metadata } from "next";
import AssinarClient from "./AssinarClient";

export const metadata: Metadata = {
  title: "Assinar o Minhas Métricas",
  description: "Contrate o painel financeiro da sua empresa: preencha os dados, pague e entre no painel na hora.",
  robots: { index: false },   // página de compra, não precisa aparecer na busca
};

export default function AssinarPage() {
  return <AssinarClient />;
}
