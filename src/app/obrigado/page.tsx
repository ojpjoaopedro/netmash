import type { Metadata } from "next";
import ObrigadoClient from "./ObrigadoClient";

export const metadata: Metadata = {
  title: "Compra recebida — Minhas Métricas",
  description: "Estamos confirmando o seu pagamento.",
  robots: { index: false },
};

export default function ObrigadoPage() {
  return <ObrigadoClient />;
}
