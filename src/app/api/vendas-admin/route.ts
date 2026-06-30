import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const SUPERS_PADRAO = ["minhasmetricas@gmail.com"];
const SUPERS = [...new Set([
  ...SUPERS_PADRAO,
  ...(process.env.SUPER_ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
])];

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ehSuper(req: NextRequest, s: SupabaseClient): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await s.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  return !!email && SUPERS.includes(email);
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const { data } = await s.from("vendas").select("id,email,nome,valor,modo,status,produto_id,criado_em,produtos(nome)").order("criado_em", { ascending: false }).limit(500);
  const vendas = (data ?? []).map((v) => {
    const prod = (v as { produtos?: { nome?: string } | { nome?: string }[] }).produtos;
    const nomeProduto = Array.isArray(prod) ? prod[0]?.nome : prod?.nome;
    return {
      id: v.id, email: v.email, nome: v.nome, valor: Number(v.valor || 0),
      modo: v.modo, status: v.status, criado_em: v.criado_em, produto: nomeProduto ?? "—",
    };
  });

  const pagas = vendas.filter((v) => v.status === "pago");
  const totais = {
    recebido: pagas.reduce((acc, v) => acc + v.valor, 0),
    vendas: pagas.length,
    reembolsos: vendas.filter((v) => v.status === "reembolsado").length,
    clientes: new Set(pagas.map((v) => (v.email || "").toLowerCase())).size,
  };
  return NextResponse.json({ vendas, totais });
}
