import type { Metadata } from "next";
import ComecarClient from "./ComecarClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Comece agora — Minhas Métricas",
  description: "Preencha seus dados e vá para o pagamento. Seu painel financeiro em minutos.",
  robots: { index: false },
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function ComecarPage() {
  const pixelId = await getPixelId();
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <ComecarClient />
    </>
  );
}
