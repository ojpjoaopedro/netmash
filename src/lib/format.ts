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

/**
 * Data + hora no fuso de Brasília: "29/06/2026 09:03".
 *
 * O banco guarda em UTC; o toLocaleString com timeZone converte na hora certa,
 * então dá igual em qualquer computador, independente do fuso de quem abre.
 * Sem a parte de hora (data "seca"), volta só a data — não inventamos horário.
 */
export function dataHoraBR(iso: string | null): string {
  if (!iso) return "—";
  if (!iso.includes("T")) return dataBR(iso);
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return dataBR(iso);
  return dt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).replace(",", "");
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

/** Lista de N meses a partir do mês atual (inclusive) para frente. */
export function mesesFrente(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
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

/** Telefone brasileiro: (62) 99479-7664 (celular) ou (62) 9999-9595 (fixo). Formata o que der. */
export function mascararTelefone(v: string): string {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** CPF: 746.194.381-20. Formata mesmo se ainda estiver incompleto. */
export function mascararCPF(v: string): string {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  let out = d.slice(0, 3);
  if (d.length > 3) out += "." + d.slice(3, 6);
  if (d.length > 6) out += "." + d.slice(6, 9);
  if (d.length > 9) out += "-" + d.slice(9, 11);
  return out;
}

/** Valida CPF pelos dígitos verificadores (rejeita 000..., 111..., etc). */
export function cpfValido(v: string): boolean {
  const c = (v || "").replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== +c[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; return d2 === +c[10];
}

/** E-mail simples (nome@dominio.xx). */
export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

/** ISO (2026-06-25) -> "25/06/2026" para exibir. */
export function isoParaBR(iso: string): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Vai formatando dd/mm/aaaa conforme digita. */
export function mascararDataBR(v: string): string {
  const d = (v || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "25/06/2026" -> ISO (2026-06-25). Retorna "" se estiver incompleta/inválida. */
export function brParaISO(v: string): string {
  const m = (v || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const dia = +dd, mes = +mm;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return "";
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Valida uma data dd/mm/aaaa. Retorna o ISO e uma mensagem de erro (vazia se ok).
 * Recusa dia/mês inexistentes (ex: 31/02) e datas no futuro.
 */
export function validarDataBR(v: string): { iso: string; erro: string } {
  const s = (v || "").trim();
  if (!s) return { iso: "", erro: "" };
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return { iso: "", erro: "Data incompleta. Use dd/mm/aaaa." };
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return { iso: "", erro: "Data inválida. Confira o dia e o mês." };
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (dt.getTime() > hoje.getTime()) return { iso: "", erro: "A data não pode estar no futuro." };
  return { iso: `${m[3]}-${m[2]}-${m[1]}`, erro: "" };
}

export function uid(): string {
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
