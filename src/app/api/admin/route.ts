import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
// E-mails dos super admins (separados por vírgula). Ex.: SUPER_ADMINS="voce@email.com,socio@email.com"
const SUPERS = (process.env.SUPER_ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida o token do chamador e exige que o e-mail esteja na lista de super admins. */
async function superDoCaller(req: NextRequest, s: SupabaseClient): Promise<{ email: string } | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await s.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (!email || !SUPERS.includes(email)) return null;
  return { email };
}

function contar<T extends Record<string, unknown>>(arr: T[] | null, key: keyof T): Map<unknown, number> {
  const m = new Map<unknown, number>();
  (arr ?? []).forEach((r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1));
  return m;
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave (SUPABASE_SERVICE_KEY)." }, { status: 500 });
  if (!SUPERS.length) return NextResponse.json({ error: "SUPER_ADMINS não configurado no servidor." }, { status: 500 });
  const su = await superDoCaller(req, s);
  if (!su) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const [emp, per, lan, cli, fun] = await Promise.all([
    s.from("empresas").select("id,nome,segmento,criado_em,saldo_inicial,dono_id"),
    s.from("perfis").select("id,empresa_id,nome,email,papel"),
    s.from("lancamentos").select("empresa_id"),
    s.from("clientes").select("empresa_id"),
    s.from("funcionarios").select("empresa_id"),
  ]);
  const empresas = (emp.data ?? []) as { id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number; dono_id: string | null }[];
  const perfis = (per.data ?? []) as { id: string; empresa_id: string; nome: string | null; email: string | null; papel: string }[];

  // Status de acesso (banido = acesso cortado)
  const banido = new Map<string, boolean>();
  try {
    const { data: us } = await s.auth.admin.listUsers({ perPage: 1000 });
    (us?.users ?? []).forEach((u) => {
      const until = (u as unknown as { banned_until?: string }).banned_until;
      banido.set(u.id, !!until && new Date(until).getTime() > Date.now());
    });
  } catch { /* segue sem status de ban */ }

  const cLan = contar(lan.data as { empresa_id: string }[], "empresa_id");
  const cCli = contar(cli.data as { empresa_id: string }[], "empresa_id");
  const cFun = contar(fun.data as { empresa_id: string }[], "empresa_id");
  const donoPorEmpresa = new Map<string, typeof perfis[number]>();
  perfis.forEach((p) => { if (p.papel === "dono") donoPorEmpresa.set(p.empresa_id, p); });

  const lista = empresas.map((e) => {
    const dono = donoPorEmpresa.get(e.id) ?? perfis.find((p) => p.id === e.dono_id) ?? null;
    return {
      id: e.id, nome: e.nome, segmento: e.segmento, criado_em: e.criado_em, saldo_inicial: e.saldo_inicial,
      dono_id: e.dono_id,
      dono: dono ? { id: dono.id, nome: dono.nome, email: dono.email } : null,
      acessoCortado: e.dono_id ? (banido.get(e.dono_id) ?? false) : false,
      nLanc: (cLan.get(e.id) as number) ?? 0,
      nCli: (cCli.get(e.id) as number) ?? 0,
      nFunc: (cFun.get(e.id) as number) ?? 0,
    };
  }).sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));

  return NextResponse.json({ empresas: lista, totais: { empresas: lista.length, usuarios: perfis.length } });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!SUPERS.length) return NextResponse.json({ error: "SUPER_ADMINS não configurado." }, { status: 500 });
  const su = await superDoCaller(req, s);
  if (!su) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const { action, userId, empresaId } = (await req.json()) as { action?: string; userId?: string; empresaId?: string };

  if (action === "cortar" && userId) {
    await s.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    return NextResponse.json({ ok: true });
  }
  if (action === "restaurar" && userId) {
    await s.auth.admin.updateUserById(userId, { ban_duration: "none" });
    return NextResponse.json({ ok: true });
  }
  if (action === "excluir" && empresaId) {
    const { data: e } = await s.from("empresas").select("dono_id").eq("id", empresaId).single();
    await s.from("empresas").delete().eq("id", empresaId); // cascata apaga lançamentos/clientes/etc.
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    if (donoId) await s.auth.admin.deleteUser(donoId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
