"use client";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Metrica, CATALOGO, serieMes, type Categoria } from "@/lib/indicadores";
import { brl } from "@/lib/format";
import { LineChart } from "./Charts";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesCurto = (ym: string) => MES3[Number(ym.slice(5, 7)) - 1] || ym;
const NOMES: Record<Categoria, string> = { financeiro: "Finanças", cliente: "Saúde do Cliente", comercial: "Comercial", marketing: "Marketing" };

export default function AreaGraficos({ metrs, categoria, cor = "#1AADE2", onBack }: { metrs: Metrica[]; categoria: Categoria; cor?: string; onBack: () => void }) {
  const inds = CATALOGO.filter((d) => d.categoria === categoria);
  const graficos = inds.map((d) => {
    const serie = serieMes(metrs, d.key).filter((s) => s.value !== 0);
    const pts = serie.map((s) => ({ label: mesCurto(s.period), value: s.value }));
    const total = serie.reduce((a, s) => a + s.value, 0);
    const fmtV = (v: number) => d.unidade === "BRL" ? brl(v) : d.unidade === "%" ? `${v.toFixed(0)}%` : d.unidade === "score" ? String(Math.round(v)) : v.toLocaleString("pt-BR");
    return { d, pts, total, fmtV };
  }).filter((g) => g.pts.length > 0);

  return (
    <>
      <div className="section-title" style={{ gap: 12 }}>
        <button className="btn ghost sm" onClick={onBack}><ArrowLeft size={14} /> Gráficos</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: cor + "22", color: cor }}><BarChart3 size={20} /></span>
          <h2 style={{ margin: 0 }}>{NOMES[categoria]}</h2>
        </div>
      </div>

      {graficos.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <BarChart3 size={30} style={{ opacity: .4 }} />
          <p className="sub" style={{ marginTop: 10 }}>Sem dados nesta área ainda. Preencha os indicadores em <b>{NOMES[categoria]}</b> → &ldquo;Editar dados&rdquo; para ver os gráficos.</p>
        </div>
      ) : graficos.map(({ d, pts, total, fmtV }) => (
        <div key={d.key} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <h3 style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".04em", fontSize: 13, color: "var(--muted)" }}>{d.label}</h3>
            {d.agg === "sum" && <b style={{ color: d.cor }}>Total: {fmtV(total)}</b>}
          </div>
          <LineChart pts={pts} cor={d.cor} formatValor={fmtV} />
        </div>
      ))}
    </>
  );
}
