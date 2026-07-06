"use client";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, ClipboardList, Cake, Pencil, Check } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { brl } from "@/lib/format";
import { resumo } from "@/lib/calc";

function saudacao() { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }
function dataHoje() {
  try { return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

/** Card de nota editável (Pulso / Aniversários). */
function NotaEditavel({ chave, icon, titulo, placeholder }: { chave: string; icon: React.ReactNode; titulo: string; placeholder: string }) {
  const [txt, setTxt] = useState("");
  const [editando, setEditando] = useState(false);
  const [rasc, setRasc] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem(chave) || ""); }, [chave]);
  function salvar() { localStorage.setItem(chave, rasc); setTxt(rasc); setEditando(false); }
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon}<b style={{ fontSize: 14 }}>{titulo}</b></div>
        {editando
          ? <button className="btn sm" onClick={salvar}><Check size={14} /> Salvar</button>
          : <button className="btn ghost sm" onClick={() => { setRasc(txt); setEditando(true); }}><Pencil size={13} /> Editar</button>}
      </div>
      {editando ? (
        <textarea value={rasc} onChange={(e) => setRasc(e.target.value)} rows={4} placeholder={placeholder}
          style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
      ) : txt ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14 }}>{txt}</p>
        : <p className="sub" style={{ fontStyle: "italic" }}>{placeholder}</p>}
    </div>
  );
}

export default function ResumoHome({ lancs, clientes, saldoInicial, nome }: { lancs: Lancamento[]; clientes: Cliente[]; saldoInicial: number; nome: string }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const r = resumo(lancs, meses, saldoInicial);
  const novos = clientes.filter((c) => (c.criado_em || "").slice(0, 4) === ano).length || clientes.length;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize" }}>{dataHoje()}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        {/* Faturamento */}
        <div className="card" style={{ padding: 16 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "#10B98122", color: "#10B981" }}><DollarSign size={19} /></span>
          <b style={{ fontSize: 21, display: "block", marginTop: 10, letterSpacing: "-.02em" }}>{brl(r.faturamento)}</b>
          <small className="sub" style={{ textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10.5 }}>Faturamento</small>
        </div>
        {/* Novos clientes */}
        <div className="card" style={{ padding: 16 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "#8b5cf622", color: "#8b5cf6" }}><TrendingUp size={19} /></span>
          <b style={{ fontSize: 21, display: "block", marginTop: 10 }}>{novos}</b>
          <small className="sub" style={{ textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10.5 }}>Novos clientes</small>
        </div>
        {/* Saldo em caixa — card destacado */}
        <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, var(--accent), #0d7fa8)", border: "0", color: "#fff" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(255,255,255,.2)" }}><Wallet size={19} /></span>
          <b style={{ fontSize: 21, display: "block", marginTop: 10, color: "#fff" }}>{brl(r.saldo)}</b>
          <small style={{ textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10.5, opacity: .9 }}>Saldo em caixa</small>
        </div>
      </div>

      <NotaEditavel chave="me_pulso" icon={<ClipboardList size={18} color="var(--accent)" />} titulo="Pulso da Semana"
        placeholder="Nenhum lembrete ainda. Clique em “Editar” para adicionar os avisos da semana." />
      <NotaEditavel chave="me_aniversarios" icon={<Cake size={18} color="#EC4899" />} titulo="Aniversários do mês"
        placeholder="Adicione os aniversariantes do mês. Ex: 🎂 João — 16/07" />
    </>
  );
}
