"use client";
/**
 * Landing de assinatura: o visitante escolhe o plano, preenche os dados da
 * empresa e vai para o checkout da Wiven. A conta só é criada quando o
 * pagamento é confirmado (pelo webhook), e aí ele já entra com a senha daqui.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

type Plano = { chave: string; nome: string; descricao: string | null; preco: number; imagem: string | null; base: boolean; primeiraCobranca: number | null; precoDaWiven?: boolean };

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join("")).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function mascaraDocumento(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => [a, b && `.${b}`, c && `.${c}`, e && `-${e}`].join(""));
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, e, f) => [a, b && `.${b}`, c && `.${c}`, e && `/${e}`, f && `-${f}`].join(""));
}

function Formulario() {
  const params = useSearchParams();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [escolhido, setEscolhido] = useState<string>("");
  const [f, setF] = useState({ nome: "", empresa: "", email: "", telefone: "", documento: "", senha: "" });
  const [verSenha, setVerSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [configurado, setConfigurado] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/checkout");
        const j = (await res.json()) as { planos?: Plano[]; configurado?: boolean };
        setConfigurado(j.configurado !== false);
        const todos = (j.planos ?? []).filter((p) => p.preco > 0);
        // Quem chega pela landing contrata o plano principal. O link com ?plano=
        // vem do painel (botão Ativar de um item extra) e mostra só aquele item.
        const pedido = todos.find((p) => p.chave === params.get("plano"));
        const lista = pedido ? [pedido] : todos.filter((p) => p.base);
        setPlanos(lista);
        setEscolhido(lista[0]?.chave || "");
      } catch { setErro("Não consegui carregar os planos. Recarregue a página."); }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const plano = planos.find((p) => p.chave === escolhido) || null;

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    if (!aceite) { setErro("Aceite os termos para continuar."); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, plano: escolhido }),
      });
      const j = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !j.checkoutUrl) { setErro(j.error || "Não consegui abrir o pagamento."); setEnviando(false); return; }
      window.location.href = j.checkoutUrl;
    } catch {
      setErro("Falha de conexão. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <form className="as-grid" onSubmit={enviar}>
      <div className="as-col">
        {!configurado && <p className="as-aviso">Ambiente de demonstração: o banco não está configurado, então a compra não vai concluir.</p>}
        <h2 className="as-h2">{planos.length > 1 ? "1. Escolha o plano" : "1. Seu plano"}</h2>
        <div className="as-planos">
          {planos.map((p) => (
            <button type="button" key={p.chave} className={`as-plano ${escolhido === p.chave ? "on" : ""}`} onClick={() => setEscolhido(p.chave)}>
              <span className="as-radio">{escolhido === p.chave && <Check size={13} />}</span>
              <span className="as-plano-txt">
                <b>{p.nome}</b>
                {p.descricao && <small>{p.descricao}</small>}
              </span>
              <span className="as-preco">
                {fmt(p.primeiraCobranca ?? p.preco)}<small>{p.primeiraCobranca ? " na 1ª" : "/mês"}</small>
                {p.primeiraCobranca && <small className="as-depois">depois {fmt(p.preco)}/mês</small>}
              </span>
            </button>
          ))}
          {!planos.length && <div className="as-vazio">Carregando planos…</div>}
        </div>

        <h2 className="as-h2">2. Seus dados</h2>
        {plano && !plano.base && (
          <p className="as-aviso">Este é um item extra: use o mesmo e-mail com que você entra no painel. Ele é liberado sozinho assim que o pagamento for aprovado.</p>
        )}
        <div className="as-campos">
          <label>Seu nome
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Como você se chama" autoComplete="name" required />
          </label>
          {plano?.base !== false && (
            <label>Nome da empresa
              <input value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} placeholder="O nome que aparece no painel" autoComplete="organization" required />
            </label>
          )}
          <label>E-mail de acesso
            <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="voce@empresa.com.br" autoComplete="email" required />
          </label>
          <div className="as-dupla">
            <label>Telefone
              <input value={f.telefone} onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" required />
            </label>
            <label>CPF ou CNPJ
              <input value={f.documento} onChange={(e) => setF({ ...f, documento: mascaraDocumento(e.target.value) })} placeholder="000.000.000-00" inputMode="numeric" required />
            </label>
          </div>
          {plano?.base !== false && (
            <label>Crie uma senha
              <span className="as-senha">
                <input type={verSenha ? "text" : "password"} value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} placeholder="Mínimo de 6 caracteres" minLength={6} autoComplete="new-password" required />
                <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}>{verSenha ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </span>
              <small className="as-dica">É com ela que você entra no painel depois da compra.</small>
            </label>
          )}
        </div>
      </div>

      <aside className="as-resumo">
        <h2 className="as-h2">Resumo</h2>
        <div className="as-linha"><span>Plano</span><b>{plano?.nome || "—"}</b></div>
        <div className="as-linha"><span>Cobrança</span><b>Mensal</b></div>
        {plano?.primeiraCobranca != null && (
          <div className="as-linha"><span>A partir do 2º mês</span><b>{fmt(plano.preco)}</b></div>
        )}
        <div className="as-total"><span>Total hoje</span><b>{plano ? fmt(plano.primeiraCobranca ?? plano.preco) : "—"}</b></div>

        <label className="as-aceite">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>Li e aceito os <Link href="/privacidade" target="_blank">termos de uso e a política de privacidade</Link>.</span>
        </label>

        {erro && <div className="as-erro">{erro}</div>}

        <button className="as-cta" type="submit" disabled={enviando || !plano}>
          {enviando ? "Abrindo pagamento…" : <>Ir para o pagamento <ArrowRight size={17} /></>}
        </button>

        <ul className="as-seguro">
          <li><Lock size={13} /> Pagamento processado pela Wiven</li>
          <li><ShieldCheck size={13} /> Sua conta é criada assim que o pagamento é aprovado</li>
          <li><Check size={13} /> Cancele quando quiser</li>
        </ul>
      </aside>
    </form>
  );
}

export default function AssinarClient() {
  return (
    <div className="as">
      <style>{CSS}</style>
      <header className="as-topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" />
        <Link href="/login">Já sou cliente</Link>
      </header>
      <main className="as-main">
        <h1>Assine e comece hoje</h1>
        <p className="as-sub">Preencha os dados da empresa, pague e entre no painel. Leva menos de 2 minutos.</p>
        <Suspense fallback={<div className="as-vazio">Carregando…</div>}><Formulario /></Suspense>
      </main>
      <footer className="as-rodape">Minhas Métricas · <Link href="/privacidade">Privacidade</Link></footer>
    </div>
  );
}

const CSS = `
.as{min-height:100vh;background:radial-gradient(900px 460px at 50% -12%,rgba(26,173,226,.16),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
.as *{box-sizing:border-box}
.as-topo{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;max-width:1080px;width:100%;margin:0 auto}
.as-topo img{height:34px;width:auto;object-fit:contain}
.as-topo a{color:#9aa0a6;font-size:13.5px;font-weight:600;text-decoration:none}
.as-topo a:hover{color:#1AADE2}
.as-main{flex:1;max-width:1080px;width:100%;margin:0 auto;padding:14px 22px 40px}
.as-main h1{font-size:34px;font-weight:900;letter-spacing:-.03em;line-height:1.1;margin:0}
.as-sub{color:#9aa0a6;margin:10px 0 26px;font-size:15px;line-height:1.6}
.as-grid{display:grid;grid-template-columns:1fr 340px;gap:22px;align-items:start}
.as-col{display:flex;flex-direction:column;gap:8px}
.as-h2{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7e858c;margin:14px 0 10px}
.as-planos{display:flex;flex-direction:column;gap:10px}
.as-plano{display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#121212;border:1px solid #232323;border-radius:14px;padding:15px 16px;cursor:pointer;color:inherit;font-family:inherit;transition:.14s}
.as-plano:hover{border-color:#333}
.as-plano.on{border-color:#1AADE2;background:#0f1c22}
.as-radio{width:20px;height:20px;border-radius:50%;border:1.5px solid #3a3a3a;display:grid;place-items:center;flex-shrink:0;color:#06222e;background:transparent}
.as-plano.on .as-radio{background:#1AADE2;border-color:#1AADE2}
.as-plano-txt{flex:1;min-width:0}
.as-plano-txt b{display:block;font-size:15px}
.as-plano-txt small{display:block;color:#8d949b;font-size:12.5px;margin-top:2px;line-height:1.45}
.as-preco{font-size:17px;font-weight:800;white-space:nowrap}
.as-preco small{font-size:12px;font-weight:600;color:#8d949b}
.as-depois{display:block;font-weight:600;font-size:11px;color:#7e858c;margin-top:2px}
.as-campos{display:flex;flex-direction:column;gap:13px}
.as-campos label{display:block;font-size:12.5px;font-weight:700;color:#b9bec4}
.as-campos input{width:100%;margin-top:6px;background:#121212;border:1px solid #232323;border-radius:12px;padding:13px 14px;color:#f4f5f7;font-size:14.5px;font-family:inherit;outline:none}
.as-campos input:focus{border-color:#1AADE2}
.as-campos input::placeholder{color:#5e646a}
.as-dupla{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.as-senha{position:relative;display:block}
.as-senha button{position:absolute;right:8px;top:calc(50% + 3px);transform:translateY(-50%);background:transparent;border:0;color:#8d949b;cursor:pointer;padding:6px;display:grid;place-items:center}
.as-dica{display:block;color:#7e858c;font-size:11.5px;font-weight:500;margin-top:5px}
.as-aviso{background:rgba(26,173,226,.1);border:1px solid rgba(26,173,226,.28);color:#9fd9f2;border-radius:11px;padding:10px 12px;font-size:12.5px;line-height:1.55;margin:0 0 13px}
.as-resumo{background:#121212;border:1px solid #232323;border-radius:18px;padding:20px;position:sticky;top:18px}
.as-resumo .as-h2{margin-top:0}
.as-linha{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13.5px;color:#9aa0a6;padding:7px 0}
.as-linha b{color:#f4f5f7}
.as-total{display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-top:1px solid #232323;margin-top:10px;padding-top:14px;font-size:13.5px;color:#9aa0a6}
.as-total b{font-size:24px;color:#fff;letter-spacing:-.02em}
.as-aceite{display:flex;gap:9px;align-items:flex-start;margin:16px 0 6px;font-size:12.5px;color:#9aa0a6;line-height:1.5;cursor:pointer}
.as-aceite input{margin-top:2px;accent-color:#1AADE2;width:15px;height:15px;flex-shrink:0}
.as-aceite a{color:#1AADE2;text-decoration:none}
.as-erro{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:11px;padding:10px 12px;font-size:13px;margin:10px 0;line-height:1.5}
.as-cta{width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#22b8f0,#0c6e9e);color:#fff;border:0;border-radius:99px;padding:15px 22px;font-size:15.5px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 12px 28px -14px rgba(34,184,240,.8)}
.as-cta:disabled{opacity:.6;cursor:not-allowed}
.as-seguro{list-style:none;padding:0;margin:16px 0 0;display:flex;flex-direction:column;gap:8px}
.as-seguro li{display:flex;align-items:center;gap:7px;color:#7e858c;font-size:12px}
.as-vazio{color:#7e858c;font-size:13.5px;padding:14px 0}
.as-rodape{text-align:center;color:#555;font-size:12px;padding:22px}
.as-rodape a{color:#777;text-decoration:none}
@media (max-width:880px){
  .as-grid{grid-template-columns:1fr}
  .as-resumo{position:static}
  .as-main h1{font-size:27px}
}
@media (max-width:420px){ .as-dupla{grid-template-columns:1fr} }
`;
