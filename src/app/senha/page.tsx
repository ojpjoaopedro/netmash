"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseReady } from "@/lib/supabase";

export default function SenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);       // sessão do link de e-mail detectada
  const [verificando, setVerificando] = useState(true);
  const [slug, setSlug] = useState("");              // slug da empresa do usuário (p/ voltar ao login dela)
  const [email, setEmail] = useState("");            // e-mail que cadastramos (vem do link)
  const [emailReenvio, setEmailReenvio] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  // O link do e-mail traz um token; o Supabase cria a sessão de recuperação
  // automaticamente ao abrir esta página. Aqui só pegamos o e-mail da pessoa.
  useEffect(() => {
    if (!supabase) { setVerificando(false); return; }
    let done = false;
    const marcar = (em?: string | null) => {
      if (done) return; done = true;
      setEmail(em ?? ""); setPronto(true); setVerificando(false);
      // Descobre o slug da empresa do usuário, para voltar ao login dela.
      supabase!.from("empresas").select("slug").maybeSingle()
        .then(({ data }) => { const sl = (data as { slug?: string } | null)?.slug; if (sl) setSlug(sl); });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.user) marcar(session?.user?.email);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) marcar(data.session.user.email);
      else setTimeout(() => setVerificando(false), 1600); // tempo do token ser processado
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg("");
    if (senha.length < 6) { setErro("A senha precisa ter ao menos 6 caracteres."); return; }
    if (senha !== senha2) { setErro("As senhas não conferem."); return; }
    setCarregando(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password: senha });
      if (error) throw error;
      setMsg("✅ Senha criada! Redirecionando para o login…");
      await supabase!.auth.signOut();
      setTimeout(() => router.push(slug ? `/${slug}/login` : "/login"), 1500);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erro";
      setErro(/session|recovery|expired|token|jwt/i.test(m)
        ? "O link expirou. Peça um novo logo abaixo." : m);
      setPronto(false); // cai no modo de reenvio
    }
    setCarregando(false);
  }

  async function reenviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg(""); setCarregando(true);
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(emailReenvio.trim(), {
        redirectTo: `${window.location.origin}/senha`,
      });
      if (error) throw error;
      setMsg("✅ Enviamos um novo link para o seu e-mail. Abra-o para criar sua senha.");
    } catch {
      setErro("Não foi possível enviar. Confira se o e-mail está correto.");
    }
    setCarregando(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="brand"><span className="fallback">Minhas <b>Métricas</b></span></div>

        {!supabaseReady ? (
          <>
            <h1>Indisponível</h1>
            <p className="muted">O banco ainda não foi conectado (modo demonstração).</p>
          </>
        ) : verificando ? (
          <>
            <h1>Criar senha</h1>
            <p className="muted">Validando seu link de acesso…</p>
          </>
        ) : pronto ? (
          <>
            <h1>Bem-vindo(a)! 🎉</h1>
            <p className="muted">Crie a senha do seu primeiro acesso.</p>
            {erro && <div className="err">{erro}</div>}
            {msg && <div className="ok">{msg}</div>}
            <form onSubmit={salvar}>
              <div className="field">
                <label className="f">Seu e-mail</label>
                <input type="email" value={email} readOnly disabled style={{ opacity: 0.75 }} />
              </div>
              <div className="field">
                <label className="f">Crie uma senha</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" autoFocus />
              </div>
              <div className="field">
                <label className="f">Repita a senha</label>
                <input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} required minLength={6} />
              </div>
              <button className="btn" type="submit" disabled={carregando} style={{ width: "100%", justifyContent: "center" }}>
                {carregando ? "Salvando…" : "Salvar senha e continuar"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Criar senha</h1>
            <p className="muted">Abra esta página pelo link que enviamos no seu e-mail. Não recebeu ou o link expirou? Reenviamos para você:</p>
            {erro && <div className="err">{erro}</div>}
            {msg && <div className="ok">{msg}</div>}
            <form onSubmit={reenviar}>
              <div className="field">
                <label className="f">Seu e-mail</label>
                <input type="email" value={emailReenvio} onChange={(e) => setEmailReenvio(e.target.value)} required placeholder="O e-mail do seu cadastro" />
              </div>
              <button className="btn" type="submit" disabled={carregando} style={{ width: "100%", justifyContent: "center" }}>
                {carregando ? "Enviando…" : "Reenviar link de acesso"}
              </button>
            </form>
          </>
        )}

        <div className="auth-switch">
          Já tem senha? <button onClick={() => router.push("/login")}>Entrar</button>
        </div>
      </div>
    </div>
  );
}
