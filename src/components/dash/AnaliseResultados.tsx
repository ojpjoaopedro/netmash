"use client";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Sparkles, BarChart3 } from "lucide-react";
import { Lancamento } from "@/lib/db";
import { brl, rotuloMes, mesDe } from "@/lib/format";
import { resumo, dre, receitasPorCategoria, despesasPorCategoria, matrizPorCategoria, ebitda } from "@/lib/calc";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PALETA = ["#10B981", "#1AADE2", "#8b5cf6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1", "#c48a57", "#84CC16", "#F97316", "#0EA5E9"];
const mesCurto = (ym: string) => MES3[Number(ym.slice(5, 7)) - 1];

export default function AnaliseResultados({ lancs, saldoInicial }: { lancs: Lancamento[]; saldoInicial: number }) {
  const anos = useMemo(() => [...new Set(lancs.map((l) => l.data_competencia.slice(0, 4)))].filter(Boolean).sort().reverse(), [lancs]);
  const anoAtual = String(new Date().getFullYear());
  const [ano, setAno] = useState(anos[0] || anoAtual);
  const [sel, setSel] = useState<string>("ANO"); // "ANO" | "Q1".."Q4" | "YYYY-MM"

  const mesesComDados = useMemo(() => new Set(lancs.map((l) => mesDe(l.data_competencia))), [lancs]);
  const mesesDoAno = useMemo(() => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`), [ano]);
  const meses = sel === "ANO" ? mesesDoAno
    : sel.startsWith("Q") ? mesesDoAno.slice((Number(sel[1]) - 1) * 3, (Number(sel[1]) - 1) * 3 + 3)
    : [sel];
  const cols = useMemo(() => { const c = mesesDoAno.filter((m) => mesesComDados.has(m)); return c.length ? c : mesesDoAno; }, [mesesDoAno, mesesComDados]);

  const r = useMemo(() => resumo(lancs, meses, saldoInicial), [lancs, meses, saldoInicial]);
  const eb = useMemo(() => ebitda(lancs, meses), [lancs, meses]);
  const fatCats = useMemo(() => receitasPorCategoria(lancs, meses), [lancs, meses]);
  const custoCats = useMemo(() => despesasPorCategoria(lancs, meses), [lancs, meses]);
  const linhasDRE = useMemo(() => dre(lancs, meses).linhas, [lancs, meses]);
  const matRec = useMemo(() => matrizPorCategoria(lancs, cols, "receita"), [lancs, cols]);
  const matCus = useMemo(() => matrizPorCategoria(lancs, cols, "despesa"), [lancs, cols]);

  const periodoLabel = sel === "ANO" ? `Ano ${ano}` : sel.startsWith("Q") ? `${sel[1]}º trimestre · ${ano}` : rotuloMes(sel);
  const pos = r.lucro >= 0;
  const semDados = r.faturamento === 0 && r.despesas === 0;

  const totalCol = (linhas: { valores: number[] }[], i: number) => linhas.reduce((a, l) => a + l.valores[i], 0);

  return (
    <>
      <div className="section-title" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)" }}><BarChart3 size={22} color="var(--accent)" /></span>
          <div>
            <h2 style={{ margin: 0 }}>Análise de Resultados</h2>
            <p className="sub" style={{ fontSize: 12.5 }}>DRE, margens e composição — {periodoLabel}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {anos.length > 1 && (
            <select value={ano} onChange={(e) => setAno(e.target.value)} style={{ background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <div className="period" style={{ flexWrap: "wrap" }}>
            <button className={sel === "ANO" ? "active" : ""} onClick={() => setSel("ANO")}>Ano</button>
            {[1, 2, 3, 4].map((q) => <button key={q} className={sel === `Q${q}` ? "active" : ""} onClick={() => setSel(`Q${q}`)}>{q}º Tri</button>)}
          </div>
          <select value={sel.includes("-") ? sel : ""} onChange={(e) => e.target.value && setSel(e.target.value)} style={{ background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
            <option value="">Escolher mês…</option>
            {mesesDoAno.map((m) => <option key={m} value={m} disabled={!mesesComDados.has(m)}>{rotuloMes(m)}</option>)}
          </select>
        </div>
      </div>

      {semDados ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <BarChart3 size={30} style={{ opacity: .4 }} />
          <p className="sub" style={{ marginTop: 10 }}>Sem lançamentos em {periodoLabel}. Registre receitas e despesas (ou escolha outro período) para ver a análise.</p>
        </div>
      ) : (
        <>
          {/* HERO + KPIs */}
          <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: 22, color: "#fff", background: pos ? "linear-gradient(135deg,#059669,#0d9488 55%,#047857)" : "linear-gradient(135deg,#e11d48,#b91c1c 55%,#9f1239)", boxShadow: pos ? "0 18px 44px -14px rgba(16,185,129,.5)" : "0 18px 44px -14px rgba(225,29,72,.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center" }}>{pos ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase", opacity: .9 }}>{pos ? "Lucro do período" : "Prejuízo do período"}</span>
                <Sparkles size={16} style={{ marginLeft: "auto", opacity: .7 }} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1 }}>{pos ? "" : "−"}{brl(Math.abs(r.lucro))}</div>
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", borderRadius: 99, padding: "4px 12px", fontSize: 12.5, fontWeight: 700 }}>Margem líquida {r.margem.toFixed(1)}%</div>
            </div>
            <KpiBox icon={<DollarSign size={18} />} cor="#10B981" label="Faturamento" valor={brl(r.faturamento)} />
            <KpiBox icon={<Receipt size={18} />} cor="#EF4444" label="Custos totais" valor={brl(r.despesas)} />
            <KpiBox icon={<TrendingUp size={18} />} cor="#1AADE2" label="EBITDA (aprox.)" valor={brl(eb)} />
          </div>

          {/* COMPOSIÇÕES */}
          <div className="grid two" style={{ gap: 14, marginBottom: 16 }}>
            <Composicao titulo="Composição do Faturamento" sub="De onde veio a receita" total={r.faturamento} fatias={fatCats} corTotal="#10B981" />
            <Composicao titulo="Composição dos Custos" sub="Para onde foi o dinheiro" total={r.despesas} fatias={custoCats} corTotal="#EF4444" />
          </div>

          {/* DRE */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 4 }}>DRE — Demonstração de Resultado</h3>
            <p className="sub" style={{ marginBottom: 12 }}>{periodoLabel}</p>
            <div>
              {linhasDRE.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontWeight: l.tipo === "resultado" ? 800 : 500, fontSize: l.tipo === "resultado" ? 15.5 : 14 }}>
                  <span style={{ color: l.tipo === "resultado" ? "var(--txt)" : "var(--muted)" }}>{l.rotulo}</span>
                  <span className="mono" style={{ color: l.tipo === "receita" ? "var(--green)" : l.tipo === "despesa" ? "var(--red)" : (l.valor >= 0 ? "var(--green)" : "var(--red)") }}>{brl(l.valor)}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1, background: "var(--card-2,rgba(255,255,255,.03))", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}><div className="sub" style={{ fontSize: 11.5 }}>EBITDA (aprox.)</div><b style={{ fontSize: 18 }}>{brl(eb)}</b></div>
                <div style={{ flex: 1, background: "var(--card-2,rgba(255,255,255,.03))", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}><div className="sub" style={{ fontSize: 11.5 }}>Margem líquida</div><b style={{ fontSize: 18, color: pos ? "var(--green)" : "var(--red)" }}>{r.margem.toFixed(1)}%</b></div>
              </div>
            </div>
          </div>

          {/* PLANILHAS (ano) */}
          <Planilha titulo="Receitas por categoria" sub={`Mês a mês · ${ano}`} cols={cols} linhas={matRec} corTotal="var(--green)" totalCol={totalCol} />
          <Planilha titulo="Custos por categoria" sub={`Mês a mês · ${ano}`} cols={cols} linhas={matCus} corTotal="var(--red)" totalCol={totalCol} />
          <PlanilhaResultado cols={cols} rec={matRec} cus={matCus} totalCol={totalCol} />
        </>
      )}
    </>
  );
}

function KpiBox({ icon, cor, label, valor }: { icon: React.ReactNode; cor: string; label: string; valor: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: cor + "22", color: cor, flexShrink: 0 }}>{icon}</span>
      <div><b style={{ fontSize: 20, display: "block", lineHeight: 1 }}>{valor}</b><small className="sub">{label}</small></div>
    </div>
  );
}

function Composicao({ titulo, sub, total, fatias, corTotal }: { titulo: string; sub: string; total: number; fatias: { categoria: string; valor: number }[]; corTotal: string }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div><h3 style={{ margin: 0 }}>{titulo}</h3><p className="sub" style={{ fontSize: 12 }}>{sub}</p></div>
        <b style={{ fontSize: 18, color: corTotal }}>{brl(total)}</b>
      </div>
      <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.05)", marginBottom: 14 }}>
        {fatias.map((f, i) => <div key={i} style={{ width: `${total > 0 ? (f.valor / total) * 100 : 0}%`, background: PALETA[i % PALETA.length] }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {fatias.slice(0, 8).map((f, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: PALETA[i % PALETA.length], flexShrink: 0 }} />
              <span className="sub" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.categoria}</span>
            </div>
            <b style={{ fontSize: 15, display: "block", marginTop: 3 }}>{brl(f.valor)}</b>
            <span className="sub" style={{ fontSize: 11 }}>{total > 0 ? Math.round((f.valor / total) * 100) : 0}% do total</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Planilha({ titulo, sub, cols, linhas, corTotal, totalCol }: { titulo: string; sub: string; cols: string[]; linhas: { categoria: string; valores: number[]; total: number }[]; corTotal: string; totalCol: (l: { valores: number[] }[], i: number) => number }) {
  const totalGeral = linhas.reduce((a, l) => a + l.total, 0);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 2 }}>{titulo}</h3>
      <p className="sub" style={{ marginBottom: 12 }}>{sub}</p>
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 520 }}>
          <thead><tr><th>Categoria</th>{cols.map((m) => <th key={m} className="num">{mesCurto(m)}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td>{l.categoria}</td>
                {l.valores.map((v, k) => <td key={k} className="num mono" style={{ opacity: v ? 1 : .35 }}>{v ? brl(v) : "–"}</td>)}
                <td className="num mono" style={{ fontWeight: 700 }}>{brl(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 800 }}>
              <td>Total</td>
              {cols.map((_, i) => <td key={i} className="num mono">{brl(totalCol(linhas, i))}</td>)}
              <td className="num mono" style={{ color: corTotal }}>{brl(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PlanilhaResultado({ cols, rec, cus, totalCol }: { cols: string[]; rec: { valores: number[] }[]; cus: { valores: number[] }[]; totalCol: (l: { valores: number[] }[], i: number) => number }) {
  const resultados = cols.map((_, i) => totalCol(rec, i) - totalCol(cus, i));
  const totalRes = resultados.reduce((a, b) => a + b, 0);
  const margem = (i: number) => { const r = totalCol(rec, i); return r ? (resultados[i] / r) * 100 : 0; };
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 2 }}>Resultado mês a mês</h3>
      <p className="sub" style={{ marginBottom: 12 }}>Receita − Custos = Resultado, e a margem</p>
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 520 }}>
          <thead><tr><th></th>{cols.map((m) => <th key={m} className="num">{mesCurto(m)}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            <tr><td>Receita</td>{cols.map((_, i) => <td key={i} className="num mono">{brl(totalCol(rec, i))}</td>)}<td className="num mono" style={{ fontWeight: 700 }}>{brl(cols.reduce((a, _, i) => a + totalCol(rec, i), 0))}</td></tr>
            <tr><td>Custos</td>{cols.map((_, i) => <td key={i} className="num mono" style={{ color: "var(--red)" }}>{brl(totalCol(cus, i))}</td>)}<td className="num mono" style={{ fontWeight: 700, color: "var(--red)" }}>{brl(cols.reduce((a, _, i) => a + totalCol(cus, i), 0))}</td></tr>
            <tr style={{ fontWeight: 800 }}><td>Resultado</td>{resultados.map((v, i) => <td key={i} className="num mono" style={{ color: v >= 0 ? "var(--green)" : "var(--red)" }}>{brl(v)}</td>)}<td className="num mono" style={{ color: totalRes >= 0 ? "var(--green)" : "var(--red)" }}>{brl(totalRes)}</td></tr>
            <tr><td className="sub">Margem</td>{cols.map((_, i) => <td key={i} className="num sub">{margem(i).toFixed(0)}%</td>)}<td className="num sub"></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
