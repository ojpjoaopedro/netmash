// Avisos de pagamento da Wiven.
//
// Cadastre esta URL no painel da Wiven (Configurações > Webhooks):
//   https://SEU-DOMINIO/api/webhooks/wiven
// com um token de validação, e guarde o mesmo token em WIVEN_WEBHOOK_TOKEN
// (ou em app_kv, chave 'wiven_webhook_token'). Sem token configurado o app
// recusa os avisos: aceitar qualquer chamada abriria a porta para alguém criar
// contas de graça.
//
// Eventos tratados: TRANSACTION_PAID (libera o acesso), TRANSACTION_REFUNDED,
// TRANSACTION_CHARGED_BACK e TRANSACTION_CANCELED (marcam a venda para a equipe
// olhar no Admin; o corte de acesso continua manual, de propósito).
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  consultarTransacao, credenciais, tokenWebhook,
  EVENTOS_DE_ALERTA, STATUS_POR_EVENTO,
  identificadorDaVenda, planoDoEvento, type EventoWiven,
} from "@/lib/wiven";
import { escaparLike, liberarVenda, listarPlanos, svc, PLANO_BASE, type Venda } from "@/lib/vendas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Comparação de tokens sem vazar tempo de resposta. */
function tokensIguais(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco." }, { status: 500 });

  let ev: EventoWiven;
  try { ev = (await req.json()) as EventoWiven; } catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  // ── autenticidade ────────────────────────────────────────────────────────
  const esperado = await tokenWebhook(s);
  if (!esperado) return NextResponse.json({ error: "Webhook sem token configurado no servidor." }, { status: 503 });
  const recebido = (ev.token || req.headers.get("x-webhook-token") || "").trim();
  if (!recebido || !tokensIguais(recebido, esperado)) return NextResponse.json({ error: "Token inválido." }, { status: 401 });

  const evento = (ev.event || "").trim().toUpperCase();
  const transacao = ev.transaction?.id || null;
  const novoStatus = STATUS_POR_EVENTO[evento];
  if (!novoStatus) return NextResponse.json({ ok: true, ignorado: evento || "sem evento" });

  // ── acha a venda ─────────────────────────────────────────────────────────
  const identifier = identificadorDaVenda(ev);
  const emailCliente = (ev.client?.email || "").trim().toLowerCase();
  let venda: Venda | null = null;

  if (identifier) {
    const { data } = await s.from("vendas").select("*").eq("identifier", identifier).maybeSingle();
    venda = (data as Venda | null) ?? null;
  }
  if (!venda && transacao) {
    const { data } = await s.from("vendas").select("*").eq("wiven_transaction_id", transacao).maybeSingle();
    venda = (data as Venda | null) ?? null;
  }
  if (!venda && emailCliente) {
    // compra feita direto pelo link do checkout, sem passar pela nossa landing
    const { data } = await s.from("vendas").select("*").ilike("email", escaparLike(emailCliente))
      .eq("status", "pendente").order("criado_em", { ascending: false }).limit(5);
    venda = ((data as Venda[] | null) ?? []).find((v) => (v.email || "").trim().toLowerCase() === emailCliente) ?? null;
  }

  // Nada encontrado e o cliente pagou: registra a venda a partir do que a Wiven
  // mandou (é o caso dos links de checkout antigos, sem cadastro prévio).
  if (!venda && evento === "TRANSACTION_PAID" && emailCliente) {
    const chavePlano = planoDoEvento(ev) || PLANO_BASE;
    const planos = await listarPlanos(s);
    const plano = planos.find((p) => p.chave === chavePlano);
    const { data } = await s.from("vendas").insert({
      identifier: identifier || `wv_${transacao || crypto.randomBytes(8).toString("hex")}`,
      plano_chave: plano?.chave || PLANO_BASE,
      plano_nome: plano?.nome || ev.orderItems?.[0]?.product?.name || "Minhas Métricas",
      nome: ev.client?.name || null,
      empresa: ev.client?.name || null,
      email: emailCliente,
      telefone: ev.client?.phone || null,
      documento: ev.client?.cpf || ev.client?.cnpj || null,
      valor: Number(ev.transaction?.amount || ev.orderItems?.[0]?.price || plano?.preco || 0),
      modo: ev.subscription ? "assinatura" : "pagamento",
      status: "pendente",
      origem: "link",
    }).select("*").maybeSingle();
    venda = (data as Venda | null) ?? null;
  }

  if (!venda) return NextResponse.json({ ok: true, ignorado: "venda não localizada", evento, transacao });

  // ── não processa o mesmo aviso duas vezes ────────────────────────────────
  const { error: erroEvento } = await s.from("vendas_eventos").insert({
    venda_id: venda.id, evento, transacao, payload: ev as unknown as Record<string, unknown>,
  });
  if (erroEvento && /duplicate|unique/i.test(erroEvento.message || "")) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  // ── confere com a Wiven antes de liberar (defesa extra, best-effort) ─────
  if (evento === "TRANSACTION_PAID" && transacao) {
    const cred = await credenciais(s);
    if (cred) {
      const r = await consultarTransacao(cred, transacao);
      const st = (r.ok ? r.dados?.status : "")?.toUpperCase() || "";
      if (r.ok && st && !["OK", "COMPLETED", "PAID"].includes(st)) {
        await s.from("vendas").update({ erro: `Webhook dizia pago, mas a Wiven respondeu "${st}".`, alerta: true, atualizado_em: new Date().toISOString() }).eq("id", venda.id);
        return NextResponse.json({ ok: true, ignorado: "status não confirmado na Wiven" });
      }
    }
  }

  const agora = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: novoStatus,
    atualizado_em: agora,
    ...(transacao ? { wiven_transaction_id: transacao } : {}),
    ...(ev.subscription?.id ? { wiven_subscription_id: ev.subscription.id } : {}),
    ...(EVENTOS_DE_ALERTA.includes(evento) ? { alerta: true } : {}),
  };

  if (evento === "TRANSACTION_PAID") {
    const r = await liberarVenda(s, venda);
    patch.pago_em = ev.transaction?.payedAt || agora;
    // o valor que vale é o que a Wiven cobrou (promoção de 1ª cobrança, order bump, etc.)
    const cobrado = Number(ev.transaction?.chargeAmount || ev.transaction?.amount || 0);
    if (cobrado > 0) patch.valor = cobrado;
    if (!r.ok) {
      patch.erro = r.erro || "Não consegui liberar o acesso.";
      patch.alerta = true;
    } else {
      patch.erro = null;
      if (r.empresaId) patch.empresa_id = r.empresaId;
      if (r.userId) patch.user_id = r.userId;
    }
  }

  await s.from("vendas").update(patch).eq("id", venda.id);
  return NextResponse.json({ ok: true, evento, status: novoStatus });
}

/** Ping para conferir que a URL está no ar (a Wiven só usa POST). */
export async function GET() {
  return NextResponse.json({ ok: true, servico: "webhook Wiven" });
}
