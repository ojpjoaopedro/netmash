"use client";
import { useEffect, useState } from "react";
import { FileText, X, Check } from "lucide-react";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";
import PoliticaPrivacidade from "./PoliticaPrivacidade";
import ServicosFinanceiros from "./ServicosFinanceiros";
import ProtecaoDeDados from "./ProtecaoDeDados";

type Doc = { id?: string; titulo: string; sub: string; corpo: string };

const DOCS: Doc[] = [
  {
    id: "privacidade",
    titulo: "Política de Privacidade",
    sub: "Aplicável a todos os clientes da plataforma, sejam pequenas empresas ou empresas contábeis.",
    corpo: "",
  },
  {
    id: "servicos",
    titulo: "Serviços Financeiros",
    sub: "Para empresas que utilizam os serviços de gestão financeira da plataforma.",
    corpo: "",
  },
  {
    id: "protecao",
    titulo: "Proteção de dados",
    sub: "Como tratamos e protegemos os dados pessoais, em conformidade com a LGPD.",
    corpo: "",
  },
];

const CHAVE_DOC = (id: string) => `me_termos_aceite:${id}`;

export default function TermosDeUso() {
  const [aberto, setAberto] = useState<Doc | null>(null);
  const [aceites, setAceites] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const a: Record<string, boolean> = {};
      for (const d of DOCS) if (d.id) a[d.id] = localStorage.getItem(CHAVE_DOC(d.id)) === "true";
      setAceites(a);
    } catch { /* ignore */ }
  }, []);
  const aceitarDoc = (id: string) => {
    const novo = { ...aceites, [id]: true };
    setAceites(novo);
    try {
      localStorage.setItem(CHAVE_DOC(id), "true");
      salvarEstadoRemoto(CHAVE_DOC(id), "true");
      const todos = DOCS.every((d) => d.id && novo[d.id]);
      const agreg = todos ? "true" : "false";
      localStorage.setItem("me_termos_aceite", agreg);
      salvarEstadoRemoto("me_termos_aceite", agreg);
      window.dispatchEvent(new Event("me:termos"));
    } catch { /* ignore */ }
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {DOCS.map((d) => {
        const ok = !!(d.id && aceites[d.id]);
        return (
          <div key={d.titulo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", background: "var(--bg-2)", border: `1px solid ${ok ? "rgba(16,185,129,.4)" : "var(--line)"}`, borderRadius: 16, padding: "26px 28px" }}>
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <b style={{ fontSize: 22, letterSpacing: "-.02em" }}>{d.titulo}</b>
              <p className="sub" style={{ marginTop: 8, lineHeight: 1.55, maxWidth: 620 }}>{d.sub}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, flexShrink: 0 }}>
              <button className="btn" onClick={() => setAberto(d)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 20px", fontSize: 14 }}>
                <FileText size={16} /> Ler Termos
              </button>
              {ok ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#10B981", background: "rgba(16,185,129,.14)", padding: "8px 14px", borderRadius: 99 }}>
                  <Check size={15} /> Termos aceitos
                </span>
              ) : (
                <button className="btn ghost" onClick={() => d.id && aceitarDoc(d.id)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}>
                  <Check size={15} /> Aceitar os termos
                </button>
              )}
            </div>
          </div>
        );
      })}

      {aberto && (
        <div onClick={() => setAberto(null)} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, padding: 26, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <b style={{ fontSize: 19 }}>{aberto.titulo}</b>
              <button onClick={() => setAberto(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            {aberto.id === "privacidade" ? <PoliticaPrivacidade />
              : aberto.id === "servicos" ? <ServicosFinanceiros />
              : aberto.id === "protecao" ? <ProtecaoDeDados />
              : <p style={{ lineHeight: 1.7, fontSize: 14, color: "var(--txt-2)" }}>{aberto.corpo}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn" onClick={() => setAberto(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
