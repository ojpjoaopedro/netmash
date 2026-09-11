// Integração com a Cakto (gateway de pagamento).
// Documentação: https://docs.cakto.com.br
//
// O que usamos aqui:
//   • checkout hospedado: o cliente vai para https://pay.cakto.com.br/<oferta>,
//     que é o link cadastrado por produto no Admin
//   • GET /public_api/products/<id>/   preço do produto (fonte do preço mostrado)
//   • GET /public_api/orders/<id>/     confere o pedido quando o webhook chega
//   • webhook (o app recebe em /api/webhooks/cakto) avisa quando o cliente paga
//
// Autenticação: OAuth2 client credentials. Troca-se client_id/client_secret por
// um access_token em POST /public_api/token/, que vale algumas horas e vai no
// cabeçalho Authorization. As credenciais ficam em CAKTO_CLIENT_ID /
// CAKTO_CLIENT_SECRET (ambiente) ou na tabela app_kv, chaves 'cakto_client_id'
// e 'cakto_client_secret' (mesmo padrão das chaves do push, para quando o time
// não tem acesso ao painel de deploy).
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const CAKTO_BASE = (process.env.CAKTO_API_URL || "https://api.cakto.com.br").replace(/\/+$/, "");

/** Domínio público do checkout (outro domínio, de propósito: não é a API). */
export const CAKTO_PAY = "https://pay.cakto.com.br";

export type CredenciaisCakto = { clientId: string; clientSecret: string };

async function doKv(s: SupabaseClient | null | undefined, chave: string): Promise<string> {
  if (!s) return "";
  try {
    const { data } = await s.from("app_kv").select("valor").eq("chave", chave).maybeSingle();
    return ((data as { valor?: string } | null)?.valor || "").trim();
  } catch { return ""; }
}

/** Credenciais da API. Devolve null quando ainda não foram configuradas. */
export async function credenciais(s?: SupabaseClient | null): Promise<CredenciaisCakto | null> {
  const clientId = (process.env.CAKTO_CLIENT_ID || "").trim() || (await doKv(s, "cakto_client_id"));
  const clientSecret = (process.env.CAKTO_CLIENT_SECRET || "").trim() || (await doKv(s, "cakto_client_secret"));
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Segredo que a Cakto manda no webhook, para provarmos que o aviso é dela. */
/**
 * Todos os segredos aceitos (ambiente e app_kv). Vale qualquer um: assim trocar
 * o segredo no banco funciona mesmo se houver um antigo esquecido no ambiente.
 */
export async function segredosWebhook(s?: SupabaseClient | null): Promise<string[]> {
  const lista = [(process.env.CAKTO_WEBHOOK_SECRET || "").trim(), await doKv(s, "cakto_webhook_secret")];
  return [...new Set(lista.filter(Boolean))];
}

// ── Token ──────────────────────────────────────────────────────────────────
// O token vale horas; guardamos na memória do processo e renovamos um minuto
// antes de vencer. Não existe rota de refresh: quando expira, pede-se outro.
let tokenGuardado: { valor: string; expiraEm: number; clientId: string } | null = null;

async function token(c: CredenciaisCakto): Promise<string | null> {
  const agora = Date.now();
  if (tokenGuardado && tokenGuardado.clientId === c.clientId && agora < tokenGuardado.expiraEm) {
    return tokenGuardado.valor;
  }
  try {
    const res = await fetch(`${CAKTO_BASE}/public_api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const dados = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!dados?.access_token) return null;
    const validade = Number(dados.expires_in || 3600);
    tokenGuardado = {
      valor: dados.access_token,
      expiraEm: agora + Math.max(60, validade - 60) * 1000,
      clientId: c.clientId,
    };
    return tokenGuardado.valor;
  } catch { return null; }
}

export type RespostaApi<T> = { ok: true; dados: T } | { ok: false; erro: string; status: number };

/** Chamada autenticada na API pública. Resolve as credenciais e o token sozinha. */
export async function chamar<T>(s: SupabaseClient | null | undefined, caminho: string, init?: RequestInit): Promise<RespostaApi<T>> {
  const c = await credenciais(s);
  if (!c) return { ok: false, status: 0, erro: "Sem credenciais da Cakto configuradas." };
  const t = await token(c);
  if (!t) return { ok: false, status: 401, erro: "Não consegui autenticar na Cakto." };
  try {
    const res = await fetch(`${CAKTO_BASE}${caminho}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...(init?.headers || {}) },
      cache: "no-store",
    });
    const texto = await res.text();
    let corpo: unknown = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
    if (!res.ok) {
      // token vencido antes da hora: força pedir outro na próxima chamada
      if (res.status === 401) tokenGuardado = null;
      const c2 = corpo as { detail?: string; message?: string } | null;
      return { ok: false, status: res.status, erro: c2?.detail || c2?.message || `Erro ${res.status} na Cakto.` };
    }
    return { ok: true, dados: corpo as T };
  } catch (e) {
    return { ok: false, status: 0, erro: e instanceof Error ? e.message : "Falha de conexão com a Cakto." };
  }
}

export type ProdutoCakto = {
  id?: string;
  name?: string;
  image?: string | null;
  price?: number;
  currency?: string;
  type?: "unique" | "subscription";
  status?: string;
};

/** Produto cadastrado na Cakto (é dele que sai o preço mostrado no app). */
export async function consultarProduto(s: SupabaseClient | null | undefined, id: string): Promise<RespostaApi<ProdutoCakto>> {
  return chamar<ProdutoCakto>(s, `/public_api/products/${encodeURIComponent(id)}/`);
}

/** Confere na Cakto o status de um pedido (usado para validar o webhook). */
export async function consultarPedido(s: SupabaseClient | null | undefined, id: string): Promise<RespostaApi<{ id?: string; status?: string; amount?: string | number }>> {
  return chamar(s, `/public_api/orders/${encodeURIComponent(id)}/`);
}

/** Link público de checkout de uma oferta. */
export function linkDePagamento(oferta: string): string {
  return `${CAKTO_PAY}/${(oferta || "").trim()}`;
}

export type DadosDoComprador = {
  identifier: string;                 // nosso id da venda (volta no webhook, em sck)
  nome?: string; email?: string; telefone?: string; documento?: string;
};

/**
 * Monta o link do checkout já com os dados do cliente e com o nosso id da venda.
 *
 * O `sck` é o campo livre de rastreio da Cakto: ele volta inteiro no webhook e é
 * como amarramos o pedido à venda que criamos aqui. Os campos do comprador são
 * uma comodidade (o checkout preenche o formulário); se algum nome de parâmetro
 * mudar lá, o cliente só digita de novo, nada quebra.
 */
export function montarLinkCheckout(link: string, d: DadosDoComprador): string {
  const u = new URL(link);
  if (d.nome) u.searchParams.set("name", d.nome);
  if (d.email) u.searchParams.set("email", d.email);
  if (d.telefone) u.searchParams.set("phone", d.telefone);
  if (d.documento) u.searchParams.set("document", d.documento);
  u.searchParams.set("sck", d.identifier);
  u.searchParams.set("utm_source", "minhasmetricas");
  u.searchParams.set("utm_content", d.identifier);
  return u.toString();
}

// ── Webhook ────────────────────────────────────────────────────────────────
// Formato dos avisos que a Cakto manda: { secret, event, data }. Só declaramos
// o que o app usa; o pedido completo tem 43 campos.
export type PedidoDoEvento = {
  id?: string;
  refId?: string;
  status?: string;                 // paid, waiting_payment, refused, refunded, chargedback, canceled, ...
  offer_type?: string;             // main, orderbump, upsell, downsell
  checkoutUrl?: string | null;
  baseAmount?: number;
  amount?: number | null;
  paymentMethod?: string;
  customer?: { id?: number; name?: string; email?: string; phone?: string | null; docType?: string | null; docNumber?: string | null };
  product?: { id?: string; short_id?: string; name?: string; type?: string };
  offer?: { id?: string; name?: string; price?: number; currency?: string } | null;
  subscription?: { id?: string; status?: string } | string | null;
  utm_source?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  sck?: string | null;
  createdAt?: string;
  paidAt?: string | null;
};

export type EventoCakto = {
  secret?: string;
  event?: string;
  data?: PedidoDoEvento | PedidoDoEvento[] | null;
};

/** Como cada evento da Cakto se traduz no status que guardamos na venda. */
export const STATUS_POR_EVENTO: Record<string, string> = {
  purchase_approved: "pago",
  purchase_refused: "falhou",
  pix_gerado: "pendente",
  boleto_gerado: "pendente",
  refund: "reembolsado",
  chargeback: "chargeback",
  subscription_canceled: "cancelado",
};

/** Eventos que a equipe precisa olhar no Admin (dinheiro devolvido ou assinatura caindo). */
export const EVENTOS_DE_ALERTA = [
  "refund", "chargeback", "subscription_canceled", "subscription_paused", "subscription_renewal_refused",
];

/**
 * Eventos que registramos no histórico sem mexer no status da venda: contam a
 * vida da assinatura depois da compra, e a venda continua sendo a compra inicial.
 */
export const EVENTOS_DE_ASSINATURA = [
  "subscription_created", "subscription_renewed", "subscription_resumed",
  "subscription_paused", "subscription_renewal_refused",
];

/**
 * Os pedidos de um aviso. O webhook V1 manda um objeto e o V2 manda a lista de
 * todos os pedidos da mesma cobrança (principal, order bump, upsell), por isso
 * o tipo é testado antes de usar.
 */
export function pedidosDoEvento(ev: EventoCakto): PedidoDoEvento[] {
  const d = ev.data;
  if (!d) return [];
  const lista = Array.isArray(d) ? d : [d];
  return lista.filter((p): p is PedidoDoEvento => !!p && typeof p === "object");
}

/** O pedido principal da cobrança (é o que vira venda; order bump vem à parte). */
export function pedidoPrincipal(ev: EventoCakto): PedidoDoEvento | null {
  const pedidos = pedidosDoEvento(ev);
  return pedidos.find((p) => p.offer_type === "main") ?? pedidos[0] ?? null;
}

/** Procura o nosso identificador da venda em qualquer lugar que a Cakto devolva. */
export function identificadorDaVenda(p: PedidoDoEvento | null): string | null {
  for (const c of [p?.sck, p?.utm_content, p?.utm_term]) {
    if (typeof c === "string" && c.trim().startsWith("mm_")) return c.trim();
  }
  return null;
}

/** Id da assinatura ligada ao pedido (a Cakto manda ora o objeto, ora só o id). */
export function assinaturaDoPedido(p: PedidoDoEvento | null): string | null {
  const a = p?.subscription;
  if (typeof a === "string") return a.trim() || null;
  if (a && typeof a === "object") return (a.id || "").trim() || null;
  return null;
}

/** Comparação de segredos sem vazar tempo de resposta. */
export function segredosIguais(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Tolerância da assinatura: aviso mais velho que isso é recusado (anti-replay). */
const TOLERANCIA_SEGUNDOS = 5 * 60;

/**
 * Confere o cabeçalho X-Cakto-Signature (v1=<hmac-sha256> de "<timestamp>.<corpo cru>").
 * O corpo tem que ser o texto recebido, byte a byte: reserializar o JSON muda os
 * bytes e derruba a comparação.
 */
export function assinaturaConfere(corpoCru: string, timestamp: string, assinatura: string, segredo: string): boolean {
  const t = Number(timestamp);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCIA_SEGUNDOS) return false;
  const esperado = crypto.createHmac("sha256", segredo).update(`${timestamp}.`).update(corpoCru).digest("hex");
  return segredosIguais(assinatura, `v1=${esperado}`);
}
