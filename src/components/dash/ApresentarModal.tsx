"use client";
import { useState } from "react";
import { ultimosMeses, mesesEntre, rotuloMes } from "@/lib/format";

export default function ApresentarModal({ titulo, onClose, onGerar }: {
  titulo: string;
  onClose: () => void;
  onGerar: (meses: string[], tipo: "deck" | "relatorio") => void;
}) {
  const [modo, setModo] = useState<"preset" | "custom">("preset");
  const [periodo, setPeriodo] = useState(6);
  const [de, setDe] = useState(ultimosMeses(6)[0]);
  const [ate, setAte] = useState(ultimosMeses(1)[0]);

  const meses = modo === "custom" ? mesesEntre(de, ate) : ultimosMeses(periodo);
  const valido = meses.length > 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>🎬 Apresentar</h2>
        <p className="sub" style={{ marginTop: 4 }}>{titulo} · escolha o período e abra.</p>

        <label className="f" style={{ marginTop: 16 }}>Período</label>
        <div className="period" style={{ width: "fit-content", flexWrap: "wrap" }}>
          {[3, 6, 9, 12].map((n) => (
            <button key={n} className={modo === "preset" && periodo === n ? "active" : ""} onClick={() => { setModo("preset"); setPeriodo(n); }}>{n} meses</button>
          ))}
          <button className={modo === "custom" ? "active" : ""} onClick={() => setModo("custom")}>📅 Escolher data</button>
        </div>

        {modo === "custom" && (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field" style={{ margin: 0 }}><label className="f">De</label><input type="month" value={de} onChange={(e) => setDe(e.target.value)} /></div>
            <div className="field" style={{ margin: 0 }}><label className="f">Até</label><input type="month" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          </div>
        )}

        {valido && <p className="sub" style={{ marginTop: 10 }}>{rotuloMes(meses[0])} – {rotuloMes(meses[meses.length - 1])} · {meses.length} {meses.length === 1 ? "mês" : "meses"}</p>}

        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn" onClick={() => onGerar(meses, "deck")} disabled={!valido}>🎬 Apresentação em slides</button>
          <button className="btn ghost" onClick={() => onGerar(meses, "relatorio")} disabled={!valido}>📄 Relatório</button>
        </div>
      </div>
    </div>
  );
}
