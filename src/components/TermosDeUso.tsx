"use client";
import { useState } from "react";
import { FileText, X } from "lucide-react";
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

export default function TermosDeUso() {
  const [aberto, setAberto] = useState<Doc | null>(null);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {DOCS.map((d) => (
        <div key={d.titulo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: "26px 28px" }}>
          <div style={{ minWidth: 0, flex: "1 1 320px" }}>
            <b style={{ fontSize: 22, letterSpacing: "-.02em" }}>{d.titulo}</b>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.55, maxWidth: 620 }}>{d.sub}</p>
          </div>
          <button className="btn" onClick={() => setAberto(d)} style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, padding: "11px 20px", fontSize: 14 }}>
            <FileText size={16} /> Ler Termos
          </button>
        </div>
      ))}

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
