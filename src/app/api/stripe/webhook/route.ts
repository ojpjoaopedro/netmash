import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function idPorEmail(s: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await s.from("perfis").select("id").ilike("email", email).limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

/** Cria a conta (1º acesso, com e-mail p/ criar senha) ou reativa um acesso existente. */
async function liberarAcesso(s: SupabaseClient, email: string, nome: string, origin: string): Promise<string> {
  const senhaTemp = crypto.randomBytes(9).toString("base64url");
  const { data: novo, error } = await s.auth.admin.createUser({
    email, password: senhaTemp, email_confirm: true, user_metadata: { nome, empresa: nome },
  });
  if (!error && novo?.user) {
    if (anonKey && url) {
      const pub = createClient(url, anonKey, { auth: { persistSession: false } });
      await pub.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/senha` });
    }
    return "conta_criada";
  }
  const id = await idPorEmail(s, email); // já existe -> reativa
  if (id) await s.auth.admin.updateUserById(id, { ban_duration: "none" });
  return "acesso_reativado";
}

export async function POST(req: NextRequest) {
  if (!stripe || !whSecret) return NextResponse.json({ error: "Stripe não configurado (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET)." }, { status: 500 });
  const s = svc();
  if (!s) return NextResponse.json({ error: "SUPABASE_SERVICE_KEY ausente." }, { status: 500 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig as string, whSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  // PAGOU -> registra a venda e libera o acesso ao app.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const meta = session.metadata || {};
    const nome = meta.nome || session.customer_details?.name || (email ? email.split("@")[0] : "Cliente");
    await s.from("vendas").insert({
      produto_id: meta.produto_id || null, email, nome,
      valor: (session.amount_total || 0) / 100, modo: session.mode, status: "pago",
      stripe_session_id: session.id, stripe_customer_id: String(session.customer || ""),
    });
    let acao = "venda_registrada";
    if (email && meta.libera_acesso !== "0") acao = await liberarAcesso(s, email, nome, origin);
    return NextResponse.json({ ok: true, acao });
  }

  // REEMBOLSO ou CANCELAMENTO de assinatura -> corta o acesso.
  if (event.type === "charge.refunded" || event.type === "customer.subscription.deleted") {
    let email = "";
    if (event.type === "charge.refunded") {
      const ch = event.data.object as Stripe.Charge;
      email = (ch.billing_details?.email || ch.receipt_email || "").toLowerCase();
    } else {
      const sub = event.data.object as Stripe.Subscription;
      try {
        const cust = await stripe.customers.retrieve(String(sub.customer));
        if (!("deleted" in cust)) email = (cust.email || "").toLowerCase();
      } catch { /* sem e-mail do cliente */ }
    }
    if (email) {
      const id = await idPorEmail(s, email);
      if (id) await s.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      await s.from("vendas").update({ status: "reembolsado" }).ilike("email", email);
      return NextResponse.json({ ok: true, acao: "acesso_cortado", encontrado: !!id });
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Webhook Stripe ativo — use POST." });
}
