// Totais da Folha de pagamento por mês, para puxar na Estrutura de Custos.
// Lê o mesmo snapshot mensal da tela de Folha (me_folha_mensal:<empresa>:<ano-mes>) e
// recalcula com as regras 2026, para cada mês sincronizar com o mesmo mês/ano da Folha.
import { getFuncionarios } from "@/lib/db";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const INSS_TETO = 8475.55;
const INSS_FAIXAS: [number, number][] = [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
function calcINSS(bruto: number): number {
  let ant = 0, inss = 0;
  for (const [teto, aliq] of INSS_FAIXAS) { if (bruto > ant) { inss += (Math.min(bruto, teto) - ant) * aliq; ant = teto; } else break; }
  return round2(inss);
}
const IRRF_FAIXAS: [number, number, number][] = [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]];
// INSS do pró-labore (sócio): 11% sobre o pró-labore, limitado ao teto.
function calcINSSprolabore(base: number): number { return round2(Math.min(base, INSS_TETO) * 0.11); }
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

type VarsMes = { base?: number; comissao?: number; horaExtra?: number; gratificacao?: number; sindicato?: number; planoSaude?: number; adiantamento?: number; extra?: Record<string, number> };
type ColsFolha = { prov: { id: string }[]; desc: { id: string }[] };
type Pessoa = { id: string; cargo: string | null; ativo: boolean };

// pessoas com login (superadmin + admins) também entram na folha; o tipo (Funcionário/Sócio) fica em "area"
function lerLogin(): Pessoa[] {
  const s = ler<{ sup?: { id?: string; nome?: string; area?: string }; admins?: { id?: string; nome?: string; area?: string }[] }>("me_diretores");
  if (!s || !s.sup) return [];
  const lista = [s.sup, ...(Array.isArray(s.admins) ? s.admins : [])];
  return lista.filter((d) => (d?.nome || "").trim()).map((d) => ({ id: d.id || "super", cargo: d.area || "Funcionário", ativo: true }));
}

export type TotaisFolha = { liquido: number[]; fgts: number[]; provisao: number[]; rescisao: number[]; comissao: number[]; proLabore: number[]; darf: number[] };

/** Totais mês a mês da Folha (12 posições). Cada mês vem do snapshot daquele mês/ano da Folha mensal. */
export async function folhaTotais(empresaId: string | null | undefined, ano: number): Promise<TotaisFolha> {
  const eid = empresaId || "default";
  const dbFuncs: Pessoa[] = (await getFuncionarios()).map((f) => ({ id: f.id, cargo: f.cargo, ativo: f.ativo }));
  const idsDb = new Set(dbFuncs.map((f) => f.id));
  const pessoas = [...dbFuncs, ...lerLogin().filter((l) => !idsDb.has(l.id))].filter((p) => p.ativo);
  const cols = ler<ColsFolha>(`me_folha_cols:${eid}`) || { prov: [], desc: [] };
  const cfg = ler<{ fgtsPct?: number }>(`me_folha_config:${eid}`) || {};
  const fgtsPct = cfg.fgtsPct ?? 8;
  const ehSocio = (p: Pessoa) => (p.cargo || "") === "Sócio";

  const z = () => new Array(12).fill(0);
  const out: TotaisFolha = { liquido: z(), fgts: z(), provisao: z(), rescisao: z(), comissao: z(), proLabore: z(), darf: z() };

  for (let m = 0; m < 12; m++) {
    const ym = `${ano}-${String(m + 1).padStart(2, "0")}`;
    const mensal = ler<Record<string, VarsMes>>(`me_folha_mensal:${eid}:${ym}`) || {};
    for (const p of pessoas) {
      const v = mensal[p.id] || {};
      const base = v.base || 0;
      if (ehSocio(p)) { out.proLabore[m] += base; out.darf[m] += calcINSSprolabore(base); continue; }   // pró-labore: INSS 11% entra no DARF
      const extra = v.extra || {};
      const provExtra = cols.prov.reduce((s, c) => s + (extra[c.id] || 0), 0);
      const descExtra = cols.desc.reduce((s, c) => s + (extra[c.id] || 0), 0);
      const proventos = round2(base + (v.comissao || 0) + (v.horaExtra || 0) + (v.gratificacao || 0) + provExtra);
      const inss = calcINSS(proventos);
      const irrf = calcIRRF(proventos, inss);
      const descManual = (v.sindicato || 0) + (v.planoSaude || 0) + (v.adiantamento || 0) + descExtra;
      const liquido = round2(proventos - inss - irrf - descManual);
      const fgts = round2(base * fgtsPct / 100);
      out.liquido[m] += liquido;
      out.comissao[m] += (v.comissao || 0);
      out.fgts[m] += fgts;
      out.provisao[m] += base / 12 + (base + base / 3) / 12;
      out.rescisao[m] += fgts * 0.40;
      out.darf[m] += inss;   // DARF = soma do INSS (o IRRF é recolhido à parte)
    }
    for (const k of Object.keys(out) as (keyof TotaisFolha)[]) out[k][m] = round2(out[k][m]);
  }
  return out;
}

/** Casa o nome de um item de custo com a categoria da Folha. */
export function categoriaDoItem(nome: string): keyof TotaisFolha | null {
  const n = (nome || "").toLowerCase();
  if (n.includes("líquido") || n.includes("liquido")) return "liquido";
  if (n.includes("fgts")) return "fgts";
  if (n.includes("darf")) return "darf";
  if (n.includes("rescis")) return "rescisao";
  if (n.includes("13") || n.includes("féria") || n.includes("feria")) return "provisao";
  if (n.includes("comiss")) return "comissao";
  if (n.includes("labore")) return "proLabore";
  return null;
}
