"use client";
import { brl } from "@/lib/format";

const PALETA = ["#10B981", "#1AADE2", "#8b5cf6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1", "#c48a57", "#84CC16", "#F97316", "#0EA5E9"];

/** Gráfico de linha (SVG, responsivo). pts = [{label, value}]. */
export function LineChart({ pts, cor = "#1AADE2", meta, formatValor = (n: number) => brl(n) }: { pts: { label: string; value: number }[]; cor?: string; meta?: number; formatValor?: (n: number) => string }) {
  const W = 340, H = 170, padL = 10, padR = 10, padT = 26, padB = 22;
  if (pts.length === 0) return <p className="sub">Sem dados no período.</p>;
  const vals = pts.map((p) => p.value);
  const maxV = Math.max(...vals, meta ?? 0, 1);
  const minV = Math.min(...vals, 0);
  const rng = maxV - minV || 1;
  const x = (i: number) => padL + (pts.length === 1 ? (W - padL - padR) / 2 : (i / (pts.length - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - (v - minV) / rng) * (H - padT - padB);
  const linha = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pts.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;
  const gid = `g${cor.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="var(--line)" strokeDasharray="3 4" />)}
      {meta !== undefined && meta > 0 && <line x1={padL} x2={W - padR} y1={y(meta)} y2={y(meta)} stroke="var(--muted)" strokeDasharray="4 4" opacity="0.6" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3.5" fill={cor} stroke="var(--card)" strokeWidth="1.5" />
          <text x={x(i)} y={y(p.value) - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--txt)">{formatValor(p.value)}</text>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Composição em barras horizontais. itens = [{label, valor}]. */
export function CompBars({ itens, total, corTotal }: { itens: { label: string; valor: number }[]; total: number; corTotal?: string }) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {itens.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(90px,32%) 1fr auto", alignItems: "center", gap: 10 }}>
          <span className="sub" style={{ fontSize: 12.5, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
          <div style={{ height: 16, borderRadius: 6, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(it.valor / max) * 100}%`, background: PALETA[i % PALETA.length], borderRadius: 6, minWidth: 4 }} />
          </div>
          <b style={{ fontSize: 13, whiteSpace: "nowrap", color: corTotal || "var(--txt)" }}>{brl(it.valor)}</b>
        </div>
      ))}
    </div>
  );
}

export { PALETA };
