import type { Metadata } from "next";
import SiteClient from "./SiteClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Minhas Métricas — Tire sua empresa do escuro",
  description:
    "O painel que reúne faturamento, custos, lucro e indicadores da sua empresa num só lugar. Pare de decidir no achismo e veja o número real do seu negócio.",
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function SitePage() {
  const pixelId = await getPixelId();
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <SiteClient />
    </>
  );
}
