import { uid, ultimosMeses, mesDe } from "./format";
import { supabase, supabaseReady } from "./supabase";
import { getEmpresa, type Lancamento, type Cliente } from "./db";

// ============================================================
// INDICADORES (métricas estratégicas editáveis)
// Modelo igual ao Hub: { metric, período, valor, meta, unidade, categoria }
// Alimenta as telas Dashboard / Finanças / Saúde / Comercial / Marketing.
// MVP: localStorage com seed demo. Depois -> tabela Supabase `indicadores`.
// ============================================================

export type Unidade = "BRL" | "%" | "count" | "score";
export type Categoria = "financeiro" | "cliente" | "comercial" | "marketing";

export type Metrica = {
  id: string;
  key: string;           // identificador estável (ex: "faturamento")
  period: string;        // "YYYY-MM"
  value: number;
  target: number;        // meta do mês
  unidade: Unidade;
  categoria: Categoria;
};

/** Catálogo: define os indicadores de cada área (label, unidade, ícone, cor, agregação). */
export type DefMetrica = {
  key: string; label: string; unidade: Unidade; categoria: Categoria;
  icon: string;            // nome do ícone lucide
  cor: string;             // cor do ícone/anel
  agg: "sum" | "last";     // YTD: soma (BRL/count) ou último (%/score)
  invert?: boolean;        // menor é melhor (ex: churn, CAC)
  metaAno: number;         // meta anual (para % YTD)
};

export const CATALOGO: DefMetrica[] = [
  // ---- FINANCEIRO ----
  { key: "faturamento", label: "Faturamento", unidade: "BRL", categoria: "financeiro", icon: "DollarSign", cor: "#10B981", agg: "sum", metaAno: 700000 },
  { key: "mrr", label: "Receita recorrente (MRR)", unidade: "BRL", categoria: "financeiro", icon: "Activity", cor: "#8b5cf6", agg: "last", metaAno: 30000 },
  { key: "custos", label: "Custos + despesas", unidade: "BRL", categoria: "financeiro", icon: "TrendingDown", cor: "#EF4444", agg: "sum", invert: true, metaAno: 430000 },
  { key: "lucro", label: "Lucro", unidade: "BRL", categoria: "financeiro", icon: "Wallet", cor: "#10B981", agg: "sum", metaAno: 270000 },
  { key: "margem", label: "Margem", unidade: "%", categoria: "financeiro", icon: "Percent", cor: "#1AADE2", agg: "last", metaAno: 35 },
  { key: "ebitda", label: "EBITDA", unidade: "BRL", categoria: "financeiro", icon: "BarChart3", cor: "#F59E0B", agg: "sum", metaAno: 200000 },

  // ---- CLIENTE ----
  { key: "clientes_ativos", label: "Clientes ativos", unidade: "count", categoria: "cliente", icon: "Users", cor: "#8b5cf6", agg: "last", metaAno: 2200 },
  { key: "nps", label: "NPS", unidade: "score", categoria: "cliente", icon: "Smile", cor: "#10B981", agg: "last", metaAno: 80 },
  { key: "churn", label: "Churn", unidade: "%", categoria: "cliente", icon: "UserMinus", cor: "#EF4444", agg: "last", invert: true, metaAno: 3 },
  { key: "cross_sell", label: "Vendas de produtos", unidade: "BRL", categoria: "cliente", icon: "ShoppingCart", cor: "#1AADE2", agg: "sum", metaAno: 24000 },
  { key: "indicacoes", label: "Indicações", unidade: "count", categoria: "cliente", icon: "Share2", cor: "#F59E0B", agg: "sum", metaAno: 120 },

  // ---- COMERCIAL ----
  { key: "novos_clientes", label: "Novos clientes", unidade: "count", categoria: "comercial", icon: "UserPlus", cor: "#1AADE2", agg: "sum", metaAno: 240 },
  { key: "vendas", label: "Vendas (negócios)", unidade: "count", categoria: "comercial", icon: "Users", cor: "#8b5cf6", agg: "sum", metaAno: 240 },
  { key: "conversao", label: "Conversão lead→venda", unidade: "%", categoria: "comercial", icon: "Zap", cor: "#1AADE2", agg: "last", metaAno: 4 },
  { key: "ticket_medio", label: "Ticket médio", unidade: "BRL", categoria: "comercial", icon: "Award", cor: "#F59E0B", agg: "last", metaAno: 2000 },
  { key: "oportunidades", label: "Oportunidades", unidade: "count", categoria: "comercial", icon: "Target", cor: "#EF4444", agg: "sum", metaAno: 6000 },
  { key: "reunioes", label: "Reuniões realizadas", unidade: "count", categoria: "comercial", icon: "Calendar", cor: "#10B981", agg: "sum", metaAno: 600 },

  // ---- MARKETING ----
  { key: "leads", label: "Leads gerados", unidade: "count", categoria: "marketing", icon: "Megaphone", cor: "#ff6b9d", agg: "sum", metaAno: 8000 },
  { key: "investimento", label: "Investimento em mídia", unidade: "BRL", categoria: "marketing", icon: "DollarSign", cor: "#EF4444", agg: "sum", invert: true, metaAno: 60000 },
  { key: "cac", label: "CAC", unidade: "BRL", categoria: "marketing", icon: "TrendingDown", cor: "#F59E0B", agg: "last", invert: true, metaAno: 300 },
  { key: "roi", label: "ROI", unidade: "%", categoria: "marketing", icon: "TrendingUp", cor: "#10B981", agg: "last", metaAno: 300 },
  { key: "trafego", label: "Visitas no site", unidade: "count", categoria: "marketing", icon: "Globe", cor: "#1AADE2", agg: "sum", metaAno: 120000 },
  { key: "seguidores", label: "Novos seguidores", unidade: "count", categoria: "marketing", icon: "Share2", cor: "#8b5cf6", agg: "sum", metaAno: 24000 },
];

export function def(key: string): DefMetrica | undefined {
  return CATALOGO.find((d) => d.key === key);
}

// ---------- DEMO STORE ----------
const KEY = "fin_indicadores";
const SEEDED = "fin_indicadores_seed";

function lsGet(): Metrica[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function lsSet(arr: Metrica[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(arr));
}

/** Valor demo determinístico (sem Math.random — evita mismatch de hidratação). */
function seedValor(d: DefMetrica, monthIdx: number, totalMonths: number): { value: number; target: number } {
  const metaMes = d.unidade === "%" || d.unidade === "score" ? d.metaAno : d.metaAno / 12;
  // curva: cresce ao longo do ano com leve oscilação
  const prog = (monthIdx + 1) / totalMonths;
  const wobble = 0.78 + ((monthIdx * 37) % 45) / 100; // 0.78..1.23
  let value: number;
  if (d.unidade === "%" ) value = Math.round(metaMes * (0.55 + prog * 0.4) * 10) / 10;
  else if (d.unidade === "score") value = Math.round(metaMes * (0.9 + prog * 0.18));
  else value = Math.round(metaMes * wobble * (0.7 + prog * 0.5));
  if (d.invert) value = Math.round(value * 0.85); // fica "melhor" que a meta às vezes
  return { value, target: Math.round(metaMes) };
}

export function seedDemoIndicadores() {
  if (typeof window === "undefined" || localStorage.getItem(SEEDED)) return;
  const meses = ultimosMeses(6);
  const arr: Metrica[] = [];
  for (const d of CATALOGO) {
    meses.forEach((period, i) => {
      const { value, target } = seedValor(d, i, meses.length);
      arr.push({ id: uid(), key: d.key, period, value, target, unidade: d.unidade, categoria: d.categoria });
    });
  }
  lsSet(arr);
  localStorage.setItem(SEEDED, "1");
}

export async function getIndicadores(): Promise<Metrica[]> {
  if (supabaseReady && supabase) {
    const { data } = await supabase.from("indicadores").select("*");
    return (data ?? []).map((r) => ({
      id: r.id as string, key: r.key as string, period: r.period as string,
      value: Number(r.value), target: Number(r.target),
      unidade: r.unidade as Unidade, categoria: r.categoria as Categoria,
    }));
  }
  seedDemoIndicadores();
  return lsGet();
}

export async function setIndicador(key: string, period: string, value: number, target: number): Promise<void> {
  const d = def(key);
  if (!d) return;
  if (supabaseReady && supabase) {
    const emp = await getEmpresa();
    if (!emp) return;
    await supabase.from("indicadores").upsert(
      { empresa_id: emp.id, key, period, value, target, unidade: d.unidade, categoria: d.categoria },
      { onConflict: "empresa_id,key,period" },
    );
    return;
  }
  const arr = lsGet();
  const i = arr.findIndex((m) => m.key === key && m.period === period);
  if (i >= 0) { arr[i] = { ...arr[i], value, target }; }
  else arr.push({ id: uid(), key, period, value, target, unidade: d.unidade, categoria: d.categoria });
  lsSet(arr);
}

// ---------- AGREGAÇÕES ----------
export function valorMes(metrs: Metrica[], key: string, period: string): Metrica | undefined {
  return metrs.find((m) => m.key === key && m.period === period);
}

/** Série mensal do ano corrente para um indicador: [{period, value, target}] */
export function serieMes(metrs: Metrica[], key: string): { period: string; value: number; target: number }[] {
  return metrs.filter((m) => m.key === key)
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .map((m) => ({ period: m.period, value: m.value, target: m.target }));
}

/** YTD: soma (sum) ou último valor (last). Retorna {value, meta(ano), pct}. */
export function ytd(metrs: Metrica[], key: string): { value: number; meta: number; pct: number } {
  const d = def(key);
  if (!d) return { value: 0, meta: 0, pct: 0 };
  const serie = serieMes(metrs, key);
  const value = d.agg === "sum" ? serie.reduce((a, s) => a + s.value, 0) : (serie.at(-1)?.value ?? 0);
  const meta = d.metaAno;
  const pct = meta ? Math.round((value / meta) * 100) : 0;
  return { value, meta, pct };
}

/** Status em relação à meta. invert = menor é melhor (churn, CAC, custos). */
export function statusMeta(pct: number, invert?: boolean): "ok" | "warn" | "bad" {
  if (invert) return pct <= 100 ? "ok" : pct <= 120 ? "warn" : "bad";
  if (pct >= 95) return "ok";
  if (pct >= 60) return "warn";
  return "bad";
}

// ============================================================
// DADOS REAIS: sobrepõe os indicadores financeiros com os valores
// calculados dos lançamentos (faturamento/custos/lucro/margem/ebitda).
// Onde houver lançamentos no mês, o valor real prevalece sobre o seed.
// ============================================================
export function mesclarFinanceiro(metrs: Metrica[], lancs: Lancamento[]): Metrica[] {
  if (!lancs.length) return metrs;
  const porMes = new Map<string, { rec: number; desp: number }>();
  for (const l of lancs) {
    const m = mesDe(l.data_competencia);
    const cur = porMes.get(m) || { rec: 0, desp: 0 };
    if (l.tipo === "receita") cur.rec += l.valor; else cur.desp += l.valor;
    porMes.set(m, cur);
  }
  const reais: Record<string, (v: { rec: number; desp: number }) => number> = {
    faturamento: (v) => v.rec,
    custos: (v) => v.desp,
    lucro: (v) => v.rec - v.desp,
    ebitda: (v) => v.rec - v.desp,
    margem: (v) => (v.rec ? ((v.rec - v.desp) / v.rec) * 100 : 0),
  };
  const out = metrs.map((m) => ({ ...m }));
  for (const [key, fn] of Object.entries(reais)) {
    const d = def(key);
    if (!d) continue;
    for (const [period, v] of porMes) {
      const value = Math.round(fn(v) * 10) / 10;
      const i = out.findIndex((m) => m.key === key && m.period === period);
      if (i >= 0) out[i] = { ...out[i], value };
      else out.push({ id: uid(), key, period, value, target: Math.round(d.metaAno / 12), unidade: d.unidade, categoria: d.categoria });
    }
  }
  return out;
}

// ============================================================
// RETROALIMENTAÇÃO: alimenta Comercial e Cliente a partir dos
// lançamentos (vendas) e do cadastro de clientes.
// ============================================================
function setReal(metrs: Metrica[], key: string, valores: [string, number][]): Metrica[] {
  const d = def(key);
  if (!d) return metrs;
  const out = metrs.map((m) => ({ ...m }));
  for (const [period, value] of valores) {
    const i = out.findIndex((m) => m.key === key && m.period === period);
    if (i >= 0) out[i] = { ...out[i], value };
    else out.push({
      id: uid(), key, period, value,
      target: Math.round(d.unidade === "%" || d.unidade === "score" ? d.metaAno : d.metaAno / 12),
      unidade: d.unidade, categoria: d.categoria,
    });
  }
  return out;
}

/** Sobrepõe indicadores com dados reais: Finanças (lançamentos), Comercial e Cliente. */
export function aplicarReais(metrs: Metrica[], lancs: Lancamento[], clientes: Cliente[]): Metrica[] {
  let out = mesclarFinanceiro(metrs, lancs);

  // Comercial: nº de vendas (receitas) e ticket médio por mês
  const porMes = new Map<string, { count: number; sum: number }>();
  for (const l of lancs) {
    if (l.tipo !== "receita") continue;
    const m = mesDe(l.data_competencia);
    const c = porMes.get(m) || { count: 0, sum: 0 };
    c.count++; c.sum += l.valor; porMes.set(m, c);
  }
  if (porMes.size) {
    out = setReal(out, "vendas", [...porMes].map(([p, v]) => [p, v.count]));
    out = setReal(out, "ticket_medio", [...porMes].map(([p, v]) => [p, v.count ? Math.round(v.sum / v.count) : 0]));
  }

  // Cliente: novos por mês + ativos acumulado
  if (clientes.length) {
    const novosMes = new Map<string, number>();
    for (const cl of clientes) {
      const m = mesDe(cl.criado_em);
      novosMes.set(m, (novosMes.get(m) || 0) + 1);
    }
    out = setReal(out, "novos_clientes", [...novosMes]);
    const ativos: [string, number][] = ultimosMeses(12).map((m) => {
      const fim = m + "-31";
      return [m, clientes.filter((cl) => cl.criado_em.slice(0, 10) <= fim).length];
    });
    out = setReal(out, "clientes_ativos", ativos);
  }

  return out;
}
