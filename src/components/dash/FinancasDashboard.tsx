"use client";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Plus, Upload, Wand2 } from "lucide-react";
import { Lancamento } from "@/lib/db";
import { brl, mesDe } from "@/lib/format";
import { resumo, receitasPorCategoria, despesasPorCategoria } from "@/lib/calc";
import { seedExemplo } from "@/lib/seed";
import { LineChart, CompBars } from "./Charts";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function FinancasDashboard({ lancs, saldoInicial, onLancar, onImportar, reload }: { lancs: Lancamento[]; saldoInicial: number; onLancar?: () => void; onImportar?: () => void; reload?: () => void }) {
  const [seedando, setSeedando] = useState(false);
  async function carregarExemplo() {
    if (!window.confirm("Carregar dados de EXEMPLO na sua conta (lançamentos e indicadores) só para você ver os gráficos? Você pode apagar depois em Lançamentos.")) return;
    setSeedando(true);
    try { await seedExemplo(); reload?.(); } catch { alert("Não consegui carregar o exemplo."); }
    setSeedando(false);
  }
  const anos = useMemo(() => [...new Set(lancs.map((l) => l.data_competencia.slice(0, 4)))].filter(Boolean).sort().reverse(), [lancs]);
  const [ano, setAno] = useState(anos[0] || String(new Date().getFullYear()));
  const mesesDoAno = useMemo(() => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`), [ano]);
  const mesesComDados = useMemo(() => new Set(lancs.map((l) => mesDe(l.data_competencia))), [lancs]);
  const comDados = useMemo(() => mesesDoAno.filter((m) => mesesComDados.has(m)), [mesesDoAno, mesesComDados]);

  const [sel, setSel] = useState<Set<string>>(() => new Set());
  // seleção efetiva: se nada marcado, considera todos os meses com dados
  const efetivos = sel.size ? [...sel] : comDados;
  function toggle(m: string) {
    setSel((prev) => { const n = new Set(prev); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  }

  const r = useMemo(() => resumo(lancs, efetivos, saldoInicial), [lancs, efetivos, saldoInicial]);
  const fatCats = useMemo(() => receitasPorCategoria(lancs, efetivos).map((c) => ({ label: c.categoria, valor: c.valor })), [lancs, efetivos]);
  const custoCats = useMemo(() => despesasPorCategoria(lancs, efetivos).map((c) => ({ label: c.categoria, valor: c.valor })), [lancs, efetivos]);
  const serieFat = useMemo(() => comDados.map((m) => ({ label: MES3[Number(m.slice(5, 7)) - 1], value: resumo(lancs, [m], 0).faturamento })), [lancs, comDados]);
  const serieDesp = useMemo(() => comDados.map((m) => ({ label: MES3[Number(m.slice(5, 7)) - 1], value: resumo(lancs, [m], 0).despesas })), [lancs, comDados]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {onLancar && <button className="btn sm" onClick={onLancar}><Plus size={14} /> Inserir dados</button>}
        {onImportar && <button className="btn ghost sm" onClick={onImportar}><Upload size={14} /> Importar planilha</button>}
        <button className="btn ghost sm" onClick={carregarExemplo} disabled={seedando}><Wand2 size={14} /> {seedando ? "Carregando…" : "Dados de exemplo"}</button>
      </div>
      {anos.length > 1 && (
        <div className="period" style={{ marginBottom: 12, width: "fit-content" }}>
          {anos.map((a) => <button key={a} className={ano === a ? "active" : ""} onClick={() => { setAno(a); setSel(new Set()); }}>{a}</button>)}
        </div>
      )}

      {/* Meses (clique para somar) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="sub" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Meses (clique para somar)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
          {mesesDoAno.map((m, i) => {
            const tem = mesesComDados.has(m);
            const on = sel.has(m) || (sel.size === 0 && tem);
            return (
              <button key={m} disabled={!tem} onClick={() => toggle(m)} style={{
                padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: tem ? "pointer" : "not-allowed",
                border: on ? "1px solid var(--accent)" : "1px solid var(--line-2)",
                background: on ? "var(--accent)" : "var(--card)",
                color: on ? "#06222e" : (tem ? "var(--txt)" : "var(--muted)"),
                opacity: tem ? 1 : .4,
              }}>{MES3[i]}</button>
            );
          })}
        </div>
        <p className="sub" style={{ fontSize: 11.5, marginTop: 8 }}>Clique nos meses para somar. Sem seleção = todos com dados.</p>
      </div>

      {/* FATURAMENTO */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={18} color="#10B981" /><h3 style={{ margin: 0 }}>Faturamento mês a mês</h3></div>
          <div style={{ textAlign: "right", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 12, padding: "8px 14px" }}>
            <div className="sub" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "#10B981" }}>TOTAL FATURADO</div>
            <b style={{ fontSize: 20 }}>{brl(r.faturamento)}</b>
          </div>
        </div>
        <LineChart pts={serieFat} cor="#1AADE2" />
      </div>

      {/* COMPOSIÇÃO POR CANAL */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Composição por canal</h3>
        {fatCats.length ? <CompBars itens={fatCats} total={r.faturamento} /> : <p className="sub">Sem receitas no período. Preencha a categoria nas receitas para ver a composição.</p>}
      </div>

      {/* DESPESAS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingDown size={18} color="#EF4444" /><h3 style={{ margin: 0 }}>Despesas mês a mês</h3></div>
          <div style={{ textAlign: "right", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 12, padding: "8px 14px" }}>
            <div className="sub" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "#EF4444" }}>CUSTOS TOTAIS</div>
            <b style={{ fontSize: 20 }}>{brl(r.despesas)}</b>
          </div>
        </div>
        <LineChart pts={serieDesp} cor="#EF4444" />
      </div>

      {/* COMPOSIÇÃO DOS CUSTOS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Composição dos custos</h3>
        {custoCats.length ? <CompBars itens={custoCats} total={r.despesas} /> : <p className="sub">Sem despesas no período.</p>}
      </div>

      {/* RESULTADO */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: (r.lucro >= 0 ? "#10B981" : "#EF4444") + "22", color: r.lucro >= 0 ? "#10B981" : "#EF4444" }}><Wallet size={22} /></span>
        <div style={{ flex: 1 }}>
          <div className="sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Resultado do período</div>
          <b style={{ fontSize: 26, color: r.lucro >= 0 ? "#10B981" : "#EF4444" }}>{r.lucro >= 0 ? "+" : ""}{brl(r.lucro)}</b>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="sub" style={{ fontSize: 11.5 }}>Margem</div>
          <b style={{ fontSize: 18, color: r.lucro >= 0 ? "#10B981" : "#EF4444" }}>{r.margem.toFixed(1)}%</b>
        </div>
      </div>
    </>
  );
}
