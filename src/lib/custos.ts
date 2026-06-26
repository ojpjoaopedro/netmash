import { uid } from "./format";

// ============================================================
// DESPESAS FIXAS (recorrentes) — aluguel, internet, software, etc.
// MVP: localStorage. Geram lançamentos de despesa no mês (origem "recorrente").
// ============================================================
export type DespesaFixa = {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  dia_venc: number; // dia do mês (1-28)
  ativo: boolean;
};

const KEY = "fin_despesas_fixas";
const SEED = "fin_despesas_fixas_seed";

export const ORIGEM_RECORRENTE = "recorrente";

function lsGet(): DespesaFixa[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function lsSet(arr: DespesaFixa[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(arr));
}

function seed() {
  if (typeof window === "undefined" || localStorage.getItem(SEED)) return;
  const arr: DespesaFixa[] = [
    { id: uid(), nome: "Aluguel", categoria: "Aluguel", valor: 3200, dia_venc: 5, ativo: true },
    { id: uid(), nome: "Internet + telefonia", categoria: "Energia/Água/Internet", valor: 320, dia_venc: 10, ativo: true },
    { id: uid(), nome: "Sistema de gestão (software)", categoria: "Software/Assinaturas", valor: 199, dia_venc: 15, ativo: true },
    { id: uid(), nome: "Contador", categoria: "Outras despesas", valor: 600, dia_venc: 20, ativo: true },
  ];
  lsSet(arr);
  localStorage.setItem(SEED, "1");
}

export function getDespesasFixas(): DespesaFixa[] {
  seed();
  return lsGet();
}

export function addDespesaFixa(d: Omit<DespesaFixa, "id">) {
  const arr = lsGet();
  arr.push({ ...d, id: uid() });
  lsSet(arr);
}

export function updateDespesaFixa(id: string, patch: Partial<DespesaFixa>) {
  lsSet(lsGet().map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export function delDespesaFixa(id: string) {
  lsSet(lsGet().filter((d) => d.id !== id));
}

export function totalFixasAtivas(arr: DespesaFixa[]): number {
  return arr.filter((d) => d.ativo).reduce((a, d) => a + d.valor, 0);
}
