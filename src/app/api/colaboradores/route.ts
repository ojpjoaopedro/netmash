import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida o Bearer token do chamador e exige que ele seja 'dono'. Retorna {userId, empresaId} ou null. */
async function donoDoCaller(req: NextRequest, s: SupabaseClient): Promise<{ userId: string; empresaId: string } | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: u } = await s.auth.getUser(token);
  if (!u?.user) return null;
  const { data: perfil } = await s.from("perfis").select("empresa_id, papel").eq("id", u.user.id).single();
  if (!perfil || perfil.papel !== "dono") return null;
  return { userId: u.user.id, empresaId: perfil.empresa_id as string };
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  const dono = await donoDoCaller(req, s);
  if (!dono) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { data } = await s.from("perfis").select("id,nome,email,papel,areas").eq("empresa_id", dono.empresaId).order("papel");
  return NextResponse.json({ colaboradores: data ?? [] });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  const dono = await donoDoCaller(req, s);
  if (!dono) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { nome, email, senha, areas } = (await req.json()) as { nome?: string; email?: string; senha?: string; areas?: string[] };
  if (!email || !senha || senha.length < 6) return NextResponse.json({ error: "Informe e-mail e senha (mín. 6 caracteres)." }, { status: 400 });

  const { data: created, error } = await s.auth.admin.createUser({
    email: email.trim(), password: senha, email_confirm: true,
    user_metadata: { nome: nome || email, empresa: nome || "" },
  });
  if (error || !created?.user) {
    const msg = /already.*registered|exists/i.test(error?.message || "") ? "Este e-mail já tem conta." : (error?.message || "Não consegui criar o acesso.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const novoId = created.user.id;
  // Reatribui o perfil para a empresa do dono e define o nível de acesso.
  await s.from("perfis").update({ empresa_id: dono.empresaId, papel: "colaborador", areas: areas ?? [], nome: nome || email }).eq("id", novoId);
  // Remove a empresa órfã criada pelo gatilho (o perfil já aponta para a empresa do dono).
  await s.from("empresas").delete().eq("dono_id", novoId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  const dono = await donoDoCaller(req, s);
  if (!dono) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id === dono.userId) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  const { data: alvo } = await s.from("perfis").select("empresa_id").eq("id", id).single();
  if (!alvo || alvo.empresa_id !== dono.empresaId) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  await s.auth.admin.deleteUser(id);
  return NextResponse.json({ ok: true });
}
