"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { Metrica, Categoria, CATALOGO, def, ytd, valorMes, statusMeta, serieMes } from "@/lib/indicadores";
import { Lancamento, Funcionario } from "@/lib/db";
import { resumo, despesasPorCategoria, saldoCaixa } from "@/lib/calc";
import { rotuloMes, mesDe, brl } from "@/lib/format";
import { SecHead, KpiRing, QuarterCard, MonthCard, AnalysisCard, fmt, fmtCompact } from "./Kit";
import { MiniLineCard, DonutCategorias } from "../Charts";
import DashboardFinance from "../Dashboard";

export type AreaConfig = {
  categoria: Categoria;
  titulo: string;
  icon: string;
  cor: string;
  principal: string;
  secundarias: [string, string];
  analises: { icon: string; titulo: string; sub: string; cor: string }[];
  unidadePrincipalLabel: string;
};

const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const TRI_PERIODOS = ["Janeiro a Março", "Abril a Junho", "Julho a Setembro", "Outubro a Dezembro"];

type Modo = { t: "geral" } | { t: "consolidado" } | { t: "mes"; period: string } | { t: "analise"; titulo: string };

export default function AreaOverview({ metrs, cfg, lancs = [], funcs = [], saldoInicial = 0, onEditar }: {
  metrs: Metrica[]; cfg: AreaConfig; lancs?: Lancamento[]; funcs?: Funcionario[]; saldoInicial?: number;
  onEditar?: (c: Categoria) => void;
}) {
  const ano = new Date().getFullYear();
  const [modo, setModo] = useState<Modo>({ t: "geral" });
  const dPrin = def(cfg.principal)!;
  const yPrin = ytd(metrs, cfg.principal);
  const cats = useMemo(() => CATALOGO.filter((d) => d.categoria === cfg.categoria), [cfg.categoria]);

  const kpis = cats.map((d) => {
    const y = ytd(metrs, d.key);
    return { ico: d, valor: fmt(y.value, d.unidade), pct: y.pct, meta: fmtCompact(y.meta, d.unidade), status: statusMeta(y.pct, d.invert) };
  });

  const porMes = useMemo(() => {
    const serie = serieMes(metrs, cfg.principal);
    const map = new Map(serie.map((s) => [s.period, s.value]));
    return MESES_NOME.map((nome, i) => {
      const period = `${ano}-${String(i + 1).padStart(2, "0")}`;
      return { nome, period, value: map.get(period) ?? null };
    });
  }, [metrs, cfg.principal, ano]);

  const trimestres = [0, 1, 2, 3].map((q) => {
    const meses = porMes.slice(q * 3, q * 3 + 3);
    const comDados = meses.filter((m) => m.value !== null);
    return { q: q + 1, total: comDados.reduce((a, m) => a + (m.value || 0), 0), soon: comDados.length === 0, count: comDados.length };
  });

  const banner2 = cfg.secundarias.map((k) => {
    const d = def(k)!; const y = ytd(metrs, k);
    return { label: d.label, valor: fmt(y.value, d.unidade), meta: fmtCompact(y.meta, d.unidade) };
  });

  // ---------- Sub-view header ----------
  const SubHeader = ({ titulo, pill }: { titulo: string; pill?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "8px 0 18px", flexWrap: "wrap" }}>
      <button className="btn ghost sm" onClick={() => setModo({ t: "geral" })}><ArrowLeft size={15} /> Visão Geral</button>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{cfg.titulo}</h2>
      {pill && (
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
          <Sparkles size={15} color={cfg.cor} /> {titulo}
        </span>
      )}
    </div>
  );

  // ---------- CONSOLIDADO (linhas) ----------
  if (modo.t === "consolidado") {
    return (
      <>
        <SubHeader titulo={`Consolidado · ${ano}`} pill="consolidado" />
        <div style={{
          borderRadius: 16, padding: "16px 20px", marginBottom: 18, fontWeight: 800, fontSize: 17,
          background: "linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.04))", border: "1px solid rgba(245,158,11,.25)",
        }}>
          <span style={{ color: "#F59E0B", fontSize: 11.5, letterSpacing: 1, display: "block", textTransform: "uppercase" }}>Visão anual consolidada · {ano}</span>
          Evolução mês a mês de todos os indicadores
        </div>
        <div className="grid two">
          {cats.map((d) => (
            <MiniLineCard key={d.key} titulo={d.label} unidade={d.unidade} cor={d.cor}
              serie={serieMes(metrs, d.key).filter((s) => s.period.startsWith(String(ano))).map((s) => ({ period: s.period, value: s.value }))} />
          ))}
        </div>
      </>
    );
  }

  // ---------- DRILL-DOWN DO MÊS ----------
  if (modo.t === "mes") {
    const period = modo.period;
    const mesNome = MESES_NOME[Number(period.split("-")[1]) - 1];
    const kpisMes = cats.map((d) => {
      const m = valorMes(metrs, d.key, period);
      const v = m?.value ?? 0; const t = m?.target ?? Math.round(d.metaAno / 12);
      const pct = t ? Math.round((v / t) * 100) : 0;
      return { ico: d, valor: fmt(v, d.unidade), pct, meta: fmtCompact(t, d.unidade), status: statusMeta(pct, d.invert) };
    });
    const r = cfg.categoria === "financeiro" ? resumo(lancs, [period], saldoInicial) : null;
    return (
      <>
        <SubHeader titulo={`${mesNome} ${ano}`} pill="mes" />
        <div className="grid four">
          {kpisMes.map((k) => <KpiRing key={k.ico.key} icon={k.ico.icon} label={k.ico.label} valor={k.valor} pct={k.pct} meta={k.meta} status={k.status} cor={k.ico.cor} />)}
        </div>
        {r && (
          <div className="grid two" style={{ marginTop: 16 }}>
            <div className="card">
              <h3>Resultado de {mesNome}</h3>
              <table className="table"><tbody>
                <tr><td>Receita</td><td className="num" style={{ color: "var(--green)" }}>{brl(r.faturamento)}</td></tr>
                <tr><td>Despesas</td><td className="num" style={{ color: "var(--red)" }}>{brl(r.despesas)}</td></tr>
                <tr><td style={{ fontWeight: 800 }}>Lucro</td><td className="num" style={{ color: r.lucro >= 0 ? "var(--green)" : "var(--red)", borderTop: "2px solid var(--line)", fontWeight: 800 }}>{brl(r.lucro)}</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <h3>Despesas por categoria</h3>
              <DonutCategorias data={despesasPorCategoria(lancs, [period])} />
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- ANÁLISES ESPECIAIS (financeiro) ----------
  if (modo.t === "analise") {
    const titulo = modo.titulo;
    if (/saldo de caixa/i.test(titulo)) {
      return (<><SubHeader titulo="Saldo de Caixa · DRE" pill="caixa" /><DashboardFinance lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} meses={6} /></>);
    }
    if (/equil/i.test(titulo)) {
      const meses6 = serieMes(metrs, "custos").slice(-6);
      const custoMedio = meses6.length ? meses6.reduce((a, s) => a + s.value, 0) / meses6.length : 0;
      const margemMedia = valorMes(metrs, "margem", porMes.findLast((m) => m.value !== null)?.period ?? "")?.value ?? 30;
      const margemContrib = Math.max(10, margemMedia + 20); // estimativa simples
      const breakeven = margemContrib ? custoMedio / (margemContrib / 100) : 0;
      const saldo = saldoCaixa(lancs, saldoInicial);
      void saldo;
      return (
        <>
          <SubHeader titulo="Ponto de Equilíbrio" pill="pe" />
          <div className="grid two">
            <div className="card">
              <h3>Quanto você precisa faturar para empatar</h3>
              <div style={{ fontSize: 34, fontWeight: 800, color: "var(--amber)", margin: "6px 0" }}>{brl(breakeven)}</div>
              <p className="sub">Estimativa pelo custo médio mensal ({brl(custoMedio)}) e margem de contribuição estimada ({margemContrib.toFixed(0)}%). Acima desse faturamento, todo real adicional vira lucro.</p>
            </div>
            <div className="card">
              <h3>Como usar</h3>
              <p className="sub" style={{ lineHeight: 1.7 }}>
                Quer o cálculo exato? Vá em <b>Operações → Ferramentas</b> e use a calculadora de <b>Ponto de equilíbrio</b> com seus custos fixos e margem reais. Lá também tem <b>precificação</b> e <b>projeção de caixa</b>.
              </p>
            </div>
          </div>
        </>
      );
    }
    // fallback -> consolidado
    setModo({ t: "consolidado" });
    return null;
  }

  // ---------- VISÃO GERAL ----------
  return (
    <>
      <SecHead icon={cfg.icon} titulo={cfg.titulo} sub="Visão geral do ano — escolha um mês para abrir os detalhes" cor={cfg.cor} ano={ano}
        right={onEditar && <button className="btn ghost sm" onClick={() => onEditar(cfg.categoria)}><Pencil size={14} /> Editar dados</button>} />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: 20, padding: "22px 24px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
          background: `linear-gradient(135deg, ${cfg.cor}, ${cfg.cor}77)`, color: "#fff" }} className="keep-white">
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>{dPrin.label} {ano}</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, margin: "8px 0 6px" }}>{fmt(yPrin.value, dPrin.unidade)}</div>
          <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.25)", overflow: "hidden", maxWidth: 520 }}>
            <div style={{ height: "100%", width: `${Math.min(yPrin.pct, 100)}%`, background: "#fff", borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6, opacity: 0.9 }}>{yPrin.pct}% da meta · Meta {fmtCompact(yPrin.meta, dPrin.unidade)}</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {banner2.map((b) => (
            <div key={b.label} style={{ background: "rgba(255,255,255,.14)", borderRadius: 14, padding: "14px 16px", minWidth: 150 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.85 }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 2px" }}>{b.valor}</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>Meta {b.meta}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <SecHead icon="Activity" titulo="Indicadores-chave" sub={`${cfg.titulo} até agora · ${ano}`} cor={cfg.cor} />
      <div className="grid four">
        {kpis.map((k, i) => <KpiRing key={k.ico.key} icon={k.ico.icon} label={k.ico.label} valor={k.valor} pct={k.pct} meta={k.meta} status={k.status} cor={k.ico.cor} delay={i * 0.04} />)}
      </div>

      <SecHead icon="Target" titulo="Por trimestre" sub={`Visão consolidada de cada trimestre de ${ano}`} cor="#10B981" />
      <div className="grid four">
        {trimestres.map((t) => (
          <QuarterCard key={t.q} n={t.q} titulo={`${t.q}º TRI ${ano}`} periodo={`${TRI_PERIODOS[t.q - 1]} de ${ano}`}
            soon={t.soon} valor={fmtCompact(t.total, dPrin.unidade)}
            onClick={() => { const m = porMes.slice((t.q - 1) * 3, (t.q - 1) * 3 + 3).find((x) => x.value !== null); if (m) setModo({ t: "mes", period: m.period }); }}
            extra={<span style={{ color: "#10B981" }}>{t.count} {t.count === 1 ? "mês" : "meses"}</span>} />
        ))}
      </div>

      <SecHead icon="Calendar" titulo="Escolha o mês" sub={`Abra os detalhes de qualquer mês de ${ano}`} cor="#1AADE2" />
      <div className="grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {porMes.map((m) => (
          <MonthCard key={m.period} nome={m.nome} icon="Calendar" cor={cfg.cor}
            soon={m.value === null} valor={m.value !== null ? fmtCompact(m.value, dPrin.unidade) : undefined}
            onClick={() => setModo({ t: "mes", period: m.period })}
            extra={<span style={{ color: "var(--muted)" }}>{rotuloMes(m.period)}</span>} />
        ))}
      </div>

      <SecHead icon="Sparkles" titulo="Análises e relatórios" sub={`Visões aprofundadas de ${cfg.titulo.toLowerCase()}`} cor="#F59E0B" />
      <div className="grid three">
        {cfg.analises.map((a) => (
          <AnalysisCard key={a.titulo} {...a}
            onClick={() => setModo(/consolidado/i.test(a.titulo) ? { t: "consolidado" } : { t: "analise", titulo: a.titulo })} />
        ))}
      </div>
    </>
  );
}
