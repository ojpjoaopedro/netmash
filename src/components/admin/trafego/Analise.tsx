"use client";
/** Aba Análise: evolução mês a mês (KPIs, meta de CPL, imposto, análise escrita, gráfico, tabela). */
import { useMemo, useState } from "react";
import { CalendarRange, DollarSign, Users, Target, TrendingUp } from "lucide-react";
import { CARD, SUB, LBL, Delta, GraficoBarLinha } from "./shared";
import { porMes, brl, num, pct, type Resultado, type MesAgg } from "@/lib/trafego";

function analisar(hist: MesAgg[]): { tom: "bom" | "ruim" | "neutro"; titulo: string; texto: string } | null {
  if (hist.length === 0) return null;
  const u = hist[hist.length - 1];
  if (hist.length < 2) return { tom: "neutro", titulo: u.label, texto: `Primeiro mês com dados: ${brl(u.investido, 0)} investidos, ${num(u.leads)} leads, custo por lead de ${brl(u.cpl)}. Cadastre mais meses pra comparar a evolução.` };
  const p = hist[hist.length - 2];
  const subiu = (u.varCpl ?? 0) > 0.5, caiu = (u.varCpl ?? 0) < -0.5, leadsSubiu = (u.varLeads ?? 0) > 0.5;
  let tom: "bom" | "ruim" | "neutro" = "neutro", diag = "Resultado estável em relação ao mês passado.";
  if (caiu && leadsSubiu) { tom = "bom"; diag = "Melhor cenário: mais leads pagando menos por cada um. Eficiência subindo."; }
  else if (caiu) { tom = "bom"; diag = "O custo por lead caiu, sinal de criativos/públicos mais eficientes."; }
  else if (subiu && !leadsSubiu) { tom = "ruim"; diag = "O custo subiu sem trazer mais leads. Vale revisar criativos e públicos."; }
  else if (subiu) { tom = "ruim"; diag = "O custo por lead subiu, fique de olho (pode ser escala de investimento)."; }
  const cp = u.varCpl == null ? "" : `o custo por lead ${caiu ? "caiu" : subiu ? "subiu" : "ficou estável"} ${Math.abs(u.varCpl).toFixed(0)}% (de ${brl(p.cpl)} para ${brl(u.cpl)})`;
  const ld = u.varLeads == null ? "" : ` e os leads ${(u.varLeads ?? 0) >= 0 ? "cresceram" : "caíram"} ${Math.abs(u.varLeads).toFixed(0)}%`;
  return { tom, titulo: `${u.label} vs ${p.label}`, texto: `Do mês passado para cá, ${cp}${ld}. ${diag}` };
}

export default function Analise({ rows, imposto, metaCpl, mesAtual }: { rows: Resultado[]; imposto: string; metaCpl: string; mesAtual: string }) {
  const [comImposto, setComImposto] = useState(true);
  const hist = useMemo(() => porMes(rows), [rows]);
  const fator = 1 + (Number(imposto.replace(",", ".")) || 0) / 100;
  const mult = comImposto ? fator : 1;
  const meta = Number(metaCpl.replace(",", ".")) || 0;

  const totInv = hist.reduce((a, l) => a + l.investido, 0);
  const totLeads = hist.reduce((a, l) => a + l.leads, 0);
  const cplMedio = totLeads > 0 ? totInv / totLeads : null;
  const doMes = hist.find((l) => l.mes === mesAtual) || null;

  const statusCpl = (v: number | null) => {
    if (v == null || meta <= 0) return { cor: "var(--muted)", txt: "defina a meta" };
    if (v <= meta) return { cor: "#10B981", txt: "✅ dentro da meta" };
    if (v <= meta * 1.1) return { cor: "#F59E0B", txt: "⚠️ quase" };
    return { cor: "#EF4444", txt: "🔴 acima da meta" };
  };
  const analise = analisar(hist);
  const kpis = [
    { Ic: CalendarRange, cor: "#3B82F6", label: "Meses acompanhados", val: String(hist.length) },
    { Ic: DollarSign, cor: "#10B981", label: `Investimento total${comImposto ? " (c/ imposto)" : ""}`, val: brl(totInv * mult, 0) },
    { Ic: Users, cor: "#8b5cf6", label: "Leads totais", val: num(totLeads) },
    { Ic: Target, cor: "#F59E0B", label: `Custo médio por lead${comImposto ? " (c/ imposto)" : ""}`, val: brl(cplMedio != null ? cplMedio * mult : null) },
  ];

  if (hist.length === 0) return <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>Sem dados ainda. Preencha Resultados ou use Puxar da Meta.</div>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setComImposto((v) => !v)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, border: "1px solid rgba(245,158,11,.4)", background: "rgba(245,158,11,.12)", color: "#F59E0B", borderRadius: 99, padding: "9px 16px" }}>
          {comImposto ? `✓ Com imposto (${imposto}%)` : "Só a mídia"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={CARD}>
            <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: k.cor, color: "#fff" }}><k.Ic size={18} /></span>
            <div style={{ ...LBL, marginTop: 12, letterSpacing: ".08em" }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {(() => { const s = statusCpl(doMes?.cpl != null ? doMes.cpl * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL do mês atual</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(doMes?.cpl != null ? doMes.cpl * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
        {(() => { const s = statusCpl(cplMedio != null ? cplMedio * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL médio da conta</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(cplMedio != null ? cplMedio * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
        <div style={SUB}><div style={{ ...LBL, color: "#F59E0B" }}>Investido real (c/ imposto)</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totInv * fator, 0)}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>mídia: {brl(totInv, 0)} + {imposto}%</div></div>
      </div>

      {analise && (
        <div style={{ ...CARD, background: analise.tom === "bom" ? "rgba(16,185,129,.10)" : analise.tom === "ruim" ? "rgba(239,68,68,.10)" : "var(--card)", border: `1px solid ${analise.tom === "bom" ? "rgba(16,185,129,.35)" : analise.tom === "ruim" ? "rgba(239,68,68,.35)" : "var(--line)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><TrendingUp size={16} color={analise.tom === "bom" ? "#10B981" : analise.tom === "ruim" ? "#EF4444" : "var(--muted)"} /><b style={{ fontSize: 15 }}>{analise.titulo}</b></div>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, color: "var(--txt-2)" }}>{analise.texto}</p>
        </div>
      )}

      <GraficoBarLinha hist={hist} mult={mult} />

      <div style={{ ...CARD, overflowX: "auto" }}>
        <div style={{ ...LBL, marginBottom: 12 }}>Acompanhamento mês a mês</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
          <thead>
            <tr style={{ color: "var(--muted)", textAlign: "left" }}>
              {["Mês", "Investimento", "Leads", "Custo/lead", "CPC", "CTR", "CPM", "Camp."].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...hist].reverse().map((l, i) => (
              <tr key={l.mes} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "10px", fontWeight: 700 }}>{l.label}{i === 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#1AADE2", background: "rgba(26,173,226,.14)", padding: "2px 7px", borderRadius: 99 }}>atual</span>}</td>
                <td style={{ padding: "10px" }}>{brl(l.investido * mult, 0)} <Delta v={l.varInvestido} /></td>
                <td style={{ padding: "10px" }}>{num(l.leads)} <Delta v={l.varLeads} /></td>
                <td style={{ padding: "10px" }}>{brl(l.cpl != null ? l.cpl * mult : null)} <Delta v={l.varCpl} invertido /></td>
                <td style={{ padding: "10px", color: "var(--muted)" }}>{brl(l.cpc)}</td>
                <td style={{ padding: "10px", color: "var(--muted)" }}>{pct(l.ctr)}</td>
                <td style={{ padding: "10px", color: "var(--muted)" }}>{brl(l.cpm)}</td>
                <td style={{ padding: "10px", color: "var(--muted)" }}>{l.campanhas || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
