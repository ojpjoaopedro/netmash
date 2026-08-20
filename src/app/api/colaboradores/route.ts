import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { motivoLimiteAcessos, podeAdicionarAcesso, type PlanosEmpresa } from "@/lib/planos";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  const emailL = (email || "").trim();
  if (!emailL.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });

  // Quantos logins a empresa pode ter é o que ela contratou: o plano base traz o
  // dono, e cada "2º acesso" comprado soma mais um. A conta é feita aqui no
  // servidor porque esconder o botão na tela não impede ninguém de chamar a API.
  const [{ data: emp }, { count: usados }] = await Promise.all([
    s.from("empresas").select("planos").eq("id", dono.empresaId).maybeSingle(),
    s.from("perfis").select("id", { count: "exact", head: true }).eq("empresa_id", dono.empresaId),
  ]);
  const planos = ((emp as { planos?: PlanosEmpresa } | null)?.planos) ?? null;
  if (!podeAdicionarAcesso(planos, usados ?? 0)) {
    return NextResponse.json({ error: motivoLimiteAcessos(planos), plano: "acesso2" }, { status: 402 });
  }
  // Senha opcional: se não vier, gera uma temporária e envia convite por e-mail para a pessoa criar a própria senha.
  const comConvite = !(senha && senha.length >= 6);
  const senhaFinal = comConvite ? crypto.randomBytes(9).toString("base64url") : senha!;

  const { data: created, error } = await s.auth.admin.createUser({
    email: emailL, password: senhaFinal, email_confirm: true,
    user_metadata: { nome: nome || emailL, empresa: nome || "" },
  });
  if (error || !created?.user) {
    const msg = /already.*registered|exists/i.test(error?.message || "") ? "Este e-mail já tem conta." : (error?.message || "Não consegui criar o acesso.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const novoId = created.user.id;
  // Reatribui o perfil para a empresa do dono e define o nível de acesso.
  await s.from("perfis").update({ empresa_id: dono.empresaId, papel: "colaborador", areas: areas ?? [], nome: nome || emailL }).eq("id", novoId);
  // Remove a empresa órfã criada pelo gatilho (o perfil já aponta para a empresa do dono).
  await s.from("empresas").delete().eq("dono_id", novoId);
  // Convite por e-mail: link para a pessoa definir a própria senha (best-effort).
  if (comConvite && anonKey && url) {
    try {
      const origin = new URL(req.url).origin;
      const pub = createClient(url, anonKey, { auth: { persistSession: false } });
      await pub.auth.resetPasswordForEmail(emailL, { redirectTo: `${origin}/senha` });
    } catch { /* segue mesmo se o e-mail falhar */ }
  }
  return NextResponse.json({ ok: true, convite: comConvite });
}

// Atualiza as permissões (áreas do menu) de um colaborador da empresa do dono.
export async function PATCH(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  const dono = await donoDoCaller(req, s);
  if (!dono) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id, areas } = (await req.json()) as { id?: string; areas?: string[] };
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  const { data: alvo } = await s.from("perfis").select("empresa_id").eq("id", id).single();
  if (!alvo || alvo.empresa_id !== dono.empresaId) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  await s.from("perfis").update({ areas: Array.isArray(areas) ? areas : [] }).eq("id", id);
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
