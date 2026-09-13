import type { Metadata } from "next";
import DiagnosticoClient from "./DiagnosticoClient";
import MetaPixel from "@/components/MetaPixel";
import { getPixelId } from "@/lib/config-publica";

export const metadata: Metadata = {
  title: "Diagnóstico financeiro da sua empresa — Minhas Métricas",
  description: "Responda 6 perguntas e descubra em 1 minuto quanto sua empresa pode estar deixando na mesa.",
  robots: { index: false },
};

// Revalida a cada 5 min pra o Pixel editado no /admin refletir sem novo deploy.
export const revalidate = 300;

export default async function DiagnosticoPage() {
  const pixelId = await getPixelId();
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <DiagnosticoClient />
    </>
  );
}
