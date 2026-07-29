"use client";
// Endereço fixo e neutro do painel para TODAS as empresas (como o asaas.com/...).
// A URL muda por seção (/dashboard/home, /dashboard/financas, ...), mas o nome da
// empresa NUNCA aparece: cada empresa entra com o próprio login e vê só os
// próprios dados (resolvido por @/lib/empresa-atual).
import { useParams } from "next/navigation";
import Painel from "@/app/minhasmetricas/page";

export default function DashboardSecao() {
  const params = useParams();
  const secaoArr = params?.secao as string[] | undefined;
  const secao = secaoArr?.[0] || "home";
  return <Painel secao={secao} />;
}
