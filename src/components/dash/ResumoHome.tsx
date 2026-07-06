"use client";
import { useEffect, useState } from "react";
import { DollarSign, UserPlus, Wallet, ClipboardList, Pencil, Check } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { brl } from "@/lib/format";
import { resumo } from "@/lib/calc";

function saudacao() { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }
function dataHoje() {
  try { return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default function ResumoHome({ lancs, clientes, saldoInicial, nome }: { lancs: Lancamento[]; clientes: Cliente[]; saldoInicial: number; nome: string }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const r = resumo(lancs, meses, saldoInicial);
  const novos = clientes.filter((c) => (c.criado_em || "").slice(0, 4) === ano).length || clientes.length;

  const [pulso, setPulso] = useState("");
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setPulso(localStorage.getItem("me_pulso") || "");
  }, []);
  function salvarPulso() {
    localStorage.setItem("me_pulso", rascunho);
    setPulso(rascunho); setEditando(false);
  }

  const KPIS = [
    { icon: <DollarSign size={20} />, cor: "#10B981", label: "Faturamento", valor: brl(r.faturamento) },
    { icon: <UserPlus size={20} />, cor: "#1AADE2", label: "Novos clientes", valor: String(novos) },
    { icon: <Wallet size={20} />, cor: r.lucro >= 0 ? "#10B981" : "#EF4444", label: r.lucro >= 0 ? "Lucro" : "Prejuízo", valor: brl(r.lucro) },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize" }}>{dataHoje()}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
        {KPIS.map((k, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: k.cor + "22", color: k.cor }}>{k.icon}</span>
            <b style={{ fontSize: 24, display: "block", marginTop: 12, letterSpacing: "-.02em" }}>{k.valor}</b>
            <small className="sub" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 11 }}>{k.label}</small>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ClipboardList size={18} color="var(--accent)" /><b style={{ fontSize: 14.5 }}>Pulso da Semana</b></div>
          {editando
            ? <button className="btn sm" onClick={salvarPulso}><Check size={14} /> Salvar</button>
            : <button className="btn ghost sm" onClick={() => { setRascunho(pulso); setEditando(true); }}><Pencil size={13} /> Editar</button>}
        </div>
        {editando ? (
          <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={4} placeholder="Escreva os avisos e prioridades da semana para o time…"
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        ) : pulso ? (
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{pulso}</p>
        ) : (
          <p className="sub" style={{ fontStyle: "italic" }}>Nenhum lembrete ainda. Clique em &ldquo;Editar&rdquo; para adicionar os avisos da semana.</p>
        )}
      </div>
    </>
  );
}
