import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TOKEN = process.env.KIWIFY_WEBHOOK_TOKEN;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Verifica a assinatura HMAC-SHA1 do corpo cru com o token do webhook (Kiwify envia em ?signature=). */
function assinaturaOk(body: string, signature: string | null): boolean {
  if (!TOKEN || !signature) return false;
  const esperado = crypto.createHmac("sha1", TOKEN).update(body).digest("hex");
  const a = Buffer.from(esperado), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Pega o 1º caminho que existir e for string não-vazia (ex.: "Customer.email"). */
function pick(obj: unknown, ...paths: string[]): string | undefined {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const k of path.split(".")) {
      if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[k];
      else { cur = undefined; break; }
    }
    if (typeof cur === "string" && cur.trim()) return cur.trim();
  }
  return undefined;
}

async function idPorEmail(s: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await s.from("perfis").select("id").ilike("email", email).limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "SUPABASE_SERVICE_KEY ausente no servidor." }, { status: 500 });
  if (!TOKEN) return NextResponse.json({ error: "KIWIFY_WEBHOOK_TOKEN não configurado." }, { status: 500 });

  const body = await req.text();
  const signature = new URL(req.url).searchParams.get("signature");
  if (!assinaturaOk(body, signature)) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  // Kiwify envia JSON; tolera form-urlencoded por segurança.
  let p: unknown;
  try { p = JSON.parse(body); }
  catch {
    const f = new URLSearchParams(body);
    const raw = f.get("order") || f.get("data") || f.get("payload");
    try { p = raw ? JSON.parse(raw) : Object.fromEntries(f); } catch { p = Object.fromEntries(f); }
  }

  const email = (pick(p, "Customer.email", "customer.email", "buyer.email", "email") || "").toLowerCase();
  const nome = pick(p, "Customer.full_name", "customer.full_name", "customer.name", "Customer.first_name", "name") || (email ? email.split("@")[0] : "Cliente");
  const status = (pick(p, "order_status", "status", "Subscription.status") || "").toLowerCase();
  const evento = (pick(p, "webhook_event_type", "event", "type") || "").toLowerCase();

  if (!email) return NextResponse.json({ ok: true, ignored: "sem email no payload" });

  const aprovar = ["paid", "approved", "active"].includes(status) || ["order_approved", "subscription_renewed"].includes(evento);
  const cancelar = ["refunded", "chargedback", "canceled", "cancelled"].includes(status) || ["order_refunded", "chargeback", "subscription_canceled"].includes(evento);

  // CANCELOU / REEMBOLSOU / CHARGEBACK -> corta o acesso (bane o login).
  if (cancelar) {
    const id = await idPorEmail(s, email);
    if (id) await s.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    return NextResponse.json({ ok: true, acao: "acesso_cortado", encontrado: !!id });
  }

  // PAGOU / RENOVOU -> cria a conta (1º acesso) ou reativa (recompra/renovação).
  if (aprovar) {
    const senhaTemp = crypto.randomBytes(9).toString("base64url");
    const { data: novo, error } = await s.auth.admin.createUser({
      email, password: senhaTemp, email_confirm: true,
      user_metadata: { nome, empresa: nome },
    });
    if (!error && novo?.user) {
      // Conta nova: dispara o e-mail para o cliente definir a própria senha.
      if (anonKey && url) {
        const origin = new URL(req.url).origin;
        const pub = createClient(url, anonKey, { auth: { persistSession: false } });
        await pub.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/senha` });
      }
      return NextResponse.json({ ok: true, acao: "conta_criada" });
    }
    // Já existe (renovação ou recompra): garante acesso liberado.
    const id = await idPorEmail(s, email);
    if (id) await s.auth.admin.updateUserById(id, { ban_duration: "none" });
    return NextResponse.json({ ok: true, acao: "acesso_reativado", encontrado: !!id });
  }

  // Eventos intermediários (pix gerado, boleto, aguardando pagamento) -> ignora.
  return NextResponse.json({ ok: true, ignored: status || evento || "sem status" });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Webhook Kiwify ativo — use POST." });
}
