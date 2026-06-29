"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Marca = { nome: string; logo: string | null; cor: string | null };
type Estado = "carregando" | "ok" | "naoencontrada";

export default function EmpresaSlug() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.slug || "");
  const [estado, setEstado] = useState<Estado>("carregando");
  const [marca, setMarca] = useState<Marca | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { setEstado("naoencontrada"); return; }
        setMarca(await res.json()); setEstado("ok");
      } catch { setEstado("naoencontrada"); }
    })();
  }, [slug]);

  const acc = marca?.cor || "#1AADE2";

  return (
    <div className="es">
      <style>{CSS}</style>
      <div className="es-card">
        {estado === "carregando" && <div className="es-spin" />}
        {estado === "naoencontrada" && (
          <>
            <h1>Página não encontrada</h1>
            <p>Não achamos uma empresa em <b>/{slug}</b>.</p>
            <a className="es-btn" style={{ background: acc }} href="/login">Ir para o login</a>
          </>
        )}
        {estado === "ok" && marca && (
          <>
            {marca.logo
              ? <img className="es-logo" src={marca.logo} alt={marca.nome} />
              : <div className="es-nome" style={{ color: acc }}>{marca.nome}</div>}
            <h1>Painel de <span style={{ color: acc }}>{marca.nome}</span></h1>
            <p>Acompanhe as métricas e finanças da sua empresa.</p>
            <button className="es-btn" style={{ background: acc }} onClick={() => router.push("/login")}>Entrar no painel →</button>
            <div className="es-foot">Powered by Minhas Métricas</div>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.es{min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 400px at 50% -10%,rgba(26,173,226,.14),transparent),#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;-webkit-font-smoothing:antialiased}
.es-card{background:#121212;border:1px solid #222;border-radius:22px;padding:48px 40px;text-align:center;max-width:440px;width:100%}
.es-logo{max-height:90px;max-width:70%;object-fit:contain;margin:0 auto 18px;display:block}
.es-nome{font-size:38px;font-weight:900;letter-spacing:-.03em;margin-bottom:14px}
.es h1{font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.es p{color:#9aa0a6;margin-top:12px;line-height:1.6}
.es-btn{display:inline-block;margin-top:26px;color:#06222e;font-weight:800;border:0;border-radius:99px;padding:15px 30px;font-size:16px;cursor:pointer;font-family:inherit;text-decoration:none}
.es-btn:hover{filter:brightness(1.08)}
.es-foot{margin-top:26px;color:#555;font-size:12px}
.es-spin{width:32px;height:32px;border:3px solid #222;border-top-color:#1AADE2;border-radius:50%;animation:esspin .8s linear infinite;margin:20px auto}
@keyframes esspin{to{transform:rotate(360deg)}}
`;
