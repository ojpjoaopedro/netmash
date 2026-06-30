"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Produto = { nome: string; descricao: string | null; imagem: string | null; preco: number; modo: string; intervalo: string | null; parcelas: number | null };
type Estado = "carregando" | "ok" | "naoencontrado";

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function CheckoutProduto() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params?.slug || "");
  const [estado, setEstado] = useState<Estado>("carregando");
  const [prod, setProd] = useState<Produto | null>(null);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const cancelado = search.get("cancelado") === "1";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/checkout?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { setEstado("naoencontrado"); return; }
        setProd(await res.json()); setEstado("ok");
      } catch { setEstado("naoencontrado"); }
    })();
  }, [slug]);

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setIndo(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, email: email.trim() }) });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "Não foi possível iniciar o pagamento.");
      window.location.href = j.url; // redireciona para o checkout seguro da Stripe
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.");
      setIndo(false);
    }
  }

  const isAssin = prod?.modo === "assinatura";
  const sufixo = isAssin ? (prod?.intervalo === "year" ? "/ano" : "/mês") : "";

  return (
    <div className="ck">
      <style>{CSS}</style>
      <div className="ck-card">
        {estado === "carregando" && <div className="ck-spin" />}

        {estado === "naoencontrado" && (
          <>
            <h1>Produto não encontrado</h1>
            <p className="ck-sub">Não achamos um produto em <b>/{slug}</b>.</p>
          </>
        )}

        {estado === "ok" && prod && (
          <>
            {prod.imagem && <img className="ck-img" src={prod.imagem} alt={prod.nome} />}
            <h1>{prod.nome}</h1>
            {prod.descricao && <p className="ck-sub">{prod.descricao}</p>}

            <div className="ck-preco">{brl(Number(prod.preco))}<span className="ck-suf">{sufixo}</span></div>
            {!isAssin && prod.parcelas && prod.parcelas > 1 && (
              <div className="ck-parc">em até {prod.parcelas}x no cartão</div>
            )}

            {cancelado && <div className="ck-aviso">Pagamento cancelado. Você pode tentar de novo quando quiser. 🙂</div>}
            {erro && <div className="ck-erro">{erro}</div>}

            <form onSubmit={pagar}>
              <input className="ck-input" type="email" placeholder="Seu melhor e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="ck-btn" type="submit" disabled={indo}>
                {indo ? "Redirecionando…" : `Pagar ${brl(Number(prod.preco))}${sufixo}`}
              </button>
            </form>

            <div className="ck-seg">🔒 Pagamento seguro processado pela Stripe · Pix e Cartão</div>
            <div className="ck-foot">Após o pagamento você recebe um e-mail para criar sua senha e acessar o app.</div>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.ck{min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 400px at 50% -10%,rgba(26,173,226,.14),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;-webkit-font-smoothing:antialiased}
.ck-card{background:#121212;border:1px solid #222;border-radius:22px;padding:40px 34px;text-align:center;max-width:440px;width:100%}
.ck-img{width:84px;height:84px;object-fit:cover;border-radius:18px;margin:0 auto 18px;display:block}
.ck h1{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.ck-sub{color:#9aa0a6;margin-top:10px;line-height:1.55;font-size:14.5px}
.ck-preco{margin-top:22px;font-size:40px;font-weight:900;letter-spacing:-.03em;color:#1AADE2}
.ck-suf{font-size:18px;font-weight:700;color:#9aa0a6;margin-left:2px}
.ck-parc{color:#9aa0a6;font-size:13.5px;margin-top:4px}
.ck form{margin-top:22px;display:flex;flex-direction:column;gap:11px}
.ck-input{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:12px;padding:14px 15px;color:#f4f5f7;font-size:15px;font-family:inherit;outline:none}
.ck-input:focus{border-color:#1AADE2}
.ck-btn{width:100%;background:#1AADE2;color:#06222e;font-weight:800;border:0;border-radius:12px;padding:16px;font-size:16px;cursor:pointer;font-family:inherit}
.ck-btn:hover{filter:brightness(1.08)}
.ck-btn:disabled{opacity:.6;cursor:default}
.ck-seg{margin-top:18px;color:#7a8088;font-size:12.5px}
.ck-foot{margin-top:8px;color:#555;font-size:12px;line-height:1.5}
.ck-aviso{margin-top:16px;background:#2a2412;border:1px solid #5b4d1d;color:#f0d99b;border-radius:10px;padding:11px 13px;font-size:13.5px}
.ck-erro{margin-top:16px;background:#3a1414;border:1px solid #5b1d1d;color:#ffb4b4;border-radius:10px;padding:11px 13px;font-size:13.5px}
.ck-spin{width:32px;height:32px;border:3px solid #222;border-top-color:#1AADE2;border-radius:50%;animation:ckspin .8s linear infinite;margin:20px auto}
@keyframes ckspin{to{transform:rotate(360deg)}}
`;
