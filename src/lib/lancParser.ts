import { Tipo } from "@/lib/db";
import { hoje } from "@/lib/format";

export type LancParsed = {
  tipo: Tipo;
  valor: number;
  descricao: string;
  data: string;        // YYYY-MM-DD
  pago: boolean;
};

const RE_RECEITA = /\b(recebi|recebido|receber|vendi|vend[ae]|vendas|ganhei|entrou|entrada|receita|faturei|fatur|me\s+pagaram|cliente\s+pagou)\b/i;
const RE_DESPESA = /\b(paguei|pagar|gastei|gasto|gastos|comprei|compra|comprar|despesa|conta|boleto|sa[ií]u|custo|custei|investi|paguei)\b/i;
const RE_ABERTO = /\b(a\s+pagar|a\s+receber|vou\s+pagar|vence|vencimento|em\s+aberto|fiado|a\s+prazo|amanh[ãa]|pr[óo]xim)/i;

/** Extrai o valor em reais de um texto livre (PT-BR). */
function parseValor(t: string): number {
  const lower = t.toLowerCase();
  const mil = lower.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (mil) return Math.round(parseFloat(mil[1].replace(".", "").replace(",", ".")) * 1000);
  const m = lower.match(/r?\$?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?|\d+)/);
  if (!m) return 0;
  let s = m[1];
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/\.\d{3}\b/.test(s)) s = s.replace(/\./g, "");
  return Math.abs(Number(s)) || 0;
}

/** Resolve datas relativas simples e dd/mm. */
function parseData(t: string): string {
  const lower = t.toLowerCase();
  const base = new Date(hoje() + "T12:00:00");
  if (/\banteontem\b/.test(lower)) base.setDate(base.getDate() - 2);
  else if (/\bontem\b/.test(lower)) base.setDate(base.getDate() - 1);
  const dm = lower.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (dm) {
    const [, d, m, y] = dm;
    const yyyy = y ? (y.length === 2 ? "20" + y : y) : String(base.getFullYear());
    return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return base.toISOString().slice(0, 10);
}

/** Limpa a descrição removendo valor, moeda, verbos e datas. */
function limparDescricao(t: string): string {
  let d = t
    .replace(/r?\$?\s*\d[\d.,]*\s*(mil|reais|real)?/gi, " ")
    .replace(/\b(paguei|pagar|gastei|gasto|comprei|comprar|compra|recebi|recebido|receber|vendi|venda|ganhei|faturei|investi|custei)\b/gi, " ")
    .replace(/\b(hoje|ontem|anteontem|de|da|do|com|no|na|em|para|pra|por|um|uma|reais?)\b/gi, " ")
    .replace(/\b\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (d.length < 2) return "";
  return d.charAt(0).toUpperCase() + d.slice(1, 80);
}

/**
 * Interpreta uma frase livre num lançamento.
 * Ex.: "gastei 150 reais com gasolina ontem" -> despesa, 150, Gasolina, ontem.
 * Retorna null se não achar um valor.
 */
export function parseLancamento(texto: string): LancParsed | null {
  const t = (texto || "").trim();
  if (!t) return null;
  const valor = parseValor(t);
  if (valor <= 0) return null;
  const tipo: Tipo = RE_RECEITA.test(t) ? "receita" : RE_DESPESA.test(t) ? "despesa" : "despesa";
  const descricao = limparDescricao(t) || (tipo === "receita" ? "Recebimento" : "Despesa");
  return { tipo, valor, descricao, data: parseData(t), pago: !RE_ABERTO.test(t) };
}
