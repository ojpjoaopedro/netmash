"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, TrendingUp, Maximize2, Minimize2 } from "lucide-react";
import { MES, Dados, carregarEstruturaComPagamentos } from "@/app/minhasmetricas/financas-estrutura";
import SeletorAno from "./SeletorAno";

const AZUL = "#38BDF8", VERMELHO = "#F43F5E";
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `R$ ${Math.round(n / 1000)}k` : `R$ ${Math.round(n)}`);
const somaMes = (linhas: { v: number[] }[], m: number) => linhas.reduce((s, l) => s + (l.v[m] || 0), 0);

/** true em telas de celular (≤640px). */
function useEstreito() {
  const [estreito, setEstreito] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const upd = () => setEstreito(mq.matches);
    upd(); mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  return estreito;
}

/** Gráfico de linha em SVG (faturamento/despesas). Escala a fonte pela largura via viewBox. */
function LinhaChart({ meses, valores, cor, alto }: { meses: number[]; valores: number[]; cor: string; alto?: boolean }) {
  if (meses.length === 0) return <div style={{ display: "grid", placeItems: "center", width: "100%", minHeight: 120, color: "#64748b", fontSize: 13, fontStyle: "italic" }}>Sem dados no período</div>;
  const W = 640, H = alto ? 360 : 250, pad = 40, padTop = 40, padBot = 32;
  const n = meses.length;
  const px = (i: number) => pad + (n <= 1 ? (W - pad * 2) / 2 : (i * (W - pad * 2)) / (n - 1));
  // só os meses COM dado viram ponto/linha; os vazios ficam só com o nome no eixo
  const dados = meses.map((m, i) => ({ i, v: valores[i] })).filter((d) => d.v > 0);
  const max = Math.max(1, ...dados.map((d) => d.v));
  const py = (v: number) => padTop + (1 - v / max) * (H - padTop - padBot);
  const pts = dados.map((d) => [px(d.i), py(d.v), d.v] as const);
  const linha = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = pts.length >= 2 ? `${linha} L${pts[pts.length - 1][0].toFixed(1)},${H - padBot} L${pts[0][0].toFixed(1)},${H - padBot} Z` : "";
  const id = `g-${cor.replace("#", "")}-${alto ? "b" : "s"}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={W - pad} y1={padTop + f * (H - padTop - padBot)} y2={padTop + f * (H - padTop - padBot)} stroke="rgba(148,163,184,.13)" strokeDasharray="4 6" />)}
      {area && <path d={area} fill={`url(#${id})`} />}
      {pts.length >= 2 && <path d={linha} fill="none" stroke={cor} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={4.5} fill={cor} strokeWidth={2.5} style={{ stroke: "var(--dash-dot-stroke)" }} />
          <text className="oc-num" x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize="14" fontWeight="800" style={{ fill: "var(--dash-num)" }}>{fmtK(p[2])}</text>
        </g>
      ))}
      {/* nome de TODOS os meses selecionados no eixo (vazios ficam só com o nome) */}
      {meses.map((m, i) => <text key={`l${i}`} x={px(i)} y={H - 9} textAnchor="middle" fontSize="12" style={{ fill: "var(--dash-muted)" }}>{MES[m]}</text>)}
    </svg>
  );
}

/** Barras horizontais de composição. */
function Barras({ itens, alto }: { itens: { nome: string; valor: number; cor: string }[]; alto?: boolean }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  const estreito = useEstreito();
  const larguraRot = estreito ? 96 : (alto ? 260 : 220);
  const altura = alto ? 30 : 24;
  return (
    <div style={{ display: "grid", gap: alto ? 14 : 16, alignContent: "center", height: "100%", width: "100%", minWidth: 0 }}>
      {itens.map((it) => (
        <div key={it.nome} style={{ display: "flex", alignItems: "center", gap: estreito ? 8 : 12 }}>
          <span style={{ width: larguraRot, flexShrink: 0, fontSize: alto ? 14 : (estreito ? 11.5 : 13), color: "var(--dash-muted)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: "italic" }}>{it.nome}</span>
          {/* trilho ocupa todo o espaço; a barra é proporcional à maior */}
          <div style={{ flex: 1, minWidth: 0, height: altura, borderRadius: 8, background: "var(--dash-track)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 8, background: it.cor, width: `${Math.max(5, (it.valor / max) * 100)}%`, boxShadow: `0 0 18px -3px ${it.cor}aa` }} />
          </div>
          <span className="oc-num" style={{ width: estreito ? 78 : 96, flexShrink: 0, textAlign: "right", fontSize: alto ? 15 : 13.5, fontWeight: 800, color: "var(--dash-num)", whiteSpace: "nowrap" }}>{fmtR(it.valor)}</span>
        </div>
      ))}
    </div>
  );
}

function Painel({ titulo, badge, badgeCor, chart, children }: { titulo: string; badge?: string; badgeCor?: string; chart?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--dash-card)", border: "1px solid var(--dash-card-line)", borderRadius: 16, padding: 14, boxShadow: "var(--dash-shadow)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <b style={{ fontSize: 14.5, color: "var(--dash-title)", letterSpacing: "-.01em" }}>{titulo}</b>
        {badge && (
          <span style={{ textAlign: "right", padding: "6px 12px", borderRadius: 11, background: `${badgeCor}22`, border: `1px solid ${badgeCor}66` }}>
            <span style={{ display: "block", fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: badgeCor }}>{titulo.includes("Fatur") ? "Total faturado" : "Custos totais"}</span>
            <span className="oc-num" style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: "var(--dash-title)" }}>{badge}</span>
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: chart ? 140 : 0, display: "flex" }}>{children}</div>
    </div>
  );
}

function Resumo({ icone, rotulo, valor, cor, borda, fundo }: { icone: React.ReactNode; rotulo: string; valor: string; cor: string; borda: string; fundo: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 12, background: fundo, border: `1px solid ${borda}`, borderRadius: 16, padding: "16px 20px" }}>
      {icone}
      <div><div style={{ fontSize: 10.5, color: "var(--dash-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{rotulo}</div><b className="oc-num" style={{ fontSize: "clamp(18px, 5vw, 24px)", color: cor, letterSpacing: "-.02em" }}>{valor}</b></div>
    </div>
  );
}

export default function FinancasDashboard({ ano = 2026, setAno }: { ano?: number; setAno?: (a: number) => void }) {
  const [data, setData] = useState<Dados | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [full, setFull] = useState(false);
  const estreito = useEstreito();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carregar = () => {
      const d = carregarEstruturaComPagamentos(ano);
      setData(d);
      // padrão: TODOS os meses marcados (só no Dashboard)
      setSel(new Set(Array.from({ length: 12 }, (_, i) => i)));
    };
    carregar();
    window.addEventListener("me:pagamentos", carregar);
    return () => window.removeEventListener("me:pagamentos", carregar);
  }, [ano]);

  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else ref.current?.requestFullscreen?.().catch(() => {}); };

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
  const res = calc.totRec - calc.totCus;

  // conteúdo do dashboard (reaproveitado em tela cheia)
  const conteudo = (
    <div style={{ display: "flex", flexDirection: "column", gap: full ? 16 : 14, height: full ? "100%" : "auto", ...(full ? { width: "min(100vw, calc(100vh * 16 / 9))", maxHeight: "100vh", margin: "0 auto" } : {}) }}>
      {/* seletor de meses + expandir */}
      <div className="mesbar" style={full ? undefined : { marginBottom: 56 }}>
        {setAno && <span className="mesbar-ano"><SeletorAno ano={ano} setAno={setAno} escuro /></span>}
        <div className="mesbar-meses">
          {MES.map((nome, m) => {
            const on = sel.has(m);
            return (
              <button key={m} onClick={() => toggle(m)}
                style={{ padding: "6px 12px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? "var(--brand)" : "var(--dash-card-line)"}`, background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-ct,#fff)" : "var(--dash-muted)" }}>
                {nome}
              </button>
            );
          })}
        </div>
        <span className="mesbar-sep" style={{ width: 1, height: 22, background: "rgba(148,163,184,.28)", margin: "0 3px" }} />
        <div className="mesbar-acoes">
          {(() => { const btn: React.CSSProperties = { padding: "6px 11px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--dash-card-line)", background: "transparent", color: "var(--dash-muted)" }; return (
            <>
              <button onClick={() => setSel(sel.size === 12 ? new Set([new Date().getMonth()]) : new Set(Array.from({ length: 12 }, (_, i) => i)))} style={btn}>{sel.size === 12 ? "Desmarcar todos" : "Marcar todos"}</button>
              <button onClick={() => setSel(new Set([new Date().getMonth()]))} style={btn}>Só mês atual</button>
            </>
          ); })()}
        </div>
        {!estreito && (
          <button onClick={toggleFull} title={full ? "Sair da tela cheia" : "Expandir para tela cheia"}
            style={{ marginLeft: "auto", width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", cursor: "pointer", border: "1px solid rgba(148,163,184,.28)", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}>
            {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}
      </div>

      {/* 4 painéis */}
      <div className="dash-grid" style={{ display: "grid", columnGap: 12, rowGap: full ? 36 : 18, flex: full ? 1 : undefined, minHeight: 0,
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridTemplateRows: full ? "1fr 1fr" : undefined }}>
        <Painel titulo="Faturamento mês a mês" badge={fmtR(calc.totRec)} badgeCor="#10B981" chart>
          <LinhaChart meses={calc.meses} valores={calc.recMes} cor={AZUL} alto={full} />
        </Painel>
        <Painel titulo="Composição por canal"><Barras itens={calc.canais} alto={full} /></Painel>
        {!full && <div aria-hidden style={{ gridColumn: "1 / -1", height: 1, background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 32%, transparent), transparent)" }} />}
        <Painel titulo="Despesas mês a mês" badge={fmtR(calc.totCus)} badgeCor={VERMELHO} chart>
          <LinhaChart meses={calc.meses} valores={calc.cusMes} cor={VERMELHO} alto={full} />
        </Painel>
        <Painel titulo="Composição dos custos"><Barras itens={calc.custos.slice(0, 6)} alto={full} /></Painel>
      </div>

      {!full && <div aria-hidden style={{ height: 1, margin: "4px 0", background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 32%, transparent), transparent)" }} />}

      {/* resumo receita x custo */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Resumo icone={<TrendingUp size={22} color="#10B981" />} rotulo="Resultado no período" valor={fmtR(res)} cor={res >= 0 ? "#10B981" : VERMELHO} borda="rgba(16,185,129,.3)" fundo="rgba(16,185,129,.1)" />
        <Resumo icone={<BarChart3 size={22} color={AZUL} />} rotulo="Margem" valor={calc.totRec ? `${Math.round(res / calc.totRec * 100)}%` : "–"} cor="var(--dash-title)" borda="rgba(56,189,248,.25)" fundo="rgba(56,189,248,.08)" />
      </div>
    </div>
  );

  return (
    <div ref={ref} className={full ? undefined : "dash-escuro"} style={{ background: "var(--dash-bg)", border: full ? "none" : "1px solid var(--dash-line)", borderRadius: full ? 0 : 22,
      padding: full ? "clamp(16px, 3vh, 40px) clamp(16px, 3vw, 48px)" : 20,
      ...(full ? { display: "flex", flexDirection: "column", justifyContent: "center", overflow: "auto" } : {}) }}>
      {conteudo}
    </div>
  );
}
