"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Layers, Wallet, ChevronDown, ChevronRight, Plus, Trash2, Pencil, Info, Check, X } from "lucide-react";
import BotaoOcultar from "@/components/ocultar";
import { AnimNum, useCountUp } from "@/components/AnimNum";
import { isoParaBR, mascararDataBR, brParaISO } from "@/lib/format";

/** Moeda "conforme digita" (centavos pela direita) -> 2.000,00 */
const mascaraMoedaBR = (v: string) => { const n = (v || "").replace(/\D/g, ""); return n ? (parseInt(n, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""; };

/**
 * Estrutura de Receitas e Custos — réplica da tela do Hub.
 *
 * Só as FOLHAS são editáveis (cada canal de receita e cada item de custo). Os
 * grupos, os blocos, a coluna "Total" e o resultado são somatórios calculados —
 * mexer numa folha reflete pra cima na hora. Tudo mora no navegador.
 */

export const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CHAVE = "me_financas_estrutura";

// completa o array de valores até 12 meses (o que não veio nos dados é 0)
const v12 = (a: number[]): number[] => Array.from({ length: 12 }, (_, i) => a[i] ?? 0);

export type Item = { nome: string; cor?: string; v: number[]; cal?: boolean; pend?: number[] };  // cal = linha do Calendário; pend = valores ainda não pagos (não somam)
// `financeiro` marca empréstimo/juros — o que o EBITDA soma de volta ao lucro
export type Grupo = { nome: string; cor: string; itens: Item[]; financeiro?: boolean };
export type Bloco = { nome: string; grupos: Grupo[] };
export type Dados = { receitas: Item[]; custos: Bloco[] };

const chaveAno = (ano: number) => `${CHAVE}:${ano}`;

/** Mesma estrutura (grupos/itens), porém com todos os valores zerados. */
function zerarValores(d: Dados): Dados {
  return {
    receitas: d.receitas.map((r) => ({ ...r, v: v12([]) })),
    custos: d.custos.map((b) => ({ ...b, grupos: b.grupos.map((g) => ({ ...g, itens: g.itens.map((it) => ({ ...it, v: v12([]) })) })) })),
  };
}

/**
 * Lê a estrutura do ano pedido. 2026 migra do formato antigo; anos sem dados
 * voltam com a mesma estrutura de 2026, só que zerada (para o usuário preencher).
 */
export function carregarEstrutura(ano: number = 2026): Dados {
  if (typeof window === "undefined") return PADRAO;
  try {
    const cru = localStorage.getItem(chaveAno(ano));
    if (cru) return JSON.parse(cru);
    if (ano === 2026) {
      const legado = localStorage.getItem(CHAVE);
      return legado ? JSON.parse(legado) : PADRAO;
    }
    return zerarValores(carregarEstrutura(2026));
  } catch { return ano === 2026 ? PADRAO : zerarValores(PADRAO); }
}

/** Salva a estrutura de um ano específico. */
export function salvarEstrutura(ano: number, d: Dados) {
  if (typeof window !== "undefined") { try { localStorage.setItem(chaveAno(ano), JSON.stringify(d)); } catch { /* ignore */ } }
}

/* ── Integração com o Calendário de Pagamentos ─────────────────────────────── */
export type Freq = "unica" | "mensal" | "semanal" | "diaria_uteis" | "diaria_todos";
export type Pagamento = { id: string; descricao: string; valor: number; dia: number; mes: number; ano: number; recorrente: boolean; freq?: Freq; pulados?: number[]; ate?: number; puladosDia?: string[]; ateDia?: string; grupo?: string; item?: string;
  confirmados?: number[]; valores?: Record<number, number>; pagoEm?: Record<number, string>;
  confirmadosDia?: string[]; valoresDia?: Record<string, number>; pagoEmDia?: Record<string, string> };
const CHAVE_PAG = "me_calendario_pagamentos";
const ymIdx = (ano: number, mes: number) => ano * 12 + mes;
export const freqDe = (p: Pagamento): Freq => p.freq || (p.recorrente ? "mensal" : "unica");
const fimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type Ocorrencia = { mes: number; dia: number; iso: string; mensal: boolean };
/** Todas as ocorrências (datas) da despesa/recebimento no ano, conforme a frequência. */
export function datasDaDespesa(p: Pagamento, ano: number): Ocorrencia[] {
  const f = freqDe(p);
  const out: Ocorrencia[] = [];
  if (f === "unica") { if (p.ano === ano) { const dt = new Date(ano, p.mes, p.dia); out.push({ mes: p.mes, dia: p.dia, iso: isoDe(dt), mensal: true }); } return out; }
  if (f === "mensal") {
    for (let m = 0; m < 12; m++) {
      const idx = ymIdx(ano, m);
      if (idx < ymIdx(p.ano, p.mes)) continue;
      if (p.ate != null && idx >= p.ate) continue;
      if (p.pulados?.includes(idx)) continue;
      const last = new Date(ano, m + 1, 0).getDate();
      const dt = new Date(ano, m, Math.min(p.dia, last));
      while (fimDeSemana(dt)) dt.setDate(dt.getDate() + 1);   // cai sempre em dia útil
      out.push({ mes: dt.getMonth(), dia: dt.getDate(), iso: isoDe(dt), mensal: true });
    }
    return out;
  }
  // semanal / diária: percorre datas a partir do início
  const passo = f === "semanal" ? 7 : 1;
  const cur = new Date(p.ano, p.mes, p.dia);
  const fim = new Date(ano, 11, 31);
  let guard = 0;
  while (cur <= fim && guard++ < 4000) {
    const idx = ymIdx(cur.getFullYear(), cur.getMonth());
    const isoAtual = isoDe(cur);
    const cortado = (p.ate != null && idx >= p.ate) || (p.pulados?.includes(idx)) || (p.ateDia != null && isoAtual >= p.ateDia) || (p.puladosDia?.includes(isoAtual));
    if (cur.getFullYear() === ano && !cortado && !(f === "diaria_uteis" && fimDeSemana(cur))) {
      out.push({ mes: cur.getMonth(), dia: cur.getDate(), iso: isoAtual, mensal: false });
    }
    cur.setDate(cur.getDate() + passo);
  }
  return out;
}
/** Uma ocorrência está confirmada? (compatível com o modelo antigo por mês). */
export function ocConfirmada(p: Pagamento, o: Ocorrencia, ano: number): boolean {
  if ((p.confirmadosDia || []).includes(o.iso)) return true;
  if (o.mensal && (p.confirmados || []).includes(ymIdx(ano, o.mes))) return true;
  return false;
}
/** Valor de uma ocorrência (aceita ajustes por dia ou por mês). */
export function valorDaOcorrencia(p: Pagamento, o: Ocorrencia, ano: number): number {
  if (p.valoresDia?.[o.iso] != null) return p.valoresDia[o.iso];
  if (o.mensal && p.valores?.[ymIdx(ano, o.mes)] != null) return p.valores[ymIdx(ano, o.mes)];
  return p.valor;
}

export function lerPagamentos(): Pagamento[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHAVE_PAG) || "[]"); } catch { return []; }
}
export function salvarPagamentos(ps: Pagamento[]) {
  if (typeof window !== "undefined") { try { localStorage.setItem(CHAVE_PAG, JSON.stringify(ps)); window.dispatchEvent(new Event("me:pagamentos")); } catch { /* ignore */ } }
}
const CHAVE_REC = "me_calendario_recebimentos";
export function lerRecebimentos(): Pagamento[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHAVE_REC) || "[]"); } catch { return []; }
}
export function salvarRecebimentos(ps: Pagamento[]) {
  if (typeof window !== "undefined") { try { localStorage.setItem(CHAVE_REC, JSON.stringify(ps)); window.dispatchEvent(new Event("me:recebimentos")); } catch { /* ignore */ } }
}

/** Meses (0..11) em que a despesa incide no ano dado. */
export function mesesDaDespesa(p: Pagamento, ano: number): number[] {
  const out: number[] = [];
  if (p.recorrente) {
    for (let m = 0; m < 12; m++) {
      const idx = ymIdx(ano, m);
      if (idx < ymIdx(p.ano, p.mes)) continue;
      if (p.ate != null && idx >= p.ate) continue;
      if (p.pulados?.includes(idx)) continue;
      out.push(m);
    }
  } else if (p.ano === ano) out.push(p.mes);
  return out;
}
/** Uma ocorrência confirmada? (não recorrente é sempre; recorrente depende de `confirmados`). */
export const pagamentoConfirmado = (p: Pagamento, ano: number, m: number) => !p.recorrente || (p.confirmados || []).includes(ymIdx(ano, m));

/** Soma dos pagamentos por grupo+item/mês no ano, separando confirmado e pendente. */
export function pagamentosPorItem(ano: number): { grupo: string; item: string; conf: number[]; pend: number[] }[] {
  const map: Record<string, { grupo: string; item: string; conf: number[]; pend: number[] }> = {};
  for (const p of lerPagamentos()) {
    if (!p.grupo || !p.item) continue;
    const k = `${p.grupo}|||${p.item}`;
    const alvo = (map[k] ||= { grupo: p.grupo, item: p.item, conf: v12([]), pend: v12([]) });
    for (const o of datasDaDespesa(p, ano)) {
      const val = valorDaOcorrencia(p, o, ano);
      if (ocConfirmada(p, o, ano)) alvo.conf[o.mes] += val; else alvo.pend[o.mes] += val;
    }
  }
  return Object.values(map);
}

/** Soma dos recebimentos por canal/mês no ano, separando confirmado e pendente. */
export function recebimentosPorCanal(ano: number): { item: string; conf: number[]; pend: number[] }[] {
  const map: Record<string, { item: string; conf: number[]; pend: number[] }> = {};
  for (const p of lerRecebimentos()) {
    if (!p.item) continue;
    const alvo = (map[p.item] ||= { item: p.item, conf: v12([]), pend: v12([]) });
    for (const o of datasDaDespesa(p, ano)) {
      const val = valorDaOcorrencia(p, o, ano);
      if (ocConfirmada(p, o, ano)) alvo.conf[o.mes] += val; else alvo.pend[o.mes] += val;
    }
  }
  return Object.values(map);
}

/** Estrutura com pagamentos/recebimentos CONFIRMADOS somados nos lugares certos (para dashboards/DRE). */
export function carregarEstruturaComPagamentos(ano: number = 2026): Dados {
  const base = carregarEstrutura(ano);
  const linhas = pagamentosPorItem(ano).filter((l) => l.conf.some((x) => x > 0));
  const recs = recebimentosPorCanal(ano).filter((l) => l.conf.some((x) => x > 0));
  if (!linhas.length && !recs.length) return base;
  const d: Dados = JSON.parse(JSON.stringify(base));
  for (const l of linhas) {
    let g = d.custos.flatMap((b) => b.grupos).find((x) => x.nome === l.grupo);
    if (!g) {
      let bloco = d.custos[0];
      if (!bloco) { bloco = { nome: "Custos", grupos: [] }; d.custos.push(bloco); }
      g = { nome: l.grupo, cor: "#94a3b8", itens: [] };
      bloco.grupos.push(g);
    }
    let it = g.itens.find((x) => x.nome === l.item);
    if (!it) { it = { nome: l.item, v: v12([]) }; g.itens.push(it); }
    it.v = it.v.map((x, m) => x + (l.conf[m] || 0));
  }
  for (const l of recs) {
    let r = d.receitas.find((x) => x.nome === l.item);
    if (!r) { r = { nome: l.item, cor: "#94a3b8", v: v12([]) }; d.receitas.push(r); }
    r.v = r.v.map((x, m) => x + (l.conf[m] || 0));
  }
  return d;
}

const AZUL = "#1AADE2", VERDE = "#10B981", ROXO = "#8b5cf6", LARANJA = "#F59E0B", ROSA = "#EC4899", VERMELHO = "#EF4444";

/* ── valores exatos transcritos dos relatórios ────────────────────────────── */
export const PADRAO: Dados = {
  receitas: [
    { nome: "Comercial (B2C)", cor: AZUL, v: v12([36137, 29131, 22552.72, 25459, 35298, 51365, 797]) },
    { nome: "Escolas (B2B)", cor: VERDE, v: v12([0, 14396, 13916, 14266, 14266, 14276]) },
    { nome: "Renovações", cor: ROXO, v: v12([3012, 2246, 2395, 2794, 4998, 4194]) },
    { nome: "Vendas de produtos", cor: LARANJA, v: v12([900, 2297.41, 466.69, 570, 1676.71, 1180]) },
  ],
  custos: [
    {
      nome: "Custos Fixos",
      grupos: [
        {
          nome: "Salários – Comercial", cor: AZUL, itens: [
            { nome: "Yuri Carvalho (Diretor)", v: v12([5000, 5000, 4000, 4000, 4000, 4000]) },
            { nome: "Matheus", v: v12([0, 0, 2000, 2000, 2000, 2000]) },
            { nome: "Ana Paula", v: v12([1520, 1499.93, 1499.93, 1499.43, 1499.43, 1499.43]) },
            { nome: "Victor", v: v12([0, 1000, 1000]) },
          ],
        },
        {
          nome: "Salários – Operação", cor: ROXO, itens: [
            { nome: "Ana Gabrielly", v: v12([1520, 1200, 1110, 1110, 1110, 1110]) },
            { nome: "Bruno Cavalli (Diretor)", v: v12([2000, 2000, 4000, 4000, 4000, 4000]) },
            { nome: "Fabiola Martins", v: v12([0, 0, 0, 0, 1000, 1000]) },
            { nome: "João Pedro", v: v12([2000, 2000, 2000, 2000, 2000, 2000]) },
            { nome: "Juan Carlo", v: v12([0, 0, 2000, 3000]) },
            { nome: "Luiz Fernando (Diretor)", v: v12([0, 0, 0, 0, 2000, 3000]) },
            { nome: "Paulo Jesus", v: v12([0, 0, 0, 0, 600, 600]) },
            { nome: "Vitoria", v: v12([1520, 1510, 1404.15, 1499.43, 1499.43, 1499.43]) },
            { nome: "Willyam Silva", v: v12([0, 1000, 1000, 1000, 1000, 1000]) },
          ],
        },
        {
          nome: "Comissão", cor: LARANJA, itens: [
            { nome: "Time comercial", v: v12([6030, 5194, 2000, 500, 4200, 7600]) },
          ],
        },
        {
          nome: "Impostos / Férias / 13ª / Resc.", cor: ROXO, itens: [
            { nome: "13º", v: v12([0, 0, 0, 0, 0, 833.33]) },
            { nome: "Férias", v: v12([0, 0, 0, 0, 0, 1159.75]) },
            { nome: "Rescisão / Admissão", v: v12([90]) },
            { nome: "FGTS", v: v12([131.56, 222.64, 385.57, 507.12, 507, 582.02]) },
            { nome: "DARF", v: v12([113.85, 231.33, 361.46, 481.10, 480, 500]) },
          ],
        },
        {
          nome: "Operacional", cor: LARANJA, itens: [
            { nome: "Coworking", v: v12([190, 190, 190, 190, 190, 190]) },
            { nome: "Aluguel", v: v12([2168.80, 2168.80, 2393.49, 2393.49, 2393.49, 2393.49]) },
            { nome: "Internet", v: v12([99.90, 99.90, 99.90, 99.90, 99.90, 99.90]) },
            { nome: "Equatorial Sala 01", v: v12([43.28, 39.87, 46.11, 52.23, 52.42, 148.64]) },
            { nome: "Equatorial Sala 02", v: v12([201.18, 40.14, 71.35, 155.41, 201.21, 187.81]) },
            { nome: "Contabilidade", v: v12([619.51, 619.51, 619.51, 619.51, 619.51, 619.51]) },
            { nome: "Adobe (MKT)", v: v12([86.58, 80, 94, 94, 94, 80]) },
            { nome: "Assina Mais (COMERC)", v: v12([32, 32, 32, 32]) },
            { nome: "Chat GPT (COMERC)", v: v12([110.47, 107.65, 107.65, 115, 115, 115]) },
            { nome: "Claro (COMERC)", v: v12([68, 0, 0, 60, 0, 60]) },
            { nome: "Cursor IA", v: v12([112.55, 108.86, 108.86, 115]) },
            { nome: "Claude IA", v: v12([0, 0, 592.06, 1184.12, 1184.12, 597]) },
            { nome: "Manus IA", v: v12([0, 0, 108, 0, 115]) },
            { nome: "Eleven Labs (MKT)", v: v12([26, 26.59]) },
            { nome: "Google Suite (MKT)", v: v12([98, 98, 98, 98, 98, 100.37]) },
            { nome: "GPT Maker (COMERC)", v: v12([97]) },
            { nome: "Hospedagem (MKT)", v: v12([58.66, 58.57, 58.57, 58.57, 58.57, 58.57]) },
            { nome: "Hostinger", v: v12([0, 0, 0, 0, 0, 395.88]) },
            { nome: "Kommo CRM (COMERC)", v: v12([805.58]) },
            { nome: "Vimeo", v: v12([150, 150, 150, 150, 150, 150]) },
            { nome: "WhatsApp Business (COMERC)", v: v12([118.96, 0, 120.06, 107.81, 107.10, 60]) },
            { nome: "Z-API (COMERC)", v: v12([99.90, 99.99, 99.99, 99.99, 99.90, 99.99]) },
          ],
        },
      ],
    },
    {
      nome: "Custos Variáveis",
      grupos: [
        {
          nome: "Marketing e Publicidade", cor: ROSA, itens: [
            { nome: "Tráfego Pago B2C", v: v12([2054, 2080.90, 3973.09, 4300.57, 5372.18, 5051.03]) },
            { nome: "Influenciadora VIVIANE", v: v12([0, 0, 0, 1000, 1000, 1000]) },
            { nome: "Rebranding", v: v12([1662.50, 1662.50]) },
          ],
        },
        {
          nome: "Taxas e Antecipações", cor: ROSA, itens: [
            { nome: "Taxa de cartão", v: v12([1286.17, 1235.34, 1165, 1299.87, 1677.37, 394.05]) },
            { nome: "Comissão Juan", v: v12([230.60, 309.66, 216, 309, 551.55, 160.86]) },
            { nome: "Taxa de Antecipação", v: v12([1525.36, 3697.49, 2796.32, 3072.18, 3733.66, 1012.19]) },
            { nome: "Demais Taxas", v: v12([32.79, 19.86, 32.79, 34.77, 62.63, 87.50]) },
          ],
        },
        {
          nome: "Terceirizados", cor: VERDE, itens: [
            { nome: "Representante Comercial", v: v12([0, 2083.80, 1973.40, 2056.20, 2056, 2056]) },
            { nome: "Correios", v: v12([290, 191.10, 598, 595, 800, 349]) },
            { nome: "Hubix", v: v12([2000, 2000, 2000, 2000, 0, 2000]) },
            { nome: "Hubix Perfil", v: v12([360, 360, 360, 360]) },
            { nome: "Registro de marca", v: v12([0, 860]) },
            { nome: "Limpeza da sala", v: v12([0, 0, 0, 0, 140]) },
            { nome: "IEL Estágio", v: v12([0, 0, 117, 117, 117, 117]) },
            { nome: "Solides (Ponto Digital)", v: v12([10.92, 11.16]) },
            { nome: "Cartório (Instituto)", v: v12([0, 0, 0, 465]) },
            { nome: "ACATE", v: v12([0, 0, 0, 0, 397]) },
            { nome: "Abertura CNPJ Instituto", v: v12([0, 0, 0, 350]) },
            { nome: "Tx de Licença de localização", v: v12([0, 0, 0, 0, 0, 342.91]) },
            { nome: "Plano Adapta ITAU", v: v12([0, 0, 0, 0, 0, 169.49]) },
            { nome: "Lanches e cafés", v: v12([158.09, 125, 250, 250, 192, 170]) },
            { nome: "Manutenção", v: v12([350, 0, 620, 412, 400, 650]) },
            { nome: "Troféus e Medalhas / Pulseiras", v: v12([0, 0, 1725, 0, 241]) },
            { nome: "Caixa para envio", v: v12([0, 69.97, 0, 69.97, 0, 85]) },
            { nome: "Perfume para envio", v: v12([0, 26.90]) },
            { nome: "Cordão", v: v12([0, 87.41]) },
            { nome: "Porta Crachá", v: v12([0, 43.97]) },
            { nome: "Plástico Bolha", v: v12([0, 23.10]) },
            { nome: "Microfone Hollyland", v: v12([0, 668]) },
            { nome: "Material Didático", v: v12([0, 2616]) },
          ],
        },
        {
          nome: "Pagamento de Empréstimo", cor: LARANJA, financeiro: true, itens: [
            { nome: "Capital de giro (Pronampe)", v: v12([285.54, 299, 308.65, 296.96, 310, 342.44]) },
            { nome: "IOF", v: v12([0, 0, 0, 0, 0, 30.08]) },
          ],
        },
        {
          nome: "Impostos e Juros", cor: ROXO, financeiro: true, itens: [
            { nome: "DAS - ISS", v: v12([2092.81, 1518.10, 2150, 1383.33, 2255, 1771.71]) },
          ],
        },
      ],
    },
  ],
};

/* ── helpers de número em pt-BR ───────────────────────────────────────────── */
const fmt = (n: number) => (Math.abs(n) < 0.005 ? "–" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// "1.234,56" -> 1234.56
const parseBR = (s: string) => { const n = parseFloat(s.replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };

// soma por mês de uma lista de itens (grupo/bloco)
const somaPorMes = (itens: { v: number[] }[]) => Array.from({ length: 12 }, (_, m) => itens.reduce((s, it) => s + it.v[m], 0));
const menos = (a: number[], b: number[]) => Array.from({ length: 12 }, (_, m) => a[m] - b[m]);
const mais = (a: number[], b: number[]) => Array.from({ length: 12 }, (_, m) => a[m] + b[m]);

/* Resultado, EBITDA e margem calculados automaticamente a partir dos dados. */
const todosItens = (d: Dados) => d.custos.flatMap((b) => b.grupos.flatMap((g) => g.itens));
const financeiroItens = (d: Dados) => d.custos.flatMap((b) => b.grupos.filter((g) => g.financeiro).flatMap((g) => g.itens));
/** Resultado (lucro) do período = receitas − custos, mês a mês. */
export const resultadoDe = (d: Dados) => menos(somaPorMes(d.receitas), somaPorMes(todosItens(d)));
/** EBITDA = resultado + custos financeiros (empréstimos e juros) somados de volta. */
export const ebitdaDe = (d: Dados) => mais(resultadoDe(d), somaPorMes(financeiroItens(d)));

export default function EstruturaFinancas({ ano = 2026 }: { ano?: number }) {
  const [d, setD] = useState<Dados>(PADRAO);
  const [carregado, setCarregado] = useState(false);
  const pularSalvar = useRef(false);   // evita gravar os dados de um ano na chave de outro ao trocar
  const [sel, setSel] = useState<Set<number>>(new Set()); // meses exibidos (vazio só antes de carregar)
  const [abertos, setAbertos] = useState<Set<string>>(new Set()); // grupos expandidos
  const [blocosFechados, setBlocosFechados] = useState<Set<number>>(new Set()); // blocos recolhidos
  const toggleBloco = (bi: number) => setBlocosFechados((p) => { const n = new Set(p); if (n.has(bi)) n.delete(bi); else n.add(bi); return n; });
  const [aExcluir, setAExcluir] = useState<{ nome: string; onOk: () => void } | null>(null);
  const pedirExcluir = (nome: string, onOk: () => void) => setAExcluir({ nome, onOk });

  // "desfazer exclusão" com contagem regressiva de 10s visível na tela
  const [desfazer, setDesfazer] = useState<{ texto: string; onDesfazer: () => void } | null>(null);
  const [segRestante, setSegRestante] = useState(0);
  const desfazerI = useRef<number | undefined>(undefined);
  const fecharDesfazer = () => { window.clearInterval(desfazerI.current); setDesfazer(null); };
  const mostrarDesfazer = (texto: string, onDesfazer: () => void) => {
    setDesfazer({ texto, onDesfazer });
    setSegRestante(10);
    window.clearInterval(desfazerI.current);
    desfazerI.current = window.setInterval(() => {
      setSegRestante((s) => { if (s <= 1) { window.clearInterval(desfazerI.current); setDesfazer(null); return 0; } return s - 1; });
    }, 1000);
  };

  // avisinho "Salvo" que aparece ao lado do campo editado e some em 1,5s
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);
  const salvo = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: r.right });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  };

  // ----- Ctrl+Z: desfaz a última edição/exclusão (estrutura + calendário juntos) -----
  const dRef = useRef(d);
  useEffect(() => { dRef.current = d; }, [d]);
  const undoStack = useRef<{ d: Dados; pag: Pagamento[]; rec: Pagamento[] }[]>([]);
  const [desfeito, setDesfeito] = useState(false);
  const desfeitoT = useRef<number | undefined>(undefined);
  // guarda o estado ATUAL antes de uma alteração; chamar no início de cada handler que muda dados
  const snapshot = () => {
    undoStack.current.push({ d: structuredClone(dRef.current), pag: lerPagamentos(), rec: lerRecebimentos() });
    if (undoStack.current.length > 60) undoStack.current.shift();
  };
  const desfazerUndo = () => {
    const s = undoStack.current.pop();
    if (!s) return;
    fecharDesfazer();
    pularSalvar.current = false;
    setD(s.d);
    salvarEstrutura(ano, s.d);
    salvarPagamentos(s.pag);
    salvarRecebimentos(s.rec);
    setDesfeito(true);
    window.clearTimeout(desfeitoT.current);
    desfeitoT.current = window.setTimeout(() => setDesfeito(false), 1600);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || (e.key !== "z" && e.key !== "Z")) return;
      const ae = document.activeElement as HTMLElement | null;
      // se estiver digitando num campo, deixa o "desfazer" nativo do próprio campo agir
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
      if (!undoStack.current.length) return;
      e.preventDefault();
      desfazerUndo();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano]);

  // carrega os dados do ano selecionado (recarrega ao trocar de ano)
  useEffect(() => {
    undoStack.current = [];                      // histórico é por ano
    pularSalvar.current = true;                 // não regravar logo após carregar
    setD(carregarEstrutura(ano));
    // padrão: Jan até o mês corrente (data lida só no cliente, evita hidratação)
    const atual = new Date().getMonth();
    setSel(new Set(Array.from({ length: atual + 1 }, (_, i) => i)));
    setCarregado(true);
  }, [ano]);
  useEffect(() => {
    if (!carregado) return;
    if (pularSalvar.current) { pularSalvar.current = false; return; }
    salvarEstrutura(ano, d);
  }, [d, carregado, ano]);

  // pagamentos/recebimentos CONFIRMADOS do calendário aparecem na tabela como linha só-leitura ("calendário")
  const [pagVersao, setPagVersao] = useState(0);
  useEffect(() => {
    const h = () => setPagVersao((v) => v + 1);
    window.addEventListener("me:pagamentos", h);
    window.addEventListener("me:recebimentos", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("me:pagamentos", h); window.removeEventListener("me:recebimentos", h); window.removeEventListener("storage", h); };
  }, []);
  const dExibido = useMemo(() => {
    const custosL = pagamentosPorItem(ano).filter((l) => l.conf.some((x) => x > 0) || l.pend.some((x) => x > 0));
    const recL = recebimentosPorCanal(ano).filter((l) => l.conf.some((x) => x > 0) || l.pend.some((x) => x > 0));
    if (!custosL.length && !recL.length) return d;
    const nd: Dados = structuredClone(d);
    for (const l of custosL) {
      const g = nd.custos.flatMap((b) => b.grupos).find((x) => x.nome === l.grupo);
      if (!g) continue;
      const real = g.itens.find((it) => it.nome === l.item && !it.cal);
      if (real) {
        real.v = real.v.map((x, m) => x + (l.conf[m] || 0));                 // soma o pago no item existente (mesmo nome)
        if (l.pend.some((x) => x > 0)) real.pend = l.pend.slice();           // pendentes viram 2ª linha "a pagar"
      } else {
        g.itens.push({ nome: l.item, v: l.conf.slice(), pend: l.pend.slice(), cal: true });   // v = pago (soma); pend = a pagar (não soma)
      }
    }
    for (const l of recL) {
      const real = nd.receitas.find((r) => r.nome === l.item && !r.cal);
      if (real) {
        real.v = real.v.map((x, m) => x + (l.conf[m] || 0));                 // soma o confirmado no canal existente
        if (l.pend.some((x) => x > 0)) real.pend = l.pend.slice();           // pendentes viram 2ª linha "a receber"
      } else {
        const pal = [AZUL, VERDE, ROXO, LARANJA, ROSA, VERMELHO];
        const cor = pal[[...l.item].reduce((a, c) => a + c.charCodeAt(0), 0) % pal.length];
        nd.receitas.push({ nome: l.item, cor, v: l.conf.slice(), pend: l.pend.slice(), cal: true });
      }
    }
    return nd;
  }, [d, ano, pagVersao]);

  // edição/remoção das linhas do calendário direto por aqui (reflete no Calendário). origem: "pag" (custos) ou "rec" (receitas)
  const lojaLer = (origem: "pag" | "rec") => (origem === "pag" ? lerPagamentos() : lerRecebimentos());
  const lojaSalvar = (origem: "pag" | "rec", ps: Pagamento[]) => (origem === "pag" ? salvarPagamentos(ps) : salvarRecebimentos(ps));
  const bate = (origem: "pag" | "rec", p: Pagamento, grupo: string, item: string) => (origem === "pag" ? (p.grupo === grupo && p.item === item) : (p.item === item));
  const renomearCal = (origem: "pag" | "rec", grupo: string, antigo: string, novo: string) => { snapshot(); lojaSalvar(origem, lojaLer(origem).map((p) => bate(origem, p, grupo, antigo) ? { ...p, item: novo, descricao: novo } : p)); };
  const removerCal = (origem: "pag" | "rec", grupo: string, item: string) => { snapshot(); lojaSalvar(origem, lojaLer(origem).filter((p) => !bate(origem, p, grupo, item))); };
  // editar o valor JÁ CONFIRMADO de um mês (reflete no Calendário): grava o total do mês na 1ª ocorrência confirmada e zera as demais
  const editarCalMes = (origem: "pag" | "rec", grupo: string, item: string, mes: number, novo: number) => {
    snapshot();
    let atribuido = false;
    lojaSalvar(origem, lojaLer(origem).map((p) => {
      if (!bate(origem, p, grupo, item)) return p;
      const ocs = datasDaDespesa(p, ano).filter((o) => o.mes === mes && ocConfirmada(p, o, ano)).sort((a, b) => a.dia - b.dia);
      if (!ocs.length) return p;
      const valoresDia = { ...(p.valoresDia || {}) };
      for (const o of ocs) { valoresDia[o.iso] = atribuido ? 0 : novo; atribuido = true; }
      return { ...p, valoresDia };
    }));
  };

  // pagar/receber um mês pendente direto da Estrutura (reflete no Calendário)
  const [pagarEst, setPagarEst] = useState<{ origem: "pag" | "rec"; grupo: string; item: string; mes: number; valor: string; data: string; varios: boolean } | null>(null);
  const dataVencMes = (dia: number, mes: number) => { const last = new Date(ano, mes + 1, 0).getDate(); return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(Math.min(dia, last)).padStart(2, "0")}`; };
  const abrirPagarEst = (origem: "pag" | "rec", grupo: string, item: string, mes: number) => {
    let soma = 0, dia = 1, count = 0;
    for (const p of lojaLer(origem)) {
      if (!bate(origem, p, grupo, item)) continue;
      for (const o of datasDaDespesa(p, ano)) if (o.mes === mes && !ocConfirmada(p, o, ano)) { soma += valorDaOcorrencia(p, o, ano); if (count === 0) dia = o.dia; count++; }
    }
    if (!count) return;
    setPagarEst({ origem, grupo, item, mes, valor: soma.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), data: isoParaBR(dataVencMes(dia, mes)), varios: count > 1 });
  };
  // remove (pula) as ocorrências pendentes de um mês (o "x")
  const removerPendentesMes = (origem: "pag" | "rec", grupo: string, item: string, mes: number) => {
    snapshot();
    lojaSalvar(origem, lojaLer(origem).map((p) => {
      if (!bate(origem, p, grupo, item)) return p;
      const pend = datasDaDespesa(p, ano).filter((o) => o.mes === mes && !ocConfirmada(p, o, ano));
      if (!pend.length) return p;
      const puladosDia = [...(p.puladosDia || [])];
      const pulados = [...(p.pulados || [])];
      const ymMes = ano * 12 + mes;
      for (const o of pend) { if (o.mensal) { if (!pulados.includes(ymMes)) pulados.push(ymMes); } else puladosDia.push(o.iso); }
      return { ...p, puladosDia, pulados };
    }));
  };
  const confirmarPagarEst = () => {
    if (!pagarEst) return;
    snapshot();
    const { origem, grupo, item, mes, valor, data, varios } = pagarEst;
    const val = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
    const dataISO = brParaISO(data) || data;
    lojaSalvar(origem, lojaLer(origem).map((p) => {
      if (!bate(origem, p, grupo, item)) return p;
      const pend = datasDaDespesa(p, ano).filter((o) => o.mes === mes && !ocConfirmada(p, o, ano));
      if (!pend.length) return p;
      const confirmadosDia = [...(p.confirmadosDia || [])];
      const valoresDia = { ...(p.valoresDia || {}) };
      const pagoEmDia = { ...(p.pagoEmDia || {}) };
      for (const o of pend) { confirmadosDia.push(o.iso); pagoEmDia[o.iso] = dataISO; if (!varios) valoresDia[o.iso] = val; }
      return { ...p, confirmadosDia, valoresDia, pagoEmDia };
    }));
    setPagarEst(null);
  };

  // colunas visíveis = meses selecionados (em ordem); sem seleção, mostra todos
  const mesesVis = useMemo(() => (sel.size ? [...sel].sort((a, b) => a - b) : MES.map((_, i) => i)), [sel]);
  const totalDe = (v: number[]) => mesesVis.reduce((s, m) => s + v[m], 0);
  const toggleMes = (m: number) => setSel((p) => { const n = new Set(p); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  const toggleGrupo = (id: string) => setAbertos((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // as três tabelas rolam juntas na horizontal, senão Jan sai do lugar ao arrastar
  const scrolls = useRef<(HTMLDivElement | null)[]>([]);
  const sincronizar = (de: number) => {
    const sl = scrolls.current[de]?.scrollLeft ?? 0;
    scrolls.current.forEach((el, i) => { if (i !== de && el && el.scrollLeft !== sl) el.scrollLeft = sl; });
  };

  /* edição de folhas e nomes (imutável) */
  function editarReceita(ri: number, m: number, valor: number) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.receitas[ri].v[m] = valor; return r; });
  }
  function editarCusto(bi: number, gi: number, ii: number, m: number, valor: number) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens[ii].v[m] = valor; return r; });
  }
  function nomeReceita(ri: number, nome: string) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.receitas[ri].nome = nome; return r; });
  }
  function nomeItem(bi: number, gi: number, ii: number, nome: string) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens[ii].nome = nome; return r; });
  }
  const CINZA = "#94a3b8";
  function addReceita() {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.receitas.push({ nome: "", cor: CINZA, v: v12([]) }); return r; });
  }
  function removerReceita(ri: number) {
    snapshot();
    const removido = structuredClone(d.receitas[ri]);
    setD((x) => { const r = structuredClone(x); r.receitas.splice(ri, 1); return r; });
    mostrarDesfazer(`"${removido.nome || "canal"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.receitas.splice(ri, 0, removido); return r; }));
  }
  function addItem(bi: number, gi: number) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.push({ nome: "", v: v12([]) }); return r; });
  }
  function removerItem(bi: number, gi: number, ii: number) {
    snapshot();
    const removido = structuredClone(d.custos[bi].grupos[gi].itens[ii]);
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.splice(ii, 1); return r; });
    mostrarDesfazer(`"${removido.nome || "item"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.splice(ii, 0, removido); return r; }));
  }
  const CORES_GRUPO = [AZUL, ROXO, LARANJA, ROSA, VERDE];
  function nomeGrupo(bi: number, gi: number, nome: string) {
    snapshot();
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].nome = nome; return r; });
  }
  function addGrupo(bi: number) {
    snapshot();
    setD((x) => { const r = structuredClone(x); const g = r.custos[bi].grupos; g.push({ nome: "", cor: CORES_GRUPO[g.length % CORES_GRUPO.length], itens: [] }); return r; });
    // já deixa o grupo novo aberto para cadastrar itens
    setAbertos((p) => new Set(p).add(`${bi}-${d.custos[bi].grupos.length}`));
  }
  function removerGrupo(bi: number, gi: number) {
    snapshot();
    const removido = structuredClone(d.custos[bi].grupos[gi]);
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos.splice(gi, 1); return r; });
    mostrarDesfazer(`Grupo "${removido.nome || "grupo"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.custos[bi].grupos.splice(gi, 0, removido); return r; }));
  }

  /* somatórios */
  const recTotais = useMemo(() => somaPorMes(dExibido.receitas), [dExibido]);
  const blocosMes = useMemo(() => dExibido.custos.map((b) => somaPorMes(b.grupos.flatMap((g) => g.itens))), [dExibido]);
  const custosTotais = useMemo(() => Array.from({ length: 12 }, (_, m) => blocosMes.reduce((s, b) => s + b[m], 0)), [blocosMes]);
  // Resultado, EBITDA e margem agora são CALCULADOS a partir dos dados exibidos
  // (mexer numa receita/custo atualiza tudo na hora; inclui pagamentos confirmados do calendário).
  const resultadoMes = useMemo(() => resultadoDe(dExibido), [dExibido]);
  const ebitdaMes = useMemo(() => ebitdaDe(dExibido), [dExibido]);

  if (!carregado) return null;

  // larguras FIXAS iguais nas três tabelas: é isso que alinha Jan..Dez de ponta
  // a ponta entre Receitas, Custos e Resultado
  const W_ROT = 224, W_MES = 116, W_TOT = 128;
  const larguraMin = W_ROT + mesesVis.length * W_MES + W_TOT;
  const cols = { W_ROT, W_MES, W_TOT, meses: mesesVis };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* seletor de meses — compacto, cinza moderno + ocultar valores */}
      <div className="card" style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {MES.map((m, i) => {
            const on = sel.has(i);
            return (
              <button key={m} onClick={() => toggleMes(i)} style={{
                padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: on ? "1px solid var(--brand)" : "1px solid var(--line-2)",
                background: on ? "var(--brand)" : "transparent",
                color: on ? "var(--brand-ct,#fff)" : "var(--muted)", transition: ".12s",
              }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>{m}</button>
            );
          })}
        </div>
        <BotaoOcultar />
      </div>

      {/* COMPOSIÇÃO DAS RECEITAS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Receitas totais" valor={totalDe(recTotais)} fmt={fmtR} cor={VERDE} />
        </div>
        <div ref={(el) => { scrolls.current[0] = el; }} onScroll={() => sincronizar(0)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<TrendingUp size={16} />} titulo="Composição das Receitas" cor={VERDE} meses={mesesVis} />
            <tbody>
              {dExibido.receitas.map((r, ri) => {
                const temPend = !!r.pend && r.pend.some((x) => x > 0);
                return (
                  <FragBloco key={ri}>
                    {r.cal ? (
                      <tr style={{ borderTop: "1px solid var(--line)" }}>
                        <CalNomeCel nome={r.nome} cor={r.cor} reservaChevron onSalvo={salvo}
                          onRenomear={(nv) => renomearCal("rec", "", r.nome, nv)}
                          onRemover={() => pedirExcluir(`"${r.nome}" (lançado pelo Calendário)`, () => removerCal("rec", "", r.nome))} />
                        {mesesVis.map((m) => <Celula key={m} valor={r.v[m] || 0} onSalvo={salvo} onChange={(nv) => editarCalMes("rec", "", r.nome, m, nv)} />)}
                        <td className="oc-num" style={{ ...tdNum, fontWeight: 700 }}><AnimNum value={totalDe(r.v)} fmt={fmt} /></td>
                      </tr>
                    ) : (
                      <tr style={{ borderTop: "1px solid var(--line)" }}>
                        <NomeCel cor={r.cor} valor={r.nome} placeholder="Novo canal" reservaChevron onSalvo={salvo} onChange={(nv) => nomeReceita(ri, nv)} onRemover={() => pedirExcluir(r.nome || "este canal de venda", () => removerReceita(ri))} />
                        {mesesVis.map((m) => <Celula key={m} valor={r.v[m]} onSalvo={salvo} onChange={(nv) => editarReceita(ri, m, nv)} />)}
                        <Total><AnimNum value={totalDe(r.v)} fmt={fmt} /></Total>
                      </tr>
                    )}
                    {temPend && (
                      <tr>
                        <td style={{ ...tdRot, padding: 0, height: 0, overflow: "visible", verticalAlign: "top" }}>
                          <div style={{ marginTop: -12, paddingLeft: 34, fontStyle: "italic", color: "var(--muted)", fontSize: 10.5 }}>a receber</div>
                        </td>
                        {mesesVis.map((m) => {
                          const pend = r.pend![m] || 0;
                          if (pend <= 0) return <td key={m} style={{ ...tdNum, padding: 0, height: 0 }} />;
                          return (
                            <td key={m} className="oc-num" style={{ ...tdNum, padding: 0, height: 0, verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, lineHeight: 1, marginTop: -12 }}>
                                <span style={{ color: "#aab2bd", fontStyle: "italic" }} title="A receber (ainda não somado)">{fmt(pend)}</span>
                                <span style={{ display: "inline-flex", gap: 4 }}>
                                  <button onClick={() => abrirPagarEst("rec", "", r.nome, m)} title="Confirmar recebimento" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(16,185,129,.16)", color: "#10B981" }}><Check size={12} strokeWidth={3} /></button>
                                  <button onClick={() => pedirExcluir(`recebíveis a receber de "${r.nome}" em ${MES[m]}`, () => removerPendentesMes("rec", "", r.nome, m))} title="Remover" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(239,68,68,.14)", color: "#EF4444" }}><X size={12} strokeWidth={3} /></button>
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ ...tdNum, padding: 0 }} />
                      </tr>
                    )}
                  </FragBloco>
                );
              })}
              <AddSubtil span={mesesVis.length + 2} texto="cadastrar canal de venda" onClick={addReceita} />
              <tr style={{ borderTop: "2px solid var(--line-2)", background: "var(--card-2)" }}>
                <td style={{ ...tdRot, fontWeight: 800, background: "var(--card-2)" }}>Receitas totais</td>
                {mesesVis.map((m) => <td key={m} className="oc-num" style={{ ...tdNum, fontWeight: 800 }}><AnimNum value={recTotais[m]} fmt={fmt} /></td>)}
                <td className="oc-num" style={{ ...tdNum, fontWeight: 800, color: VERDE }}><AnimNum value={totalDe(recTotais)} fmt={fmt} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALHAMENTO DOS CUSTOS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Custos totais" valor={totalDe(custosTotais)} fmt={fmtR} cor={VERMELHO} />
        </div>
        <div ref={(el) => { scrolls.current[1] = el; }} onScroll={() => sincronizar(1)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<Layers size={16} />} titulo="Detalhamento dos Custos" cor={VERMELHO} meses={mesesVis} />
            <tbody>
              {dExibido.custos.map((b, bi) => {
                const blocoAberto = !blocosFechados.has(bi);
                return (
                <FragBloco key={bi}>
                  {/* linha do bloco — chevron recolhe todos os grupos abaixo */}
                  <tr style={{ background: "var(--card-2)", borderTop: "2px solid var(--line-2)" }}>
                    <td style={{ ...tdRot, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", fontSize: 11.5, background: "var(--card-2)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <Chevron aberto={blocoAberto} onClick={() => toggleBloco(bi)} />
                        {b.nome}
                      </span>
                    </td>
                    {mesesVis.map((m) => <td key={m} onClick={() => toggleBloco(bi)} className="oc-num" style={{ ...tdNum, fontWeight: 800, cursor: "pointer" }}><AnimNum value={blocosMes[bi][m]} fmt={fmt} /></td>)}
                    <td onClick={() => toggleBloco(bi)} className="oc-num" style={{ ...tdNum, fontWeight: 800, cursor: "pointer" }}><AnimNum value={totalDe(blocosMes[bi])} fmt={fmt} /></td>
                  </tr>
                  {blocoAberto && b.grupos.map((g, gi) => {
                    const id = `${bi}-${gi}`;
                    const gm = somaPorMes(g.itens);
                    const aberto = abertos.has(id);
                    return (
                      <FragBloco key={gi}>
                        {/* grupo: clicar expande; só depois aparece o lápis para editar/excluir */}
                        <tr style={{ borderTop: "1px solid var(--line)" }}>
                          <GrupoCel cor={g.cor} valor={g.nome} aberto={aberto} onToggle={() => toggleGrupo(id)} onSalvo={salvo}
                            onChange={(nv) => nomeGrupo(bi, gi, nv)}
                            onRemover={() => pedirExcluir(g.nome || "este grupo", () => removerGrupo(bi, gi))} />
                          {mesesVis.map((m) => <td key={m} onClick={() => toggleGrupo(id)} className="oc-num" style={{ ...tdNum, fontWeight: 500, cursor: "pointer" }}><AnimNum value={gm[m]} fmt={fmt} /></td>)}
                          <td onClick={() => toggleGrupo(id)} className="oc-num" style={{ ...tdNum, fontWeight: 700, cursor: "pointer" }}><AnimNum value={totalDe(gm)} fmt={fmt} /></td>
                        </tr>
                        {/* itens (folhas editáveis: nome e valores). Linhas do calendário são só-leitura. */}
                        {aberto && g.itens.map((it, ii) => it.cal ? (
                          <FragBloco key={ii}>
                            <tr style={{ borderTop: "1px solid var(--line)" }}>
                              <CalNomeCel nome={it.nome} italico indent={30} onSalvo={salvo}
                                onRenomear={(nv) => renomearCal("pag", g.nome, it.nome, nv)}
                                onRemover={() => pedirExcluir(`"${it.nome}" (lançado pelo Calendário)`, () => removerCal("pag", g.nome, it.nome))} />
                              {mesesVis.map((m) => <Celula key={m} valor={it.v[m] || 0} italico onSalvo={salvo} onChange={(nv) => editarCalMes("pag", g.nome, it.nome, m, nv)} />)}
                              <td className="oc-num" style={{ ...tdNum, fontStyle: "italic", color: "var(--muted)" }}><AnimNum value={totalDe(it.v)} fmt={fmt} /></td>
                            </tr>
                            {it.pend && it.pend.some((x) => x > 0) && (
                              <tr>
                                <td style={{ ...tdRot, padding: 0, height: 0, overflow: "visible", verticalAlign: "top" }}>
                                  <div style={{ marginTop: -12, paddingLeft: 34, fontStyle: "italic", color: "var(--muted)", fontSize: 10.5 }}>a pagar</div>
                                </td>
                                {mesesVis.map((m) => {
                                  const pend = it.pend![m] || 0;
                                  if (pend <= 0) return <td key={m} style={{ ...tdNum, padding: 0, height: 0 }} />;
                                  return (
                                    <td key={m} className="oc-num" style={{ ...tdNum, padding: 0, height: 0, verticalAlign: "top" }}>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, lineHeight: 1, marginTop: -12 }}>
                                        <span style={{ color: "#aab2bd", fontStyle: "italic" }} title="A pagar (ainda não somado)">{fmt(pend)}</span>
                                        <span style={{ display: "inline-flex", gap: 4 }}>
                                          <button onClick={() => abrirPagarEst("pag", g.nome, it.nome, m)} title="Confirmar pagamento" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(16,185,129,.16)", color: "#10B981" }}><Check size={12} strokeWidth={3} /></button>
                                          <button onClick={() => pedirExcluir(`pagamentos a pagar de "${it.nome}" em ${MES[m]}`, () => removerPendentesMes("pag", g.nome, it.nome, m))} title="Remover" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(239,68,68,.14)", color: "#EF4444" }}><X size={12} strokeWidth={3} /></button>
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td style={{ ...tdNum, padding: 0, height: 0 }} />
                              </tr>
                            )}
                          </FragBloco>
                        ) : (
                          <FragBloco key={ii}>
                            <tr style={{ borderTop: "1px solid var(--line)" }}>
                              <NomeCel valor={it.nome} placeholder="Novo item" italico indent={30} onSalvo={salvo} onChange={(nv) => nomeItem(bi, gi, ii, nv)} onRemover={() => pedirExcluir(it.nome || "este item", () => removerItem(bi, gi, ii))} />
                              {mesesVis.map((m) => <Celula key={m} valor={it.v[m]} italico onSalvo={salvo} onChange={(nv) => editarCusto(bi, gi, ii, m, nv)} />)}
                              <td className="oc-num" style={{ ...tdNum, fontStyle: "italic", color: "var(--muted)" }}><AnimNum value={totalDe(it.v)} fmt={fmt} /></td>
                            </tr>
                            {it.pend && it.pend.some((x) => x > 0) && (
                              <tr>
                                <td style={{ ...tdRot, padding: 0, height: 0, overflow: "visible", verticalAlign: "top" }}>
                                  <div style={{ marginTop: -12, paddingLeft: 34, fontStyle: "italic", color: "var(--muted)", fontSize: 10.5 }}>a pagar</div>
                                </td>
                                {mesesVis.map((m) => {
                                  const pend = it.pend![m] || 0;
                                  if (pend <= 0) return <td key={m} style={{ ...tdNum, padding: 0, height: 0 }} />;
                                  return (
                                    <td key={m} className="oc-num" style={{ ...tdNum, padding: 0, height: 0, verticalAlign: "top" }}>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, lineHeight: 1, marginTop: -12 }}>
                                        <span style={{ color: "#aab2bd", fontStyle: "italic" }} title="A pagar (ainda não somado)">{fmt(pend)}</span>
                                        <span style={{ display: "inline-flex", gap: 4 }}>
                                          <button onClick={() => abrirPagarEst("pag", g.nome, it.nome, m)} title="Confirmar pagamento" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(16,185,129,.16)", color: "#10B981" }}><Check size={12} strokeWidth={3} /></button>
                                          <button onClick={() => pedirExcluir(`pagamentos a pagar de "${it.nome}" em ${MES[m]}`, () => removerPendentesMes("pag", g.nome, it.nome, m))} title="Remover" style={{ display: "grid", placeItems: "center", width: 17, height: 17, borderRadius: 5, cursor: "pointer", border: 0, background: "rgba(239,68,68,.14)", color: "#EF4444" }}><X size={12} strokeWidth={3} /></button>
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td style={{ ...tdNum, padding: 0, height: 0 }} />
                              </tr>
                            )}
                          </FragBloco>
                        ))}
                        {aberto && <AddSubtil span={mesesVis.length + 2} texto={`cadastrar item em "${g.nome || "grupo"}"`} onClick={() => addItem(bi, gi)} indent={30} />}
                      </FragBloco>
                    );
                  })}
                  {/* adicionar grupo: sutil, pois é um nível de somatório */}
                  {blocoAberto && <AddSubtil span={mesesVis.length + 2} texto="adicionar grupo" onClick={() => addGrupo(bi)} />}
                </FragBloco>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--line-2)", background: "var(--card-2)" }}>
                <td style={{ ...tdRot, fontWeight: 800, textTransform: "uppercase", background: "var(--card-2)" }}>Custos totais</td>
                {mesesVis.map((m) => <td key={m} className="oc-num" style={{ ...tdNum, fontWeight: 800 }}><AnimNum value={custosTotais[m]} fmt={fmt} /></td>)}
                <td className="oc-num" style={{ ...tdNum, fontWeight: 800, color: VERMELHO }}><AnimNum value={totalDe(custosTotais)} fmt={fmt} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RESULTADO · EBITDA · MARGEM */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Resultado do período" valor={totalDe(resultadoMes)} fmt={fmtR} prefix={totalDe(resultadoMes) >= 0 ? "+" : ""} cor={ROXO} />
        </div>
        <div ref={(el) => { scrolls.current[2] = el; }} onScroll={() => sincronizar(2)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<Wallet size={16} />} titulo="Resultado · EBITDA · Margem" cor={ROXO} meses={mesesVis} />
            <tbody>
              <LinhaResultado nome="Resultado (Lucro)" v={resultadoMes} total={totalDe(resultadoMes)} meses={mesesVis} moeda />
              <LinhaResultado nome="EBITDA" v={ebitdaMes} total={totalDe(ebitdaMes)} meses={mesesVis} moeda
                dica="EBITDA: lucro antes de juros, impostos, depreciação e amortização. É o resultado operacional somando de volta os custos financeiros (empréstimos e juros), pra mostrar quanto a operação gera antes desses efeitos." />
              <LinhaMargem resultado={resultadoMes} receita={recTotais} totalRes={totalDe(resultadoMes)} totalRec={totalDe(recTotais)} meses={mesesVis} />
            </tbody>
          </table>
        </div>
      </div>

      {/* aviso rápido de Ctrl+Z */}
      {desfeito && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 95, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 7, background: "#1e293b", color: "#fff", fontSize: 13, fontWeight: 700,
          padding: "9px 16px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)" }}>
          ↶ Alteração desfeita
        </div>
      )}

      {/* avisinho "Salvo" ao lado do campo, some em 1,5s — cinza neutro e discreto */}
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 90, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* barra "desfazer exclusão" — com contagem regressiva visível de 7s */}
      {desfazer && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 85,
          display: "flex", alignItems: "center", gap: 14, background: "#1e293b", color: "#fff",
          padding: "10px 12px 10px 18px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)" }}>
          <span style={{ fontSize: 13 }}>{desfazer.texto}</span>
          <button onClick={() => { desfazer.onDesfazer(); fecharDesfazer(); }}
            style={{ background: "transparent", border: 0, color: "#38BDF8", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Desfazer exclusão
          </button>
          {/* contador regressivo até 0 */}
          <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{segRestante}</span>
        </div>
      )}

      {/* confirmação de exclusão — apagar é definitivo */}
      {aExcluir && (
        <div onClick={() => setAExcluir(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: VERMELHO, flexShrink: 0 }}>
                <Trash2 size={19} />
              </span>
              <div>
                <b style={{ fontSize: 15 }}>Excluir &ldquo;{aExcluir.nome}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Esta ação é <strong>definitiva</strong> e não pode ser desfeita.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAExcluir(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} onClick={() => { aExcluir.onOk(); setAExcluir(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* popup de pagamento (a partir da Estrutura) — reflete no Calendário */}
      {pagarEst && (
        <div onClick={() => setPagarEst(null)} style={{ position: "fixed", inset: 0, zIndex: 96, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24, border: `1px solid ${VERDE}`, background: "linear-gradient(160deg, rgba(16,185,129,.08), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: VERDE, color: "#fff", flexShrink: 0 }}><Check size={22} strokeWidth={3} /></span>
              <div>
                <b style={{ fontSize: 16 }}>{pagarEst.origem === "rec" ? "Confirmar recebimento" : "Confirmar pagamento"}</b>
                <p className="sub" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{pagarEst.item} · {MES[pagarEst.mes]}/{ano}</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">{pagarEst.origem === "rec" ? "Valor recebido (R$)" : "Valor pago (R$)"}</label>
              <input value={pagarEst.valor} disabled={pagarEst.varios} onChange={(e) => setPagarEst({ ...pagarEst, valor: mascaraMoedaBR(e.target.value) })} inputMode="decimal" />
              {pagarEst.varios && <span className="sub" style={{ fontSize: 11, marginTop: 4, display: "inline-block" }}>Há mais de um lançamento neste mês; o valor de cada um é mantido.</span>}
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label className="f">{pagarEst.origem === "rec" ? "Data do recebimento" : "Data do pagamento"}</label>
              <input value={pagarEst.data} onChange={(e) => setPagarEst({ ...pagarEst, data: mascararDataBR(e.target.value) })} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} />
            </div>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 8 }}>Ao confirmar, este valor passa a ser somado na Estrutura, no DRE e nos Gráficos (e marca como {pagarEst.origem === "rec" ? "recebido" : "pago"} no Calendário).</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPagarEst(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERDE }} onClick={confirmarPagarEst}><Check size={15} /> {pagarEst.origem === "rec" ? "Confirmar recebimento" : "Confirmar pagamento"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── peças ─────────────────────────────────────────────────────────────── */
type Cols = { W_ROT: number; W_MES: number; W_TOT: number; meses: number[] };
const tdRot: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", position: "sticky", left: 0, background: "var(--card)", zIndex: 1 };
const tdNum: React.CSSProperties = { padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

/** Larguras fixas das colunas — o mesmo colgroup em todas as tabelas alinha Jan..Dez. */
function Colgroup({ c }: { c: Cols }) {
  return (
    <colgroup>
      <col style={{ width: c.W_ROT }} />
      {c.meses.map((m) => <col key={m} style={{ width: c.W_MES }} />)}
      <col style={{ width: c.W_TOT }} />
    </colgroup>
  );
}

/** Badge do total, alinhado à esquerda acima da tabela. */
function BadgeTotal({ badge, valor, fmt: fmtFn, prefix = "", cor }: { badge: string; valor: number; fmt: (n: number) => string; prefix?: string; cor: string }) {
  return (
    <div style={{ display: "inline-block", textAlign: "left", background: cor + "14", border: `1px solid ${cor}44`, borderRadius: 12, padding: "8px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: cor }}>{badge}</div>
      <b className="oc-num" style={{ fontSize: 18 }}><AnimNum value={valor} fmt={fmtFn} prefix={prefix} /></b>
    </div>
  );
}

/** Cabeçalho da tabela: o ícone + título do bloco vivem na 1ª célula desta linha. */
function THead({ icone, titulo, cor, meses }: { icone: React.ReactNode; titulo: string; cor: string; meses: number[] }) {
  const th: React.CSSProperties = { padding: "9px 10px", textAlign: "right", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", whiteSpace: "nowrap" };
  return (
    <thead>
      <tr style={{ background: "var(--card-2)" }}>
        <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: "var(--card-2)", padding: "8px 12px", whiteSpace: "normal" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: cor + "22", color: cor, flexShrink: 0 }}>{icone}</span>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: "none", letterSpacing: 0, color: "var(--txt)", lineHeight: 1.15 }}>{titulo}</span>
          </span>
        </th>
        {meses.map((m) => <th key={m} style={th}>{MES[m]}</th>)}
        <th style={th}>Total</th>
      </tr>
    </thead>
  );
}

/**
 * Rótulo com nome EDITÁVEL (canal de receita ou item de custo). A lixeira só
 * aparece quando o campo está em edição (foco), e apagar passa por confirmação.
 * `reservaChevron` guarda o espaço da setinha para as bolinhas ficarem alinhadas
 * com as dos grupos (que têm o chevron de expandir).
 */
function NomeCel({ cor, valor, placeholder, onChange, onRemover, italico, indent, reservaChevron, onSalvo, lider, peso }: {
  cor?: string; valor: string; placeholder: string; onChange: (v: string) => void; onRemover?: () => void; italico?: boolean; indent?: number; reservaChevron?: boolean; onSalvo?: (el: HTMLElement) => void; lider?: React.ReactNode; peso?: number;
}) {
  const [focado, setFocado] = useState(false);
  const inicial = useRef("");
  return (
    <td style={{ ...tdRot, fontWeight: italico ? 400 : (peso ?? 500), fontStyle: italico ? "italic" : undefined, color: italico ? "var(--muted)" : undefined, paddingLeft: indent }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
        {lider}
        {reservaChevron && !lider && <span style={{ width: 13, flexShrink: 0 }} />}
        {cor && <span style={{ width: 7, height: 7, borderRadius: 99, background: cor, flexShrink: 0 }} />}
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, minWidth: 40, background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "3px 5px", font: "inherit", fontStyle: italico ? "italic" : undefined, color: "inherit", outline: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          onFocus={(e) => { setFocado(true); inicial.current = valor; e.currentTarget.style.borderColor = "var(--line-2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; if (valor !== inicial.current) onSalvo?.(e.currentTarget); setTimeout(() => setFocado(false), 150); }} />
        {onRemover && focado && (
          <button onMouseDown={(e) => e.preventDefault()} onClick={onRemover} title="Excluir" aria-label="Excluir"
            style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--red)", cursor: "pointer", padding: 2, borderRadius: 5, lineHeight: 0 }}>
            <Trash2 size={13} />
          </button>
        )}
      </span>
    </td>
  );
}

/** Nome de uma linha vinda do Calendário: mesmo padrão do item (edita ao clicar,
 * lixeira só no foco, "Salvo" ao mudar), com um "i" de observação no lugar do badge. */
function CalNomeCel({ nome, onRenomear, onRemover, onSalvo, cor, italico, indent, reservaChevron }: {
  nome: string; onRenomear: (novo: string) => void; onRemover: () => void; onSalvo?: (el: HTMLElement) => void;
  cor?: string; italico?: boolean; indent?: number; reservaChevron?: boolean;
}) {
  const [val, setVal] = useState(nome);
  const [focado, setFocado] = useState(false);
  const inicial = useRef("");
  useEffect(() => { setVal(nome); }, [nome]);
  return (
    <td style={{ ...tdRot, fontWeight: italico ? 400 : 500, fontStyle: italico ? "italic" : undefined, color: italico ? "var(--muted)" : undefined, paddingLeft: indent }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
        {reservaChevron && <span style={{ width: 13, flexShrink: 0 }} />}
        {cor && <span style={{ width: 7, height: 7, borderRadius: 99, background: cor, flexShrink: 0 }} />}
        <input value={val} onChange={(e) => setVal(e.target.value)}
          style={{ flex: 1, minWidth: 40, background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "3px 5px", font: "inherit", fontStyle: italico ? "italic" : undefined, color: "inherit", outline: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          onFocus={(e) => { setFocado(true); inicial.current = val; e.currentTarget.style.borderColor = "var(--line-2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; const nv = val.trim(); if (nv && nv !== inicial.current) { onRenomear(nv); onSalvo?.(e.currentTarget); } else if (!nv) setVal(inicial.current); setTimeout(() => setFocado(false), 150); }} />
        {focado && (
          <button onMouseDown={(e) => e.preventDefault()} onClick={onRemover} title="Excluir (atualiza no Calendário)" aria-label="Excluir"
            style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--red)", cursor: "pointer", padding: 2, borderRadius: 5, lineHeight: 0 }}>
            <Trash2 size={13} />
          </button>
        )}
      </span>
    </td>
  );
}

/**
 * Rótulo do GRUPO: mais restrito que o item. Clicar expande/recolhe. Só quando
 * está aberto surge um lápis quase transparente; clicando nele é que o nome vira
 * editável (e aparece a lixeira). Fora disso, o nome é só texto clicável.
 */
function GrupoCel({ cor, valor, aberto, onToggle, onChange, onSalvo, onRemover }: {
  cor: string; valor: string; aberto: boolean; onToggle: () => void; onChange: (v: string) => void; onSalvo?: (el: HTMLElement) => void; onRemover?: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const inicial = useRef("");
  return (
    <td style={{ ...tdRot, fontWeight: 600 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
        <Chevron aberto={aberto} onClick={onToggle} />
        <span style={{ width: 7, height: 7, borderRadius: 99, background: cor, flexShrink: 0 }} />
        {editando ? (
          <>
            <input autoFocus value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Nome do grupo"
              style={{ flex: 1, minWidth: 40, background: "transparent", border: "1px solid var(--line-2)", borderRadius: 6, padding: "3px 5px", font: "inherit", fontWeight: 600, color: "inherit", outline: "none" }}
              onBlur={(e) => { if (valor !== inicial.current) onSalvo?.(e.currentTarget); setEditando(false); }} />
            {onRemover && (
              // lixeira encostada à direita, longe de onde estava o lápis, para não apagar por engano num clique repetido
              <button onMouseDown={(e) => e.preventDefault()} onClick={onRemover} title="Excluir grupo" aria-label="Excluir grupo"
                style={{ flexShrink: 0, marginLeft: 6, background: "rgba(239,68,68,.1)", border: 0, color: "var(--red)", cursor: "pointer", padding: 4, borderRadius: 7, lineHeight: 0 }}>
                <Trash2 size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            {/* nome + lápis logo ao lado; o resto da linha é área de clique para expandir */}
            <span onClick={onToggle} style={{ cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
              {valor || <span style={{ color: "var(--muted)", fontWeight: 400 }}>Novo grupo</span>}
            </span>
            {aberto && (
              <button onClick={() => { inicial.current = valor; setEditando(true); }} title="Editar grupo" aria-label="Editar grupo"
                style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 2, lineHeight: 0, opacity: .3, transition: ".15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = ".3")}>
                <Pencil size={12} />
              </button>
            )}
            <span onClick={onToggle} style={{ flex: 1, alignSelf: "stretch", cursor: "pointer" }} />
          </>
        )}
      </span>
    </td>
  );
}

/** Setinha de expandir/recolher o grupo (não dispara a edição do nome). */
function Chevron({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={aberto ? "Recolher" : "Expandir"}
      style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 0, display: "grid", placeItems: "center" }}>
      {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
    </button>
  );
}

/** Adicionar sutil (grupo, item ou canal de venda) — mesmo padrão em toda a tela. */
function AddSubtil({ span, texto, onClick, indent }: { span: number; texto: string; onClick: () => void; indent?: number }) {
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td colSpan={span} style={{ padding: "5px 12px", paddingLeft: indent ?? 12 }}>
        <button onClick={onClick}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: 0, color: "var(--muted)", borderRadius: 6, padding: "3px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: .7, transition: ".15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--brand)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = ".7"; e.currentTarget.style.color = "var(--muted)"; }}>
          <Plus size={12} /> {texto}
        </button>
      </td>
    </tr>
  );
}

/** Célula editável de valor. Mostra "–" no zero e vira input ao focar. */
function Celula({ valor, onChange, italico, onSalvo }: { valor: number; onChange: (v: number) => void; italico?: boolean; onSalvo?: (el: HTMLElement) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  const editando = txt !== null;
  const selfEdit = useRef(false);
  // anima ao mudar por fora (confirmar/excluir); não anima enquanto o próprio usuário digita
  const disp = useCountUp(valor, 2000, !editando && !selfEdit.current);
  return (
    <td className="oc-num" style={{ ...tdNum, fontStyle: italico ? "italic" : undefined, color: italico ? "var(--muted)" : undefined, padding: "6px 4px" }}>
      <input
        value={editando ? txt! : (Math.abs(disp) < 0.005 ? "" : fmt(disp))}
        placeholder="–"
        onFocus={(e) => { setTxt(Math.abs(valor) < 0.005 ? "" : fmt(valor)); e.currentTarget.style.borderColor = "var(--line-2)"; }}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => {
          if (editando) { const nv = parseBR(txt!); if (nv !== valor) { selfEdit.current = true; onChange(nv); onSalvo?.(e.currentTarget); setTimeout(() => { selfEdit.current = false; }, 60); } }
          setTxt(null); e.currentTarget.style.borderColor = "transparent";
        }}
        inputMode="decimal"
        style={{
          width: "100%", boxSizing: "border-box", textAlign: "right", background: "transparent", border: "1px solid transparent", borderRadius: 7,
          padding: "4px 5px", font: "inherit", fontStyle: italico ? "italic" : undefined, color: "inherit", outline: "none",
          fontVariantNumeric: "tabular-nums",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
        onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
      />
    </td>
  );
}

function Total({ children }: { children: React.ReactNode }) {
  return <td className="oc-num" style={{ ...tdNum, fontWeight: 700 }}>{children}</td>;
}

// só para agrupar linhas sem quebrar a tabela
function FragBloco({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function LinhaResultado({ nome, v, total, meses, moeda, dica }: { nome: string; v: number[]; total: number; meses: number[]; moeda?: boolean; dica?: string }) {
  const cor = (n: number) => (n >= 0 ? VERDE : VERMELHO);
  const f = (n: number) => (moeda ? `${n >= 0 ? "" : "-"}R$ ${Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fmt(n));
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ ...tdRot, fontWeight: 700 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {nome}
          {dica && <span title={dica} style={{ display: "inline-grid", placeItems: "center", cursor: "help", color: "var(--muted)" }}><Info size={13} /></span>}
        </span>
      </td>
      {meses.map((m) => <td key={m} className="oc-num" style={{ ...tdNum, fontWeight: 700, color: Math.abs(v[m]) > 0.005 ? cor(v[m]) : "var(--muted)" }}><AnimNum value={v[m]} fmt={(n) => Math.abs(n) < 0.005 ? "–" : f(n)} /></td>)}
      <td className="oc-num" style={{ ...tdNum, fontWeight: 800, color: cor(total) }}><AnimNum value={total} fmt={f} /></td>
    </tr>
  );
}

function LinhaMargem({ resultado, receita, totalRes, totalRec, meses }: { resultado: number[]; receita: number[]; totalRes: number; totalRec: number; meses: number[] }) {
  const pct = (r: number, rec: number) => (rec > 0 ? (r / rec) * 100 : 0);
  const cor = (n: number) => (n >= 0 ? VERDE : VERMELHO);
  const totalPct = pct(totalRes, totalRec);
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ ...tdRot, fontWeight: 700 }}>Margem líquida</td>
      {meses.map((m) => {
        const p = pct(resultado[m], receita[m]);
        const vazio = Math.abs(receita[m]) < 0.005;
        return <td key={m} className="oc-num" style={{ ...tdNum, fontWeight: 700, color: vazio ? "var(--muted)" : cor(p) }}>{vazio ? "–" : <AnimNum value={p} fmt={(n) => `${Math.round(n)}%`} />}</td>;
      })}
      <td className="oc-num" style={{ ...tdNum, fontWeight: 800, color: cor(totalPct) }}><AnimNum value={totalPct} fmt={(n) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} /></td>
    </tr>
  );
}
