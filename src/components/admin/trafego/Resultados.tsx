"use client";
/** Aba Resultados: tabela métricas x campanhas (por semana ou mês inteiro), evolução semanal e meta de leads. */
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Target } from "lucide-react";
import { CARD, LBL, INP, authHeaders, GraficoSemanas } from "./shared";
import {
  somar, listaSemanas, brl, num, pct, mesLabel, type Resultado, type Agg,
} from "@/lib/trafego";

type LinhaMetrica = { label: string; forte?: boolean; calc: (a: Agg) => string };
const LINHAS: LinhaMetrica[] = [
  { label: "Valor investido", forte: true, calc: (a) => brl(a.investido) },
  { label: "Impressões", calc: (a) => (a.impressoes > 0 ? num(a.impressoes) : "—") },
  { label: "CPM (custo/mil)", calc: (a) => (a.impressoes > 0 ? brl((a.investido / a.impressoes) * 1000) : "—") },
  { label: "Cliques", calc: (a) => num(a.cliques) },
  { label: "CPC (custo/clique)", calc: (a) => (a.cliques > 0 ? brl(a.investido / a.cliques) : "—") },
  { label: "CTR (cliques ÷ impressões)", calc: (a) => (a.impressoes > 0 ? pct((a.cliques / a.impressoes) * 100) : "—") },
  { label: "Leads gerados", forte: true, calc: (a) => num(a.leads) },
  { label: "CPL (custo/lead)", calc: (a) => (a.leads > 0 ? brl(a.investido / a.leads) : "—") },
  { label: "Conversão cliques → leads", calc: (a) => (a.cliques > 0 ? pct((a.leads / a.cliques) * 100) : "—") },
  { label: "Leads plataforma", calc: (a) => num(a.leads_plataforma) },
  { label: "Leads planilha", calc: (a) => num(a.leads_planilha) },
  { label: "Tx real (plat ÷ planilha)", calc: (a) => (a.leads_planilha > 0 ? pct((a.leads_plataforma / a.leads_planilha) * 100) : "—") },
];

type Editar = Partial<Resultado> & { mes: string };

export default function Resultados({ rows, mes, metasLeads, reload }: { rows: Resultado[]; mes: string; metasLeads: Record<string, number>; reload: () => void }) {
  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [editar, setEditar] = useState<Editar | null>(null);
  const doMes = useMemo(() => rows.filter((r) => r.mes === mes), [rows, mes]);

  const apagar = async (r: Resultado) => {
    if (!confirm(`Apagar a campanha "${r.campanha}" da semana ${r.semana}?`)) return;
    await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "apagar-campanha", id: r.id }) });
    reload();
  };

  // Mês inteiro: agrega cada campanha somando as semanas.
  const porCampanhaMes = useMemo(() => {
    const m = new Map<string, Resultado[]>();
    doMes.forEach((r) => { const k = r.campanha.trim().toLowerCase(); m.set(k, [...(m.get(k) || []), r]); });
    return [...m.values()].map((rs) => ({ campanha: rs[0].campanha, agg: somar(rs) }));
  }, [doMes]);

  // Evolução semanal (leads + CPL por semana).
  const evolucao = useMemo(() => listaSemanas(mes).map((s) => {
    const a = somar(doMes.filter((r) => r.semana === s));
    return { semana: `S${s}`, leads: a.leads, cpl: a.leads > 0 ? a.investido / a.leads : 0 };
  }), [doMes, mes]);
  const totalLeadsMes = somar(doMes).leads;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Evolução + meta de leads */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(220px,1fr)", gap: 14 }} className="tf-evol">
        <div style={CARD}>
          <div style={{ ...LBL, marginBottom: 10 }}>Evolução por semana</div>
          <GraficoSemanas dados={evolucao} />
        </div>
        <MetaLeads mes={mes} atual={totalLeadsMes} meta={metasLeads[mes] || 0} reload={reload} />
      </div>

      {/* Cabeçalho + ações */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setVisao("semana")} style={pill(visao === "semana", "#2563eb")}>Por semana</button>
          <button onClick={() => setVisao("mes")} style={pill(visao === "mes", "#10B981")}>Mês inteiro</button>
        </div>
        <button onClick={() => setEditar({ mes, semana: 1 })} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: "#fff", background: "#1AADE2", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={16} />Nova campanha</button>
      </div>

      {doMes.length === 0 && <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>Sem campanhas em {mesLabel(mes)}. Clique em Nova campanha ou use Puxar da Meta.</div>}

      {visao === "mes" && porCampanhaMes.length > 0 && (
        <Tabela titulo={`Mês inteiro · ${mesLabel(mes)}`} campanhas={porCampanhaMes.map((c) => ({ nome: c.campanha, agg: c.agg }))} />
      )}

      {visao === "semana" && listaSemanas(mes).map((s) => {
        const camps = doMes.filter((r) => r.semana === s);
        if (camps.length === 0) return null;
        return (
          <Tabela key={s} titulo={`Semana ${s}`}
            campanhas={camps.map((r) => ({ nome: r.campanha, agg: somar([r]), row: r }))}
            onEditar={(r) => setEditar(r)} onApagar={apagar} />
        );
      })}

      {editar && <ModalCampanha inicial={editar} onFechar={() => setEditar(null)} onSalvo={() => { setEditar(null); reload(); }} mesAtual={mes} />}
      <style>{`@media(max-width:760px){.tf-evol{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

const pill = (on: boolean, cor: string): React.CSSProperties => ({ cursor: "pointer", border: 0, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, background: on ? cor : "var(--bg-2)", color: on ? "#fff" : "var(--muted)" });

function Tabela({ titulo, campanhas, onEditar, onApagar }: {
  titulo: string;
  campanhas: { nome: string; agg: Agg; row?: Resultado }[];
  onEditar?: (r: Resultado) => void; onApagar?: (r: Resultado) => void;
}) {
  const total = somar(campanhas.map((c) => c.agg));
  return (
    <div style={{ ...CARD, overflowX: "auto" }}>
      <div style={{ ...LBL, marginBottom: 12 }}>{titulo}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 13.5, minWidth: 480, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "var(--card)", textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", minWidth: 190 }}>Métrica</th>
            {campanhas.map((c, i) => (
              <th key={i} style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {c.nome}
                  {c.row && onEditar && <button onClick={() => onEditar(c.row!)} style={iconBtn}><Pencil size={13} /></button>}
                  {c.row && onApagar && <button onClick={() => onApagar(c.row!)} style={{ ...iconBtn, color: "#EF4444" }}><Trash2 size={13} /></button>}
                </span>
              </th>
            ))}
            <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, background: "rgba(244,63,94,.14)", color: "#f43f5e" }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map((linha) => (
            <tr key={linha.label} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ position: "sticky", left: 0, background: "var(--card)", padding: "9px 12px", fontWeight: linha.forte ? 800 : 500, color: linha.forte ? "var(--txt)" : "var(--muted)" }}>{linha.label}</td>
              {campanhas.map((c, i) => <td key={i} style={{ padding: "9px 12px", textAlign: "right", fontWeight: linha.forte ? 700 : 500 }}>{linha.calc(c.agg)}</td>)}
              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, background: "rgba(244,63,94,.08)" }}>{linha.calc(total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const iconBtn: React.CSSProperties = { cursor: "pointer", background: "transparent", border: 0, color: "var(--muted)", padding: 2, display: "inline-grid", placeItems: "center" };

function MetaLeads({ mes, atual, meta, reload }: { mes: string; atual: number; meta: number; reload: () => void }) {
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [salvando, setSalvando] = useState(false);
  const pctAtingido = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const cor = meta === 0 ? "var(--muted)" : pctAtingido >= 100 ? "#10B981" : pctAtingido >= 60 ? "#F59E0B" : "#EF4444";
  const salvar = async () => {
    setSalvando(true);
    await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-meta-leads", mes, valor }) });
    setSalvando(false); reload();
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Target size={16} color="#EC4899" /><b style={{ fontSize: 14 }}>Meta de leads do mês</b></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 300" style={INP} />
        <button onClick={salvar} disabled={salvando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "0 16px", fontWeight: 700, color: "#fff", background: "#EC4899" }}><Save size={15} /></button>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{num(atual)} <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 600 }}>de {meta ? num(meta) : "—"}</span></div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--bg-2)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ width: `${pctAtingido}%`, height: "100%", background: cor, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function ModalCampanha({ inicial, onFechar, onSalvo, mesAtual }: { inicial: Editar; onFechar: () => void; onSalvo: () => void; mesAtual: string }) {
  const [f, setF] = useState<Editar>({ semana: 1, investido: 0, impressoes: 0, cliques: 0, leads: 0, leads_plataforma: 0, leads_planilha: 0, ...inicial });
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof Editar, v: string | number) => setF((o) => ({ ...o, [k]: v }));
  const campos: { k: keyof Editar; label: string; prefixo?: string }[] = [
    { k: "investido", label: "Investido", prefixo: "R$" }, { k: "impressoes", label: "Impressões" },
    { k: "cliques", label: "Cliques" }, { k: "leads", label: "Leads gerados" },
    { k: "leads_plataforma", label: "Leads plataforma" }, { k: "leads_planilha", label: "Leads planilha" },
  ];
  const salvar = async () => {
    if (!String(f.campanha || "").trim()) { alert("Dê um nome à campanha."); return; }
    setSalvando(true);
    await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-campanha", ...f, mes: mesAtual }) });
    setSalvando(false); onSalvo();
  };
  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, width: 460, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <b style={{ fontSize: 16 }}>{inicial.id ? "Editar campanha" : "Nova campanha"}</b>
          <button onClick={onFechar} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <label><div style={lbl}>Campanha</div><input value={f.campanha || ""} onChange={(e) => set("campanha", e.target.value)} placeholder="Nome da campanha" style={INP} /></label>
          <label><div style={lbl}>Semana</div>
            <select value={f.semana} onChange={(e) => set("semana", Number(e.target.value))} style={{ ...INP, cursor: "pointer" }}>
              {listaSemanas(mesAtual).map((s) => <option key={s} value={s}>Semana {s}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {campos.map((c) => (
              <label key={c.k}><div style={lbl}>{c.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...INP, padding: "0 10px" }}>
                  {c.prefixo && <span style={{ color: "var(--muted)", fontSize: 13 }}>{c.prefixo}</span>}
                  <input inputMode="decimal" value={(f[c.k] as number) ?? ""} onChange={(e) => set(c.k, e.target.value === "" ? 0 : Number(e.target.value.replace(",", ".")) || 0)} placeholder="0" style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "10px 0", outline: "none" }} />
                </div>
              </label>
            ))}
          </div>
          <button onClick={salvar} disabled={salvando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "12px", fontWeight: 700, color: "#fff", background: "#10B981", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 }}><Save size={16} />{salvando ? "Salvando..." : "Salvar campanha"}</button>
        </div>
      </div>
    </div>
  );
}
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 };
