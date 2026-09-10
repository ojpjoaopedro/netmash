"use client";
/** Aba Funil: funil do mês inteiro + um funil por semana com dados (semana vazia some). */
import { CARD, LBL, Funil3 } from "./shared";
import {
  somar, cpm, cpc, ctr, cpl, conv, listaSemanas, brl, mesLabel, type Resultado,
} from "@/lib/trafego";

export default function Funil({ rows, mes }: { rows: Resultado[]; mes: string }) {
  const doMes = rows.filter((r) => r.mes === mes);
  const totalMes = somar(doMes);
  const semanasComDados = listaSemanas(mes)
    .map((s) => ({ s, agg: somar(doMes.filter((r) => r.semana === s)) }))
    .filter(({ agg }) => agg.investido > 0 || agg.impressoes > 0 || agg.cliques > 0 || agg.leads > 0);

  if (doMes.length === 0) {
    return <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>Sem dados em {mesLabel(mes)}. Preencha em Resultados ou use Puxar da Meta.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={LBL}>Funil de marketing</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Total de {mesLabel(mes)}, somando todas as semanas e campanhas.</div>
          </div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Investido: <b style={{ color: "#10B981", fontSize: 18 }}>{brl(totalMes.investido, 0)}</b></span>
        </div>
        <Funil3 investido={totalMes.investido} impressoes={totalMes.impressoes} cliques={totalMes.cliques} leads={totalMes.leads}
          cpm={cpm(totalMes)} cpc={cpc(totalMes)} ctr={ctr(totalMes)} cpl={cpl(totalMes)} conv={conv(totalMes)} />
      </div>

      {semanasComDados.length > 0 && (
        <div style={CARD}>
          <div style={{ ...LBL, marginBottom: 16 }}>Resultado semanal</div>
          {semanasComDados.map(({ s, agg }) => (
            <div key={s} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1AADE2", background: "rgba(26,173,226,.14)", padding: "4px 12px", borderRadius: 99 }}>Semana {s}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Investido: <b style={{ color: "#10B981" }}>{brl(agg.investido, 0)}</b></span>
              </div>
              <Funil3 investido={agg.investido} impressoes={agg.impressoes} cliques={agg.cliques} leads={agg.leads}
                cpm={cpm(agg)} cpc={cpc(agg)} ctr={ctr(agg)} cpl={cpl(agg)} conv={conv(agg)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
