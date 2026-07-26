"use client";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { MES, carregarEstruturaComPagamentos, resultadoDe, ebitdaDe } from "@/app/minhasmetricas/financas-estrutura";
import BotaoOcultar from "./ocultar";

const AZUL = "#38BDF8", VERDE = "#10B981", MARROM = "#C2830A";
const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);

type Serie = { cor: string; valores: (number | null)[] };

/** Gráfico de linha (claro), com meses vazios só no rótulo do eixo. */
function Grafico({ series, fmtPt, mostrarValores, alto, pct }: { series: Serie[]; fmtPt: (n: number) => string; mostrarValores?: boolean; alto?: boolean; pct?: boolean }) {
  const W = 560, H = alto ? 250 : 190, padL = 44, padR = 16, padT = 26, padB = 26;
  const all = series.flatMap((s) => s.valores.filter((v): v is number => v != null));
  const maxV = Math.max(1, ...all, 0), minV = Math.min(0, ...all);
  const range = (maxV - minV) || 1;
  const px = (m: number) => padL + (m * (W - padL - padR)) / 11;
  const py = (v: number) => padT + (1 - (v - minV) / range) * (H - padT - padB);
  const ticks = [0, 0.33, 0.66, 1].map((f) => minV + f * range);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {ticks.map((t, i) => {
        const y = py(t);
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(148,163,184,.18)" strokeDasharray="3 5" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{pct ? `${Math.round(t)}%` : fmtK(t)}</text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const pts = s.valores.map((v, m) => (v == null ? null : [px(m), py(v), v] as const)).filter((p): p is readonly [number, number, number] => p != null);
        if (!pts.length) return null;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        return (
          <g key={si}>
            {pts.length >= 2 && <path d={d} fill="none" stroke={s.cor} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />}
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r={3.4} fill={s.cor} stroke="#fff" strokeWidth={1.6} />
                {mostrarValores && <text className="oc-num" x={p[0]} y={p[1] - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">{fmtPt(p[2])}</text>}
              </g>
            ))}
          </g>
        );
      })}
      {MES.map((m, i) => <text key={`l${i}`} x={px(i)} y={H - 8} textAnchor="middle" fontSize="10" fontStyle="italic" fill="#94a3b8">{m}</text>)}
    </svg>
  );
}

function Card({ titulo, total, totalCor, destaque, children }: { titulo: string; total?: number; totalCor?: string; destaque?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>{titulo}</div>
      {destaque
        ? <b className="oc-num" style={{ display: "block", fontSize: 26, margin: "2px 0 4px", letterSpacing: "-.02em" }}>{destaque}</b>
        : total != null && <div style={{ fontSize: 12.5, marginTop: 3 }}>Total: <b className="oc-num" style={{ color: totalCor }}>{fmt(total)}</b></div>}
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

export default function GraficosFinancas({ onVoltar, ano = 2026 }: { onVoltar: () => void; ano?: number }) {
  const g = useMemo(() => {
    const data = carregarEstruturaComPagamentos(ano);
    const itens = data.custos.flatMap((b) => b.grupos.flatMap((gr) => gr.itens));
    const somaMes = (linhas: { v: number[] }[], m: number) => linhas.reduce((s, l) => s + (l.v[m] || 0), 0);
    const recMes = Array.from({ length: 12 }, (_, m) => somaMes(data.receitas, m));
    const cusMes = Array.from({ length: 12 }, (_, m) => somaMes(itens, m));
    const res = resultadoDe(data), ebt = ebitdaDe(data);
    const temDado = Array.from({ length: 12 }, (_, m) => recMes[m] + cusMes[m] > 0);
    const mask = (arr: number[]): (number | null)[] => arr.map((v, m) => (temDado[m] ? v : null));
    const margem = recMes.map((r, m) => (r ? (res[m] / r) * 100 : 0));
    const soma = (arr: number[]) => arr.reduce((s, x) => s + x, 0);
    return {
      recMes: mask(recMes), cusMes: mask(cusMes), res: mask(res), ebt: mask(ebt), margem: mask(margem),
      canais: data.receitas.map((r) => ({ nome: r.nome, cor: r.cor || AZUL, total: soma(r.v), valores: mask(r.v) })).filter((c) => c.total > 0),
      totRec: soma(recMes), totCus: soma(cusMes), totRes: soma(res), totEbt: soma(ebt),
      margemMedia: soma(recMes) ? (soma(res) / soma(recMes)) * 100 : 0,
    };
  }, [ano]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onVoltar} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}><ArrowLeft size={15} /> Relatórios</button>
        <BotaoOcultar />
      </div>

      {/* linha 1: faturamento, custos, lucro */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <Card titulo="Faturamento" total={g.totRec} totalCor={VERDE}><Grafico series={[{ cor: AZUL, valores: g.recMes }]} fmtPt={fmtK} mostrarValores /></Card>
        <Card titulo="Custos totais" total={g.totCus} totalCor={VERDE}><Grafico series={[{ cor: MARROM, valores: g.cusMes }]} fmtPt={fmtK} mostrarValores /></Card>
        <Card titulo="Lucro" total={g.totRes} totalCor={VERDE}><Grafico series={[{ cor: AZUL, valores: g.res }]} fmtPt={fmtK} mostrarValores /></Card>
      </div>

      {/* linha 2: faturamento por canal de venda */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Faturamento por canal de venda</div>
        <Grafico series={g.canais.map((c) => ({ cor: c.cor, valores: c.valores }))} fmtPt={fmtK} alto />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 8 }}>
          {g.canais.map((c) => (
            <span key={c.nome} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12 }}>
              <i style={{ width: 14, height: 3, borderRadius: 3, background: c.cor, display: "inline-block" }} />
              {c.nome} <b className="oc-num">{fmt(c.total)}</b>
            </span>
          ))}
        </div>
      </div>

      {/* linha 3: ebitda, margem */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <Card titulo="EBITDA" total={g.totEbt} totalCor={VERDE}><Grafico series={[{ cor: AZUL, valores: g.ebt }]} fmtPt={fmtK} mostrarValores /></Card>
        <Card titulo="Margem líquida (%)" destaque={`${Math.round(g.margemMedia)}%`}><Grafico series={[{ cor: AZUL, valores: g.margem }]} fmtPt={(n) => `${Math.round(n)}%`} pct mostrarValores /></Card>
      </div>
    </div>
  );
}
