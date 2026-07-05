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

function normCodigo(c: string): string {
  return (c || "").trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const { data } = await s.from("cupons").select("*").order("criado_em", { ascending: false });
  return NextResponse.json({ cupons: data ?? [] });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = (await req.json()) as { action?: string; id?: string; codigo?: string; descricao?: string; percentual?: number | string; ativo?: boolean };

  if (body.action === "excluir" && body.id) {
    await s.from("cupons").delete().eq("id", body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "salvar") {
    const codigo = normCodigo(body.codigo || "");
    if (!codigo) return NextResponse.json({ error: "Informe o código do cupom." }, { status: 400 });
    const pct = Math.min(100, Math.max(0, Number(String(body.percentual).replace(",", ".")) || 0));
    if (pct <= 0) return NextResponse.json({ error: "Informe um desconto maior que zero." }, { status: 400 });
    // Código único (ignora o próprio ao editar).
    const q = s.from("cupons").select("id").eq("codigo", codigo);
    const { data: ex } = await (body.id ? q.neq("id", body.id) : q).maybeSingle();
    if (ex) return NextResponse.json({ error: `Já existe um cupom com o código "${codigo}".` }, { status: 400 });
    const reg = { codigo, descricao: (body.descricao || "").trim() || null, percentual: pct, ativo: body.ativo !== false };
    if (body.id) { await s.from("cupons").update(reg).eq("id", body.id); return NextResponse.json({ ok: true }); }
    const { error } = await s.from("cupons").insert(reg);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
