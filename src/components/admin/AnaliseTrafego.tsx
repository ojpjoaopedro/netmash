"use client";
/**
 * Análise de Tráfego Pago (admin/superadmin) — inspirada no módulo do Hub da Dynamis.
 * Funil de marketing (3 etapas) + Análise mês a mês (KPIs, meta de CPL, imposto,
 * análise escrita automática, gráfico de evolução e tabela). Os dados ficam no
 * Supabase (tabela trafego_mensal) via /api/marketing/trafego: dá pra digitar à
 * mão E puxar direto da Meta (Facebook). Configurações (pixel, token/conta da
 * Meta, meta de CPL, imposto) ficam em app_kv.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Megaphone, Users, Target, CalendarRange, TrendingUp, TrendingDown, Minus,
  DollarSign, Download, Save, Trash2, RefreshCw, Settings2, Check,
} from "lucide-react";

type DadosMes = { investido: number; leads: number; impressoes: number; cliques: number; vendas: number; campanhas: number; origem?: string };
type LinhaApi = DadosMes & { mes: string };
type Config = { metaAdAccount: string; metaToken: string; metaCpl: string; imposto: string; pixelId: string };
type Store = Record<string, DadosMes>;

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
    const d = store[mes];
    const { investido, leads, impressoes, cliques, vendas, campanhas } = d;
    const cpl = div(investido, leads), cpc = div(investido, cliques), cpm = div(investido * 1000, impressoes);
    const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : null;
    const convLP = cliques > 0 ? (leads / cliques) * 100 : null;
    const ant = i > 0 ? linhas[i - 1] : null;
    const [y, m] = mes.split("-").map(Number);
    linhas.push({
      mes, label: `${MES3[m - 1]}/${String(y).slice(2)}`, investido, leads, impressoes, cliques, vendas, campanhas, origem: d.origem,
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
const INP: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "11px 12px", borderRadius: 10, outline: "none" };
const emptyMes = (): DadosMes => ({ investido: 0, leads: 0, impressoes: 0, cliques: 0, vendas: 0, campanhas: 0 });

async function authHeaders(): Promise<Record<string, string>> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` };
}

export default function AnaliseTrafego() {
  const [store, setStore] = useState<Store>({});
  const [config, setConfig] = useState<Config>({ metaAdAccount: "", metaToken: "", metaCpl: "", imposto: "13.83", pixelId: "" });
  const [comImposto, setComImposto] = useState(true);
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(new Date().getMonth());   // 0-11
  const [rascunho, setRascunho] = useState<DadosMes>(emptyMes());
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; txt: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [puxando, setPuxando] = useState(false);
  const [abrirConfig, setAbrirConfig] = useState(false);

  const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { headers: await authHeaders() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao carregar.");
      const st: Store = {};
      (j.meses as LinhaApi[]).forEach((l) => {
        st[l.mes] = { investido: Number(l.investido) || 0, leads: l.leads || 0, impressoes: Number(l.impressoes) || 0, cliques: l.cliques || 0, vendas: l.vendas || 0, campanhas: l.campanhas || 0, origem: l.origem };
      });
      setStore(st);
      setConfig((c) => ({ ...c, ...j.config }));
    } catch (e) {
      setMsg({ tipo: "erro", txt: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Ao trocar de mês (ou quando os dados chegam), carrega o rascunho com o salvo.
  useEffect(() => { setRascunho(store[chave] ? { ...store[chave] } : emptyMes()); }, [chave, store]);

  const flash = (tipo: "ok" | "erro", txt: string) => { setMsg({ tipo, txt }); setTimeout(() => setMsg(null), 4000); };

  const salvarMes = async () => {
    setSalvando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-mes", mes: chave, ...rascunho }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao salvar.");
      setStore((s) => ({ ...s, [chave]: { ...rascunho, origem: "manual" } }));
      flash("ok", `${MES3[mes]}/${ano} salvo.`);
    } catch (e) { flash("erro", (e as Error).message); } finally { setSalvando(false); }
  };

  const puxarMeta = async () => {
    setPuxando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "sync-meta", mes: chave }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao puxar da Meta.");
      const m = j.mes as LinhaApi;
      const dados: DadosMes = { investido: Number(m.investido) || 0, leads: m.leads || 0, impressoes: Number(m.impressoes) || 0, cliques: m.cliques || 0, vendas: m.vendas || 0, campanhas: m.campanhas || 0, origem: "meta" };
      setStore((s) => ({ ...s, [chave]: dados }));
      setRascunho(dados);
      flash("ok", `${MES3[mes]}/${ano} puxado da Meta (${j.campanhas} campanhas).`);
    } catch (e) { flash("erro", (e as Error).message); } finally { setPuxando(false); }
  };

  const apagarMes = async () => {
    if (!store[chave]) return;
    if (!confirm(`Apagar os dados de ${MES3[mes]}/${ano}?`)) return;
    try {
      await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "apagar-mes", mes: chave }) });
      setStore((s) => { const n = { ...s }; delete n[chave]; return n; });
      setRascunho(emptyMes());
      flash("ok", "Mês apagado.");
    } catch (e) { flash("erro", (e as Error).message); }
  };

  const salvarConfig = async () => {
    setSalvando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-config", config }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao salvar.");
      flash("ok", "Configurações salvas.");
    } catch (e) { flash("erro", (e as Error).message); } finally { setSalvando(false); }
  };

  const hist = useMemo(() => calcular(store), [store]);
  const totais = useMemo(() => {
    const inv = hist.reduce((a, l) => a + l.investido, 0), leads = hist.reduce((a, l) => a + l.leads, 0);
    return { meses: hist.length, investimento: inv, leads, cpl: div(inv, leads) };
  }, [hist]);
  const fator = 1 + (Number(config.imposto.replace(",", ".")) || 0) / 100;
  const mult = comImposto ? fator : 1;
  const meta = Number(config.metaCpl.replace(",", ".")) || 0;
  const linhaMes = hist.find((l) => l.mes === chave) || null;
  const analise = analisar(hist);
  const setC = (k: keyof Config, v: string) => setConfig((c) => ({ ...c, [k]: v }));
  const setR = (k: keyof DadosMes, v: string) => setRascunho((d) => ({ ...d, [k]: v === "" ? 0 : Number(v.replace(",", ".")) || 0 }));
  const dirty = JSON.stringify({ ...(store[chave] ?? emptyMes()), origem: undefined }) !== JSON.stringify({ ...rascunho, origem: undefined });

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setComImposto((v) => !v)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, border: "1px solid rgba(245,158,11,.4)", background: "rgba(245,158,11,.12)", color: "#F59E0B", borderRadius: 99, padding: "9px 16px" }}>
            {comImposto ? `✓ Com imposto (${config.imposto}%)` : "Só a mídia"}
          </button>
          <button onClick={() => setAbrirConfig((v) => !v)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--txt)", borderRadius: 99, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Settings2 size={15} /> Configurações
          </button>
        </div>
      </div>

      {msg && <div style={{ ...SUB, borderColor: msg.tipo === "ok" ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.4)", color: msg.tipo === "ok" ? "#10B981" : "#EF4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Check size={16} />{msg.txt}</div>}

      {/* Configurações (pixel + Meta + meta CPL + imposto) */}
      {abrirConfig && (
        <div style={{ ...CARD, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Settings2 size={16} color="#1AADE2" /><b style={{ fontSize: 15 }}>Configurações</b></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 }}>ID do Pixel da Meta</div><input value={config.pixelId} onChange={(e) => setC("pixelId", e.target.value)} placeholder="Ex.: 574774374290188" style={INP} /></label>
            <label><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 }}>ID da conta de anúncios</div><input value={config.metaAdAccount} onChange={(e) => setC("metaAdAccount", e.target.value)} placeholder="Ex.: 1234567890" style={INP} /></label>
            <label><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 }}>Meta de CPL (R$)</div><input value={config.metaCpl} onChange={(e) => setC("metaCpl", e.target.value)} placeholder="Ex.: 5,00" style={INP} /></label>
            <label><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 }}>Imposto sobre o tráfego (%)</div><input value={config.imposto} onChange={(e) => setC("imposto", e.target.value)} placeholder="13,83" style={INP} /></label>
          </div>
          <label><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 }}>Token de acesso da Meta (Graph API)</div><input value={config.metaToken} onChange={(e) => setC("metaToken", e.target.value)} placeholder="Cole aqui o token da conta de anúncios (fica só no servidor)" style={INP} type="password" /></label>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>O token e a conta de anúncios são usados só pelo servidor pra puxar os números da Meta. O ID do Pixel passa a carregar automaticamente nas páginas de venda (site, /app, /vendas, /assinar, /obrigado).</p>
          <div><button onClick={salvarConfig} disabled={salvando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "11px 22px", fontWeight: 700, color: "#fff", background: "#1AADE2", display: "inline-flex", alignItems: "center", gap: 8 }}><Save size={16} />{salvando ? "Salvando..." : "Salvar configurações"}</button></div>
        </div>
      )}

      {/* Entrada de dados do mês */}
      <div style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={LBL}>Dados do mês {store[chave]?.origem === "meta" && <span style={{ marginLeft: 6, color: "#1AADE2", fontSize: 10 }}>· via Meta</span>}</span>
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
                <input inputMode="decimal" value={(rascunho[c.key] as number) || ""} onChange={(e) => setR(c.key, e.target.value)} placeholder="0"
                  style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "10px 0", outline: "none" }} />
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
          <button onClick={salvarMes} disabled={salvando || !dirty} style={{ cursor: dirty ? "pointer" : "default", border: 0, borderRadius: 10, padding: "11px 22px", fontWeight: 700, color: "#fff", background: dirty ? "#10B981" : "var(--muted-2)", display: "inline-flex", alignItems: "center", gap: 8, opacity: dirty ? 1 : .6 }}><Save size={16} />{salvando ? "Salvando..." : dirty ? "Salvar mês" : "Salvo"}</button>
          <button onClick={puxarMeta} disabled={puxando} style={{ cursor: "pointer", border: "1px solid #1AADE2", borderRadius: 10, padding: "11px 20px", fontWeight: 700, color: "#1AADE2", background: "rgba(26,173,226,.10)", display: "inline-flex", alignItems: "center", gap: 8 }}>{puxando ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}{puxando ? "Puxando..." : "Puxar da Meta"}</button>
          {store[chave] && <button onClick={apagarMes} style={{ cursor: "pointer", border: "1px solid var(--line-2)", borderRadius: 10, padding: "11px 16px", fontWeight: 700, color: "#EF4444", background: "transparent", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={15} />Apagar</button>}
          {carregando && <span style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</span>}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0", fontStyle: "italic" }}>Digite os números do mês e clique em Salvar, ou use Puxar da Meta pra trazer investido/impressões/cliques/leads direto do Facebook. As vendas você preenche à mão.</p>
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

      {/* Meta de CPL + imposto */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {(() => { const s = statusCpl(linhaMes?.cpl != null ? linhaMes.cpl * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL do mês ({MES3[mes]})</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(linhaMes?.cpl != null ? linhaMes.cpl * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
        {(() => { const s = statusCpl(totais.cpl != null ? totais.cpl * mult : null); return (
          <div style={SUB}><div style={LBL}>CPL médio da conta</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totais.cpl != null ? totais.cpl * mult : null)}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: s.cor, marginTop: 4 }}>{s.txt}</div></div>
        ); })()}
        <div style={SUB}><div style={{ ...LBL, color: "#F59E0B" }}>Investido real (c/ imposto)</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{brl(totais.investimento * fator)}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>mídia: {brl(totais.investimento)} + {config.imposto}%</div></div>
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

      {hist.length === 0 && !carregando && (
        <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>
          Ainda sem dados. Preencha o mês acima e clique em Salvar, ou use Puxar da Meta.
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
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
