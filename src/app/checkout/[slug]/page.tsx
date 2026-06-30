"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Moon, Sun, ShoppingCart, IdCard, CreditCard, Lock, Package } from "lucide-react";

type Produto = { nome: string; descricao: string | null; imagem: string | null; preco: number; modo: string; intervalo: string | null; parcelas: number | null };
type Estado = "carregando" | "ok" | "naoencontrado";

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function mascTel(v: string) { const d = v.replace(/\D/g, "").slice(0, 11); if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return d; }
function mascDoc(v: string) { const d = v.replace(/\D/g, "").slice(0, 14); if (d.length > 11) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`; if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`; if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`; return d; }

export default function CheckoutProduto() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params?.slug || "");
  const [estado, setEstado] = useState<Estado>("carregando");
  const [prod, setProd] = useState<Produto | null>(null);
  const [tema, setTema] = useState<"light" | "dark">("light");

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [metodo, setMetodo] = useState<"cartao" | "pix">("cartao");

  const [cupom, setCupom] = useState("");
  const [mostrarCupom, setMostrarCupom] = useState(false);
  const [cupomOk, setCupomOk] = useState<{ codigo: string; percentual: number } | null>(null);
  const [cupomMsg, setCupomMsg] = useState("");
  const [validando, setValidando] = useState(false);

  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const cancelado = search.get("cancelado") === "1";

  useEffect(() => {
    const t = (typeof window !== "undefined" && localStorage.getItem("ck_theme")) as "light" | "dark" | null;
    if (t) setTema(t);
    (async () => {
      try {
        const res = await fetch(`/api/checkout?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { setEstado("naoencontrado"); return; }
        setProd(await res.json()); setEstado("ok");
      } catch { setEstado("naoencontrado"); }
    })();
  }, [slug]);

  function trocarTema() { setTema((t) => { const n = t === "light" ? "dark" : "light"; localStorage.setItem("ck_theme", n); return n; }); }

  async function aplicarCupom() {
    const c = cupom.trim();
    if (!c) return;
    setValidando(true); setCupomMsg("");
    try {
      const res = await fetch(`/api/cupom?codigo=${encodeURIComponent(c)}`);
      const j = await res.json();
      if (j.valido) { setCupomOk({ codigo: j.codigo, percentual: j.percentual }); setCupomMsg(""); }
      else { setCupomOk(null); setCupomMsg("Cupom inválido ou expirado."); }
    } catch { setCupomMsg("Não foi possível validar o cupom."); }
    setValidando(false);
  }

  async function pagar() {
    setErro("");
    if (!email.trim() || !email.includes("@")) { setErro("Informe um e-mail válido."); return; }
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    setIndo(true);
    try {
      const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`.trim();
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, email: email.trim(), nome: nomeCompleto, telefone, cpf, cupom: cupomOk?.codigo || "" }) });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "Não foi possível iniciar o pagamento.");
      window.location.href = j.url;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.");
      setIndo(false);
    }
  }

  const isAssin = prod?.modo === "assinatura";
  const sufixo = isAssin ? (prod?.intervalo === "year" ? "/ano" : "/mês") : "";
  const precoBase = Number(prod?.preco || 0);
  const precoFinal = cupomOk ? precoBase * (1 - cupomOk.percentual / 100) : precoBase;

  return (
    <div className={"ck" + (tema === "light" ? " ck-light" : "")}>
      <style>{CSS}</style>
      <button className="ck-theme" onClick={trocarTema} aria-label="Alternar tema">{tema === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>

      {estado === "carregando" && <div className="ck-center"><div className="ck-spin" /></div>}
      {estado === "naoencontrado" && <div className="ck-center"><div><h1>Produto não encontrado</h1><p className="ck-mut">Não achamos um produto em <b>/{slug}</b>.</p></div></div>}

      {estado === "ok" && prod && (
        <div className="ck-grid">
          {/* COLUNA ESQUERDA — RESUMO */}
          <div className="ck-left">
            <div className="ck-logo">Minhas <b>Métricas</b></div>

            <div className="ck-h"><ShoppingCart size={20} /> Resumo</div>
            <div className="ck-item">
              <div className="ck-thumb">{prod.imagem ? <img src={prod.imagem} alt={prod.nome} /> : <Package size={24} />}</div>
              <div className="ck-itxt">
                <b>{prod.nome}</b>
                {prod.descricao && <p>{prod.descricao}</p>}
                <span className="ck-ipreco">{brl(precoBase)}{sufixo}</span>
              </div>
            </div>

            {!cupomOk ? (
              <>
                <button type="button" className="ck-cuplink" onClick={() => setMostrarCupom((v) => !v)}>aplicar cupom?</button>
                {mostrarCupom && (
                  <div className="ck-cupom">
                    <input placeholder="Código do cupom" value={cupom} onChange={(e) => setCupom(e.target.value.toUpperCase())} />
                    <button type="button" onClick={aplicarCupom} disabled={validando || !cupom.trim()}>{validando ? "…" : "Aplicar"}</button>
                  </div>
                )}
                {cupomMsg && <div className="ck-cupom-erro">{cupomMsg}</div>}
              </>
            ) : (
              <div className="ck-cupom-ok">🎟️ <b>{cupomOk.codigo}</b> · {cupomOk.percentual}% OFF <button type="button" onClick={() => { setCupomOk(null); setCupom(""); setMostrarCupom(false); }}>remover</button></div>
            )}

            <div className="ck-total">Total: <b>{brl(precoFinal)}{sufixo}</b></div>
            <div className="ck-by">Powered by <b>Minhas Métricas</b></div>
          </div>

          {/* COLUNA DIREITA — DADOS + PAGAMENTO */}
          <div className="ck-right">
            <div className="ck-h"><IdCard size={20} /> Identificação do responsável</div>
            <div className="ck-row">
              <input className="ck-in" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              <input className="ck-in" placeholder="Sobrenome" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} />
            </div>
            <input className="ck-in" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="ck-row">
              <input className="ck-in" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(mascTel(e.target.value))} inputMode="numeric" />
              <input className="ck-in" placeholder="CPF ou CNPJ" value={cpf} onChange={(e) => setCpf(mascDoc(e.target.value))} inputMode="numeric" />
            </div>

            <div className="ck-h" style={{ marginTop: 22 }}><CreditCard size={20} /> Pagamento</div>
            <div className="ck-metodos">
              <button type="button" className={"ck-met" + (metodo === "cartao" ? " on" : "")} onClick={() => setMetodo("cartao")}><CreditCard size={18} /> Cartão</button>
              <button type="button" className={"ck-met" + (metodo === "pix" ? " on" : "")} onClick={() => setMetodo("pix")}>◈ Pix</button>
            </div>
            <p className="ck-pagnote">Ao clicar em pagar, você finaliza com segurança no ambiente da <b>Stripe</b> ({metodo === "pix" ? "Pix" : "cartão em até " + (prod.parcelas || 1) + "x"}).</p>

            {cancelado && <div className="ck-aviso">Pagamento cancelado. Tente de novo quando quiser. 🙂</div>}
            {erro && <div className="ck-erro">{erro}</div>}

            <button className="ck-pagar" onClick={pagar} disabled={indo}>{indo ? "Redirecionando…" : <>PAGAR {brl(precoFinal)} <Lock size={16} /></>}</button>
            <div className="ck-seg"><Lock size={13} /> Suas informações estão seguras · Cartão e Pix</div>
            <div className="ck-foot2">Após o pagamento você recebe um e-mail para criar sua senha e acessar o app.</div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.ck{--bg:#0a0a0a;--panel:#0f0f0f;--card:#161616;--line:#262626;--tx:#f4f5f7;--mut:#9aa0a6;--acc:#1AADE2;min-height:100vh;background:var(--bg);color:var(--tx);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.ck-light{--bg:#f3f4f6;--panel:#fff;--card:#fff;--line:#e5e7eb;--tx:#0f172a;--mut:#64748b;--acc:#1AADE2}
.ck-theme{position:fixed;top:20px;right:22px;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--tx);display:grid;place-items:center;cursor:pointer;z-index:10}
.ck-grid{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
.ck-left{padding:48px 44px}
.ck-right{padding:48px 44px;background:var(--panel);border-left:1px solid var(--line)}
.ck-light .ck-right{box-shadow:-8px 0 40px rgba(0,0,0,.04)}
.ck-logo{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:40px}
.ck-logo b{color:var(--acc)}
.ck-h{display:flex;align-items:center;gap:9px;font-size:18px;font-weight:800;color:var(--acc);margin-bottom:16px}
.ck-item{display:flex;gap:16px;align-items:flex-start}
.ck-thumb{width:84px;height:84px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;flex-shrink:0;color:var(--mut)}
.ck-thumb img{width:100%;height:100%;object-fit:cover}
.ck-itxt b{font-size:17px;font-weight:800;display:block}
.ck-itxt p{color:var(--mut);font-size:14px;margin:4px 0 8px;line-height:1.5}
.ck-ipreco{font-size:15px;font-weight:700}
.ck-cuplink{background:none;border:0;color:var(--acc);font-size:14px;cursor:pointer;font-family:inherit;padding:0;margin-top:22px;display:block}
.ck-cupom{display:flex;gap:8px;margin-top:10px;max-width:320px}
.ck-cupom input{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;color:var(--tx);font-size:14px;font-family:inherit;outline:none}
.ck-cupom button{background:var(--card);border:1px solid var(--line);color:var(--tx);border-radius:10px;padding:0 16px;font-weight:700;cursor:pointer;font-family:inherit}
.ck-cupom-erro{color:#ef4444;font-size:13px;margin-top:8px}
.ck-cupom-ok{margin-top:18px;color:#10B981;font-size:14px;font-weight:600}
.ck-cupom-ok button{background:none;border:0;color:var(--mut);text-decoration:underline;cursor:pointer;font-size:12.5px;margin-left:8px;font-family:inherit}
.ck-total{margin-top:30px;font-size:26px;font-weight:800;letter-spacing:-.02em}
.ck-total b{color:var(--acc)}
.ck-by{margin-top:40px;color:var(--mut);font-size:12px}
.ck-by b{color:var(--tx)}
.ck-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ck-in{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:15px 15px;color:var(--tx);font-size:15px;font-family:inherit;outline:none;margin-bottom:12px}
.ck-in:focus{border-color:var(--acc)}
.ck-light .ck-in{background:#f8fafc}
.ck-metodos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px}
.ck-met{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--bg);border:1.5px solid var(--line);color:var(--tx);border-radius:12px;padding:20px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}
.ck-light .ck-met{background:#f8fafc}
.ck-met.on{border-color:var(--acc);color:var(--acc);background:rgba(26,173,226,.08)}
.ck-pagnote{color:var(--mut);font-size:13px;margin:10px 0 0;line-height:1.5}
.ck-pagar{width:100%;margin-top:22px;background:var(--acc);color:#fff;font-weight:800;border:0;border-radius:14px;padding:18px;font-size:16px;letter-spacing:.02em;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.ck-pagar:hover{filter:brightness(1.07)}
.ck-pagar:disabled{opacity:.6;cursor:default}
.ck-seg{margin-top:16px;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--mut);font-size:12.5px}
.ck-foot2{margin-top:8px;text-align:center;color:var(--mut);font-size:11.5px;opacity:.8;line-height:1.5}
.ck-aviso{margin-top:16px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#d99b1f;border-radius:10px;padding:11px 13px;font-size:13.5px}
.ck-erro{margin-top:16px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#ef4444;border-radius:10px;padding:11px 13px;font-size:13.5px}
.ck-center{min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
.ck-mut{color:var(--mut);margin-top:8px}
.ck-spin{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--acc);border-radius:50%;animation:ckspin .8s linear infinite}
@keyframes ckspin{to{transform:rotate(360deg)}}
@media(max-width:820px){.ck-grid{grid-template-columns:1fr}.ck-left,.ck-right{padding:32px 22px}.ck-right{border-left:0;border-top:1px solid var(--line)}.ck-logo{margin-bottom:24px}}
`;
