import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Dados públicos de marca de uma empresa pelo slug (logo + nome + cor). Sem dados sensíveis. */
export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "indisponível" }, { status: 500 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "sem slug" }, { status: 400 });
  const { data } = await s.from("empresas").select("nome,logo_url,cor").eq("slug", slug.toLowerCase()).maybeSingle();
  if (!data) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json({ nome: data.nome, logo: (data as { logo_url?: string | null }).logo_url ?? null, cor: (data as { cor?: string | null }).cor ?? null });
}
