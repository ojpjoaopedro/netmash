"use client";
/** Captura leve: Nome + WhatsApp + E-mail. Salva o lead, dispara o evento Lead
 *  no pixel e leva pra Cakto já pré-preenchida. */
import { useState } from "react";
import { Check, Lock, ShieldCheck, ArrowRight } from "lucide-react";

declare global { interface Window { fbq?: (...args: unknown[]) => void } }

const BENEFICIOS = [
  "Faturamento, custos e lucro num painel só",
  "Projeção de caixa e assistente inteligente",
  "Funciona no celular, sem planilha",
];

function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join("")).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function ComecarClient() {
  const [f, setF] = useState({ nome: "", telefone: "", email: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      // Eventos do pixel: captou o lead e está indo pro pagamento.
      try { window.fbq?.("track", "Lead"); window.fbq?.("track", "InitiateCheckout", { value: 49.9, currency: "BRL" }); } catch { /* ignore */ }
      window.location.href = j.checkoutUrl;
    } catch { setErro("Falha de conexão. Tente de novo."); setEnviando(false); }
  }

  return (
    <main className="wrap">
      <style>{CSS}</style>
      <div className="card">
        <div className="brand"><span className="logo">📈</span> Minhas Métricas</div>
        <h1>Comece a enxergar o <span className="g">lucro real</span> da sua empresa</h1>
        <p className="sub">Preencha seus dados e vá para o pagamento. Em minutos seu painel está pronto.</p>

        <ul className="bens">
          {BENEFICIOS.map((b) => <li key={b}><Check size={16} /> {b}</li>)}
        </ul>

        <form onSubmit={enviar} className="form">
          <label>Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Seu nome" autoComplete="name" /></label>
          <label>WhatsApp<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" /></label>
          <label>E-mail<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="voce@email.com" inputMode="email" autoComplete="email" /></label>
          {erro && <div className="erro">{erro}</div>}
          <button type="submit" disabled={enviando}>
            {enviando ? "Um instante..." : <>Continuar para o pagamento <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="preco">Sem fidelidade · cancele quando quiser</div>
        <div className="trust">
          <span><ShieldCheck size={14} /> 7 dias de garantia</span>
          <span><Lock size={14} /> Pagamento seguro</span>
        </div>
      </div>
    </main>
  );
}

const CSS = `
.wrap{min-height:100dvh;display:grid;place-items:center;padding:24px 16px;background:
  radial-gradient(900px 500px at 80% -10%,rgba(26,173,226,.18),transparent 60%),
  radial-gradient(700px 500px at 0% 110%,rgba(16,185,129,.14),transparent 60%),#0a0e14;color:#e8eef6}
.card{width:100%;max-width:440px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:22px;padding:28px 24px;backdrop-filter:blur(6px)}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;color:#fff}
.brand .logo{font-size:20px}
h1{font-size:26px;line-height:1.15;font-weight:900;margin:16px 0 8px;letter-spacing:-.02em}
h1 .g{background:linear-gradient(90deg,#22B8F0,#10B981);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:#9fb0c4;font-size:14.5px;line-height:1.5}
.bens{list-style:none;margin:16px 0 4px;padding:0;display:grid;gap:8px}
.bens li{display:flex;align-items:center;gap:9px;font-size:14px;color:#cdd8e6}
.bens svg{color:#10B981;flex:none}
.form{display:grid;gap:12px;margin-top:18px}
.form label{display:grid;gap:6px;font-size:12.5px;font-weight:700;color:#9fb0c4}
.form input{width:100%;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;font-size:16px;outline:none}
.form input:focus{border-color:#22B8F0}
.erro{color:#fca5a5;font-size:13px;font-weight:600}
.form button{margin-top:4px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px;border:0;border-radius:12px;font-size:16.5px;font-weight:800;color:#04121a;background:linear-gradient(135deg,#22B8F0,#10B981);cursor:pointer}
.form button:disabled{opacity:.7;cursor:default}
.preco{text-align:center;margin-top:16px;font-size:13.5px;color:#9fb0c4}
.preco b{color:#fff}
.trust{display:flex;justify-content:center;gap:16px;margin-top:12px;color:#8194a8;font-size:12px}
.trust span{display:inline-flex;align-items:center;gap:5px}
@media(max-width:420px){h1{font-size:23px}}
`;
