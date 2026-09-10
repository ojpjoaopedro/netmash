import type { Metadata } from "next";
import ObrigadoClient from "./ObrigadoClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Compra recebida — Minhas Métricas",
  description: "Estamos confirmando o seu pagamento.",
  robots: { index: false },
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function ObrigadoPage() {
  const pixelId = await getPixelId();
  return (
    <>
      {/* O Purchase é disparado pelo servidor (Conversions API) quando a Cakto
          confirma o pagamento, em src/lib/meta-capi.ts. Aqui só PageView. */}
      <MetaPixel pixelId={pixelId} />
      <ObrigadoClient />
    </>
  );
}
