import { Lancamento, Funcionario } from "./db";
import { mesDe, ultimosMeses } from "./format";

/** Saldo atual em caixa = saldo inicial + recebidos - pagos (tudo que está "pago"). */
export function saldoCaixa(lancs: Lancamento[], saldoInicial: number): number {
  let s = saldoInicial;
  for (const l of lancs) {
    if (!l.pago) continue;
    s += l.tipo === "receita" ? l.valor : -l.valor;
  }
  return s;
}

/** Soma por tipo dentro de uma lista de meses (por competência). */
function somaPeriodo(lancs: Lancamento[], meses: string[], tipo: "receita" | "despesa"): number {
  const set = new Set(meses);
  return lancs
    .filter((l) => l.tipo === tipo && set.has(mesDe(l.data_competencia)))
    .reduce((a, l) => a + l.valor, 0);
}

export type Resumo = {
  faturamento: number;
  despesas: number;
  lucro: number;
  margem: number; // %
  aReceber: number;
  aPagar: number;
  saldo: number;
};

export function resumo(lancs: Lancamento[], meses: string[], saldoInicial: number): Resumo {
  const faturamento = somaPeriodo(lancs, meses, "receita");
  const despesas = somaPeriodo(lancs, meses, "despesa");
  const lucro = faturamento - despesas;
  const aReceber = lancs.filter((l) => l.tipo === "receita" && !l.pago).reduce((a, l) => a + l.valor, 0);
  const aPagar = lancs.filter((l) => l.tipo === "despesa" && !l.pago).reduce((a, l) => a + l.valor, 0);
  return {
    faturamento, despesas, lucro,
    margem: faturamento ? (lucro / faturamento) * 100 : 0,
    aReceber, aPagar,
    saldo: saldoCaixa(lancs, saldoInicial),
  };
}

export type PontoFluxo = { mes: string; entradas: number; saidas: number; saldo: number };

/** Série mensal de entradas/saídas/saldo acumulado (por competência). */
export function serieFluxo(lancs: Lancamento[], n: number, saldoInicial: number): PontoFluxo[] {
  const meses = ultimosMeses(n);
  // saldo acumulado começa do saldo anterior ao período
  const antes = new Set(ultimosMeses(120).filter((m) => !meses.includes(m)));
  let acc = saldoInicial;
  for (const l of lancs) {
    if (antes.has(mesDe(l.data_competencia))) acc += l.tipo === "receita" ? l.valor : -l.valor;
  }
  return meses.map((mes) => {
    const entradas = lancs.filter((l) => l.tipo === "receita" && mesDe(l.data_competencia) === mes).reduce((a, l) => a + l.valor, 0);
    const saidas = lancs.filter((l) => l.tipo === "despesa" && mesDe(l.data_competencia) === mes).reduce((a, l) => a + l.valor, 0);
    acc += entradas - saidas;
    return { mes, entradas, saidas, saldo: acc };
  });
}

export type FatiaCategoria = { categoria: string; valor: number };

/** Despesas agrupadas por categoria no período. */
export function despesasPorCategoria(lancs: Lancamento[], meses: string[]): FatiaCategoria[] {
  const set = new Set(meses);
  const map = new Map<string, number>();
  for (const l of lancs) {
    if (l.tipo !== "despesa" || !set.has(mesDe(l.data_competencia))) continue;
    const c = l.categoria || "Outras despesas";
    map.set(c, (map.get(c) || 0) + l.valor);
  }
  return [...map.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
}

export type LinhaDRE = { rotulo: string; valor: number; tipo: "receita" | "despesa" | "resultado" };

/** DRE simplificada do período. */
export function dre(lancs: Lancamento[], meses: string[]): { linhas: LinhaDRE[]; lucro: number; margem: number } {
  const set = new Set(meses);
  const receita = lancs.filter((l) => l.tipo === "receita" && set.has(mesDe(l.data_competencia))).reduce((a, l) => a + l.valor, 0);
  const cats = despesasPorCategoria(lancs, meses);
  const totalDesp = cats.reduce((a, c) => a + c.valor, 0);
  const lucro = receita - totalDesp;
  const linhas: LinhaDRE[] = [
    { rotulo: "Receita bruta", valor: receita, tipo: "receita" },
    ...cats.map((c) => ({ rotulo: `(–) ${c.categoria}`, valor: -c.valor, tipo: "despesa" as const })),
    { rotulo: "Resultado líquido", valor: lucro, tipo: "resultado" },
  ];
  return { linhas, lucro, margem: receita ? (lucro / receita) * 100 : 0 };
}

/** Custo mensal de folha (salário + benefícios dos ativos). */
export function custoFolha(funcs: Funcionario[]): { total: number; salarios: number; beneficios: number; ativos: number } {
  const ativos = funcs.filter((f) => f.ativo);
  const salarios = ativos.reduce((a, f) => a + (f.salario || 0), 0);
  const beneficios = ativos.reduce((a, f) => a + (f.beneficios || 0), 0);
  return { total: salarios + beneficios, salarios, beneficios, ativos: ativos.length };
}
