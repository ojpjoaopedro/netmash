// Checkout da assinatura: monta a venda (ainda pendente) e devolve para onde
// mandar o cliente pagar. Quem confirma o pagamento é /api/webhooks/wiven.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { credenciais, criarCheckout } from "@/lib/wiven";
import { cifrar, segredoCheckout } from "@/lib/segredo";
import { escaparLike, listarPlanos, perfilPorEmail, svc, PLANO_BASE, soDigitos } from "@/lib/vendas";

export const runtime = "nodejs";
export const maxDuration = 30;

const ehProducao = process.env.NODE_ENV === "production";

/** Planos à venda (usado pela landing /assinar). */
export async function GET() {
  const s = svc();
  const planos = (await listarPlanos(s)).map(({ chave, nome, descricao, preco, imagem, base, selo, primeiraCobranca, precoDaWiven }) =>
    ({ chave, nome, descricao, preco, imagem, base, selo, primeiraCobranca, precoDaWiven }));
  return NextResponse.json({ planos, configurado: !!s });
}

type Corpo = {
  plano?: string; nome?: string; empresa?: string; email?: string;
  telefone?: string; documento?: string; senha?: string;
};

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco (SUPABASE_SERVICE_KEY)." }, { status: 500 });

  const b = (await req.json()) as Corpo;
  const nome = (b.nome || "").trim();
  const empresa = (b.empresa || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  const telefone = (b.telefone || "").trim();
  const documento = (b.documento || "").trim();
  const senha = b.senha || "";
  const doc = soDigitos(documento);

  const planos = await listarPlanos(s);
  const plano = planos.find((p) => p.chave === (b.plano || PLANO_BASE));
  if (!plano) return NextResponse.json({ error: "Plano não encontrado." }, { status: 400 });
  if (plano.preco <= 0) return NextResponse.json({ error: "Este plano está sem preço configurado." }, { status: 400 });

  if (!nome) return NextResponse.json({ error: "Informe o seu nome." }, { status: 400 });
  if (!email.includes("@") || email.length < 6) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (soDigitos(telefone).length < 10) return NextResponse.json({ error: "Informe um telefone com DDD." }, { status: 400 });
  if (doc.length !== 11 && doc.length !== 14) return NextResponse.json({ error: "Informe um CPF ou CNPJ válido." }, { status: 400 });
  // Empresa e senha só fazem sentido no plano principal: é ele que cria a conta.
  // Módulo extra é comprado por quem já é cliente, com o e-mail que ele já usa.
  if (plano.base) {
    if (!empresa) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    if (senha.length < 6) return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
    const jaTem = await perfilPorEmail(s, email);
    if (jaTem) return NextResponse.json({ error: "Este e-mail já tem conta no Métricas. Entre com ele para contratar mais itens." }, { status: 400 });
  }

  // Clicou duas vezes / voltou do checkout: reaproveita a venda pendente recente.
  const dezMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pendente } = await s.from("vendas")
    .select("identifier,checkout_url")
    .eq("status", "pendente").eq("plano_chave", plano.chave).ilike("email", escaparLike(email))
    .gte("criado_em", dezMin).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  const reaproveitada = pendente as { identifier: string; checkout_url: string | null } | null;
  if (reaproveitada?.checkout_url) {
    return NextResponse.json({ checkoutUrl: reaproveitada.checkout_url, identifier: reaproveitada.identifier });
  }

  const identifier = `mm_${crypto.randomBytes(9).toString("hex")}`;
  // A senha do cliente fica cifrada até o pagamento ser confirmado; sem chave de
  // cifra configurada não dá para guardar a senha do plano principal com segurança.
  const segredo = await segredoCheckout(s);
  if (plano.base && !segredo && ehProducao) {
    return NextResponse.json({ error: "Checkout indisponível no momento. Fale com o suporte." }, { status: 503 });
  }

  const { error: erroIns } = await s.from("vendas").insert({
    identifier,
    plano_chave: plano.chave,
    plano_nome: plano.nome,
    nome, empresa, email, telefone, documento,
    valor: plano.primeiraCobranca ?? plano.preco,
    modo: "assinatura",
    status: "pendente",
    senha_cifrada: plano.base && segredo && senha ? cifrar(senha, segredo) : null,
  });
  if (erroIns) return NextResponse.json({ error: "Não consegui registrar a compra. Tente de novo." }, { status: 500 });

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const obrigado = `${origin}/obrigado?venda=${identifier}`;

  // 1ª opção: o link do produto cadastrado no Admin, com os dados já na URL.
  // É o caminho preferido porque o produto na Wiven já vem configurado como
  // assinatura mensal (com a promoção da 1ª cobrança e os itens adicionais).
  if (plano.link) {
    const u = new URL(plano.link);
    u.searchParams.set("name", nome);
    u.searchParams.set("email", email);
    u.searchParams.set("phone", telefone);
    u.searchParams.set("document", documento);
    u.searchParams.set("external_id", identifier);
    const link = u.toString();
    await s.from("vendas").update({ checkout_url: link, origem: "link", atualizado_em: new Date().toISOString() }).eq("identifier", identifier);
    return NextResponse.json({ checkoutUrl: link, identifier });
  }

  // 2ª opção: criar um checkout pela API. Atenção: essa rota monta uma oferta
  // avulsa, sem os campos de recorrência, então serve para cobrança única ou
  // enquanto o produto não tem link cadastrado.
  const cred = await credenciais(s);
  if (cred) {
    const r = await criarCheckout(cred, {
      identifier,
      planoChave: plano.chave,
      planoNome: plano.nome,
      preco: plano.primeiraCobranca ?? plano.preco,
      assinatura: true,
      thankYouPage: obrigado,
      foto: plano.imagem,
      cliente: { nome, email, telefone, documento },
    });
    if (r.ok && r.dados?.checkoutUrl) {
      await s.from("vendas").update({ checkout_url: r.dados.checkoutUrl, origem: "api", atualizado_em: new Date().toISOString() }).eq("identifier", identifier);
      return NextResponse.json({ checkoutUrl: r.dados.checkoutUrl, identifier });
    }
    console.warn("[checkout] não consegui criar o checkout pela API da Wiven:", r.ok ? "resposta sem checkoutUrl" : r.erro);
  }

  // Fora de produção, dá para seguir o fluxo sem gateway nenhum (venda simulada).
  if (!ehProducao) {
    await s.from("vendas").update({ checkout_url: obrigado, origem: "simulado", atualizado_em: new Date().toISOString() }).eq("identifier", identifier);
    return NextResponse.json({ checkoutUrl: `${obrigado}&simulado=1`, identifier, simulado: true });
  }

  await s.from("vendas").update({ status: "falhou", erro: "Sem link de pagamento cadastrado e sem credenciais da Wiven.", alerta: true }).eq("identifier", identifier);
  return NextResponse.json({ error: "Pagamento indisponível no momento. Fale com o suporte." }, { status: 503 });
}
