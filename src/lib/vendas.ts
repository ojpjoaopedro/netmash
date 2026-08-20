// Regras de venda/assinatura usadas pelas rotas de servidor (checkout e webhook).
// Nada aqui roda no navegador: usa a chave de serviço do Supabase.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { PRECO_SUPERADMIN } from "@/lib/precos";
import { decifrar, segredoCheckout } from "@/lib/segredo";
import { lerOfertaDoLink } from "@/lib/wiven-catalogo";
import { FEATURES, quantidadeDoPlano, type PlanosEmpresa } from "@/lib/planos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cliente do Supabase com chave de serviço (só servidor). */
export function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Chave do plano base (o acesso principal da empresa, fora do planos_catalogo). */
export const PLANO_BASE = "superadmin";

export type PlanoVenda = {
  chave: string;
  nome: string;
  descricao: string | null;
  preco: number;            // mensalidade (vem da Wiven quando há link cadastrado)
  imagem: string | null;
  link: string | null;      // link de checkout cadastrado no Admin
  base: boolean;            // true = plano principal (cria a empresa)
  selo: string | null;      // etiqueta que aparece no painel (ex.: "Novo")
  primeiraCobranca: number | null;  // valor promocional da 1ª cobrança, se houver
  precoDaWiven: boolean;    // false = caiu no preço guardado no banco
  produtoWiven: string | null;      // nome do produto lá na Wiven (conferência)
};

export function slugify(s: string): string {
  return (s || "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa";
}

/** Só os dígitos do documento (para decidir entre CPF e CNPJ). */
export function soDigitos(v: string | null | undefined): string {
  return (v || "").replace(/\D+/g, "");
}

/**
 * Escapa o texto para usar em ilike. Sem isso, um e-mail com "_" (bem comum)
 * vira curinga e casa com o endereço de outra pessoa: "joao_silva@x.com"
 * acharia "joaoXsilva@x.com" e ligaria a compra na empresa errada.
 */
export function escaparLike(v: string): string {
  return v.replace(/([\\%_])/g, "\\$1");
}

/** Lista o que dá para comprar: o plano principal + os módulos do catálogo. */
export async function listarPlanos(s: SupabaseClient | null): Promise<PlanoVenda[]> {
  const base: PlanoVenda = {
    chave: PLANO_BASE,
    nome: "Minhas Métricas",
    descricao: "Painel completo da sua empresa: fluxo de caixa, lucro, contas e indicadores.",
    preco: PRECO_SUPERADMIN,
    imagem: null,
    link: null,
    base: true,
    selo: null,
    primeiraCobranca: null,
    precoDaWiven: false,
    produtoWiven: null,
  };
  if (!s) return [base];

  try {
    const [cfg, kv, cat] = await Promise.all([
      s.from("config_app").select("chave,valor"),
      s.from("app_kv").select("chave,valor").in("chave", ["imagem_superadmin", "link_superadmin"]),
      s.from("planos_catalogo").select("chave,nome,descricao,preco,imagem,link_pagamento,selo,ordem").order("ordem", { ascending: true }),
    ]);
    const precos = new Map(((cfg.data as { chave: string; valor: number }[] | null) ?? []).map((r) => [r.chave, Number(r.valor)]));
    const kvMap = new Map(((kv.data as { chave: string; valor: string | null }[] | null) ?? []).map((r) => [r.chave, r.valor]));
    base.preco = precos.get("preco_superadmin") ?? PRECO_SUPERADMIN;
    base.imagem = kvMap.get("imagem_superadmin") ?? null;
    base.link = kvMap.get("link_superadmin") ?? null;

    const modulos: PlanoVenda[] = ((cat.data as { chave: string; nome: string; descricao: string | null; preco: number; imagem: string | null; link_pagamento: string | null; selo: string | null }[] | null) ?? [])
      .map((c) => ({
        chave: c.chave, nome: c.nome, descricao: c.descricao, preco: Number(c.preco || 0),
        imagem: c.imagem, link: c.link_pagamento, base: false, selo: c.selo ?? null,
        primeiraCobranca: null, precoDaWiven: false, produtoWiven: null,
      }));
    return comPrecoDaWiven([base, ...modulos]);
  } catch {
    return [base];
  }
}

/**
 * Quem manda no preço é a Wiven: para cada plano com link de checkout, lê o
 * valor do produto lá e usa esse. O preço guardado no banco vira reserva, para
 * o caso de a leitura falhar (rede fora, link errado, produto desativado).
 */
async function comPrecoDaWiven(planos: PlanoVenda[]): Promise<PlanoVenda[]> {
  const ofertas = await Promise.all(planos.map((p) => (p.link ? lerOfertaDoLink(p.link) : Promise.resolve(null))));
  return planos.map((p, i) => {
    const o = ofertas[i];
    if (!o) return p;
    return {
      ...p,
      preco: o.preco,
      primeiraCobranca: o.primeiraCobranca,
      precoDaWiven: true,
      produtoWiven: o.produtoNome,
    };
  });
}

export type Venda = {
  id: string;
  identifier: string;
  email: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  documento: string | null;
  plano_chave: string;
  plano_nome: string | null;
  valor: number;
  status: string;
  senha_cifrada: string | null;
  empresa_id: string | null;
  user_id: string | null;
};

/** Gera um slug livre a partir do nome da empresa. */
async function slugLivre(s: SupabaseClient, nome: string): Promise<string> {
  const raiz = slugify(nome);
  let slug = raiz;
  for (let n = 2; n < 50; n++) {
    const { data } = await s.from("empresas").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${raiz}-${n}`;
  }
  return `${raiz}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Acha o perfil de um e-mail já cadastrado (cliente que está comprando de novo). */
export async function perfilPorEmail(s: SupabaseClient, email: string): Promise<{ id: string; empresa_id: string | null } | null> {
  const { data } = await s.from("perfis").select("id,empresa_id,email").ilike("email", escaparLike(email)).limit(20);
  // confere o e-mail de novo aqui: o ilike ignora maiúsculas, e a comparação
  // exata garante que nenhum endereço parecido entre no lugar do certo.
  const achado = ((data as { id: string; empresa_id: string | null; email: string | null }[] | null) ?? [])
    .find((p) => (p.email || "").trim().toLowerCase() === email);
  if (achado) return { id: achado.id, empresa_id: achado.empresa_id };
  // O perfil pode estar sem e-mail preenchido: procura no Auth como reserva.
  try {
    const { data: us } = await s.auth.admin.listUsers({ perPage: 1000 });
    const u = (us?.users ?? []).find((x) => (x.email || "").toLowerCase() === email);
    if (!u) return null;
    const { data: p } = await s.from("perfis").select("id,empresa_id").eq("id", u.id).maybeSingle();
    return { id: u.id, empresa_id: (p as { empresa_id?: string | null } | null)?.empresa_id ?? null };
  } catch { return null; }
}

/**
 * Liga um módulo no jsonb empresas.planos.
 *
 * Item de tela (folha, planejamento) é liga/desliga: vira `true`. Item de
 * limite (2º acesso) é somado, porque comprar duas vezes tem que valer por
 * dois logins, não continuar valendo por um.
 */
async function ligarModulo(s: SupabaseClient, empresaId: string, chave: string): Promise<void> {
  const { data } = await s.from("empresas").select("planos").eq("id", empresaId).maybeSingle();
  const atuais = (((data as { planos?: PlanosEmpresa } | null)?.planos) || {}) as Record<string, boolean | number>;
  const valor = valorDoModulo(atuais, chave);
  await s.from("empresas").update({ planos: { ...atuais, [chave]: valor } }).eq("id", empresaId);
}

/** O valor que a chave passa a ter depois de mais uma compra. */
function valorDoModulo(atuais: Record<string, boolean | number>, chave: string): boolean | number {
  const feature = FEATURES.find((f) => f.chave === chave);
  if (feature?.tipo !== "limite") return true;
  return quantidadeDoPlano(atuais, chave) + 1;
}

export type ResultadoLiberacao = {
  ok: boolean;
  empresaId?: string | null;
  userId?: string | null;
  criouConta?: boolean;
  precisaDefinirSenha?: boolean;
  erro?: string;
};

/**
 * Dá ao cliente o que ele comprou, depois do pagamento confirmado:
 *   • e-mail novo  -> cria o acesso (com a senha escolhida na landing) e a empresa
 *   • e-mail já cadastrado -> só liga o módulo comprado na empresa dele
 * É seguro chamar duas vezes: se a venda já tem empresa_id, não faz nada.
 */
export async function liberarVenda(s: SupabaseClient, venda: Venda): Promise<ResultadoLiberacao> {
  if (venda.empresa_id && venda.user_id) return { ok: true, empresaId: venda.empresa_id, userId: venda.user_id };

  const email = (venda.email || "").trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, erro: "Venda sem e-mail válido." };
  const ehBase = venda.plano_chave === PLANO_BASE;

  // ── cliente que já tem conta: só liga o módulo ────────────────────────────
  const existente = await perfilPorEmail(s, email);
  if (existente) {
    if (existente.empresa_id && !ehBase) await ligarModulo(s, existente.empresa_id, venda.plano_chave);
    return { ok: true, empresaId: existente.empresa_id, userId: existente.id, criouConta: false };
  }

  // ── cliente novo: cria o acesso ───────────────────────────────────────────
  const segredo = await segredoCheckout(s);
  const senhaEscolhida = venda.senha_cifrada && segredo ? decifrar(venda.senha_cifrada, segredo) : null;
  const senha = senhaEscolhida || crypto.randomBytes(9).toString("base64url");

  const nomeEmpresa = (venda.empresa || venda.nome || email.split("@")[0]).trim();
  const { data: criado, error } = await s.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: venda.nome || email, empresa: nomeEmpresa },
  });
  if (error || !criado?.user) return { ok: false, erro: error?.message || "Não consegui criar o acesso." };
  const userId = criado.user.id;

  // O gatilho handle_new_user já criou a empresa e o perfil (dono).
  const { data: emp } = await s.from("empresas").select("id").eq("dono_id", userId).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  const empresaId = (emp as { id?: string } | null)?.id ?? null;

  if (empresaId) {
    const doc = soDigitos(venda.documento);
    const patch: Record<string, unknown> = {
      nome: nomeEmpresa,
      slug: await slugLivre(s, nomeEmpresa),
      responsavel: venda.nome || null,
      plano: "1 Super Admin",
      valor: Number(venda.valor || 0),
      ...(doc.length === 14 ? { cnpj: venda.documento } : {}),
      ...(doc.length === 11 ? { responsavel_cpf: venda.documento } : {}),
      ...(ehBase ? {} : { planos: { [venda.plano_chave]: valorDoModulo({}, venda.plano_chave) } }),
    };
    await s.from("empresas").update(patch).eq("id", empresaId);
  }
  await s.from("perfis").update({ nome: venda.nome || null, email }).eq("id", userId);

  // Sem a senha escolhida (chave de cifra trocada, ou compra por link fixo, sem
  // cadastro prévio), mandamos o e-mail para o cliente criar a própria senha.
  let precisaDefinirSenha = false;
  if (!senhaEscolhida && url && anonKey) {
    precisaDefinirSenha = true;
    try {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const pub = createClient(url, anonKey, { auth: { persistSession: false } });
      await pub.auth.resetPasswordForEmail(email, site ? { redirectTo: `${site}/senha` } : undefined);
    } catch { /* best-effort: o cliente sempre pode usar "esqueci a senha" */ }
  }

  await s.from("vendas").update({
    empresa_id: empresaId, user_id: userId, senha_cifrada: null, atualizado_em: new Date().toISOString(),
  }).eq("id", venda.id);

  return { ok: true, empresaId, userId, criouConta: true, precisaDefinirSenha };
}
