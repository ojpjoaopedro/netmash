"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, cadastrar } from "@/lib/db";
import { supabaseReady } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "login") {
        await login(email.trim(), senha);
        router.push("/");
      } else {
        await cadastrar(email.trim(), senha, nome.trim(), empresa.trim());
        setMsg("✅ Conta criada! Se a confirmação por e-mail estiver ativa, confirme antes de entrar.");
        setModo("login");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erro";
      setErro(
        /invalid login/i.test(m) ? "E-mail ou senha incorretos." :
        /already registered/i.test(m) ? "Este e-mail já tem conta. Faça login." :
        /not configured/i.test(m) ? "Supabase ainda não configurado (rodando em modo demonstração)." :
        m
      );
    }
    setCarregando(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="brand"><span className="fallback">Net<b>Mash</b></span></div>
        <h1>{modo === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="muted">{modo === "login" ? "Acesse o painel da sua empresa" : "Comece a controlar suas finanças"}</p>

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
          <div className="field"><label className="f">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label className="f">Senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} /></div>
          <button className="btn" type="submit" disabled={carregando} style={{ width: "100%", justifyContent: "center" }}>
            {carregando ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="auth-switch">
          {modo === "login" ? (
            <>Não tem conta? <button onClick={() => { setModo("cadastro"); setErro(""); }}>Cadastre-se</button></>
          ) : (
            <>Já tem conta? <button onClick={() => { setModo("login"); setErro(""); }}>Entrar</button></>
          )}
        </div>
      </div>
    </div>
  );
}
