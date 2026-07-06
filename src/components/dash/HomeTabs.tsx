"use client";
import { useEffect, useState } from "react";
import { HeartPulse, Smile, UserMinus, Share2, Users, Rocket, Pencil, Check } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { Metrica, def, valorMes } from "@/lib/indicadores";
import ResumoHome from "./ResumoHome";
import FinancasDashboard from "./FinancasDashboard";

type Tab = "resumo" | "faturamento" | "satisfacao" | "iniciativas";
const TABS: { k: Tab; label: string }[] = [
  { k: "resumo", label: "Resumo" }, { k: "faturamento", label: "Faturamento" },
  { k: "satisfacao", label: "Satisfação" }, { k: "iniciativas", label: "Iniciativas" },
];

export default function HomeTabs({ lancs, clientes, metrs, saldoInicial, nome, onLancar, onImportar, reload }: { lancs: Lancamento[]; clientes: Cliente[]; metrs: Metrica[]; saldoInicial: number; nome: string; onLancar?: () => void; onImportar?: () => void; reload?: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ flexShrink: 0, background: tab === t.k ? "var(--accent)" : "transparent", color: tab === t.k ? "#06222e" : "var(--muted)", border: tab === t.k ? "0" : "1px solid var(--line-2)", borderRadius: 99, padding: "8px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>
      {tab === "resumo" && <ResumoHome lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} nome={nome} />}
      {tab === "faturamento" && <FinancasDashboard lancs={lancs} saldoInicial={saldoInicial} onLancar={onLancar} onImportar={onImportar} reload={reload} />}
      {tab === "satisfacao" && <Satisfacao metrs={metrs} />}
      {tab === "iniciativas" && <Iniciativas />}
    </>
  );
}

function Satisfacao({ metrs }: { metrs: Metrica[] }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const valP = (key: string) => { const d = def(key); if (d?.agg === "last") { for (let i = meses.length - 1; i >= 0; i--) { const m = valorMes(metrs, key, meses[i]); if (m) return m.value; } return 0; } return meses.reduce((a, m) => a + (valorMes(metrs, key, m)?.value ?? 0), 0); };
  const KPIS = [
    { icon: <Users size={18} />, cor: "#8b5cf6", label: "Clientes ativos", v: valP("clientes_ativos"), suf: "" },
    { icon: <Smile size={18} />, cor: "#10B981", label: "NPS", v: valP("nps"), suf: "" },
    { icon: <UserMinus size={18} />, cor: "#EF4444", label: "Churn", v: valP("churn"), suf: "%" },
    { icon: <Share2 size={18} />, cor: "#F59E0B", label: "Indicações", v: valP("indicacoes"), suf: "" },
  ];
  return (
    <>
      <div className="section-title"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><HeartPulse size={20} color="#EF4444" /><h2 style={{ margin: 0 }}>Satisfação do cliente</h2></div></div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {KPIS.map((k, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: k.cor + "22", color: k.cor }}>{k.icon}</span>
            <b style={{ fontSize: 24, display: "block", marginTop: 10 }}>{k.v ? k.v + k.suf : "—"}</b>
            <small className="sub">{k.label}</small>
          </div>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 12, fontSize: 12 }}>Preencha esses números na aba <b>Saúde do Cliente</b> → &ldquo;Editar dados&rdquo;.</p>
    </>
  );
}

function Iniciativas() {
  const [txt, setTxt] = useState("");
  const [editando, setEditando] = useState(false);
  const [rasc, setRasc] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem("me_iniciativas") || ""); }, []);
  function salvar() { localStorage.setItem("me_iniciativas", rasc); setTxt(rasc); setEditando(false); }
  return (
    <>
      <div className="section-title"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Rocket size={20} color="var(--accent)" /><h2 style={{ margin: 0 }}>Iniciativas</h2></div>
        {editando ? <button className="btn sm" onClick={salvar}><Check size={14} /> Salvar</button> : <button className="btn ghost sm" onClick={() => { setRasc(txt); setEditando(true); }}><Pencil size={13} /> Editar</button>}
      </div>
      <div className="card">
        {editando ? (
          <textarea value={rasc} onChange={(e) => setRasc(e.target.value)} rows={8} placeholder={"Liste as iniciativas e metas estratégicas do período…\n\nEx:\n• Lançar novo produto até Set\n• Reduzir churn para 3%\n• Contratar 2 vendedores"}
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        ) : txt ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14.5 }}>{txt}</p>
          : <p className="sub" style={{ fontStyle: "italic" }}>Nenhuma iniciativa ainda. Clique em &ldquo;Editar&rdquo; para escrever o plano estratégico do período.</p>}
      </div>
    </>
  );
}
