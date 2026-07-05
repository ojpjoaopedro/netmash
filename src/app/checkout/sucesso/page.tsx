"use client";
import { useEffect, useState } from "react";

type PosVenda = { pos_venda_msg?: string | null; pos_venda_btn_texto?: string | null; pos_venda_btn_link?: string | null };

export default function CheckoutSucesso() {
  const [pv, setPv] = useState<PosVenda | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) return;
    fetch(`/api/checkout?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPv(d); })
      .catch(() => {});
  }, []);

  const msg = pv?.pos_venda_msg?.trim();
  const btnTexto = pv?.pos_venda_btn_texto?.trim();
  const btnLink = pv?.pos_venda_btn_link?.trim();

  return (
    <div className="ck">
      <style>{CSS}</style>
      <div className="ck-card">
        <div className="ck-check">✓</div>
        <h1>Pagamento confirmado! 🎉</h1>
        <p className="ck-sub">
          {msg || "Obrigado pela compra. Enviamos um e-mail para você criar sua senha e acessar o app."}
        </p>
        {!msg && (
          <p className="ck-sub" style={{ marginTop: 14 }}>
            Não chegou em alguns minutos? Olhe a caixa de <b>spam</b> ou use a opção
            <b> &ldquo;Primeiro acesso&rdquo;</b> na tela de login.
          </p>
        )}

        {btnTexto && btnLink
          ? <a className="ck-btn" href={btnLink} target="_blank" rel="noreferrer">{btnTexto}</a>
          : <a className="ck-btn" href="/login">Ir para o login →</a>}

        <div className="ck-foot">Powered by Minhas Métricas</div>
      </div>
    </div>
  );
}

const CSS = `
.ck{min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 400px at 50% -10%,rgba(16,185,129,.16),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;-webkit-font-smoothing:antialiased}
.ck-card{background:#121212;border:1px solid #222;border-radius:22px;padding:44px 36px;text-align:center;max-width:440px;width:100%}
.ck-check{width:64px;height:64px;border-radius:50%;background:#10B981;color:#06241a;font-size:34px;font-weight:900;display:grid;place-items:center;margin:0 auto 18px}
.ck h1{font-size:25px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.ck-sub{color:#9aa0a6;margin-top:12px;line-height:1.6;font-size:14.5px}
.ck-btn{display:inline-block;margin-top:24px;background:#1AADE2;color:#06222e;font-weight:800;border:0;border-radius:99px;padding:15px 30px;font-size:16px;cursor:pointer;font-family:inherit;text-decoration:none}
.ck-btn:hover{filter:brightness(1.08)}
.ck-foot{margin-top:24px;color:#555;font-size:12px}
`;
