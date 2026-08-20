"use client";
/**
 * Página para onde o cliente volta depois do checkout. Fica consultando o
 * status da venda até o webhook da Wiven confirmar o pagamento (PIX e boleto
 * podem demorar). Quando confirma, a conta já existe e ele entra direto.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CircleAlert, Clock, PartyPopper } from "lucide-react";

type Status = { status: string; email?: string; plano?: string | null; contaCriada?: boolean; podeSimular?: boolean };

function Conteudo() {
  const params = useSearchParams();
  const venda = params.get("venda") || "";
  const [st, setSt] = useState<Status | null>(null);
  const [erro, setErro] = useState("");
  const [simulando, setSimulando] = useState(false);

  const consultar = useCallback(async () => {
    if (!venda) { setErro("Não achei a sua compra. Confira o link que você recebeu."); return null; }
    try {
      const res = await fetch(`/api/checkout/status?venda=${encodeURIComponent(venda)}`, { cache: "no-store" });
      const j = (await res.json()) as Status & { error?: string };
      if (!res.ok) { setErro(j.error || "Não consegui consultar a compra."); return null; }
      setSt(j);
      return j;
    } catch { return null; }
  }, [venda]);

  useEffect(() => {
    let vivo = true;
    let tentativas = 0;
    const rodar = async () => {
      const j = await consultar();
      tentativas++;
      // para de consultar quando confirma, ou depois de ~10 minutos
      if (!vivo || (j && j.status !== "pendente") || tentativas > 150) return;
      window.setTimeout(rodar, 4000);
    };
    rodar();
    return () => { vivo = false; };
  }, [consultar]);

  async function simular() {
    setSimulando(true);
    try {
      await fetch("/api/checkout/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venda }) });
      await consultar();
    } finally { setSimulando(false); }
  }

  if (erro) {
    return (
      <div className="ob-card">
        <span className="ob-ico erro"><CircleAlert size={26} /></span>
        <h1>Não achei a sua compra</h1>
        <p>{erro}</p>
        <Link className="ob-btn" href="/assinar">Voltar para a assinatura</Link>
      </div>
    );
  }

  const pago = st?.status === "pago";
  const problema = st ? ["reembolsado", "chargeback", "cancelado", "falhou"].includes(st.status) : false;

  if (pago) {
    return (
      <div className="ob-card">
        <span className="ob-ico ok"><PartyPopper size={26} /></span>
        <h1>Pagamento confirmado!</h1>
        <p>Sua conta está pronta{st?.email ? <> para <b>{st.email}</b></> : null}. Entre com o e-mail e a senha que você criou.</p>
        <Link className="ob-btn" href="/login">Entrar no painel <ArrowRight size={16} /></Link>
        <small className="ob-dica">Se a senha não funcionar, use &quot;Esqueci minha senha&quot; na tela de login.</small>
      </div>
    );
  }

  if (problema) {
    return (
      <div className="ob-card">
        <span className="ob-ico erro"><CircleAlert size={26} /></span>
        <h1>O pagamento não foi concluído</h1>
        <p>A compra ficou como <b>{st?.status}</b>. Se você acha que é engano, fale com a gente que resolvemos rapidinho.</p>
        <Link className="ob-btn" href="/assinar">Tentar de novo</Link>
      </div>
    );
  }

  return (
    <div className="ob-card">
      <span className="ob-ico"><Clock size={26} /></span>
      <h1>Estamos confirmando o pagamento</h1>
      <p>Pode deixar esta página aberta. No cartão costuma ser na hora; no PIX ou boleto pode levar alguns minutos.</p>
      <div className="ob-spin" />
      {st?.podeSimular && (
        <button className="ob-btn ghost" onClick={simular} disabled={simulando}>
          {simulando ? "Confirmando…" : "Simular pagamento aprovado (desenvolvimento)"}
        </button>
      )}
      <small className="ob-dica">Assim que o pagamento cair, sua conta é criada automaticamente e esta página avisa.</small>
    </div>
  );
}

export default function ObrigadoClient() {
  return (
    <div className="ob">
      <style>{CSS}</style>
      <Suspense fallback={<div className="ob-card"><div className="ob-spin" /></div>}><Conteudo /></Suspense>
    </div>
  );
}

const CSS = `
.ob{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(800px 400px at 50% -10%,rgba(26,173,226,.14),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.ob-card{background:#121212;border:1px solid #222;border-radius:22px;padding:44px 38px;text-align:center;max-width:460px;width:100%}
.ob-ico{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;margin:0 auto 18px;background:rgba(26,173,226,.14);color:#1AADE2}
.ob-ico.ok{background:rgba(16,185,129,.14);color:#10B981}
.ob-ico.erro{background:rgba(239,68,68,.14);color:#ef4444}
.ob h1{font-size:25px;font-weight:800;letter-spacing:-.02em;line-height:1.2;margin:0}
.ob p{color:#9aa0a6;margin-top:12px;line-height:1.6;font-size:14.5px}
.ob-btn{display:inline-flex;align-items:center;gap:7px;margin-top:24px;background:linear-gradient(135deg,#22b8f0,#0c6e9e);color:#fff;border:0;border-radius:99px;padding:14px 28px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;text-decoration:none}
.ob-btn.ghost{background:transparent;border:1px solid #2c2c2c;color:#9aa0a6;font-weight:700;font-size:13px;padding:11px 20px}
.ob-btn:disabled{opacity:.6;cursor:not-allowed}
.ob-dica{display:block;color:#666;font-size:12px;margin-top:18px;line-height:1.5}
.ob-spin{width:30px;height:30px;border:3px solid #222;border-top-color:#1AADE2;border-radius:50%;animation:obspin .8s linear infinite;margin:22px auto 0}
@keyframes obspin{to{transform:rotate(360deg)}}
`;
