"use client";
import { useMemo, useState } from "react";
import { ShoppingCart, Target, Users, Award, Zap, Trophy, Pencil } from "lucide-react";
import { Lancamento } from "@/lib/db";
import { Metrica, def, valorMes } from "@/lib/indicadores";
import { brl, rotuloMes, mesDe } from "@/lib/format";
import { resumo } from "@/lib/calc";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesCurto = (ym: string) => MES3[Number(ym.slice(5, 7)) - 1];

export default function GestaoComercial({ metrs, lancs, saldoInicial, onEditar }: { metrs: Metrica[]; lancs: Lancamento[]; saldoInicial: number; onEditar?: () => void }) {
  const anos = useMemo(() => [...new Set(lancs.map((l) => l.data_competencia.slice(0, 4)))].filter(Boolean).sort().reverse(), [lancs]);
  const [ano, setAno] = useState(anos[0] || String(new Date().getFullYear()));
  const [sel, setSel] = useState<string>("ANO");

  const mesesComDados = useMemo(() => new Set(lancs.map((l) => mesDe(l.data_competencia))), [lancs]);
  const mesesDoAno = useMemo(() => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`), [ano]);
  const meses = sel === "ANO" ? mesesDoAno
    : sel.startsWith("Q") ? mesesDoAno.slice((Number(sel[1]) - 1) * 3, (Number(sel[1]) - 1) * 3 + 3)
    : [sel];
  const cols = useMemo(() => { const c = mesesDoAno.filter((m) => mesesComDados.has(m)); return c.length ? c : mesesDoAno; }, [mesesDoAno, mesesComDados]);

  const valPeriodo = (key: string, ms: string[]) => {
    const d = def(key);
    if (d?.agg === "last") { for (let i = ms.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, ms[i]); if (m) return m.value; } return 0; }
    return ms.reduce((a, m) => a + (valorMes(metrs, key, m)?.value ?? 0), 0);
  };
  const metaPeriodo = (key: string, ms: string[]) => {
    const d = def(key);
    if (d?.agg === "last") { for (let i = ms.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, ms[i]); if (m) return m.target; } return 0; }
    return ms.reduce((a, m) => a + (valorMes(metrs, key, m)?.target ?? 0), 0);
  };

  const r = useMemo(() => resumo(lancs, meses, saldoInicial), [lancs, meses, saldoInicial]);
  const metaFat = metaPeriodo("faturamento", meses);
  const pctMeta = metaFat > 0 ? Math.min(100, (r.faturamento / metaFat) * 100) : 0;

  const vendas = valPeriodo("vendas", meses);
  const novos = valPeriodo("novos_clientes", meses);
  const ticket = valPeriodo("ticket_medio", meses) || (vendas ? r.faturamento / vendas : 0);
  const conversao = valPeriodo("conversao", meses);

  const funil = [
    { label: "Oportunidades", cor: "#EF4444", valor: valPeriodo("oportunidades", meses) },
    { label: "Reuniões", cor: "#F59E0B", valor: valPeriodo("reunioes", meses) },
    { label: "Vendas", cor: "#1AADE2", valor: valPeriodo("vendas", meses) },
    { label: "Novos clientes", cor: "#10B981", valor: valPeriodo("novos_clientes", meses) },
  ];
  const funilMax = Math.max(1, ...funil.map((f) => f.valor));

  // Pódio: top clientes por faturamento (via contato dos lançamentos)
  const podio = useMemo(() => {
    const set = new Set(meses);
    const map = new Map<string, number>();
    for (const l of lancs) {
      if (l.tipo !== "receita" || !set.has(mesDe(l.data_competencia)) || !l.contato) continue;
      map.set(l.contato, (map.get(l.contato) || 0) + l.valor);
    }
    return [...map.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [lancs, meses]);
  const totalPodio = podio.reduce((a, p) => a + p.valor, 0);

  const periodoLabel = sel === "ANO" ? `Ano ${ano}` : sel.startsWith("Q") ? `${sel[1]}º trimestre · ${ano}` : rotuloMes(sel);
  const MEDALHAS = ["🥇", "🥈", "🥉", "4º", "5º"];

  return (
    <>
      <div className="section-title" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)" }}><ShoppingCart size={22} color="var(--accent)" /></span>
          <div>
            <h2 style={{ margin: 0 }}>Gestão à Vista — Comercial</h2>
            <p className="sub" style={{ fontSize: 12.5 }}>Meta, funil, pódio e evolução — {periodoLabel}</p>
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
          {onEditar && <button className="btn sm" onClick={onEditar} style={{ display: "flex", alignItems: "center", gap: 6 }}><Pencil size={13} /> Editar dados</button>}
        </div>
      </div>

      {/* META + KPIs */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div className="card" style={{ borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="sub" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 }}>Faturamento do período</span>
            {metaFat > 0 && <span className="sub" style={{ fontSize: 12 }}>meta {brl(metaFat)}</span>}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.02em", margin: "6px 0" }}>{brl(r.faturamento)}</div>
          {metaFat > 0 && (
            <>
              <div style={{ height: 10, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pctMeta}%`, background: pctMeta >= 100 ? "var(--green)" : "linear-gradient(90deg,#1AADE2,#5BC5EB)" }} />
              </div>
              <p className="sub" style={{ marginTop: 6, fontSize: 12.5 }}><b style={{ color: pctMeta >= 100 ? "var(--green)" : "var(--accent)" }}>{pctMeta.toFixed(0)}%</b> da meta</p>
            </>
          )}
        </div>
        <Kpi icon={<Users size={18} />} cor="#8b5cf6" label="Vendas (negócios)" valor={vendas ? String(vendas) : "—"} />
        <Kpi icon={<Award size={18} />} cor="#F59E0B" label="Ticket médio" valor={ticket ? brl(ticket) : "—"} />
        <Kpi icon={<Zap size={18} />} cor="#1AADE2" label="Conversão" valor={conversao ? conversao.toFixed(1) + "%" : "—"} />
      </div>

      <div className="grid two" style={{ gap: 14, marginBottom: 16 }}>
        {/* FUNIL */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Target size={18} color="var(--accent)" /><h3 style={{ margin: 0 }}>Funil de Vendas</h3></div>
          <p className="sub" style={{ marginBottom: 14 }}>Da oportunidade até o novo cliente</p>
          {funil.every((f) => f.valor === 0) ? (
            <p className="sub">Preencha os indicadores comerciais (Oportunidades, Reuniões, Vendas) para ver o funil. Você edita em cada área de métricas.</p>
          ) : funil.map((f, i) => {
            const conv = i > 0 && funil[i - 1].valor > 0 ? (f.valor / funil[i - 1].valor) * 100 : null;
            const w = 40 + (f.valor / funilMax) * 60;
            return (
              <div key={i}>
                {conv !== null && <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)", margin: "3px 0" }}>▼ {conv.toFixed(0)}%</div>}
                <div style={{ width: `${w}%`, margin: "0 auto", borderRadius: 10, padding: "10px 14px", background: `linear-gradient(90deg, ${f.cor}, ${f.cor}bb)`, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{f.label}</span>
                  <b style={{ fontSize: 16 }}>{f.valor}</b>
                </div>
              </div>
            );
          })}
        </div>

        {/* PÓDIO */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Trophy size={18} color="#F59E0B" /><h3 style={{ margin: 0 }}>Pódio de clientes</h3></div>
          <p className="sub" style={{ marginBottom: 14 }}>Quem mais faturou no período</p>
          {podio.length === 0 ? (
            <p className="sub">Sem clientes identificados. Preencha o campo &ldquo;Cliente/Fornecedor&rdquo; nas receitas para ver o ranking.</p>
          ) : podio.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < podio.length - 1 ? "1px solid var(--line)" : undefined }}>
              <span style={{ width: 30, textAlign: "center", fontSize: i < 3 ? 20 : 14, fontWeight: 700, color: "var(--muted)" }}>{MEDALHAS[i]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
                <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.08)", marginTop: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${totalPodio ? (p.valor / podio[0].valor) * 100 : 0}%`, background: "#F59E0B" }} />
                </div>
              </div>
              <b className="mono" style={{ fontSize: 14 }}>{brl(p.valor)}</b>
            </div>
          ))}
        </div>
      </div>

      {/* EVOLUÇÃO MÊS A MÊS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 2 }}>Evolução mês a mês</h3>
        <p className="sub" style={{ marginBottom: 12 }}>Indicadores comerciais · {ano}</p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>Indicador</th>{cols.map((m) => <th key={m} className="num">{mesCurto(m)}</th>)}</tr></thead>
            <tbody>
              <tr><td>Faturamento</td>{cols.map((m) => <td key={m} className="num mono">{brl(resumo(lancs, [m], 0).faturamento)}</td>)}</tr>
              <tr><td>Vendas</td>{cols.map((m) => <td key={m} className="num mono">{valPeriodo("vendas", [m]) || "–"}</td>)}</tr>
              <tr><td>Novos clientes</td>{cols.map((m) => <td key={m} className="num mono">{valPeriodo("novos_clientes", [m]) || "–"}</td>)}</tr>
              <tr><td>Ticket médio</td>{cols.map((m) => { const v = valPeriodo("ticket_medio", [m]); return <td key={m} className="num mono">{v ? brl(v) : "–"}</td>; })}</tr>
              <tr><td>Conversão</td>{cols.map((m) => { const v = valPeriodo("conversao", [m]); return <td key={m} className="num mono">{v ? v.toFixed(1) + "%" : "–"}</td>; })}</tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="sub" style={{ fontSize: 12 }}>Dica: o <b>pódio</b> e o <b>faturamento</b> vêm dos seus lançamentos; o <b>funil</b> e a <b>conversão</b> vêm dos indicadores comerciais (você edita nas telas de métricas). Quanto mais completo, mais rica a gestão à vista. 😉</p>
    </>
  );
}

function Kpi({ icon, cor, label, valor }: { icon: React.ReactNode; cor: string; label: string; valor: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: cor + "22", color: cor, flexShrink: 0 }}>{icon}</span>
      <div><b style={{ fontSize: 20, display: "block", lineHeight: 1 }}>{valor}</b><small className="sub">{label}</small></div>
    </div>
  );
}
