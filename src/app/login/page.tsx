"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { login, cadastrarComCodigo, enviarReset, definirSenha } from "@/lib/db";
import { supabaseReady } from "@/lib/supabase";

type Modo = "login" | "cadastro" | "reset" | "novasenha";

/** Splash de entrada: duas frases que entram e saem com animação, bem centralizadas. */
function SplashEntrada({ onFim }: { onFim: () => void }) {
  const frases = ["Enquanto você cuida do seu negócio", "Nós cuidamos dos números"];
  const [i, setI] = useState(0);
  const [saindo, setSaindo] = useState(false);
  useEffect(() => {
    const VISIVEL = 2100, SAIDA = 650;
    const t1 = window.setTimeout(() => setSaindo(true), VISIVEL);
    const t2 = window.setTimeout(() => {
      if (i < frases.length - 1) { setI(i + 1); setSaindo(false); }
      else onFim();
    }, VISIVEL + SAIDA);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const palavras = frases[i].split(" ");
  let idx = 0;
  return (
    <div className="splash-entrada">
      {/* gráfico de evolução no fundo: linha que sobe, sutil e transparente, passando devagar */}
      <svg className="splash-graf" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="splashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="splash-graf-area" fill="url(#splashGrad)"
          d="M-20,180 L40,168 L90,172 L150,140 L210,150 L270,104 L330,116 L390,64 L440,72 L440,240 L-20,240 Z" />
        <path className="splash-graf-linha" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          d="M-20,180 L40,168 L90,172 L150,140 L210,150 L270,104 L330,116 L390,64 L440,72" />
      </svg>
      <p key={i} className={`splash-frase${saindo ? " saindo" : ""}`}>
        {palavras.map((palavra, wi) => (
          <span key={wi}>
            <span className="splash-palavra">
              {[...palavra].map((ch, ci) => (
                <span key={ci} className="splash-letra" style={{ animationDelay: `${(idx++) * 0.035}s` }}>{ch}</span>
              ))}
            </span>
            {wi < palavras.length - 1 ? " " : null}
          </span>
        ))}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);   // olho do campo de senha do login
  const [lembrar, setLembrar] = useState(true);      // "Lembrar de mim": mantém a sessão neste aparelho
  const [senha2, setSenha2] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [entrando, setEntrando] = useState<string | null>(null);   // destino após o splash de entrada

  // Veio do link de e-mail (definir senha de 1º acesso / recuperação)?
  useEffect(() => {
    if (typeof window === "undefined") return;
    // "Lembrar de mim" + pré-preenche o e-mail do último acesso (só se estiver marcado)
    try {
      const lembra = localStorage.getItem("me_lembrar") !== "0";
      setLembrar(lembra);
      if (lembra) { const ultimo = localStorage.getItem("me_ultimo_email"); if (ultimo) setEmail(ultimo); }
    } catch { /* ignore */ }
    const hash = window.location.hash || "";
    const q = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery") || q.get("nova") === "1") { setModo("novasenha"); return; }
    // Veio de um link de compra (?cadastro=1&codigo=...): já abre no cadastro com o código preenchido.
    const c = q.get("codigo");
    if (c || q.get("cadastro") === "1") {
      setModo("cadastro");
      if (c) setCodigo(c);
    }
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "login") {
        // grava a preferência ANTES do login, para a sessão ir pro lugar certo (local x sessão)
        try { localStorage.setItem("me_lembrar", lembrar ? "1" : "0"); } catch { /* ignore */ }
        await login(email.trim(), senha);
        try {
          if (lembrar) localStorage.setItem("me_ultimo_email", email.trim());
          else localStorage.removeItem("me_ultimo_email");
        } catch { /* ignore */ }
        setEntrando("/dashboard/home");
      } else if (modo === "cadastro") {
        await cadastrarComCodigo(nome.trim(), empresa.trim(), email.trim(), senha, codigo.trim());
        await login(email.trim(), senha);
        setEntrando("/guia?novo=1");
      } else if (modo === "reset") {
        await enviarReset(email.trim(), `${window.location.origin}/senha`);
        setMsg("✅ Enviamos um link para o seu e-mail. Abra-o para definir sua senha.");
        setModo("login");
      } else {
        if (senha.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
        if (senha !== senha2) throw new Error("As senhas não conferem.");
        await definirSenha(senha);
        setEntrando("/dashboard/home");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erro";
      setErro(
        /invalid login/i.test(m) ? "E-mail ou senha incorretos." :
        /already registered/i.test(m) ? "Este e-mail já tem conta. Faça login." :
        /not configured|não configurado/i.test(m) ? "Supabase ainda não configurado (modo demonstração)." :
        /session|recovery|expired|token/i.test(m) ? "O link expirou. Peça um novo em 'Esqueci minha senha'." :
        m
      );
    }
    setCarregando(false);
  }

  const titulo = modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar conta" : modo === "reset" ? "Recuperar acesso" : "Definir senha";
  const sub = modo === "login" ? "Acesse o painel da sua empresa"
    : modo === "cadastro" ? "Use o código que você recebeu na compra"
    : modo === "reset" ? "Digite seu e-mail e enviaremos um link"
    : "Crie a senha do seu primeiro acesso";

  if (entrando) return <SplashEntrada onFim={() => router.push(entrando)} />;

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="brand">
          <img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" style={{ height: 56, width: "auto", maxWidth: "88%", objectFit: "contain" }} />
        </div>
        <h1>{titulo}</h1>
        <p className="muted">{sub}</p>

        {!supabaseReady && <div className="err">⚠️ Modo demonstração: o banco ainda não foi conectado. Você pode explorar o app pela página inicial sem login.</div>}
        {erro && <div className="err">{erro}</div>}
        {msg && <div className="ok">{msg}</div>}

        <form onSubmit={enviar}>
          {modo === "cadastro" && (
            <>
              <div className="field"><label className="f">Seu nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
              <div className="field"><label className="f">Nome da empresa</label><input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Padaria do João" required /></div>
            </>
          )}

          {(modo === "login" || modo === "cadastro" || modo === "reset") && (
            <div className="field"><label className="f">E-mail</label><input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          )}

          {(modo === "login" || modo === "cadastro") && (
            <div className="field"><label className="f">Senha</label>
              <div style={{ position: "relative" }}>
                <input type={verSenha ? "text" : "password"} name="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} style={{ paddingRight: 44, width: "100%" }} />
                <button type="button" onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} title={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, padding: 6, cursor: "pointer", color: "#64748b", display: "grid", placeItems: "center" }}>
                  {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {modo === "cadastro" && (
            <div className="field"><label className="f">Código de acesso</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="O código que você recebeu na compra" required /></div>
          )}

          {modo === "login" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "2px 0 14px", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--txt-2, #c4d0f2)" }}>
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                Lembrar de mim
              </label>
              <button type="button" onClick={() => { setModo("reset"); setErro(""); setMsg(""); }}
                style={{ background: "none", border: 0, color: "var(--accent)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                Esqueci minha senha
              </button>
            </div>
          )}

          {modo === "novasenha" && (
            <>
              <div className="field"><label className="f">Nova senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} /></div>
              <div className="field"><label className="f">Repita a senha</label><input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} required minLength={6} /></div>
            </>
          )}

          <button className="btn" type="submit" disabled={carregando} style={{ width: "100%", justifyContent: "center" }}>
            {carregando ? "Aguarde…" : modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar conta" : modo === "reset" ? "Enviar link" : "Salvar senha"}
          </button>
        </form>

        <div className="auth-switch">
          {modo === "cadastro" && <>Já tem conta? <button onClick={() => { setModo("login"); setErro(""); }}>Entrar</button></>}
          {(modo === "reset" || modo === "novasenha") && <>Lembrou? <button onClick={() => { setModo("login"); setErro(""); setMsg(""); }}>Voltar ao login</button></>}
        </div>
      </div>
    </div>
  );
}
