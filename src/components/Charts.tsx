"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { brl, brlCompact, rotuloMes } from "@/lib/format";
import { PontoFluxo, FatiaCategoria } from "@/lib/calc";

const C = {
  green: "#10B981", red: "#EF4444", cyan: "#1AADE2", blue: "#1e90ff",
  amber: "#F59E0B", line: "rgba(255,255,255,0.10)", muted: "#a1a1aa",
};
const PALETTE = ["#ff6b9d", "#1AADE2", "#8b5cf6", "#F59E0B", "#10B981", "#EF4444", "#5eead4", "#fbbf24", "#60a5fa", "#94a3b8"];

/** Barras agrupadas: entradas (verde) x saídas (vermelho) por mês. */
export function BarsEntradaSaida({ data, height = 220 }: { data: PontoFluxo[]; height?: number }) {
  const w = 720, h = height, padL = 8, padR = 8, padB = 30, padT = 12;
  const max = Math.max(1, ...data.map((d) => Math.max(d.entradas, d.saidas)));
  const innerW = w - padL - padR;
  const innerH = h - padB - padT;
  const groupW = innerW / data.length;
  const bw = Math.min(26, groupW / 2.6);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={padL} x2={w - padR} y1={y(max * g)} y2={y(max * g)} stroke={C.line} strokeDasharray="3 5" />
      ))}
      {data.map((d, i) => {
        const cx = padL + groupW * i + groupW / 2;
        return (
          <g key={d.mes}>
            <rect x={cx - bw - 2} y={y(d.entradas)} width={bw} height={padT + innerH - y(d.entradas)} rx={4} fill={C.green}>
              <title>{rotuloMes(d.mes)} · Entradas {brl(d.entradas)}</title>
            </rect>
            <rect x={cx + 2} y={y(d.saidas)} width={bw} height={padT + innerH - y(d.saidas)} rx={4} fill={C.red}>
              <title>{rotuloMes(d.mes)} · Saídas {brl(d.saidas)}</title>
            </rect>
            <text x={cx} y={h - 10} textAnchor="middle" fontSize="11.5" fill={C.muted} fontWeight="600">{rotuloMes(d.mes)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Linha com área: saldo acumulado por mês. */
export function LinhaSaldo({ data, height = 200 }: { data: PontoFluxo[]; height?: number }) {
  const w = 720, h = height, padL = 8, padR = 8, padB = 28, padT = 14;
  const vals = data.map((d) => d.saldo);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const innerW = w - padL - padR, innerH = h - padB - padT;
  const x = (i: number) => padL + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;
  const pts = data.map((d, i) => `${x(i)},${y(d.saldo)}`).join(" ");
  const area = `M ${x(0)},${y(min)} L ${pts.replace(/ /g, " L ")} L ${x(data.length - 1)},${y(min)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gsaldo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cyan} stopOpacity="0.35" />
          <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={padL} x2={w - padR} y1={y(min + (max - min) * g)} y2={y(min + (max - min) * g)} stroke={C.line} strokeDasharray="3 5" />
      ))}
      <path d={area} fill="url(#gsaldo)" />
      <polyline points={pts} fill="none" stroke={C.cyan} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.mes}>
          <circle cx={x(i)} cy={y(d.saldo)} r="4" fill="#0a1520" stroke={C.cyan} strokeWidth="2.4">
            <title>{rotuloMes(d.mes)} · Saldo {brl(d.saldo)}</title>
          </circle>
          <text x={x(i)} y={h - 9} textAnchor="middle" fontSize="11.5" fill={C.muted} fontWeight="600">{rotuloMes(d.mes)}</text>
        </g>
      ))}
    </svg>
  );
}

/** Donut por categoria + legenda. formato: "brl" (dinheiro) ou "pct" (porcentagem). */
export function DonutCategorias({ data, formato = "brl" }: { data: FatiaCategoria[]; formato?: "brl" | "pct" }) {
  const total = data.reduce((a, d) => a + d.valor, 0);
  const size = 180, r = 70, cx = size / 2, cy = size / 2, sw = 26;
  if (!total) return <div className="empty"><div className="big">📊</div>Sem dados no período.</div>;
  const fmtV = (v: number) => (formato === "pct" ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : brl(v));
  const fmtTotal = formato === "pct" ? "100%" : brlCompact(total);
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={sw} />
        {data.map((d, i) => {
          const frac = d.valor / total;
          const dash = `${frac * circ} ${circ}`;
          const off = -acc * circ;
          acc += frac;
          return (
            <circle key={d.categoria} cx={cx} cy={cy} r={r} fill="none"
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={sw}
              strokeDasharray={dash} strokeDashoffset={off}
              transform={`rotate(-90 ${cx} ${cy})`}>
              <title>{d.categoria} · {brl(d.valor)} ({Math.round(frac * 100)}%)</title>
            </circle>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fill={C.muted} fontWeight="700">Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="15" fill="#eaf6ff" fontWeight="800">{fmtTotal}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 180 }}>
        {data.slice(0, 8).map((d, i) => (
          <div key={d.categoria} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i style={{ width: 11, height: 11, borderRadius: 3, background: PALETTE[i % PALETTE.length], display: "inline-block" }} />
              {d.categoria}
            </span>
            <b className="mono">{fmtV(d.valor)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card de linha mês-a-mês (consolidado anual). */
export function MiniLineCard({ titulo, unidade, serie, cor = C.green }: {
  titulo: string; unidade: string; serie: { period: string; value: number }[]; cor?: string;
}) {
  const fmtV = (v: number) =>
    unidade === "BRL" ? brlCompact(v) :
    unidade === "%" ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` :
    v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const w = 520, h = 180, padL = 44, padR = 10, padB = 26, padT = 14;
  const vals = serie.map((s) => s.value);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const innerW = w - padL - padR, innerH = h - padB - padT;
  const x = (i: number) => padL + (serie.length <= 1 ? innerW / 2 : (innerW * i) / (serie.length - 1));
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;
  const pts = serie.map((s, i) => `${x(i)},${y(s.value)}`).join(" ");
  const total = unidade === "%" || unidade === "score" ? (vals.at(-1) ?? 0) : vals.reduce((a, v) => a + v, 0);
  const first = vals.find((v) => v > 0) ?? 0;
  const last = vals.at(-1) ?? 0;
  const delta = first ? ((last - first) / Math.abs(first)) * 100 : 0;
  const ano = new Date().getFullYear();
  const gl = [0, 0.5, 1];

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ margin: 0, textTransform: "uppercase", fontSize: 13, letterSpacing: ".5px", color: "var(--muted)" }}>{titulo}</h3>
        <span className={`chip ${delta >= 0 ? "green" : "red"}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta >= 0 ? "+" : ""}{delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        </span>
      </div>
      <div style={{ fontSize: 13.5, margin: "6px 0 10px", color: "var(--muted)" }}>
        Total {ano}: <b style={{ color: "var(--txt)" }}>{fmtV(total)}</b>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
        {gl.map((g, i) => {
          const vv = min + (max - min) * (1 - g);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y(vv)} y2={y(vv)} stroke={C.line} strokeDasharray="3 5" />
              <text x={padL - 6} y={y(vv) + 3} textAnchor="end" fontSize="9.5" fill={C.muted}>{fmtV(vv)}</text>
            </g>
          );
        })}
        <polyline points={pts} fill="none" stroke={cor} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {serie.map((s, i) => (
          <g key={s.period}>
            <circle cx={x(i)} cy={y(s.value)} r="3.5" fill="#0a0a0a" stroke={cor} strokeWidth="2">
              <title>{rotuloMes(s.period)} · {fmtV(s.value)}</title>
            </circle>
            {i % 2 === 0 && <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="9.5" fill={C.muted}>{rotuloMes(s.period).split("/")[0]}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
