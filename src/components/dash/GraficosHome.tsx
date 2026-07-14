"use client";
import { DollarSign, ShoppingCart, Megaphone, BarChart3, ArrowRight } from "lucide-react";

const AREAS_G = [
  { key: "financas", label: "Finanças", cor: "#10B981", Icon: DollarSign },
  { key: "comercial", label: "Comercial", cor: "#1AADE2", Icon: ShoppingCart },
  { key: "marketing", label: "Marketing", cor: "#8b5cf6", Icon: Megaphone },
];

export default function GraficosHome({ onOpen, mostrarMarketing = true }: { onOpen: (v: string) => void; mostrarMarketing?: boolean }) {
  const areas = AREAS_G.filter((a) => mostrarMarketing || a.key !== "marketing");
  return (
    <>
      <div className="section-title">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)" }}><BarChart3 size={22} color="var(--accent)" /></span>
          <h2 style={{ margin: 0 }}>Gráficos</h2>
        </div>
      </div>
      <div className="grid" style={{ gap: 14 }}>
        {areas.map((a) => (
          <button key={a.key} className="card" onClick={() => onOpen(a.key)}
            style={{ borderTop: `3px solid ${a.cor}`, textAlign: "left", cursor: "pointer", display: "block", position: "relative", padding: "22px 22px" }}>
            <span style={{ width: 50, height: 50, borderRadius: 14, display: "grid", placeItems: "center", background: a.cor + "22", color: a.cor }}>
              <a.Icon size={24} />
            </span>
            <h3 style={{ margin: "16px 0 8px", fontSize: 20 }}>{a.label}</h3>
            <span style={{ color: a.cor, fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>Ver gráficos <ArrowRight size={15} /></span>
            <BarChart3 size={18} style={{ position: "absolute", top: 20, right: 20, opacity: .3 }} />
          </button>
        ))}
      </div>
    </>
  );
}
