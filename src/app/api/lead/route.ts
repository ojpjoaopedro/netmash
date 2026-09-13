// Captura leve (página /comecar): salva o lead (venda pendente) com Nome +
// WhatsApp + E-mail e devolve o link da Cakto já pré-preenchido. O CPF e a senha
// a pessoa preenche na Cakto; a conta nasce no webhook (que manda criar senha por
// e-mail se não houver). Serve pra ter o contato do possível comprador mesmo que
// ele não finalize o pagamento.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { montarLinkCheckout } from "@/lib/cakto";
import { escaparLike, listarPlanos, svc, PLANO_BASE, soDigitos } from "@/lib/vendas";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco." }, { status: 500 });

  const b = (await req.json()) as { nome?: string; email?: string; telefone?: string };
  const nome = (b.nome || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  const telefone = (b.telefone || "").trim();
  if (!nome) return NextResponse.json({ error: "Informe o seu nome." }, { status: 400 });
  if (!email.includes("@") || email.length < 6) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (soDigitos(telefone).length < 10) return NextResponse.json({ error: "Informe um WhatsApp com DDD." }, { status: 400 });

  const planos = await listarPlanos(s);
  const plano = planos.find((p) => p.chave === PLANO_BASE) || planos.find((p) => p.base);
  if (!plano || plano.preco <= 0) return NextResponse.json({ error: "Plano indisponível no momento." }, { status: 500 });

  // Clicou duas vezes / voltou: reaproveita a captura pendente recente (10 min).
  const dezMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pendente } = await s.from("vendas")
    .select("identifier,checkout_url")
    .eq("status", "pendente").eq("plano_chave", plano.chave).ilike("email", escaparLike(email))
    .gte("criado_em", dezMin).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  const re = pendente as { identifier: string; checkout_url: string | null } | null;
  if (re?.checkout_url) return NextResponse.json({ checkoutUrl: re.checkout_url, identifier: re.identifier });

  const identifier = `mm_${crypto.randomBytes(9).toString("hex")}`;
  const { error: erroIns } = await s.from("vendas").insert({
    identifier,
    plano_chave: plano.chave,
    plano_nome: plano.nome,
    nome, empresa: "", email, telefone, documento: "",
    valor: plano.primeiraCobranca ?? plano.preco,
    modo: "assinatura",
    status: "pendente",
    origem: "captura",
  });
  if (erroIns) return NextResponse.json({ error: "Não consegui registrar. Tente de novo." }, { status: 500 });

  if (!plano.link) {
    await s.from("vendas").update({ status: "falhou", erro: "Plano sem link de pagamento da Cakto.", alerta: true }).eq("identifier", identifier);
    return NextResponse.json({ error: "Pagamento indisponível no momento. Fale com o suporte." }, { status: 503 });
  }
  const link = montarLinkCheckout(plano.link, { identifier, nome, email, telefone, documento: "" });
  await s.from("vendas").update({ checkout_url: link, atualizado_em: new Date().toISOString() }).eq("identifier", identifier);
  return NextResponse.json({ checkoutUrl: link, identifier });
}
