"use client";
// Endereço fixo e neutro do painel para TODAS as empresas (como o asaas.com/...).
// A URL muda por seção (/dashboard/home, /dashboard/financas, ...), mas o nome da
// empresa NUNCA aparece: cada empresa entra com o próprio login e vê só os
// próprios dados (resolvido por @/lib/empresa-atual).
import { useEffect } from "react";
import { useParams } from "next/navigation";
import Painel from "@/app/minhasmetricas/page";

export default function DashboardSecao() {
  const params = useParams();
  const secaoArr = params?.secao as string[] | undefined;
  const secao = secaoArr?.[0] || "home";

  // No PWA instalado (standalone), trava zoom/pan pra a tela não "balançar" como
  // um app nativo. Não mexe nas páginas abertas no navegador (venda etc.).
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const meta = document.querySelector('meta[name="viewport"]');
    const anterior = meta?.getAttribute("content") || "";
    meta?.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    return () => { if (meta && anterior) meta.setAttribute("content", anterior); };
  }, []);

  return <Painel secao={secao} />;
}
