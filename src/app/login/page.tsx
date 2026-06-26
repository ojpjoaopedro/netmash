"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, cadastrar, enviarReset, definirSenha } from "@/lib/db";
import { supabaseReady } from "@/lib/supabase";

type Modo = "login" | "cadastro" | "reset" | "novasenha";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Veio do link de e-mail (definir senha de 1º acesso / recuperação)?
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const q = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery") || q.get("nova") === "1") setModo("novasenha");
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "login") {
        await login(email.trim(), senha);
        router.push("/");
      } else if (modo === "cadastro") {
        await cadastrar(email.trim(), senha, nome.trim(), empresa.trim());
        setMsg("✅ Conta criada! Se a confirmação por e-mail estiver ativa, confirme antes de entrar.");
        setModo("login");
      } else if (modo === "reset") {
        await enviarReset(email.trim(), `${window.location.origin}/login?nova=1`);
        setMsg("✅ Enviamos um link para o seu e-mail. Abra-o para definir sua senha.");
        setModo("login");
      } else {
        if (senha.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
        if (senha !== senha2) throw new Error("As senhas não conferem.");
        await definirSenha(senha);
        setMsg("✅ Senha definida! Entrando…");
        router.push("/");
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
    : modo === "cadastro" ? "Comece a controlar suas finanças"
    : modo === "reset" ? "Digite seu e-mail e enviaremos um link"
    : "Crie a senha do seu primeiro acesso";

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="brand"><span className="fallback">Minha <b>Empresa</b></span></div>
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
            <div className="field"><label className="f">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          )}

          {(modo === "login" || modo === "cadastro") && (
            <div className="field"><label className="f">Senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} /></div>
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

        {modo === "login" && (
          <button type="button" onClick={() => { setModo("reset"); setErro(""); setMsg(""); }}
            style={{ marginTop: 12, background: "none", border: 0, color: "var(--accent)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Esqueci minha senha · Primeiro acesso
          </button>
        )}

        <div className="auth-switch">
          {modo === "login" && <>Não tem conta? <button onClick={() => { setModo("cadastro"); setErro(""); }}>Cadastre-se</button></>}
          {modo === "cadastro" && <>Já tem conta? <button onClick={() => { setModo("login"); setErro(""); }}>Entrar</button></>}
          {(modo === "reset" || modo === "novasenha") && <>Lembrou? <button onClick={() => { setModo("login"); setErro(""); setMsg(""); }}>Voltar ao login</button></>}
        </div>
      </div>
    </div>
  );
}
