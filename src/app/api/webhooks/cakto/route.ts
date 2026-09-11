// Avisos de pagamento da Cakto.
//
// Cadastre esta URL no painel da Cakto (Integrações > Webhooks):
//   https://SEU-DOMINIO/api/webhooks/cakto
// A Cakto gera um `secret` ao criar o webhook: guarde o mesmo valor em
// CAKTO_WEBHOOK_SECRET (ou em app_kv, chave 'cakto_webhook_secret'). Sem segredo
// configurado o app recusa os avisos: aceitar qualquer chamada abriria a porta
// para alguém criar contas de graça.
//
// A origem é conferida de duas formas, nesta ordem: a assinatura no cabeçalho
// X-Cakto-Signature (preferida, porque prova a origem e detecta payload
// adulterado) e, quando ela não vem, o campo `secret` do corpo.
//
// Eventos tratados: purchase_approved (libera o acesso), purchase_refused,
// pix_gerado/boleto_gerado (cobrança criada, ainda esperando), refund,
// chargeback e os de assinatura (marcam a venda para a equipe olhar no Admin;
// o corte de acesso continua manual, de propósito).
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  assinaturaConfere, assinaturaDoPedido, consultarPedido, credenciais,
  identificadorDaVenda, pedidoPrincipal, segredosWebhook, segredosIguais,
  EVENTOS_DE_ALERTA, EVENTOS_DE_ASSINATURA, STATUS_POR_EVENTO,
  type EventoCakto,
} from "@/lib/cakto";
import { escaparLike, liberarVenda, listarPlanos, svc, PLANO_BASE, type Venda } from "@/lib/vendas";
import { enviarPurchaseCapi } from "@/lib/meta-capi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco." }, { status: 500 });

  // O corpo cru é o que a assinatura protege: leia como texto e só depois faça o parse.
  const corpoCru = await req.text();
  let ev: EventoCakto;
  try { ev = JSON.parse(corpoCru) as EventoCakto; } catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  // ── autenticidade ────────────────────────────────────────────────────────
  const aceitos = await segredosWebhook(s);
  if (!aceitos.length) return NextResponse.json({ error: "Webhook sem segredo configurado no servidor." }, { status: 503 });
  const assinatura = (req.headers.get("x-cakto-signature") || "").trim();
  const timestamp = (req.headers.get("x-cakto-timestamp") || "").trim();
  const autentico = aceitos.some((esperado) => assinatura && timestamp
    ? assinaturaConfere(corpoCru, timestamp, assinatura, esperado)
    : segredosIguais((ev.secret || "").trim(), esperado));
  if (!autentico) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  const evento = (ev.event || "").trim().toLowerCase();
  const pedido = pedidoPrincipal(ev);
  const pedidoId = pedido?.id || null;
  const novoStatus = STATUS_POR_EVENTO[evento];
  const deAssinatura = EVENTOS_DE_ASSINATURA.includes(evento);
  if (!novoStatus && !deAssinatura) return NextResponse.json({ ok: true, ignorado: evento || "sem evento" });

  // ── acha a venda ─────────────────────────────────────────────────────────
  const identifier = identificadorDaVenda(pedido);
  const emailCliente = (pedido?.customer?.email || "").trim().toLowerCase();
  let venda: Venda | null = null;

  if (identifier) {
    const { data } = await s.from("vendas").select("*").eq("identifier", identifier).maybeSingle();
    venda = (data as Venda | null) ?? null;
  }
  if (!venda && pedidoId) {
    const { data } = await s.from("vendas").select("*").eq("cakto_order_id", pedidoId).maybeSingle();
    venda = (data as Venda | null) ?? null;
  }
  if (!venda && emailCliente) {
    // compra feita direto pelo link do checkout, sem passar pela nossa landing
    const { data } = await s.from("vendas").select("*").ilike("email", escaparLike(emailCliente))
      .eq("status", "pendente").order("criado_em", { ascending: false }).limit(5);
    venda = ((data as Venda[] | null) ?? []).find((v) => (v.email || "").trim().toLowerCase() === emailCliente) ?? null;
  }

  // Nada encontrado e o cliente pagou: registra a venda a partir do que a Cakto
  // mandou (é o caso de quem comprou por um link divulgado, sem cadastro prévio).
  if (!venda && evento === "purchase_approved" && emailCliente) {
    const ofertaPaga = (pedido?.offer?.id || "").trim();
    const planos = await listarPlanos(s);
    const plano = (ofertaPaga ? planos.find((p) => (p.link || "").endsWith(`/${ofertaPaga}`)) : null)
      ?? planos.find((p) => p.chave === PLANO_BASE);
    const doc = (pedido?.customer?.docNumber || "").trim();
    const { data } = await s.from("vendas").insert({
      identifier: identifier || `ck_${pedidoId || crypto.randomBytes(8).toString("hex")}`,
      plano_chave: plano?.chave || PLANO_BASE,
      plano_nome: plano?.nome || pedido?.product?.name || "Minhas Métricas",
      nome: pedido?.customer?.name || null,
      empresa: pedido?.customer?.name || null,
      email: emailCliente,
      telefone: pedido?.customer?.phone || null,
      documento: doc || null,
      valor: Number(pedido?.amount ?? pedido?.baseAmount ?? plano?.preco ?? 0),
      modo: pedido?.product?.type === "subscription" ? "assinatura" : "pagamento",
      status: "pendente",
      origem: "link",
    }).select("*").maybeSingle();
    venda = (data as Venda | null) ?? null;
  }

  if (!venda) return NextResponse.json({ ok: true, ignorado: "venda não localizada", evento, pedido: pedidoId });

  // ── não processa o mesmo aviso duas vezes ────────────────────────────────
  const { error: erroEvento } = await s.from("vendas_eventos").insert({
    venda_id: venda.id, evento, transacao: pedidoId, payload: ev as unknown as Record<string, unknown>,
  });
  if (erroEvento && /duplicate|unique/i.test(erroEvento.message || "")) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  // ── confere com a Cakto antes de liberar (defesa extra, best-effort) ─────
  // Depende do escopo `orders` na chave de API; sem ele a consulta falha e
  // seguimos com o que o webhook disse, que já veio assinado.
  if (evento === "purchase_approved" && pedidoId) {
    const cred = await credenciais(s);
    if (cred) {
      const r = await consultarPedido(s, pedidoId);
      const st = (r.ok ? r.dados?.status : "")?.toLowerCase() || "";
      if (r.ok && st && !["paid", "authorized", "in_settlement", "partially_paid"].includes(st)) {
        await s.from("vendas").update({ erro: `Webhook dizia pago, mas a Cakto respondeu "${st}".`, alerta: true, atualizado_em: new Date().toISOString() }).eq("id", venda.id);
        return NextResponse.json({ ok: true, ignorado: "status não confirmado na Cakto" });
      }
    }
  }

  const agora = new Date().toISOString();
  const assinaturaId = assinaturaDoPedido(pedido);
  const patch: Record<string, unknown> = {
    atualizado_em: agora,
    ...(novoStatus ? { status: novoStatus } : {}),
    ...(pedidoId ? { cakto_order_id: pedidoId } : {}),
    ...(assinaturaId ? { cakto_subscription_id: assinaturaId } : {}),
    ...(EVENTOS_DE_ALERTA.includes(evento) ? { alerta: true } : {}),
  };

  if (evento === "purchase_approved") {
    const r = await liberarVenda(s, venda);
    patch.pago_em = pedido?.paidAt || agora;
    // o valor que vale é o que a Cakto cobrou (promoção, cupom, order bump, etc.)
    const cobrado = Number(pedido?.amount ?? 0);
    if (cobrado > 0) patch.valor = cobrado;
    if (!r.ok) {
      patch.erro = r.erro || "Não consegui liberar o acesso.";
      patch.alerta = true;
    } else {
      patch.erro = null;
      if (r.empresaId) patch.empresa_id = r.empresaId;
      if (r.userId) patch.user_id = r.userId;
    }
    // Rastreia a compra na Meta pela Conversions API (server-side, confiável).
    // Best-effort: se não houver pixel/token configurado, apenas ignora.
    const valorCompra = Number(pedido?.amount ?? venda.valor ?? 0);
    await enviarPurchaseCapi(s, {
      valor: valorCompra,
      email: pedido?.customer?.email || venda.email,
      telefone: pedido?.customer?.phone || venda.telefone,
      eventId: `cakto_${pedidoId || venda.identifier}`,
    });
  }

  await s.from("vendas").update(patch).eq("id", venda.id);
  return NextResponse.json({ ok: true, evento, status: novoStatus ?? venda.status });
}

/** Ping para conferir que a URL está no ar (a Cakto só usa POST). */
export async function GET() {
  return NextResponse.json({ ok: true, servico: "webhook Cakto" });
}
