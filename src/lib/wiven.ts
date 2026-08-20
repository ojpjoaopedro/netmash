// Integração com a Wiven (gateway de pagamento).
// Documentação: https://app.wiven.com.br/docs
//
// O que usamos aqui:
//   • POST /gateway/checkout            cria uma página de checkout e devolve a URL
//   • GET  /gateway/transactions?id=…   confere o status de uma transação
//   • webhook (o app recebe em /api/webhooks/wiven) avisa quando o cliente paga
//
// Autenticação: dois cabeçalhos, x-public-key e x-secret-key. As chaves ficam em
// WIVEN_PUBLIC_KEY / WIVEN_SECRET_KEY (ambiente) ou na tabela app_kv, chaves
// 'wiven_public_key' e 'wiven_secret_key' (mesmo padrão das chaves do push, para
// quando o time não tem acesso ao painel de deploy).
import type { SupabaseClient } from "@supabase/supabase-js";

export const WIVEN_BASE = (process.env.WIVEN_API_URL || "https://app.wiven.com.br/api/v1").replace(/\/+$/, "");

// A doc envia o preço da oferta do checkout em centavos (exemplo oficial: 40000
// para R$ 400,00). Se a sua conta estiver configurada em reais, defina
// WIVEN_PRECO_CENTAVOS=0 no ambiente. Confira na primeira venda de teste.
const PRECO_EM_CENTAVOS = process.env.WIVEN_PRECO_CENTAVOS !== "0";

export type CredenciaisWiven = { publica: string; secreta: string };

async function doKv(s: SupabaseClient | null | undefined, chave: string): Promise<string> {
  if (!s) return "";
  try {
    const { data } = await s.from("app_kv").select("valor").eq("chave", chave).maybeSingle();
    return ((data as { valor?: string } | null)?.valor || "").trim();
  } catch { return ""; }
}

/** Chaves da API. Devolve null quando ainda não foram configuradas. */
export async function credenciais(s?: SupabaseClient | null): Promise<CredenciaisWiven | null> {
  const publica = (process.env.WIVEN_PUBLIC_KEY || "").trim() || (await doKv(s, "wiven_public_key"));
  const secreta = (process.env.WIVEN_SECRET_KEY || "").trim() || (await doKv(s, "wiven_secret_key"));
  return publica && secreta ? { publica, secreta } : null;
}

/** Token que a Wiven manda dentro do webhook, para provarmos que o aviso é dela. */
export async function tokenWebhook(s?: SupabaseClient | null): Promise<string> {
  return (process.env.WIVEN_WEBHOOK_TOKEN || "").trim() || (await doKv(s, "wiven_webhook_token"));
}

function cabecalhos(c: CredenciaisWiven): HeadersInit {
  return { "Content-Type": "application/json", "x-public-key": c.publica, "x-secret-key": c.secreta };
}

type RespostaApi<T> = { ok: true; dados: T } | { ok: false; erro: string; status: number };

async function chamar<T>(c: CredenciaisWiven, caminho: string, init?: RequestInit): Promise<RespostaApi<T>> {
  try {
    const res = await fetch(`${WIVEN_BASE}${caminho}`, { ...init, headers: cabecalhos(c), cache: "no-store" });
    const texto = await res.text();
    let corpo: unknown = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
    if (!res.ok) {
      const c2 = corpo as { message?: string; errorCode?: string } | null;
      return { ok: false, status: res.status, erro: c2?.message || c2?.errorCode || `Erro ${res.status} na Wiven.` };
    }
    return { ok: true, dados: corpo as T };
  } catch (e) {
    return { ok: false, status: 0, erro: e instanceof Error ? e.message : "Falha de conexão com a Wiven." };
  }
}

export type DadosCheckout = {
  identifier: string;          // nosso id da venda (volta nos webhooks)
  planoChave: string;          // vira o externalId do produto na Wiven
  planoNome: string;
  preco: number;               // em reais (ex.: 79.9)
  assinatura: boolean;
  thankYouPage?: string;
  foto?: string | null;
  cliente?: { nome?: string; email?: string; telefone?: string; documento?: string };
};

/**
 * Cria a página de checkout e devolve a URL para onde mandar o cliente.
 * Atenção: essa rota depende do módulo "checkout via API" estar liberado na
 * conta Wiven (pedir ao suporte). Enquanto não estiver, quem chama usa o link
 * fixo cadastrado no banco como alternativa.
 */
export async function criarCheckout(c: CredenciaisWiven, d: DadosCheckout): Promise<RespostaApi<{ success?: boolean; checkoutUrl?: string }>> {
  const corpo = {
    product: {
      externalId: d.planoChave,
      name: d.planoNome,
      ...(d.foto ? { photos: [d.foto] } : {}),
      offer: {
        name: d.planoNome,
        price: PRECO_EM_CENTAVOS ? Math.round(d.preco * 100) : d.preco,
        offerType: "NATIONAL",
        currency: "BRL",
        lang: "pt-BR",
      },
    },
    settings: {
      paymentMethods: ["PIX", "CREDIT_CARD", "BOLETO"],
      acceptedDocs: ["CPF", "CNPJ"],
      askForAddress: false,
      ...(d.thankYouPage ? { thankYouPage: d.thankYouPage } : {}),
    },
    ...(d.cliente ? {
      customer: {
        ...(d.cliente.nome ? { name: d.cliente.nome } : {}),
        ...(d.cliente.email ? { email: d.cliente.email } : {}),
        ...(d.cliente.telefone ? { phone: d.cliente.telefone } : {}),
        ...(d.cliente.documento ? { document: d.cliente.documento } : {}),
      },
    } : {}),
    // volta nos avisos de pagamento e é como amarramos a transação à venda
    trackProps: { external_id: d.identifier },
    metadata: { provider: "Minhas Metricas", orderId: d.identifier },
  };
  return chamar(c, "/gateway/checkout", { method: "POST", body: JSON.stringify(corpo) });
}

export type TransacaoWiven = {
  id?: string;
  status?: string;                 // OK | PENDING | FAILED | REFUNDED | CHARGED_BACK | COMPLETED
  amount?: number;
  paymentMethod?: string;
  payedAt?: string | null;
  clientIdentifier?: string | null;
};

/** Confere na Wiven o status de uma transação (usado para validar o webhook). */
export async function consultarTransacao(c: CredenciaisWiven, id: string): Promise<RespostaApi<TransacaoWiven>> {
  return chamar(c, `/gateway/transactions?id=${encodeURIComponent(id)}`, { method: "GET" });
}

// ── Webhook ────────────────────────────────────────────────────────────────
// Formato dos avisos que a Wiven manda. Só declaramos o que o app usa.
export type EventoWiven = {
  event?: string;                  // TRANSACTION_PAID, TRANSACTION_REFUNDED, ...
  token?: string;
  offerCode?: string | null;
  checkoutUrl?: string;
  client?: { id?: string; name?: string; email?: string; phone?: string | null; cpf?: string | null; cnpj?: string | null };
  transaction?: {
    id?: string;
    identifier?: string | null;
    status?: string;
    paymentMethod?: string;
    amount?: number;
    chargeAmount?: number;
    createAt?: string;
    payedAt?: string | null;
  };
  subscription?: { id?: string; identifier?: string | null; status?: string; cycle?: number } | null;
  orderItems?: { id?: string; price?: number; product?: { id?: string; name?: string; externalId?: string } }[];
  trackProps?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | string | null;
};

/** Como cada evento da Wiven se traduz no status que guardamos na venda. */
export const STATUS_POR_EVENTO: Record<string, string> = {
  TRANSACTION_PAID: "pago",
  TRANSACTION_CREATED: "pendente",
  TRANSACTION_CANCELED: "cancelado",
  TRANSACTION_REFUNDED: "reembolsado",
  TRANSACTION_CHARGED_BACK: "chargeback",
};

/** Eventos que a equipe precisa olhar no Admin (dinheiro devolvido ou contestado). */
export const EVENTOS_DE_ALERTA = ["TRANSACTION_REFUNDED", "TRANSACTION_CHARGED_BACK", "TRANSACTION_CANCELED"];

/** Procura o nosso identificador da venda em qualquer lugar que a Wiven possa devolver. */
export function identificadorDaVenda(ev: EventoWiven): string | null {
  const meta = typeof ev.metadata === "string" ? seguroJson(ev.metadata) : ev.metadata;
  const candidatos = [
    ev.transaction?.identifier,
    (ev.trackProps as { external_id?: string } | null | undefined)?.external_id,
    (meta as { orderId?: string } | null | undefined)?.orderId,
    ev.subscription?.identifier,
  ];
  for (const c of candidatos) if (typeof c === "string" && c.trim()) return c.trim();
  return null;
}

function seguroJson(txt: string): Record<string, unknown> | null {
  try { return JSON.parse(txt) as Record<string, unknown>; } catch { return null; }
}

/** Chave do plano comprado (externalId que mandamos ao criar o checkout). */
export function planoDoEvento(ev: EventoWiven): string | null {
  for (const item of ev.orderItems ?? []) {
    const ext = item.product?.externalId;
    if (typeof ext === "string" && ext.trim()) return ext.trim();
  }
  return null;
}
