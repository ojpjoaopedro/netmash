"use client";
import { Lancamento, Funcionario } from "@/lib/db";
import { resumo, serieFluxo, despesasPorCategoria, dre, custoFolha } from "@/lib/calc";
import { brl, pct, ultimosMeses, diasAte, dataBR } from "@/lib/format";
import { BarsEntradaSaida, LinhaSaldo, DonutCategorias } from "./Charts";

export default function Dashboard({
  lancs, funcs, saldoInicial, meses,
}: { lancs: Lancamento[]; funcs: Funcionario[]; saldoInicial: number; meses: number }) {
  const periodo = ultimosMeses(meses);
  const r = resumo(lancs, periodo, saldoInicial);
  const serie = serieFluxo(lancs, meses, saldoInicial);
  const cats = despesasPorCategoria(lancs, periodo);
  const d = dre(lancs, periodo);
  const folha = custoFolha(funcs);

  // próximos vencimentos (contas em aberto, próximas 5)
  const vencendo = lancs
    .filter((l) => !l.pago && l.vencimento)
    .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1))
    .slice(0, 5);

  const kpis = [
    { label: "Saldo em caixa", val: brl(r.saldo), ico: "💰", tint: "tint-cyan", trend: r.saldo >= 0 ? "Posição atual" : "Negativo", cls: r.saldo >= 0 ? "up" : "down" },
    { label: "Faturamento", val: brl(r.faturamento), ico: "📈", tint: "tint-green", trend: `${meses} meses`, cls: "up" },
    { label: "Despesas", val: brl(r.despesas), ico: "📉", tint: "tint-red", trend: `${meses} meses`, cls: "down" },
    { label: "Lucro", val: brl(r.lucro), ico: "🏆", tint: r.lucro >= 0 ? "tint-green" : "tint-red", trend: `Margem ${pct(r.margem)}`, cls: r.lucro >= 0 ? "up" : "down" },
  ];

  return (
    <>
      <div className="grid kpis" style={{ marginBottom: 16 }}>
        {kpis.map((k) => (
          <div className="card kpi" key={k.label}>
            <div className={`kbadge ${k.tint}`}>{k.ico}</div>
            <div className="klabel">{k.label}</div>
            <div className="kval">{k.val}</div>
            <div className={`ktrend ${k.cls}`}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* alertas a receber / a pagar / folha */}
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="kbadge tint-green">📥</div>
          <div className="klabel">A receber (em aberto)</div>
          <div className="kval" style={{ fontSize: 22 }}>{brl(r.aReceber)}</div>
          <div className="ktrend up">Contas a receber</div>
        </div>
        <div className="card kpi">
          <div className="kbadge tint-amber">📤</div>
          <div className="klabel">A pagar (em aberto)</div>
          <div className="kval" style={{ fontSize: 22 }}>{brl(r.aPagar)}</div>
          <div className="ktrend warn">Contas a pagar</div>
        </div>
        <div className="card kpi">
          <div className="kbadge tint-blue">👥</div>
          <div className="klabel">Custo de folha / mês</div>
          <div className="kval" style={{ fontSize: 22 }}>{brl(folha.total)}</div>
          <div className="ktrend" style={{ color: "var(--muted)" }}>{folha.ativos} colaborador(es)</div>
        </div>
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Entradas x Saídas</h3>
          <div className="legend" style={{ marginBottom: 8 }}>
            <span><i style={{ background: "var(--green)" }} />Entradas</span>
            <span><i style={{ background: "var(--red)" }} />Saídas</span>
          </div>
          <BarsEntradaSaida data={serie} />
        </div>
        <div className="card">
          <h3>Saldo de caixa (evolução)</h3>
          <p className="sub">Saldo acumulado ao fim de cada mês</p>
          <LinhaSaldo data={serie} />
        </div>
      </div>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Para onde vai o dinheiro</h3>
          <p className="sub">Despesas por categoria no período</p>
          <DonutCategorias data={cats} />
        </div>
        <div className="card">
          <h3>DRE — Demonstração de Resultado</h3>
          <p className="sub">Resultado do período ({meses} meses)</p>
          <table className="table">
            <tbody>
              {d.linhas.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: l.tipo === "resultado" ? 800 : 600, paddingLeft: l.tipo === "despesa" ? 22 : 12 }}>
                    {l.rotulo}
                  </td>
                  <td className="num" style={{
                    color: l.tipo === "receita" ? "var(--green)" : l.tipo === "resultado" ? (l.valor >= 0 ? "var(--green)" : "var(--red)") : "var(--txt)",
                    fontWeight: l.tipo === "resultado" ? 800 : 700,
                    borderTop: l.tipo === "resultado" ? "2px solid var(--line)" : undefined,
                    fontSize: l.tipo === "resultado" ? 15 : 14,
                  }}>
                    {brl(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <span className={`chip ${d.lucro >= 0 ? "green" : "red"}`}>Margem líquida {pct(d.margem)}</span>
          </div>
        </div>
      </div>

      {/* próximos vencimentos */}
      <div className="card">
        <h3>Próximos vencimentos</h3>
        {vencendo.length === 0 ? (
          <div className="empty"><div className="big">✅</div>Nenhuma conta em aberto. Tudo em dia!</div>
        ) : (
          <table className="table">
            <thead><tr><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {vencendo.map((l) => {
                const dias = diasAte(l.vencimento);
                const venc = dias !== null && dias < 0;
                const perto = dias !== null && dias >= 0 && dias <= 5;
                return (
                  <tr key={l.id}>
                    <td>{l.descricao}</td>
                    <td><span className={`chip ${l.tipo === "receita" ? "green" : "amber"}`}>{l.tipo === "receita" ? "A receber" : "A pagar"}</span></td>
                    <td>
                      {dataBR(l.vencimento)}{" "}
                      {venc && <span className="chip red" style={{ marginLeft: 6 }}>vencida</span>}
                      {perto && <span className="chip amber" style={{ marginLeft: 6 }}>em {dias}d</span>}
                    </td>
                    <td className="num" style={{ color: l.tipo === "receita" ? "var(--green)" : "var(--red)" }}>{brl(l.valor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
