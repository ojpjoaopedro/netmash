"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, LineChart, Wallet, Sparkles, Table2, BarChart3, Megaphone,
  EyeOff, HelpCircle, FolderX, AlarmClock, Coins, FileWarning,
  Check, Rocket, Play, DollarSign, TrendingUp, Award, ChevronDown, X as XIcon,
  CheckCircle2, Calendar, Home, Hand,
} from "lucide-react";

const ENTRAR_URL = "/login";
const PLANOS_URL = "/vendas";
const MARCA = "Minhas Métricas";
/* Quando tiver um screencast do app, coloque o caminho aqui (ex.: "/videos/app-demo.mp4")
   e a seção "Veja em ação" passa a tocar o vídeo real no lugar da demo animada. */
const DEMO_VIDEO = "";

const C = {
  bg: "#08090C", card: "#111219", line: "rgba(255,255,255,.08)", txt: "#F3F5F8",
  muted: "rgba(226,232,240,.62)", cyan: "#22B8F0", green: "#10B981", violet: "#8b5cf6",
  red: "#EF4444", amber: "#F59E0B",
};
const container: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 20px" };
const chip: React.CSSProperties = { display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: C.cyan, background: "rgba(34,184,240,.1)", border: "1px solid rgba(34,184,240,.25)", borderRadius: 99, padding: "6px 14px" };
const miniCard: React.CSSProperties = { background: "rgba(255,255,255,.03)", border: `1px solid ${C.line}`, borderRadius: 12, padding: 10 };

/* ─── Reveal ao rolar ──────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ opacity: seen ? undefined : 0, animation: seen ? `fadeUp .7s ease ${delay}ms both` : "none", ...style }}>{children}</div>;
}

/* ─── Celular ──────────────────────────────────────────────────────────── */
function Phone({ children, float = false, tilt = 0, big = false, nav }: { children: React.ReactNode; float?: boolean; tilt?: number; big?: boolean; nav?: React.ReactNode }) {
  const w = big ? "min(288px, 82vw)" : "min(246px, 78vw)", h = big ? 528 : 452;
  return (
    <div style={{ width: w, flexShrink: 0, animation: float ? "floaty 6s ease-in-out infinite" : undefined, transform: `rotate(${tilt}deg)` }}>
      <div style={{ borderRadius: big ? 40 : 34, padding: 9, background: "linear-gradient(160deg,#23252e,#0e0f14)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.03)" }}>
        <div style={{ borderRadius: big ? 32 : 26, overflow: "hidden", background: C.bg, height: h, position: "relative" }}>
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 78, height: 18, borderRadius: 99, background: "#000", zIndex: 3 }} />
          <div style={{ padding: "26px 12px", paddingBottom: nav ? 54 : 12, height: "100%" }}>{children}</div>
          {nav && <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, height: 42, borderRadius: 16, background: "rgba(18,19,26,.9)", backdropFilter: "blur(10px)", border: `1px solid ${C.line}`, display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 4, boxShadow: "0 8px 20px -8px rgba(0,0,0,.7)" }}>{nav}</div>}
        </div>
      </div>
    </div>
  );
}

/* Telas */
function TelaHome() {
  return (
    <div style={{ background: "linear-gradient(158deg,#16171e,#0f0f16)", border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, height: "100%" }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".14em", color: "rgba(122,208,234,.85)" }}>BOA TARDE, JOÃO</div>
      <div style={{ fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 2 }}>Sexta-feira, 12 de julho</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 12 }}>
        {[
          { ic: <DollarSign size={12} />, c: C.green, v: "R$ 72k", l: "FATURAM." },
          { ic: <TrendingUp size={12} />, c: C.violet, v: "18", l: "CLIENTES" },
          { ic: <Wallet size={12} />, c: "#fff", v: "R$ 31k", l: "CAIXA", hl: true },
        ].map((k, i) => (
          <div key={i} style={{ borderRadius: 11, padding: 8, minHeight: 70, display: "flex", flexDirection: "column", gap: 5, border: k.hl ? "0" : `1px solid ${C.line}`, background: k.hl ? "linear-gradient(150deg,#1AADE2,#0c6e9e)" : "rgba(255,255,255,.025)", color: k.hl ? "#fff" : C.txt }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", background: k.hl ? "rgba(255,255,255,.22)" : k.c + "22", color: k.hl ? "#fff" : k.c }}>{k.ic}</span>
            <b style={{ fontSize: 11, marginTop: "auto" }}>{k.v}</b>
            <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: ".04em", color: k.hl ? "rgba(255,255,255,.9)" : C.muted }}>{k.l}</span>
          </div>
        ))}
      </div>
      <ChartCard titulo="FATURAMENTO · 6 MESES" vals={[40, 48, 39, 43, 56, 71]} cor={C.cyan} />
      <div style={{ ...miniCard, marginTop: 8 }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: C.cyan, letterSpacing: ".08em" }}>PULSO DA SEMANA</div>
        <div style={{ fontSize: 8, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>Cobrar 3 clientes · Fechar folha até sexta · Renegociar fornecedor</div>
      </div>
    </div>
  );
}

function TelaFinancas({ animar = false }: { animar?: boolean }) {
  const pts = [18, 30, 24, 40, 33, 55, 71];
  const W = 200, H = 96, max = 75;
  const x = (i: number) => 6 + (i / (pts.length - 1)) * (W - 12);
  const y = (v: number) => 8 + (1 - v / max) * (H - 20);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(0)},${y(v).toFixed(0)}`).join(" ");
  return (
    <div style={{ height: "100%" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((m) => (
          <span key={m} style={{ fontSize: 7.5, fontWeight: 800, padding: "5px 0", flex: 1, textAlign: "center", borderRadius: 8, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)" }}>{m}</span>
        ))}
      </div>
      <div style={{ ...miniCard }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 8.5, fontWeight: 700 }}>Faturamento</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: C.green }}>R$ 297.793</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity=".4" /><stop offset="100%" stopColor={C.cyan} stopOpacity="0" /></linearGradient></defs>
          <path d={`${line} L${x(pts.length - 1)},${H - 8} L${x(0)},${H - 8} Z`} fill="url(#lg)" opacity={animar ? 0 : 1} style={animar ? { animation: "fadeArea .8s ease .7s forwards" } : undefined} />
          <path d={line} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 2px 6px ${C.cyan}88)`, strokeDasharray: 400, strokeDashoffset: animar ? 400 : 0, animation: animar ? "drawLine 1.4s ease forwards" : undefined }} />
          {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill={C.cyan} opacity={animar ? 0 : 1} style={animar ? { animation: `dot .3s ease ${0.5 + i * 0.13}s forwards` } : undefined} />)}
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
        <div style={miniCard}><div style={{ fontSize: 7, color: C.muted }}>LUCRO</div><b style={{ fontSize: 10, color: C.green }}>R$ 42k</b></div>
        <div style={miniCard}><div style={{ fontSize: 7, color: C.muted }}>MARGEM</div><b style={{ fontSize: 10, color: C.cyan }}>18,4%</b></div>
      </div>
      <div style={{ ...miniCard, marginTop: 8 }}>
        <div style={{ fontSize: 7.5, color: C.muted, fontWeight: 700, marginBottom: 6, letterSpacing: ".06em" }}>COMPOSIÇÃO POR CANAL</div>
        {([["Comercial", "58%", C.cyan], ["Escolas", "26%", C.violet], ["Renovações", "16%", C.green]] as [string, string, string][]).map(([l, w, cor], i) => (
          <div key={i} style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, marginBottom: 2 }}><span style={{ color: C.muted }}>{l}</span><b>{w}</b></div>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ height: "100%", width: w, borderRadius: 4, background: cor, animation: `growX .8s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s both` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaPlanilha() {
  const linhas: [string, string][] = [["Faturamento", C.green], ["Custos", C.red], ["Lucro", C.cyan], ["Leads", C.violet], ["NPS", C.amber]];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>Planilha · mês a mês</div>
      <div style={{ ...miniCard, padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4,1fr)", gap: 3, fontSize: 6.5, color: C.muted, fontWeight: 700, paddingBottom: 5, borderBottom: `1px solid ${C.line}` }}>
          <span>Indicador</span><span style={{ textAlign: "right" }}>Jan</span><span style={{ textAlign: "right" }}>Fev</span><span style={{ textAlign: "right" }}>Mar</span><span style={{ textAlign: "right" }}>Abr</span>
        </div>
        {linhas.map(([nome, cor], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4,1fr)", gap: 3, fontSize: 7, padding: "6px 0", borderBottom: i < linhas.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: 99, background: cor }} />{nome}</span>
            {["40", "48", "39", "43"].map((val, k) => <span key={k} style={{ textAlign: "right", color: C.txt }}>{val}</span>)}
          </div>
        ))}
      </div>
      <ChartCard titulo="…VIRAM GRÁFICO NA HORA" vals={[40, 48, 39, 43, 56, 71]} cor={C.cyan} />
      <div style={{ marginTop: 7, fontSize: 7.5, color: C.muted, lineHeight: 1.5 }}>Digite os números; os gráficos se montam sozinhos.</div>
    </div>
  );
}

function MiniRing({ pct, cor }: { pct: number; cor: string }) {
  const R = 15, CC = 2 * Math.PI * R, off = CC - (Math.min(100, pct) / 100) * CC;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
      <circle cx="20" cy="20" r={R} fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" strokeDasharray={CC} strokeDashoffset={off} transform="rotate(-90 20 20)" />
      <text x="20" y="23" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">{pct}%</text>
    </svg>
  );
}
function MiniBars({ vals, cor, h = 46 }: { vals: number[]; cor: string; h?: number }) {
  const max = Math.max(...vals, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: h }}>
      {vals.map((v, i) => (
        <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", background: `linear-gradient(180deg, ${cor}, ${cor}44)`, height: `${(v / max) * 100}%`, transformOrigin: "bottom", animation: `growUp .7s cubic-bezier(.2,.8,.2,1) ${i * 0.05}s both`, boxShadow: `0 -3px 10px ${cor}44` }} />
      ))}
    </div>
  );
}
function ChartCard({ titulo, vals, cor }: { titulo: string; vals: number[]; cor: string }) {
  return (
    <div style={{ ...miniCard, marginTop: 8 }}>
      <div style={{ fontSize: 7.5, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 6 }}>{titulo}</div>
      <MiniBars vals={vals} cor={cor} />
    </div>
  );
}
function TelaIndicadores() {
  const cards: [string, string, number, string][] = [["Faturam.", "R$ 297k", 68, C.green], ["Lucro", "R$ 42k", 54, C.cyan], ["Margem", "18,4%", 52, C.violet], ["Clientes", "108", 45, C.amber]];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>Indicadores · no ano</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {cards.map(([l, v, p, cor], i) => (
          <div key={i} style={{ ...miniCard, display: "flex", alignItems: "center", gap: 8 }}>
            <MiniRing pct={p} cor={cor} />
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 6.5, color: C.muted, textTransform: "uppercase", fontWeight: 700 }}>{l}</div><b style={{ fontSize: 9.5 }}>{v}</b></div>
          </div>
        ))}
      </div>
      <ChartCard titulo="EVOLUÇÃO DO FATURAMENTO" vals={[40, 48, 39, 43, 56, 71]} cor={C.green} />
      <ChartCard titulo="NOVOS CLIENTES / MÊS" vals={[12, 18, 14, 16, 21, 27]} cor={C.amber} />
    </div>
  );
}
function TelaComercial() {
  const bars: [string, string, string, string][] = [["Leads", "520", C.violet, "100%"], ["Reuniões", "180", C.cyan, "52%"], ["Vendas", "64", C.green, "22%"]];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>Comercial · funil</div>
      <div style={{ ...miniCard, display: "grid", gap: 9 }}>
        {bars.map(([l, v, cor, w], i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, marginBottom: 3 }}><span style={{ color: C.muted }}>{l}</span><b>{v}</b></div>
            <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ height: "100%", width: w, borderRadius: 6, background: cor }} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
        <div style={miniCard}><div style={{ fontSize: 7, color: C.muted }}>CONVERSÃO</div><b style={{ fontSize: 10, color: C.cyan }}>12,3%</b></div>
        <div style={miniCard}><div style={{ fontSize: 7, color: C.muted }}>TICKET</div><b style={{ fontSize: 10, color: C.green }}>R$ 2.140</b></div>
      </div>
      <ChartCard titulo="VENDAS POR MÊS" vals={[38, 44, 40, 52, 58, 64]} cor={C.cyan} />
    </div>
  );
}
function TelaAssistente() {
  const bolha = (txt: string) => <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><div style={{ background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", color: "#fff", fontSize: 8, padding: "6px 9px", borderRadius: "10px 10px 2px 10px", maxWidth: "80%", lineHeight: 1.4 }}>{txt}</div></div>;
  return (
    <div style={{ height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)" }}><Sparkles size={12} color="#fff" /></span><b style={{ fontSize: 9 }}>Assistente</b></div>
      {bolha("Como está meu caixa este mês?")}
      <div style={{ display: "flex", marginBottom: 6 }}><div style={{ ...miniCard, fontSize: 8, padding: 9, maxWidth: "90%", lineHeight: 1.55 }}>Seu caixa está <b style={{ color: C.green }}>positivo</b>: sobraram <b>R$ 42.180</b> (margem 18,4%). ⚠️ 3 contas vencem semana que vem.</div></div>
      {bolha("O que eu corto primeiro?")}
    </div>
  );
}

function TelaMarketing() {
  const kpis: [string, string, string][] = [["Leads", "1.240", C.violet], ["CPL", "R$ 4,80", C.cyan], ["ROI", "312%", C.green]];
  const orig: [string, string, string][] = [["Instagram", "58%", C.violet], ["Google", "30%", C.cyan], ["Indicação", "12%", C.green]];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>Marketing · tráfego</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
        {kpis.map(([l, v, cor], i) => <div key={i} style={{ ...miniCard, padding: 7 }}><div style={{ fontSize: 6, color: C.muted, fontWeight: 700 }}>{l}</div><b style={{ fontSize: 9, color: cor }}>{v}</b></div>)}
      </div>
      <div style={{ ...miniCard, marginTop: 6 }}>
        <div style={{ fontSize: 7, color: C.muted, marginBottom: 6, fontWeight: 700 }}>ORIGEM DOS LEADS</div>
        {orig.map(([l, w, cor], i) => (
          <div key={i} style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, marginBottom: 2 }}><span style={{ color: C.muted }}>{l}</span><b>{w}</b></div>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ height: "100%", width: w, borderRadius: 4, background: cor }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
function TelaDRE() {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>DRE · Julho</div>
      <div style={{ ...miniCard, display: "grid", gap: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8 }}><span style={{ color: C.muted }}>Receitas</span><b style={{ color: C.green }}>R$ 72.000</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8 }}><span style={{ color: C.muted }}>Custos totais</span><b style={{ color: C.red }}>− R$ 30.000</b></div>
        <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,.05)", overflow: "hidden", display: "flex" }}><div style={{ width: "58%", background: "linear-gradient(90deg,#f43f5e,#e11d48)" }} /><div style={{ width: "42%", background: "linear-gradient(90deg,#10b981,#059669)" }} /></div>
      </div>
      <div style={{ marginTop: 6, borderRadius: 12, padding: 10, background: "linear-gradient(135deg,#059669,#047857)", color: "#fff" }}>
        <div style={{ fontSize: 7, opacity: .9, fontWeight: 700 }}>RESULTADO DO MÊS</div>
        <b style={{ fontSize: 16 }}>+ R$ 42.000</b>
        <div style={{ fontSize: 7, opacity: .9 }}>Margem líquida 18,4%</div>
      </div>
    </div>
  );
}
function TelaCalendario() {
  const marca = [5, 12, 18, 25, 28];
  return (
    <div style={{ height: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8 }}>Contas a pagar · Julho</div>
      <div style={miniCard}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i} style={{ fontSize: 6, color: C.muted, textAlign: "center", fontWeight: 700 }}>{d}</span>)}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => { const m = marca.includes(d); return <span key={d} style={{ fontSize: 6.5, textAlign: "center", padding: "3px 0", borderRadius: 5, color: m ? "#fff" : C.muted, fontWeight: m ? 800 : 400, background: m ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "transparent" }}>{d}</span>; })}
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 7.5, color: C.muted, lineHeight: 1.5 }}>Em vermelho, as contas a vencer — você é avisado antes de cada vencimento.</div>
    </div>
  );
}

/* Demo que roda sozinha (como um vídeo do app) */
const DEMO = [
  { el: (a: boolean) => <TelaFinancas animar={a} />, label: "Finanças" },
  { el: () => <TelaHome />, label: "Resumo" },
  { el: () => <TelaIndicadores />, label: "Indicadores" },
  { el: () => <TelaDRE />, label: "DRE" },
  { el: () => <TelaPlanilha />, label: "Planilha" },
  { el: () => <TelaComercial />, label: "Comercial" },
  { el: () => <TelaMarketing />, label: "Marketing" },
  { el: () => <TelaCalendario />, label: "Contas" },
  { el: () => <TelaAssistente />, label: "Assistente" },
];
// destinos da barra de navegação dentro do celular (como no app de verdade)
const NAV_ITENS: { idx: number; Icon: typeof Home; label: string }[] = [
  { idx: 1, Icon: Home, label: "Início" },
  { idx: 0, Icon: LineChart, label: "Finanças" },
  { idx: 4, Icon: Table2, label: "Planilha" },
  { idx: 5, Icon: BarChart3, label: "Comercial" },
  { idx: 8, Icon: Sparkles, label: "IA" },
];
function DemoPhone({ big = false, float = false }: { big?: boolean; float?: boolean }) {
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (manual) return;
    const id = setInterval(() => setI((v) => (v + 1) % DEMO.length), 2900);
    return () => clearInterval(id);
  }, [manual]);
  const ir = (k: number) => { setI(k); setManual(true); };

  const nav = (
    <>
      {NAV_ITENS.map(({ idx, Icon, label }) => {
        const on = i === idx;
        return (
          <button key={idx} onClick={() => ir(idx)} title={label} style={{ cursor: "pointer", border: 0, background: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 6px", color: on ? C.cyan : C.muted, transition: ".2s" }}>
            <Icon size={16} />
            <span style={{ fontSize: 6.5, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <Phone big={big} float={float} nav={nav}>
          <div key={i} style={{ height: "100%", animation: "swap .5s ease" }}>{DEMO[i].el(true)}</div>
        </Phone>
        {!manual && (
          <span style={{ position: "absolute", top: 14, right: 14, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: C.cyan, background: "rgba(34,184,240,.14)", border: "1px solid rgba(34,184,240,.3)", borderRadius: 99, padding: "3px 9px", zIndex: 5 }}>
            <Hand size={11} /> toque para navegar
          </span>
        )}
      </div>
      {/* pílulas: linha única, rola no mobile */}
      <div className="pills-strip" style={{ overflowX: "auto", marginTop: 16 }}>
        <div style={{ display: "flex", gap: 6, width: "max-content", margin: "0 auto", padding: "0 4px 4px" }}>
          {DEMO.map((d, k) => (
            <button key={k} onClick={() => ir(k)} style={{ flexShrink: 0, cursor: "pointer", border: 0, fontSize: 11.5, fontWeight: 700, padding: "6px 13px", borderRadius: 99, color: i === k ? "#fff" : C.muted, background: i === k ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "rgba(255,255,255,.05)", transition: ".2s" }}>{d.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 42px" }}>
      <span style={chip}>{eyebrow}</span>
      <h2 style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, letterSpacing: "-.02em", margin: "18px 0 0", lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.6, margin: "14px auto 0" }}>{sub}</p>}
    </div>
  );
}

const DORES = [
  { Icon: EyeOff, t: "Não sabe o lucro real", d: "Olha o saldo do banco e acha que está tudo bem — mas o dinheiro ali já tem dono." },
  { Icon: HelpCircle, t: "Decide no achismo", d: "Sem número na mão, cada decisão de preço, contratação ou corte é um chute." },
  { Icon: FolderX, t: "Dados espalhados", d: "Uma planilha aqui, um caderno ali, o extrato no banco — e nada conversa entre si." },
  { Icon: AlarmClock, t: "Descobre tarde demais", d: "O problema só aparece quando o caixa já está no vermelho e não dá mais pra reagir." },
  { Icon: Coins, t: "Não sabe pra onde vai o dinheiro", d: "Custos invisíveis comendo a margem todo mês, sem ninguém perceber." },
  { Icon: FileWarning, t: "Fechar o mês é um pesadelo", d: "Horas montando relatório na mão, e mesmo assim sem confiança no resultado." },
];
const FEATURES = [
  { Icon: LineChart, t: "Dashboard de verdade", d: "Faturamento, lucro, margem e clientes num painel que se monta sozinho." },
  { Icon: Wallet, t: "Finanças & DRE", d: "Entradas, saídas e resultado do mês. Saiba se sobrou ou faltou, sem planilha." },
  { Icon: Table2, t: "Planilha mês a mês", d: "Digite os indicadores como numa planilha; os gráficos aparecem na hora." },
  { Icon: Sparkles, t: "Assistente inteligente", d: "Pergunte “como está meu caixa?” e receba a resposta com o que fazer essa semana." },
  { Icon: BarChart3, t: "Gráficos e metas", d: "Anéis de progresso vs. meta do ano e evolução mês a mês de cada número." },
  { Icon: Megaphone, t: "Comercial & Marketing", d: "Leads, conversão, ROI e ticket médio — acompanhe o que traz dinheiro pra dentro." },
];
const PARCEIROS = [
  { src: "/parceiros/araguaia.svg", alt: "Colégio Araguaia", h: 46 },
  { src: "/parceiros/stone.png", alt: "Stone", h: 34 },
  { src: "/parceiros/dynamis.webp", alt: "Dynamis Family", h: 40 },
];
const PASSOS = [
  { n: "1", t: "Cadastre a empresa", d: "Nome, logo e saldo inicial. Leva 2 minutos e o painel já fica com a sua cara." },
  { n: "2", t: "Lance ou importe os dados", d: "Registre receitas e despesas, digite na planilha mês a mês ou importe uma planilha pronta." },
  { n: "3", t: "Acompanhe e decida", d: "Os indicadores, gráficos e alertas se montam sozinhos. Você enfim enxerga o negócio." },
];

/* ─── animações de dados ───────────────────────────────────────────────── */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function CountUp({ to, dur = 1300, prefix = "", suffix = "" }: { to: number; dur?: number; prefix?: string; suffix?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / dur); setVal(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, dur]);
  return <span ref={ref}>{prefix}{val.toLocaleString("pt-BR")}{suffix}</span>;
}

const heroCard: React.CSSProperties = { background: "linear-gradient(160deg,#0e1622,#0b0f16)", border: `1px solid ${C.line}`, borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" };
function HeroStats() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} style={{ display: "grid", gap: 14 }}>
      <div className="lift" style={heroCard}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,184,240,.28), transparent 60%)", animation: "pulseGlow 4s ease-in-out infinite" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(34,184,240,.14)", color: C.cyan }}><TrendingUp size={22} /></span>
            <div><b style={{ fontSize: 15 }}>Faturamento do ano</b><div style={{ fontSize: 12, color: C.muted }}>Atualiza sozinho</div></div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.cyan, background: "rgba(34,184,240,.12)", border: "1px solid rgba(34,184,240,.25)", borderRadius: 99, padding: "4px 10px" }}>YTD</span>
        </div>
        <div style={{ position: "relative", fontSize: "clamp(36px,6vw,50px)", fontWeight: 900, letterSpacing: "-.02em", marginTop: 16, lineHeight: 1 }}>R$ <CountUp to={297} />k</div>
        <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.06)", marginTop: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#22b8f0,#0c6e9e)", width: inView ? "68%" : "0%", transition: "width 1.4s cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, color: C.muted }}><span>Meta R$ 700k</span><b style={{ color: C.txt }}>68% da meta</b></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="lift" style={heroCard}>
          <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(16,185,129,.14)", color: C.green }}><Wallet size={19} /></span>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 12 }}>R$ <CountUp to={42} />k</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Lucro · margem 18,4%</div>
        </div>
        <div className="lift" style={heroCard}>
          <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(139,92,246,.14)", color: C.violet }}><TrendingUp size={19} /></span>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 12 }}><CountUp to={108} /></div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Novos clientes no ano</div>
        </div>
      </div>
    </div>
  );
}

/* ─── gráficos ─────────────────────────────────────────────────────────── */
function BarsFaturamento() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const data: [string, number][] = [["Jan", 40], ["Fev", 48], ["Mar", 39], ["Abr", 43], ["Mai", 56], ["Jun", 71]];
  const max = 78;
  return (
    <div ref={ref} className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <b style={{ fontSize: 16 }}>Faturamento mês a mês</b><span style={{ color: C.green, fontWeight: 800 }}>R$ 297k</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
        {data.map(([m, v], i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "100%", maxWidth: 34, borderRadius: "6px 6px 0 0", background: "linear-gradient(180deg,#38BDF8,#0c6e9e)", height: inView ? `${(v / max) * 100}%` : "0%", transition: `height .9s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s`, boxShadow: "0 -4px 14px rgba(34,184,240,.3)" }} />
            <span style={{ fontSize: 11.5, color: C.muted }}>{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function DonutCustos() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const segs: [string, number, string][] = [["Folha", 38, C.cyan], ["Fornecedores", 24, C.violet], ["Marketing", 18, C.amber], ["Impostos", 12, C.green], ["Outros", 8, "#64748B"]];
  let acc = 0;
  const stops = segs.map(([, p, cor]) => { const from = acc; acc += p; return `${cor} ${from}% ${acc}%`; }).join(",");
  return (
    <div ref={ref} className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22 }}>
      <b style={{ fontSize: 16 }}>Para onde vai o dinheiro</b>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 16 }}>
        <div style={{ width: 128, height: 128, flexShrink: 0, borderRadius: "50%", background: `conic-gradient(${stops})`, position: "relative", opacity: inView ? 1 : 0, transform: inView ? "rotate(0) scale(1)" : "rotate(-40deg) scale(.85)", transition: ".8s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ position: "absolute", inset: 15, borderRadius: "50%", background: C.card }} />
        </div>
        <div style={{ display: "grid", gap: 7, flex: 1 }}>
          {segs.map(([l, p, cor], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><span style={{ width: 10, height: 10, borderRadius: 99, background: cor, flexShrink: 0 }} /><span style={{ color: C.muted, flex: 1 }}>{l}</span><b>{p}%</b></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── sem × com / FAQ ──────────────────────────────────────────────────── */
const SEM = ["Decisões no achismo, sem número na mão", "Planilhas soltas que ninguém atualiza", "Descobre o rombo quando o caixa já apertou", "Não sabe o lucro real do mês", "Fechar o mês leva horas de trabalho manual"];
const COM = ["Decisões com o número real na tela", "Tudo num painel que se monta sozinho", "Alertas antes do caixa ficar no vermelho", "Lucro e margem atualizados toda semana", "Relatório e DRE prontos em 1 clique"];
const FAQS: { q: string; a: string }[] = [
  { q: "Preciso entender de finanças pra usar?", a: "Não. Você lança receitas e despesas (ou importa uma planilha) e o app monta os gráficos, o DRE e os indicadores sozinho — em linguagem simples." },
  { q: "Funciona no celular?", a: "Sim. Roda no celular, tablet e computador direto no navegador, sem instalar nada." },
  { q: "Consigo importar minha planilha atual?", a: "Sim. Dá pra importar sua planilha e também digitar mês a mês, como numa planilha, dentro do app." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada empresa acessa apenas os próprios dados, com login protegido por senha." },
  { q: "Serve pro meu tipo de negócio?", a: "Serve pra comércio, serviços, clínicas, escolas e qualquer empresa que queira enxergar faturamento, custos e lucro num lugar só." },
];
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      {FAQS.map((f, i) => {
        const o = open === i;
        return (
          <div key={i} style={{ background: C.card, border: `1px solid ${o ? "rgba(34,184,240,.3)" : C.line}`, borderRadius: 16, padding: "18px 20px", transition: "border-color .2s" }}>
            <button onClick={() => setOpen(o ? null : i)} style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 12, background: "none", border: 0, color: C.txt, cursor: "pointer", textAlign: "left", fontSize: 16, fontWeight: 700, padding: 0, fontFamily: "inherit" }}>
              {f.q}
              <ChevronDown size={18} color={C.cyan} style={{ transform: o ? "rotate(180deg)" : "none", transition: ".2s", flexShrink: 0 }} />
            </button>
            {o && <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.6, margin: "12px 0 0" }}>{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setP(max > 0 ? (h.scrollTop / max) * 100 : 0); };
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${p}%`, background: "linear-gradient(90deg,#22b8f0,#8b5cf6)", zIndex: 50, transition: "width .08s linear", boxShadow: "0 0 10px rgba(34,184,240,.6)" }} />;
}

const brl0 = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
function Simulador() {
  const [fat, setFat] = useState(30000);
  const anual = fat * 12;
  const custos = anual * 0.72;
  const lucro = anual - custos;
  return (
    <div className="cmp" style={{ background: "linear-gradient(160deg,#0e1622,#0b0f16)", border: `1px solid ${C.line}`, borderRadius: 24, padding: "clamp(24px,4vw,40px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -60, bottom: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,184,240,.18), transparent 60%)", animation: "pulseGlow 5s ease-in-out infinite" }} />
      <div style={{ position: "relative" }}>
        <span style={chip}>Faça o teste</span>
        <h3 style={{ fontSize: "clamp(22px,3.5vw,30px)", fontWeight: 900, margin: "16px 0 6px", lineHeight: 1.15 }}>Quanto sua empresa movimenta por ano?</h3>
        <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>Arraste e veja o tamanho do que você deveria estar acompanhando de perto — todo mês.</p>
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: C.muted, fontSize: 13 }}>Faturamento por mês</span><b style={{ color: C.cyan, fontSize: 16 }}>{brl0(fat)}</b></div>
          <input type="range" min={5000} max={200000} step={1000} value={fat} onChange={(e) => setFat(Number(e.target.value))} className="range" style={{ width: "100%" }} aria-label="Faturamento por mês" />
        </div>
      </div>
      <div style={{ position: "relative", display: "grid", gap: 12 }}>
        <div className="lift" style={{ ...heroCard }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: C.muted }}>FATURAMENTO ANUAL</div>
          <b style={{ display: "block", fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, color: C.cyan, marginTop: 6, letterSpacing: "-.02em" }}>{brl0(anual)}</b>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ ...heroCard, padding: 16 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#fca5a5" }}>CUSTOS ESTIMADOS</div>
            <b style={{ fontSize: 20, marginTop: 4, display: "block" }}>{brl0(custos)}</b>
          </div>
          <div className="lift" style={{ padding: 16, borderRadius: 20, background: "linear-gradient(150deg,#059669,#047857)", color: "#fff" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, opacity: .9 }}>LUCRO PRA ACOMPANHAR</div>
            <b style={{ fontSize: 20, marginTop: 4, display: "block" }}>{brl0(lucro)}</b>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>* Estimativa ilustrativa. No {MARCA} você vê o número <b style={{ color: C.txt }}>real</b> do seu negócio — não uma média.</p>
      </div>
    </div>
  );
}

export default function SiteClient() {
  return (
    <div style={{ background: C.bg, color: C.txt, fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", animation: "bgshift 16s ease-in-out infinite", background: "radial-gradient(1100px 620px at 100% -8%, rgba(34,184,240,.16), transparent 60%), radial-gradient(900px 620px at -10% 45%, rgba(139,92,246,.12), transparent 60%)" }} />

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(16px)", background: "rgba(8,9,12,.7)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...container, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800, fontSize: 17 }}>
            <img src="/icon.svg" alt="" style={{ width: 30, height: 30, borderRadius: 8 }} />
            Minhas <span style={{ color: C.cyan }}>Métricas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={ENTRAR_URL} style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>Entrar</Link>
            <Link href={PLANOS_URL} className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "9px 16px", borderRadius: 99, boxShadow: "0 8px 20px -8px rgba(34,184,240,.6)" }}>Começar <ArrowRight size={15} /></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ ...container, position: "relative", padding: "clamp(40px,7vw,80px) 20px", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 40, alignItems: "center" }} className="site-hero">
        <Reveal>
          <span style={chip}>Para donos de pequenas e médias empresas</span>
          <h1 style={{ fontSize: "clamp(34px,6vw,58px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.05, margin: "20px 0 0" }}>
            Sua empresa não pode <span className="glow-accent" style={{ color: C.cyan }}>viver no escuro.</span>
          </h1>
          <p style={{ color: C.muted, fontSize: "clamp(16px,2.4vw,20px)", lineHeight: 1.6, margin: "20px 0 0", maxWidth: 520 }}>
            {MARCA} reúne faturamento, custos, lucro e indicadores da sua empresa num painel que se monta sozinho. Pare de decidir no achismo e veja o número <b style={{ color: C.txt }}>real</b> do seu negócio.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            <Link href={PLANOS_URL} className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "14px 26px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Testar agora <ArrowRight size={18} /></Link>
            <a href="#acao" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: C.txt, background: "rgba(255,255,255,.05)", border: `1px solid ${C.line}`, padding: "14px 26px", borderRadius: 99 }}><Play size={16} color={C.cyan} /> Ver o app em ação</a>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" }}>
            {["Pronto em minutos", "Funciona no celular", "Assistente com IA"].map((c) => (
              <span key={c} className="chip-i" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: C.txt, background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, borderRadius: 99, padding: "8px 15px" }}>
                <CheckCircle2 size={15} color={C.green} /> {c}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}><HeroStats /></Reveal>
      </section>

      {/* PARCEIROS */}
      <section style={{ ...container, padding: "8px 20px 24px" }}>
        <Reveal>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: C.muted }}>
              <Award size={15} color={C.amber} /> Empresas que confiam em nós
            </div>
            <div className="marquee" style={{ marginTop: 24 }}>
              <div className="marquee-track">
                {[...PARCEIROS, ...PARCEIROS, ...PARCEIROS, ...PARCEIROS].map((p, i) => (
                  <img key={i} src={p.src} alt={p.alt} title={p.alt} className="parc" style={{ height: p.h, width: "auto", maxWidth: 190, objectFit: "contain", flexShrink: 0 }} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* DOR */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="O problema" title="A maioria dos empresários vive no escuro" sub="Trabalha muito, fatura — mas não sabe se lucra. Você se reconhece em alguma dessas?" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          {DORES.map(({ Icon, t, d }, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, height: "100%" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.12)", color: C.red }}><Icon size={22} /></span>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "14px 0 6px" }}>{t}</h3>
                <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VEJA EM AÇÃO (demo/vídeo) */}
      <section id="acao" style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Veja em ação" title="O app rodando, de verdade" sub="Do resumo do dia à planilha mês a mês — passe pelas telas e veja como é simples." /></Reveal>
        <Reveal delay={120}>
          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,184,240,.25), transparent 65%)", filter: "blur(20px)", animation: "pulseGlow 4s ease-in-out infinite" }} />
            {DEMO_VIDEO ? (
              <video src={DEMO_VIDEO} autoPlay muted loop playsInline style={{ position: "relative", width: 300, borderRadius: 26, border: `1px solid ${C.line}`, boxShadow: "0 40px 80px -30px rgba(0,0,0,.9)" }} />
            ) : (
              <div style={{ position: "relative" }}><DemoPhone big float /></div>
            )}
          </div>
        </Reveal>
      </section>

      {/* GRÁFICOS */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Gráficos" title="Do dado ao gráfico, automático" sub="Você lança os números; o app transforma em gráficos claros na hora — sem fórmula, sem montar planilha." /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16 }}>
          <Reveal><BarsFaturamento /></Reveal>
          <Reveal delay={120}><DonutCustos /></Reveal>
        </div>
      </section>

      {/* VIRADA */}
      <section style={{ ...container, padding: "clamp(20px,4vw,44px) 20px" }}>
        <Reveal>
          <div style={{ background: "linear-gradient(135deg, rgba(34,184,240,.12), rgba(16,185,129,.08))", border: "1px solid rgba(34,184,240,.25)", borderRadius: 24, padding: "clamp(28px,5vw,48px)", textAlign: "center" }}>
            <span style={{ ...chip, color: C.green, background: "rgba(16,185,129,.1)", borderColor: "rgba(16,185,129,.25)" }}>A virada</span>
            <h2 style={{ fontSize: "clamp(24px,4.5vw,38px)", fontWeight: 900, letterSpacing: "-.02em", margin: "16px auto 0", maxWidth: 760, lineHeight: 1.15 }}>Acenda a luz do seu negócio. Todos os números num só lugar, atualizados.</h2>
            <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.6, maxWidth: 640, margin: "14px auto 0" }}>Você lança (ou importa) os dados e o {MARCA} transforma tudo em painel, gráficos, DRE e alertas. Simples o bastante pra usar toda semana.</p>
          </div>
        </Reveal>
      </section>

      {/* FEATURES */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Recursos" title="Tudo que sua empresa precisa enxergar" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>
          {FEATURES.map(({ Icon, t, d }, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, display: "flex", gap: 14, height: "100%" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(34,184,240,.12)", color: C.cyan }}><Icon size={22} /></span>
                <div><h3 style={{ fontSize: 17, fontWeight: 800, margin: "2px 0 6px" }}>{t}</h3><p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{d}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SEM x COM */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Antes e depois" title="Sua empresa sem e com o Minhas Métricas" /></Reveal>
        <div className="cmp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Reveal>
            <div style={{ background: C.card, border: "1px solid rgba(239,68,68,.22)", borderRadius: 20, padding: 26, height: "100%" }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 18px", color: "#fca5a5" }}>Sem Minhas Métricas</h3>
              <div style={{ display: "grid", gap: 14 }}>
                {SEM.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15, color: C.muted }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, background: "rgba(239,68,68,.15)", color: C.red, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}><XIcon size={13} /></span>{t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ background: "linear-gradient(160deg, rgba(34,184,240,.1), rgba(16,185,129,.06))", border: "1px solid rgba(34,184,240,.32)", borderRadius: 20, padding: 26, height: "100%", boxShadow: "0 24px 60px -30px rgba(34,184,240,.5)" }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 18px", color: C.cyan }}>Com Minhas Métricas</h3>
              <div style={{ display: "grid", gap: 14 }}>
                {COM.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15, color: C.txt }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, background: "rgba(16,185,129,.18)", color: C.green, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}><Check size={13} /></span>{t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SIMULADOR / TESTE */}
      <section style={{ ...container, padding: "clamp(20px,4vw,44px) 20px" }}>
        <Reveal><Simulador /></Reveal>
      </section>

      {/* STATS */}
      <section style={{ ...container, padding: "clamp(20px,4vw,40px) 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, textAlign: "center" }}>
          {([["1", "painel pra tudo", C.cyan], ["5 min", "pra começar", C.green], ["mês a mês", "sem planilha manual", C.violet], ["24/7", "no celular", C.amber]] as [string, string, string][]).map(([v, l, cor], i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "26px 16px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: cor }}>{v}</div>
                <div style={{ color: C.muted, fontSize: 13.5, marginTop: 4 }}>{l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Como funciona" title="Do zero ao painel em 3 passos" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          {PASSOS.map(({ n, t, d }, i) => (
            <Reveal key={n} delay={i * 80}>
              <div className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24, height: "100%" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)" }}>{n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "16px 0 6px" }}>{t}</h3>
                <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" /></Reveal>
        <Reveal delay={80}><Faq /></Reveal>
      </section>

      {/* DEPOIMENTOS */}
      <section style={{ ...container, padding: "clamp(30px,5vw,56px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Quem usa" title="Quem já saiu do escuro" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>
          {[
            { q: "Pela primeira vez eu enxergo o número real da operação sem quebrar a cabeça com planilha.", n: "Diogo Rodrigues", c: "CEO · Dynamis" },
            { q: "Acompanho meus resultados e minhas metas na palma da mão, direto do celular.", n: "João Paulo", c: "Representante comercial · Stone" },
            { q: "Agora decido no número, não no achismo. Mudou a gestão da nossa escola.", n: "Paulo Serra", c: "Colégio Araguaia" },
          ].map((t, i) => (
            <Reveal key={i} delay={i * 70}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24, height: "100%" }}>
                <div style={{ color: C.cyan, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>&ldquo;</div>
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: "6px 0 16px" }}>{t.q}</p>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: C.txt }}>{t.n}</div>
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{t.c}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ ...container, padding: "clamp(40px,6vw,80px) 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center", background: "linear-gradient(135deg, #0B2A44, #0C4A6E)", border: "1px solid rgba(34,184,240,.3)", borderRadius: 26, padding: "clamp(36px,6vw,60px)", position: "relative", overflow: "hidden" }}>
            <Rocket size={34} color={C.cyan} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: "clamp(26px,5vw,42px)", fontWeight: 900, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>Chega de gerir no escuro.</h2>
            <p style={{ color: "rgba(226,232,240,.8)", fontSize: 18, margin: "14px auto 0", maxWidth: 560, lineHeight: 1.6 }}>Comece hoje e veja o número real da sua empresa ainda esta semana.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
              <Link href={PLANOS_URL} className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "15px 30px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Quero testar <ArrowRight size={18} /></Link>
              <Link href={ENTRAR_URL} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.08)", border: `1px solid ${C.line}`, padding: "15px 30px", borderRadius: 99 }}>Já tenho conta</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...container, padding: "28px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", color: C.muted, fontSize: 13.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: C.txt }}>
            <img src="/icon.svg" alt="" style={{ width: 22, height: 22, borderRadius: 6 }} /> Minhas Métricas
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href={ENTRAR_URL} style={{ color: C.muted }}>Entrar</Link>
            <Link href={PLANOS_URL} style={{ color: C.muted }}>Planos</Link>
            <a href="#acao" style={{ color: C.muted }}>O app</a>
          </div>
          <div>© {MARCA}</div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:translateY(0)} }
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes bgshift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2.5%,2%)} }
        @keyframes drawLine { to { stroke-dashoffset: 0 } }
        @keyframes fadeArea { to { opacity: 1 } }
        @keyframes dot { to { opacity: 1 } }
        @keyframes swap { from{opacity:0; transform:translateY(10px) scale(.98)} to{opacity:1; transform:translateY(0) scale(1)} }
        @keyframes growUp { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes growX { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0 0 0)} }
        .pills-strip{ scrollbar-width:none; }
        .pills-strip::-webkit-scrollbar{ display:none; }
        @keyframes pulseGlow { 0%,100%{opacity:.45; transform:scale(1)} 50%{opacity:.85; transform:scale(1.06)} }
        .parc{ filter: brightness(0) invert(1); opacity:.5; transition: opacity .25s ease, filter .25s ease; }
        .parc:hover{ filter:none; opacity:1; }
        .marquee{ overflow:hidden; -webkit-mask:linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask:linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .marquee-track{ display:flex; align-items:center; gap: clamp(40px,7vw,88px); width:max-content; animation: marquee 26s linear infinite; }
        .marquee:hover .marquee-track{ animation-play-state: paused; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .lift{ transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
        .lift:hover{ transform: translateY(-4px); border-color: rgba(34,184,240,.35); box-shadow: 0 22px 46px -24px rgba(0,0,0,.9); }
        .cta-shine{ position:relative; overflow:hidden; }
        .cta-shine::after{ content:""; position:absolute; inset:0; background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%); transform:translateX(-120%); animation: shine 3.4s ease-in-out infinite; }
        @keyframes shine { 0%,60%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
        .chip-i{ transition: transform .2s ease, border-color .2s ease, background .2s ease; }
        .chip-i:hover{ transform: translateY(-2px); border-color: rgba(34,184,240,.4); background: rgba(34,184,240,.08); }
        .glow-accent{ animation: glowpulse 3.2s ease-in-out infinite; }
        @keyframes glowpulse { 0%,100%{ text-shadow: 0 0 0 rgba(34,184,240,0) } 50%{ text-shadow: 0 0 28px rgba(34,184,240,.55) } }
        .range{ accent-color: #22b8f0; height: 6px; cursor: pointer; }
        @media (max-width: 860px){ .site-hero{ grid-template-columns: 1fr !important; } }
        @media (max-width: 700px){ .cmp{ grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important} }
      `}</style>
    </div>
  );
}
