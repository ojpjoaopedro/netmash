import { Lancamento } from "./db";
import { Metrica, valorMes } from "./indicadores";
import { mesDe, diasAte, ultimosMeses, brl } from "./format";
import { saldoCaixa } from "./calc";

export type Insight = { tone: "good" | "warn" | "bad" | "info"; icon: string; titulo: string; texto: string };

/** Gera insights automáticos ("Pulso do dia") a partir dos dados. */
export function gerarInsights(metrs: Metrica[], lancs: Lancamento[], saldoInicial: number): Insight[] {
  const out: Insight[] = [];
  const [mesAtual, mesAnt] = ultimosMeses(2).reverse(); // [atual, anterior]

  // 1) Faturamento mês vs anterior
  const fatAtual = lancs.filter((l) => l.tipo === "receita" && mesDe(l.data_competencia) === mesAtual).reduce((a, l) => a + l.valor, 0);
  const fatAnt = lancs.filter((l) => l.tipo === "receita" && mesDe(l.data_competencia) === mesAnt).reduce((a, l) => a + l.valor, 0);
  if (fatAnt > 0) {
    const d = ((fatAtual - fatAnt) / fatAnt) * 100;
    out.push({
      tone: d >= 0 ? "good" : "warn", icon: d >= 0 ? "TrendingUp" : "TrendingDown",
      titulo: "Faturamento do mês",
      texto: `${brl(fatAtual)} — ${d >= 0 ? "↑" : "↓"} ${Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs mês passado.`,
    });
  }

  // 2) Contas vencidas
  const vencidas = lancs.filter((l) => !l.pago && (diasAte(l.vencimento) ?? 1) < 0);
  if (vencidas.length) {
    out.push({
      tone: "bad", icon: "AlertTriangle", titulo: "Contas vencidas",
      texto: `${vencidas.length} conta(s) vencida(s), somando ${brl(vencidas.reduce((a, l) => a + l.valor, 0))}. Regularize para evitar juros.`,
    });
  }

  // 3) A vencer nos próximos 7 dias
  const proximas = lancs.filter((l) => { const d = diasAte(l.vencimento); return !l.pago && d !== null && d >= 0 && d <= 7; });
  if (proximas.length) {
    out.push({
      tone: "warn", icon: "CalendarClock", titulo: "Vencendo esta semana",
      texto: `${proximas.length} conta(s) vencem em até 7 dias (${brl(proximas.reduce((a, l) => a + l.valor, 0))}).`,
    });
  }

  // 4) Saldo de caixa
  const saldo = saldoCaixa(lancs, saldoInicial);
  out.push({
    tone: saldo >= 0 ? "good" : "bad", icon: "Wallet", titulo: "Saldo em caixa",
    texto: saldo >= 0 ? `${brl(saldo)} disponível agora.` : `Negativo em ${brl(Math.abs(saldo))}. Atenção ao fluxo!`,
  });

  // 5) Margem vs meta
  const margem = valorMes(metrs, "margem", mesAtual)?.value;
  if (typeof margem === "number") {
    out.push({
      tone: margem >= 35 ? "good" : margem >= 20 ? "warn" : "bad", icon: "Percent", titulo: "Margem de lucro",
      texto: `${margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% no mês ${margem >= 35 ? "— acima da meta (35%)." : "— meta é 35%."}`,
    });
  }

  return out.slice(0, 4);
}
