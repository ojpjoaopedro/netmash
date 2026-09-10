import type { Metadata } from "next";
import VendaClient from "./VendaClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Minhas Métricas — O painel que mostra o lucro real da sua empresa",
  description:
    "Faturamento, custos, lucro e projeção num painel que se monta sozinho. Pare de decidir no achismo e veja o número real do seu negócio. R$ 49,90/mês, cancele quando quiser.",
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function AppPage() {
  const pixelId = await getPixelId();
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <VendaClient />
    </>
  );
}
