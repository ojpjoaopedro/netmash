"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, CalendarClock, Wallet, Percent, type LucideIcon } from "lucide-react";
import { Metrica, valorMes, ytd, def, statusMeta } from "@/lib/indicadores";
import { Lancamento } from "@/lib/db";
import { gerarInsights } from "@/lib/insights";
import { projecaoCaixa } from "@/lib/calc";
import { ultimosMeses, brl, rotuloMes } from "@/lib/format";
import { SecHead, MiniKpi, KpiRing, fmt, fmtCompact, Icon } from "./Kit";
import { LinhaSaldo } from "../Charts";

const INS_ICON: Record<string, LucideIcon> = { TrendingUp, TrendingDown, AlertTriangle, CalendarClock, Wallet, Percent };
const INS_COR = { good: "#10B981", warn: "#F59E0B", bad: "#EF4444", info: "#1AADE2" } as const;

function saudacaoHora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const KPIS_DASHBOARD = ["faturamento", "mrr", "novos_clientes", "cross_sell", "nps", "leads"];

export default function DashboardHub({ metrs, lancs, saldoInicial, nome }: { metrs: Metrica[]; lancs: Lancamento[]; saldoInicial: number; nome: string }) {
  const mesAtual = ultimosMeses(1)[0];
  const insights = useMemo(() => gerarInsights(metrs, lancs, saldoInicial), [metrs, lancs, saldoInicial]);
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const minis = useMemo(() => {
    const fat = valorMes(metrs, "faturamento", mesAtual)?.value ?? 0;
    const novos = valorMes(metrs, "novos_clientes", mesAtual)?.value ?? 0;
    const ativos = valorMes(metrs, "clientes_ativos", mesAtual)?.value ?? 0;
    const nps = valorMes(metrs, "nps", mesAtual)?.value ?? 0;
    return [
      { icon: "DollarSign", valor: fmtCompact(fat, "BRL"), label: "Faturamento", cor: "#10B981" },
      { icon: "TrendingUp", valor: fmt(novos, "count"), label: "Novos clientes", cor: "#1AADE2" },
      { icon: "Users", valor: fmt(ativos, "count"), label: "Clientes ativos", cor: "#8b5cf6" },
      { icon: "Activity", valor: fmt(nps, "score"), label: "Saúde cliente (NPS)", cor: "#F59E0B" },
    ];
  }, [metrs, mesAtual]);

  const kpis = useMemo(() => KPIS_DASHBOARD.map((key) => {
    const d = def(key)!;
    const y = ytd(metrs, key);
    return {
      icon: d.icon, cor: d.cor, label: d.label,
      valor: fmt(y.value, d.unidade), pct: y.pct,
      meta: fmtCompact(y.meta, d.unidade), status: statusMeta(y.pct, d.invert),
    };
  }), [metrs]);

  const ano = new Date().getFullYear();
  const proj = useMemo(() => projecaoCaixa(lancs, saldoInicial, 6), [lancs, saldoInicial]);
  const menorSaldo = proj.length ? Math.min(...proj.map((p) => p.saldo)) : 0;
  const mesNegativo = proj.find((p) => p.saldo < 0);

  return (
    <>
      {/* HERO */}
      <motion.div className="hero" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="greet">
          <div className="hi">{saudacaoHora()}{nome ? `, ${nome}` : ""}</div>
          <h1>Visão geral da empresa</h1>
          <p style={{ textTransform: "capitalize" }}>{hoje}</p>
        </div>
        <div className="minis">
          {minis.map((m) => <MiniKpi key={m.label} {...m} />)}
        </div>
      </motion.div>

      {/* PULSO DO DIA */}
      {insights.length > 0 && (
        <>
          <SecHead icon="Sparkles" titulo="Pulso do dia" sub="O que merece sua atenção agora" cor="#F59E0B" />
          <div className="grid four">
            {insights.map((ins, i) => {
              const IcoC = INS_ICON[ins.icon] || Wallet;
              const cor = INS_COR[ins.tone];
              return (
                <motion.div key={i} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ borderColor: `${cor}55`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: `${cor}22`, flexShrink: 0 }}>
                    <IcoC size={19} color={cor} />
                  </span>
                  <div>
                    <b style={{ fontSize: 13.5 }}>{ins.titulo}</b>
                    <div className="sub" style={{ marginTop: 3, lineHeight: 1.5 }}>{ins.texto}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* INDICADORES-CHAVE */}
      <SecHead icon="Target" titulo="Indicadores-chave" sub={`Visão do ano até agora · ${ano}`} cor="#1AADE2" />
      <div className="grid three">
        {kpis.map((k, i) => <KpiRing key={k.label} {...k} delay={i * 0.05} />)}
      </div>

      {/* PROJEÇÃO DE CAIXA */}
      <div style={{ marginTop: 22 }}>
        <SecHead icon="Wallet" titulo="Projeção de caixa" sub="Para onde seu caixa vai nos próximos 6 meses" cor="#10B981" />
        {mesNegativo && (
          <div className="err" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ No ritmo atual, seu caixa fica <b>negativo</b> em <b>{rotuloMes(mesNegativo.mes)}</b> ({brl(mesNegativo.saldo)}). Antecipe recebimentos ou segure despesas.
          </div>
        )}
        <div className="grid two">
          <div className="card">
            <h3>Saldo projetado</h3>
            <p className="sub" style={{ marginBottom: 6 }}>Menor saldo no período: <b style={{ color: menorSaldo >= 0 ? "var(--green)" : "var(--red)" }}>{brl(menorSaldo)}</b></p>
            <LinhaSaldo data={proj} />
          </div>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Mês</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Saldo</th></tr></thead>
              <tbody>
                {proj.map((p) => (
                  <tr key={p.mes}>
                    <td className="mono">{rotuloMes(p.mes)}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{brl(p.entradas)}</td>
                    <td className="num" style={{ color: "var(--red)" }}>{brl(p.saidas)}</td>
                    <td className="num" style={{ color: p.saldo >= 0 ? "var(--txt)" : "var(--red)" }}>{brl(p.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="sub" style={{ marginTop: 8 }}>Estimativa pela média dos últimos 3 meses + contas já agendadas. Lance suas receitas/despesas e gere as despesas do mês (em Custos) para ficar mais precisa.</p>
      </div>

      <div style={{ marginTop: 22 }}>
        <SecHead icon="Sparkles" titulo="Atalhos" sub="Onde olhar agora" cor="#8b5cf6" />
        <div className="grid four">
          <Atalho icon="DollarSign" t="Finanças" s="Fluxo, DRE e lucro" cor="#10B981" />
          <Atalho icon="Smile" t="Saúde do Cliente" s="NPS, churn, base" cor="#8b5cf6" />
          <Atalho icon="ShoppingCart" t="Comercial" s="Vendas e conversão" cor="#1AADE2" />
          <Atalho icon="Megaphone" t="Marketing" s="Leads e ROI" cor="#ff6b9d" />
        </div>
      </div>
    </>
  );
}

function Atalho({ icon, t, s, cor }: { icon: string; t: string; s: string; cor: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${cor}22`, flexShrink: 0 }}>
        <Icon name={icon} size={20} color={cor} />
      </span>
      <div>
        <b style={{ fontSize: 14.5 }}>{t}</b>
        <div className="sub">{s}</div>
      </div>
    </div>
  );
}
