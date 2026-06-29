"use client";
import { useState, useEffect, useRef } from "react";
import {
  Building2, ListChecks, Sparkles, LayoutDashboard, Receipt, CalendarClock,
  Contact, TrendingUp, Users, FileText, Smartphone, Monitor, ArrowRight, type LucideIcon,
} from "lucide-react";

type Item = { icon: LucideIcon; cor: string; t: string; d: string };
type Slide =
  | { tipo: "intro" }
  | { tipo: "passo"; n: number; icon: LucideIcon; cor: string; t: string; d: string }
  | { tipo: "grupo"; titulo: string; itens: Item[] }
  | { tipo: "device" }
  | { tipo: "pwa" }
  | { tipo: "final" };

const SLIDES: Slide[] = [
  { tipo: "intro" },
  { tipo: "passo", n: 1, icon: Building2, cor: "#1AADE2", t: "Configure sua empresa", d: "Em “Empresa”, coloque o nome e a sua logo. O app fica com a sua identidade." },
  { tipo: "passo", n: 2, icon: ListChecks, cor: "#10B981", t: "Lance ou importe seus dados", d: "Registre o que entra e o que sai — ou suba sua planilha. Os gráficos se montam sozinhos." },
  { tipo: "passo", n: 3, icon: Sparkles, cor: "#F59E0B", t: "Acompanhe e decida", d: "Veja lucro, caixa e clientes todo dia, e use o Assistente pra saber o que priorizar." },
  { tipo: "grupo", titulo: "Seu dinheiro no controle", itens: [
    { icon: LayoutDashboard, cor: "#1AADE2", t: "Dashboard", d: "Sua visão geral: faturamento, lucro e caixa." },
    { icon: ListChecks, cor: "#10B981", t: "Lançamentos", d: "Registre cada receita e despesa do dia a dia." },
    { icon: Receipt, cor: "#F59E0B", t: "Custos & Despesas", d: "Custos fixos e folha, com um clique." },
  ] },
  { tipo: "grupo", titulo: "Clientes e o futuro do caixa", itens: [
    { icon: CalendarClock, cor: "#8b5cf6", t: "Contas a pagar/receber", d: "Tudo que vence, com aviso na hora certa." },
    { icon: Contact, cor: "#1AADE2", t: "Clientes & Vendas", d: "Cadastre clientes e registre vendas." },
    { icon: TrendingUp, cor: "#10B981", t: "Projeção de caixa", d: "Pra onde seu caixa vai nos próximos 6 meses." },
  ] },
  { tipo: "grupo", titulo: "Inteligência, equipe e relatórios", itens: [
    { icon: Sparkles, cor: "#F59E0B", t: "Assistente", d: "Pergunte e tenha a resposta na hora." },
    { icon: Users, cor: "#8b5cf6", t: "Equipe & folha", d: "Funcionários, salários e custo da folha." },
    { icon: FileText, cor: "#ff6b9d", t: "Relatórios & PDF", d: "Gere uma apresentação profissional." },
  ] },
  { tipo: "device" },
  { tipo: "pwa" },
  { tipo: "final" },
];

export default function Guia() {
  const N = SLIDES.length;
  const [i, setI] = useState(0);
  const clamp = (x: number) => Math.max(0, Math.min(N - 1, x));
  const next = () => setI((v) => clamp(v + 1));
  const prev = () => setI((v) => clamp(v - 1));
  const sx = useRef(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="gu"
      onTouchStart={(e) => { sx.current = e.changedTouches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - sx.current; if (dx < -40) next(); else if (dx > 40) prev(); }}>
      <style>{CSS}</style>

      <div className="gu-top">
        <span className="gu-logo">Minha Empresa</span>
        <a className="gu-skip" href="/minhasmetricas">Pular ✕</a>
      </div>

      <div className="gu-viewport">
        <div className="gu-track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {SLIDES.map((s, k) => <div className="gu-slide" key={k}><div className="gu-inner">{render(s)}</div></div>)}
        </div>
      </div>

      <div className="gu-nav">
        {i > 0 ? <button className="gu-prev" onClick={prev}>‹ Voltar</button> : <span style={{ width: 90 }} />}
        <div className="gu-dots">
          {SLIDES.map((_, k) => <span key={k} className={"gu-dot" + (k === i ? " on" : "")} onClick={() => setI(k)} />)}
        </div>
        {i < N - 1
          ? <button className="gu-next" onClick={next}>Próximo →</button>
          : <a className="gu-next" href="/minhasmetricas">Entrar →</a>}
      </div>
    </div>
  );
}

function render(s: Slide) {
  if (s.tipo === "intro") return (
    <>
      <div className="gu-emoji">👋</div>
      <h2>Seja bem-vindo!</h2>
      <p>Vamos te mostrar como usar o app em poucos passos. É rápido e simples.</p>
      <div className="gu-hint">Deslize pro lado pra continuar →</div>
    </>
  );
  if (s.tipo === "passo") {
    const Ic = s.icon;
    return (
      <>
        <span className="gu-eyebrow">Passo {s.n} de 3</span>
        <span className="gu-ico" style={{ background: `${s.cor}22`, color: s.cor }}><Ic size={40} /></span>
        <h2>{s.t}</h2>
        <p>{s.d}</p>
      </>
    );
  }
  if (s.tipo === "grupo") return (
    <>
      <span className="gu-eyebrow">O que você encontra</span>
      <h2 style={{ marginBottom: 6 }}>{s.titulo}</h2>
      <div style={{ marginTop: 18 }}>
        {s.itens.map((it) => {
          const Ic = it.icon;
          return (
            <div className="gu-mini" key={it.t}>
              <span className="mi" style={{ background: `${it.cor}22`, color: it.cor }}><Ic size={22} /></span>
              <div><b>{it.t}</b><small>{it.d}</small></div>
            </div>
          );
        })}
      </div>
    </>
  );
  if (s.tipo === "device") return (
    <>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 22 }}>
        <span className="gu-ico" style={{ background: "#1AADE222", color: "#1AADE2", margin: 0 }}><Smartphone size={36} /></span>
        <span className="gu-ico" style={{ background: "#10B98122", color: "#10B981", margin: 0 }}><Monitor size={36} /></span>
      </div>
      <h2>No celular ou no computador</h2>
      <p>É o mesmo app nos dois. No computador, o menu fica à esquerda. No celular, toque no menu ☰ no topo — e as métricas ficam na barra de baixo. Tudo sincroniza sozinho.</p>
      <p style={{ fontSize: 15, color: "#9aa0a6" }}>Lance pelo celular no balcão e confira o relatório no PC. Seus dados ficam salvos e protegidos.</p>
    </>
  );
  if (s.tipo === "pwa") return (
    <>
      <div className="gu-emoji">📲</div>
      <h2>Coloque o app na tela do celular</h2>
      <p style={{ marginBottom: 8 }}>Vira um ícone e abre em tela cheia, igual a um aplicativo. Leva 10 segundos.</p>
      <div className="gu-pwa2">
        <div className="gu-pwacard">
          <b> iPhone (Safari)</b>
          <ol>
            <li>Toque no botão <b>Compartilhar</b> (quadradinho com seta ⬆️, embaixo).</li>
            <li>Escolha <b>“Adicionar à Tela de Início”</b>.</li>
            <li>Toque em <b>Adicionar</b>. ✅</li>
          </ol>
        </div>
        <div className="gu-pwacard">
          <b>🤖 Android (Chrome)</b>
          <ol>
            <li>Toque no menu <b>⋮</b> (canto superior direito).</li>
            <li>Toque em <b>“Adicionar à tela inicial”</b> ou <b>“Instalar app”</b>.</li>
            <li>Confirme. ✅</li>
          </ol>
        </div>
      </div>
    </>
  );
  // final
  return (
    <>
      <div className="gu-emoji">🚀</div>
      <h2>Tudo pronto!</h2>
      <p>Entre no seu painel e configure sua empresa. Em poucos minutos você já vê o resultado do seu negócio.</p>
      <a className="gu-cta" href="/minhasmetricas">Entrar no painel <ArrowRight size={18} /></a>
    </>
  );
}

const CSS = `
.gu{position:fixed;inset:0;background:radial-gradient(900px 520px at 80% -10%,rgba(26,173,226,.16),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;overflow:hidden}
.gu *{box-sizing:border-box}
.gu a{text-decoration:none;color:inherit}
.gu-top{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;flex-shrink:0}
.gu-logo{font-weight:800;color:#1AADE2;font-size:18px;letter-spacing:-.02em}
.gu-skip{color:#9aa0a6;font-size:14px;font-weight:600}
.gu-skip:hover{color:#f4f5f7}
.gu-viewport{flex:1;overflow:hidden}
.gu-track{display:flex;height:100%;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.gu-slide{min-width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 28px;overflow-y:auto}
.gu-inner{width:100%;max-width:520px;margin:auto}
.gu-emoji{font-size:72px;line-height:1;margin-bottom:18px}
.gu-eyebrow{color:#1AADE2;font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:13px;display:block;margin-bottom:18px}
.gu-ico{width:88px;height:88px;border-radius:24px;display:grid;place-items:center;margin:0 auto 24px}
.gu h2{font-size:clamp(26px,6vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.15}
.gu p{color:#bfc4cb;font-size:17px;line-height:1.55;margin-top:14px}
.gu-hint{color:#9aa0a6;font-size:14px;margin-top:34px}
.gu-mini{background:#121212;border:1px solid #222;border-radius:14px;padding:16px 18px;display:flex;gap:14px;align-items:flex-start;text-align:left;margin-top:12px}
.gu-mini .mi{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.gu-mini b{font-size:16px}.gu-mini small{color:#9aa0a6;font-size:13.5px;display:block;margin-top:3px;line-height:1.45}
.gu-pwa2{display:grid;gap:14px;margin-top:18px;text-align:left}
.gu-pwacard{background:#121212;border:1px solid #222;border-radius:14px;padding:18px 20px}
.gu-pwacard>b{font-size:15.5px;display:block}
.gu-pwacard ol{margin:11px 0 0;padding-left:20px;display:grid;gap:9px}
.gu-pwacard li{color:#bfc4cb;font-size:14px;line-height:1.45}
.gu-pwacard li b{color:#1AADE2;font-weight:700}
.gu-cta{display:inline-flex;align-items:center;gap:10px;background:#1AADE2;color:#06222e;font-weight:800;border-radius:99px;padding:15px 32px;font-size:17px;margin-top:28px}
.gu-cta:hover{filter:brightness(1.08)}
.gu-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;gap:16px;flex-shrink:0}
.gu-dots{display:flex;gap:7px;align-items:center}
.gu-dot{width:8px;height:8px;border-radius:50%;background:#333;transition:.25s;cursor:pointer}
.gu-dot.on{background:#1AADE2;width:24px;border-radius:99px}
.gu-prev{background:none;border:0;color:#9aa0a6;font-size:15px;font-weight:700;cursor:pointer;width:90px;text-align:left;font-family:inherit}
.gu-prev:hover{color:#f4f5f7}
.gu-next{background:#1AADE2;color:#06222e;border:0;border-radius:99px;padding:12px 22px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;min-width:90px}
.gu-next:hover{filter:brightness(1.08)}
`;
