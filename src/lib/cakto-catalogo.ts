// Preços dos produtos direto da Cakto.
//
// Quem define o preço cobrado é a OFERTA (o produto tem um preço de vitrine,
// mas cada oferta pode ter o seu, inclusive promocional). O link de checkout
// cadastrado no Admin é https://pay.cakto.com.br/<id_da_oferta>, então é do id
// que está no link que partimos.
//
// Há dois caminhos para chegar na oferta, e o app usa o que a chave de API
// permitir:
//   1. GET /public_api/offers/  (escopo `offers`): traz o preço da própria
//      oferta, que é o valor exato que o cliente paga.
//   2. produtos + checkouts (escopo `products`): cada checkout diz quais
//      ofertas exibe, então dá para descobrir de que produto é a oferta do
//      link. Aqui o preço é o do produto, o que só difere do caminho 1 quando
//      existe oferta promocional.
//
// Nada disso é erro fatal: sem resposta (rede fora, escopo faltando, link
// errado), o preço guardado no banco (config_app / planos_catalogo, editável no
// Admin) continua valendo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { chamar, CAKTO_PAY } from "@/lib/cakto";

export type OfertaCakto = {
  produtoId: string | null;
  produtoNome: string | null;
  oferta: string | null;         // id da oferta (o que vai no fim do link)
  preco: number;                 // valor cobrado
  primeiraCobranca: number | null;  // valor da 1ª cobrança, quando há período de teste
  periodicidade: string | null;  // month, year, week, lifetime
  assinatura: boolean;
  moeda: string;
};

const TTL = 10 * 60 * 1000;   // 10 minutos: preço não muda toda hora

type Cache = { quando: number; ofertas: Map<string, OfertaCakto>; varrido: boolean };
let cache: Cache | null = null;

function cacheValido(): Cache | null {
  if (cache && Date.now() - cache.quando < TTL) return cache;
  return null;
}

function cacheNovo(): Cache {
  cache = { quando: Date.now(), ofertas: new Map(), varrido: false };
  return cache;
}

/** Id da oferta dentro do link de checkout (https://pay.cakto.com.br/<id>). */
export function ofertaDoLink(link: string): string | null {
  const url = (link || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)cakto\.com\.br$/i.test(u.hostname)) return null;
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id ? decodeURIComponent(id) : null;
  } catch { return null; }
}

// ── Caminho 1: a API de ofertas ────────────────────────────────────────────
type OfertaApi = {
  id?: string; name?: string; price?: number; currency?: string; product?: string;
  type?: "unique" | "subscription"; intervalType?: string; trial_days?: number;
};

/** Lê todas as ofertas da conta. Devolve false quando a API não deixou. */
async function carregarOfertas(s: SupabaseClient | null | undefined, c: Cache): Promise<boolean> {
  let alguma = false;
  for (let pagina = 1; pagina <= 10; pagina++) {
    const r = await chamar<{ results?: OfertaApi[]; next?: string | null }>(s, `/public_api/offers/?limit=100&page=${pagina}`);
    if (!r.ok) return alguma;   // 403 = chave sem o escopo `offers`
    for (const o of r.dados?.results ?? []) {
      if (!o?.id || typeof o.price !== "number" || o.price <= 0) continue;
      alguma = true;
      c.ofertas.set(o.id, {
        produtoId: o.product ?? null,
        produtoNome: null,          // preenchido só quando alguém pergunta por essa oferta
        oferta: o.id,
        preco: o.price,
        // período de teste é a única "1ª cobrança diferente" que a API expõe hoje
        primeiraCobranca: Number(o.trial_days || 0) > 0 ? 0 : null,
        periodicidade: o.intervalType ?? null,
        assinatura: o.type === "subscription",
        moeda: o.currency || "BRL",
      });
    }
    if (!r.dados?.next) break;
  }
  return alguma;
}

// ── Caminho 2: produtos e seus checkouts ───────────────────────────────────
type ProdutoApi = {
  id?: string; name?: string; price?: number; currency?: string;
  type?: "unique" | "subscription"; status?: string;
};

/**
 * Descobre as ofertas pelos checkouts de cada produto, parando assim que achar
 * a que interessa (a conta pode ter produtos de outros negócios, e cada produto
 * custa duas chamadas).
 */
async function varrerProdutos(s: SupabaseClient | null | undefined, c: Cache, procurada: string): Promise<void> {
  const lista = await chamar<{ results?: ProdutoApi[] }>(s, "/public_api/products/?limit=100");
  if (!lista.ok) return;

  for (const p of lista.dados?.results ?? []) {
    if (!p?.id || p.status !== "active" || typeof p.price !== "number" || p.price <= 0) continue;

    const checkouts = await chamar<{ results?: { id?: number }[] }>(s, `/public_api/products/${encodeURIComponent(p.id)}/checkouts/`);
    if (!checkouts.ok) continue;

    for (const ck of checkouts.dados?.results ?? []) {
      if (ck?.id == null) continue;
      const detalhe = await chamar<{ offers?: string[] }>(s, `/public_api/products/${encodeURIComponent(p.id)}/checkouts/${ck.id}/`);
      if (!detalhe.ok) continue;
      for (const oferta of detalhe.dados?.offers ?? []) {
        if (!oferta || c.ofertas.has(oferta)) continue;
        c.ofertas.set(oferta, {
          produtoId: p.id,
          produtoNome: p.name ?? null,
          oferta,
          preco: p.price,
          primeiraCobranca: null,   // promoção mora na oferta, que este caminho não lê
          periodicidade: null,
          assinatura: p.type === "subscription",
          moeda: p.currency || "BRL",
        });
      }
    }
    if (c.ofertas.has(procurada)) return;
  }
  c.varrido = true;
}

/** Nome do produto dono da oferta (só para conferência na tela do Admin). */
async function nomeDoProduto(s: SupabaseClient | null | undefined, id: string | null): Promise<string | null> {
  if (!id) return null;
  const r = await chamar<{ name?: string }>(s, `/public_api/products/${encodeURIComponent(id)}/`);
  return r.ok ? (r.dados?.name || null) : null;
}

/**
 * Lê a oferta de um link de checkout da Cakto, por exemplo
 * https://pay.cakto.com.br/jgyw3d8
 */
export async function lerOfertaDoLink(s: SupabaseClient | null | undefined, link: string): Promise<OfertaCakto | null> {
  const id = ofertaDoLink(link);
  if (!id) return null;

  let c = cacheValido();
  if (!c) {
    c = cacheNovo();
    await carregarOfertas(s, c);
  }
  if (!c.ofertas.has(id) && !c.varrido) await varrerProdutos(s, c, id);

  const o = c.ofertas.get(id);
  if (!o) return null;
  if (!o.produtoNome) o.produtoNome = await nomeDoProduto(s, o.produtoId);
  return o;
}

/** Link de checkout a partir do id da oferta (usado nas migrations e no Admin). */
export function linkDaOferta(oferta: string): string {
  return `${CAKTO_PAY}/${oferta}`;
}
