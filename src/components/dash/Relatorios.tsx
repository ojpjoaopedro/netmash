"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { SecHead, fmt, fmtCompact } from "@/components/dash/Kit";
import { CATALOGO, def, ytd, type Categoria, type Metrica } from "@/lib/indicadores";
import { resumo, serieFluxo, despesasPorCategoria, dre } from "@/lib/calc";
import { brl, pct, ultimosMeses, dataBR, hoje } from "@/lib/format";
import { BarsEntradaSaida, LinhaSaldo, DonutCategorias } from "@/components/Charts";
import type { Lancamento, Funcionario } from "@/lib/db";

type Brand = { nome: string; logo: string | null };

const PERIODOS = [3, 6, 12] as const;

const AREAS: { cat: Categoria; titulo: string; cor: string }[] = [
  { cat: "financeiro", titulo: "Financeiro", cor: "#10B981" },
  { cat: "cliente", titulo: "Cliente", cor: "#8b5cf6" },
  { cat: "comercial", titulo: "Comercial", cor: "#1AADE2" },
  { cat: "marketing", titulo: "Marketing", cor: "#ff6b9d" },
];

export default function Relatorios({
  metrs,
  lancs,
  funcs,
  saldoInicial,
  brand,
}: {
  metrs: Metrica[];
  lancs: Lancamento[];
  funcs: Funcionario[];
  saldoInicial: number;
  brand: Brand;
}) {
  const [n, setN] = useState<number>(6);

  const meses = ultimosMeses(n);
  const r = resumo(lancs, meses, saldoInicial);
  const fluxo = serieFluxo(lancs, n, saldoInicial);
  const cats = despesasPorCategoria(lancs, meses);
  const demonstrativo = dre(lancs, meses);
  const dataHoje = dataBR(hoje());

  // --------- exportações ----------
  function exportarExcel() {
    const linhasLanc = lancs.map((l) => ({
      Data: dataBR(l.data_competencia),
      Tipo: l.tipo === "receita" ? "Receita" : "Despesa",
      Descrição: l.descricao,
      Categoria: l.categoria ?? "—",
      Valor: l.valor,
      Pago: l.pago ? "Sim" : "Não",
      Vencimento: dataBR(l.vencimento),
      Contato: l.contato ?? "—",
    }));

    const linhasInd = metrs.map((m) => ({
      Categoria: m.categoria,
      Indicador: def(m.key)?.label ?? m.key,
      Mês: m.period,
      Valor: m.value,
      Meta: m.target,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhasLanc), "Lançamentos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhasInd), "Indicadores");
    XLSX.writeFile(wb, "relatorio-netmash.xlsx");
  }

  function exportarCSV() {
    const cabecalho = ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Pago", "Vencimento", "Contato"];
    const escapar = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const linhas = lancs.map((l) =>
      [
        dataBR(l.data_competencia),
        l.tipo === "receita" ? "Receita" : "Despesa",
        l.descricao,
        l.categoria ?? "",
        l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        l.pago ? "Sim" : "Não",
        dataBR(l.vencimento),
        l.contato ?? "",
      ]
        .map((c) => escapar(String(c)))
        .join(";"),
    );
    const csv = "﻿" + [cabecalho.map(escapar).join(";"), ...linhas].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-netmash.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --------- KPIs do resumo ----------
  const kpis: { label: string; valor: string; tint: string }[] = [
    { label: "Saldo em caixa", valor: brl(r.saldo), tint: "tint-cyan" },
    { label: "Faturamento", valor: fmtCompact(r.faturamento, "BRL"), tint: "tint-green" },
    { label: "Despesas", valor: fmtCompact(r.despesas, "BRL"), tint: "tint-red" },
    { label: "Lucro", valor: fmtCompact(r.lucro, "BRL"), tint: r.lucro >= 0 ? "tint-green" : "tint-red" },
    { label: "Margem", valor: pct(r.margem), tint: "tint-amber" },
  ];

  const indicadoresResumo: { key: string; label: string }[] = [
    { key: "clientes_ativos", label: "Clientes ativos" },
    { key: "nps", label: "NPS" },
    { key: "leads", label: "Leads gerados" },
  ];
  for (const ind of indicadoresResumo) {
    const v = ytd(metrs, ind.key);
    const d = def(ind.key);
    kpis.push({ label: ind.label, valor: fmt(v.value, d?.unidade ?? "count"), tint: "tint-blue" });
  }

  return (
    <div>
      {/* ---------- Controles (não imprimem) ---------- */}
      <div className="no-print">
        <SecHead
          icon="FileText"
          titulo="Relatórios"
          sub="Exporte e apresente os números da empresa"
          cor="#1AADE2"
          right={
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="period">
                {PERIODOS.map((p) => (
                  <button key={p} className={n === p ? "active" : ""} onClick={() => setN(p)}>
                    {p} meses
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => window.print()}>
                🖨️ Imprimir / PDF
              </button>
              <button className="btn ghost" onClick={exportarExcel}>
                ⬇️ Exportar Excel
              </button>
              <button className="btn ghost" onClick={exportarCSV}>
                ⬇️ Exportar CSV
              </button>
            </div>
          }
        />
      </div>

      {/* ---------- Relatório imprimível ---------- */}
      <div className="print-area">
        {/* Cabeçalho */}
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {brand.logo ? (
              <img src={brand.logo} alt={brand.nome} style={{ maxHeight: 44, maxWidth: 180, objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px" }}>{brand.nome}</div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.5px" }}>Relatório Executivo</h2>
              <p className="sub" style={{ margin: "4px 0 0" }}>
                {brand.nome} · Período: últimos {n} meses · {dataHoje}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo (KPIs) */}
        <h3 style={{ margin: "26px 0 12px", fontSize: 17, fontWeight: 800 }}>Resumo</h3>
        <div className="grid kpis">
          {kpis.map((k) => (
            <div className="card kpi" key={k.label}>
              <div className="klabel">{k.label}</div>
              <div className="kval">{k.valor}</div>
              <span className={`kbadge ${k.tint}`} />
            </div>
          ))}
        </div>

        {/* DRE */}
        <h3 style={{ margin: "26px 0 12px", fontSize: 17, fontWeight: 800 }}>DRE — Demonstrativo de Resultados</h3>
        <div className="card">
          <table className="table">
            <tbody>
              {demonstrativo.linhas.map((linha, i) => {
                const ehResultado = linha.tipo === "resultado";
                const cor =
                  linha.tipo === "receita"
                    ? "var(--green)"
                    : ehResultado
                      ? linha.valor >= 0
                        ? "var(--green)"
                        : "var(--red)"
                      : "var(--txt)";
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: ehResultado ? 800 : 500 }}>{linha.rotulo}</td>
                    <td className="num" style={{ color: cor, fontWeight: ehResultado ? 800 : 700 }}>
                      {brl(linha.valor)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ fontWeight: 700, color: "var(--muted)" }}>Margem líquida</td>
                <td className="num" style={{ color: "var(--muted)" }}>
                  {pct(demonstrativo.margem)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fluxo de caixa */}
        <h3 style={{ margin: "26px 0 12px", fontSize: 17, fontWeight: 800 }}>Fluxo de caixa</h3>
        <div className="grid two">
          <div className="card">
            <h3>Entradas x Saídas</h3>
            <BarsEntradaSaida data={fluxo} />
          </div>
          <div className="card">
            <h3>Saldo acumulado</h3>
            <LinhaSaldo data={fluxo} />
          </div>
        </div>

        {/* Despesas por categoria */}
        <h3 style={{ margin: "26px 0 12px", fontSize: 17, fontWeight: 800 }}>Despesas por categoria</h3>
        <div className="card">
          <DonutCategorias data={cats} />
        </div>

        {/* Indicadores por área */}
        <h3 style={{ margin: "26px 0 12px", fontSize: 17, fontWeight: 800 }}>Indicadores por área</h3>
        <div className="grid two">
          {AREAS.map((area) => {
            const defs = CATALOGO.filter((d) => d.categoria === area.cat);
            return (
              <div className="card" key={area.cat}>
                <h3 style={{ color: area.cor }}>{area.titulo}</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th style={{ textAlign: "right" }}>YTD</th>
                      <th style={{ textAlign: "right" }}>% da meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defs.map((d) => {
                      const v = ytd(metrs, d.key);
                      return (
                        <tr key={d.key}>
                          <td>{d.label}</td>
                          <td className="num">{fmt(v.value, d.unidade)}</td>
                          <td className="num">{v.pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
            color: "var(--muted)",
            fontSize: 12.5,
            textAlign: "center",
          }}
        >
          Gerado por {brand.nome} · {dataHoje} · {funcs.filter((f) => f.ativo).length} colaboradores ativos
        </div>
      </div>
    </div>
  );
}
