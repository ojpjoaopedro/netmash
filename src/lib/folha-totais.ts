// Totais da Folha de pagamento por mês, para puxar na Estrutura de Custos.
// Lê os mesmos dados da tela de Folha (localStorage) e recalcula com as regras 2026.
import { getFuncionarios } from "@/lib/db";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const INSS_FAIXAS: [number, number][] = [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
function calcINSS(bruto: number): number {
  let ant = 0, inss = 0;
  for (const [teto, aliq] of INSS_FAIXAS) { if (bruto > ant) { inss += (Math.min(bruto, teto) - ant) * aliq; ant = teto; } else break; }
  return round2(inss);
}
const IRRF_FAIXAS: [number, number, number][] = [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]];
function calcIRRF(bruto: number, inss: number): number {
  const base = bruto - inss;
  let imp = 0;
  for (const [teto, aliq, ded] of IRRF_FAIXAS) if (base <= teto) { imp = Math.max(0, base * aliq - ded); break; }
  if (bruto <= 5000) return 0;
  let red = 0;
  if (bruto <= 7350) red = Math.max(0, 978.62 - 0.133145 * bruto);
  return round2(Math.max(0, imp - red));
}

function ler<T>(key: string): T | null { if (typeof window === "undefined") return null; try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } }
function valNum(x: unknown): number { if (x == null) return 0; if (typeof x === "number") return x; const o = x as { valor?: number }; return o.valor || 0; }

export type TotaisFolha = { liquido: number[]; fgts: number[]; provisao: number[]; rescisao: number[]; comissao: number[]; proLabore: number[] };

/** Totais mês a mês da Folha (12 posições cada). Líquido/FGTS/provisões seguem o Preenchimento geral; comissão vem da Folha mensal. */
export async function folhaTotais(empresaId: string | null | undefined, ano: number): Promise<TotaisFolha> {
  const eid = empresaId || "default";
  const funcs = (await getFuncionarios()).filter((f) => f.ativo);
  const benef = ler<Record<string, { vt?: unknown; va?: unknown; extra?: Record<string, unknown> }>>(`me_folha_beneficios:${eid}`) || {};
  const modos = ler<Record<string, "pct" | "fixo">>(`me_folha_benef_modos:${eid}`) || {};
  const cfg = ler<{ fgtsPct?: number }>(`me_folha_config:${eid}`) || {};
  const fgtsPct = cfg.fgtsPct ?? 8;
  const modoDe = (k: string) => modos[k] || "fixo";
  const efet = (k: "vt" | "va", f: { id: string; salario?: number }) => { const num = valNum(benef[f.id]?.[k]); if (!num) return 0; return modoDe(k) === "pct" ? round2((f.salario || 0) * num / 100) : round2(num); };

  // Preenchimento geral (mesmo em todo mês)
  let gLiq = 0, gFgts = 0, gProv = 0, gResc = 0;
  for (const f of funcs) {
    const bruto = f.salario || 0;
    const inss = calcINSS(bruto);
    const irrf = calcIRRF(bruto, inss);
    const vt = efet("vt", f);
    const totalDesc = round2(vt + inss + irrf);
    gLiq += round2(bruto - totalDesc);
    gProv += round2(bruto / 12 + (bruto + bruto / 3) / 12);
    const fgts = round2(bruto * fgtsPct / 100);
    gFgts += fgts;
    gResc += round2(fgts * 0.40);
  }

  const z = () => new Array(12).fill(0);
  const out: TotaisFolha = { liquido: z(), fgts: z(), provisao: z(), rescisao: z(), comissao: z(), proLabore: z() };
  for (let m = 0; m < 12; m++) {
    const ym = `${ano}-${String(m + 1).padStart(2, "0")}`;
    const mensal = ler<Record<string, { comissao?: number }>>(`me_folha_mensal:${eid}:${ym}`) || {};
    let comissao = 0;
    for (const fid in mensal) comissao += mensal[fid]?.comissao || 0;
    out.comissao[m] = round2(comissao);
    out.liquido[m] = round2(gLiq);
    out.fgts[m] = round2(gFgts);
    out.provisao[m] = round2(gProv);
    out.rescisao[m] = round2(gResc);
  }
  return out;
}

/** Casa o nome de um item de custo com a categoria da Folha. */
export function categoriaDoItem(nome: string): keyof TotaisFolha | null {
  const n = (nome || "").toLowerCase();
  if (n.includes("líquido") || n.includes("liquido")) return "liquido";
  if (n.includes("fgts")) return "fgts";
  if (n.includes("13") || n.includes("féria") || n.includes("feria")) return "provisao";
  if (n.includes("rescis")) return "rescisao";
  if (n.includes("comiss")) return "comissao";
  if (n.includes("labore") || n.includes("pró-labore") || n.includes("pro-labore")) return "proLabore";
  return null;
}
