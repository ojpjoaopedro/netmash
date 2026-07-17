"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, LineChart, Wallet, Sparkles, Table2, BarChart3, Megaphone,
  EyeOff, HelpCircle, FolderX, AlarmClock, Coins, FileWarning,
  Check, Rocket, Play, DollarSign, TrendingUp, Award,
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
function Phone({ children, float = false, tilt = 0, big = false }: { children: React.ReactNode; float?: boolean; tilt?: number; big?: boolean }) {
  const w = big ? 288 : 246, h = big ? 528 : 452;
  return (
    <div style={{ width: w, flexShrink: 0, animation: float ? "floaty 6s ease-in-out infinite" : undefined, transform: `rotate(${tilt}deg)` }}>
      <div style={{ borderRadius: big ? 40 : 34, padding: 9, background: "linear-gradient(160deg,#23252e,#0e0f14)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.03)" }}>
        <div style={{ borderRadius: big ? 32 : 26, overflow: "hidden", background: C.bg, height: h, position: "relative" }}>
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 78, height: 18, borderRadius: 99, background: "#000", zIndex: 3 }} />
          <div style={{ padding: "26px 12px 12px", height: "100%" }}>{children}</div>
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
      <div style={{ ...miniCard, marginTop: 10 }}>
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
      <div style={{ marginTop: 8, fontSize: 7.5, color: C.muted, lineHeight: 1.5 }}>Digite os números direto, como numa planilha — os gráficos se montam sozinhos.</div>
    </div>
  );
}

/* Demo que roda sozinha (como um vídeo do app) */
const DEMO = [
  { el: (a: boolean) => <TelaFinancas animar={a} />, label: "Finanças" },
  { el: () => <TelaHome />, label: "Resumo" },
  { el: () => <TelaPlanilha />, label: "Planilha" },
];
function DemoPhone({ big = false, float = false }: { big?: boolean; float?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((v) => (v + 1) % DEMO.length), 2900); return () => clearInterval(id); }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <Phone big={big} float={float}>
        <div key={i} style={{ height: "100%", animation: "swap .55s ease" }}>{DEMO[i].el(true)}</div>
      </Phone>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
        {DEMO.map((d, k) => (
          <button key={k} onClick={() => setI(k)} style={{ cursor: "pointer", border: 0, fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 99, color: i === k ? "#fff" : C.muted, background: i === k ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "rgba(255,255,255,.05)" }}>{d.label}</button>
        ))}
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
  { src: "/parceiros/araguaia.svg", alt: "Colégio Araguaia", h: 44 },
  { src: "/parceiros/stone.png", alt: "Stone", h: 30 },
];
const PASSOS = [
  { n: "1", t: "Cadastre a empresa", d: "Nome, logo e saldo inicial. Leva 2 minutos e o painel já fica com a sua cara." },
  { n: "2", t: "Lance ou importe os dados", d: "Registre receitas e despesas, digite na planilha mês a mês ou importe uma planilha pronta." },
  { n: "3", t: "Acompanhe e decida", d: "Os indicadores, gráficos e alertas se montam sozinhos. Você enfim enxerga o negócio." },
];

export default function SiteClient() {
  return (
    <div style={{ background: C.bg, color: C.txt, fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
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
            Sua empresa não pode <span style={{ color: C.cyan }}>viver no escuro.</span>
          </h1>
          <p style={{ color: C.muted, fontSize: "clamp(16px,2.4vw,20px)", lineHeight: 1.6, margin: "20px 0 0", maxWidth: 520 }}>
            {MARCA} reúne faturamento, custos, lucro e indicadores da sua empresa num painel que se monta sozinho. Pare de decidir no achismo e veja o número <b style={{ color: C.txt }}>real</b> do seu negócio.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            <Link href={PLANOS_URL} className="cta-shine" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#22b8f0,#0c6e9e)", padding: "14px 26px", borderRadius: 99, boxShadow: "0 14px 34px -12px rgba(34,184,240,.7)" }}>Testar agora <ArrowRight size={18} /></Link>
            <a href="#acao" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: C.txt, background: "rgba(255,255,255,.05)", border: `1px solid ${C.line}`, padding: "14px 26px", borderRadius: 99 }}><Play size={16} color={C.cyan} /> Ver o app em ação</a>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 28, color: C.muted, fontSize: 13.5, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} color={C.green} /> Sem instalar nada</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} color={C.green} /> Funciona no celular</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} color={C.green} /> Pronto em minutos</span>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Phone tilt={3} float><TelaHome /></Phone>
        </div>
      </section>

      {/* PARCEIROS */}
      <section style={{ ...container, padding: "8px 20px 24px" }}>
        <Reveal>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: C.muted }}>
              <Award size={15} color={C.amber} /> Empresas que confiam em nós
            </div>
            <div style={{ display: "flex", gap: "clamp(28px,6vw,64px)", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 24 }}>
              {PARCEIROS.map((p) => (
                <img key={p.alt} src={p.src} alt={p.alt} title={p.alt} className="parc" style={{ height: p.h, width: "auto", maxWidth: 170, objectFit: "contain" }} />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* DOR */}
      <section style={{ ...container, padding: "clamp(40px,6vw,72px) 20px" }}>
        <Reveal><SectionTitle eyebrow="O problema" title="A maioria dos empresários vive no escuro" sub="Trabalha muito, fatura — mas não sabe se lucra. Você se reconhece em alguma dessas?" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
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

      {/* DEPOIMENTOS */}
      <section style={{ ...container, padding: "clamp(30px,5vw,56px) 20px" }}>
        <Reveal><SectionTitle eyebrow="Quem usa" title="Empresários que saíram do escuro" /></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          {[
            { q: "Pela primeira vez eu sei o lucro real do mês sem quebrar a cabeça com planilha.", n: "— Dono de comércio" },
            { q: "Descobri custos que estavam comendo minha margem havia meses.", n: "— Prestador de serviço" },
            { q: "Agora decido no número, não no achismo. Mudou minha rotina.", n: "— Dona de clínica" },
          ].map((t, i) => (
            <Reveal key={i} delay={i * 70}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24, height: "100%" }}>
                <div style={{ color: C.cyan, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>&ldquo;</div>
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: "6px 0 14px" }}>{t.q}</p>
                <div style={{ color: C.muted, fontSize: 13.5, fontWeight: 700 }}>{t.n}</div>
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
        @keyframes pulseGlow { 0%,100%{opacity:.45; transform:scale(1)} 50%{opacity:.85; transform:scale(1.06)} }
        .parc{ filter: brightness(0) invert(1); opacity:.5; transition: opacity .25s ease, filter .25s ease; }
        .parc:hover{ filter:none; opacity:1; }
        .lift{ transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
        .lift:hover{ transform: translateY(-4px); border-color: rgba(34,184,240,.35); box-shadow: 0 22px 46px -24px rgba(0,0,0,.9); }
        .cta-shine{ position:relative; overflow:hidden; }
        .cta-shine::after{ content:""; position:absolute; inset:0; background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%); transform:translateX(-120%); animation: shine 3.4s ease-in-out infinite; }
        @keyframes shine { 0%,60%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
        @media (max-width: 860px){ .site-hero{ grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important} }
      `}</style>
    </div>
  );
}
