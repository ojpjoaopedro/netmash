import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    const banido = new Map<string, boolean>();
    try {
      const { data: us } = await s.auth.admin.listUsers({ perPage: 1000 });
      (us?.users ?? []).forEach((u) => { const until = (u as unknown as { banned_until?: string }).banned_until; banido.set(u.id, !!until && new Date(until).getTime() > Date.now()); });
    } catch { /* segue sem status */ }
    const acessos = (data ?? []).map((a) => ({ ...a, cortado: banido.get((a as { id: string }).id) ?? false }));
    return NextResponse.json({ acessos });
  }

  // NÃO baixamos mais as tabelas lancamentos/clientes/funcionarios inteiras: as
  // contagens por empresa (nLanc/nCli/nFunc) não eram exibidas em lugar nenhum e
  // custavam varrer milhões de linhas por request conforme a base cresce.
  const [emp, per] = await Promise.all([
    s.from("empresas").select("*"),
    s.from("perfis").select("id,empresa_id,nome,email,papel"),
  ]);
  const empresas = (emp.data ?? []) as { id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number; dono_id: string | null; plano?: string | null; valor?: number | null; slug?: string | null; responsavel?: string | null; responsavel_cpf?: string | null; cidade?: string | null; estado?: string | null; logo_url?: string | null; cor?: string | null }[];
  const perfis = (per.data ?? []) as { id: string; empresa_id: string; nome: string | null; email: string | null; papel: string }[];

  // Status de acesso (banido = acesso cortado) + último acesso (last_sign_in_at).
  // Buscamos SÓ os donos das empresas exibidas (getUserById), em vez de listar
  // TODOS os usuários do Auth (que estourava em 1000 e crescia com a base toda).
  const banido = new Map<string, boolean>();
  const ultimoAcesso = new Map<string, string | null>();
  const donoIds = Array.from(new Set(empresas.map((e) => e.dono_id).filter((x): x is string => !!x)));
  // em lotes para não disparar centenas de chamadas de uma vez
  for (let i = 0; i < donoIds.length; i += 25) {
    const lote = donoIds.slice(i, i + 25);
    await Promise.all(lote.map(async (uid) => {
      try {
        const { data: u } = await s.auth.admin.getUserById(uid);
        const user = u?.user;
        if (!user) return;
        const until = (user as unknown as { banned_until?: string }).banned_until;
        banido.set(uid, !!until && new Date(until).getTime() > Date.now());
        ultimoAcesso.set(uid, (user as unknown as { last_sign_in_at?: string }).last_sign_in_at ?? null);
      } catch { /* segue sem status desse dono */ }
    }));
  }

  const donoPorEmpresa = new Map<string, typeof perfis[number]>();
  perfis.forEach((p) => { if (p.papel === "dono") donoPorEmpresa.set(p.empresa_id, p); });

  const lista = empresas.map((e) => {
    const dono = donoPorEmpresa.get(e.id) ?? perfis.find((p) => p.id === e.dono_id) ?? null;
    return {
      id: e.id, nome: e.nome, segmento: e.segmento, criado_em: e.criado_em, saldo_inicial: e.saldo_inicial,
      dono_id: e.dono_id,
      dono: dono ? { id: dono.id, nome: dono.nome, email: dono.email } : null,
      responsavel: e.responsavel ?? dono?.nome ?? null,
      responsavel_cpf: e.responsavel_cpf ?? null,
      ultimo_acesso: e.dono_id ? (ultimoAcesso.get(e.dono_id) ?? null) : null,
      acessoCortado: e.dono_id ? (banido.get(e.dono_id) ?? false) : false,
      plano: e.plano ?? null,
      valor: Number(e.valor ?? 0),
      slug: e.slug ?? null,
      cnpj: (e as { cnpj?: string | null }).cnpj ?? null,
      cidade: e.cidade ?? null,
      estado: e.estado ?? null,
      logo_url: e.logo_url ?? null,
      cor: e.cor ?? null,
    };
  }).sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));

  const faturamento = lista.reduce((acc, e) => acc + (e.valor || 0), 0);
  const ativos = lista.filter((e) => !e.acessoCortado).length;
  const precos = await getPrecos(s);

  // Consentimentos LGPD (retorna [] se a tabela ainda não existir)
  const nomeEmp = new Map(empresas.map((e) => [e.id, e.nome]));
  type LgRow = { id: string; user_id: string | null; email: string | null; nome: string | null; empresa_id: string | null; aceito_em: string; versao: string | null; user_agent: string | null; localizacao?: string | null };
  const lgSel = await s.from("lgpd_consentimentos").select("id,user_id,email,nome,empresa_id,aceito_em,versao,user_agent,localizacao").order("aceito_em", { ascending: false });
  // se a coluna "localizacao" ainda não foi criada no banco, busca sem ela (não quebra a lista)
  const lgRows: LgRow[] = (lgSel.data as LgRow[] | null)
    ?? ((await s.from("lgpd_consentimentos").select("id,user_id,email,nome,empresa_id,aceito_em,versao,user_agent").order("aceito_em", { ascending: false })).data as LgRow[] | null)
    ?? [];
  const lgpd = lgRows.map((r) => ({
    ...r, empresaNome: r.empresa_id ? (nomeEmp.get(r.empresa_id) ?? null) : null,
  }));

  // catálogo de produtos (planos). Retorna [] se a tabela ainda não existir.
  const catRes = await s.from("planos_catalogo").select("chave,nome,descricao,preco,ordem,imagem,link_pagamento").order("ordem", { ascending: true });
  const catalogo = (catRes.data as { chave: string; nome: string; descricao: string | null; preco: number; ordem: number; imagem: string | null; link_pagamento: string | null }[] | null) ?? [];

  // textos do Super Admin (plano base, fixo) guardados na tabelinha app_kv.
  const kvSA = await s.from("app_kv").select("chave,valor").in("chave", ["imagem_superadmin", "link_superadmin"]);
  const kvMap = new Map(((kvSA.data as { chave: string; valor: string | null }[] | null) ?? []).map((r) => [r.chave, r.valor]));
  const imagemSuperadmin = kvMap.get("imagem_superadmin") ?? null;
  const linkSuperadmin = kvMap.get("link_superadmin") ?? null;

  return NextResponse.json({ empresas: lista, totais: { empresas: lista.length, usuarios: perfis.length, faturamento, ativos }, precos, lgpd, catalogo, imagemSuperadmin, linkSuperadmin });
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
    cnpj?: string; cpf?: string; qtdSuperadmins?: number | string; qtdAcessos?: number | string; logo?: string; slug?: string; cor?: string;
    nome?: string; areas?: string[]; segmento?: string; cidade?: string; estado?: string; saldoInicial?: number | string;
    precoSuperadmin?: number | string; precoAcesso?: number | string;
    emailResp?: string; funcionarios?: { nome?: string; email?: string }[];
    lgpdId?: string; planoKey?: string; ativo?: boolean; descricao?: string; preco?: number | string;
    planos?: Record<string, boolean>; imagem?: string | null; link?: string | null;
  };
  const { action, userId, empresaId } = body;

  // Liga/desliga um módulo (plano) de uma empresa. Guarda em empresas.planos (jsonb).
  if (action === "planos" && empresaId && body.planoKey) {
    const { data: e } = await s.from("empresas").select("planos").eq("id", empresaId).maybeSingle();
    const planos = { ...(((e as { planos?: Record<string, boolean> } | null)?.planos) || {}), [body.planoKey]: !!body.ativo };
    await s.from("empresas").update({ planos }).eq("id", empresaId);
    return NextResponse.json({ ok: true, planos });
  }

  // Cadastra um novo produto (plano) no catálogo. Aparece como coluna (off) nas Empresas.
  if (action === "plano-add") {
    const nome = (body.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "Informe o nome do produto." }, { status: 400 });
    const base = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "plano";
    let chave = base, n = 1;
    while ((await s.from("planos_catalogo").select("chave").eq("chave", chave).maybeSingle()).data) chave = `${base}_${++n}`;
    const { data: mx } = await s.from("planos_catalogo").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    const ordem = (((mx as { ordem?: number } | null)?.ordem) ?? 0) + 1;
    const preco = Number(String(body.preco ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
    await s.from("planos_catalogo").insert({ chave, nome, descricao: (body.descricao || "").trim() || null, preco, ordem, imagem: body.imagem || null });
    return NextResponse.json({ ok: true, chave });
  }

  // Troca (ou remove) a imagem de um produto do catálogo. O Super Admin é o plano
  // base (fixo, fora do catálogo): a imagem dele fica na tabelinha app_kv.
  if (action === "plano-img" && body.planoKey) {
    if (body.planoKey === "superadmin") {
      await s.from("app_kv").upsert({ chave: "imagem_superadmin", valor: body.imagem || null });
    } else {
      await s.from("planos_catalogo").update({ imagem: body.imagem || null }).eq("chave", body.planoKey);
    }
    return NextResponse.json({ ok: true });
  }

  // Define o link de pagamento (checkout) de um produto. O Super Admin guarda no app_kv.
  if (action === "plano-link" && body.planoKey) {
    const link = (body.link || "").trim() || null;
    if (body.planoKey === "superadmin") {
      await s.from("app_kv").upsert({ chave: "link_superadmin", valor: link });
    } else {
      await s.from("planos_catalogo").update({ link_pagamento: link }).eq("chave", body.planoKey);
    }
    return NextResponse.json({ ok: true });
  }

  // Exclui um produto do catálogo.
  if (action === "plano-del" && body.planoKey) {
    await s.from("planos_catalogo").delete().eq("chave", body.planoKey);
    return NextResponse.json({ ok: true });
  }

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
    // só os módulos marcados como true entram nos planos ativos da empresa
    const planosAtivos = Object.fromEntries(Object.entries(body.planos || {}).filter(([, v]) => v));
    if (emp?.id) await s.from("empresas").update({ nome: nomeEmpresa, cnpj: body.cnpj || null, plano, valor, slug: slugFinal, responsavel: body.responsavel || null, responsavel_cpf: body.cpf || null, planos: planosAtivos }).eq("id", emp.id);
    // a nova empresa nasce sem estrutura no banco: o painel mostra o MODELO LIMPO
    // (genérico) até a empresa preencher. Assim nenhum dado de exemplo vaza.
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
    const patch: Record<string, unknown> = { nome: nomeEmpresa, cnpj: body.cnpj || null, plano, valor, slug: slugFinal, responsavel: body.responsavel || null, responsavel_cpf: body.cpf || null, segmento: body.segmento || null, saldo_inicial: Number(body.saldoInicial) || 0 };
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
  // A senha NÃO é definida aqui: o colaborador recebe um e-mail para criar a própria senha.
  if (action === "acesso-criar" && empresaId) {
    const email = (body.email || "").trim().toLowerCase();
    if (!email.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    const senha = body.senha && body.senha.length >= 6 ? body.senha : crypto.randomBytes(9).toString("base64url");
    const { data: created, error } = await s.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome: body.nome || email, empresa: "" } });
    if (error || !created?.user) {
      const msg = /already.*registered|exists/i.test(error?.message || "") ? "Este e-mail já tem conta." : (error?.message || "Não consegui criar o acesso.");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const novoId = created.user.id;
    await s.from("perfis").update({ empresa_id: empresaId, papel: "colaborador", areas: Array.isArray(body.areas) ? body.areas : [], nome: body.nome || email }).eq("id", novoId);
    await s.from("empresas").delete().eq("dono_id", novoId); // remove a empresa órfã criada pelo gatilho
    // E-mail para o colaborador criar a própria senha (best-effort).
    if (anonKey && url) {
      try {
        const origin = new URL(req.url).origin;
        const pub = createClient(url, anonKey, { auth: { persistSession: false } });
        await pub.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/senha` });
      } catch { /* segue mesmo se o e-mail falhar */ }
    }
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

  // Reenviar acesso a UM usuário específico (colaborador/admin): e-mail para criar/redefinir a senha.
  if (action === "acesso-reenviar" && userId) {
    const { data: prof } = await s.from("perfis").select("email,empresa_id").eq("id", userId).single();
    const email = (prof as { email?: string } | null)?.email;
    if (!email) return NextResponse.json({ error: "Usuário sem e-mail." }, { status: 400 });
    if (!anonKey || !url) return NextResponse.json({ error: "E-mail não configurado no servidor." }, { status: 500 });
    const origin = new URL(req.url).origin;
    let redirect = `${origin}/login?nova=1`;
    const empId = (prof as { empresa_id?: string } | null)?.empresa_id;
    if (empId) { const { data: e } = await s.from("empresas").select("slug").eq("id", empId).maybeSingle(); const slug = (e as { slug?: string } | null)?.slug; if (slug) redirect = `${origin}/${slug}`; }
    const pub = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await pub.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Reenviar acesso ao responsável: e-mail com link pra criar/redefinir a senha,
  // redirecionando para a página da própria empresa (/slug).
  if (action === "reenviar" && empresaId) {
    const { data: e } = await s.from("empresas").select("dono_id,slug").eq("id", empresaId).single();
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    if (!donoId) return NextResponse.json({ error: "Empresa sem responsável." }, { status: 400 });
    const { data: prof } = await s.from("perfis").select("email").eq("id", donoId).single();
    const email = (prof as { email?: string } | null)?.email;
    if (!email) return NextResponse.json({ error: "Responsável sem e-mail." }, { status: 400 });
    if (!anonKey || !url) return NextResponse.json({ error: "E-mail não configurado no servidor." }, { status: 500 });
    const slug = (e as { slug?: string } | null)?.slug;
    const origin = new URL(req.url).origin;
    const redirect = slug ? `${origin}/${slug}` : `${origin}/login?nova=1`;
    const pub = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await pub.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Ver painel como UM usuário específico (link mágico para o e-mail dele).
  if (action === "acesso-acessar" && userId) {
    const { data: au } = await s.auth.admin.getUserById(userId);
    const email = au?.user?.email;
    if (!email) return NextResponse.json({ error: "Usuário sem e-mail." }, { status: 400 });
    const origin = new URL(req.url).origin;
    const { data: link, error } = await s.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${origin}/dashboard/home` } });
    const url2 = (link as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    if (error || !url2) return NextResponse.json({ error: "Não consegui gerar o acesso agora." }, { status: 400 });
    return NextResponse.json({ ok: true, link: url2 });
  }

  // Editar nome e/ou e-mail de UM acesso (colaborador/admin).
  if (action === "acesso-editar" && userId) {
    const patch: Record<string, unknown> = {};
    if (typeof body.nome === "string") patch.nome = body.nome.trim() || null;
    if (typeof body.email === "string" && body.email.trim()) {
      const { error: eAuth } = await s.auth.admin.updateUserById(userId, { email: body.email.trim() });
      if (eAuth) return NextResponse.json({ error: /already|exists|registered/i.test(eAuth.message) ? "Este e-mail já está em uso." : eAuth.message }, { status: 400 });
      patch.email = body.email.trim();
    }
    if (Object.keys(patch).length) await s.from("perfis").update(patch).eq("id", userId);
    return NextResponse.json({ ok: true });
  }

  // Editar inline os dados cadastrais (sem mexer no plano/slug).
  if (action === "empresa-dados" && empresaId) {
    const patch: Record<string, unknown> = {};
    if (typeof body.nomeEmpresa === "string" && body.nomeEmpresa.trim()) patch.nome = body.nomeEmpresa.trim();
    if (body.cnpj !== undefined) patch.cnpj = body.cnpj || null;
    if (body.segmento !== undefined) patch.segmento = body.segmento || null;
    if (body.logo) patch.logo_url = body.logo;
    if (Object.keys(patch).length) await s.from("empresas").update(patch).eq("id", empresaId);
    // Cidade/estado são colunas novas — atualiza à parte e ignora o erro se ainda não existirem no banco,
    // pra nunca derrubar o salvamento de nome/CNPJ/responsável.
    const geo: Record<string, unknown> = {};
    if (body.cidade !== undefined) geo.cidade = body.cidade || null;
    if (body.estado !== undefined) geo.estado = body.estado || null;
    if (Object.keys(geo).length) {
      const { error } = await s.from("empresas").update(geo).eq("id", empresaId);
      if (error) console.warn("[empresa-dados] cidade/estado ainda não existem no banco:", error.message);
    }
    const { data: emp } = await s.from("empresas").select("dono_id").eq("id", empresaId).single();
    const donoId = (emp as { dono_id?: string } | null)?.dono_id;
    if (donoId && (body.responsavel !== undefined || body.email)) {
      const email = (body.email || "").trim().toLowerCase();
      await s.from("perfis").update({ ...(body.responsavel !== undefined ? { nome: body.responsavel || null } : {}), ...(email ? { email } : {}) }).eq("id", donoId);
      if (email) { try { await s.auth.admin.updateUserById(donoId, { email, email_confirm: true }); } catch { /* e-mail já em uso */ } }
    }
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

  // Reenviar o e-mail de "criar senha" para o responsável + equipe da empresa.
  if (action === "reenviar" && empresaId) {
    if (!anonKey || !url) return NextResponse.json({ error: "Servidor sem chave pública (NEXT_PUBLIC_SUPABASE_ANON_KEY)." }, { status: 500 });
    const emails = new Set<string>();
    const { data: perfis } = await s.from("perfis").select("email").eq("empresa_id", empresaId);
    (perfis ?? []).forEach((p: { email: string | null }) => { if (p.email) emails.add(p.email.trim().toLowerCase()); });
    const { data: e } = await s.from("empresas").select("dono_id").eq("id", empresaId).maybeSingle();
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    if (donoId) {
      const { data: dp } = await s.from("perfis").select("email").eq("id", donoId).maybeSingle();
      const em = (dp as { email?: string } | null)?.email;
      if (em) emails.add(em.trim().toLowerCase());
    }
    const lista = [...emails].filter((x) => x.includes("@"));
    if (!lista.length) return NextResponse.json({ error: "Nenhum e-mail encontrado para esta empresa." }, { status: 400 });
    const origin = new URL(req.url).origin;
    const pub = createClient(url, anonKey, { auth: { persistSession: false } });
    await Promise.allSettled(lista.map((em) => pub.auth.resetPasswordForEmail(em, { redirectTo: `${origin}/senha` })));
    return NextResponse.json({ ok: true, enviados: lista.length });
  }

  if (action === "cortar" && userId) {
    await s.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    return NextResponse.json({ ok: true });
  }
  if (action === "restaurar" && userId) {
    await s.auth.admin.updateUserById(userId, { ban_duration: "none" });
    return NextResponse.json({ ok: true });
  }
  if (action === "lgpd-remover" && body.lgpdId) {
    await s.from("lgpd_consentimentos").delete().eq("id", body.lgpdId);
    return NextResponse.json({ ok: true });
  }
  // Gera um link mágico para o super admin ENTRAR no painel da empresa sem login/senha
  // (abrir numa aba anônima). Serve para visualizar como está por dentro.
  if (action === "acessar" && empresaId) {
    const { data: e } = await s.from("empresas").select("dono_id").eq("id", empresaId).single();
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    if (!donoId) return NextResponse.json({ error: "Esta empresa não tem um responsável para acessar." }, { status: 400 });
    const { data: donoAuth } = await s.auth.admin.getUserById(donoId);
    const email = donoAuth?.user?.email;
    if (!email) return NextResponse.json({ error: "O responsável não tem e-mail." }, { status: 400 });
    const origin = new URL(req.url).origin;
    const { data: link, error } = await s.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${origin}/dashboard/home` } });
    const url2 = (link as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    if (error || !url2) return NextResponse.json({ error: "Não consegui gerar o acesso agora." }, { status: 400 });
    return NextResponse.json({ ok: true, link: url2 });
  }
  if (action === "excluir" && empresaId) {
    const { data: e } = await s.from("empresas").select("dono_id").eq("id", empresaId).single();
    const donoId = (e as { dono_id?: string } | null)?.dono_id;
    // trava de segurança: nunca excluir a empresa PADRÃO (conta super admin)
    if (donoId) {
      const { data: donoAuth } = await s.auth.admin.getUserById(donoId);
      const donoEmail = (donoAuth?.user?.email || "").toLowerCase();
      if (SUPERS.includes(donoEmail)) return NextResponse.json({ error: "Não é possível excluir a empresa padrão (Minhas Métricas)." }, { status: 400 });
    }
    // pega os acessos (colaboradores) desta empresa antes de apagar, para liberar os e-mails também
    const { data: colabs } = await s.from("perfis").select("id").eq("empresa_id", empresaId);
    // apaga a empresa (cascata: lançamentos, clientes, funcionários, financas_estrutura, painel_estado)
    await s.from("empresas").delete().eq("id", empresaId);
    // apaga os logins (auth) do dono e dos acessos, liberando os e-mails para novo cadastro
    if (donoId) { try { await s.auth.admin.deleteUser(donoId); } catch { /* ignore */ } }
    for (const c of (colabs || [])) {
      const cid = (c as { id?: string }).id;
      if (cid && cid !== donoId) { try { await s.auth.admin.deleteUser(cid); } catch { /* ignore */ } }
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
