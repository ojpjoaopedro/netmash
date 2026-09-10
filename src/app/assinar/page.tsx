import type { Metadata } from "next";
import AssinarClient from "./AssinarClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Assinar o Minhas Métricas",
  description: "Contrate o painel financeiro da sua empresa: preencha os dados, pague e entre no painel na hora.",
  robots: { index: false },   // página de compra, não precisa aparecer na busca
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function AssinarPage() {
  const pixelId = await getPixelId();
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <AssinarClient />
    </>
  );
}
