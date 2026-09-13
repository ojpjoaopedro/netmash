"use client";
/**
 * Diagnóstico financeiro (quiz) que vende o app. A pessoa responde 6 perguntas,
 * recebe um perfil + gargalos + projeção de quanto pode estar vazando, preenche
 * os dados (vira lead via /api/lead), dispara Lead no pixel e vai pro checkout da
 * Cakto já pré-preenchido. Projeções são ESTIMATIVAS (nada de resultado garantido).
 */
import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Lock, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";

declare global { interface Window { fbq?: (...args: unknown[]) => void } }

const PRECO = "49,90";
const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

type Opt = { l: string; p?: number; v?: number; g?: string };
type Quest = { q: string; sub?: string; opts: Opt[] };

const QUESTS: Quest[] = [
  { q: "Qual o faturamento médio da sua empresa por mês?", sub: "É só uma estimativa, fica entre nós.", opts: [
    { l: "Até R$ 10 mil", v: 8000 }, { l: "R$ 10 mil a R$ 30 mil", v: 20000 },
    { l: "R$ 30 mil a R$ 100 mil", v: 60000 }, { l: "Mais de R$ 100 mil", v: 150000 },
  ] },
  { q: "Você sabe exatamente quanto sua empresa LUCRA por mês?", opts: [
    { l: "Sim, com clareza", p: 2 }, { l: "Mais ou menos", p: 1, g: "Lucro pouco claro" }, { l: "Não faço ideia", p: 0, g: "Lucro invisível" },
  ] },
  { q: "Como você controla as finanças hoje?", opts: [
    { l: "Um sistema ou app", p: 2 }, { l: "Planilha", p: 1, g: "Controle manual e trabalhoso" },
    { l: "Caderno ou de cabeça", p: 0, g: "Sem controle real" }, { l: "Não controlo", p: 0, g: "Sem controle real" },
  ] },
  { q: "Você separa as contas da empresa das suas contas pessoais?", opts: [
    { l: "Sempre", p: 2 }, { l: "Às vezes", p: 1, g: "Contas misturadas" }, { l: "Não", p: 0, g: "Contas misturadas" },
  ] },
  { q: "Já passou aperto de caixa sem ver chegando?", opts: [
    { l: "Nunca", p: 2 }, { l: "Às vezes", p: 1, g: "Sem previsão de caixa" }, { l: "Direto", p: 0, g: "Sem previsão de caixa" },
  ] },
  { q: "Você decide (contratar, comprar, investir) com base em quê?", opts: [
    { l: "Nos números", p: 2 }, { l: "Um pouco dos dois", p: 1 }, { l: "No achismo", p: 0, g: "Decisão no achismo" },
  ] },
];
const MAX_PTS = QUESTS.reduce((a, q) => a + (q.opts.some((o) => o.p != null) ? 2 : 0), 0);

function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join("")).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function DiagnosticoClient() {
  const [etapa, setEtapa] = useState(0);          // 0 = intro; 1..6 = perguntas; 7 = resultado
  const [resp, setResp] = useState<Record<number, number>>({});
  const [f, setF] = useState({ nome: "", telefone: "", email: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const total = QUESTS.length;
  const qIndex = etapa - 1;

  const diag = useMemo(() => {
    let pts = 0; const gargalos: string[] = []; let fat = 20000;
    QUESTS.forEach((q, i) => {
      const oi = resp[i]; if (oi == null) return;
      const o = q.opts[oi];
      if (o.v != null) fat = o.v;
      if (o.p != null) pts += o.p;
      if (o.g && !gargalos.includes(o.g)) gargalos.push(o.g);
    });
    const score = Math.round((pts / MAX_PTS) * 100);
    const perfil = score >= 70
      ? { nome: "No controle", cor: "#10B981", txt: "Você já organiza os números, e é justamente quem tira mais proveito de um painel que centraliza tudo." }
      : score >= 40
        ? { nome: "No piloto automático", cor: "#F59E0B", txt: "Sua empresa funciona, mas você decide sem enxergar o quadro completo. Falta clareza pra crescer com segurança." }
        : { nome: "No escuro", cor: "#EF4444", txt: "Você trabalha muito, mas decide no achismo. É o cenário de maior risco, e o que mais melhora com controle financeiro." };
    const baixo = fat * 0.10, alto = fat * 0.20;   // faixa típica que vaza sem gestão (estimativa)
    return { score, perfil, gargalos, fat, baixo, alto };
  }, [resp]);

  function responder(oi: number) {
    setResp((r) => ({ ...r, [qIndex]: oi }));
    setTimeout(() => setEtapa((e) => Math.min(e + 1, total + 1)), 180);
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    if (!f.nome.trim()) return setErro("Digite seu nome.");
    if (f.telefone.replace(/\D/g, "").length < 10) return setErro("Digite um WhatsApp com DDD.");
    if (!f.email.includes("@")) return setErro("Digite um e-mail válido.");
    setEnviando(true);
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !j.checkoutUrl) { setErro(j.error || "Não consegui continuar. Tente de novo."); setEnviando(false); return; }
      try { window.fbq?.("track", "Lead"); window.fbq?.("track", "InitiateCheckout", { value: 49.9, currency: "BRL" }); } catch { /* ignore */ }
      window.location.href = j.checkoutUrl;
    } catch { setErro("Falha de conexão. Tente de novo."); setEnviando(false); }
  }

  const progresso = etapa === 0 ? 0 : etapa > total ? 100 : Math.round((etapa - 1) / total * 100);

  return (
    <main className="wrap">
      <style>{CSS}</style>
      <div className="top">
        <div className="brand"><span className="logo">📈</span> Minhas Métricas</div>
        {etapa >= 1 && etapa <= total && <div className="pgwrap"><div className="pgbar" style={{ width: `${progresso}%` }} /></div>}
      </div>

      <div className="card">
        {/* INTRO */}
        {etapa === 0 && (
          <div className="fade">
            <span className="pill">Diagnóstico gratuito · 1 minuto</span>
            <h1>Quanto sua empresa está <span className="g">deixando na mesa?</span></h1>
            <p className="sub">Responda 6 perguntas rápidas e descubra o seu perfil de gestão, os gargalos que travam o seu lucro e uma estimativa de quanto pode estar vazando todo mês.</p>
            <button className="cta" onClick={() => setEtapa(1)}>Começar o diagnóstico <ArrowRight size={18} /></button>
            <div className="trust"><span><ShieldCheck size={14} /> Sem compromisso</span><span><Lock size={14} /> Seus dados ficam seguros</span></div>
          </div>
        )}

        {/* PERGUNTAS */}
        {etapa >= 1 && etapa <= total && (
          <div className="fade" key={etapa}>
            <div className="qnum">Pergunta {etapa} de {total}</div>
            <h2 className="q">{QUESTS[qIndex].q}</h2>
            {QUESTS[qIndex].sub && <p className="qsub">{QUESTS[qIndex].sub}</p>}
            <div className="opts">
              {QUESTS[qIndex].opts.map((o, oi) => (
                <button key={oi} className={`opt${resp[qIndex] === oi ? " sel" : ""}`} onClick={() => responder(oi)}>
                  <span>{o.l}</span><ArrowRight size={16} className="oarr" />
                </button>
              ))}
            </div>
            {etapa > 1 && <button className="back" onClick={() => setEtapa((e) => e - 1)}><ArrowLeft size={15} /> Voltar</button>}
          </div>
        )}

        {/* RESULTADO + CAPTURA */}
        {etapa > total && (
          <div className="fade">
            <div className="perfilhead">
              <div className="score" style={{ borderColor: diag.perfil.cor, color: diag.perfil.cor }}>{diag.score}<small>/100</small></div>
              <div>
                <div className="perfiltag" style={{ color: diag.perfil.cor }}>Seu perfil</div>
                <div className="perfilnome">{diag.perfil.nome}</div>
              </div>
            </div>
            <p className="perfiltxt">{diag.perfil.txt}</p>

            <div className="proj">
              <div className="projrot"><TrendingUp size={16} color="#10B981" /> Estimativa do que pode estar vazando</div>
              <div className="projval">{brl(diag.baixo)} a {brl(diag.alto)} <span>por mês</span></div>
              <p className="projsub">Negócios que passam a acompanhar os números de perto costumam recuperar de <b>10% a 20%</b> que se perde em juros, desperdício e contas misturadas. No seu faturamento (~{brl(diag.fat)}/mês), isso daria essa faixa. É uma estimativa, não uma promessa.</p>
            </div>

            {diag.gargalos.length > 0 && (
              <div className="garg">
                <div className="gargrot"><AlertTriangle size={15} color="#F59E0B" /> Gargalos que apareceram no seu diagnóstico</div>
                <div className="gargs">{diag.gargalos.map((g) => <span key={g} className="gtag">{g}</span>)}</div>
              </div>
            )}

            <div className="formbox">
              <div className="formtit">Destrave isso com o <b>Minhas Métricas</b></div>
              <div className="formsub">Preencha seus dados, vá pro pagamento e monte seu painel em minutos.</div>
              <form onSubmit={enviar} className="form">
                <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Seu nome" autoComplete="name" />
                <input value={f.telefone} onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} placeholder="WhatsApp (11) 99999-9999" inputMode="tel" autoComplete="tel" />
                <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Seu e-mail" inputMode="email" autoComplete="email" />
                {erro && <div className="erro">{erro}</div>}
                <button type="submit" className="cta" disabled={enviando}>{enviando ? "Um instante..." : <>Quero destravar meu lucro <ArrowRight size={18} /></>}</button>
              </form>
              <div className="preco">Assinatura <b>R$ {PRECO}/mês</b> · cancele quando quiser</div>
              <div className="trust"><span><ShieldCheck size={14} /> 7 dias de garantia</span><span><Check size={14} /> Pagamento seguro</span></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const CSS = `
.wrap{min-height:100dvh;padding:20px 16px 40px;background:
  radial-gradient(900px 500px at 80% -10%,rgba(26,173,226,.18),transparent 60%),
  radial-gradient(700px 500px at 0% 110%,rgba(16,185,129,.14),transparent 60%),#0a0e14;color:#e8eef6}
.top{max-width:520px;margin:0 auto 16px}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;color:#fff}
.brand .logo{font-size:20px}
.pgwrap{height:6px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:12px;overflow:hidden}
.pgbar{height:100%;border-radius:99px;background:linear-gradient(90deg,#22B8F0,#10B981);transition:width .35s ease}
.card{width:100%;max-width:520px;margin:0 auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:22px;padding:26px 22px;backdrop-filter:blur(6px)}
.fade{animation:fade .35s ease}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pill{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#22B8F0;background:rgba(34,184,240,.1);border:1px solid rgba(34,184,240,.25);border-radius:99px;padding:6px 12px}
h1{font-size:27px;line-height:1.15;font-weight:900;margin:16px 0 10px;letter-spacing:-.02em}
h1 .g{background:linear-gradient(90deg,#22B8F0,#10B981);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:#9fb0c4;font-size:15px;line-height:1.55}
.cta{width:100%;margin-top:20px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px;border:0;border-radius:12px;font-size:16.5px;font-weight:800;color:#04121a;background:linear-gradient(135deg,#22B8F0,#10B981);cursor:pointer}
.cta:disabled{opacity:.7;cursor:default}
.trust{display:flex;justify-content:center;gap:16px;margin-top:14px;color:#8194a8;font-size:12px}
.trust span{display:inline-flex;align-items:center;gap:5px}
.qnum{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7c8ea3}
.q{font-size:22px;font-weight:800;line-height:1.25;margin:8px 0 0;letter-spacing:-.01em}
.qsub{color:#8194a8;font-size:13.5px;margin:8px 0 0}
.opts{display:grid;gap:10px;margin-top:18px}
.opt{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;padding:15px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#eaf1f8;font-size:15.5px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
.opt:hover{border-color:#22B8F0;background:rgba(34,184,240,.08)}
.opt:active{transform:scale(.99)}
.opt.sel{border-color:#22B8F0;background:rgba(34,184,240,.12)}
.oarr{opacity:.5;flex:none}
.back{margin-top:16px;display:inline-flex;align-items:center;gap:6px;background:transparent;border:0;color:#8194a8;font-size:13.5px;font-weight:600;cursor:pointer}
.perfilhead{display:flex;align-items:center;gap:16px}
.score{flex:none;width:78px;height:78px;border-radius:50%;border:3px solid;display:grid;place-items:center;font-size:30px;font-weight:900}
.score small{font-size:12px;opacity:.7;font-weight:700}
.perfiltag{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.perfilnome{font-size:24px;font-weight:900;letter-spacing:-.02em;color:#fff;margin-top:2px}
.perfiltxt{color:#c2cfde;font-size:15px;line-height:1.55;margin:16px 0 0}
.proj{margin-top:20px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.28);border-radius:16px;padding:18px}
.projrot{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:#10B981;text-transform:uppercase;letter-spacing:.05em}
.projval{font-size:30px;font-weight:900;letter-spacing:-.02em;margin-top:8px;color:#fff}
.projval span{font-size:15px;font-weight:600;color:#9fb0c4}
.projsub{color:#9fb0c4;font-size:13px;line-height:1.5;margin:10px 0 0}
.projsub b{color:#cfe9df}
.garg{margin-top:18px}
.gargrot{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:#F59E0B;text-transform:uppercase;letter-spacing:.05em}
.gargs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.gtag{font-size:13px;font-weight:600;color:#f3d19a;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28);border-radius:99px;padding:6px 12px}
.formbox{margin-top:22px;border-top:1px solid rgba(255,255,255,.1);padding-top:20px}
.formtit{font-size:18px;font-weight:800}
.formsub{color:#9fb0c4;font-size:13.5px;margin-top:4px}
.form{display:grid;gap:10px;margin-top:14px}
.form input{width:100%;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;font-size:16px;outline:none}
.form input:focus{border-color:#22B8F0}
.erro{color:#fca5a5;font-size:13px;font-weight:600}
.preco{text-align:center;margin-top:14px;font-size:13px;color:#9fb0c4}
.preco b{color:#fff}
@media(max-width:420px){h1{font-size:24px}.q{font-size:20px}}
`;
