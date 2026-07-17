"use client";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, ClipboardList, Cake, Pencil, Check } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { resumo } from "@/lib/calc";
import { fmt } from "./Kit";

function saudacao() { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }
function dataHoje() {
  try { return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

/** Bloco editável (Pulso / Aniversários) — dentro do painel, sem borda de card. */
function NotaEditavel({ chave, icon, titulo, placeholder }: { chave: string; icon: React.ReactNode; titulo: string; placeholder: string }) {
  const [txt, setTxt] = useState("");
  const [editando, setEditando] = useState(false);
  const [rasc, setRasc] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem(chave) || ""); }, [chave]);
  function salvar() { localStorage.setItem(chave, rasc); setTxt(rasc); setEditando(false); }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon}<b style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)" }}>{titulo}</b></div>
        {editando
          ? <button className="btn sm" onClick={salvar}><Check size={13} /> Salvar</button>
          : <button className="btn ghost sm" onClick={() => { setRasc(txt); setEditando(true); }}><Pencil size={12} /> Editar</button>}
      </div>
      {editando ? (
        <textarea value={rasc} onChange={(e) => setRasc(e.target.value)} rows={3} placeholder={placeholder}
          style={{ width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
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

  const KPIS = [
    { icon: <DollarSign size={17} />, cor: "#10B981", val: fmt(r.faturamento, "BRL"), label: "Faturamento", destaque: false },
    { icon: <TrendingUp size={17} />, cor: "#8b5cf6", val: String(novos), label: "Novos clientes", destaque: false },
    { icon: <Wallet size={17} />, cor: "#1AADE2", val: fmt(r.saldo, "BRL"), label: "Saldo em caixa", destaque: true },
  ];

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Saudação */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "rgba(122,208,234,.85)", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize", fontStyle: "italic", marginTop: 3 }}>{dataHoje()}</div>
      </div>

      {/* 3 KPIs do mesmo tamanho (3º destacado) */}
      {/* minmax(0,1fr) é essencial: com "1fr" as colunas não encolhem e o 3º card vaza */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {KPIS.map((k, i) => (
          <div key={i} style={{
            padding: 13, borderRadius: 16, minHeight: 116, minWidth: 0, display: "flex", flexDirection: "column", gap: 8,
            border: k.destaque ? "0" : "1px solid var(--line)",
            background: k.destaque ? "linear-gradient(150deg, #1AADE2, #0c6e9e)" : "rgba(255,255,255,.025)",
            boxShadow: k.destaque ? "0 12px 28px -12px rgba(26,173,226,.6)" : "none",
            color: k.destaque ? "#fff" : "var(--txt)",
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: k.destaque ? "rgba(255,255,255,.2)" : k.cor + "22", color: k.destaque ? "#fff" : k.cor, flexShrink: 0 }}>{k.icon}</span>
            <b style={{ fontSize: "clamp(13px, 3.7vw, 18px)", letterSpacing: "-.02em", lineHeight: 1.15, marginTop: "auto", minWidth: 0, overflowWrap: "anywhere" }}>{k.val}</b>
            <small style={{ textTransform: "uppercase", letterSpacing: ".04em", fontSize: 9, fontWeight: 700, lineHeight: 1.3, color: k.destaque ? "rgba(255,255,255,.9)" : "var(--muted)" }}>{k.label}</small>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
      <NotaEditavel chave="me_pulso" icon={<ClipboardList size={16} color="var(--accent)" />} titulo="Pulso da semana"
        placeholder="Nenhum lembrete ainda. Clique em “Editar” para adicionar os avisos da semana." />

      <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
      <NotaEditavel chave="me_aniversarios" icon={<Cake size={16} color="#EC4899" />} titulo="Aniversários do mês"
        placeholder="Adicione os aniversariantes do mês. Ex: 🎂 João — 16/07" />
    </div>
  );
}
