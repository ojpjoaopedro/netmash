"use client";
/**
 * Análise de Tráfego Pago (admin/superadmin) — inspirada no módulo do Hub da Dynamis.
 * Funil de marketing (3 etapas) + Análise mês a mês (KPIs, meta de CPL, imposto 13,83%,
 * análise escrita automática, gráfico de evolução e tabela). Dados preenchidos à mão por
 * mês e salvos no navegador (localStorage "me_trafego"). Sem backend.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Wallet, Users, Target, CalendarRange, TrendingUp, TrendingDown, Minus,
  Eye, MousePointerClick, DollarSign,
} from "lucide-react";

type DadosMes = { investido: number; leads: number; impressoes: number; cliques: number; vendas: number; campanhas: number };
type Store = Record<string, Partial<DadosMes>>;   // "YYYY-MM" -> dados
const CAMPOS: { key: keyof DadosMes; label: string; prefixo?: string }[] = [
  { key: "investido", label: "Investido (mídia)", prefixo: "R$" },
  { key: "leads", label: "Leads" },
  { key: "impressoes", label: "Impressões" },
  { key: "cliques", label: "Cliques" },
  { key: "vendas", label: "Vendas" },
  { key: "campanhas", label: "Campanhas" },
];
const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);
const pctVar = (a: number, b: number): number | null => (b > 0 ? ((a - b) / b) * 100 : null);
const brl = (n: number | null | undefined, dec = 2) =>
  n == null ? "—" : "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const num = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
const pct = (n: number | null | undefined, dec = 1) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%");

type Linha = DadosMes & {
  mes: string; label: string; cpl: number | null; cpc: number | null; ctr: number | null; cpm: number | null; convLP: number | null;
  varInv: number | null; varLeads: number | null; varCpl: number | null;
};

function calcular(store: Store): Linha[] {
  const chaves = Object.keys(store).filter((k) => {
    const d = store[k];
    return (d?.investido || d?.leads || d?.impressoes || d?.cliques);
  }).sort();
  const linhas: Linha[] = [];
  chaves.forEach((mes, i) => {
    const d = store[mes] || {};
    const investido = Number(d.investido) || 0, leads = Number(d.leads) || 0, impressoes = Number(d.impressoes) || 0;
    const cliques = Number(d.cliques) || 0, vendas = Number(d.vendas) || 0, campanhas = Number(d.campanhas) || 0;
    const cpl = div(investido, leads), cpc = div(investido, cliques), cpm = div(investido * 1000, impressoes);
    const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : null;
    const convLP = cliques > 0 ? (leads / cliques) * 100 : null;
    const ant = i > 0 ? linhas[i - 1] : null;
    const [y, m] = mes.split("-").map(Number);
    linhas.push({
      mes, label: `${MES3[m - 1]}/${String(y).slice(2)}`, investido, leads, impressoes, cliques, vendas, campanhas,
      cpl, cpc, ctr, cpm, convLP,
      varInv: ant ? pctVar(investido, ant.investido) : null,
      varLeads: ant ? pctVar(leads, ant.leads) : null,
      varCpl: ant && ant.cpl != null && cpl != null ? pctVar(cpl, ant.cpl) : null,
    });
  });
  return linhas;
}

function Delta({ v, invertido = false }: { v: number | null; invertido?: boolean }) {
  if (v == null) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  const subiu = v > 0.5, caiu = v < -0.5;
  const bom = invertido ? caiu : subiu;
  const ruim = invertido ? subiu : caiu;
  const cor = bom ? "#10B981" : ruim ? "#EF4444" : "var(--muted)";
  const Ic = subiu ? TrendingUp : caiu ? TrendingDown : Minus;
  return <span style={{ color: cor, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}><Ic size={13} />{Math.abs(v).toFixed(0)}%</span>;
}

function analisar(hist: Linha[]): { tom: "bom" | "ruim" | "neutro"; titulo: string; texto: string } | null {
  if (hist.length === 0) return null;
  const u = hist[hist.length - 1];
  if (hist.length < 2) return { tom: "neutro", titulo: `${u.label}`, texto: `Primeiro mês com dados: R$ ${u.investido.toLocaleString("pt-BR")} investidos, ${num(u.leads)} leads, custo por lead de ${brl(u.cpl)}. Cadastre mais meses pra comparar a evolução.` };
  const p = hist[hist.length - 2];
  const custoSubiu = (u.varCpl ?? 0) > 0.5, custoCaiu = (u.varCpl ?? 0) < -0.5, leadsSubiu = (u.varLeads ?? 0) > 0.5;
  let tom: "bom" | "ruim" | "neutro" = "neutro", diag = "Resultado estável em relação ao mês passado.";
  if (custoCaiu && leadsSubiu) { tom = "bom"; diag = "Melhor cenário: mais leads pagando menos por cada um. Eficiência subindo."; }
  else if (custoCaiu) { tom = "bom"; diag = "O custo por lead caiu, sinal de que criativos/públicos estão mais eficientes."; }
  else if (custoSubiu && !leadsSubiu) { tom = "ruim"; diag = "O custo subiu sem trazer mais leads. Vale revisar criativos e públicos."; }
  else if (custoSubiu) { tom = "ruim"; diag = "O custo por lead subiu, fique de olho (pode ser escala de investimento)."; }
  const cpChg = u.varCpl == null ? "" : `o custo por lead ${custoCaiu ? "caiu" : custoSubiu ? "subiu" : "ficou estável"} ${Math.abs(u.varCpl).toFixed(0)}% (de ${brl(p.cpl)} para ${brl(u.cpl)})`;
  const ldChg = u.varLeads == null ? "" : ` e os leads ${(u.varLeads ?? 0) >= 0 ? "cresceram" : "caíram"} ${Math.abs(u.varLeads).toFixed(0)}%`;
  return { tom, titulo: `${u.label} vs ${p.label}`, texto: `Do mês passado para cá, ${cpChg}${ldChg}. ${diag}` };
}

const CARD: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 };
const SUB: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 };
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)" };

export default function AnaliseTrafego() {
  const [store, setStore] = useState<Store>({});
  const [metaCpl, setMetaCpl] = useState<string>("");
  const [imposto, setImposto] = useState<string>("13.83");
  const [comImposto, setComImposto] = useState(true);
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(new Date().getMonth());   // 0-11

  useEffect(() => {
    try {
      const s = localStorage.getItem("me_trafego"); if (s) setStore(JSON.parse(s));
      const mc = localStorage.getItem("me_trafego_meta"); if (mc) setMetaCpl(mc);
      const im = localStorage.getItem("me_trafego_imposto"); if (im) setImposto(im);
    } catch { /* ignore */ }
  }, []);

  const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const setCampo = (k: keyof DadosMes, v: string) => {
    setStore((s) => {
      const n = { ...s, [chave]: { ...(s[chave] || {}), [k]: v === "" ? undefined : Number(v.replace(",", ".")) } };
      try { localStorage.setItem("me_trafego", JSON.stringify(n)); } catch { /* ignore */ }
      return n;
    });
  };
  const salvarMeta = () => { try { localStorage.setItem("me_trafego_meta", metaCpl); } catch { /* ignore */ } };
  const salvarImposto = () => { try { localStorage.setItem("me_trafego_imposto", imposto); } catch { /* ignore */ } };

  const hist = useMemo(() => calcular(store), [store]);
  const totais = useMemo(() => {
    const inv = hist.reduce((a, l) => a + l.investido, 0), leads = hist.reduce((a, l) => a + l.leads, 0);
    return { meses: hist.length, investimento: inv, leads, cpl: div(inv, leads) };
  }, [hist]);
  const fator = 1 + (Number(imposto.replace(",", ".")) || 0) / 100;
  const mult = comImposto ? fator : 1;
  const meta = Number(metaCpl.replace(",", ".")) || 0;
  const linhaMes = hist.find((l) => l.mes === chave) || null;
  const analise = analisar(hist);

  const statusCpl = (v: number | null) => {
    if (v == null || meta <= 0) return { cor: "var(--muted)", txt: "defina a meta" };
    if (v <= meta) return { cor: "#10B981", txt: "✅ dentro da meta" };
    if (v <= meta * 1.1) return { cor: "#F59E0B", txt: "⚠️ quase" };
    return { cor: "#EF4444", txt: "🔴 acima da meta" };
  };

  const kpis = [
    { Ic: CalendarRange, cor: "#3B82F6", label: "Meses acompanhados", val: String(totais.meses) },
    { Ic: DollarSign, cor: "#10B981", label: `Investimento total${comImposto ? " (c/ imposto)" : ""}`, val: brl(totais.investimento * mult) },
    { Ic: Users, cor: "#8b5cf6", label: "Leads totais", val: num(totais.leads) },
    { Ic: Target, cor: "#F59E0B", label: `Custo médio por lead${comImposto ? " (c/ imposto)" : ""}`, val: brl(totais.cpl != null ? totais.cpl * mult : null) },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1AADE2,#0e7ba6)", color: "#fff", flexShrink: 0 }}><Megaphone size={22} /></span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Análise de Tráfego Pago</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "2px 0 0" }}>Funil, investimento, leads e custo por lead, mês a mês.</p>
          </div>
        </div>
        <button onClick={() => setComImposto((v) => !v)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, border: "1px solid rgba(245,158,11,.4)", background: "rgba(245,158,11,.12)", color: "#F59E0B", borderRadius: 99, padding: "9px 16px" }}>
          {comImposto ? `✓ Valores com imposto (${imposto}%)` : "Só a mídia (sem imposto)"}
        </button>
      </div>

      {/* Entrada de dados do mês */}
      <div style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={LBL}>Dados do mês</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {[2026, 2027].map((y) => (
              <button key={y} onClick={() => setAno(y)} style={{ cursor: "pointer", border: 0, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 700, background: ano === y ? "#1AADE2" : "var(--bg-2)", color: ano === y ? "#fff" : "var(--muted)" }}>{y}</button>
            ))}
            <span style={{ width: 1, height: 20, background: "var(--line)" }} />
            {MES3.map((m, i) => (
              <button key={m} onClick={() => setMes(i)} style={{ cursor: "pointer", border: 0, borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 700, background: mes === i ? "#1AADE2" : "var(--bg-2)", color: mes === i ? "#fff" : "var(--muted)" }}>{m}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {CAMPOS.map((c) => (
            <label key={c.key} style={{ display: "block" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 10px" }}>
                {c.prefixo && <span style={{ color: "var(--muted)", fontSize: 13 }}>{c.prefixo}</span>}
                <input inputMode="decimal" value={store[chave]?.[c.key] ?? ""} onChange={(e) => setCampo(c.key, e.target.value)} placeholder="0"
                  style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "10px 0", outline: "none" }} />
              </div>
            </label>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0", fontStyle: "italic" }}>Digite os números do Facebook (o valor gasto não inclui imposto). O funil e a análise se montam sozinhos.</p>
      </div>

      {/* Funil do mês */}
      {linhaMes && (
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <span style={LBL}>Funil de marketing · {MES3[mes]}/{ano}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Investido: <b style={{ color: "#10B981", fontSize: 18 }}>{brl(linhaMes.investido * mult, 0)}</b></span>
          </div>
          {([
            { nome: "Conhecimento", desc: "quantas pessoas viram", grad: "linear-gradient(90deg,#ec4899,#e11d48)", w: "100%", badges: [["Impressão", num(linhaMes.impressoes)], ["CPM", brl(linhaMes.cpm)]] },
            { nome: "Consideração", desc: "quem clicou e engajou", grad: "linear-gradient(90deg,#d946ef,#9333ea)", w: "82%", badges: [["Cliques", num(linhaMes.cliques)], ["CPC", brl(linhaMes.cpc)], ["CTR", pct(linhaMes.ctr)]] },
            { nome: "Captação", desc: "virou lead", grad: "linear-gradient(90deg,#8b5cf6,#6366f1)", w: "64%", badges: [["Leads", num(linhaMes.leads)], ["CPL", brl(linhaMes.cpl)], ["Conversão LP", pct(linhaMes.convLP)]] },
          ] as { nome: string; desc: string; grad: string; w: string; badges: [string, string][] }[]).map((e) => (
            <div key={e.nome} style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ width: 260, maxWidth: "100%" }}>
                <div style={{ width: e.w, minWidth: 150, height: 58, borderRadius: 12, background: e.grad, display: "grid", placeItems: "center", clipPath: "polygon(6% 0,94% 0,82% 100%,18% 100%)" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{e.nome}</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", marginBottom: 8 }}>{e.desc}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {e.badges.map(([l, v]) => (
                    <span key={l} style={{ display: "inline-flex", flexDirection: "column", gap: 1, padding: "6px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{l}</span>
                      <b style={{ fontSize: 15 }}>{v}</b>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={CARD}>
            <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: k.cor, color: "#fff" }}><k.Ic size={18} /></span>
            <div style={{ ...LBL, marginTop: 12, letterSpacing: ".08em" }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Meta de CPL */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Target size={16} color="#EC4899" /><b style={{ fontSize: 15 }}>Meta de custo por lead</b></div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px" }}>
              <span style={{ color: "var(--muted)" }}>R$</span>
              <input inputMode="decimal" value={metaCpl} onChange={(e) => setMetaCpl(e.target.value)} placeholder="Ex.: 5,00" style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "11px 0", outline: "none" }} />
            </div>
            <button onClick={salvarMeta} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "0 18px", fontWeight: 700, color: "#fff", background: "#EC4899" }}>Salvar</button>
          </div>
        </div>
        {(() => { const s = statusCpl(linhaMes?.cpl != null ? linhaMes.cpl * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL do mês ({MES3[mes]})</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(linhaMes?.cpl != null ? linhaMes.cpl * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
        {(() => { const s = statusCpl(totais.cpl != null ? totais.cpl * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL médio da conta</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totais.cpl != null ? totais.cpl * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
      </div>

      {/* Imposto */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: "#F59E0B", fontWeight: 800 }}>%</span><b style={{ fontSize: 15 }}>Imposto sobre o tráfego</b></div>
          <div style={{ display: "flex", gap: 8 }}>
            <input inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} placeholder="Ex.: 13,83" style={{ flex: 1, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "11px 12px", borderRadius: 10, outline: "none" }} />
            <button onClick={salvarImposto} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "0 18px", fontWeight: 700, color: "#fff", background: "#F59E0B" }}>Salvar</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>O valor gasto no Facebook não inclui imposto. Aqui você vê o custo real.</p>
        </div>
        <div style={SUB}><div style={{ ...LBL, color: "#F59E0B" }}>Investido real (c/ imposto)</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totais.investimento * fator)}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>mídia: {brl(totais.investimento)} + {imposto}%</div></div>
        <div style={SUB}><div style={{ ...LBL, color: "#F59E0B" }}>CPL real (c/ imposto)</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totais.cpl != null ? totais.cpl * fator : null)}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>sem imposto: {brl(totais.cpl)}</div></div>
      </div>

      {/* Análise escrita */}
      {analise && (
        <div style={{ ...CARD, background: analise.tom === "bom" ? "rgba(16,185,129,.10)" : analise.tom === "ruim" ? "rgba(239,68,68,.10)" : "var(--card)", border: `1px solid ${analise.tom === "bom" ? "rgba(16,185,129,.35)" : analise.tom === "ruim" ? "rgba(239,68,68,.35)" : "var(--line)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><TrendingUp size={16} color={analise.tom === "bom" ? "#10B981" : analise.tom === "ruim" ? "#EF4444" : "var(--muted)"} /><b style={{ fontSize: 15 }}>{analise.titulo}</b></div>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, color: "var(--txt-2)" }}>{analise.texto}</p>
        </div>
      )}

      {/* Gráfico de evolução */}
      {hist.length >= 1 && <Grafico hist={hist} mult={mult} />}

      {/* Tabela mês a mês */}
      {hist.length >= 1 && (
        <div style={{ ...CARD, overflowX: "auto" }}>
          <div style={{ ...LBL, marginBottom: 12 }}>Acompanhamento mês a mês</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
            <thead>
              <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                {["Mês", "Investimento", "Leads", "Custo/lead", "CPC", "CTR", "CPM", "Camp."].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...hist].reverse().map((l, i) => (
                <tr key={l.mes} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px", fontWeight: 700 }}>{l.label}{i === 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#1AADE2", background: "rgba(26,173,226,.14)", padding: "2px 7px", borderRadius: 99 }}>atual</span>}</td>
                  <td style={{ padding: "10px" }}>{brl(l.investido * mult, 0)} <Delta v={l.varInv} /></td>
                  <td style={{ padding: "10px" }}>{num(l.leads)} <Delta v={l.varLeads} /></td>
                  <td style={{ padding: "10px" }}>{brl(l.cpl != null ? l.cpl * mult : null)} <Delta v={l.varCpl} invertido /></td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{brl(l.cpc)}</td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{pct(l.ctr)}</td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{brl(l.cpm)}</td>
                  <td style={{ padding: "10px", color: "var(--muted)" }}>{l.campanhas || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hist.length === 0 && (
        <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>
          Ainda sem dados. Preencha os números do mês acima que o funil, os KPIs e o gráfico se montam sozinhos.
        </div>
      )}
    </div>
  );
}

/* Gráfico SVG: barras de investimento (azul) + linha de custo por lead (âmbar) */
function Grafico({ hist, mult }: { hist: Linha[]; mult: number }) {
  const W = 900, H = 260, padL = 8, padR = 8, padB = 34, padT = 14;
  const invs = hist.map((l) => l.investido * mult);
  const cpls = hist.map((l) => (l.cpl != null ? l.cpl * mult : 0));
  const maxInv = Math.max(...invs, 1), maxCpl = Math.max(...cpls, 1);
  const n = hist.length, gw = (W - padL - padR) / n;
  const bx = (i: number) => padL + gw * i + gw * 0.25, bw = gw * 0.5;
  const by = (v: number) => padT + (1 - v / maxInv) * (H - padT - padB);
  const lx = (i: number) => padL + gw * i + gw / 2;
  const ly = (v: number) => padT + (1 - v / maxCpl) * (H - padT - padB);
  const linePts = hist.map((l, i) => `${lx(i)},${ly(l.cpl != null ? l.cpl * mult : 0)}`).join(" ");
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={LBL}>Evolução mês a mês</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#2563eb" }} />Investimento</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 14, height: 3, borderRadius: 2, background: "#fbbf24" }} />Custo por lead</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="var(--line)" strokeDasharray="3 3" />)}
        {hist.map((l, i) => (
          <g key={l.mes}>
            <rect x={bx(i)} y={by(l.investido * mult)} width={bw} height={Math.max(0, H - padB - by(l.investido * mult))} rx={4} fill="#2563eb" opacity={0.85} />
            <text x={lx(i)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--muted)">{l.label}</text>
          </g>
        ))}
        <polyline points={linePts} fill="none" stroke="#fbbf24" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {hist.map((l, i) => <circle key={l.mes} cx={lx(i)} cy={ly(l.cpl != null ? l.cpl * mult : 0)} r={4} fill="#fbbf24" />)}
      </svg>
    </div>
  );
}
