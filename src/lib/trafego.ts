/**
 * Núcleo do módulo de Tráfego Pago (admin): tipos, contas de semana e agregações.
 * Espelha o modelo do Hub da Dynamis: dados por (mês, semana, campanha); a semana
 * é um bloco fixo de 7 dias (S1 01-07, S2 08-14, ... S5 29-fim). O mês fechado é a
 * soma das semanas. Puro (sem UI, sem rede), usado pela API e pelos componentes.
 */
export type Resultado = {
  id?: string;
  mes: string;              // 'YYYY-MM'
  semana: number;           // 1..5
  campanha: string;
  investido: number;
  impressoes: number;
  cliques: number;
  leads: number;            // leads gerados
  leads_plataforma: number;
  leads_planilha: number;
  origem?: string;          // 'manual' | 'meta'
  posicao?: number;
};

export type Agg = { investido: number; impressoes: number; cliques: number; leads: number; leads_plataforma: number; leads_planilha: number };

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const mesLabel = (mes: string) => { const [y, m] = mes.split("-").map(Number); return `${MESES[m - 1]}/${y}`; };
export const mesCurto = (mes: string) => { const [y, m] = mes.split("-").map(Number); return `${MESES[m - 1]}/${String(y).slice(2)}`; };

// ── contas de semana (blocos de 7 dias) ──────────────────────────────────────
export function semanasNoMes(mes: string): number {
  const [y, m] = mes.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Math.ceil(last / 7);   // 30/31 dias -> 5; 28 -> 4
}
export function listaSemanas(mes: string): number[] {
  return Array.from({ length: semanasNoMes(mes) }, (_, i) => i + 1);
}
export function weekRange(mes: string, semana: number): { since: string; until: string } {
  const [y, m] = mes.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const ini = Math.min((semana - 1) * 7 + 1, last);
  const fim = Math.min(ini + 6, last);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { since: `${mes}-${pad(ini)}`, until: `${mes}-${pad(fim)}` };
}

// ── agregação ────────────────────────────────────────────────────────────────
export const zeroAgg = (): Agg => ({ investido: 0, impressoes: 0, cliques: 0, leads: 0, leads_plataforma: 0, leads_planilha: 0 });
export function somar(rows: Resultado[] | Agg[]): Agg {
  const a = zeroAgg();
  for (const r of rows) {
    a.investido += Number(r.investido) || 0;
    a.impressoes += Number(r.impressoes) || 0;
    a.cliques += Number(r.cliques) || 0;
    a.leads += Number(r.leads) || 0;
    a.leads_plataforma += Number(r.leads_plataforma) || 0;
    a.leads_planilha += Number(r.leads_planilha) || 0;
  }
  return a;
}

// métricas derivadas (mesmas fórmulas do hub)
export const cpm = (a: Agg) => (a.impressoes > 0 ? (a.investido / a.impressoes) * 1000 : null);
export const cpc = (a: Agg) => (a.cliques > 0 ? a.investido / a.cliques : null);
export const ctr = (a: Agg) => (a.impressoes > 0 ? (a.cliques / a.impressoes) * 100 : null);
export const cpl = (a: Agg) => (a.leads > 0 ? a.investido / a.leads : null);
export const conv = (a: Agg) => (a.cliques > 0 ? (a.leads / a.cliques) * 100 : null);

export const pctVar = (atual: number, ant: number): number | null => (ant > 0 ? ((atual - ant) / ant) * 100 : null);

export type MesAgg = Agg & {
  mes: string; label: string; campanhas: number;
  cpl: number | null; cpc: number | null; ctr: number | null; cpm: number | null; conv: number | null;
  varInvestido: number | null; varLeads: number | null; varCpl: number | null;
};

/** Agrupa todas as linhas por mês (soma semanas e campanhas), com variações vs mês anterior. */
export function porMes(rows: Resultado[]): MesAgg[] {
  const map = new Map<string, { agg: Agg; camps: Set<string> }>();
  for (const r of rows) {
    let cur = map.get(r.mes);
    if (!cur) { cur = { agg: zeroAgg(), camps: new Set() }; map.set(r.mes, cur); }
    cur.agg.investido += Number(r.investido) || 0;
    cur.agg.impressoes += Number(r.impressoes) || 0;
    cur.agg.cliques += Number(r.cliques) || 0;
    cur.agg.leads += Number(r.leads) || 0;
    cur.agg.leads_plataforma += Number(r.leads_plataforma) || 0;
    cur.agg.leads_planilha += Number(r.leads_planilha) || 0;
    if (r.campanha) cur.camps.add(r.campanha.trim().toLowerCase());
  }
  const meses = [...map.keys()].sort();
  const out: MesAgg[] = [];
  meses.forEach((mes, i) => {
    const { agg, camps } = map.get(mes)!;
    const ant = i > 0 ? out[i - 1] : null;
    const _cpl = cpl(agg);
    out.push({
      ...agg, mes, label: mesCurto(mes), campanhas: camps.size,
      cpl: _cpl, cpc: cpc(agg), ctr: ctr(agg), cpm: cpm(agg), conv: conv(agg),
      varInvestido: ant ? pctVar(agg.investido, ant.investido) : null,
      varLeads: ant ? pctVar(agg.leads, ant.leads) : null,
      varCpl: ant && ant.cpl != null && _cpl != null ? pctVar(_cpl, ant.cpl) : null,
    });
  });
  return out;
}

// ── formatadores ─────────────────────────────────────────────────────────────
export const brl = (n: number | null | undefined, dec = 2) =>
  n == null ? "—" : "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const num = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
export const pct = (n: number | null | undefined, dec = 1) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%");

/** Extrai leads das actions da Meta, por prioridade (evita contar em dobro). */
export const LEAD_ACTION_PRIORITY = [
  "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "leadgen_grouped",
  "onsite_web_lead", "onsite_conversion.lead", "lead", "complete_registration",
];
export function extrairLeads(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  for (const type of LEAD_ACTION_PRIORITY) {
    const f = actions.find((a) => a.action_type === type);
    if (f) return Math.round(Number(f.value) || 0);
  }
  return 0;
}
