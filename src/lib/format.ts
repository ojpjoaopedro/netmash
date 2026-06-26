// Helpers de formatação e datas (pt-BR)

export function brl(v: number): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Versão compacta para gráficos/eixos: R$ 12,5 mil / R$ 1,2 mi */
export function brlCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (a >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(v);
}

export function pct(v: number): string {
  return `${(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-06" do mês de uma data ISO */
export function mesDe(iso: string): string {
  return (iso || "").slice(0, 7);
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-06" -> "jun/26" */
export function rotuloMes(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}

/** data ISO -> "25/06/2026" */
export function dataBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Lista de meses "YYYY-MM" entre duas datas (inclusive). Aceita "YYYY-MM" ou ISO. */
export function mesesEntre(de: string, ate: string): string[] {
  const a = (de || "").slice(0, 7);
  const b = (ate || "").slice(0, 7);
  if (!a || !b) return [];
  let [y, m] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  if (y > by || (y === by && m > bm)) return [a]; // invertido → só o mês inicial
  const out: string[] = [];
  while ((y < by || (y === by && m <= bm)) && out.length < 120) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** Lista dos últimos N meses como ["2026-01", ...] terminando no mês atual */
export function ultimosMeses(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** dias entre hoje e uma data (negativo = venceu há X dias) */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00");
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - h.getTime()) / 86400000);
}

export function uid(): string {
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
