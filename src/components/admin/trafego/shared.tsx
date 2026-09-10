"use client";
/** Blocos compartilhados do módulo de Tráfego: estilos do tema, funil, deltas, gráficos SVG. */
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { brl, num, pct, type MesAgg } from "@/lib/trafego";

export const CARD: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 };
export const SUB: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 };
export const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)" };
export const INP: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "11px 12px", borderRadius: 10, outline: "none" };

export async function authHeaders(): Promise<Record<string, string>> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` };
}

/** Uma etapa do funil: trapézio colorido + badges de métricas. */
export function Etapa({ nome, desc, grad, largura, badges }: { nome: string; desc: string; grad: string; largura: string; badges: [string, string][] }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
      <div style={{ width: 260, maxWidth: "100%" }}>
        <div style={{ width: largura, minWidth: 150, height: 56, borderRadius: 12, background: grad, display: "grid", placeItems: "center", clipPath: "polygon(6% 0,94% 0,82% 100%,18% 100%)" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{nome}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", marginBottom: 8 }}>{desc}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {badges.map(([l, v]) => (
            <span key={l} style={{ display: "inline-flex", flexDirection: "column", gap: 1, padding: "6px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{l}</span>
              <b style={{ fontSize: 15 }}>{v}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Funil de 3 etapas a partir de um agregado (mês inteiro ou uma semana). */
export function Funil3({ investido, impressoes, cliques, leads, cpm, cpc, ctr, cpl, conv }:
  { investido: number; impressoes: number; cliques: number; leads: number; cpm: number | null; cpc: number | null; ctr: number | null; cpl: number | null; conv: number | null }) {
  return (
    <>
      <Etapa nome="Conhecimento" desc="quantas pessoas viram" grad="linear-gradient(90deg,#ec4899,#e11d48)" largura="100%"
        badges={[["Impressões", num(impressoes)], ["CPM", brl(cpm)]]} />
      <Etapa nome="Consideração" desc="quem clicou e engajou" grad="linear-gradient(90deg,#d946ef,#9333ea)" largura="82%"
        badges={[["Cliques", num(cliques)], ["CPC", brl(cpc)], ["CTR", pct(ctr)]]} />
      <Etapa nome="Captação" desc="virou lead" grad="linear-gradient(90deg,#8b5cf6,#6366f1)" largura="64%"
        badges={[["Leads", num(leads)], ["CPL", brl(cpl)], ["Conversão LP", pct(conv)]]} />
    </>
  );
}

/** Seta de variação percentual. invertido=true: cair é bom (custo). */
export function Delta({ v, invertido = false }: { v: number | null; invertido?: boolean }) {
  if (v == null) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  const subiu = v > 0.5, caiu = v < -0.5;
  const bom = invertido ? caiu : subiu, ruim = invertido ? subiu : caiu;
  const cor = bom ? "#10B981" : ruim ? "#EF4444" : "var(--muted)";
  const Ic = subiu ? TrendingUp : caiu ? TrendingDown : Minus;
  return <span style={{ color: cor, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}><Ic size={13} />{Math.abs(v).toFixed(0)}%</span>;
}

/** Gráfico: barras de investimento (azul) + linha de custo por lead (âmbar). Escalas duplas. */
export function GraficoBarLinha({ hist, mult }: { hist: MesAgg[]; mult: number }) {
  const W = 900, H = 260, padL = 8, padR = 8, padB = 34, padT = 14;
  const maxInv = Math.max(...hist.map((l) => l.investido * mult), 1);
  const maxCpl = Math.max(...hist.map((l) => (l.cpl ?? 0) * mult), 1);
  const n = hist.length || 1, gw = (W - padL - padR) / n;
  const bx = (i: number) => padL + gw * i + gw * 0.25, bw = gw * 0.5;
  const by = (v: number) => padT + (1 - v / maxInv) * (H - padT - padB);
  const lx = (i: number) => padL + gw * i + gw / 2;
  const ly = (v: number) => padT + (1 - v / maxCpl) * (H - padT - padB);
  const pts = hist.map((l, i) => `${lx(i)},${ly((l.cpl ?? 0) * mult)}`).join(" ");
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={LBL}>Evolução mês a mês</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#2563eb" }} />Investimento</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 14, height: 3, borderRadius: 2, background: "#fbbf24" }} />Custo por lead</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="var(--line)" strokeDasharray="3 3" />)}
        {hist.map((l, i) => (
          <g key={l.mes}>
            <rect x={bx(i)} y={by(l.investido * mult)} width={bw} height={Math.max(0, H - padB - by(l.investido * mult))} rx={4} fill="#2563eb" opacity={0.85} />
            <text x={lx(i)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--muted)">{l.label}</text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke="#fbbf24" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {hist.map((l, i) => <circle key={l.mes} cx={lx(i)} cy={ly((l.cpl ?? 0) * mult)} r={4} fill="#fbbf24" />)}
      </svg>
    </div>
  );
}

/** Gráfico de linhas por semana: leads (verde) + CPL (roxo tracejado). Escalas duplas. */
export function GraficoSemanas({ dados }: { dados: { semana: string; leads: number; cpl: number }[] }) {
  const W = 700, H = 220, padL = 8, padR = 8, padB = 30, padT = 12;
  const maxL = Math.max(...dados.map((d) => d.leads), 1);
  const maxC = Math.max(...dados.map((d) => d.cpl), 1);
  const n = dados.length || 1, step = (W - padL - padR) / Math.max(n - 1, 1);
  const x = (i: number) => padL + step * i;
  const yL = (v: number) => padT + (1 - v / maxL) * (H - padT - padB);
  const yC = (v: number) => padT + (1 - v / maxC) * (H - padT - padB);
  const ptsL = dados.map((d, i) => `${x(i)},${yL(d.leads)}`).join(" ");
  const ptsC = dados.map((d, i) => `${x(i)},${yC(d.cpl)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="var(--line)" strokeDasharray="3 3" />)}
      {dados.map((d, i) => <text key={d.semana} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--muted)">{d.semana}</text>)}
      <polyline points={ptsC} fill="none" stroke="#6e7bff" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
      <polyline points={ptsL} fill="none" stroke="#36d399" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {dados.map((d, i) => <circle key={d.semana} cx={x(i)} cy={yL(d.leads)} r={4} fill="#36d399" />)}
    </svg>
  );
}
