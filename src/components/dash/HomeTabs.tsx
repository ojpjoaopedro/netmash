"use client";
import { useEffect, useState } from "react";
import { Rocket, Pencil, Check, Target } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { resumo } from "@/lib/calc";
import { Metrica, def, valorMes } from "@/lib/indicadores";
import { playTick } from "@/lib/ui-sound";
import { fmt } from "./Kit";
import ResumoHome from "./ResumoHome";

type Tab = "resumo" | "faturamento" | "iniciativas";
const TABS: { k: Tab; label: string }[] = [
  { k: "resumo", label: "Resumo" }, { k: "faturamento", label: "Faturamento" }, { k: "iniciativas", label: "Iniciativas" },
];

/** Home minimalista com abas (estilo Hub). */
export default function HomeTabs({ lancs, clientes, metrs, saldoInicial, nome }: { lancs: Lancamento[]; clientes: Cliente[]; metrs: Metrica[]; saldoInicial: number; nome: string; onLancar?: () => void; onImportar?: () => void; reload?: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map((t) => {
          const at = tab === t.k;
          return <button key={t.k} onClick={() => { playTick(); setTab(t.k); }}
            style={{ flexShrink: 0, padding: "8px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              border: at ? "1px solid #37c6f0" : "1px solid var(--line-2)",
              background: at ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "rgba(255,255,255,.04)",
              color: at ? "#fff" : "var(--muted)",
              boxShadow: at ? "0 8px 20px -8px rgba(26,173,226,.6)" : "none" }}>{t.label}</button>;
        })}
      </div>
      {tab === "resumo" && <ResumoHome lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} nome={nome} />}
      {tab === "faturamento" && <IndicadoresChave metrs={metrs} lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} />}
      {tab === "iniciativas" && <Iniciativas />}
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

/** Meta anual definida pelo usuário no próprio anel (localStorage). */
function metaOverride(key: string): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(`me_metaAno:${key}`);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Meta da EMPRESA: override do anel → soma/último dos targets mensais → padrão do catálogo. */
function anelMeta(metrs: Metrica[], key: string): number {
  const ov = metaOverride(key);
  if (ov != null) return ov;
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
  const [editKey, setEditKey] = useState<string | null>(null);
  const [tmp, setTmp] = useState("");
  const [, setVer] = useState(0);
  function abrirMeta(key: string, metaAtual: number) { setEditKey(key); setTmp(String(metaAtual)); }
  function salvarMeta() {
    if (editKey) {
      const n = Number((tmp || "").trim().replace(/\./g, "").replace(",", "."));
      if (!tmp.trim() || !Number.isFinite(n) || n <= 0) localStorage.removeItem(`me_metaAno:${editKey}`);
      else localStorage.setItem(`me_metaAno:${editKey}`, String(n));
      playTick(660);
    }
    setEditKey(null); setVer((v) => v + 1);
  }

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
            <div key={c.key} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
              <button className="iconbtn" title="Editar meta" onClick={() => abrirMeta(c.key, c.meta)} style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26 }}><Pencil size={13} /></button>
              <Anel pct={pct} cor={c.cor} />
              <div style={{ minWidth: 0 }}>
                <div className="sub" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{c.label}</div>
                <b style={{ fontSize: 19, display: "block", lineHeight: 1.15, marginTop: 2 }}>{c.real ? fmt(c.real, c.un) : "—"}</b>
                {editKey === c.key ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
                    <input autoFocus value={tmp} onChange={(e) => setTmp(e.target.value)} inputMode="decimal" placeholder="Meta do ano"
                      onKeyDown={(e) => { if (e.key === "Enter") salvarMeta(); }}
                      style={{ width: 96, background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 7, padding: "4px 7px", fontSize: 12, fontFamily: "inherit" }} />
                    <button className="btn sm" onClick={salvarMeta}><Check size={12} /></button>
                  </div>
                ) : (
                  <span className="sub" style={{ fontSize: 11 }}>Meta {fmt(c.meta, c.un)}</span>
                )}
                <div style={{ marginTop: 5, display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: ritmo.c + "1f", color: ritmo.c }}>{ritmo.t}</div>
              </div>
            </div>
          );
        })}
      </div>
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
