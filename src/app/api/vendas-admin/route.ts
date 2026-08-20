// Vendas do Métricas para a tela do Admin (aba Vendas).
// Só super admin lê. As vendas nascem em /api/checkout e mudam de status pelo
// webhook da Wiven (/api/webhooks/wiven).
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";
import { liberarVenda, svc, type Venda } from "@/lib/vendas";

export const runtime = "nodejs";
export const maxDuration = 30;

async function ehSuper(req: NextRequest, s: SupabaseClient): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await s.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  return !!email && SUPERS.includes(email);
}

type Linha = {
  id: string; identifier: string; criado_em: string; pago_em: string | null;
  nome: string | null; empresa: string | null; email: string; telefone: string | null;
  plano_chave: string; plano_nome: string | null; valor: number | string;
  status: string; origem: string | null; alerta: boolean; erro: string | null;
  empresa_id: string | null; user_id: string | null; wiven_transaction_id: string | null;
};

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const { data, error } = await s.from("vendas")
    .select("id,identifier,criado_em,pago_em,nome,empresa,email,telefone,plano_chave,plano_nome,valor,status,origem,alerta,erro,empresa_id,user_id,wiven_transaction_id")
    .order("criado_em", { ascending: false }).limit(500);
  // A tabela pode ainda não existir (migration não rodada): responde vazio em vez de quebrar a tela.
  if (error) return NextResponse.json({ vendas: [], totais: vazio(), aviso: "Rode a migration migrations/supabase-vendas-checkout.sql." });

  const vendas = ((data as Linha[] | null) ?? []).map((v) => ({ ...v, valor: Number(v.valor || 0) }));
  const pagas = vendas.filter((v) => v.status === "pago");
  const totais = {
    recebido: pagas.reduce((acc, v) => acc + v.valor, 0),
    vendas: pagas.length,
    pendentes: vendas.filter((v) => v.status === "pendente").length,
    reembolsos: vendas.filter((v) => v.status === "reembolsado").length,
    chargebacks: vendas.filter((v) => v.status === "chargeback").length,
    clientes: new Set(pagas.map((v) => (v.email || "").toLowerCase())).size,
    alertas: vendas.filter((v) => v.alerta).length,
  };
  return NextResponse.json({ vendas, totais });
}

function vazio() {
  return { recebido: 0, vendas: 0, pendentes: 0, reembolsos: 0, chargebacks: 0, clientes: 0, alertas: 0 };
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_KEY." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const { action, id } = (await req.json()) as { action?: string; id?: string };
  if (!id) return NextResponse.json({ error: "Informe a venda." }, { status: 400 });

  // Marca como resolvido o alerta de uma venda (reembolso já tratado, etc.).
  if (action === "resolver") {
    await s.from("vendas").update({ alerta: false, atualizado_em: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  // Tenta de novo criar o acesso de uma venda paga que falhou na liberação.
  if (action === "liberar") {
    const { data } = await s.from("vendas").select("*").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
    const venda = data as Venda;
    if (venda.status !== "pago") return NextResponse.json({ error: "Só dá para liberar venda paga." }, { status: 400 });
    const r = await liberarVenda(s, venda);
    await s.from("vendas").update({
      erro: r.ok ? null : (r.erro || "Não consegui liberar o acesso."),
      alerta: !r.ok,
      ...(r.empresaId ? { empresa_id: r.empresaId } : {}),
      ...(r.userId ? { user_id: r.userId } : {}),
      atualizado_em: new Date().toISOString(),
    }).eq("id", id);
    if (!r.ok) return NextResponse.json({ error: r.erro || "Não consegui liberar o acesso." }, { status: 400 });
    return NextResponse.json({ ok: true, precisaDefinirSenha: !!r.precisaDefinirSenha });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
