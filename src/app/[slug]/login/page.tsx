"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { login, enviarReset } from "@/lib/db";
import { supabaseReady } from "@/lib/supabase";

type Marca = { nome: string; logo: string | null; cor: string | null };

export default function SlugLogin() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.slug || "");
  const [marca, setMarca] = useState<Marca | null>(null);
  const [carregandoMarca, setCarregandoMarca] = useState(true);
  const [modo, setModo] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Carrega a identidade (nome/logo/cor) da empresa pelo slug
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${encodeURIComponent(slug)}`);
        if (res.ok) setMarca(await res.json());
      } catch { /* segue sem marca */ }
      setCarregandoMarca(false);
    })();
  }, [slug]);

  const acc = marca?.cor || "#1AADE2";

  // Aplica a marca da empresa no app, para o painel já abrir com a identidade certa.
  function aplicarMarca() {
    try {
      const KEY = "fin_brand";
      const cur = JSON.parse(localStorage.getItem(KEY) || "{}");
      const next = { ...cur };
      if (marca?.nome) next.nome = marca.nome;
      if (marca?.logo) next.logo = marca.logo;
      if (marca?.cor) next.cor = marca.cor;
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* ignora */ }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "login") {
        await login(email.trim(), senha);
        aplicarMarca();
        router.push("/minhasmetricas");
      } else {
        await enviarReset(email.trim(), `${window.location.origin}/senha`);
        setMsg("✅ Enviamos um link para o seu e-mail. Abra-o para criar sua senha.");
        setModo("login");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erro";
      setErro(
        /invalid login/i.test(m) ? "E-mail ou senha incorretos." :
        /not configured|não configurado/i.test(m) ? "Sistema em configuração. Tente em instantes." :
        m
      );
    }
    setCarregando(false);
  }

  return (
    <div className="es">
      <style>{CSS(acc)}</style>
      <div className="es-card">
        {marca?.logo
          ? <img className="es-logo" src={marca.logo} alt={marca.nome} />
          : <div className="es-nome">{marca?.nome || (carregandoMarca ? "…" : "Minhas Métricas")}</div>}

        <h1>{modo === "login" ? "Entrar no painel" : "Recuperar acesso"}</h1>
        <p>{modo === "login" ? "Acesse as métricas e finanças da sua empresa." : "Digite seu e-mail e enviaremos um link para criar/redefinir a senha."}</p>

        {!supabaseReady && <div className="es-msg es-err">Sistema em modo demonstração.</div>}
        {erro && <div className="es-msg es-err">{erro}</div>}
        {msg && <div className="es-msg es-ok">{msg}</div>}

        <form onSubmit={enviar}>
          <input className="es-input" type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          {modo === "login" && (
            <input className="es-input" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          )}
          <button className="es-btn" type="submit" disabled={carregando}>
            {carregando ? "Aguarde…" : modo === "login" ? "Entrar →" : "Enviar link"}
          </button>
        </form>

        <button type="button" className="es-link" onClick={() => { setModo(modo === "login" ? "reset" : "login"); setErro(""); setMsg(""); }}>
          {modo === "login" ? "Esqueci minha senha · Primeiro acesso" : "Voltar ao login"}
        </button>

        <div className="es-foot">Powered by Minhas Métricas</div>
      </div>
    </div>
  );
}

const CSS = (acc: string) => `
.es{min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 400px at 50% -10%,${acc}22,transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;-webkit-font-smoothing:antialiased}
.es-card{background:#121212;border:1px solid #222;border-radius:22px;padding:42px 36px;text-align:center;max-width:420px;width:100%}
.es-logo{max-height:80px;max-width:70%;object-fit:contain;margin:0 auto 16px;display:block}
.es-nome{font-size:34px;font-weight:900;letter-spacing:-.03em;margin-bottom:12px;color:${acc}}
.es h1{font-size:25px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.es p{color:#9aa0a6;margin-top:10px;line-height:1.55;font-size:14.5px}
.es form{margin-top:22px;display:flex;flex-direction:column;gap:11px}
.es-input{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:12px;padding:14px 15px;color:#f4f5f7;font-size:15px;font-family:inherit;outline:none}
.es-input:focus{border-color:${acc}}
.es-btn{width:100%;margin-top:4px;background:${acc};color:#06222e;font-weight:800;border:0;border-radius:12px;padding:15px;font-size:16px;cursor:pointer;font-family:inherit}
.es-btn:hover{filter:brightness(1.08)}
.es-btn:disabled{opacity:.6;cursor:default}
.es-link{margin-top:16px;background:none;border:0;color:${acc};font-weight:600;font-size:13.5px;cursor:pointer;font-family:inherit}
.es-msg{margin-top:16px;border-radius:10px;padding:11px 13px;font-size:14px;text-align:left}
.es-err{background:#3a1414;border:1px solid #5b1d1d;color:#ffb4b4}
.es-ok{background:#10331f;border:1px solid #1d5b32;color:#9bf0bd}
.es-foot{margin-top:24px;color:#555;font-size:12px}
`;
