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

function slugify(s: string): string {
  return (s || "produto").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "produto";
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const { data } = await s.from("produtos").select("*").order("criado_em", { ascending: false });
  return NextResponse.json({ produtos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = (await req.json()) as {
    action?: string; id?: string;
    nome?: string; descricao?: string; imagem?: string; slug?: string;
    preco?: number | string; modo?: string; intervalo?: string; parcelas?: number | string;
    libera_acesso?: boolean; ativo?: boolean;
    pos_venda_msg?: string; pos_venda_btn_texto?: string; pos_venda_btn_link?: string;
  };
  const { action } = body;

  if (action === "excluir" && body.id) {
    await s.from("produtos").delete().eq("id", body.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "salvar") {
    const nome = (body.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "Informe o nome do produto." }, { status: 400 });
    const slugBase = slugify(body.slug || nome);
    // Garante slug único (ignora o próprio registro ao editar).
    let slug = slugBase, n = 1;
    while (true) {
      const q = s.from("produtos").select("id").eq("slug", slug);
      const { data: ex } = await (body.id ? q.neq("id", body.id) : q).maybeSingle();
      if (!ex) break;
      slug = `${slugBase}-${++n}`;
    }
    const reg = {
      nome,
      descricao: (body.descricao || "").trim() || null,
      imagem: (body.imagem || "").trim() || null,
      slug,
      preco: Number(String(body.preco).replace(",", ".")) || 0,
      modo: body.modo === "assinatura" ? "assinatura" : "pagamento",
      intervalo: body.intervalo === "year" ? "year" : "month",
      parcelas: Math.max(1, Math.floor(Number(body.parcelas) || 1)),
      libera_acesso: body.libera_acesso !== false,
      ativo: body.ativo !== false,
      pos_venda_msg: (body.pos_venda_msg || "").trim() || null,
      pos_venda_btn_texto: (body.pos_venda_btn_texto || "").trim() || null,
      pos_venda_btn_link: (body.pos_venda_btn_link || "").trim() || null,
    };
    if (body.id) {
      await s.from("produtos").update(reg).eq("id", body.id);
      return NextResponse.json({ ok: true, slug });
    }
    const { error } = await s.from("produtos").insert(reg);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, slug });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
