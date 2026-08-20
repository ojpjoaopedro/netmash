// Status de uma venda, consultado pela página /obrigado enquanto o cliente
// espera a confirmação do pagamento (PIX e boleto não são instantâneos).
// O "identifier" é aleatório e só quem comprou tem, por isso serve de senha.
import { NextRequest, NextResponse } from "next/server";
import { liberarVenda, svc, type Venda } from "@/lib/vendas";

export const runtime = "nodejs";

const ehProducao = process.env.NODE_ENV === "production";

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco." }, { status: 500 });
  const id = (new URL(req.url).searchParams.get("venda") || "").trim();
  if (!id) return NextResponse.json({ error: "Informe a venda." }, { status: 400 });

  const { data } = await s.from("vendas").select("identifier,status,email,plano_nome,empresa_id,user_id").eq("identifier", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  const v = data as { status: string; email: string; plano_nome: string | null; empresa_id: string | null; user_id: string | null };
  return NextResponse.json({
    status: v.status,
    email: v.email,
    plano: v.plano_nome,
    contaCriada: !!v.user_id,
    podeSimular: !ehProducao,
  });
}

/**
 * Confirma a venda à mão. Existe só para desenvolvimento (sem gateway ligado):
 * em produção a confirmação vem sempre pelo webhook da Wiven.
 */
export async function POST(req: NextRequest) {
  if (ehProducao) return NextResponse.json({ error: "Indisponível." }, { status: 404 });
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave do banco." }, { status: 500 });

  const { venda: id } = (await req.json()) as { venda?: string };
  const { data } = await s.from("vendas").select("*").eq("identifier", (id || "").trim()).maybeSingle();
  if (!data) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });

  const venda = data as Venda;
  const r = await liberarVenda(s, venda);
  await s.from("vendas").update({
    status: r.ok ? "pago" : "falhou",
    pago_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    erro: r.erro || null,
    alerta: !r.ok,
  }).eq("id", venda.id);
  await s.from("vendas_eventos").insert({ venda_id: venda.id, evento: "SIMULADO", transacao: `sim_${venda.identifier}`, payload: { origem: "simulador de desenvolvimento" } });

  if (!r.ok) return NextResponse.json({ error: r.erro || "Não consegui liberar o acesso." }, { status: 400 });
  return NextResponse.json({ ok: true, contaCriada: !!r.criouConta, precisaDefinirSenha: !!r.precisaDefinirSenha });
}
