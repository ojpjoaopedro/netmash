"use client";
import React from "react";
import SeletorAno from "@/components/SeletorAno";
import BotaoOcultar from "./ocultar";

const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Barra de meses PADRONIZADA (mesma no Painel financeiro e no Calendário):
// ano + chips Jan..Dez selecionáveis + "Marcar todos" / "Só mês atual" + Ocultar.
export default function BarraMeses({ ano, setAno, sel, setSel }: {
  ano: number;
  setAno?: (a: number) => void;
  sel: Set<number>;
  setSel: (s: Set<number>) => void;
}) {
  const toggleMes = (i: number) => { const n = new Set(sel); if (n.has(i)) n.delete(i); else n.add(i); setSel(n); };
  const btn: React.CSSProperties = { padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".12s" };
  return (
    <div className="card" style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div className="mesbar">
        {setAno && <span className="mesbar-ano"><SeletorAno ano={ano} setAno={setAno} /></span>}
        <div className="mesbar-meses">
          {MES.map((m, i) => { const on = sel.has(i); return (
            <button key={m} onClick={() => toggleMes(i)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: on ? "1px solid var(--brand)" : "1px solid var(--line-2)", background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-ct,#fff)" : "var(--muted)", transition: ".12s" }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>{m}</button>
          ); })}
        </div>
        <span className="mesbar-sep" style={{ width: 1, height: 20, background: "var(--line-2)", margin: "0 3px" }} />
        <div className="mesbar-acoes">
          <button onClick={() => setSel(sel.size === 12 ? new Set([new Date().getMonth()]) : new Set(Array.from({ length: 12 }, (_, i) => i)))} style={btn}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{sel.size === 12 ? "Desmarcar todos" : "Marcar todos"}</button>
          <button onClick={() => setSel(new Set([new Date().getMonth()]))} style={btn}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>Só mês atual</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><BotaoOcultar /></div>
    </div>
  );
}
