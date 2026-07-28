"use client";
import { useEffect, useState } from "react";
import { X, Smartphone, Share, MoreVertical, Plus, Copy, Check } from "lucide-react";

/** Card promocional "Para você" + tutorial de como usar o link como app no celular. */
export default function PromoParaVoce() {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"android" | "ios">("android");
  const [url, setUrl] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { if (typeof window !== "undefined") setUrl(window.location.origin + "/minhasmetricas"); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const copiar = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopiado(true); window.setTimeout(() => setCopiado(false), 1800); }).catch(() => {});
  };

  const passos = aba === "android" ? [
    { ic: <Smartphone size={16} />, t: <>Abra este endereço no navegador <b>Chrome</b> do celular.</> },
    { ic: <MoreVertical size={16} />, t: <>Toque no menu (três pontinhos) no canto superior direito.</> },
    { ic: <Plus size={16} />, t: <>Toque em <b>&ldquo;Adicionar à tela inicial&rdquo;</b> (ou &ldquo;Instalar app&rdquo;).</> },
    { ic: <Check size={16} />, t: <>Confirme em <b>&ldquo;Adicionar&rdquo;</b>. O ícone aparece na tela inicial como um app.</> },
  ] : [
    { ic: <Smartphone size={16} />, t: <>Abra este endereço no <b>Safari</b> do iPhone.</> },
    { ic: <Share size={16} />, t: <>Toque no botão de <b>compartilhar</b> (quadrado com uma seta para cima), na barra de baixo.</> },
    { ic: <Plus size={16} />, t: <>Role e toque em <b>&ldquo;Adicionar à Tela de Início&rdquo;</b>.</> },
    { ic: <Check size={16} />, t: <>Toque em <b>&ldquo;Adicionar&rdquo;</b> no canto superior direito. Vira um atalho como app.</> },
  ];

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <b style={{ fontSize: 16, marginBottom: 14 }}>Para você</b>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/banner-metricas.png" alt="Métricas no celular"
        style={{ width: "100%", borderRadius: 14, display: "block", objectFit: "cover" }} />

      <div style={{ marginTop: 16, flex: 1 }}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 6 }}>Métricas no celular</b>
        <p className="sub" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          Acompanhe todas as suas métricas na palma da mão. Analise e tome decisões de onde estiver.
        </p>
      </div>

      <button className="btn" style={{ marginTop: 16, alignSelf: "flex-start" }} onClick={() => setAberto(true)}>Quero no meu celular</button>

      {aberto && (
        <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460, padding: 22, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Smartphone size={19} /></span>
                <div>
                  <b style={{ fontSize: 16 }}>Usar no celular como app</b>
                  <div className="sub" style={{ fontSize: 12 }}>Adicione um atalho na tela inicial e abra como um aplicativo.</div>
                </div>
              </div>
              <button className="iconbtn" title="Fechar" onClick={() => setAberto(false)}><X size={18} /></button>
            </div>

            {/* link para abrir no celular */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
              <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{url}</span>
              <button className="btn ghost sm" onClick={copiar} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
              </button>
            </div>
            <p className="sub" style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}>Copie o link e abra no navegador do celular. Depois siga os passos abaixo.</p>

            {/* abas Android / iOS */}
            <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)", marginBottom: 14 }}>
              {(["android", "ios"] as const).map((k) => (
                <button key={k} onClick={() => setAba(k)}
                  style={{ padding: "6px 16px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                    background: aba === k ? "var(--brand)" : "transparent", color: aba === k ? "var(--brand-ct,#fff)" : "var(--muted)" }}>
                  {k === "android" ? "Android" : "iPhone (iOS)"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {passos.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--brand)", color: "var(--brand-ct,#fff)", fontSize: 12.5, fontWeight: 800 }}>{i + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, lineHeight: 1.5, paddingTop: 3 }}>
                    <span style={{ color: "var(--brand)", flexShrink: 0 }}>{p.ic}</span>
                    <span>{p.t}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="sub" style={{ fontSize: 12, marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              Pronto: o ícone do <b>Minhas Métricas</b> fica salvo na tela inicial e abre em tela cheia, igual a um aplicativo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
