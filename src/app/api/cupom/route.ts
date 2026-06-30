import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida um cupom de desconto (público). GET ?codigo=BEMVINDO10 -> { valido, percentual, descricao }. */
export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ valido: false });
  const codigo = (new URL(req.url).searchParams.get("codigo") || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!codigo) return NextResponse.json({ valido: false });
  const { data } = await s.from("cupons").select("codigo,descricao,percentual,ativo").eq("codigo", codigo).maybeSingle();
  if (!data || !data.ativo || Number(data.percentual) <= 0) return NextResponse.json({ valido: false });
  return NextResponse.json({ valido: true, codigo: data.codigo, percentual: Number(data.percentual), descricao: data.descricao ?? null });
}
