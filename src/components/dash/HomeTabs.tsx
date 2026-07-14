"use client";
import { useEffect, useMemo, useState } from "react";
import { Rocket, Pencil, Check, Target, TrendingUp } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { brl } from "@/lib/format";
import { resumo } from "@/lib/calc";
import { Metrica, def, valorMes } from "@/lib/indicadores";
import { fmt } from "./Kit";
import { LineChart } from "./Charts";
import ResumoHome from "./ResumoHome";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Home em rolagem única (estilo Hub): Resumo → Indicadores-chave → Faturamento → Satisfação → Iniciativas. */
export default function HomeTabs({ lancs, clientes, metrs, saldoInicial, nome }: { lancs: Lancamento[]; clientes: Cliente[]; metrs: Metrica[]; saldoInicial: number; nome: string; onLancar?: () => void; onImportar?: () => void; reload?: () => void }) {
  return (
    <>
      <ResumoHome lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} nome={nome} />
      <IndicadoresChave metrs={metrs} lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} />
      <FaturamentoResumo lancs={lancs} saldoInicial={saldoInicial} />
      <Iniciativas />
    </>
  );
}

/* ─── Indicadores-chave (anéis de progresso vs meta do ano) ─────────────── */
function anelValor(metrs: Metrica[], key: string): number {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const d = def(key);
  if (d?.agg === "last") { for (let i = meses.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, meses[i]); if (m) return m.value; } return 0; }
  return meses.reduce((a, m) => a + (valorMes(metrs, key, m)?.value ?? 0), 0);
}

/** Meta da EMPRESA (soma/último dos targets mensais cadastrados); cai no padrão do catálogo se não houver. */
function anelMeta(metrs: Metrica[], key: string): number {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const d = def(key);
  const padrao = d?.metaAno ?? 0;
  if (d?.agg === "last") { for (let i = meses.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, meses[i]); if (m?.target) return m.target; } return padrao; }
  const soma = meses.reduce((a, m) => a + (valorMes(metrs, key, m)?.target ?? 0), 0);
  return soma > 0 ? soma : padrao;
}

function progressoAno(): number {
  const now = new Date();
  const ini = new Date(now.getFullYear(), 0, 1).getTime();
  const fim = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return ((now.getTime() - ini) / (fim - ini)) * 100;
}

function Anel({ pct, cor }: { pct: number; cor: string }) {
  const R = 30, C = 2 * Math.PI * R, off = C - (Math.min(100, Math.max(0, pct)) / 100) * C;
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" style={{ flexShrink: 0 }}>
      <circle cx="37" cy="37" r={R} fill="none" stroke="var(--line-2)" strokeWidth="6" />
      <circle cx="37" cy="37" r={R} fill="none" stroke={cor} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 37 37)" />
      <text x="37" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--txt)">{Math.round(pct)}%</text>
    </svg>
  );
}

function IndicadoresChave({ metrs, lancs, clientes, saldoInicial }: { metrs: Metrica[]; lancs: Lancamento[]; clientes: Cliente[]; saldoInicial: number }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const rAno = resumo(lancs, meses, saldoInicial);
  const yp = progressoAno();

  const CARDS = [
    { key: "faturamento", label: "Faturamento", cor: "#10B981", real: rAno.faturamento, meta: anelMeta(metrs, "faturamento"), un: "BRL" },
    { key: "lucro", label: "Lucro", cor: "#1AADE2", real: rAno.lucro, meta: anelMeta(metrs, "lucro"), un: "BRL" },
    { key: "margem", label: "Margem", cor: "#8b5cf6", real: rAno.margem, meta: anelMeta(metrs, "margem"), un: "%" },
    { key: "novos_clientes", label: "Novos clientes", cor: "#F59E0B", real: clientes.length || anelValor(metrs, "novos_clientes"), meta: anelMeta(metrs, "novos_clientes"), un: "count" },
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-title"><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1AADE2,#0c6e9e)" }}><Target size={18} color="#fff" /></span>
        <div><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)" }}>No ano</div><h2 style={{ margin: 0 }}>Indicadores-chave</h2></div>
      </div></div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        {CARDS.map((c) => {
          const pct = c.meta > 0 ? (c.real / c.meta) * 100 : 0;
          const ritmo = pct >= yp ? { t: "No ritmo", c: "#10B981" } : pct >= yp * 0.75 ? { t: "Atenção", c: "#F59E0B" } : { t: "Abaixo", c: "#EF4444" };
          return (
            <div key={c.key} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <Anel pct={pct} cor={c.cor} />
              <div style={{ minWidth: 0 }}>
                <div className="sub" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{c.label}</div>
                <b style={{ fontSize: 19, display: "block", lineHeight: 1.15, marginTop: 2 }}>{c.real ? fmt(c.real, c.un) : "—"}</b>
                <span className="sub" style={{ fontSize: 11 }}>Meta {fmt(c.meta, c.un)}</span>
                <div style={{ marginTop: 5, display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: ritmo.c + "1f", color: ritmo.c }}>{ritmo.t}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Faturamento mês a mês (compacto) ──────────────────────────────────── */
function FaturamentoResumo({ lancs, saldoInicial }: { lancs: Lancamento[]; saldoInicial: number }) {
  const ano = String(new Date().getFullYear());
  const mesesComDados = useMemo(() => new Set(lancs.map((l) => l.data_competencia.slice(0, 7))), [lancs]);
  const cols = useMemo(() => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`).filter((m) => mesesComDados.has(m)), [ano, mesesComDados]);
  const serie = useMemo(() => cols.map((m) => ({ label: MES3[Number(m.slice(5, 7)) - 1], value: resumo(lancs, [m], 0).faturamento })), [lancs, cols]);
  const total = useMemo(() => resumo(lancs, cols, saldoInicial).faturamento, [lancs, cols, saldoInicial]);
  if (cols.length === 0) return null;
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={18} color="#10B981" /><h3 style={{ margin: 0 }}>Faturamento mês a mês</h3></div>
        <div style={{ textAlign: "right", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 12, padding: "8px 14px" }}>
          <div className="sub" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "#10B981" }}>TOTAL FATURADO</div>
          <b style={{ fontSize: 20 }}>{brl(total)}</b>
        </div>
      </div>
      <LineChart pts={serie} cor="#1AADE2" />
    </div>
  );
}

/* ─── Iniciativas ───────────────────────────────────────────────────────── */
function Iniciativas() {
  const [txt, setTxt] = useState("");
  const [editando, setEditando] = useState(false);
  const [rasc, setRasc] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem("me_iniciativas") || ""); }, []);
  function salvar() { localStorage.setItem("me_iniciativas", rasc); setTxt(rasc); setEditando(false); }
  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-title"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Rocket size={20} color="var(--accent)" /><h2 style={{ margin: 0 }}>Iniciativas</h2></div>
        {editando ? <button className="btn sm" onClick={salvar}><Check size={14} /> Salvar</button> : <button className="btn ghost sm" onClick={() => { setRasc(txt); setEditando(true); }}><Pencil size={13} /> Editar</button>}
      </div>
      <div className="card">
        {editando ? (
          <textarea value={rasc} onChange={(e) => setRasc(e.target.value)} rows={8} placeholder={"Liste as iniciativas e metas estratégicas do período…\n\nEx:\n• Lançar novo produto até Set\n• Reduzir churn para 3%\n• Contratar 2 vendedores"}
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        ) : txt ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14.5 }}>{txt}</p>
          : <p className="sub" style={{ fontStyle: "italic" }}>Nenhuma iniciativa ainda. Clique em &ldquo;Editar&rdquo; para escrever o plano estratégico do período.</p>}
      </div>
    </div>
  );
}
