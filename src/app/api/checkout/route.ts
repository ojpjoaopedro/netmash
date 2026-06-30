import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Produto = {
  id: string; nome: string; descricao: string | null; imagem: string | null; slug: string;
  preco: number; modo: string; intervalo: string | null; parcelas: number | null;
  libera_acesso: boolean; ativo: boolean;
};

/** GET ?slug= -> dados públicos do produto (para a página de checkout). */
export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "indisponível" }, { status: 500 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "sem slug" }, { status: 400 });
  const { data } = await s.from("produtos").select("nome,descricao,imagem,preco,modo,intervalo,parcelas").eq("slug", slug.toLowerCase()).eq("ativo", true).maybeSingle();
  if (!data) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json(data);
}

/** POST { slug, email? } -> cria a sessão de checkout na Stripe e devolve a URL. */
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe não configurado (STRIPE_SECRET_KEY)." }, { status: 500 });
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem Supabase." }, { status: 500 });

  const { slug, email, cupom, nome, telefone, cpf } = (await req.json()) as { slug?: string; email?: string; cupom?: string; nome?: string; telefone?: string; cpf?: string };
  if (!slug) return NextResponse.json({ error: "Produto não informado." }, { status: 400 });

  const { data: prod } = await s.from("produtos").select("*").eq("slug", String(slug).toLowerCase()).eq("ativo", true).maybeSingle();
  if (!prod) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const p = prod as Produto;

  const origin = new URL(req.url).origin;
  let centavos = Math.round(Number(p.preco) * 100);

  // Revalida o cupom no servidor (não confia no preço vindo do cliente).
  let cupomCod = "";
  const codigo = (cupom || "").trim().toUpperCase().replace(/\s+/g, "");
  if (codigo) {
    const { data: cup } = await s.from("cupons").select("codigo,percentual,ativo").eq("codigo", codigo).maybeSingle();
    if (cup && cup.ativo && Number(cup.percentual) > 0) {
      centavos = Math.max(0, Math.round(centavos * (1 - Number(cup.percentual) / 100)));
      cupomCod = cup.codigo;
    }
  }

  const isAssinatura = p.modo === "assinatura";
  const intervalo = (p.intervalo === "year" ? "year" : "month") as "month" | "year";

  const session = await stripe.checkout.sessions.create({
    mode: isAssinatura ? "subscription" : "payment",
    locale: "pt-BR",
    customer_email: email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "brl",
        product_data: { name: p.nome, description: p.descricao || undefined },
        unit_amount: centavos,
        ...(isAssinatura ? { recurring: { interval: intervalo } } : {}),
      },
    }],
    success_url: `${origin}/checkout/sucesso?cs={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/${p.slug}?cancelado=1`,
    metadata: { produto_id: p.id, slug: p.slug, libera_acesso: p.libera_acesso ? "1" : "0", cupom: cupomCod, nome: (nome || "").slice(0, 120), telefone: (telefone || "").slice(0, 40), cpf: (cpf || "").slice(0, 40) },
    ...(isAssinatura ? { subscription_data: { metadata: { produto_id: p.id } } } : {}),
  } as Stripe.Checkout.SessionCreateParams);

  return NextResponse.json({ url: session.url });
}
