import { addLancamentosLote, Lancamento, Tipo } from "@/lib/db";
import { setIndicador } from "@/lib/indicadores";

const RECEITAS = [
  { cat: "Comercial (B2C)", base: 36000 },
  { cat: "Escolas (B2B)", base: 12000 },
  { cat: "Renovações", base: 2800 },
  { cat: "Vendas de produtos", base: 1500 },
];
const DESPESAS = [
  { cat: "Folha de salários", base: 15000 },
  { cat: "Custos fixos", base: 5000 },
  { cat: "Publicidade", base: 4000 },
  { cat: "Comissão", base: 3000 },
  { cat: "Impostos", base: 2500 },
  { cat: "Taxas e antecipações", base: 2000 },
  { cat: "Outros", base: 3000 },
];

const jitter = (n: number) => Math.round(n * (0.9 + Math.random() * 0.2));

/** Popula a empresa logada com ~6-9 meses de lançamentos + indicadores de exemplo. */
export async function seedExemplo(): Promise<void> {
  const now = new Date();
  const ano = now.getFullYear();
  const mesAtual = now.getMonth(); // 0-based
  const nMeses = Math.max(6, mesAtual + 1);

  const lotes: Omit<Lancamento, "id" | "empresa_id">[] = [];
  for (let m = 0; m < nMeses; m++) {
    const ym = `${ano}-${String(m + 1).padStart(2, "0")}`;
    const dia = `${ym}-15`;
    const cresc = 0.8 + m * 0.06;
    for (const r of RECEITAS) {
      lotes.push({ tipo: "receita" as Tipo, descricao: r.cat, categoria: r.cat, valor: jitter(r.base * cresc), data_competencia: dia, vencimento: dia, pago: true, data_pagamento: dia, forma: "pix", contato: ["Cliente A", "Cliente B", "Cliente C", "Escola X"][Math.floor(Math.random() * 4)], origem: "exemplo" });
    }
    for (const d of DESPESAS) {
      const pago = m < mesAtual;
      lotes.push({ tipo: "despesa" as Tipo, descricao: d.cat, categoria: d.cat, valor: jitter(d.base * (0.9 + m * 0.03)), data_competencia: dia, vencimento: `${ym}-20`, pago, data_pagamento: pago ? dia : null, forma: "boleto", contato: null, origem: "exemplo" });
    }
  }
  await addLancamentosLote(lotes);

  // Indicadores (Comercial, Cliente, Marketing) — pra popular Gestão à Vista, Satisfação e Tráfego
  const tarefas: Promise<void>[] = [];
  for (let m = 0; m < nMeses; m++) {
    const ym = `${ano}-${String(m + 1).padStart(2, "0")}`;
    const f = 1 + m * 0.05;
    const set = (k: string, v: number, meta: number) => tarefas.push(setIndicador(k, ym, v, meta));
    set("vendas", jitter(18 * f), 20);
    set("oportunidades", jitter(480 * f), 500);
    set("reunioes", jitter(60 * f), 60);
    set("novos_clientes", jitter(20 * f), 20);
    set("conversao", 3.2 + m * 0.15, 4);
    set("ticket_medio", jitter(2000 * f), 2000);
    set("clientes_ativos", 300 + m * 130, 2200);
    set("nps", 70 + m, 80);
    set("churn", 5 - m * 0.2, 3);
    set("indicacoes", jitter(8 * f), 10);
    set("leads", jitter(500 * f), 600);
    set("investimento", jitter(5000 * f), 5000);
    set("cac", 260 - m * 5, 300);
    set("roi", 110 + m * 8, 300);
    set("trafego", jitter(9000 * f), 10000);
    set("seguidores", 1200 + m * 420, 2000);
  }
  await Promise.all(tarefas);
}
