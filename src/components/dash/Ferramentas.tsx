"use client";
import { useMemo, useState } from "react";
import type { Lancamento } from "@/lib/db";
import { SecHead, Icon } from "./Kit";
import { brl, pct, rotuloMes, mesDe, ultimosMeses } from "@/lib/format";
import { serieFluxo } from "@/lib/calc";

// Parsing de número aceitando vírgula como separador decimal
function num(s: string): number {
  const v = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

type Aba = "preco" | "equilibrio" | "projecao" | "reserva";

const ABAS: { id: Aba; label: string }[] = [
  { id: "preco", label: "Precificação" },
  { id: "equilibrio", label: "Ponto de equilíbrio" },
  { id: "projecao", label: "Projeção de caixa" },
  { id: "reserva", label: "Reserva de emergência" },
];

export default function Ferramentas({ lancs }: { lancs: import("@/lib/db").Lancamento[] }) {
  const [aba, setAba] = useState<Aba>("preco");

  return (
    <div>
      <SecHead
        icon="Sparkles"
        titulo="Ferramentas para o empresário"
        sub="Calculadoras práticas para precificar, planejar e proteger o caixa"
      />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
        <div className="period">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={aba === a.id ? "active" : ""}
              onClick={() => setAba(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {aba === "preco" && <Precificacao />}
      {aba === "equilibrio" && <Equilibrio lancs={lancs} />}
      {aba === "projecao" && <Projecao lancs={lancs} />}
      {aba === "reserva" && <Reserva lancs={lancs} />}
    </div>
  );
}

// ============================================================
// 1) Precificação (markup)
// ============================================================
function Precificacao() {
  const [custo, setCusto] = useState("100,00");
  const [despPct, setDespPct] = useState("20");
  const [margemPct, setMargemPct] = useState("30");

  const r = useMemo(() => {
    const c = num(custo);
    const d = num(despPct);
    const m = num(margemPct);
    const somaPct = d + m;
    if (somaPct >= 100) return { erro: true as const, somaPct };
    const divisor = 1 - somaPct / 100;
    const preco = c / divisor;
    const lucroR = preco - c - preco * (d / 100);
    const lucroPctVenda = preco ? (lucroR / preco) * 100 : 0;
    const markup = c ? preco / c : 0;
    return { erro: false as const, preco, lucroR, lucroPctVenda, markup, somaPct };
  }, [custo, despPct, margemPct]);

  return (
    <div className="grid two">
      <div className="card">
        <h3>Calculadora de preço de venda</h3>
        <p className="sub" style={{ marginBottom: 16 }}>
          Defina o preço ideal a partir do custo, das despesas sobre a venda e da margem desejada.
        </p>

        <div className="field">
          <label className="f">Custo do produto (R$)</label>
          <input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Despesas + impostos sobre a venda (%)</label>
          <input inputMode="decimal" value={despPct} onChange={(e) => setDespPct(e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Margem de lucro desejada (%)</label>
          <input inputMode="decimal" value={margemPct} onChange={(e) => setMargemPct(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <h3>Resultado</h3>
        {r.erro ? (
          <div className="err">
            Despesas + margem somam {pct(r.somaPct)}. A soma precisa ser menor que 100% para
            calcular o preço de venda.
          </div>
        ) : (
          <>
            <div className="sub">Preço de venda sugerido</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1px", margin: "4px 0 18px" }}>
              {brl(r.preco)}
            </div>
            <div className="grid three">
              <div>
                <div className="sub">Markup</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{r.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×</div>
              </div>
              <div>
                <div className="sub">Lucro por unidade</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{brl(r.lucroR)}</div>
              </div>
              <div>
                <div className="sub">Lucro (% da venda)</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{pct(r.lucroPctVenda)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2) Ponto de equilíbrio
// ============================================================
function Equilibrio({ lancs }: { lancs: Lancamento[] }) {
  const [fixos, setFixos] = useState("10000,00");
  const [margemContrib, setMargemContrib] = useState("40");

  const mesAtual = ultimosMeses(1)[0];
  const fatAtual = useMemo(
    () =>
      lancs
        .filter((l) => l.tipo === "receita" && mesDe(l.data_competencia) === mesAtual)
        .reduce((a, l) => a + l.valor, 0),
    [lancs, mesAtual]
  );

  const r = useMemo(() => {
    const cf = num(fixos);
    const mc = num(margemContrib);
    if (mc <= 0) return { erro: true as const };
    const equilibrio = cf / (mc / 100);
    const dif = fatAtual - equilibrio;
    return { erro: false as const, equilibrio, dif };
  }, [fixos, margemContrib, fatAtual]);

  return (
    <div className="grid two">
      <div className="card">
        <h3>Faturamento de equilíbrio</h3>
        <p className="sub" style={{ marginBottom: 16 }}>
          Quanto você precisa faturar por mês para cobrir os custos fixos.
        </p>
        <div className="field">
          <label className="f">Custos fixos mensais (R$)</label>
          <input inputMode="decimal" value={fixos} onChange={(e) => setFixos(e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Margem de contribuição (%)</label>
          <input inputMode="decimal" value={margemContrib} onChange={(e) => setMargemContrib(e.target.value)} />
        </div>
        <p className="sub">
          Margem de contribuição = quanto sobra de cada venda depois dos custos variáveis.
        </p>
      </div>

      <div className="card">
        <h3>Resultado</h3>
        {r.erro ? (
          <div className="err">Informe uma margem de contribuição maior que 0%.</div>
        ) : (
          <>
            <div className="sub">Faturamento de equilíbrio (mês)</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1px", margin: "4px 0 18px" }}>
              {brl(r.equilibrio)}
            </div>
            <div className="sub">Faturamento atual ({rotuloMes(mesAtual)})</div>
            <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 14px" }}>{brl(fatAtual)}</div>
            {r.dif >= 0 ? (
              <span className="chip green">
                <Icon name="TrendingUp" size={13} /> Acima do equilíbrio em {brl(r.dif)}
              </span>
            ) : (
              <span className="chip red">
                <Icon name="TrendingDown" size={13} /> Faltam {brl(Math.abs(r.dif))} para o equilíbrio
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3) Projeção de caixa (3 meses)
// ============================================================
function Projecao({ lancs }: { lancs: Lancamento[] }) {
  const dados = useMemo(() => {
    // saldo atual = receitas pagas - despesas pagas
    const saldoAtual = lancs.reduce(
      (a, l) => (l.pago ? a + (l.tipo === "receita" ? l.valor : -l.valor) : a),
      0
    );

    // média mensal de entradas/saídas a partir dos últimos 6 meses (só meses com movimento)
    const serie = serieFluxo(lancs, 6, 0);
    const comEnt = serie.filter((p) => p.entradas > 0);
    const comSai = serie.filter((p) => p.saidas > 0);
    const mediaEnt = comEnt.length ? comEnt.reduce((a, p) => a + p.entradas, 0) / comEnt.length : 0;
    const mediaSai = comSai.length ? comSai.reduce((a, p) => a + p.saidas, 0) / comSai.length : 0;

    // contas em aberto agrupadas pelo mês de vencimento
    const abertoPorMes = new Map<string, number>();
    for (const l of lancs) {
      if (l.pago || !l.vencimento) continue;
      const m = mesDe(l.vencimento);
      const v = l.tipo === "receita" ? l.valor : -l.valor;
      abertoPorMes.set(m, (abertoPorMes.get(m) || 0) + v);
    }

    const meses = ultimosMeses(4).slice(1); // próximos 3 meses
    let saldo = saldoAtual;
    const linhas = meses.map((mes) => {
      const aberto = abertoPorMes.get(mes) || 0;
      const entradasPrev = mediaEnt + (aberto > 0 ? aberto : 0);
      const saidasPrev = mediaSai + (aberto < 0 ? -aberto : 0);
      saldo += entradasPrev - saidasPrev;
      return { mes, entradasPrev, saidasPrev, saldo };
    });

    return { saldoAtual, mediaEnt, mediaSai, linhas };
  }, [lancs]);

  const temNegativo = dados.linhas.some((l) => l.saldo < 0);

  return (
    <div>
      <div className="grid three" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="sub">Saldo atual em caixa</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{brl(dados.saldoAtual)}</div>
        </div>
        <div className="card">
          <div className="sub">Média de entradas/mês</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--green)" }}>{brl(dados.mediaEnt)}</div>
        </div>
        <div className="card">
          <div className="sub">Média de saídas/mês</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--red)" }}>{brl(dados.mediaSai)}</div>
        </div>
      </div>

      {temNegativo && (
        <div className="err">
          Atenção: a projeção indica saldo negativo em pelo menos um dos próximos meses. Considere
          antecipar recebimentos ou renegociar pagamentos.
        </div>
      )}

      <div className="card">
        <h3>Projeção dos próximos 3 meses</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Entradas previstas</th>
              <th className="num">Saídas previstas</th>
              <th className="num">Saldo projetado</th>
            </tr>
          </thead>
          <tbody>
            {dados.linhas.map((l) => (
              <tr key={l.mes}>
                <td>{rotuloMes(l.mes)}</td>
                <td className="num" style={{ color: "var(--green)" }}>{brl(l.entradasPrev)}</td>
                <td className="num" style={{ color: "var(--red)" }}>{brl(l.saidasPrev)}</td>
                <td className="num" style={{ color: l.saldo < 0 ? "var(--red)" : "var(--txt)" }}>
                  {brl(l.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sub" style={{ marginTop: 12 }}>
          Projeção baseada na média de entradas e saídas dos últimos meses, somando as contas em
          aberto pelo mês de vencimento.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 4) Reserva de emergência
// ============================================================
function Reserva({ lancs }: { lancs: Lancamento[] }) {
  const [meses, setMeses] = useState("3");

  const custoMedio = useMemo(() => {
    const serie = serieFluxo(lancs, 6, 0);
    const comSai = serie.filter((p) => p.saidas > 0);
    return comSai.length ? comSai.reduce((a, p) => a + p.saidas, 0) / comSai.length : 0;
  }, [lancs]);

  const n = num(meses);
  const recomendado = custoMedio * n;

  return (
    <div className="grid two">
      <div className="card">
        <h3>Reserva de emergência</h3>
        <p className="sub" style={{ marginBottom: 16 }}>
          O quanto guardar para manter a empresa funcionando mesmo sem faturamento.
        </p>
        <div className="field">
          <label className="f">Quantos meses de custo quer guardar?</label>
          <input inputMode="decimal" value={meses} onChange={(e) => setMeses(e.target.value)} />
        </div>
        <div className="sub">Custo médio mensal estimado</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{brl(custoMedio)}</div>
      </div>

      <div className="card">
        <h3>Valor recomendado</h3>
        <div className="sub">Reserva para {n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} {n === 1 ? "mês" : "meses"}</div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1px", margin: "4px 0 18px", color: "var(--brand)" }}>
          {brl(recomendado)}
        </div>
        <div className="card" style={{ background: "var(--card-2)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="PiggyBank" size={20} color="var(--brand)" />
            <p className="sub" style={{ margin: 0 }}>
              Dica: mantenha a reserva em uma conta separada e de liquidez imediata. O ideal para a
              maioria dos negócios é de 3 a 6 meses de custos fixos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
