"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, LineChart, Wallet, Sparkles, Table2, BarChart3,
  EyeOff, HelpCircle, FolderX, AlarmClock, Coins, FileWarning,
  Check, Rocket, TrendingUp, Award, ChevronDown, X as XIcon,
  Home, Hand, Shuffle, Compass, TriangleAlert,
  Menu, Bell, Eye, Instagram, Layers, CalendarDays, Lock, LayoutDashboard, FileText, FileSpreadsheet,
} from "lucide-react";

const ENTRAR_URL = "/login";
const MARCA = "Minhas Métricas";
const PRECO = "49,99";      // mensalidade (R$/mês)
const PRECO_DE = "97";       // preço "cheio" (âncora)
// ⚠️ TROQUE pelo link de assinatura R$ 49,99/mês quando o time gerar (Kiwify ou Stripe).
//    Hoje aponta pro link antigo — o botão funciona, mas cobra o valor antigo.
const CHECKOUT_URL = "https://pay.kiwify.com.br/ATeuhH5";
const PLANOS_URL = CHECKOUT_URL;
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

/* Telas — espelham o app real (minimalista, foco em finanças) */
const tituloTela = (t: string) => <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 8, letterSpacing: "-.01em" }}>{t}</div>;

function TelaHome() {
  return (
    <div style={{ height: "100%" }}>
      {/* top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Menu size={13} color="#79d6f7" />
        <div style={{ display: "flex", gap: 9 }}>
          <Sparkles size={12} color="#79d6f7" /><Eye size={12} color="#79d6f7" />
          <span style={{ position: "relative", display: "inline-flex" }}><Bell size={12} color="#79d6f7" /><span style={{ position: "absolute", top: -1, right: -1, width: 4, height: 4, borderRadius: 99, background: C.red }} /></span>
        </div>
      </div>
      {/* frase do dia */}
      <div style={{ ...miniCard, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 7.5, color: C.muted, fontStyle: "italic", lineHeight: 1.4 }}>“Quem não mede, não gerencia.”</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 6.5, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#f09433,#bc1888)", padding: "4px 7px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}><Instagram size={9} />Compartilhar</span>
      </div>
      {/* 3 atalhos (cards azuis brilhantes) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 8 }}>
        {([[Layers, "Painel", false], [CalendarDays, "Calendário", false], [Wallet, "Folha", true]] as [typeof Home, string, boolean][]).map(([Ic, l, lock], i) => (
          <div key={i} style={{ position: "relative", borderRadius: 12, padding: 8, minHeight: 60, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(150deg,#1AADE2,#0E8AB8)", color: "#fff", overflow: "hidden" }}>
            <span style={{ position: "absolute", right: -10, top: -10, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.18)" }} />
            <Ic size={14} style={{ position: "relative" }} />
            <b style={{ fontSize: 7.5, position: "relative" }}>{l}</b>
            {lock && <Lock size={8} style={{ position: "absolute", right: 6, bottom: 6, opacity: .9 }} />}
          </div>
        ))}
      </div>
      {/* situação das cobranças */}
      <div style={{ ...miniCard, marginTop: 8 }}>
        <div style={{ fontSize: 6.5, color: C.muted, fontWeight: 800, letterSpacing: ".06em", marginBottom: 7 }}>SITUAÇÃO DAS COBRANÇAS</div>
        <div style={{ display: "grid", gap: 6 }}>
          {([["Despesas pagas", "R$ 22k", C.green, "72%"], ["A pagar", "R$ 6k", C.amber, "20%"], ["Em atraso", "R$ 2k", C.red, "8%"]] as [string, string, string, string][]).map(([l, v, cor, w], i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6.5, marginBottom: 2 }}><span style={{ color: C.muted }}>{l}</span><b>{v}</b></div>
              <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ height: "100%", width: w, borderRadius: 4, background: cor, animation: `growX .8s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s both` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniLine({ pts, cor, max, h = 58 }: { pts: number[]; cor: string; max: number; h?: number }) {
  const W = 200, H = h;
  const x = (i: number) => 4 + (i / (pts.length - 1)) * (W - 8);
  const y = (v: number) => 6 + (1 - v / max) * (H - 14);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(0)},${y(v).toFixed(0)}`).join(" ");
  const gid = "ml" + cor.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cor} stopOpacity=".35" /><stop offset="100%" stopColor={cor} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${x(pts.length - 1)},${H - 4} L${x(0)},${H - 4} Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={cor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 6px ${cor}88)` }} />
      {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.1" fill={cor} />)}
    </svg>
  );
}

function TelaDashboard() {
  return (
    <div style={{ height: "100%" }}>
      {tituloTela("Dashboard")}
      {/* barra de meses */}
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((m, i) => (
          <span key={m} style={{ flex: 1, textAlign: "center", fontSize: 6.5, fontWeight: 800, padding: "3px 0", borderRadius: 6, color: "#fff", background: "linear-gradient(135deg,#1AADE2,#0E8AB8)" }}>{m}</span>
        ))}
      </div>
      {/* faturamento mês a mês (linha) */}
      <div style={{ ...miniCard }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 6.5, color: C.muted, fontWeight: 800, letterSpacing: ".04em" }}>FATURAMENTO MÊS A MÊS</span>
          <span style={{ fontSize: 7, fontWeight: 800, color: C.green, background: "rgba(16,185,129,.14)", padding: "2px 6px", borderRadius: 99 }}>R$ 297k</span>
        </div>
        <MiniLine pts={[40, 52, 45, 60, 56, 72]} cor="#38BDF8" max={80} h={54} />
      </div>
      {/* composição por canal */}
      <div style={{ ...miniCard, marginTop: 6 }}>
        <div style={{ fontSize: 6.5, color: C.muted, fontWeight: 700, marginBottom: 5, letterSpacing: ".04em" }}>COMPOSIÇÃO POR CANAL</div>
        {([["Comercial (B2C)", "47%", "#1AADE2"], ["Escolas (B2B)", "33%", "#8b5cf6"], ["Renovações", "20%", "#10B981"]] as [string, string, string][]).map(([l, w, cor], i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6.5, marginBottom: 2 }}><span style={{ color: C.muted, fontStyle: "italic" }}>{l}</span><b>{w}</b></div>
            <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ height: "100%", width: w, borderRadius: 4, background: cor, animation: `growX .8s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s both` }} /></div>
          </div>
        ))}
      </div>
      {/* tiles resultado / margem */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
        <div style={{ ...miniCard, background: "rgba(16,185,129,.1)", borderColor: "rgba(16,185,129,.25)" }}><div style={{ fontSize: 6, color: C.muted }}>RESULTADO</div><b style={{ fontSize: 10, color: C.green }}>R$ 13.480</b></div>
        <div style={{ ...miniCard, background: "rgba(26,173,226,.1)", borderColor: "rgba(26,173,226,.25)" }}><div style={{ fontSize: 6, color: C.muted }}>MARGEM</div><b style={{ fontSize: 10, color: C.cyan }}>18%</b></div>
      </div>
    </div>
  );
}

function TelaEstrutura() {
  return (
    <div style={{ height: "100%" }}>
      {tituloTela("Estrutura · Receitas e Custos")}
      <div style={{ ...miniCard, padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 7.5, fontWeight: 800 }}><TrendingUp size={10} color={C.green} />Composição das Receitas</span>
          <span style={{ fontSize: 7, fontWeight: 800, color: C.green, background: "rgba(16,185,129,.14)", padding: "2px 6px", borderRadius: 99 }}>R$ 297k</span>
        </div>
        {([["Comercial (B2C)", "R$ 200.740", C.cyan], ["Escolas (B2B)", "R$ 74.400", C.violet], ["Renovações", "R$ 22.653", C.green]] as [string, string, string][]).map(([l, v, cor], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 7, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
            <span style={{ color: C.muted }}><span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 99, background: cor, marginRight: 4 }} />{l}</span><b>{v}</b>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, paddingTop: 6, fontWeight: 800 }}><span>Receitas totais</span><b style={{ color: C.green }}>R$ 297.793</b></div>
      </div>
      <div style={{ marginTop: 6, borderRadius: 12, padding: 10, background: "linear-gradient(135deg,rgba(139,92,246,.2),rgba(139,92,246,.06))", border: "1px solid rgba(139,92,246,.3)" }}>
        <div style={{ fontSize: 6.5, color: C.muted, fontWeight: 800, letterSpacing: ".06em" }}>RESULTADO · EBITDA · MARGEM</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 7 }}>
          {([["Resultado", "R$ 42k"], ["EBITDA", "R$ 51k"], ["Margem", "18%"]] as [string, string][]).map(([l, v], i) => (
            <div key={i}><div style={{ fontSize: 6, color: C.muted }}>{l}</div><b style={{ fontSize: 10, color: C.violet }}>{v}</b></div>
          ))}
        </div>
      </div>
    </div>
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
function TelaAnalises() {
  const itens: [typeof Home, string, string][] = [
    [LineChart, "Gráficos", "Por categoria e por vencimento"],
    [FileText, "Gerar DRE", "Reduzida ou completa, pronta p/ PDF"],
    [BarChart3, "Receita x Custos", "Lucro, margem e EBITDA"],
    [FileSpreadsheet, "Exportar planilha", "Estrutura completa em Excel"],
  ];
  return (
    <div style={{ height: "100%" }}>
      {tituloTela("Análise financeira")}
      <div style={{ fontSize: 7, color: C.muted, fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>Acompanhe suas informações financeiras num só lugar.</div>
      <div style={{ ...miniCard, padding: 6 }}>
        {itens.map(([Ic, t, d], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: i < itens.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "rgba(255,255,255,.05)", color: C.cyan, flexShrink: 0 }}><Ic size={12} /></span>
            <div style={{ minWidth: 0 }}><b style={{ fontSize: 8 }}>{t}</b><div style={{ fontSize: 6.5, color: C.muted }}>{d}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
function TelaFolha() {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <span style={{ width: 18, height: 18, borderRadius: 6, display: "grid", placeItems: "center", background: "rgba(26,173,226,.15)" }}><Wallet size={11} color={C.cyan} /></span>
        <b style={{ fontSize: 9, fontWeight: 800 }}>Folha de pagamento</b>
        <Lock size={9} color={C.amber} style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ ...miniCard, padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 4, fontSize: 6, color: C.muted, fontWeight: 700, paddingBottom: 4, borderBottom: `1px solid ${C.line}` }}>
          <span>Funcionário</span><span style={{ textAlign: "right" }}>Bruto</span><span style={{ textAlign: "right" }}>Líquido</span>
        </div>
        {([["Ana Souza", "R$ 3.200", "R$ 2.784"], ["Bruno Lima", "R$ 4.500", "R$ 3.870"], ["Carla Dias", "R$ 2.800", "R$ 2.450"]] as [string, string, string][]).map(([n, b, l], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 4, fontSize: 6.5, padding: "5px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <span>{n}</span><span style={{ textAlign: "right", color: C.muted }}>{b}</span><span style={{ textAlign: "right", color: C.green }}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
        <div style={miniCard}><div style={{ fontSize: 6, color: C.muted }}>LÍQUIDO A PAGAR</div><b style={{ fontSize: 9, color: C.green }}>R$ 9.104</b></div>
        <div style={miniCard}><div style={{ fontSize: 6, color: C.muted }}>ENCARGOS</div><b style={{ fontSize: 9, color: C.cyan }}>R$ 3.240</b></div>
        <div style={{ ...miniCard, gridColumn: "1 / 3" }}><div style={{ fontSize: 6, color: C.muted }}>CUSTO TOTAL DA FOLHA</div><b style={{ fontSize: 10, color: C.cyan }}>R$ 13.740</b></div>
      </div>
    </div>
  );
}
function TelaAssistente() {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {["Apresentação", "Perguntar", "Registrar"].map((m, i) => (
          <span key={m} style={{ flex: 1, textAlign: "center", fontSize: 6.5, fontWeight: 800, padding: "4px 0", borderRadius: 7, color: i === 1 ? "#06222e" : C.muted, background: i === 1 ? C.cyan : "rgba(255,255,255,.05)" }}>{m}</span>
        ))}
      </div>
      <div style={{ display: "flex", marginBottom: 6 }}><div style={{ ...miniCard, fontSize: 8, padding: 8, maxWidth: "88%", lineHeight: 1.5 }}>Oi, João! 👋 Sou seu assistente. Eu respondo sobre os seus números.</div></div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><div style={{ background: C.cyan, color: "#06222e", fontSize: 8, padding: "6px 9px", borderRadius: "10px 10px 2px 10px", maxWidth: "80%", fontWeight: 600 }}>Como está meu caixa?</div></div>
      <div style={{ display: "flex", marginBottom: 8 }}><div style={{ ...miniCard, padding: 9, maxWidth: "90%" }}>
        <div style={{ fontSize: 6.5, color: C.muted, fontWeight: 700 }}>CAIXA DO MÊS</div>
        <b style={{ fontSize: 15, color: C.green }}>+ R$ 42.180</b>
        <div style={{ fontSize: 7.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>Margem 18%. ⚠️ 3 contas vencem esta semana.</div>
      </div></div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{["Quanto gastei?", "Vou fechar no azul?"].map((c) => <span key={c} style={{ fontSize: 6.5, color: C.cyan, border: `1px solid ${C.line}`, borderRadius: 99, padding: "3px 8px" }}>{c}</span>)}</div>
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
  const rec = [4, 11, 20], desp = [7, 15, 26], fer = [9];
  return (
    <div style={{ height: "100%" }}>
      {tituloTela("Calendário financeiro")}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 6.5, color: C.muted }}>
        {([["Despesa", C.red], ["Receita", C.green], ["Feriado", C.amber]] as [string, string][]).map(([l, cor]) => (
          <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ width: 5, height: 5, borderRadius: 99, background: cor }} />{l}</span>
        ))}
      </div>
      <div style={{ ...miniCard, padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <b style={{ fontSize: 8 }}>Julho</b>
          <div style={{ display: "flex", gap: 6, fontSize: 6.5 }}><span style={{ color: C.red }}>Saídas R$ 12k</span><span style={{ color: C.green }}>Entradas R$ 30k</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i} style={{ fontSize: 5.5, color: C.muted, textAlign: "center", fontWeight: 700 }}>{d}</span>)}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
            const cor = rec.includes(d) ? C.green : desp.includes(d) ? C.red : fer.includes(d) ? C.amber : null;
            return <span key={d} style={{ fontSize: 6, textAlign: "center", padding: "2px 0", borderRadius: 4, color: cor ? "#fff" : C.muted, fontWeight: cor ? 800 : 400, background: cor || "transparent" }}>{d}</span>;
          })}
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 6.5, color: C.muted, lineHeight: 1.5 }}>Contas a pagar e a receber, com aviso antes de cada vencimento.</div>
    </div>
  );
}

/* Demo que roda sozinha (como um vídeo do app) — espelha as telas reais */
const DEMO: { el: (a?: boolean) => React.ReactElement; label: string }[] = [
  { el: () => <TelaHome />, label: "Home" },
  { el: () => <TelaDashboard />, label: "Dashboard" },
  { el: () => <TelaEstrutura />, label: "Estrutura" },
  { el: () => <TelaDRE />, label: "DRE" },
  { el: () => <TelaAnalises />, label: "Análises" },
  { el: () => <TelaCalendario />, label: "Calendário" },
  { el: () => <TelaFolha />, label: "Folha" },
  { el: () => <TelaAssistente />, label: "IA" },
];
// barra inferior do celular = os 3 itens reais do app (Home · Dashboard · Análises)
const NAV_ITENS: { idx: number; Icon: typeof Home; label: string }[] = [
  { idx: 0, Icon: Home, label: "Home" },
  { idx: 1, Icon: LayoutDashboard, label: "Dashboard" },
  { idx: 4, Icon: FileText, label: "Análises" },
];
function DemoPhone({ big = false, float = false }: { big?: boolean; float?: boolean }) {
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (manual) return;
    const id = setInterval(() => setI((v) => (v + 1) % DEMO.length), 2900);
    return () => clearInterval(id);
  }, [manual]);
  useEffect(() => {
    const strip = stripRef.current;
    const container = strip?.parentElement as HTMLElement | null;
    const btn = strip?.children[i] as HTMLElement | undefined;
    if (!strip || !container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    // rola apenas a faixa na horizontal — nunca a página
    container.scrollBy({ left: (bRect.left + bRect.width / 2) - (cRect.left + cRect.width / 2), behavior: "smooth" });
  }, [i]);
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
        <div ref={stripRef} style={{ display: "flex", gap: 6, width: "max-content", padding: "0 44px 4px" }}>
          {DEMO.map((d, k) => (
            <button key={k} onClick={() => ir(k)} style={{ flexShrink: 0, cursor: "pointer", border: 0, fontSize: 11.5, fontWeight: 700, padding: "6px 13px", borderRadius: 99, color: i === k ? "#fff" : C.muted, background: i === k ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "rgba(255,255,255,.05)", transform: i === k ? "scale(1.1)" : "scale(1)", boxShadow: i === k ? "0 6px 18px -4px rgba(34,184,240,.75)" : "none", transition: "all .3s cubic-bezier(.2,.9,.3,1)" }}>{d.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Botão que rola suave até a seção do plano (#planos) */
function CtaPlano({ texto = "Assinar agora", sub }: { texto?: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: 34 }}>
      <a href="#planos" className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16.5, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "15px 32px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>{texto} <ArrowRight size={18} /></a>
      {sub && <div style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>{sub}</div>}
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
  { Icon: EyeOff, t: "Não sabe o lucro real", d: "Olha o saldo do banco e acha que está tudo bem, mas o dinheiro ali já tem dono." },
  { Icon: HelpCircle, t: "Decide no achismo", d: "Sem número na mão, cada decisão de preço, contratação ou corte é um chute." },
  { Icon: FolderX, t: "Dados espalhados", d: "Uma planilha aqui, um caderno ali, o extrato no banco, e nada conversa entre si." },
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
  { Icon: TrendingUp, t: "Projeção & alertas de caixa", d: "Antecipe os próximos meses e receba aviso antes do caixa ficar no vermelho." },
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
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);
  const box: React.CSSProperties = { background: "rgba(255,255,255,.03)", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 };
  const head = (icon: React.ReactNode, titulo: string, sub: string, badge: string, cor: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: cor + "22", color: cor }}>{icon}</span>
        <div><b style={{ fontSize: 14 }}>{titulo}</b><div style={{ fontSize: 11.5, color: C.muted }}>{sub}</div></div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color: cor, background: cor + "1f", border: `1px solid ${cor}44`, borderRadius: 99, padding: "4px 10px" }}>{badge}</span>
    </div>
  );
  const PAN: { label: string; el: React.ReactNode }[] = [
    { label: "Faturamento", el: (<>
      {head(<TrendingUp size={20} />, "Faturamento do ano", "Atualiza sozinho", "YTD", C.cyan)}
      <div style={{ fontSize: "clamp(34px,6vw,46px)", fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1 }}>R$ <CountUp to={297} />k</div>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.06)", marginTop: 14, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#22b8f0,#0c6e9e)", width: "68%", animation: "growX 1.3s cubic-bezier(.2,.8,.2,1)" }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: C.muted }}><span>Meta R$ 700k</span><b style={{ color: C.txt }}>68%</b></div>
      <div style={{ ...box, marginTop: 14 }}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 8 }}>MÊS A MÊS</div><MiniBars vals={[40, 48, 39, 43, 56, 71]} cor={C.cyan} h={62} /></div>
    </>) },
    { label: "Custos", el: (<>
      {head(<Wallet size={20} />, "Para onde vai o dinheiro", "Composição de custos", "Julho", C.red)}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 116, height: 116, flexShrink: 0, borderRadius: "50%", position: "relative", background: `conic-gradient(${C.cyan} 0% 38%, ${C.violet} 38% 62%, ${C.amber} 62% 80%, ${C.green} 80% 92%, #64748B 92% 100%)`, animation: "spinIn .8s ease" }}><div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "#0d1017" }} /></div>
        <div style={{ display: "grid", gap: 8, flex: 1 }}>
          {([["Folha", "38%", C.cyan], ["Fornecedores", "24%", C.violet], ["Marketing", "18%", C.amber], ["Impostos", "12%", C.green], ["Outros", "8%", "#64748B"]] as [string, string, string][]).map(([l, p, c], k) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: c }} /><span style={{ color: C.muted, flex: 1 }}>{l}</span><b>{p}</b></div>)}
        </div>
      </div>
      <div style={{ ...box, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: C.muted }}>Custos totais no mês</span><b style={{ fontSize: 16, color: C.red }}>R$ 30.000</b></div>
    </>) },
    { label: "DRE", el: (<>
      {head(<LineChart size={20} />, "DRE do mês", "Receitas − Custos", "Julho", C.green)}
      <div style={{ ...box, display: "grid", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.muted }}>Receitas</span><b style={{ color: C.green }}>R$ 72.000</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.muted }}>Custos totais</span><b style={{ color: C.red }}>− R$ 30.000</b></div>
        <div style={{ height: 9, borderRadius: 5, overflow: "hidden", display: "flex", background: "rgba(255,255,255,.05)" }}><div style={{ width: "58%", background: "linear-gradient(90deg,#f43f5e,#e11d48)", animation: "growX 1s ease" }} /><div style={{ width: "42%", background: "linear-gradient(90deg,#10b981,#059669)", animation: "growX 1s ease .2s both" }} /></div>
      </div>
      <div style={{ marginTop: 12, borderRadius: 14, padding: 16, background: "linear-gradient(135deg,#059669,#047857)", color: "#fff" }}><div style={{ fontSize: 10, opacity: .9, fontWeight: 700 }}>RESULTADO DO MÊS</div><b style={{ fontSize: 26 }}>+ R$ 42.000</b><div style={{ fontSize: 11, opacity: .9 }}>Margem líquida 18,4%</div></div>
    </>) },
    { label: "Projeção", el: (<>
      {head(<TrendingUp size={20} />, "Projeção de caixa", "Próximos meses", "Alerta", C.amber)}
      <div style={{ ...box }}>
        <svg viewBox="0 0 300 120" width="100%" style={{ display: "block" }}>
          <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity=".35" /><stop offset="100%" stopColor={C.cyan} stopOpacity="0" /></linearGradient></defs>
          <line x1="0" y1="92" x2="300" y2="92" stroke={C.red} strokeWidth="1.5" strokeDasharray="5 5" opacity=".7" />
          <path d="M4,50 L64,42 L124,56 L184,34 L244,74 L296,98" fill="none" stroke={C.cyan} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 8px ${C.cyan}88)` }} />
          <path d="M4,50 L64,42 L124,56 L184,34 L244,74 L296,98 L296,116 L4,116 Z" fill="url(#pg)" />
        </svg>
      </div>
      <div style={{ ...box, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: C.muted }}>Caixa projetado (set.)</span><b style={{ fontSize: 16, color: C.amber }}>Atenção: aperta</b></div>
    </>) },
  ];
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (manual) return; const id = setInterval(() => setI((v) => (v + 1) % PAN.length), 3400); return () => clearInterval(id); }, [manual, PAN.length]);
  useEffect(() => {
    const strip = stripRef.current;
    const container = strip?.parentElement as HTMLElement | null;
    const btn = strip?.children[i] as HTMLElement | undefined;
    if (!strip || !container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    // rola apenas a faixa na horizontal — nunca a página
    container.scrollBy({ left: (bRect.left + bRect.width / 2) - (cRect.left + cRect.width / 2), behavior: "smooth" });
  }, [i]);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...heroCard, minHeight: 340 }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,184,240,.22), transparent 60%)", animation: "pulseGlow 4s ease-in-out infinite", pointerEvents: "none" }} />
        <div key={i} style={{ position: "relative", animation: "swap .5s ease" }}>{PAN[i].el}</div>
      </div>
      <div className="pills-strip" style={{ overflowX: "auto" }}>
        <div ref={stripRef} style={{ display: "flex", gap: 6, width: "max-content", padding: "0 44px 4px" }}>
          {PAN.map((p, k) => <button key={k} onClick={() => { setI(k); setManual(true); }} style={{ flexShrink: 0, cursor: "pointer", border: 0, fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 99, color: i === k ? "#fff" : C.muted, background: i === k ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "rgba(255,255,255,.05)", transform: i === k ? "scale(1.1)" : "scale(1)", boxShadow: i === k ? "0 6px 18px -4px rgba(34,184,240,.75)" : "none", transition: "all .3s cubic-bezier(.2,.9,.3,1)" }}>{p.label}</button>)}
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
  { q: "Preciso entender de finanças pra usar?", a: "Não. Você lança receitas e despesas (ou importa uma planilha) e o app monta os gráficos, o DRE e os indicadores sozinho, em linguagem simples." },
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
        <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>Arraste e veja o tamanho do que você deveria estar acompanhando de perto, todo mês.</p>
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
        <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>* Estimativa ilustrativa. No {MARCA} você vê o número <b style={{ color: C.txt }}>real</b> do seu negócio, não uma média.</p>
      </div>
    </div>
  );
}

export default function VendaClient() {
  return (
    <div style={{ background: C.bg, color: C.txt, fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", animation: "bgshift 16s ease-in-out infinite", background: "radial-gradient(1100px 620px at 100% -8%, rgba(34,184,240,.16), transparent 60%), radial-gradient(900px 620px at -10% 45%, rgba(139,92,246,.12), transparent 60%)" }} />

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(16px)", background: "rgba(8,9,12,.7)", borderBottom: `1px solid ${C.line}` }}>
        <div className="site-nav" style={{ ...container, display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div className="nav-logo" style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800, fontSize: 17 }}>
            <img src="/icon.svg" alt="" style={{ width: 28, height: 28, borderRadius: 8 }} />
            Minhas <span style={{ color: C.cyan }}>Métricas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={ENTRAR_URL} className="nav-entrar" style={{ fontSize: 14, fontWeight: 700, color: C.muted, padding: "9px 6px" }}>Entrar</Link>
            <a href={CHECKOUT_URL} data-checkout className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "9px 18px", borderRadius: 99, boxShadow: "0 8px 20px -8px rgba(34,184,240,.6)" }}>Assinar <ArrowRight size={15} /></a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ ...container, position: "relative", padding: "clamp(40px,7vw,80px) 20px", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 40, alignItems: "center" }} className="site-hero">
        <Reveal>
          <span style={chip}>Para pequenas e médias empresas</span>
          <h1 style={{ fontSize: "clamp(34px,6vw,58px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.05, margin: "18px 0 0" }}>
            Sua empresa não pode viver <span className="dark-light" style={{ color: C.cyan }}>no escuro.</span>
          </h1>
          <p style={{ color: C.muted, fontSize: "clamp(16px,2.4vw,20px)", lineHeight: 1.6, margin: "18px 0 0", maxWidth: 500 }}>
            Faturamento, custos e lucro num painel que se monta sozinho. Chega de decidir no achismo. <br /><b style={{ color: C.txt }}>Veja o número real do seu negócio.</b>
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <a href="#planos" className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16.5, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "15px 30px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Assinar por R$ {PRECO}/mês <ArrowRight size={18} /></a>
            <a href="#acao" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: C.txt, background: "rgba(255,255,255,.06)", border: `1px solid ${C.line}`, padding: "14px 26px", borderRadius: 99 }}>Ver o app</a>
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
        <Reveal><SectionTitle eyebrow="O problema" title="A maioria dos empresários vive no escuro" sub="Trabalha muito, fatura, mas não sabe se lucra. Você se reconhece em alguma dessas?" /></Reveal>
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

      {/* DADOS DO MERCADO */}
      <section style={{ ...container, padding: "clamp(30px,5vw,60px) 20px" }}>
        <Reveal>
          <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,.12), rgba(245,158,11,.06))", border: "1px solid rgba(239,68,68,.22)", borderRadius: 24, padding: "clamp(28px,4vw,44px)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "clamp(20px,4vw,44px)", alignItems: "center" }} className="cmp">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(56px,11vw,96px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1, color: C.red }}><CountUp to={50} suffix="%" /></div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted, marginTop: 6 }}>das empresas que abrem fecham em até 5 anos</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Fonte: Sebrae</div>
            </div>
            <div>
              <span style={{ ...chip, color: C.amber, background: "rgba(245,158,11,.1)", borderColor: "rgba(245,158,11,.28)" }}><TriangleAlert size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Dados do mercado</span>
              <h2 style={{ fontSize: "clamp(22px,3.6vw,32px)", fontWeight: 900, letterSpacing: "-.02em", margin: "14px 0 0", lineHeight: 1.2 }}>Empresas não quebram por falta de lucro. <span style={{ color: C.cyan }}>Quebram por falta de gestão.</span></h2>
              <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.6, margin: "12px 0 0" }}>A má gestão financeira, a falta de planejamento e a mistura entre contas pessoais e da empresa criam um efeito bola de neve. É por isso que metade dos pequenos negócios não passa dos 5 anos.</p>
            </div>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16, marginTop: 16 }}>
          {([
            { Icon: Coins, t: "Sem fluxo de caixa", d: "Não registrar o que entra e sai deixa a empresa sem capital de giro para pagar fornecedores e funcionários.", s: "Entradas, saídas e saldo sempre atualizados." },
            { Icon: Shuffle, t: "Contas misturadas", d: "Tirar dinheiro do caixa da empresa para despesa pessoal mascara a lucratividade real do negócio.", s: "Você enxerga o resultado real, separado." },
            { Icon: Compass, t: "Decisão no achismo", d: "Sem estudar mercado, concorrência e público, cada decisão vira um chute, não um plano.", s: "Indicadores e metas para decidir com dados." },
          ]).map(({ Icon, t, d, s }, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="lift" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, height: "100%" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.12)", color: C.amber }}><Icon size={22} /></span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "14px 0 6px" }}>{t}</h3>
                <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.55, margin: 0 }}>{d}</p>
                <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.txt }}>
                  <Check size={15} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} /><span><b style={{ color: C.green }}>No app:</b> {s}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VEJA EM AÇÃO (demo/vídeo) */}
      <section id="acao" style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Veja em ação" title="O app rodando, de verdade" sub="Da Home ao DRE, passe pelas telas e veja como o painel se monta sozinho." /></Reveal>
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
        <Reveal><CtaPlano texto="Quero esse painel na minha empresa" sub={`A partir de R$ ${PRECO}/mês · cancele quando quiser`} /></Reveal>
      </section>

      {/* GRÁFICOS */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Gráficos" title="Do dado ao gráfico, automático" sub="Você lança os números; o app transforma em gráficos claros na hora, sem fórmula, sem montar planilha." /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16 }}>
          <Reveal><BarsFaturamento /></Reveal>
          <Reveal delay={120}><DonutCustos /></Reveal>
        </div>
        <Reveal><CtaPlano texto={`Assinar por R$ ${PRECO}/mês`} /></Reveal>
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
        <Reveal><div style={{ textAlign: "center", marginBottom: 36 }}><span style={chip}>Antes e depois</span></div></Reveal>
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
        <Reveal><CtaPlano texto="Ver o plano e assinar" sub="Menos de R$ 1,70 por dia pra ter o controle da sua empresa" /></Reveal>
      </section>

      {/* STATS */}
      <section style={{ ...container, padding: "clamp(20px,4vw,40px) 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "clamp(8px,2vw,16px)", textAlign: "center" }}>
          {([["1", "painel pra tudo", C.cyan], ["5 min", "pra começar", C.green], ["Mensal", "sem planilha", C.violet], ["24/7", "no celular", C.amber]] as [string, string, string][]).map(([v, l, cor], i) => (
            <Reveal key={i} delay={i * 70} style={{ height: "100%" }}>
              <div className="lift" style={{ height: "100%", minHeight: 104, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "clamp(12px,3vw,24px) 6px" }}>
                <div style={{ fontSize: "clamp(17px,4.6vw,30px)", fontWeight: 900, color: cor, lineHeight: 1.05 }}>{v}</div>
                <div style={{ color: C.muted, fontSize: "clamp(9px,2.3vw,13.5px)", marginTop: 5, lineHeight: 1.3 }}>{l}</div>
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

      {/* PLANO / PREÇO */}
      <section id="planos" style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Plano único" title="Tudo liberado por um preço só" sub="Sem pacotes confusos. Você assina e usa todos os painéis, no celular e no PC." /></Reveal>
        <Reveal delay={100}>
          <div style={{ maxWidth: 520, margin: "0 auto", background: C.card, border: "1px solid rgba(34,184,240,.35)", borderRadius: 24, padding: "clamp(28px,5vw,40px)", boxShadow: "0 30px 80px -40px rgba(34,184,240,.5)" }}>
            <div style={{ textAlign: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 22, marginBottom: 22 }}>
              <span style={{ ...chip, color: C.green, background: "rgba(16,185,129,.1)", borderColor: "rgba(16,185,129,.25)" }}><Rocket size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Oferta de lançamento</span>
              <div style={{ color: C.muted, fontSize: 15, marginTop: 14 }}>de <s style={{ color: "#e08a8a" }}>R$ {PRECO_DE}/mês</s> por apenas</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.muted }}>R$</span>
                <b style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1 }}>{PRECO}</b>
                <span style={{ fontSize: 18, color: C.muted, fontWeight: 700 }}>/mês</span>
              </div>
              <p style={{ color: C.muted, fontSize: 14, marginTop: 10 }}>Cancele quando quiser · acesso imediato</p>
            </div>
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              {["Todos os painéis financeiros (Dashboard, DRE, fluxo de caixa)", "Planilha mês a mês e indicadores com metas", "Projeção de caixa e alertas de vencimento", "Assistente inteligente e relatórios em PDF", "Sua logo e identidade (white-label)", "Acesso para a sua equipe, com permissões"].map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.45 }}>
                  <Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />{item}
                </div>
              ))}
            </div>
            <a href={CHECKOUT_URL} data-checkout className="cta-shine" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "16px 30px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Assinar agora <ArrowRight size={18} /></a>
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: C.muted, fontSize: 13, marginTop: 16, textAlign: "center" }}><Check size={14} color={C.green} /> Garantia de 7 dias — não gostou, devolvemos o seu dinheiro.</p>
          </div>
        </Reveal>
      </section>

      {/* CTA FINAL */}
      <section style={{ ...container, padding: "clamp(40px,6vw,80px) 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center", background: "linear-gradient(135deg, #0B2A44, #0C4A6E)", border: "1px solid rgba(34,184,240,.3)", borderRadius: 26, padding: "clamp(36px,6vw,60px)", position: "relative", overflow: "hidden" }}>
            <Rocket size={34} color={C.cyan} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: "clamp(26px,5vw,42px)", fontWeight: 900, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>Chega de gerir no escuro.</h2>
            <p style={{ color: "rgba(226,232,240,.8)", fontSize: 18, margin: "14px auto 0", maxWidth: 560, lineHeight: 1.6 }}>Comece hoje e veja o número real da sua empresa ainda esta semana.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
              <a href={CHECKOUT_URL} data-checkout className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "15px 30px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Assinar por R$ {PRECO}/mês <ArrowRight size={18} /></a>
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
            <a href="#acao" style={{ color: C.muted }}>O app</a>
            <Link href={ENTRAR_URL} style={{ color: C.muted }}>Entrar</Link>
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
        @keyframes spinIn { from{transform:rotate(-50deg); opacity:0} to{transform:rotate(0); opacity:1} }
        .pills-strip{ scrollbar-width:none; -webkit-mask:linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask:linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
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
        .dark-light{ animation: darkToLight 3.6s ease-in-out infinite; }
        @keyframes darkToLight { 0%,100%{ color:#24404a; text-shadow:none } 50%{ color:#22B8F0; text-shadow:0 0 34px rgba(34,184,240,.7) } }
        .range{ accent-color: #22b8f0; height: 6px; cursor: pointer; }
        html{ scroll-behavior: smooth; scroll-padding-top: 72px; }
        @media (max-width: 860px){ .site-hero{ grid-template-columns: 1fr !important; gap: 30px !important; } }
        @media (max-width: 700px){ .cmp{ grid-template-columns: 1fr !important; } }
        @media (max-width: 430px){ .nav-entrar{ display: none; } .nav-logo{ font-size: 15px; } }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important} }
      `}</style>
    </div>
  );
}
