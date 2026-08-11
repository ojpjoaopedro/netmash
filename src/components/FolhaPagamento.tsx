"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet, Info, Printer, Users, ArrowUpRight, X, Search, ChevronsUpDown, ChevronUp, ChevronDown, Plus, Trash2, Lock } from "lucide-react";
import { Empresa, Funcionario, getFuncionarios, updateFuncionario } from "@/lib/db";
import { brl } from "@/lib/format";
import * as XLSX from "xlsx-js-style";
import { salvarEstadoRemoto, sincronizarPorPrefixo } from "@/lib/estado-remoto";
import { navegar } from "@/lib/nav";
import { MES } from "@/app/minhasmetricas/financas-estrutura";
import SeletorAno from "./SeletorAno";
import { useBrand } from "@/lib/brand";

// dados extras da empresa (endereço/CNPJ), usados no cabeçalho do PDF
function lerEmpresaExtra(id?: string | null): { cnpj?: string; endereco?: string } {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(`me_empresa_extra:${id || "default"}`) || "{}"); } catch { return {}; }
}

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
// INSS do pró-labore (sócio / contribuinte individual): 11% sobre o pró-labore, limitado ao teto (máx. R$ 932,31 em 2026).
const INSS_PROLABORE_ALIQ = 0.11;
function calcINSSprolabore(base: number): number { return round2(Math.min(base, INSS_TETO) * INSS_PROLABORE_ALIQ); }
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
// base = salário base do mês; vt = vale transporte do mês (R$). Cada mês é um snapshot próprio (começa vazio).
type VarsMes = { base?: number; vt?: number; comissao: number; horaExtra: number; gratificacao: number; sindicato: number; planoSaude: number; mensalidade: number; adiantamento: number; extra?: Record<string, number> };
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

/** Cálculo da folha mensal de uma pessoa (snapshot do mês: base + vt + variáveis). */
function calcLinhaMes(v: VarsMes, cols: ColsFolha) {
  const base = v.base || 0;
  const extra = v.extra || {};
  const provExtra = cols.prov.reduce((s, c) => s + (extra[c.id] || 0), 0);
  const descExtra = cols.desc.reduce((s, c) => s + (extra[c.id] || 0), 0);
  const proventos = round2(base + v.comissao + v.horaExtra + v.gratificacao + provExtra);
  const inss = calcINSS(proventos);
  const irrf = calcIRRF(proventos, inss);
  const descManual = round2(v.sindicato + v.planoSaude + v.adiantamento + descExtra);
  const totalDesc = round2(inss + irrf + descManual);
  const liquido = round2(proventos - totalDesc);
  return { base, proventos, inss, irrf, descManual, totalDesc, liquido };
}
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
type Modo = "pct" | "fixo";
type BenefItem = { modo: Modo; valor: number };
type Benef = { vt?: number | BenefItem; va?: number | BenefItem; extra?: Record<string, number | BenefItem> };
/** Valor numérico do benefício (aceita número novo ou objeto {modo,valor} antigo). */
function valNum(x: number | BenefItem | undefined): number {
  if (x == null) return 0;
  return typeof x === "number" ? x : (x.valor || 0);
}
/** R$ efetivo dado o modo da coluna: pct = % do salário; fixo = valor em reais. */
function efetivoModo(modo: Modo, valor: number, salario: number): number {
  if (!valor) return 0;
  return modo === "pct" ? round2(salario * valor / 100) : round2(valor);
}
// modo (% ou R$) por coluna de benefício, por empresa (chaves: "vt", "va", ou id da coluna extra)
const chaveBenefModos = (id: string | null | undefined) => `me_folha_benef_modos:${id || "default"}`;
function lerBenefModos(id: string | null | undefined): Record<string, Modo> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(chaveBenefModos(id)) || "{}") || {}; } catch { return {}; }
}
function salvarBenefModos(id: string | null | undefined, m: Record<string, Modo>) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(m); localStorage.setItem(chaveBenefModos(id), cru); salvarEstadoRemoto(chaveBenefModos(id), cru);
}
// colunas de benefício personalizadas (ex.: plano de saúde, auxílio), por empresa
const chaveBenefCols = (id: string | null | undefined) => `me_folha_benef_cols:${id || "default"}`;
function lerBenefCols(id: string | null | undefined): Col[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(chaveBenefCols(id)) || "[]") || []; } catch { return []; }
}
function salvarBenefCols(id: string | null | undefined, cs: Col[]) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(cs); localStorage.setItem(chaveBenefCols(id), cru); salvarEstadoRemoto(chaveBenefCols(id), cru);
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
// Usuários com login (superadmin + admins), guardados em me_diretores, entram na folha como pessoas.
// O "tipo" (Funcionário/Sócio) fica no campo area, igual ao cargo do funcionário.
function lerLoginComoFuncs(empresaId: string | null | undefined): Funcionario[] {
  if (typeof window === "undefined") return [];
  try {
    const s = JSON.parse(localStorage.getItem("me_diretores") || "null");
    if (!s || !s.sup) return [];
    const lista = [s.sup, ...(Array.isArray(s.admins) ? s.admins : [])];
    return lista
      .filter((d: { nome?: string }) => (d?.nome || "").trim())
      .map((d: { id?: string; nome: string; area?: string; telefone?: string; email?: string; cpf?: string; pix?: string; nascimento?: string }) => ({
        id: d.id || "super", empresa_id: empresaId || "default", nome: d.nome, cargo: d.area || "Funcionário",
        departamento: null, salario: 0, beneficios: 0, admissao: null, ativo: true,
        contato: d.telefone || null, email: d.email || null, cpf: d.cpf || null, pix: d.pix || null, nascimento: d.nascimento || null,
      }));
  } catch { return []; }
}

/** Selinho "✓ Salvo" que aparece por 1,4s ao lado do campo após digitar. */
function useSalvo(): [boolean, () => void] {
  const [salvo, setSalvo] = useState(false);
  const t = useRef<number | undefined>(undefined);
  const marcar = () => { setSalvo(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setSalvo(false), 1400); };
  return [salvo, marcar];
}
function BadgeSalvo() {
  return <span style={{ flexShrink: 0, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, whiteSpace: "nowrap" }}>✓ Salvo</span>;
}

/** Campo de dinheiro editável no nosso padrão: clica, digita e salva ao sair. 0 = vazio. */
function CampoMoeda({ valor, onSalvar, esquerda }: { valor: number; onSalvar: (n: number) => void; esquerda?: boolean }) {
  const [salvo, marcar] = useSalvo();
  const [txt, setTxt] = useState(valor ? num2(valor) : "");
  useEffect(() => { setTxt(valor ? num2(valor) : ""); }, [valor]);   // sincroniza ao trocar de mês / puxar
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: esquerda ? "flex-start" : "flex-end", gap: 4, width: "100%" }}>
      {salvo && <BadgeSalvo />}
      <input value={txt} placeholder="" inputMode="decimal"
        onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.select(); }}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => { e.currentTarget.style.background = "transparent"; const n = round2(parseNum(txt)); setTxt(n ? num2(n) : ""); if (n !== valor) { onSalvar(n); marcar(); } }}
        style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", textAlign: esquerda ? "left" : "right", transition: "background .12s" }} />
    </span>
  );
}
/** Célula de benefício: digita o número; se a coluna estiver em %, mostra o R$ calculado embaixo. */
function CampoBenefCel({ valor, modo, salario, onSalvar }: { valor: number; modo: Modo; salario: number; onSalvar: (n: number) => void }) {
  const [salvo, marcar] = useSalvo();
  const efet = efetivoModo(modo, valor, salario);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, width: "100%" }}>
        {salvo && <BadgeSalvo />}
        <input defaultValue={valor ? num2(valor) : ""} placeholder={modo === "pct" ? "0" : "0,00"} inputMode="decimal"
          onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.select(); }}
          onBlur={(e) => { e.currentTarget.style.background = "transparent"; const n = round2(parseNum(e.target.value)); e.target.value = n ? num2(n) : ""; if (n !== valor) { onSalvar(n); marcar(); } }}
          style={{ border: 0, outline: "none", background: "transparent", padding: "3px 4px", borderRadius: 6, width: modo === "pct" ? 54 : "100%", minWidth: 0, font: "inherit", color: "inherit", textAlign: "right", transition: "background .12s" }} />
        {modo === "pct" && <span style={{ fontSize: 11.5, color: "var(--muted)", flexShrink: 0 }}>%</span>}
      </span>
      {modo === "pct" && valor > 0 && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>= {brl(efet)}</span>}
    </div>
  );
}
/** Toggle % / R$ da coluna de benefício (fica no cabeçalho). */
function ToggleModo({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  const btn = (m: Modo, txt: string) => (
    <button onClick={(e) => { e.stopPropagation(); onChange(m); }} title={m === "pct" ? "Percentual do salário" : "Valor fixo em reais"}
      style={{ padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: 0, background: modo === m ? "var(--brand)" : "transparent", color: modo === m ? "var(--brand-ct,#fff)" : "var(--muted)" }}>{txt}</button>
  );
  return <span className="no-print" style={{ display: "inline-flex", gap: 1, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 7, padding: 1 }}>{btn("pct", "%")}{btn("fixo", "R$")}</span>;
}

/** Campo de texto editável (departamento). */
function CampoTexto({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => void }) {
  const [salvo, marcar] = useSalvo();
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
      <input defaultValue={valor} placeholder="—"
        onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
        onBlur={(e) => { e.currentTarget.style.background = "transparent"; const v = e.target.value.trim(); if (v !== valor) { onSalvar(v); marcar(); } }}
        style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", transition: "background .12s" }} />
      {salvo && <BadgeSalvo />}
    </span>
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

/** Título de coluna quebrado em 2 linhas no 1º espaço (ex.: "Salário bruto" -> "Salário" / "bruto"). */
function Rot({ t }: { t: string }) {
  const i = t.indexOf(" ");
  if (i < 0) return <>{t}</>;
  return <>{t.slice(0, i)}<br />{t.slice(i + 1)}</>;
}

export default function FolhaPagamento({ empresa = null }: { empresa?: Empresa | null }) {
  const { brand } = useBrand();
  const empExtra = lerEmpresaExtra(empresa?.id);
  const nomeEmpresa = brand?.nome && brand.nome !== "Minha Empresa" ? brand.nome : (empresa?.nome || "Minha Empresa");
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [loginFuncs, setLoginFuncs] = useState<Funcionario[]>([]);
  const [cfg, setCfg] = useState<Config>(() => lerCfg(empresa?.id));
  const [carregado, setCarregado] = useState(false);
  const [modo, setModo] = useState<"geral" | "mensal">("mensal");
  const [ym, setYm] = useState<string>("");   // "YYYY-MM" — definido no cliente para evitar divergência de hidratação
  const [dadosMes, setDadosMes] = useState<Record<string, VarsMes>>({});
  const [benef, setBenef] = useState<Record<string, Benef>>({});
  const [cols, setCols] = useState<ColsFolha>({ prov: [], desc: [] });
  const [infoInss, setInfoInss] = useState(false);
  const [infoIrrf, setInfoIrrf] = useState(false);
  const [confirmCol, setConfirmCol] = useState<{ grupo: "prov" | "desc" | "benef"; id: string; nome: string } | null>(null);
  const [avisoCol, setAvisoCol] = useState<{ titulo: string; texto: string } | null>(null);
  const [colFoco, setColFoco] = useState<string | null>(null);
  // tutorial da Folha desativado (removido a pedido); mantido o estado só para não abrir.
  const [tut, setTut] = useState(false);
  const fecharTut = () => setTut(false);
  const BtnInfo = ({ onClick, titulo }: { onClick: () => void; titulo: string }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={titulo} className="no-print"
      style={{ marginLeft: 5, verticalAlign: "middle", width: 16, height: 16, borderRadius: "50%", display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", padding: 0 }}>
      <Info size={11} />
    </button>
  );
  const [infoFgts, setInfoFgts] = useState(false);
  const [infoRescisao, setInfoRescisao] = useState(false);
  const [infoProvisao, setInfoProvisao] = useState(false);
  const [infoCusto, setInfoCusto] = useState(false);
  const [infoProlabore, setInfoProlabore] = useState(false);
  const [infoCustoMes, setInfoCustoMes] = useState(false);
  const [infoPuxar, setInfoPuxar] = useState(false);
  const [pessoaCard, setPessoaCard] = useState<Funcionario | null>(null);   // card da pessoa em popup
  const BtnInfoInss = () => <BtnInfo onClick={() => setInfoInss(true)} titulo="Como o INSS é calculado" />;
  const BtnInfoIrrf = () => <BtnInfo onClick={() => setInfoIrrf(true)} titulo="Como o IRRF é calculado" />;
  const BtnInfoFgts = () => <BtnInfo onClick={() => setInfoFgts(true)} titulo="O que é o FGTS" />;
  const BtnInfoRescisao = () => <BtnInfo onClick={() => setInfoRescisao(true)} titulo="O que é a provisão para rescisão" />;
  const BtnInfoProvisao = () => <BtnInfo onClick={() => setInfoProvisao(true)} titulo="O que é a provisão de 13º e férias" />;

  const carregar = () => getFuncionarios().then((f) => { setFuncs(f); setCarregado(true); }).catch(() => setCarregado(true));
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // puxa do banco todas as chaves da folha (mensais, benefícios, colunas) ao abrir, para
  // a folha montada num aparelho aparecer em outro. As leituras abaixo releem quando hidratar.
  const [hidratado, setHidratado] = useState(0);
  useEffect(() => { let vivo = true; sincronizarPorPrefixo("me_folha_").then(() => { if (vivo) setHidratado((h) => h + 1); }); return () => { vivo = false; }; }, []);
  // usuários com login (superadmin + admins) também entram na folha
  useEffect(() => {
    const ler = () => setLoginFuncs(lerLoginComoFuncs(empresa?.id));
    ler();
    window.addEventListener("me:diretores", ler);
    window.addEventListener("storage", ler);
    return () => { window.removeEventListener("me:diretores", ler); window.removeEventListener("storage", ler); };
  }, [empresa?.id]);
  // funcionários do banco + pessoas com login (sem duplicar por id)
  const funcsTodos = useMemo(() => {
    const ids = new Set(funcs.map((f) => f.id));
    return [...funcs, ...loginFuncs.filter((l) => !ids.has(l.id))];
  }, [funcs, loginFuncs]);
  useEffect(() => { setCfg(lerCfg(empresa?.id)); }, [empresa?.id, hidratado]);
  useEffect(() => { const d = new Date(); setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }, []);
  useEffect(() => { if (ym) setDadosMes(lerMes(empresa?.id, ym)); }, [empresa?.id, ym, hidratado]);
  useEffect(() => { setBenef(lerBenef(empresa?.id)); }, [empresa?.id, hidratado]);
  useEffect(() => { setCols(lerCols(empresa?.id)); }, [empresa?.id, hidratado]);

  const upCols = (c: ColsFolha) => { setCols(c); salvarCols(empresa?.id, c); };
  const addCol = (grupo: "prov" | "desc") => upCols({ ...cols, [grupo]: [...cols[grupo], { id: novoIdCol(), nome: grupo === "prov" ? "Novo provento" : "Novo desconto" }] });
  const renomearCol = (grupo: "prov" | "desc", id: string, nome: string) => upCols({ ...cols, [grupo]: cols[grupo].map((c) => c.id === id ? { ...c, nome } : c) });
  const removerCol = (grupo: "prov" | "desc" | "benef", id: string) => { if (grupo === "benef") removerBenefCol(id); else upCols({ ...cols, [grupo]: cols[grupo].filter((c) => c.id !== id) }); };
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
  const pedirRemoverCol = (grupo: "prov" | "desc" | "benef", id: string, nome: string) => {
    const temDados = grupo === "benef" ? benefColTemDados(id) : colTemDados(id);
    if (temDados) {
      setAvisoCol({ titulo: "Coluna com valores lançados", texto: `A coluna “${nome || "sem nome"}” já tem valores preenchidos. Zere esses valores antes de excluir a coluna, para não perder lançamentos.` });
      return;
    }
    setConfirmCol({ grupo, id, nome });
  };
  const setExtra = (id: string, colId: string, valor: number) => {
    setDadosMes((prev) => { const cur = prev[id] || {}; const extra = { ...(cur.extra || {}), [colId]: valor }; const next = { ...prev, [id]: { ...VARS_ZERO, ...cur, extra } }; salvarMes(empresa?.id, ym, next); return next; });
  };
  // cabeçalhos das colunas extras (nome editável + lixeira que só aparece ao editar) e o botão "+"
  const thsCol = (grupo: "prov" | "desc") => cols[grupo].map((c) => (
    <th key={c.id} className="eq-th" style={{ textAlign: "right", minWidth: 120 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end", whiteSpace: "nowrap", width: "100%" }}>
        <input defaultValue={c.nome} title="Clique para renomear ou excluir a coluna"
          onFocus={() => setColFoco(c.id)}
          onBlur={(e) => { renomearCol(grupo, c.id, e.target.value.trim() || c.nome); setColFoco(null); }}
          style={{ border: 0, outline: "none", background: "transparent", font: "inherit", color: "inherit", textAlign: "right", width: 84, minWidth: 0, padding: "2px 4px", borderRadius: 6 }} />
        {colFoco === c.id && (
          <button title="Excluir coluna" onMouseDown={(e) => e.preventDefault()} onClick={() => pedirRemoverCol(grupo, c.id, c.nome)} className="no-print"
            style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: "#EF4444" }}><Trash2 size={11} /></button>
        )}
      </span>
    </th>
  ));
  const thMais = (grupo: "prov" | "desc") => (
    <th data-tut={grupo === "desc" ? "mais-desc" : "mais-prov"} className="eq-th no-print" style={{ textAlign: "center", width: 44 }}>
      <button title={grupo === "prov" ? "Adicionar provento" : "Adicionar desconto"} onClick={() => addCol(grupo)}
        style={{ width: 24, height: 24, borderRadius: 7, display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)" }}><Plus size={14} /></button>
    </th>
  );
  const tdsCol = (grupo: "prov" | "desc", fid: string, extra: Record<string, number>) => cols[grupo].map((c) => (
    <td key={c.id}><CampoMoeda valor={extra[c.id] || 0} onSalvar={(n) => setExtra(fid, c.id, n)} /></td>
  ));
  const tdsVazias = (grupo: "prov" | "desc") => [...cols[grupo].map((c) => <td key={c.id} />), <td key={`mais-${grupo}`} />];
  const irParaEquipe = () => navegar({ view: "config", aba: "equipe", voltar: { view: "financas", aba: "folha" } });
  // célula do nome: clicar (ou passar o mouse) leva ao cadastro na Equipe
  const celNome = (f: Funcionario) => (
    <div onClick={() => setPessoaCard(f)} title={f.nome || "—"}
      onMouseEnter={(e) => { (e.currentTarget.querySelector("b") as HTMLElement | null)?.style.setProperty("color", "var(--brand)"); }}
      onMouseLeave={(e) => { (e.currentTarget.querySelector("b") as HTMLElement | null)?.style.removeProperty("color"); }}
      style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, cursor: "pointer" }}>
      <b style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color .12s" }}>{f.nome || "—"}</b>
    </div>
  );
  // link fino de "+ cadastrar" como uma linha da tabela, logo acima do Total (vai direto para a Equipe)
  const linhaCadastrar = (colSpan: number) => soLeitura ? null : (
    <tr className="no-print eq-row">
      <td colSpan={colSpan} style={{ padding: "8px 10px" }}>
        <button data-tut="cadastrar" onClick={irParaEquipe}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--brand)", background: "transparent", border: 0, padding: "4px 8px", borderRadius: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--brand) 10%, transparent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <Plus size={15} /> Cadastrar na equipe
        </button>
      </td>
    </tr>
  );

  // modo (% ou R$) por coluna de benefício (nível da coluna, não por pessoa)
  const [benefModos, setBenefModos] = useState<Record<string, Modo>>({});
  useEffect(() => { setBenefModos(lerBenefModos(empresa?.id)); }, [empresa?.id, hidratado]);
  const modoDe = (key: string): Modo => benefModos[key] || "fixo";
  const setBenefModo = (key: string, m: Modo) => setBenefModos((prev) => { const n = { ...prev, [key]: m }; salvarBenefModos(empresa?.id, n); return n; });
  // troca % <-> R$ CONVERTENDO o número de cada pessoa (preserva o R$ efetivo). Totais/líquido acompanham.
  const trocarModoColuna = (key: string, novoModo: Modo) => {
    if (modoDe(key) === novoModo) return;
    setBenef((prev) => {
      const next: Record<string, Benef> = {};
      for (const fid in prev) {
        const cur = prev[fid];
        const sal = funcs.find((x) => x.id === fid)?.salario || 0;
        const atual = valNum(key === "vt" ? cur.vt : key === "va" ? cur.va : cur.extra?.[key]);
        let novo = atual;
        if (atual) novo = novoModo === "fixo" ? round2(sal * atual / 100) : (sal > 0 ? round2(atual / sal * 100) : 0);
        const c: Benef = { ...cur };
        if (key === "vt") { if (novo) c.vt = novo; else delete c.vt; }
        else if (key === "va") { if (novo) c.va = novo; else delete c.va; }
        else { const ex = { ...(c.extra || {}) }; if (novo) ex[key] = novo; else delete ex[key]; c.extra = ex; }
        next[fid] = c;
      }
      salvarBenef(empresa?.id, next);
      return next;
    });
    setBenefModo(key, novoModo);
  };
  // valores por pessoa (só o número; o modo vem da coluna). Ausente = zerado.
  const vtNum = (f: Funcionario) => valNum(benef[f.id]?.vt);
  const vaNum = (f: Funcionario) => valNum(benef[f.id]?.va);
  const vtDe = (f: Funcionario) => efetivoModo(modoDe("vt"), vtNum(f), f.salario || 0);
  const vaDe = (f: Funcionario) => efetivoModo(modoDe("va"), vaNum(f), f.salario || 0);
  const setBeneficioNum = (id: string, campo: "vt" | "va", num: number) => {
    setBenef((prev) => {
      const cur = { ...(prev[id] || {}) };
      if (num) cur[campo] = num; else delete cur[campo];
      const next = { ...prev, [id]: cur }; salvarBenef(empresa?.id, next); return next;
    });
  };
  // benefícios personalizados (colunas extras: plano de saúde, auxílio, etc.)
  const [benefCols, setBenefCols] = useState<Col[]>([]);
  useEffect(() => { setBenefCols(lerBenefCols(empresa?.id)); }, [empresa?.id, hidratado]);
  const upBenefCols = (cs: Col[]) => { setBenefCols(cs); salvarBenefCols(empresa?.id, cs); };
  const addBenefCol = () => upBenefCols([...benefCols, { id: novoIdCol(), nome: "Novo benefício" }]);
  const renomearBenefCol = (id: string, nome: string) => upBenefCols(benefCols.map((c) => c.id === id ? { ...c, nome } : c));
  const removerBenefCol = (id: string) => upBenefCols(benefCols.filter((c) => c.id !== id));
  const benefColNum = (f: Funcionario, colId: string) => valNum(benef[f.id]?.extra?.[colId]);
  const benefColDe = (f: Funcionario, colId: string) => efetivoModo(modoDe(colId), benefColNum(f, colId), f.salario || 0);
  const setBeneficioColNum = (id: string, colId: string, num: number) => {
    setBenef((prev) => {
      const cur = { ...(prev[id] || {}) };
      const extra = { ...(cur.extra || {}) };
      if (num) extra[colId] = num; else delete extra[colId];
      cur.extra = extra;
      const next = { ...prev, [id]: cur }; salvarBenef(empresa?.id, next); return next;
    });
  };
  const benefColTemDados = (colId: string) => Object.values(benef).some((b) => valNum(b.extra?.[colId]) > 0);
  // benefícios personalizados (visão Geral): cabeçalho (nome editável + lixeira ao editar), "+", células e totais
  const thsBenef = () => benefCols.map((c) => (
    <th key={c.id} className="eq-th" style={{ textAlign: "right", minWidth: 130 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end", whiteSpace: "nowrap", maxWidth: "100%" }}>
          <input defaultValue={c.nome} title="Clique para renomear ou excluir o benefício"
            onFocus={() => setColFoco(c.id)}
            onBlur={(e) => { renomearBenefCol(c.id, e.target.value.trim() || c.nome); setColFoco(null); }}
            style={{ border: 0, outline: "none", background: "transparent", font: "inherit", color: "inherit", textAlign: "right", width: 84, minWidth: 0, padding: "2px 4px", borderRadius: 6 }} />
          {colFoco === c.id && (
            <button title="Excluir benefício" onMouseDown={(e) => e.preventDefault()} onClick={() => pedirRemoverCol("benef", c.id, c.nome)} className="no-print"
              style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: "#EF4444" }}><Trash2 size={11} /></button>
          )}
        </span>
        <ToggleModo modo={modoDe(c.id)} onChange={(m) => trocarModoColuna(c.id, m)} />
      </div>
    </th>
  ));
  const thMaisBenef = () => (
    <th className="eq-th no-print" style={{ textAlign: "center", width: 44 }}>
      <button title="Adicionar benefício (por pessoa)" onClick={addBenefCol}
        style={{ width: 24, height: 24, borderRadius: 7, display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)" }}><Plus size={14} /></button>
    </th>
  );
  const tdsBenef = (f: Funcionario) => benefCols.map((c) => (
    <td key={c.id}><CampoBenefCel valor={benefColNum(f, c.id)} modo={modoDe(c.id)} salario={f.salario || 0} onSalvar={(n) => setBeneficioColNum(f.id, c.id, n)} /></td>
  ));
  const totBenefCol = (colId: string) => ativos.reduce((s, f) => s + benefColDe(f, colId), 0);

  async function salvarSalario(id: string, salario: number) { await updateFuncionario(id, { salario }); carregar(); }
  async function salvarDepto(id: string, departamento: string) { await updateFuncionario(id, { departamento: departamento || null }); carregar(); }
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

  const [filtro, setFiltro] = useState<"ativos" | "desativados">("ativos");
  // na aba Desativados a folha é só para consulta: não edita valores, não puxa, não cadastra
  const soLeitura = filtro === "desativados";
  const ativos = useMemo(() => funcsTodos.filter((f) => filtro === "ativos" ? f.ativo : !f.ativo), [funcsTodos, filtro]);
  // sócios recebem pró-labore (tabela própria); os demais entram na folha CLT
  const ehSocio = (f: Funcionario) => (f.cargo || "") === "Sócio";
  const funcsFolha = useMemo(() => ativos.filter((f) => !ehSocio(f)), [ativos]);
  const socios = useMemo(() => ativos.filter(ehSocio), [ativos]);

  // ---- linhas da visão GERAL (só salário base) ----
  const linhasGeral = useMemo(() => funcsFolha.map((f) => {
    const bruto = f.salario || 0;
    const vt = vtDe(f);
    const va = vaDe(f);
    const inss = calcINSS(bruto);
    const irrf = calcIRRF(bruto, inss);
    const totalDesc = round2(vt + inss + irrf);
    const liquido = round2(bruto - totalDesc);
    const provisao = round2(bruto / 12 + (bruto + bruto / 3) / 12);
    const fgts = round2(bruto * (cfg.fgtsPct / 100));
    const rescisao = round2(fgts * 0.40); // provisão da multa de 40% do FGTS (acerto final)
    return { f, bruto, vt, va, inss, irrf, totalDesc, liquido, provisao, fgts, rescisao };
  }), [funcsFolha, cfg, benef]);
  const totG = linhasGeral.reduce((a, l) => ({ bruto: a.bruto + l.bruto, vt: a.vt + l.vt, va: a.va + l.va, inss: a.inss + l.inss, irrf: a.irrf + l.irrf, totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido, provisao: a.provisao + l.provisao, fgts: a.fgts + l.fgts, rescisao: a.rescisao + l.rescisao }), { bruto: 0, vt: 0, va: 0, inss: 0, irrf: 0, totalDesc: 0, liquido: 0, provisao: 0, fgts: 0, rescisao: 0 });
  const totBenefExtra = round2(benefCols.reduce((s, c) => s + totBenefCol(c.id), 0));
  const custoTotal = round2(totG.bruto + totG.provisao + totG.fgts + totG.va + totG.rescisao + totBenefExtra);
  const geralView = ordenar(linhasGeral.filter((l) => combina(l.f)), (l) => {
    switch (sortCol) {
      case "nome": return l.f.nome || ""; case "departamento": return l.f.departamento || l.f.cargo || "";
      case "bruto": return l.bruto; case "vt": return l.vt; case "va": return l.va; case "inss": return l.inss;
      case "irrf": return l.irrf; case "totalDesc": return l.totalDesc; case "liquido": return l.liquido;
      case "provisao": return l.provisao; case "fgts": return l.fgts; case "rescisao": return l.rescisao; default: return "";
    }
  });

  // ---- linhas da visão MENSAL (com variáveis do mês) ----
  const linhasMes = useMemo(() => funcsFolha.map((f) => {
    const v = { ...VARS_ZERO, ...(dadosMes[f.id] || {}) };
    const r = calcLinhaMes(v, cols);
    const fgtsM = round2((r.base || 0) * (cfg.fgtsPct / 100));
    const provisaoM = round2((r.base || 0) / 12 + ((r.base || 0) + (r.base || 0) / 3) / 12);
    const rescisaoM = round2(fgtsM * 0.40);
    return { f, v, extra: v.extra || {}, ...r, fgtsM, provisaoM, rescisaoM };
  }), [funcsFolha, dadosMes, cols, cfg]);
  // ---- pró-labore dos sócios (regra própria: só salário base e INSS 11%; sem 13º/férias/FGTS) ----
  const linhasSocio = useMemo(() => socios.map((f) => {
    const v = { ...VARS_ZERO, ...(dadosMes[f.id] || {}) };
    const extra = v.extra || {};
    const base = v.base || 0;
    const provExtra = round2(cols.prov.reduce((s, c) => s + (extra[c.id] || 0), 0));
    const descExtra = round2(cols.desc.reduce((s, c) => s + (extra[c.id] || 0), 0));
    const proventos = round2(base + provExtra);
    const inss = calcINSSprolabore(base);            // INSS incide sobre o pró-labore (base)
    const totalDesc = round2(inss + descExtra);
    const liquido = round2(proventos - totalDesc);
    return { f, extra, base, provExtra, descExtra, proventos, inss, totalDesc, liquido };
  }), [socios, dadosMes, cols]);
  const socioView = linhasSocio.filter((l) => combina(l.f));
  const totSocio = linhasSocio.reduce((a, l) => ({ base: a.base + l.base, inss: a.inss + l.inss, totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido }), { base: 0, inss: 0, totalDesc: 0, liquido: 0 });
  const ymAnterior = () => { if (!ym) return ""; const [a, m] = ym.split("-").map(Number); let py = a, pm = m - 1; if (pm < 1) { pm = 12; py = a - 1; } return `${py}-${String(pm).padStart(2, "0")}`; };
  const temMesAnterior = () => { const p = ymAnterior(); return !!p && Object.keys(lerMes(empresa?.id, p)).length > 0; };
  // o mês já tem lançamentos? (funcionários OU pró-labore dos sócios). Só libera o "puxar" com as duas tabelas vazias.
  // usa os valores realmente calculados (ignora resíduos de colunas já removidas)
  const mesTemDados = linhasMes.some((l) => l.proventos > 0.005 || l.totalDesc > 0.005)
    || linhasSocio.some((l) => l.proventos > 0.005 || l.totalDesc > 0.005);
  function puxarDoMesAnterior() {
    const prev = lerMes(empresa?.id, ymAnterior());
    // só traz quem está ativo: desativado não tem mais salário
    const ativoId = new Set(funcsTodos.filter((f) => f.ativo).map((f) => f.id));
    const next: Record<string, VarsMes> = {};
    for (const id in prev) if (ativoId.has(id)) next[id] = prev[id];
    setDadosMes(next); salvarMes(empresa?.id, ym, next);
  }
  const totM = linhasMes.reduce((a, l) => ({ proventos: a.proventos + l.proventos, inss: a.inss + l.inss, irrf: a.irrf + l.irrf, totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido }), { proventos: 0, inss: 0, irrf: 0, totalDesc: 0, liquido: 0 });
  // encargos do mês (sobre o salário base): FGTS, provisão 13º+férias e provisão de rescisão
  const totMfgts = round2(linhasMes.reduce((s, l) => s + round2((l.base || 0) * (cfg.fgtsPct / 100)), 0));
  const totMprov = round2(linhasMes.reduce((s, l) => s + round2((l.base || 0) / 12 + ((l.base || 0) + (l.base || 0) / 3) / 12), 0));
  const totMresc = round2(linhasMes.reduce((s, l) => s + round2(round2((l.base || 0) * (cfg.fgtsPct / 100)) * 0.40), 0));
  // IRRF é desconto do trabalhador (repassado ao governo), não é custo da empresa: sai do custo total
  const custoTotalMes = round2(totM.proventos - totM.irrf + totMfgts + totMprov + totMresc);
  // colunas usadas na exportação (PDF e Excel do mês): iguais às da tela
  type LinhaMes = typeof linhasMes[number];
  const colsPrint: { h: string; get: (l: LinhaMes) => number; b?: boolean }[] = [
    { h: "Salário base", get: (l) => l.base || 0 },
    { h: "Comissão", get: (l) => l.v.comissao || 0 },
    { h: "Hora extra", get: (l) => l.v.horaExtra || 0 },
    { h: "Gratificação", get: (l) => l.v.gratificacao || 0 },
    ...cols.prov.map((c) => ({ h: c.nome, get: (l: LinhaMes) => l.extra?.[c.id] || 0 })),
    { h: "Proventos", get: (l) => l.proventos, b: true },
    { h: "INSS", get: (l) => l.inss },
    { h: "IRRF", get: (l) => l.irrf },
    { h: "Sindicato", get: (l) => l.v.sindicato || 0 },
    { h: "Plano saúde", get: (l) => l.v.planoSaude || 0 },
    { h: "Adiantamento", get: (l) => l.v.adiantamento || 0 },
    ...cols.desc.map((c) => ({ h: c.nome, get: (l: LinhaMes) => l.extra?.[c.id] || 0 })),
    { h: "Descontos", get: (l) => l.totalDesc, b: true },
    { h: "Líquido", get: (l) => l.liquido, b: true },
    { h: "13º + Férias", get: (l) => l.provisaoM },
    { h: "FGTS", get: (l) => l.fgtsM },
    { h: "Provisão rescisão", get: (l) => l.rescisaoM },
  ];
  type LinhaSoc = typeof linhasSocio[number];
  const colsPrintPl: { h: string; get: (l: LinhaSoc) => number; b?: boolean }[] = [
    { h: "Pró-labore", get: (l) => l.base },
    ...cols.prov.map((c) => ({ h: c.nome, get: (l: LinhaSoc) => l.extra?.[c.id] || 0 })),
    { h: "INSS (11%)", get: (l) => l.inss },
    ...cols.desc.map((c) => ({ h: c.nome, get: (l: LinhaSoc) => l.extra?.[c.id] || 0 })),
    { h: "Líquido", get: (l) => l.liquido, b: true },
  ];
  const somaCol = <T,>(arr: T[], get: (l: T) => number) => round2(arr.reduce((s, l) => s + get(l), 0));
  const pv = (n: number) => (Math.abs(n) < 0.005 ? "" : brl(n));
  const mesView = ordenar(linhasMes.filter((l) => combina(l.f)), (l) => {
    switch (sortCol) {
      case "nome": return l.f.nome || ""; case "base": return l.base;
      case "comissao": return l.v.comissao; case "horaExtra": return l.v.horaExtra; case "gratificacao": return l.v.gratificacao;
      case "proventos": return l.proventos; case "inss": return l.inss; case "irrf": return l.irrf;
      case "sindicato": return l.v.sindicato; case "planoSaude": return l.v.planoSaude;
      case "adiantamento": return l.v.adiantamento; case "totalDesc": return l.totalDesc; case "liquido": return l.liquido;
      case "provisaoM": return l.provisaoM; case "fgtsM": return l.fgtsM; case "rescisaoM": return l.rescisaoM; default: return "";
    }
  });

  const imprimir = () => window.print();
  // Baixa SÓ o mês selecionado, completo (todas as colunas da tela) + pró-labore dos sócios.
  function baixarFolhaExcel() {
    const ano = anoAtual || String(new Date().getFullYear());
    const mesNome = MESES[mesAtualIdx];
    const ncols = 1 + colsPrint.length;
    const brandHex = "FF" + (brand?.cor || "#1AADE2").replace("#", "").toUpperCase();
    const cidade = (empresa && "cidade" in empresa ? (empresa as { cidade?: string }).cidade : "") || "";
    let resp = ""; try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); resp = s?.sup?.nome || ""; } catch { /* ignore */ }

    type Papel = "titulo" | "kv" | "vazio" | "th" | "data" | "total" | "secao";
    const aoa: (string | number)[][] = [];
    const papeis: Papel[] = [];
    const push = (row: (string | number)[], p: Papel) => { aoa.push(row); papeis.push(p); };

    // cabeçalho (faixa azul + dados da empresa), igual ao Excel da Estrutura
    push([`FOLHA DE PAGAMENTO ${mesNome.toUpperCase()} DE ${ano}`], "titulo");
    push(["Empresa", nomeEmpresa], "kv");
    push(["CNPJ", empresa?.cnpj || empExtra.cnpj || ""], "kv");
    push(["Cidade", cidade], "kv");
    push(["Responsável financeiro", resp], "kv");
    push([], "vazio");

    push(["Nome", ...colsPrint.map((c) => c.h)], "th");
    linhasMes.forEach((l) => push([l.f.nome || "—", ...colsPrint.map((c) => round2(c.get(l)))], "data"));
    push([`Total (${linhasMes.length})`, ...colsPrint.map((c) => somaCol(linhasMes, c.get))], "total");

    if (linhasSocio.length > 0) {
      push([], "vazio");
      push([`PRÓ-LABORE DOS SÓCIOS`], "secao");
      push(["Nome", ...colsPrintPl.map((c) => c.h)], "th");
      linhasSocio.forEach((l) => push([l.f.nome || "—", ...colsPrintPl.map((c) => round2(c.get(l)))], "data"));
      push([`Total (${linhasSocio.length})`, ...colsPrintPl.map((c) => somaCol(linhasSocio, c.get))], "total");
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = range.s.r; R <= range.e.r; R++) {
      const papel = papeis[R];
      if (papel === "titulo" || papel === "secao") ws["!merges"]!.push({ s: { r: R, c: 0 }, e: { r: R, c: ncols - 1 } });
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (!cell) continue;
        const s: Record<string, unknown> = {};
        if (papel === "titulo") { s.font = { bold: true, sz: 14, color: { rgb: "FFFFFFFF" } }; s.fill = { fgColor: { rgb: brandHex } }; s.alignment = { vertical: "center" }; }
        else if (papel === "kv") { if (C === 0) s.font = { bold: true, color: { rgb: "FF334155" } }; }
        else if (papel === "secao") { s.font = { bold: true, color: { rgb: "FF0F172A" } }; s.fill = { fgColor: { rgb: "FFCBD9EC" } }; }
        else if (papel === "th") { s.font = { bold: true, color: { rgb: "FF0F172A" } }; s.fill = { fgColor: { rgb: "FFE2E8F0" } }; s.alignment = { horizontal: C === 0 ? "left" : "right", vertical: "center" }; }
        else { s.font = { bold: papel === "total" }; s.alignment = { horizontal: C >= 1 ? "right" : "left" }; }
        if (C >= 1 && (papel === "data" || papel === "total") && typeof cell.v === "number") cell.z = 'R$ #,##0.00';
        cell.s = s;
      }
    }
    ws["!rows"] = papeis.map((p) => ({ hpt: p === "titulo" ? 24 : p === "th" || p === "secao" ? 18 : 15 }));
    ws["!cols"] = [{ wch: 24 }, ...colsPrint.map(() => ({ wch: 13 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${MES[mesAtualIdx]} ${ano}`);
    XLSX.writeFile(wb, `folha-${mesNome.toLowerCase()}-${ano}.xlsx`);
  }
  const mesAtualIdx = ym ? Number(ym.slice(5, 7)) - 1 : 0;
  const anoAtual = ym ? ym.slice(0, 4) : "";
  // o botão "Puxar do mês anterior" fica alinhado embaixo do mês selecionado e se move ao trocar de mês
  const barraMesRef = useRef<HTMLDivElement | null>(null);
  const mesRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [puxarLeft, setPuxarLeft] = useState(0);
  useEffect(() => {
    const calc = () => {
      const barra = barraMesRef.current, b = mesRefs.current[mesAtualIdx];
      if (barra && b) setPuxarLeft(Math.max(0, b.getBoundingClientRect().left - barra.getBoundingClientRect().left));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [mesAtualIdx, ym, modo]);


  const semEquipe = carregado && funcsTodos.length === 0;
  const zbrl = (n: number) => (Math.abs(n) < 0.005 ? "" : brl(n)); // 0 fica em branco
  // larguras fixas por coluna (table-layout: fixed) — evita colunas com input esticarem
  const wGeral = [150, 116, 100, 104, 104, ...benefCols.map(() => 92), 42, 90, 84, 104, 106, 94, 84, 104];
  const somaGeral = wGeral.reduce((a, b) => a + b, 0);
  const wMensal = [150, 100, 96, 90, 92, ...cols.prov.map(() => 92), 42, 104, 90, 84, 90, 92, 94, ...cols.desc.map(() => 92), 42, 104, 100, 94, 84, 104];
  const somaMensal = wMensal.reduce((a, b) => a + b, 0);
  const wPl = [160, 120, ...cols.prov.map(() => 96), 42, 110, ...cols.desc.map(() => 96), 42, 110];
  const somaPl = wPl.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* barra de topo: alternância Geral/Mensal + ações */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 99, padding: 2 }}>
            {(["ativos", "desativados"] as const).map((k) => {
              const on = filtro === k, cor = k === "ativos" ? "#10B981" : "#EF4444";
              return <button key={k} onClick={() => setFiltro(k)} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0, background: on ? `${cor}22` : "transparent", color: on ? cor : "var(--muted)", transition: ".15s" }}>{k === "ativos" ? "Ativos" : "Desativados"}</button>;
            })}
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <div style={{ display: "inline-flex", alignItems: "stretch", border: "1px solid var(--line-2)", borderRadius: 10, overflow: "hidden" }}>
            {modo === "mensal" && !semEquipe && (
              <button data-tut="excel" onClick={baixarFolhaExcel} title="Baixar a folha do ano em Excel (uma coluna por mês)"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--txt)", background: "transparent", border: 0, borderRight: "1px solid var(--line-2)", padding: "7px 14px" }}>📊 Baixar em Excel</button>
            )}
            <button onClick={imprimir} title="Imprimir ou salvar em PDF"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--txt)", background: "transparent", border: 0, padding: "7px 14px" }}><Printer size={15} /> Imprimir / PDF</button>
          </div>
        </div>
      </div>

      {/* barra de ano + meses (estilo Dashboard): seleciona 1 mês */}
      {modo === "mensal" && !semEquipe && ym && (
        <div ref={barraMesRef} data-tut="meses" className="mesbar no-print" style={{ marginBottom: 16 }}>
          <span className="mesbar-ano"><SeletorAno ano={Number(anoAtual)} setAno={(a) => setYm(`${a}-${String(mesAtualIdx + 1).padStart(2, "0")}`)} /></span>
          <div className="mesbar-meses">
            {MES.map((nome, m) => {
              const on = m === mesAtualIdx;
              return (
                <button key={m} ref={(el) => { mesRefs.current[m] = el; }} onClick={() => setYm(`${anoAtual}-${String(m + 1).padStart(2, "0")}`)}
                  style={{ padding: "7px 15px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-ct,#fff)" : "var(--muted)" }}>
                  {nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* puxar dados do mês anterior: botão de destaque, alinhado embaixo do mês selecionado */}
      {modo === "mensal" && !semEquipe && !soLeitura && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {(() => {
            const jaFeito = mesTemDados;                 // mês já preenchido: trava até apagar tudo
            const off = jaFeito || !temMesAnterior();
            return (
              <div style={{ marginLeft: puxarLeft, transition: "margin-left .2s ease", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => { if (!off) puxarDoMesAnterior(); }} disabled={off}
                  title={jaFeito ? "Este mês já tem lançamentos" : (!temMesAnterior() ? "O mês anterior também está vazio" : "Copia os lançamentos do mês anterior para este mês")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: off ? "default" : "pointer", opacity: off ? .55 : 1, fontFamily: "inherit", fontSize: 14, fontWeight: 800, padding: "13px 24px", borderRadius: 14, border: 0, color: "#fff", background: jaFeito ? "var(--muted)" : "linear-gradient(120deg, var(--brand-dark), var(--brand))", boxShadow: off ? "none" : "0 14px 30px -14px color-mix(in srgb, var(--brand) 75%, transparent)" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(255,255,255,.20)", flexShrink: 0 }}><ArrowUpRight size={17} style={{ transform: "rotate(90deg)" }} /></span>
                  {jaFeito ? "Já exportado" : "Puxar do mês anterior"}
                </button>
                {jaFeito && <BtnInfo onClick={() => setInfoPuxar(true)} titulo="Por que está travado?" />}
              </div>
            );
          })()}
        </div>
      )}

      {/* aviso de somente consulta na aba Desativados */}
      {modo === "mensal" && !semEquipe && soLeitura && (
        <div className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--muted)", fontSize: 12.5, fontWeight: 600 }}>
          <Lock size={14} /> Somente consulta: os valores dos desativados não podem ser alterados.
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
            <table className="eq-tab eq-vsep" style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: somaGeral, minWidth: somaGeral }}>
              <colgroup>{wGeral.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr>
                  <th className="eq-th eq-fix" onClick={() => ordenarPor("nome")}>Nome {seta("nome")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("departamento")} style={{ width: 150 }}>Departamento {seta("departamento")}</th>
                  <th data-tut="salario" className="eq-th" onClick={() => ordenarPor("bruto")} style={{ textAlign: "right" }}><Rot t="Salário bruto" /> {seta("bruto")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("vt")} style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}><span><Rot t="Vale transporte" /> {seta("vt")}</span><ToggleModo modo={modoDe("vt")} onChange={(m) => trocarModoColuna("vt", m)} /></div>
                  </th>
                  <th className="eq-th" onClick={() => ordenarPor("va")} style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}><span><Rot t="Vale alimentação" /> {seta("va")}</span><ToggleModo modo={modoDe("va")} onChange={(m) => trocarModoColuna("va", m)} /></div>
                  </th>
                  {thsBenef()}
                  {thMaisBenef()}
                  <th data-tut="inss" className="eq-th" onClick={() => ordenarPor("inss")} style={{ textAlign: "right" }}>INSS {seta("inss")}<BtnInfoInss /></th>
                  <th className="eq-th" onClick={() => ordenarPor("irrf")} style={{ textAlign: "right" }}>IRRF {seta("irrf")}<BtnInfoIrrf /></th>
                  <th className="eq-th" onClick={() => ordenarPor("totalDesc")} style={{ textAlign: "right" }}><Rot t="Total descontos" /> {seta("totalDesc")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("liquido")} style={{ textAlign: "right" }}><Rot t="Salário líquido" /> {seta("liquido")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("provisao")} style={{ textAlign: "right" }}><Rot t="13º + Férias" /> {seta("provisao")}<BtnInfoProvisao /></th>
                  <th className="eq-th" onClick={() => ordenarPor("fgts")} style={{ textAlign: "right" }}>FGTS {seta("fgts")}<BtnInfoFgts /></th>
                  <th className="eq-th" onClick={() => ordenarPor("rescisao")} style={{ textAlign: "right" }}><Rot t="Provisão p/ rescisão" /> {seta("rescisao")}<BtnInfoRescisao /></th>
                </tr>
              </thead>
              <tbody>
                {geralView.map(({ f, bruto, inss, irrf, totalDesc, liquido, provisao, fgts, rescisao }) => (
                  <tr key={f.id} className="eq-row">
                    <td className="eq-fix">{celNome(f)}</td>
                    <td><CampoTexto valor={f.departamento || f.cargo || ""} onSalvar={(v) => salvarDepto(f.id, v)} /></td>
                    <td style={{ fontWeight: 700 }}><CampoMoeda valor={bruto} onSalvar={(n) => salvarSalario(f.id, n)} /></td>
                    <td><CampoBenefCel valor={vtNum(f)} modo={modoDe("vt")} salario={bruto} onSalvar={(n) => setBeneficioNum(f.id, "vt", n)} /></td>
                    <td><CampoBenefCel valor={vaNum(f)} modo={modoDe("va")} salario={bruto} onSalvar={(n) => setBeneficioNum(f.id, "va", n)} /></td>
                    {tdsBenef(f)}
                    <td />
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(inss)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(irrf)}</td>
                    <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{zbrl(totalDesc)}</td>
                    <td style={{ textAlign: "right", color: "#10B981", fontWeight: 800 }}>{zbrl(liquido)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(provisao)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(fgts)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(rescisao)}</td>
                  </tr>
                ))}
                {geralView.length === 0 && <tr><td colSpan={12 + benefCols.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nenhum resultado para “{busca}”.</td></tr>}
                {linhaCadastrar(12 + benefCols.length + 1)}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                  <td className="eq-fix" style={{ padding: "12px 10px" }}>Total ({linhasGeral.length})</td>
                  <td />
                  <td style={{ textAlign: "right", padding: "12px 10px" }}>{brl(totG.bruto)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.vt)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.va)}</td>
                  {benefCols.map((c) => <td key={c.id} style={{ textAlign: "right" }}>{brl(totBenefCol(c.id))}</td>)}
                  <td />
                  <td style={{ textAlign: "right" }}>{brl(totG.inss)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.irrf)}</td>
                  <td style={{ textAlign: "right", color: "#EF4444" }}>{brl(totG.totalDesc)}</td>
                  <td style={{ textAlign: "right", color: "#10B981" }}>{brl(totG.liquido)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.provisao)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.fgts)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totG.rescisao)}</td>
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
                <div className="sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{c.t}{c.t === "Custo total da folha" && <BtnInfo onClick={() => setInfoCusto(true)} titulo="Como o custo total é calculado" />}</div>
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
            <table className="eq-tab eq-vsep" style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: somaMensal, minWidth: somaMensal, pointerEvents: soLeitura ? "none" : undefined }}>
              <colgroup>{wMensal.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                {/* faixa agrupando Proventos e Descontos */}
                <tr>
                  <th className="eq-th eq-fix" style={{ background: "var(--card)" }} />
                  <th colSpan={6 + cols.prov.length} style={{ textAlign: "center", padding: "6px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#10B981", background: "rgba(16,185,129,.10)", borderBottom: "1px solid var(--line)" }}>Proventos</th>
                  <th colSpan={7 + cols.desc.length} style={{ textAlign: "center", padding: "6px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#EF4444", background: "rgba(239,68,68,.08)", borderBottom: "1px solid var(--line)" }}>Descontos</th>
                  <th style={{ background: "#fff", borderBottom: "1px solid var(--line)" }} />
                  <th colSpan={3} style={{ textAlign: "center", padding: "6px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>Encargos da empresa</th>
                </tr>
                <tr>
                  <th className="eq-th eq-fix" onClick={() => ordenarPor("nome")}>Nome {seta("nome")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("base")} style={{ textAlign: "right" }}><Rot t="Salário base" /> {seta("base")}</th>
                  <th className="eq-th" onClick={() => ordenarPor("comissao")} style={{ textAlign: "right" }}>Comissão {seta("comissao")}</th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><Rot t="Hora extra" /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><>Gratifi-<br />cação</></th>
                  {thsCol("prov")}
                  {thMais("prov")}
                  <th className="eq-th" onClick={() => ordenarPor("proventos")} style={{ textAlign: "right" }}>Proventos {seta("proventos")}</th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}>INSS <BtnInfoInss /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}>IRRF <BtnInfoIrrf /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}>Sindicato</th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><Rot t="Plano saúde" /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><>Adianta-<br />mento</></th>
                  {thsCol("desc")}
                  {thMais("desc")}
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}>Descontos</th>
                  <th className="eq-th" onClick={() => ordenarPor("liquido")} style={{ textAlign: "right" }}>Líquido {seta("liquido")}</th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><Rot t="13º + Férias" /> <BtnInfoProvisao /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}>FGTS <BtnInfoFgts /></th>
                  <th className="eq-th" style={{ textAlign: "right", cursor: "default" }}><Rot t="Provisão p/ rescisão" /> <BtnInfoRescisao /></th>
                </tr>
              </thead>
              <tbody>
                {mesView.map(({ f, v, extra, base, proventos, inss, irrf, totalDesc, liquido, provisaoM, fgtsM, rescisaoM }) => (
                  <tr key={`${ym}-${f.id}`} className="eq-row">
                    <td className="eq-fix">{celNome(f)}</td>
                    <td style={{ fontWeight: 700 }}><CampoMoeda valor={base} onSalvar={(n) => setVar(f.id, "base", n)} /></td>
                    <td><CampoMoeda valor={v.comissao} onSalvar={(n) => setVar(f.id, "comissao", n)} /></td>
                    <td><CampoMoeda valor={v.horaExtra} onSalvar={(n) => setVar(f.id, "horaExtra", n)} /></td>
                    <td><CampoMoeda valor={v.gratificacao} onSalvar={(n) => setVar(f.id, "gratificacao", n)} /></td>
                    {tdsCol("prov", f.id, extra)}
                    <td />
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{zbrl(proventos)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(inss)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(irrf)}</td>
                    <td><CampoMoeda valor={v.sindicato} onSalvar={(n) => setVar(f.id, "sindicato", n)} /></td>
                    <td><CampoMoeda valor={v.planoSaude} onSalvar={(n) => setVar(f.id, "planoSaude", n)} /></td>
                    <td><CampoMoeda valor={v.adiantamento} onSalvar={(n) => setVar(f.id, "adiantamento", n)} /></td>
                    {tdsCol("desc", f.id, extra)}
                    <td />
                    <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{zbrl(totalDesc)}</td>
                    <td style={{ textAlign: "right", color: "#10B981", fontWeight: 800 }}>{zbrl(liquido)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(provisaoM)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(fgtsM)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{zbrl(rescisaoM)}</td>
                  </tr>
                ))}
                {mesView.length === 0 && <tr><td colSpan={16 + cols.prov.length + cols.desc.length + 2} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nenhum resultado para “{busca}”.</td></tr>}
                {linhaCadastrar(16 + cols.prov.length + cols.desc.length + 2)}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                  <td className="eq-fix" style={{ padding: "12px 10px" }}>Total ({linhasMes.length})</td>
                  <td /><td /><td /><td />
                  {tdsVazias("prov")}
                  <td style={{ textAlign: "right" }}>{brl(totM.proventos)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totM.inss)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totM.irrf)}</td>
                  <td /><td /><td />
                  {tdsVazias("desc")}
                  <td style={{ textAlign: "right", color: "#EF4444" }}>{brl(totM.totalDesc)}</td>
                  <td style={{ textAlign: "right", color: "#10B981" }}>{brl(totM.liquido)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totMprov)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totMfgts)}</td>
                  <td style={{ textAlign: "right" }}>{brl(totMresc)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ---- Pró-labore dos sócios (regra própria, sem 13º/férias/FGTS) ---- */}
          {(
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <b style={{ fontSize: 15 }}>Pró-labore dos sócios</b>
                <BtnInfo onClick={() => setInfoProlabore(true)} titulo="Como funciona o pró-labore" />
              </div>
              <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 14px 36px -26px rgba(0,0,0,.45)" }}>
                <table className="eq-tab eq-vsep" style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: somaPl, minWidth: somaPl, pointerEvents: soLeitura ? "none" : undefined }}>
                  <colgroup>{wPl.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead>
                    <tr>
                      <th className="eq-th eq-fix">Nome</th>
                      <th className="eq-th" style={{ textAlign: "left" }}>Pró-labore</th>
                      {thsCol("prov")}
                      {thMais("prov")}
                      <th className="eq-th" style={{ textAlign: "left" }}>INSS (11%)<BtnInfo onClick={() => setInfoProlabore(true)} titulo="Como funciona o pró-labore" /></th>
                      {thsCol("desc")}
                      {thMais("desc")}
                      <th className="eq-th" style={{ textAlign: "left" }}>Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socioView.map(({ f, extra, base, inss, liquido }) => (
                      <tr key={`pl-${ym}-${f.id}`} className="eq-row">
                        <td className="eq-fix">{celNome(f)}</td>
                        <td style={{ fontWeight: 700 }}><CampoMoeda valor={base} esquerda onSalvar={(n) => setVar(f.id, "base", n)} /></td>
                        {tdsCol("prov", f.id, extra)}
                        <td />
                        <td style={{ textAlign: "left", color: "var(--muted)" }}>{zbrl(inss)}</td>
                        {tdsCol("desc", f.id, extra)}
                        <td />
                        <td style={{ textAlign: "left", color: "#10B981", fontWeight: 800 }}>{zbrl(liquido)}</td>
                      </tr>
                    ))}
                    {socioView.length === 0 && busca.trim() && <tr><td colSpan={6 + cols.prov.length + cols.desc.length} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Nenhum resultado para “{busca}”.</td></tr>}
                    {linhaCadastrar(6 + cols.prov.length + cols.desc.length)}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                      <td className="eq-fix" style={{ padding: "12px 10px" }}>Total ({linhasSocio.length})</td>
                      <td style={{ textAlign: "left" }}>{brl(totSocio.base)}</td>
                      {tdsVazias("prov")}
                      <td style={{ textAlign: "left" }}>{brl(totSocio.inss)}</td>
                      {tdsVazias("desc")}
                      <td style={{ textAlign: "left", color: "#10B981" }}>{brl(totSocio.liquido)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ---- somatório completo da folha (funcionários + pró-labore dos sócios) ---- */}
          {!soLeitura && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            {[
              { t: "Salários (bruto)", v: round2(totM.proventos + totSocio.base), cor: "var(--txt)", info: false },
              { t: "Líquido a pagar", v: round2(totM.liquido + totSocio.liquido), cor: "#10B981", info: false },
              { t: "Encargos (FGTS + provisões)", v: round2(totMfgts + totMprov), cor: "var(--brand)", info: false },
              { t: "Custo total da folha", v: round2(custoTotalMes + totSocio.base), cor: "var(--brand)", info: true },
            ].map((c) => (
              <div key={c.t} className="card" style={{ flex: "1 1 200px", padding: 16 }}>
                <div className="sub" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {c.t}
                  {c.info && <BtnInfo onClick={() => setInfoCustoMes(true)} titulo="Como o custo total é calculado" />}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: c.cor }}>{brl(c.v)}</div>
              </div>
            ))}
          </div>
          )}
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

      {/* pop-up: o que é o FGTS */}
      {infoFgts && (
        <div onClick={() => setInfoFgts(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 480, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>O que é o FGTS</b>
              </div>
              <button onClick={() => setInfoFgts(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
              {[
                <>É um depósito mensal que a empresa faz na conta do trabalhador: <b>{cfg.fgtsPct}% do salário bruto</b>.</>,
                <><b>Não é descontado</b> do funcionário — é um <b>custo da empresa</b>, por isso não entra no salário líquido.</>,
                <>O saldo fica disponível ao trabalhador em situações como <b>demissão sem justa causa</b>, aposentadoria e compra da casa própria.</>,
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoFgts(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* pop-up: provisão para rescisão (acerto final) */}
      {infoRescisao && (
        <div onClick={() => setInfoRescisao(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 500, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Provisão para rescisão (acerto final)</b>
              </div>
              <button onClick={() => setInfoRescisao(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
              {[
                <>É um valor guardado <b>todo mês</b> para cobrir a <b>multa de 40% do FGTS</b> paga na <b>demissão sem justa causa</b>.</>,
                <>Aqui provisionamos <b>40% do depósito mensal de FGTS</b> ({cfg.fgtsPct}% × 40% do salário), para o custo de um eventual desligamento <b>não pegar a empresa de surpresa</b>.</>,
                <>É uma <b>reserva contábil</b> (provisão), não um valor pago agora. Some ao <b>custo total da folha</b> como encargo previsto.</>,
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoRescisao(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {tut && <TutorialFolha onFim={fecharTut} setModo={setModo} />}

      {/* pop-up: provisão de 13º + férias */}
      {infoProvisao && (
        <div onClick={() => setInfoProvisao(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 500, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Provisão de 13º + Férias (1/3)</b>
              </div>
              <button onClick={() => setInfoProvisao(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
              {[
                <>É um valor <b>guardado todo mês</b> para pagar o <b>13º salário</b> e as <b>férias</b> quando chegarem, sem apertar o caixa.</>,
                <><b>13º:</b> <b>1/12 do salário</b> por mês (em 12 meses, forma um salário).</>,
                <><b>Férias:</b> <b>1/12 do salário + o 1/3 constitucional</b>, também dividido por 12.</>,
                <>É uma <b>reserva contábil</b> (provisão), não um valor pago agora. Entra no <b>custo total da folha</b> como encargo previsto.</>,
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoProvisao(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* pop-up: como o custo total da folha é calculado */}
      {infoCusto && (
        <div onClick={() => setInfoCusto(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Custo total da folha</b>
              </div>
              <button onClick={() => setInfoCusto(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 12px", lineHeight: 1.55, fontSize: 12.5 }}>
              É <b>quanto a empresa gasta de verdade</b> com a equipe no mês. A empresa <b>não paga o salário bruto</b> direto: paga o <b>líquido</b> ao funcionário e <b>repassa/provisiona</b> o resto. Soma:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                <><b>Líquido a pagar</b> aos funcionários ({brl(totG.liquido)})</>,
                <><b>INSS e IRRF retidos</b>, repassados ao governo ({brl(round2(totG.inss + totG.irrf))})</>,
                <><b>Vale transporte</b> ({brl(totG.vt)})</>,
                <><b>FGTS</b> ({brl(totG.fgts)}) e <b>provisão de rescisão</b> ({brl(totG.rescisao)})</>,
                <><b>Provisão de 13º + férias</b> ({brl(totG.provisao)})</>,
                <><b>Vale alimentação</b> ({brl(totG.va)}){benefCols.length > 0 && <> e <b>benefícios extras</b> ({brl(totBenefExtra)})</>}</>,
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <p className="sub" style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>
              Total: <b style={{ color: "var(--brand)" }}>{brl(custoTotal)}</b>.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoCusto(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* pop-up: como funciona o pró-labore dos sócios */}
      {infoProlabore && (
        <div onClick={() => setInfoProlabore(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Info size={18} /></span>
                <b style={{ fontSize: 16 }}>Como funciona o pró-labore</b>
              </div>
              <button onClick={() => setInfoProlabore(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 12px", lineHeight: 1.55, fontSize: 12.5 }}>
              O <b>pró-labore</b> é a remuneração do <b>sócio</b> pelo trabalho na empresa. A regra é <b>mais simples</b> que a do funcionário CLT:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                <>Tem <b>salário base</b> (o valor do pró-labore) e o desconto de <b>INSS</b>.</>,
                <>O INSS do sócio é de <b>11%</b> sobre o pró-labore, limitado ao teto de <b>{brl(INSS_TETO)}</b> (desconto máximo de <b>R$ 932,31</b> por mês).</>,
                <><b>Não tem 13º salário e não tem férias</b> (esses direitos são da CLT, não do sócio).</>,
                <><b>Não tem FGTS</b> nem provisão de rescisão.</>,
                <><b>Líquido</b> = pró-labore menos o INSS.</>,
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoProlabore(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* pop-up: como o custo total da folha (mensal) é calculado */}
      {infoCustoMes && (
        <div onClick={() => setInfoCustoMes(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Wallet size={18} /></span>
                <b style={{ fontSize: 16 }}>Custo total da folha</b>
              </div>
              <button onClick={() => setInfoCustoMes(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 12px", lineHeight: 1.55, fontSize: 12.5 }}>
              É <b>quanto a empresa gasta de verdade</b> com a equipe neste mês:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                <><b>Líquido a pagar</b> aos funcionários ({brl(totM.liquido)})</>,
                <><b>INSS</b> ({brl(totM.inss)})</>,
                <><b>FGTS</b> ({brl(totMfgts)})</>,
                <><b>Provisão de 13º + férias</b> ({brl(totMprov)})</>,
                <><b>Provisão de rescisão</b> ({brl(totMresc)})</>,
                ...(linhasSocio.length > 0 ? [<><b>Pró-labore dos sócios</b> ({brl(totSocio.base)})</>] : []),
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: "var(--brand)", fontWeight: 800 }}>•</span><span>{t}</span></div>
              ))}
            </div>
            <p className="sub" style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>
              Total do mês: <b style={{ color: "var(--brand)" }}>{brl(round2(custoTotalMes + totSocio.base))}</b>{linhasSocio.length > 0 ? " (funcionários + pró-labore dos sócios)" : ""}.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoCustoMes(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* pop-up: por que o "Puxar do mês anterior" está travado */}
      {infoPuxar && (
        <div onClick={() => setInfoPuxar(false)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--muted)" }}><Lock size={17} /></span>
                <b style={{ fontSize: 16 }}>Este mês já foi preenchido</b>
              </div>
              <button onClick={() => setInfoPuxar(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p className="sub" style={{ margin: "4px 0 0", lineHeight: 1.6, fontSize: 12.5 }}>
              O botão fica travado como <b>&ldquo;Já exportado&rdquo;</b> para você não sobrescrever os lançamentos deste mês sem querer.
              <br /><br />
              Para <b>puxar de novo</b> do mês anterior, <b>apague os valores</b> das tabelas deste mês (deixe tudo em branco). Assim que estiverem vazias, o botão volta a ficar disponível automaticamente.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn" onClick={() => setInfoPuxar(false)}>Entendi</button></div>
          </div>
        </div>
      )}

      {/* card da pessoa (abre ao clicar no nome) */}
      {pessoaCard && (() => { const p = pessoaCard;
        const ini = (p.nome || "?").trim().split(/\s+/).map((x) => x[0]).join("").toUpperCase().slice(0, 2);
        const nasc = p.nascimento ? p.nascimento.slice(0, 10).split("-").reverse().join("/") : "";
        const linhas: [string, string][] = [
          ["E-mail", p.email || ""], ["Telefone", p.contato || ""], ["CPF", p.cpf || ""],
          ["Nascimento", nasc],
          ["Departamento", p.departamento || ""], ["Salário base", p.salario ? brl(p.salario) : ""],
        ];
        return (
        <div onClick={() => setPessoaCard(null)} className="no-print"
          style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 440, padding: 0, overflow: "hidden" }}>
            {/* cabeçalho com avatar + nome */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", background: "linear-gradient(120deg, color-mix(in srgb, var(--brand) 16%, transparent), transparent)" }}>
              {p.foto
                ? <img src={p.foto} alt={p.nome || ""} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
                : <span style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--brand)", color: "#fff", fontSize: 20, fontWeight: 800 }}>{ini}</span>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 17, display: "block", lineHeight: 1.2 }}>{p.nome || "—"}</b>
                {(p.cargo || p.departamento) && <span className="sub" style={{ fontSize: 12.5 }}>{[p.cargo, p.departamento].filter(Boolean).join(" · ")}</span>}
              </div>
              <button onClick={() => setPessoaCard(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}><X size={18} /></button>
            </div>
            {/* dados */}
            <div style={{ padding: "8px 22px 18px", display: "grid", gap: 2 }}>
              {linhas.map(([r, v]) => (
                <div key={r} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="sub" style={{ fontSize: 12.5, fontWeight: 600 }}>{r}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{v || "—"}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setPessoaCard(null)}>Fechar</button>
                <button className="btn" onClick={irParaEquipe}>Abrir na Equipe</button>
              </div>
            </div>
          </div>
        </div>
        ); })()}

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

      {/* ===== versão de impressão (só aparece no PDF): folha completa do mês selecionado ===== */}
      {modo === "mensal" && !semEquipe && (
        <div className="folha-print print-only" style={{ color: "#000" }}>
          {/* cabeçalho com a marca/dados da empresa */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, borderBottom: "3px solid #0f172a", paddingBottom: 12, marginBottom: 14 }}>
            <div>
              {brand?.logo ? <img src={brand.logo} alt={nomeEmpresa} style={{ maxHeight: 46, maxWidth: 220, objectFit: "contain" }} /> : <b style={{ fontSize: 20 }}>{nomeEmpresa}</b>}
            </div>
            <div style={{ textAlign: "right" }}>
              <b style={{ fontSize: 13, textTransform: "uppercase" }}>{nomeEmpresa}</b>
              <div style={{ fontSize: 10.5, color: "#475569" }}>CNPJ {empresa?.cnpj || empExtra.cnpj || "00.000.000/0000-00"}</div>
              <div style={{ fontSize: 10.5, color: "#475569" }}>{empExtra.endereco || "xxxxxxxxxx/xx"}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 16, margin: "0 0 2px" }}>Folha de pagamento</h2>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>{MESES[mesAtualIdx]} de {anoAtual}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, fontSize: 11 }}>
            {[
              { t: "Salários (bruto)", v: round2(totM.proventos + totSocio.base) },
              { t: "Líquido a pagar", v: round2(totM.liquido + totSocio.liquido) },
              { t: "Encargos (FGTS + provisões)", v: round2(totMfgts + totMprov) },
              { t: "Custo total da folha", v: round2(custoTotalMes + totSocio.base) },
            ].map((c) => (
              <div key={c.t}><div style={{ textTransform: "uppercase", fontWeight: 700, color: "#666", fontSize: 8.5 }}>{c.t}</div><div style={{ fontWeight: 800, fontSize: 12 }}>{brl(c.v)}</div></div>
            ))}
          </div>

          <table className="folha-print-tab" style={{ width: "100%", borderCollapse: "collapse", fontSize: 7 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 4px", borderBottom: "1.5px solid #000", whiteSpace: "nowrap" }}>Nome</th>
                {colsPrint.map((c) => <th key={c.h} style={{ textAlign: "right", padding: "4px 4px", borderBottom: "1.5px solid #000", whiteSpace: "nowrap" }}>{c.h}</th>)}
              </tr>
            </thead>
            <tbody>
              {linhasMes.map((l) => (
                <tr key={`pr-${l.f.id}`}>
                  <td style={{ textAlign: "left", padding: "3px 4px", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" }}>{l.f.nome || "—"}</td>
                  {colsPrint.map((c) => <td key={c.h} style={{ textAlign: "right", padding: "3px 4px", borderBottom: "1px solid #ddd", fontWeight: c.b ? 700 : 400 }}>{pv(c.get(l))}</td>)}
                </tr>
              ))}
              <tr style={{ fontWeight: 800 }}>
                <td style={{ textAlign: "left", padding: "5px 4px", borderTop: "1.5px solid #000" }}>Total ({linhasMes.length})</td>
                {colsPrint.map((c) => <td key={c.h} style={{ textAlign: "right", padding: "5px 4px", borderTop: "1.5px solid #000" }}>{pv(somaCol(linhasMes, c.get))}</td>)}
              </tr>
            </tbody>
          </table>

          {linhasSocio.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, margin: "18px 0 8px" }}>Pró-labore dos sócios</h3>
              <table className="folha-print-tab" style={{ width: "100%", borderCollapse: "collapse", fontSize: 7.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 4px", borderBottom: "1.5px solid #000", whiteSpace: "nowrap" }}>Nome</th>
                    {colsPrintPl.map((c) => <th key={c.h} style={{ textAlign: "right", padding: "4px 4px", borderBottom: "1.5px solid #000", whiteSpace: "nowrap" }}>{c.h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {linhasSocio.map((l) => (
                    <tr key={`prs-${l.f.id}`}>
                      <td style={{ textAlign: "left", padding: "3px 4px", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" }}>{l.f.nome || "—"}</td>
                      {colsPrintPl.map((c) => <td key={c.h} style={{ textAlign: "right", padding: "3px 4px", borderBottom: "1px solid #ddd", fontWeight: c.b ? 700 : 400 }}>{pv(c.get(l))}</td>)}
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800 }}>
                    <td style={{ textAlign: "left", padding: "5px 4px", borderTop: "1.5px solid #000" }}>Total ({linhasSocio.length})</td>
                    {colsPrintPl.map((c) => <td key={c.h} style={{ textAlign: "right", padding: "5px 4px", borderTop: "1.5px solid #000" }}>{pv(somaCol(linhasSocio, c.get))}</td>)}
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Tutorial guiado da Folha (balão + destaque, estilo do tour de Finanças) ----
const PASSOS_FOLHA: { modo?: "geral" | "mensal"; sel: string; emoji: string; titulo: string; texto: React.ReactNode }[] = [
  { sel: '[data-tut="modos"]', emoji: "🧭", titulo: "Duas visões", texto: <>A Folha tem <b>Preenchimento geral</b> (a base fixa de cada pessoa) e <b>Folha mensal</b> (o que muda mês a mês).</> },
  { modo: "geral", sel: '[data-tut="salario"]', emoji: "💰", titulo: "Salário e benefícios", texto: <>No <b>Preenchimento geral</b>, digite o <b>salário bruto</b>. <b>Vale transporte</b> e <b>vale alimentação</b> são por pessoa, em <b>%</b> ou <b>valor fixo</b> (e dá para remover).</> },
  { modo: "geral", sel: '[data-tut="inss"]', emoji: "🧮", titulo: "Descontos automáticos", texto: <><b>INSS</b>, <b>IRRF</b> e <b>FGTS</b> são calculados sozinhos pelas tabelas de <b>2026</b>. Clique no <b>i</b> de cada um para entender o cálculo.</> },
  { modo: "mensal", sel: '[data-tut="meses"]', emoji: "🗓️", titulo: "Folha mensal", texto: <>Escolha o <b>mês</b> e lance <b>comissão</b>, <b>hora extra</b>, <b>gratificação</b> e os <b>descontos</b> daquele mês. Cada mês guarda os seus lançamentos.</> },
  { modo: "mensal", sel: '[data-tut="mais-desc"]', emoji: "➕", titulo: "Colunas próprias", texto: <>Precisa de outro item? Use o <b>+</b> para criar uma coluna própria de <b>provento</b> ou <b>desconto</b> (ex.: bônus, coparticipação).</> },
  { modo: "mensal", sel: '[data-tut="excel"]', emoji: "📊", titulo: "Baixar em Excel", texto: <>Baixe a folha do ano em <b>Excel</b>, com <b>uma coluna por mês</b> e o total de cada pessoa.</> },
  { sel: '[data-tut="cadastrar"]', emoji: "👥", titulo: "Quem entra na folha", texto: <>As pessoas vêm da <b>Equipe</b>. Use este link para <b>cadastrar</b> ou <b>gerenciar</b> os funcionários.</> },
];

function TutorialFolha({ onFim, setModo }: { onFim: () => void; setModo: (m: "geral" | "mensal") => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [estreito, setEstreito] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const u = () => setEstreito(mq.matches);
    u(); mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  const cur = PASSOS_FOLHA[step];
  useEffect(() => { if (cur.modo) setModo(cur.modo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  useEffect(() => {
    if (estreito) { setRect(null); return; }
    const upd = () => { const el = document.querySelector(cur.sel); if (el) { const r = el.getBoundingClientRect(); setRect({ left: r.left, top: r.top, width: r.width, height: r.height }); } else setRect(null); };
    upd(); const t = window.setTimeout(upd, 140);
    window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [step, cur.sel, estreito]);
  const centralizado = estreito || !rect;
  const popW = 340;
  const largura = typeof window !== "undefined" ? window.innerWidth : 1200;
  const altura = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = rect ? Math.max(16, Math.min(rect.left, largura - popW - 16)) : 0;
  const abaixo = rect ? rect.top + rect.height + 16 : 0;
  const top = rect && abaixo + 210 > altura ? Math.max(16, rect.top - 210) : abaixo;
  const ultimo = step === PASSOS_FOLHA.length - 1;
  const posBalao: React.CSSProperties = centralizado
    ? { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: popW }
    : { position: "fixed", left, top, width: popW };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: centralizado ? "rgba(15,23,42,.62)" : undefined }}>
      {!centralizado && rect && <div style={{ position: "fixed", left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(15,23,42,.62)", border: "2px solid var(--brand)", pointerEvents: "none", transition: "all .2s" }} />}
      <div style={{ ...posBalao, maxWidth: "calc(100vw - 32px)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 14, boxShadow: "0 22px 54px -12px rgba(0,0,0,.55)", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{cur.emoji}</span>
          <b style={{ fontSize: 15.5, flex: 1 }}>{cur.titulo}</b>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 9px", borderRadius: 99 }}>{step + 1} de {PASSOS_FOLHA.length}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--txt)" }}>{cur.texto}</p>
        <div style={{ display: "flex", gap: 5, margin: "14px 0" }}>
          {PASSOS_FOLHA.map((_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "var(--brand)" : "var(--line)" }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn ghost sm" onClick={onFim}>Pular</button>
          <div style={{ flex: 1 }} />
          {step > 0 && <button className="btn ghost sm" onClick={() => setStep((s) => s - 1)}>Anterior</button>}
          <button className="btn sm" onClick={() => { if (ultimo) onFim(); else setStep((s) => s + 1); }}>{ultimo ? "Concluir ✓" : "Próximo →"}</button>
        </div>
      </div>
    </div>
  );
}
