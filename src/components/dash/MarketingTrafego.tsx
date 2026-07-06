"use client";
import { useMemo, useState } from "react";
import { Megaphone, DollarSign, Users, Target, TrendingUp, Globe, Share2, Filter } from "lucide-react";
import { Lancamento } from "@/lib/db";
import { Metrica, def, valorMes } from "@/lib/indicadores";
import { brl, rotuloMes, mesDe } from "@/lib/format";
import { resumo } from "@/lib/calc";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesCurto = (ym: string) => MES3[Number(ym.slice(5, 7)) - 1];

export default function MarketingTrafego({ metrs, lancs, saldoInicial }: { metrs: Metrica[]; lancs: Lancamento[]; saldoInicial: number }) {
  const anos = useMemo(() => [...new Set(lancs.map((l) => l.data_competencia.slice(0, 4)))].filter(Boolean).sort().reverse(), [lancs]);
  const [ano, setAno] = useState(anos[0] || String(new Date().getFullYear()));
  const [sel, setSel] = useState<string>("ANO");

  const mesesComDados = useMemo(() => new Set(lancs.map((l) => mesDe(l.data_competencia))), [lancs]);
  const mesesDoAno = useMemo(() => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`), [ano]);
  const meses = sel === "ANO" ? mesesDoAno
    : sel.startsWith("Q") ? mesesDoAno.slice((Number(sel[1]) - 1) * 3, (Number(sel[1]) - 1) * 3 + 3)
    : [sel];
  const cols = useMemo(() => { const c = mesesDoAno.filter((m) => mesesComDados.has(m)); return c.length ? c : mesesDoAno; }, [mesesDoAno, mesesComDados]);

  const valP = (key: string, ms: string[]) => {
    const d = def(key);
    if (d?.agg === "last") { for (let i = ms.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, ms[i]); if (m) return m.value; } return 0; }
    return ms.reduce((a, m) => a + (valorMes(metrs, key, m)?.value ?? 0), 0);
  };

  const invest = valP("investimento", meses);
  const leads = valP("leads", meses);
  const cpl = leads ? invest / leads : 0;
  const vendas = valP("vendas", meses);
  const cacInd = valP("cac", meses);
  const cac = cacInd || (vendas ? invest / vendas : 0);
  const visitas = valP("trafego", meses);
  const seguidores = valP("seguidores", meses);
  const oport = valP("oportunidades", meses);
  const faturamento = useMemo(() => resumo(lancs, meses, saldoInicial).faturamento, [lancs, meses, saldoInicial]);
  const roas = invest ? faturamento / invest : 0;
  const roiInd = valP("roi", meses);
  const roi = roiInd || (invest ? ((faturamento - invest) / invest) * 100 : 0);

  const funil = [
    { label: "Visitas no site", cor: "#1AADE2", valor: visitas },
    { label: "Leads", cor: "#EC4899", valor: leads },
    { label: "Oportunidades", cor: "#F59E0B", valor: oport },
    { label: "Vendas", cor: "#10B981", valor: vendas },
  ].filter((s) => s.valor > 0 || true);
  const funilMax = Math.max(1, ...funil.map((f) => f.valor));

  const periodoLabel = sel === "ANO" ? `Ano ${ano}` : sel.startsWith("Q") ? `${sel[1]}º trimestre · ${ano}` : rotuloMes(sel);
  const semInv = invest === 0 && leads === 0;

  return (
    <>
      <div className="section-title" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(236,72,153,.16)" }}><Megaphone size={22} color="#EC4899" /></span>
          <div>
            <h2 style={{ margin: 0 }}>Tráfego Pago — Marketing</h2>
            <p className="sub" style={{ fontSize: 12.5 }}>Investimento, leads, CPL, ROI e funil — {periodoLabel}</p>
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

      {semInv && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="sub">Preencha os indicadores de <b>Marketing</b> (Investimento em mídia, Leads, Tráfego…) nas telas de métricas para a análise ficar completa. O que estiver vazio aparece como &ldquo;–&rdquo;.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        <Kpi icon={<DollarSign size={18} />} cor="#EF4444" label="Investimento" valor={invest ? brl(invest) : "—"} />
        <Kpi icon={<Users size={18} />} cor="#EC4899" label="Leads gerados" valor={leads ? String(leads) : "—"} />
        <Kpi icon={<Filter size={18} />} cor="#8b5cf6" label="CPL (custo/lead)" valor={cpl ? brl(cpl) : "—"} />
        <Kpi icon={<TrendingUp size={18} />} cor="#10B981" label="ROAS (retorno)" valor={roas ? roas.toFixed(2) + "x" : "—"} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <Kpi icon={<Target size={18} />} cor="#F59E0B" label="CAC (custo/cliente)" valor={cac ? brl(cac) : "—"} />
        <Kpi icon={<TrendingUp size={18} />} cor="#1AADE2" label="ROI" valor={invest ? roi.toFixed(0) + "%" : "—"} />
        <Kpi icon={<Globe size={18} />} cor="#1AADE2" label="Visitas no site" valor={visitas ? visitas.toLocaleString("pt-BR") : "—"} />
        <Kpi icon={<Share2 size={18} />} cor="#8b5cf6" label="Novos seguidores" valor={seguidores ? seguidores.toLocaleString("pt-BR") : "—"} />
      </div>

      {/* FUNIL */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Filter size={18} color="#EC4899" /><h3 style={{ margin: 0 }}>Funil de Marketing</h3></div>
        <p className="sub" style={{ marginBottom: 14 }}>Da visita até a venda</p>
        {funil.every((f) => f.valor === 0) ? (
          <p className="sub">Sem dados de funil. Preencha Tráfego (visitas), Leads e Oportunidades nos indicadores.</p>
        ) : funil.map((f, i) => {
          const conv = i > 0 && funil[i - 1].valor > 0 ? (f.valor / funil[i - 1].valor) * 100 : null;
          const w = 40 + (f.valor / funilMax) * 60;
          return (
            <div key={i}>
              {conv !== null && <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)", margin: "3px 0" }}>▼ {conv.toFixed(1)}%</div>}
              <div style={{ width: `${w}%`, margin: "0 auto", borderRadius: 10, padding: "10px 14px", background: `linear-gradient(90deg, ${f.cor}, ${f.cor}bb)`, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{f.label}</span>
                <b style={{ fontSize: 16 }}>{f.valor.toLocaleString("pt-BR")}</b>
              </div>
            </div>
          );
        })}
      </div>

      {/* EVOLUÇÃO */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 2 }}>Evolução mês a mês</h3>
        <p className="sub" style={{ marginBottom: 12 }}>Indicadores de marketing · {ano}</p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 620 }}>
            <thead><tr><th>Indicador</th>{cols.map((m) => <th key={m} className="num">{mesCurto(m)}</th>)}</tr></thead>
            <tbody>
              <tr><td>Investimento</td>{cols.map((m) => { const v = valP("investimento", [m]); return <td key={m} className="num mono">{v ? brl(v) : "–"}</td>; })}</tr>
              <tr><td>Leads</td>{cols.map((m) => <td key={m} className="num mono">{valP("leads", [m]) || "–"}</td>)}</tr>
              <tr><td>CPL</td>{cols.map((m) => { const inv = valP("investimento", [m]); const le = valP("leads", [m]); return <td key={m} className="num mono">{le ? brl(inv / le) : "–"}</td>; })}</tr>
              <tr><td>CAC</td>{cols.map((m) => { const v = valP("cac", [m]); return <td key={m} className="num mono">{v ? brl(v) : "–"}</td>; })}</tr>
              <tr><td>ROI</td>{cols.map((m) => { const v = valP("roi", [m]); return <td key={m} className="num mono">{v ? v.toFixed(0) + "%" : "–"}</td>; })}</tr>
              <tr><td>Visitas</td>{cols.map((m) => { const v = valP("trafego", [m]); return <td key={m} className="num mono">{v ? v.toLocaleString("pt-BR") : "–"}</td>; })}</tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="sub" style={{ fontSize: 12 }}>CPL e ROAS são calculados dos seus indicadores (Investimento ÷ Leads, Faturamento ÷ Investimento). Preencha os indicadores de marketing pra ficar completo. 😉</p>
    </>
  );
}

function Kpi({ icon, cor, label, valor }: { icon: React.ReactNode; cor: string; label: string; valor: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: cor + "22", color: cor, flexShrink: 0 }}>{icon}</span>
      <div><b style={{ fontSize: 19, display: "block", lineHeight: 1 }}>{valor}</b><small className="sub">{label}</small></div>
    </div>
  );
}
