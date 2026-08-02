"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, DollarSign, CreditCard, TrendingUp, Sparkles } from "lucide-react";
import { MES, carregarEstruturaComPagamentos, resultadoDe, ebitdaDe } from "@/app/minhasmetricas/financas-estrutura";
import BotaoOcultar from "./ocultar";

const AZUL = "#38BDF8", VERDE = "#10B981", VERMELHO = "#F43F5E";
const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmt2 = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Barra empilhada + cards de composição (faturamento ou custos). */
function Composicao({ titulo, Icon, cor, total, itens, badge }: {
  titulo: string; Icon: typeof DollarSign; cor: string; total: number; badge: string;
  itens: { nome: string; valor: number; cor: string }[];
}) {
  const soma = Math.max(1, total);
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 16 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `${cor}1f`, color: cor }}><Icon size={17} /></span>
          {titulo}
        </b>
        <span style={{ textAlign: "right", padding: "6px 14px", borderRadius: 12, background: `${cor}14`, border: `1px solid ${cor}44` }}>
          <span style={{ display: "block", fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: cor }}>{badge}</span>
          <span className="oc-num" style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{fmt(total)}</span>
        </span>
      </div>
      {/* barra empilhada */}
      <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", marginBottom: 16, background: "var(--bg-2)" }}>
        {itens.map((it) => <div key={it.nome} title={`${it.nome} · ${fmt(it.valor)}`} style={{ width: `${(it.valor / soma) * 100}%`, background: it.cor }} />)}
      </div>
      {/* cards por item */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {itens.map((it) => (
          <div key={it.nome} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>
              <i style={{ width: 8, height: 8, borderRadius: 99, background: it.cor, display: "inline-block" }} /> {it.nome}
            </div>
            <b className="oc-num" style={{ display: "block", fontSize: 17, marginTop: 4 }}>{fmt(it.valor)}</b>
            <span className="sub" style={{ fontSize: 11.5, fontStyle: "italic" }}>{total ? Math.round((it.valor / total) * 100) : 0}% do total</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnaliseResultados({ onVoltar, ano = 2026 }: { onVoltar: () => void; ano?: number }) {
  const data = useMemo(() => carregarEstruturaComPagamentos(ano), [ano]);
  // padrão: TODOS os meses marcados
  const [sel, setSel] = useState<Set<number>>(() => new Set(Array.from({ length: 12 }, (_, i) => i)));
  const toggle = (m: number) => setSel((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n.size ? n : s; });

  const calc = useMemo(() => {
    const somaSel = (v: number[]) => [...sel].reduce((s, m) => s + (v[m] || 0), 0);
    const grupos = data.custos.flatMap((b) => b.grupos);
    const canais = data.receitas.map((r) => ({ nome: r.nome, valor: somaSel(r.v), cor: r.cor || AZUL })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const custos = grupos.map((g) => ({ nome: g.nome, valor: g.itens.reduce((s, it) => s + somaSel(it.v), 0), cor: g.cor })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const totRec = canais.reduce((s, x) => s + x.valor, 0);
    const totCus = custos.reduce((s, x) => s + x.valor, 0);
    const resultado = somaSel(resultadoDe(data));
    const ebitda = somaSel(ebitdaDe(data));
    return { canais, custos, totRec, totCus, resultado, ebitda, margem: totRec ? (resultado / totRec) * 100 : 0 };
  }, [data, sel]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* seletor de meses (padrão) + ocultar valores */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onVoltar} title="Voltar aos relatórios" style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}><ArrowLeft size={16} /></button>
          {MES.map((nome, m) => {
            const on = sel.has(m);
            return (
              <button key={m} onClick={() => toggle(m)}
                style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-ct,#fff)" : "var(--muted)" }}>
                {nome}
              </button>
            );
          })}
        </div>
        <BotaoOcultar />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }} className="analise-grid">
        {/* coluna esquerda: composições */}
        <div style={{ display: "grid", gap: 16 }}>
          <Composicao titulo="Composição do Faturamento" Icon={DollarSign} cor={VERDE} total={calc.totRec} badge="Total faturado" itens={calc.canais} />
          <Composicao titulo="Composição dos Custos" Icon={CreditCard} cor={VERMELHO} total={calc.totCus} badge="Custos totais" itens={calc.custos} />
        </div>

        {/* coluna direita: resultado */}
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "22px 24px", color: "#fff", background: "linear-gradient(150deg, #047857, #10B981)" }}>
            <Sparkles size={64} style={{ position: "absolute", right: -8, top: -8, opacity: .18 }} />
            <div style={{ position: "relative" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", opacity: .95 }}><TrendingUp size={13} /> Lucro do período</span>
              <b className="oc-num" style={{ display: "block", fontSize: 30, marginTop: 8, letterSpacing: "-.02em" }}>{calc.resultado >= 0 ? "+" : ""}{fmt2(calc.resultado)}</b>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.2)", padding: "3px 10px", borderRadius: 99 }}>
                <TrendingUp size={12} /> Margem {calc.margem.toFixed(1).replace(".", ",")}%
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="sub" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>Receitas totais</div>
            <b className="oc-num" style={{ fontSize: 26, letterSpacing: "-.02em" }}>{fmt2(calc.totRec)}</b>
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(244,63,94,.08)", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Custos totais</span>
                <b className="oc-num" style={{ color: VERMELHO }}>- {fmt2(calc.totCus)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16,185,129,.1)", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Resultado</span>
                <b className="oc-num" style={{ color: VERDE }}>{calc.resultado >= 0 ? "+" : ""}{fmt2(calc.resultado)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>EBITDA</span>
                <b className="oc-num">{fmt2(calc.ebitda)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
