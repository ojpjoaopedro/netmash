"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import { MES, Dados, carregarEstrutura } from "@/app/minhasmetricas/financas-estrutura";

const AZUL = "#38BDF8", VERMELHO = "#F43F5E";
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `R$ ${Math.round(n / 1000)}k` : `R$ ${Math.round(n)}`);
const somaMes = (linhas: { v: number[] }[], m: number) => linhas.reduce((s, l) => s + (l.v[m] || 0), 0);

/** Gráfico de linha simples em SVG (faturamento/despesas). */
function LinhaChart({ meses, valores, cor }: { meses: number[]; valores: number[]; cor: string }) {
  const W = 600, H = 210, pad = 34, padTop = 30, padBot = 26;
  const max = Math.max(1, ...valores);
  const n = valores.length;
  const px = (i: number) => pad + (n <= 1 ? 0 : (i * (W - pad * 2)) / (n - 1));
  const py = (v: number) => padTop + (1 - v / max) * (H - padTop - padBot);
  const pts = valores.map((v, i) => [px(i), py(v)] as const);
  const linha = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${linha} L${px(n - 1).toFixed(1)},${H - padBot} L${px(0).toFixed(1)},${H - padBot} Z`;
  const id = `g-${cor.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={W - pad} y1={padTop + f * (H - padTop - padBot)} y2={padTop + f * (H - padTop - padBot)} stroke="rgba(148,163,184,.14)" strokeDasharray="4 5" />)}
      <path d={area} fill={`url(#${id})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={3.5} fill={cor} stroke="#0b1220" strokeWidth={2} />
          <text x={p[0]} y={p[1] - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e2e8f0">{fmtK(valores[i])}</text>
          <text x={p[0]} y={H - 8} textAnchor="middle" fontSize="10" fill="#7c8aa5">{MES[meses[i]]}</text>
        </g>
      ))}
    </svg>
  );
}

/** Barras horizontais de composição (por canal / por custo). */
function Barras({ itens }: { itens: { nome: string; valor: number; cor: string }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {itens.map((it) => (
        <div key={it.nome} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 130, flexShrink: 0, fontSize: 12, color: "#94a3b8", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{it.nome}</span>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ height: 18, borderRadius: 6, background: it.cor, width: `${Math.max(3, (it.valor / max) * 100)}%`, boxShadow: `0 0 12px -2px ${it.cor}88` }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#e2e8f0", whiteSpace: "nowrap" }}>{fmtR(it.valor)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Painel({ titulo, badge, badgeCor, children }: { titulo: string; badge?: string; badgeCor?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(160deg, rgba(30,41,59,.55), rgba(15,23,42,.35))", border: "1px solid rgba(148,163,184,.14)", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <b style={{ fontSize: 14, color: "#f1f5f9" }}>{titulo}</b>
        {badge && (
          <span style={{ textAlign: "right", padding: "6px 12px", borderRadius: 10, background: `${badgeCor}1f`, border: `1px solid ${badgeCor}55` }}>
            <span style={{ display: "block", fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: badgeCor }}>{titulo.includes("Fatur") ? "Total faturado" : "Custos totais"}</span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "#fff" }}>{badge}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function FinancasDashboard() {
  const [data, setData] = useState<Dados | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  useEffect(() => {
    const d = carregarEstrutura();
    setData(d);
    // seleciona os meses que têm algum dado (receita ou custo)
    const itens = d.custos.flatMap((b) => b.grupos.flatMap((g) => g.itens));
    const comDado = Array.from({ length: 12 }, (_, m) => somaMes(d.receitas, m) + somaMes(itens, m) > 0 ? m : -1).filter((m) => m >= 0);
    setSel(new Set(comDado.length ? comDado : [0, 1, 2, 3, 4, 5]));
  }, []);

  const calc = useMemo(() => {
    if (!data) return null;
    const grupos = data.custos.flatMap((b) => b.grupos);
    const itens = grupos.flatMap((g) => g.itens);
    const meses = [...sel].sort((a, b) => a - b);
    const recMes = meses.map((m) => somaMes(data.receitas, m));
    const cusMes = meses.map((m) => somaMes(itens, m));
    const somaSel = (linhas: { v: number[] }[]) => meses.reduce((s, m) => s + somaMes(linhas, m), 0);
    const canais = data.receitas.map((r) => ({ nome: r.nome, valor: somaSel([r]), cor: r.cor || AZUL })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const custos = grupos.map((g) => ({ nome: g.nome, valor: somaSel(g.itens), cor: g.cor })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    return { meses, recMes, cusMes, totRec: recMes.reduce((s, x) => s + x, 0), totCus: cusMes.reduce((s, x) => s + x, 0), canais, custos };
  }, [data, sel]);

  if (!data || !calc) return null;
  const toggle = (m: number) => setSel((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n.size ? n : s; });

  return (
    <div style={{ background: "linear-gradient(165deg, #0d1526, #0a0f1c)", border: "1px solid rgba(148,163,184,.12)", borderRadius: 20, padding: 16 }}>
      {/* seletor de meses */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#64748b", marginRight: 4 }}>Meses (clique para somar)</span>
        {MES.map((nome, m) => {
          const on = sel.has(m);
          return (
            <button key={m} onClick={() => toggle(m)}
              style={{ padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? AZUL : "rgba(148,163,184,.25)"}`, background: on ? AZUL : "transparent", color: on ? "#04121f" : "#94a3b8" }}>
              {nome}
            </button>
          );
        })}
      </div>

      {/* 4 painéis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <Painel titulo="Faturamento mês a mês" badge={fmtR(calc.totRec)} badgeCor="#10B981">
          <LinhaChart meses={calc.meses} valores={calc.recMes} cor={AZUL} />
        </Painel>
        <Painel titulo="Composição por canal">
          <Barras itens={calc.canais} />
        </Painel>
        <Painel titulo="Despesas mês a mês" badge={fmtR(calc.totCus)} badgeCor={VERMELHO}>
          <LinhaChart meses={calc.meses} valores={calc.cusMes} cor={VERMELHO} />
        </Painel>
        <Painel titulo="Composição dos custos">
          <Barras itens={calc.custos} />
        </Painel>
      </div>

      {/* resumo receita x custo */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: "rgba(16,185,129,.10)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 14, padding: "12px 16px" }}>
          <TrendingUp size={18} color="#10B981" />
          <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Resultado no período</div><b style={{ fontSize: 18, color: calc.totRec - calc.totCus >= 0 ? "#10B981" : VERMELHO }}>{fmtR(calc.totRec - calc.totCus)}</b></div>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.25)", borderRadius: 14, padding: "12px 16px" }}>
          <BarChart3 size={18} color={AZUL} />
          <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Margem</div><b style={{ fontSize: 18, color: "#e2e8f0" }}>{calc.totRec ? `${Math.round((calc.totRec - calc.totCus) / calc.totRec * 100)}%` : "–"}</b></div>
        </div>
      </div>
    </div>
  );
}
