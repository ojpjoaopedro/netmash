import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Super admin embutido + extras via env SUPER_ADMINS="email1,email2"
const SUPERS_PADRAO = ["minhasmetricas@gmail.com"];
const SUPERS = [...new Set([
  ...SUPERS_PADRAO,
  ...(process.env.SUPER_ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
])];

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

function slugify(s: string): string {
  return (s || "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa";
}

function contar<T extends Record<string, unknown>>(arr: T[] | null, key: keyof T): Map<unknown, number> {
  const m = new Map<unknown, number>();
  (arr ?? []).forEach((r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1));
  return m;
}

async function getPrecos(s: SupabaseClient): Promise<{ superadmin: number; acesso: number }> {
  try {
    const { data } = await s.from("config_app").select("chave,valor");
    const m = new Map((data ?? []).map((r: { chave: string; valor: number }) => [r.chave, Number(r.valor)]));
    return { superadmin: m.get("preco_superadmin") ?? 79.9, acesso: m.get("preco_acesso") ?? 39.9 };
  } catch { return { superadmin: 79.9, acesso: 39.9 }; }
}

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave (SUPABASE_SERVICE_KEY)." }, { status: 500 });
  if (!SUPERS.length) return NextResponse.json({ error: "SUPER_ADMINS não configurado no servidor." }, { status: 500 });
  const su = await superDoCaller(req, s);
  if (!su) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  // Lista os acessos (equipe) de uma empresa específica.
  const empresaIdQ = new URL(req.url).searchParams.get("empresaId");
  if (empresaIdQ) {
    const { data } = await s.from("perfis").select("id,nome,email,papel,areas").eq("empresa_id", empresaIdQ).order("papel");
    return NextResponse.json({ acessos: data ?? [] });
  }

  const [emp, per, lan, cli, fun] = await Promise.all([
    s.from("empresas").select("*"),
    s.from("perfis").select("id,empresa_id,nome,email,papel"),
    s.from("lancamentos").select("empresa_id"),
    s.from("clientes").select("empresa_id"),
    s.from("funcionarios").select("empresa_id"),
  ]);
  const empresas = (emp.data ?? []) as { id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number; dono_id: string | null; plano?: string | null; valor?: number | null; slug?: string | null; responsavel?: string | null; logo_url?: string | null; cor?: string | null }[];
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
      plano: e.plano ?? null,
      valor: Number(e.valor ?? 0),
      slug: e.slug ?? null,
      cnpj: (e as { cnpj?: string | null }).cnpj ?? null,
      logo_url: e.logo_url ?? null,
      cor: e.cor ?? null,
      nLanc: (cLan.get(e.id) as number) ?? 0,
      nCli: (cCli.get(e.id) as number) ?? 0,
      nFunc: (cFun.get(e.id) as number) ?? 0,
    };
  }).sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));

  const faturamento = lista.reduce((acc, e) => acc + (e.valor || 0), 0);
  const ativos = lista.filter((e) => !e.acessoCortado).length;
  const precos = await getPrecos(s);
  return NextResponse.json({ empresas: lista, totais: { empresas: lista.length, usuarios: perfis.length, faturamento, ativos }, precos });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!SUPERS.length) return NextResponse.json({ error: "SUPER_ADMINS não configurado." }, { status: 500 });
  const su = await superDoCaller(req, s);
  if (!su) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const body = (await req.json()) as {
    action?: string; userId?: string; empresaId?: string;
    nomeEmpresa?: string; responsavel?: string; email?: string; senha?: string;
    cnpj?: string; qtdSuperadmins?: number | string; qtdAcessos?: number | string; logo?: string; slug?: string; cor?: string;
    nome?: string; areas?: string[]; segmento?: string; saldoInicial?: number | string;
    precoSuperadmin?: number | string; precoAcesso?: number | string;
    emailResp?: string; funcionarios?: { nome?: string; email?: string }[];
  };
  const { action, userId, empresaId } = body;

  // Cadastrar novo cliente (B2B): cria o responsável (super admin) + os funcionários e dispara e-mails de "crie sua senha".
  if (action === "criar") {
    const nomeEmpresa = (body.nomeEmpresa || "").trim();
    const emailResp = (body.emailResp || body.email || "").trim().toLowerCase();
    if (!nomeEmpresa || !emailResp || !emailResp.includes("@")) return NextResponse.json({ error: "Informe a empresa e o e-mail do responsável." }, { status: 400 });
    const slugFinal = slugify(nomeEmpresa);
    const { data: existe } = await s.from("empresas").select("id").eq("slug", slugFinal).maybeSingle();
    if (existe) return NextResponse.json({ error: `Já existe uma empresa com o endereço "/${slugFinal}".` }, { status: 400 });
    const tempPw = () => crypto.randomBytes(9).toString("base64url");
    // responsável = 1º super admin
    const { data: sa, error: saErr } = await s.auth.admin.createUser({ email: emailResp, password: tempPw(), email_confirm: true, user_metadata: { nome: body.responsavel || emailResp, empresa: nomeEmpresa } });
    if (saErr || !sa?.user) {
      const msg = /already.*registered|exists/i.test(saErr?.message || "") ? "O e-mail do responsável já tem conta." : (saErr?.message || "Não consegui criar.");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const funcs = (Array.isArray(body.funcionarios) ? body.funcionarios : []).filter((f) => (f?.email || "").includes("@"));
    const pr = await getPrecos(s);
    const valor = pr.superadmin + funcs.length * pr.acesso;
    const plano = `1 Super Admin + ${funcs.length} Acesso${funcs.length !== 1 ? "s" : ""}`;
    const { data: emp } = await s.from("empresas").select("id").eq("dono_id", sa.user.id).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    if (emp?.id) await s.from("empresas").update({ nome: nomeEmpresa, cnpj: body.cnpj || null, plano, valor, slug: slugFinal, responsavel: body.responsavel || null }).eq("id", emp.id);
    const emails = [emailResp];
    for (const f of funcs) {
      const email = (f.email || "").trim().toLowerCase();
      const { data: fu, error: fe } = await s.auth.admin.createUser({ email, password: tempPw(), email_confirm: true, user_metadata: { nome: f.nome || email, empresa: "" } });
      if (fe || !fu?.user) continue;
      await s.from("perfis").update({ empresa_id: emp?.id, papel: "colaborador", areas: ["financas", "saude", "comercial", "marketing"], nome: f.nome || email }).eq("id", fu.user.id);
      await s.from("empresas").delete().eq("dono_id", fu.user.id);
      emails.push(email);
    }
    // E-mails de boas-vindas / criar senha (best-effort — depende do SMTP configurado no Supabase)
    if (anonKey && url) {
      const origin = new URL(req.url).origin;
      const pub = createClient(url, anonKey, { auth: { persistSession: false } });
      await Promise.allSettled(emails.map((e) => pub.auth.resetPasswordForEmail(e, { redirectTo: `${origin}/senha` })));
    }
    return NextResponse.json({ ok: true, slug: slugFinal });
  }

  // Editar dados de uma empresa existente + do responsável (dono).
  if (action === "editar" && empresaId) {
    const nomeEmpresa = (body.nomeEmpresa || "").trim();
    if (!nomeEmpresa) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    const slugFinal = slugify(body.slug || nomeEmpresa);
    const { data: conflito } = await s.from("empresas").select("id").eq("slug", slugFinal).neq("id", empresaId).maybeSingle();
    if (conflito) return NextResponse.json({ error: `Já existe outra empresa com o endereço "/${slugFinal}".` }, { status: 400 });
    const qs = Math.max(1, Math.floor(Number(body.qtdSuperadmins) || 1));
    const qa = Math.max(0, Math.floor(Number(body.qtdAcessos) || 0));
    const pr = await getPrecos(s);
    const valor = qs * pr.superadmin + qa * pr.acesso;
    const plano = `${qs} Super Admin${qs > 1 ? "s" : ""} + ${qa} Acesso${qa !== 1 ? "s" : ""}`;
    const patch: Record<string, unknown> = { nome: nomeEmpresa, cnpj: body.cnpj || null, plano, valor, slug: slugFinal, responsavel: body.responsavel || null, segmento: body.segmento || null, saldo_inicial: Number(body.saldoInicial) || 0 };
    if (body.logo) patch.logo_url = body.logo;
    await s.from("empresas").update(patch).eq("id", empresaId);
    const { data: e } = await s.from("empresas").select("dono_id").eq("id", empresaId).single();
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    if (donoId) {
      const email = (body.email || "").trim().toLowerCase();
      await s.from("perfis").update({ nome: body.responsavel || null, ...(email ? { email } : {}) }).eq("id", donoId);
      const upd: { email?: string; password?: string; email_confirm?: boolean } = {};
      if (email) { upd.email = email; upd.email_confirm = true; }
      if (body.senha && body.senha.length >= 6) upd.password = body.senha;
      if (Object.keys(upd).length) { try { await s.auth.admin.updateUserById(donoId, upd); } catch { /* e-mail já em uso, etc. */ } }
    }
    return NextResponse.json({ ok: true });
  }

  // Criar acesso (colaborador) numa empresa selecionada — feito pelo super admin.
  if (action === "acesso-criar" && empresaId) {
    const email = (body.email || "").trim().toLowerCase();
    const senha = body.senha || "";
    if (!email || senha.length < 6) return NextResponse.json({ error: "Informe e-mail e senha (mín. 6)." }, { status: 400 });
    const { data: created, error } = await s.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome: body.nome || email, empresa: "" } });
    if (error || !created?.user) {
      const msg = /already.*registered|exists/i.test(error?.message || "") ? "Este e-mail já tem conta." : (error?.message || "Não consegui criar o acesso.");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const novoId = created.user.id;
    await s.from("perfis").update({ empresa_id: empresaId, papel: "colaborador", areas: Array.isArray(body.areas) ? body.areas : [], nome: body.nome || email }).eq("id", novoId);
    await s.from("empresas").delete().eq("dono_id", novoId); // remove a empresa órfã criada pelo gatilho
    return NextResponse.json({ ok: true });
  }
  if (action === "acesso-areas" && userId) {
    await s.from("perfis").update({ areas: Array.isArray(body.areas) ? body.areas : [] }).eq("id", userId);
    return NextResponse.json({ ok: true });
  }
  if (action === "acesso-remover" && userId) {
    await s.auth.admin.deleteUser(userId);
    return NextResponse.json({ ok: true });
  }

  // Salvar a cor principal da empresa (usada na página pública /slug).
  if (action === "empresa-cor" && empresaId) {
    const cor = (body.cor || "").trim();
    if (cor && !/^#[0-9a-fA-F]{6}$/.test(cor)) return NextResponse.json({ error: "Cor inválida." }, { status: 400 });
    await s.from("empresas").update({ cor: cor || null }).eq("id", empresaId);
    return NextResponse.json({ ok: true });
  }

  if (action === "config-precos") {
    const ps = Number(body.precoSuperadmin); const pa = Number(body.precoAcesso);
    if (!(ps >= 0) || !(pa >= 0)) return NextResponse.json({ error: "Preços inválidos." }, { status: 400 });
    await s.from("config_app").upsert([{ chave: "preco_superadmin", valor: ps }, { chave: "preco_acesso", valor: pa }]);
    return NextResponse.json({ ok: true });
  }

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
