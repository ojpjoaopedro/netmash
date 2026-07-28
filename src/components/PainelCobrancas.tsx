"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, LayoutGrid, Calendar, Info, ChevronDown } from "lucide-react";
import { lerRecebimentos, lerPagamentos, datasDaDespesa, ocConfirmada, valorDaOcorrencia } from "@/app/minhasmetricas/financas-estrutura";
import { mascararDataBR, brParaISO } from "@/lib/format";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const AMBAR = "#F59E0B", VERMELHO = "#EF4444";

type Metrica = { valor: number; qtd: number };
const zero = (): Metrica => ({ valor: 0, qtd: 0 });

/** Painel "Situação das cobranças": recebíveis e pagamentos do Calendário, por período. */
export default function PainelCobrancas({ ano }: { ano: number }) {
  const [montado, setMontado] = useState(false);
  const [versao, setVersao] = useState(0);
  const [modo, setModo] = useState<"card" | "grafico">("card");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [infoAberto, setInfoAberto] = useState<number | null>(null);
  type Preset = "hoje" | "mes" | "ano" | "custom";
  const [preset, setPreset] = useState<Preset>("mes");   // padrão: este mês
  const [de, setDe] = useState("");   // dd/mm/aaaa (personalizado)
  const [ate, setAte] = useState("");
  // seleção provisória enquanto o filtro está aberto (só aplica ao clicar em Aplicar)
  const [presetTmp, setPresetTmp] = useState<Preset>("mes");
  const [deTmp, setDeTmp] = useState("");
  const [ateTmp, setAteTmp] = useState("");
  const ROTULO: Record<Preset, string> = { hoje: "Hoje", mes: "Este mês", ano: "Este ano", custom: "Personalizado" };

  useEffect(() => {
    setMontado(true);
    const h = () => setVersao((v) => v + 1);
    window.addEventListener("me:recebimentos", h);
    window.addEventListener("me:pagamentos", h);
    return () => { window.removeEventListener("me:recebimentos", h); window.removeEventListener("me:pagamentos", h); };
  }, []);

  const hojeISO = useMemo(() => {
    if (!montado) return `${ano}-12-31`;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [montado, ano]);

  // limites do período em ISO conforme o preset selecionado
  const { deISO, ateISO } = useMemo(() => {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    if (preset === "hoje") { const dia = `${ano}-${mm}-${String(new Date().getDate()).padStart(2, "0")}`; return { deISO: dia, ateISO: dia }; }
    if (preset === "mes") { const ult = new Date(ano, new Date().getMonth() + 1, 0).getDate(); return { deISO: `${ano}-${mm}-01`, ateISO: `${ano}-${mm}-${String(ult).padStart(2, "0")}` }; }
    if (preset === "custom") return { deISO: brParaISO(de) || `${ano}-01-01`, ateISO: brParaISO(ate) || `${ano}-12-31` };
    return { deISO: `${ano}-01-01`, ateISO: `${ano}-12-31` }; // ano
  }, [preset, de, ate, ano]);
  const noPeriodo = (iso: string) => iso >= deISO && iso <= ateISO;

  const dados = useMemo(() => {
    void versao;
    const recRealizado = zero(), recPrevisto = zero(), recAReceber = zero(), recAtraso = zero();
    const pagPagas = zero(), pagAtraso = zero();
    const add = (m: Metrica, v: number) => { m.valor += v; m.qtd += 1; };
    if (montado) {
      for (const p of lerRecebimentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          if (!noPeriodo(o.iso)) continue;
          const v = valorDaOcorrencia(p, o, ano);
          add(recPrevisto, v);
          if (ocConfirmada(p, o, ano)) add(recRealizado, v);
          else { add(recAReceber, v); if (o.iso < hojeISO) add(recAtraso, v); }
        }
      }
      for (const p of lerPagamentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          if (!noPeriodo(o.iso)) continue;
          const v = valorDaOcorrencia(p, o, ano);
          if (ocConfirmada(p, o, ano)) add(pagPagas, v);
          else if (o.iso < hojeISO) add(pagAtraso, v);
        }
      }
    }
    return { recRealizado, recPrevisto, recAReceber, recAtraso, pagPagas, pagAtraso };
  }, [montado, versao, ano, deISO, ateISO, hojeISO]);

  const cards = [
    { titulo: "Recebíveis realizados x Previsto", dica: "Recebíveis já confirmados no Calendário comparados ao total previsto (confirmados + a receber) no período.",
      a: { rotulo: "Realizado", m: dados.recRealizado, cor: "var(--brand)" }, b: { rotulo: "Previsto", m: dados.recPrevisto, cor: "var(--brand)" } },
    { titulo: "Contas a receber x Contas pagas", dica: "O que ainda está a receber comparado ao que já foi pago (contas confirmadas) no período.",
      a: { rotulo: "A receber", m: dados.recAReceber, cor: AMBAR }, b: { rotulo: "Contas pagas", m: dados.pagPagas, cor: AMBAR } },
    { titulo: "Recebíveis em atraso x Pagamentos em atraso", dica: "Vencidos e ainda não confirmados: recebíveis atrasados comparados a pagamentos atrasados.",
      a: { rotulo: "Receb. em atraso", m: dados.recAtraso, cor: VERMELHO }, b: { rotulo: "Pag. em atraso", m: dados.pagAtraso, cor: VERMELHO } },
  ];

  const abrirFiltro = () => { setPresetTmp(preset); setDeTmp(de); setAteTmp(ate); setFiltroAberto(true); };
  const aplicarFiltro = () => { setPreset(presetTmp); setDe(deTmp); setAte(ateTmp); setFiltroAberto(false); };
  const limparFiltro = () => { setPresetTmp("mes"); setDeTmp(""); setAteTmp(""); };
  const OPCOES: { v: Preset; nome: string }[] = [
    { v: "hoje", nome: "Hoje" }, { v: "mes", nome: "Este mês" }, { v: "ano", nome: "Este ano" }, { v: "custom", nome: "Personalizado" },
  ];

  if (!montado) return null;

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* cabeçalho: título + toggle gráfico + filtro por data */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <b style={{ fontSize: 17 }}>Situação das cobranças</b>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* alternar card / gráfico */}
          <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
            <button onClick={() => setModo("card")} title="Ver por card"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                background: modo === "card" ? "var(--brand)" : "transparent", color: modo === "card" ? "var(--brand-ct,#fff)" : "var(--muted)" }}><LayoutGrid size={14} /> Cards</button>
            <button onClick={() => setModo("grafico")} title="Ver por gráfico"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                background: modo === "grafico" ? "var(--brand)" : "transparent", color: modo === "grafico" ? "var(--brand-ct,#fff)" : "var(--muted)" }}><BarChart3 size={14} /> Gráfico</button>
          </div>
          {/* filtro por data */}
          <div style={{ position: "relative" }}>
            <button className="btn ghost sm" onClick={() => (filtroAberto ? setFiltroAberto(false) : abrirFiltro())} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} /> {ROTULO[preset]} <ChevronDown size={14} />
            </button>
            {filtroAberto && (
              <>
                <div onClick={() => setFiltroAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41, width: 250, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 12, boxShadow: "0 18px 44px -12px rgba(0,0,0,.4)", padding: 12 }}>
                  {OPCOES.map((o) => (
                    <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", cursor: "pointer", fontSize: 13.5, borderRadius: 8 }}>
                      <input type="radio" name="periodo-cobrancas" checked={presetTmp === o.v} onChange={() => setPresetTmp(o.v)} style={{ accentColor: "var(--brand)", width: 16, height: 16 }} />
                      {o.nome}
                    </label>
                  ))}
                  {presetTmp === "custom" && (
                    <div style={{ padding: "6px 6px 2px", display: "grid", gap: 8 }}>
                      <div><label className="f">De</label><input value={deTmp} onChange={(e) => setDeTmp(mascararDataBR(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" style={{ width: "100%" }} /></div>
                      <div><label className="f">Até</label><input value={ateTmp} onChange={(e) => setAteTmp(mascararDataBR(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" style={{ width: "100%" }} /></div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn ghost sm" style={{ flex: 1 }} onClick={limparFiltro}>Limpar</button>
                    <button className="btn sm" style={{ flex: 1 }} onClick={aplicarFiltro}>Aplicar</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modo === "card" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {cards.map((c, i) => {
            const max = Math.max(c.a.m.valor, c.b.m.valor, 1);
            return (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, background: "var(--bg-2)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 14 }}>
                  <b style={{ fontSize: 13.5, lineHeight: 1.3 }}>{c.titulo}</b>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={() => setInfoAberto(infoAberto === i ? null : i)} title="Sobre este dado"
                      style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, display: "grid", placeItems: "center", color: infoAberto === i ? "var(--brand)" : "var(--muted)" }}><Info size={15} /></button>
                    {infoAberto === i && (
                      <>
                        <div onClick={() => setInfoAberto(null)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
                        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 51, width: 230, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 14px 34px -12px rgba(0,0,0,.4)", padding: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--txt)", textAlign: "left", fontWeight: 400 }}>
                          {c.dica}
                          <div style={{ marginTop: 8, color: "var(--muted)" }}>Estes dados são preenchidos automaticamente pelo <b>Calendário</b>.</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {[c.a, c.b].map((x, j) => (
                  <div key={j} style={{ marginBottom: j === 0 ? 14 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span className="sub" style={{ fontSize: 12 }}>{x.rotulo}</span>
                      <b className="oc-num" style={{ fontSize: 18, color: x.cor }}>{fmt(x.m.valor)}</b>
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: "var(--line)", overflow: "hidden", margin: "7px 0 4px" }}>
                      <div style={{ height: "100%", width: `${Math.max(2, (x.m.valor / max) * 100)}%`, background: x.cor, borderRadius: 6 }} />
                    </div>
                    <span className="sub" style={{ fontSize: 11.5 }}>{x.m.qtd} {x.m.qtd === 1 ? "lançamento" : "lançamentos"}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <GraficoCobrancas cards={cards} />
      )}
    </div>
  );
}

/** Versão gráfico: barras agrupadas comparando os dois valores de cada card. */
function GraficoCobrancas({ cards }: { cards: { titulo: string; a: { rotulo: string; m: Metrica; cor: string }; b: { rotulo: string; m: Metrica; cor: string } }[] }) {
  const max = Math.max(1, ...cards.flatMap((c) => [c.a.m.valor, c.b.m.valor]));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, background: "var(--bg-2)" }}>
          <b style={{ fontSize: 13.5, lineHeight: 1.3, display: "block", marginBottom: 16 }}>{c.titulo}</b>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 150, padding: "0 8px" }}>
            {[c.a, c.b].map((x, j) => (
              <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <b className="oc-num" style={{ fontSize: 12.5, color: x.cor }}>{fmt(x.m.valor)}</b>
                <div style={{ width: "70%", maxWidth: 64, height: `${Math.max(3, (x.m.valor / max) * 100)}%`, background: x.cor, borderRadius: "7px 7px 0 0", transition: "height .3s" }} />
                <span className="sub" style={{ fontSize: 11.5, textAlign: "center" }}>{x.rotulo}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
