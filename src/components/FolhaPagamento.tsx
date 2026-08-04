"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Info, Printer, User, Users, ArrowUpRight, X, Search, ChevronsUpDown, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Empresa, Funcionario, getFuncionarios, updateFuncionario } from "@/lib/db";
import { brl } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";
import { navegar } from "@/lib/nav";
import { MES } from "@/app/minhasmetricas/financas-estrutura";
import SeletorAno from "./SeletorAno";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Converte "1.234,56" / "1234.56" / "1234,56" em número. */
function parseNum(v: string): number {
  const s = (v || "").replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(s) || 0;
}
const num2 = (n: number) => (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Tabela INSS 2026 (progressiva, por faixa) — teto R$ 8.475,55 (desconto máx. R$ 988,09).
const INSS_TETO = 8475.55;
const INSS_FAIXAS: [number, number][] = [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
/** Linhas da tabela oficial 2026 para o pop-up explicativo (com a "parcela a deduzir" da fórmula rápida). */
const INSS_TABELA = [
  { faixa: "Até R$ 1.621,00", aliq: "7,5%", ded: "R$ 0,00" },
  { faixa: "De R$ 1.621,01 até R$ 2.902,84", aliq: "9,0%", ded: "R$ 24,32" },
  { faixa: "De R$ 2.902,85 até R$ 4.354,27", aliq: "12,0%", ded: "R$ 111,40" },
  { faixa: "De R$ 4.354,28 até R$ 8.475,55", aliq: "14,0%", ded: "R$ 198,49" },
];
/** INSS progressivo (tabela 2026), com teto na última faixa (máx. R$ 988,09). */
function calcINSS(bruto: number): number {
  let ant = 0, inss = 0;
  for (const [teto, aliq] of INSS_FAIXAS) {
    if (bruto > ant) { inss += (Math.min(bruto, teto) - ant) * aliq; ant = teto; } else break;
  }
  return round2(inss);
}
// Tabela IRRF 2026 (base = bruto − INSS): [teto da base, alíquota, parcela a deduzir]
const IRRF_FAIXAS: [number, number, number][] = [
  [2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73],
];
/** Linhas da tabela oficial 2026 para o pop-up explicativo. */
const IRRF_TABELA = [
  { faixa: "Até R$ 2.428,80", aliq: "Isento", ded: "R$ 0,00" },
  { faixa: "De R$ 2.428,81 até R$ 2.826,65", aliq: "7,5%", ded: "R$ 182,16" },
  { faixa: "De R$ 2.826,66 até R$ 3.751,05", aliq: "15,0%", ded: "R$ 394,16" },
  { faixa: "De R$ 3.751,06 até R$ 4.664,68", aliq: "22,5%", ded: "R$ 675,49" },
  { faixa: "Acima de R$ 4.664,68", aliq: "27,5%", ded: "R$ 908,73" },
];
/**
 * IRRF mensal 2026: tabela progressiva sobre a base (bruto − INSS) + Redutor Adicional.
 * Isenção total até R$ 5.000 de rendimento; redução parcial até R$ 7.350; acima, só a tabela.
 */
function calcIRRF(bruto: number, inss: number): number {
  const base = bruto - inss;
  let imposto = 0;
  for (const [teto, aliq, ded] of IRRF_FAIXAS) if (base <= teto) { imposto = Math.max(0, base * aliq - ded); break; }
  // Redutor adicional (regra 2026), com base no rendimento mensal bruto.
  if (bruto <= 5000) return 0;                                   // isenção total até R$ 5.000
  let redutor = 0;
  if (bruto <= 7350) redutor = Math.max(0, 978.62 - 0.133145 * bruto);  // redução parcial
  return round2(Math.max(0, imposto - redutor));
}

type Config = { vtPct: number; fgtsPct: number };
const CONFIG_PADRAO: Config = { vtPct: 6, fgtsPct: 8 };
const chaveCfg = (id?: string | null) => `me_folha_config:${id || "default"}`;
function lerCfg(id?: string | null): Config {
  if (typeof window === "undefined") return { ...CONFIG_PADRAO };
  try { return { ...CONFIG_PADRAO, ...JSON.parse(localStorage.getItem(chaveCfg(id)) || "{}") }; } catch { return { ...CONFIG_PADRAO }; }
}

// ---- variáveis do mês (comissão, descontos etc.), por empresa/mês/pessoa ----
type VarsMes = { comissao: number; horaExtra: number; gratificacao: number; sindicato: number; planoSaude: number; mensalidade: number; adiantamento: number; extra?: Record<string, number> };
const VARS_ZERO: VarsMes = { comissao: 0, horaExtra: 0, gratificacao: 0, sindicato: 0, planoSaude: 0, mensalidade: 0, adiantamento: 0 };

// ---- colunas personalizadas (proventos/descontos extras), por empresa ----
type Col = { id: string; nome: string };
type ColsFolha = { prov: Col[]; desc: Col[] };
const COLS_VAZIO: ColsFolha = { prov: [], desc: [] };
const chaveCols = (id: string | null | undefined) => `me_folha_colunas:${id || "default"}`;
function lerCols(id: string | null | undefined): ColsFolha {
  if (typeof window === "undefined") return { prov: [], desc: [] };
  try { return { ...COLS_VAZIO, ...JSON.parse(localStorage.getItem(chaveCols(id)) || "{}") }; } catch { return { prov: [], desc: [] }; }
}
function salvarCols(id: string | null | undefined, c: ColsFolha) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(c); localStorage.setItem(chaveCols(id), cru); salvarEstadoRemoto(chaveCols(id), cru);
}
function novoIdCol(): string { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
const chaveMes = (id: string | null | undefined, ym: string) => `me_folha_mensal:${id || "default"}:${ym}`;
function lerMes(id: string | null | undefined, ym: string): Record<string, VarsMes> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(chaveMes(id, ym)) || "{}") || {}; } catch { return {}; }
}
function salvarMes(id: string | null | undefined, ym: string, dados: Record<string, VarsMes>) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(dados); localStorage.setItem(chaveMes(id, ym), cru); salvarEstadoRemoto(chaveMes(id, ym), cru);
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ---- benefícios por pessoa (vale transporte / vale alimentação), por empresa ----
// Cada benefício pode ser em % do salário ou valor fixo. Ausente = zerado.
type BenefItem = { modo: "pct" | "fixo"; valor: number };
type Benef = { vt?: BenefItem; va?: BenefItem };
/** Aceita o formato antigo (número = fixo) e o novo (objeto). */
function itemDe(x: BenefItem | number | undefined): BenefItem | undefined {
  if (x == null) return undefined;
  if (typeof x === "number") return x ? { modo: "fixo", valor: x } : undefined;
  return x;
}
/** Valor em R$ do benefício, dado o salário. */
function efetivoBenef(it: BenefItem | undefined, salario: number): number {
  if (!it || !it.valor) return 0;
  return it.modo === "pct" ? round2(salario * it.valor / 100) : round2(it.valor);
}
const chaveBenef = (id: string | null | undefined) => `me_folha_beneficios:${id || "default"}`;
function lerBenef(id: string | null | undefined): Record<string, Benef> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(chaveBenef(id)) || "{}") || {}; } catch { return {}; }
}
function salvarBenef(id: string | null | undefined, dados: Record<string, Benef>) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(dados); localStorage.setItem(chaveBenef(id), cru); salvarEstadoRemoto(chaveBenef(id), cru);
}

/** Campo de dinheiro editável no nosso padrão: clica, digita e salva ao sair. */
function CampoMoeda({ valor, onSalvar }: { valor: number; onSalvar: (n: number) => void }) {
  return (
    <input defaultValue={valor ? num2(valor) : ""} placeholder="0,00" inputMode="decimal"
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.select(); }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; const n = round2(parseNum(e.target.value)); e.target.value = n ? num2(n) : ""; if (n !== valor) onSalvar(n); }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", textAlign: "right", transition: "background .12s" }} />
  );
}
/** Benefício (VT/VA) por pessoa: escolha % ou R$ fixo + valor. Vazio/0 = zerado. */
function CampoBeneficio({ item, salario, onChange }: { item?: BenefItem; salario: number; onChange: (it: BenefItem | undefined) => void }) {
  const modo = item?.modo || "fixo";
  const valor = item?.valor || 0;
  const efet = efetivoBenef(item, salario);
  const setModo = (m: "pct" | "fixo") => onChange(valor ? { modo: m, valor } : { modo: m, valor: 0 });
  const setValor = (n: number) => onChange(n ? { modo, valor: n } : undefined);
  const btn = (m: "pct" | "fixo", txt: string) => (
    <button onClick={() => setModo(m)} title={m === "pct" ? "Percentual do salário" : "Valor fixo em reais"}
      style={{ padding: "1px 6px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: 0, background: modo === m ? "var(--brand)" : "transparent", color: modo === m ? "var(--brand-ct,#fff)" : "var(--muted)" }}>{txt}</button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
        <span style={{ display: "inline-flex", gap: 1, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 7, padding: 1 }}>{btn("pct", "%")}{btn("fixo", "R$")}</span>
        <input defaultValue={valor ? num2(valor) : ""} key={`${modo}-${valor}`} placeholder={modo === "pct" ? "0" : "0,00"} inputMode="decimal"
          onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.select(); }}
          onBlur={(e) => { e.currentTarget.style.background = "transparent"; const n = round2(parseNum(e.target.value)); e.target.value = n ? num2(n) : ""; if (n !== valor) setValor(n); }}
          style={{ border: 0, outline: "none", background: "transparent", padding: "3px 4px", borderRadius: 6, width: 62, minWidth: 0, font: "inherit", color: "inherit", textAlign: "right", transition: "background .12s" }} />
      </div>
      {modo === "pct" && valor > 0 && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>= {brl(efet)}</span>}
    </div>
  );
}

/** Campo de texto editável (departamento). */
function CampoTexto({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => void }) {
  return (
    <input defaultValue={valor} placeholder="—"
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; const v = e.target.value.trim(); if (v !== valor) onSalvar(v); }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", transition: "background .12s" }} />
  );
}

/** Botão que leva ao cadastro da equipe (Configurações › Equipe). */
function LinkEquipe({ texto = "Cadastrar / gerenciar equipe", cheio = false }: { texto?: string; cheio?: boolean }) {
  return (
    <button onClick={() => navegar({ view: "config", aba: "equipe" })}
      className={cheio ? "btn sm" : undefined}
      style={cheio ? { display: "inline-flex", alignItems: "center", gap: 6 } : { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)", padding: "7px 13px", borderRadius: 99 }}>
      <Users size={14} /> {texto} <ArrowUpRight size={13} />
    </button>
  );
}

const iniciaisDe = (n: string) => n.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);

export default function FolhaPagamento({ empresa = null }: { empresa?: Empresa | null }) {
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [cfg, setCfg] = useState<Config>(() => lerCfg(empresa?.id));
  const [carregado, setCarregado] = useState(false);
  const [modo, setModo] = useState<"geral" | "mensal">("geral");
  const [ym, setYm] = useState<string>("");   // "YYYY-MM" — definido no cliente para evitar divergência de hidratação
  const [dadosMes, setDadosMes] = useState<Record<string, VarsMes>>({});
  const [benef, setBenef] = useState<Record<string, Benef>>({});
  const [cols, setCols] = useState<ColsFolha>({ prov: [], desc: [] });
  const [infoInss, setInfoInss] = useState(false);
  const [infoIrrf, setInfoIrrf] = useState(false);
  const [confirmCol, setConfirmCol] = useState<{ grupo: "prov" | "desc"; id: string; nome: string } | null>(null);
  const [avisoCol, setAvisoCol] = useState<{ titulo: string; texto: string } | null>(null);
  const BtnInfo = ({ onClick, titulo }: { onClick: () => void; titulo: string }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={titulo} className="no-print"
      style={{ marginLeft: 5, verticalAlign: "middle", width: 16, height: 16, borderRadius: "50%", display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", padding: 0 }}>
      <Info size={11} />
    </button>
  );
  const BtnInfoInss = () => <BtnInfo onClick={() => setInfoInss(true)} titulo="Como o INSS é calculado" />;
  const BtnInfoIrrf = () => <BtnInfo onClick={() => setInfoIrrf(true)} titulo="Como o IRRF é calculado" />;

  const carregar = () => getFuncionarios().then((f) => { setFuncs(f); setCarregado(true); }).catch(() => setCarregado(true));
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { setCfg(lerCfg(empresa?.id)); }, [empresa?.id]);
  useEffect(() => { const d = new Date(); setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }, []);
  useEffect(() => { if (ym) setDadosMes(lerMes(empresa?.id, ym)); }, [empresa?.id, ym]);
  useEffect(() => { setBenef(lerBenef(empresa?.id)); }, [empresa?.id]);
  useEffect(() => { setCols(lerCols(empresa?.id)); }, [empresa?.id]);

  const upCols = (c: ColsFolha) => { setCols(c); salvarCols(empresa?.id, c); };
  const addCol = (grupo: "prov" | "desc") => upCols({ ...cols, [grupo]: [...cols[grupo], { id: novoIdCol(), nome: grupo === "prov" ? "Novo provento" : "Novo desconto" }] });
  const renomearCol = (grupo: "prov" | "desc", id: string, nome: string) => upCols({ ...cols, [grupo]: cols[grupo].map((c) => c.id === id ? { ...c, nome } : c) });
  const removerCol = (grupo: "prov" | "desc", id: string) => upCols({ ...cols, [grupo]: cols[grupo].filter((c) => c.id !== id) });
  // uma coluna tem dados se qualquer pessoa, em qualquer mês, tiver valor lançado nela
  const colTemDados = (id: string): boolean => {
    if (typeof window === "undefined") return false;
    const prefixo = chaveMes(empresa?.id, "");
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefixo)) continue;
      try {
        const obj = JSON.parse(localStorage.getItem(k) || "{}") as Record<string, VarsMes>;
        for (const fid in obj) { const ex = obj[fid]?.extra; if (ex && Number(ex[id]) > 0) return true; }
      } catch { /* ignore */ }
    }
    return false;
  };
  const pedirRemoverCol = (grupo: "prov" | "desc", id: string, nome: string) => {
    if (colTemDados(id)) {
      setAvisoCol({ titulo: "Coluna com valores lançados", texto: `A coluna “${nome || "sem nome"}” já tem valores em pelo menos um mês. Zere esses valores antes de excluir a coluna, para não perder lançamentos.` });
      return;
    }
    setConfirmCol({ grupo, id, nome });
  };
  const setExtra = (id: string, colId: string, valor: number) => {
    setDadosMes((prev) => { const cur = prev[id] || {}; const extra = { ...(cur.extra || {}), [colId]: valor }; const next = { ...prev, [id]: { ...VARS_ZERO, ...cur, extra } }; salvarMes(empresa?.id, ym, next); return next; });
  };
  // cabeçalhos das colunas extras (nome editável + remover) e o botão "+"
  const thsCol = (grupo: "prov" | "desc") => cols[grupo].map((c) => (
    <th key={c.id} className="eq-th" style={{ textAlign: "right", minWidth: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
        <input defaultValue={c.nome} title="Renomear coluna" onBlur={(e) => renomearCol(grupo, c.id, e.target.value.trim() || c.nome)}
          style={{ border: 0, outline: "none", background: "transparent", font: "inherit", color: "inherit", textAlign: "right", width: 96, padding: "2px 4px", borderRadius: 6 }} />
        <button title="Excluir coluna" onClick={() => pedirRemoverCol(grupo, c.id, c.nome)} className="no-print"
          style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: "#EF4444" }}><X size={11} /></button>
      </div>
    </th>
  ));
  const thMais = (grupo: "prov" | "desc") => (
    <th className="eq-th no-print" style={{ textAlign: "center", width: 44 }}>
      <button title={grupo === "prov" ? "Adicionar provento" : "Adicionar desconto"} onClick={() => addCol(grupo)}
        style={{ width: 24, height: 24, borderRadius: 7, display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)" }}><Plus size={14} /></button>
    </th>
  );
  const tdsCol = (grupo: "prov" | "desc", fid: string, extra: Record<string, number>) => cols[grupo].map((c) => (
    <td key={c.id}><CampoMoeda valor={extra[c.id] || 0} onSalvar={(n) => setExtra(fid, c.id, n)} /></td>
  ));
  const tdsVazias = (grupo: "prov" | "desc") => [...cols[grupo].map((c) => <td key={c.id} />), <td key={`mais-${grupo}`} />];

  // VT/VA por pessoa: em % do salário ou valor fixo; ausente = zerado.
  const benefItem = (f: Funcionario, campo: keyof Benef) => itemDe(benef[f.id]?.[campo] as BenefItem | number | undefined);
  const vtDe = (f: Funcionario) => efetivoBenef(benefItem(f, "vt"), f.salario || 0);
  const vaDe = (f: Funcionario) => efetivoBenef(benefItem(f, "va"), f.salario || 0);
  const setBeneficio = (id: string, campo: keyof Benef, item: BenefItem | undefined) => {
    setBenef((prev) => {
      const cur = { ...(prev[id] || {}) };
      if (item) cur[campo] = item; else delete cur[campo];
      const next = { ...prev, [id]: cur }; salvarBenef(empresa?.id, next); return next;
    });
  };

  async function salvarSalario(id: string, salario: number) { await updateFuncionario(id, { salario }); carregar(); }
  async function salvarDepto(id: string, departamento: string) { await updateFuncionario(id, { departamento: departamento || null }); carregar(); }
  const varsDe = (id: string): VarsMes => ({ ...VARS_ZERO, ...(dadosMes[id] || {}) });
  const setVar = (id: string, campo: keyof VarsMes, valor: number) => {
    setDadosMes((prev) => { const next = { ...prev, [id]: { ...VARS_ZERO, ...(prev[id] || {}), [campo]: valor } }; salvarMes(empresa?.id, ym, next); return next; });
  };

  // busca + ordenação por coluna (padrão da Equipe)
  const [busca, setBusca] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ordenarPor = (c: string) => { if (sortCol === c) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortCol(c); setSortDir("asc"); } };
  const seta = (k: string) => sortCol !== k
    ? <ChevronsUpDown size={12} style={{ opacity: .4, verticalAlign: "middle" }} />
    : (sortDir === "asc" ? <ChevronUp size={12} style={{ color: "var(--brand)", verticalAlign: "middle" }} /> : <ChevronDown size={12} style={{ color: "var(--brand)", verticalAlign: "middle" }} />);
  const bq = busca.trim().toLowerCase();
  const combina = (f: Funcionario) => !bq || [f.nome, f.departamento, f.cargo].some((x) => (x || "").toLowerCase().includes(bq));
  function ordenar<T>(arr: T[], val: (l: T) => string | number): T[] {
    if (!sortCol) return arr;
    return [...arr].sort((a, b) => {
      const va = val(a), vb = val(b);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true });
      return sortDir === "asc" ? r : -r;
    });
  }

  const ativos = useMemo(() => funcs.filter((f) => f.ativo), [funcs]);

  // ---- linhas da visão GERAL (só salário base) ----
  const linhasGeral = useMemo(() => ativos.map((f) => {
    const bruto = f.salario || 0;
    const vt = vtDe(f);
    const va = vaDe(f);
    const inss = calcINSS(bruto);
    const irrf = calcIRRF(bruto, inss);
    const totalDesc = round2(vt + inss + irrf);
    const liquido = round2(bruto - totalDesc);
    const provisao = round2(bruto / 12 + (bruto + bruto / 3) / 12);
    const fgts = round2(bruto * (cfg.fgtsPct / 100));
    return { f, bruto, vt, va, inss, irrf, totalDesc, liquido, provisao, fgts };
  }), [ativos, cfg, benef]);
  const totG = linhasGeral.reduce((a, l) => ({ bruto: a.bruto + l.bruto, vt: a.vt + l.vt, va: a.va + l.va, inss: a.inss + l.inss, irrf: a.irrf + l.irrf, totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido, provisao: a.provisao + l.provisao, fgts: a.fgts + l.fgts }), { bruto: 0, vt: 0, va: 0, inss: 0, irrf: 0, totalDesc: 0, liquido: 0, provisao: 0, fgts: 0 });
  const custoTotal = round2(totG.bruto + totG.provisao + totG.fgts + totG.va);
  const geralView = ordenar(linhasGeral.filter((l) => combina(l.f)), (l) => {
    switch (sortCol) {
      case "nome": return l.f.nome || ""; case "departamento": return l.f.departamento || l.f.cargo || "";
      case "bruto": return l.bruto; case "vt": return l.vt; case "va": return l.va; case "inss": return l.inss;
      case "irrf": return l.irrf; case "totalDesc": return l.totalDesc; case "liquido": return l.liquido;
      case "provisao": return l.provisao; case "fgts": return l.fgts; default: return "";
    }
  });

  // ---- linhas da visão MENSAL (com variáveis do mês) ----
  const linhasMes = useMemo(() => ativos.map((f) => {
    const base = f.salario || 0;
    const v = { ...VARS_ZERO, ...(dadosMes[f.id] || {}) };
    const extra = v.extra || {};
    const provExtra = cols.prov.reduce((s, c) => s + (extra[c.id] || 0), 0);
    const descExtra = cols.desc.reduce((s, c) => s + (extra[c.id] || 0), 0);
    const proventos = round2(base + v.comissao + v.horaExtra + v.gratificacao + provExtra);
    const inss = calcINSS(proventos);
    const irrf = calcIRRF(proventos, inss);
    const vt = vtDe(f);
    const descManual = round2(v.sindicato + v.planoSaude + v.mensalidade + v.adiantamento + descExtra);
    const totalDesc = round2(inss + irrf + vt + descManual);
    const liquido = round2(proventos - totalDesc);
    return { f, v, extra, base, proventos, inss, irrf, vt, totalDesc, liquido };
  }), [ativos, dadosMes, cfg, benef, cols]);
  const totM = linhasMes.reduce((a, l) => ({ proventos: a.proventos + l.proventos, inss: a.inss + l.inss, irrf: a.irrf + l.irrf, vt: a.vt + l.vt, totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido }), { proventos: 0, inss: 0, irrf: 0, vt: 0, totalDesc: 0, liquido: 0 });
  const mesView = ordenar(linhasMes.filter((l) => combina(l.f)), (l) => {
    switch (sortCol) {
      case "nome": return l.f.nome || ""; case "base": return l.base;
      case "comissao": return l.v.comissao; case "horaExtra": return l.v.horaExtra; case "gratificacao": return l.v.gratificacao;
      case "proventos": return l.proventos; case "inss": return l.inss; case "irrf": return l.irrf; case "vt": return l.vt;
      case "sindicato": return l.v.sindicato; case "planoSaude": return l.v.planoSaude; case "mensalidade": return l.v.mensalidade;
      case "adiantamento": return l.v.adiantamento; case "totalDesc": return l.totalDesc; case "liquido": return l.liquido; default: return "";
    }
  });

  const imprimir = () => window.print();
  const mesAtualIdx = ym ? Number(ym.slice(5, 7)) - 1 : 0;
  const anoAtual = ym ? ym.slice(0, 4) : "";

  const seg = (k: "geral" | "mensal", txt: string) => (
    <button onClick={() => setModo(k)} style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0, background: modo === k ? "color-mix(in srgb, var(--brand) 14%, transparent)" : "transparent", color: modo === k ? "var(--brand)" : "var(--muted)", transition: ".15s" }}>{txt}</button>
  );

  const semEquipe = carregado && ativos.length === 0;

  return (
    <div>
      {/* barra de topo: alternância Geral/Mensal + ações */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 99, padding: 2 }}>
          {seg("geral", "Preenchimento geral")}
          {seg("mensal", "Folha mensal")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <LinkEquipe />
          <button className="btn ghost sm" onClick={imprimir} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={15} /> Imprimir / PDF</button>
        </div>
      </div>

      {/* barra de ano + meses (estilo Dashboard): seleciona 1 mês */}
      {modo === "mensal" && !semEquipe && ym && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <SeletorAno ano={Number(anoAtual)} setAno={(a) => setYm(`${a}-${String(mesAtualIdx + 1).padStart(2, "0")}`)} />
          {MES.map((nome, m) => {
            const on = m === mesAtualIdx;
            return (
              <button key={m} onClick={() => setYm(`${anoAtual}-${String(m + 1).padStart(2, "0")}`)}
                style={{ padding: "7px 15px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-ct,#fff)" : "var(--muted)" }}>
                {nome}
              </button>
            );
          })}
        </div>
      )}

      {semEquipe ? (
        <div className="card" style={{ padding: 30, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Wallet size={26} /></span>
          <b style={{ fontSize: 16 }}>Nenhuma pessoa cadastrada ainda</b>
          <p className="sub" style={{ margin: 0, maxWidth: 420, lineHeight: 1.55 }}>A folha usa a sua equipe. Cadastre os funcionários e depois volte aqui para lançar salários e variáveis do mês.</p>
          <LinkEquipe texto="Cadastrar funcionários" cheio />
        </div>
      ) : modo === "geral" ? (
        <>
          <div className="no-print" style={{ position: "relative", maxWidth: 400, marginBottom: 14 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou departamento…" style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10 }} />
          </div>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 14px 36px -26px rgba(0,0,0,.45)" }}>
            <table className="eq-tab" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
              <thead>
                <tr>
                  <th className="eq-th" onClick={() => ordenarPor("nome")}>Nome {seta("nome")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("departamento")}>Departamento {seta("departamento")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("bruto")} style={{ textAlign: "right" }}>Salário bruto {seta("bruto")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("vt")} style={{ textAlign: "right" }}>Vale transporte {seta("vt")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("va")} style={{ textAlign: "right" }}>Vale alimentação {seta("va")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("inss")} style={{ textAlign: "right" }}>INSS {seta("inss")}<BtnInfoInss /></th>
                  <th className="eq-th" onClick={() => ordenarPor("irrf")} style={{ textAlign: "right" }}>IRRF {seta("irrf")}<BtnInfoIrrf /></th>
                  <th className="eq-th" onClick={() => ordenarPor("totalDesc")} style={{ textAlign: "right" }}>Total descontos {seta("totalDesc")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("liquido")} style={{ textAlign: "right" }}>Salário líquido {seta("liquido")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("provisao")} style={{ textAlign: "right" }}>13º + Férias {seta("provisao")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("fgts")} style={{ textAlign: "right" }}>FGTS {seta("fgts")}</th>
                </tr>
              </thead>
              <tbody>
                {geralView.map(({ f, bruto, inss, irrf, totalDesc, liquido, provisao, fgts }) => (
                  <tr key={f.id} className="eq-row">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", fontWeight: 800, fontSize: 11 }}>{iniciaisDe(f.nome) || <User size={15} />}</span>
                        <b style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome || "—"}</b>
                      </div>
                    </td>
                    <td><CampoTexto valor={f.departamento || f.cargo || ""} onSalvar={(v) => salvarDepto(f.id, v)} /></td>
                    <td style={{ fontWeight: 700 }}><CampoMoeda valor={bruto} onSalvar={(n) => salvarSalario(f.id, n)} /></td>
                    <td><CampoBeneficio item={benefItem(f, "vt")} salario={bruto} onChange={(it) => setBeneficio(f.id, "vt", it)} /></td>
                    <td><CampoBeneficio item={benefItem(f, "va")} salario={bruto} onChange={(it) => setBeneficio(f.id, "va", it)} /></td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(inss)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(irrf)}</td>
                    <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{brl(totalDesc)}</td>
                    <td style={{ textAlign: "right", color: "#10B981", fontWeight: 800 }}>{brl(liquido)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(provisao)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(fgts)}</td>
                  </tr>
                ))}
                {geralView.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nenhum resultado para “{busca}”.</td></tr>}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                  <td style={{ padding: "12px 10px" }}>Total ({linhasGeral.length})</td>
                  <td />
                  <td style={{ textAlign: "right", padding: "12px 10px" }}>{brl(totG.bruto)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.vt)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.va)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.inss)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.irrf)}</td>
                  <td style={{ textAlign: "right", color: "#EF4444" }}>{brl(totG.totalDesc)}</td>
                  <td style={{ textAlign: "right", color: "#10B981" }}>{brl(totG.liquido)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.provisao)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.fgts)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            {[
              { t: "Salários (bruto)", v: totG.bruto, cor: "var(--txt)" },
              { t: "Líquido a pagar", v: totG.liquido, cor: "#10B981" },
              { t: "Encargos (FGTS + provisões)", v: round2(totG.fgts + totG.provisao), cor: "var(--brand)" },
              { t: "Custo total da folha", v: custoTotal, cor: "var(--brand)" },
            ].map((c) => (
              <div key={c.t} className="card" style={{ flex: "1 1 200px", padding: 16 }}>
                <div className="sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{c.t}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: c.cor }}>{brl(c.v)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="no-print" style={{ position: "relative", maxWidth: 400, marginBottom: 14 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou departamento…" style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10 }} />
          </div>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 14px 36px -26px rgba(0,0,0,.45)" }}>
            <table className="eq-tab" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1720 }}>
              <thead>
                <tr>
                  <th className="eq-th" onClick={() => ordenarPor("nome")}>Nome {seta("nome")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("base")} style={{ textAlign: "right" }}>Salário base {seta("base")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("comissao")} style={{ textAlign: "right" }}>Comissão {seta("comissao")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("horaExtra")} style={{ textAlign: "right" }}>Hora extra {seta("horaExtra")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("gratificacao")} style={{ textAlign: "right" }}>Gratificação {seta("gratificacao")}</th>
                  {thsCol("prov")}
                  {thMais("prov")}
                  <th className="eq-th" onClick={() => ordenarPor("proventos")} style={{ textAlign: "right" }}>Proventos {seta("proventos")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("inss")} style={{ textAlign: "right" }}>INSS {seta("inss")}<BtnInfoInss /></th>
                  <th className="eq-th" onClick={() => ordenarPor("irrf")} style={{ textAlign: "right" }}>IRRF {seta("irrf")}<BtnInfoIrrf /></th>
                  <th className="eq-th" onClick={() => ordenarPor("vt")} style={{ textAlign: "right" }}>Vale transp. {seta("vt")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("sindicato")} style={{ textAlign: "right" }}>Sindicato {seta("sindicato")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("planoSaude")} style={{ textAlign: "right" }}>Plano saúde {seta("planoSaude")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("mensalidade")} style={{ textAlign: "right" }}>Mensalidade {seta("mensalidade")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("adiantamento")} style={{ textAlign: "right" }}>Adiantamento {seta("adiantamento")}</th>
                  {thsCol("desc")}
                  {thMais("desc")}
                  <th className="eq-th" onClick={() => ordenarPor("totalDesc")} style={{ textAlign: "right" }}>Descontos {seta("totalDesc")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("liquido")} style={{ textAlign: "right" }}>Líquido {seta("liquido")}</th>
                </tr>
              </thead>
              <tbody>
                {mesView.map(({ f, v, extra, base, proventos, inss, irrf, vt, totalDesc, liquido }) => (
                  <tr key={f.id} className="eq-row">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", fontWeight: 800, fontSize: 11 }}>{iniciaisDe(f.nome) || <User size={15} />}</span>
                        <b style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome || "—"}</b>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(base)}</td>
                    <td><CampoMoeda valor={v.comissao} onSalvar={(n) => setVar(f.id, "comissao", n)} /></td>
                    <td><CampoMoeda valor={v.horaExtra} onSalvar={(n) => setVar(f.id, "horaExtra", n)} /></td>
                    <td><CampoMoeda valor={v.gratificacao} onSalvar={(n) => setVar(f.id, "gratificacao", n)} /></td>
                    {tdsCol("prov", f.id, extra)}
                    <td />
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{brl(proventos)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(inss)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(irrf)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(vt)}</td>
                    <td><CampoMoeda valor={v.sindicato} onSalvar={(n) => setVar(f.id, "sindicato", n)} /></td>
                    <td><CampoMoeda valor={v.planoSaude} onSalvar={(n) => setVar(f.id, "planoSaude", n)} /></td>
                    <td><CampoMoeda valor={v.mensalidade} onSalvar={(n) => setVar(f.id, "mensalidade", n)} /></td>
                    <td><CampoMoeda valor={v.adiantamento} onSalvar={(n) => setVar(f.id, "adiantamento", n)} /></td>
                    {tdsCol("desc", f.id, extra)}
                    <td />
                    <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{brl(totalDesc)}</td>
                    <td style={{ textAlign: "right", color: "#10B981", fontWeight: 800 }}>{brl(liquido)}</td>
                  </tr>
                ))}
                {mesView.length === 0 && <tr><td colSpan={15 + cols.prov.length + cols.desc.length + 2} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nenhum resultado para “{busca}”.</td></tr>}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                  <td style={{ padding: "12px 10px" }}>Total ({linhasMes.length})</td>
                  <td /><td /><td /><td />
                  {tdsVazias("prov")}
                  <td style={{ textAlign: "right" }}>{brl(totM.proventos)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totM.inss)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totM.irrf)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totM.vt)}</td>
                  <td /><td /><td /><td />
                  {tdsVazias("desc")}
                  <td style={{ textAlign: "right", color: "#EF4444" }}>{brl(totM.totalDesc)}</td>
                  <td style={{ textAlign: "right", color: "#10B981" }}>{brl(totM.liquido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            {[
              { t: `Proventos ${MESES[mesAtualIdx]}`, v: totM.proventos, cor: "var(--txt)" },
              { t: "Total de descontos", v: totM.totalDesc, cor: "#EF4444" },
              { t: "Líquido a pagar no mês", v: totM.liquido, cor: "#10B981" },
            ].map((c) => (
              <div key={c.t} className="card" style={{ flex: "1 1 200px", padding: 16 }}>
                <div className="sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{c.t}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: c.cor }}>{brl(c.v)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* pop-up: como o INSS é calculado (tabela oficial 2026) */}
      {infoInss && (
        <div onClick={() => setInfoInss(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, padding: 22, maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Como o INSS é descontado (2026)</b>
              </div>
              <button onClick={() => setInfoInss(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 14px", lineHeight: 1.55, fontSize: 12.5 }}>
              O desconto é <b>progressivo</b>: cada parte do salário é descontada pela alíquota da sua faixa (não é uma alíquota única sobre o total). O sistema soma faixa por faixa automaticamente.
            </p>
            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Salário de contribuição</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Alíquota</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Parcela a deduzir</th>
                  </tr>
                </thead>
                <tbody>
                  {INSS_TABELA.map((r) => (
                    <tr key={r.faixa}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>{r.faixa}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", textAlign: "center", fontWeight: 700 }}>{r.aliq}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", textAlign: "right", color: "var(--muted)" }}>{r.ded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span>
                <span><b>Teto do INSS:</b> o limite de salário usado no cálculo em 2026 é <b>{brl(INSS_TETO)}</b>. Quem ganha acima disso tem o desconto travado no máximo de <b>R$ 988,09</b> por mês.</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span>
                <span><b>Fórmula rápida:</b> INSS = salário × alíquota da faixa − parcela a deduzir. O resultado é o mesmo do cálculo progressivo.</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button className="btn" onClick={() => setInfoInss(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {/* pop-up: como o IRRF é calculado (tabela oficial 2026 + redutor) */}
      {infoIrrf && (
        <div onClick={() => setInfoIrrf(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 580, padding: 22, maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Como o IRRF é descontado (2026)</b>
              </div>
              <button onClick={() => setInfoIrrf(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 14px", lineHeight: 1.55, fontSize: 12.5 }}>
              O imposto incide sobre a <b>base</b> (salário bruto <b>menos o INSS</b>). Em 2026 há <b>isenção total para quem recebe até R$ 5.000/mês</b>. A tabela base é:
            </p>
            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Base de cálculo mensal</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Alíquota</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".03em", color: "var(--muted)" }}>Parcela a deduzir</th>
                  </tr>
                </thead>
                <tbody>
                  {IRRF_TABELA.map((r) => (
                    <tr key={r.faixa}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>{r.faixa}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", textAlign: "center", fontWeight: 700 }}>{r.aliq}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", textAlign: "right", color: "var(--muted)" }}>{r.ded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <b style={{ display: "block", marginTop: 16, fontSize: 13.5 }}>Redutor adicional (2026)</b>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {[
                <><b>Até R$ 5.000:</b> isenção total — o imposto fica <b>zerado</b>.</>,
                <><b>De R$ 5.000,01 a R$ 7.350:</b> redução parcial pela fórmula <b>R$ 978,62 − (0,133145 × rendimento mensal)</b>, subindo de forma gradual.</>,
                <><b>Acima de R$ 7.350:</b> sem o redutor — vale só a tabela progressiva acima.</>,
              ].map((txt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{txt}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button className="btn" onClick={() => setInfoIrrf(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de exclusão de coluna (padrão do app) */}
      {confirmCol && (
        <div onClick={() => setConfirmCol(null)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 125, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: "#EF4444", flexShrink: 0 }}><X size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Excluir a coluna &ldquo;{confirmCol.nome || "sem nome"}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>A coluna sai da folha de todos os meses. Como ela está sem valores, nada é perdido. Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmCol(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: "#EF4444" }} onClick={() => { removerCol(confirmCol.grupo, confirmCol.id); setConfirmCol(null); }}>Excluir coluna</button>
            </div>
          </div>
        </div>
      )}

      {/* aviso: coluna tem dados, não pode excluir */}
      {avisoCol && (
        <div onClick={() => setAvisoCol(null)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 125, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 24, border: "1px solid #F59E0B", background: "linear-gradient(160deg, rgba(245,158,11,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.16)", color: "#F59E0B", flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>{avisoCol.titulo}</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{avisoCol.texto}</p>
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 18 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAvisoCol(null)}>Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
