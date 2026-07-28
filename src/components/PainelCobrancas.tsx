"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, LayoutGrid, Calendar, Info, ChevronDown } from "lucide-react";
import { lerRecebimentos, lerPagamentos, datasDaDespesa, ocConfirmada, valorDaOcorrencia } from "@/app/minhasmetricas/financas-estrutura";
import { mascararDataBR, brParaISO } from "@/lib/format";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const AMBAR = "#F59E0B", VERMELHO = "#EF4444";
const PALETA = ["#8B5CF6", "#14B8A6", "#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#0EA5E9", "#A855F7"];

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
    const recRealizado = zero(), recPrevisto = zero(), recAtraso = zero();
    const pagPagas = zero(), pagAPagar = zero(), pagAtraso = zero();
    const add = (m: Metrica, v: number) => { m.valor += v; m.qtd += 1; };
    if (montado) {
      for (const p of lerRecebimentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          if (!noPeriodo(o.iso)) continue;
          const v = valorDaOcorrencia(p, o, ano);
          add(recPrevisto, v);
          if (ocConfirmada(p, o, ano)) add(recRealizado, v);
          else if (o.iso < hojeISO) add(recAtraso, v);
        }
      }
      for (const p of lerPagamentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          if (!noPeriodo(o.iso)) continue;
          const v = valorDaOcorrencia(p, o, ano);
          if (ocConfirmada(p, o, ano)) add(pagPagas, v);
          else { add(pagAPagar, v); if (o.iso < hojeISO) add(pagAtraso, v); }
        }
      }
    }
    return { recRealizado, recPrevisto, recAtraso, pagPagas, pagAPagar, pagAtraso };
  }, [montado, versao, ano, deISO, ateISO, hojeISO]);

  // faturamento por canal (soma de todas as ocorrências de recebimento, por canal, no período)
  const porCanal = useMemo(() => {
    void versao;
    const m: Record<string, number> = {};
    if (montado) {
      for (const p of lerRecebimentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          if (!noPeriodo(o.iso)) continue;
          const nome = (p.item || "Sem canal").trim() || "Sem canal";
          m[nome] = (m[nome] || 0) + valorDaOcorrencia(p, o, ano);
        }
      }
    }
    return Object.entries(m).map(([nome, valor], i) => ({ nome, valor, cor: PALETA[i % PALETA.length] })).sort((a, b) => b.valor - a.valor);
  }, [montado, versao, ano, deISO, ateISO]);

  const itens: Item[] = [
    { tipo: "canal", titulo: "Faturamento por canal", dica: "Faturamento do período separado por canal de venda (lançado no Calendário).", canal: porCanal },
    { tipo: "progresso", titulo: "Despesa", dica: "O que ainda está a pagar comparado ao que já foi pago (contas confirmadas) no período.",
      a: { rotulo: "A pagar", m: dados.pagAPagar, cor: AMBAR }, b: { rotulo: "Contas pagas", m: dados.pagPagas, cor: AMBAR } },
    { tipo: "barras", titulo: "Vencidos", dica: "Vencidos e ainda não confirmados: faturamento em atraso comparado a despesas em atraso.",
      a: { rotulo: "Faturamento em atraso", m: dados.recAtraso, cor: VERMELHO }, b: { rotulo: "Despesas em atraso", m: dados.pagAtraso, cor: VERMELHO } },
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {itens.map((it, i) => (
          <CaixaCard key={i} titulo={it.titulo} dica={it.dica} aberto={infoAberto === i} onInfo={() => setInfoAberto(infoAberto === i ? null : i)} onFechar={() => setInfoAberto(null)}>
            {modo === "card"
              ? (it.tipo === "canal" ? <CanalLista canal={it.canal} /> : <DoisLados a={it.a} b={it.b} />)
              : (it.tipo === "canal" ? <PizzaCanal canal={it.canal} /> : it.tipo === "barras" ? <Barras c={it} /> : <Pizza c={it} />)}
          </CaixaCard>
        ))}
      </div>
    </div>
  );
}

type Lado = { rotulo: string; m: Metrica; cor: string };
type Canal = { nome: string; valor: number; cor: string };
type Item =
  | { tipo: "canal"; titulo: string; dica: string; canal: Canal[] }
  | { tipo: "progresso" | "barras"; titulo: string; dica: string; a: Lado; b: Lado };
type CardG = { titulo: string; a: Lado; b: Lado };

/** Caixa do card com cabeçalho e o "i" clicável. */
function CaixaCard({ titulo, dica, aberto, onInfo, onFechar, children }: { titulo: string; dica: string; aberto: boolean; onInfo: () => void; onFechar: () => void; children: ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, background: "var(--bg-2)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 14 }}>
        <b style={{ fontSize: 13.5, lineHeight: 1.3 }}>{titulo}</b>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={onInfo} title="Sobre este dado" style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, display: "grid", placeItems: "center", color: aberto ? "var(--brand)" : "var(--muted)" }}><Info size={15} /></button>
          {aberto && (
            <>
              <div onClick={onFechar} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 51, width: 230, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 14px 34px -12px rgba(0,0,0,.4)", padding: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--txt)", textAlign: "left", fontWeight: 400 }}>
                {dica}
                <div style={{ marginTop: 8, color: "var(--muted)" }}>Estes dados são preenchidos automaticamente pelo <b>Calendário</b>.</div>
              </div>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Modo card: dois lados (valor + barra + nº de lançamentos). */
function DoisLados({ a, b }: { a: Lado; b: Lado }) {
  const max = Math.max(a.m.valor, b.m.valor, 1);
  return (
    <>
      {[a, b].map((x, j) => (
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
    </>
  );
}

/** Modo card: faturamento por canal (lista com barra de participação). */
function CanalLista({ canal }: { canal: Canal[] }) {
  const total = canal.reduce((s, c) => s + c.valor, 0);
  if (!total) return <p className="sub" style={{ fontSize: 12.5 }}>Nenhum faturamento no período.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {canal.map((c, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c.cor, flexShrink: 0 }} />
              <span className="sub" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
            </span>
            <b className="oc-num" style={{ fontSize: 13.5, flexShrink: 0 }}>{fmt(c.valor)}</b>
          </div>
          <div style={{ height: 7, borderRadius: 6, background: "var(--line)", overflow: "hidden", marginTop: 6 }}>
            <div style={{ height: "100%", width: `${Math.max(2, (c.valor / total) * 100)}%`, background: c.cor, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Modo gráfico: pizza de várias fatias (uma por canal). */
function PizzaCanal({ canal }: { canal: Canal[] }) {
  const total = canal.reduce((s, c) => s + c.valor, 0);
  let acc = 0;
  const partes = canal.map((c) => {
    const ini = total > 0 ? (acc / total) * 100 : 0;
    acc += c.valor;
    const fim = total > 0 ? (acc / total) * 100 : 0;
    return `${c.cor} ${ini}% ${fim}%`;
  });
  const fundo = total > 0 ? `conic-gradient(${partes.join(", ")})` : "conic-gradient(var(--line) 0 100%)";
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ width: 140, height: 140, borderRadius: "50%", background: fundo }} />
      </div>
      {total === 0 ? <p className="sub" style={{ fontSize: 12.5 }}>Nenhum faturamento no período.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {canal.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.cor, flexShrink: 0 }} />
              <span className="sub" style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
              <span className="sub" style={{ fontSize: 11.5 }}>{Math.round((c.valor / total) * 100)}%</span>
              <b className="oc-num" style={{ fontSize: 13 }}>{fmt(c.valor)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Pizza({ c }: { c: CardG }) {
  // pizza de progresso: o TOTAL é o círculo inteiro; a fatia cheia é o que já foi feito
  const desp = c.titulo === "Despesa";
  // faturamento: a = Previsto (total), b = Realizado (feito), resto = Previsto - Realizado (a receber)
  // despesa: total = A pagar + Pagas; feito = Pagas; resto = A pagar
  const total = desp ? c.a.m.valor + c.b.m.valor : c.a.m.valor;
  const feito = c.b.m.valor;
  const restante = desp ? c.a.m.valor : Math.max(0, c.a.m.valor - c.b.m.valor);
  const feitoRotulo = c.b.rotulo;                              // "Realizado" / "Contas pagas"
  const restoRotulo = desp ? c.a.rotulo : "A receber";         // "A pagar" / "A receber"
  const corFeito = c.b.cor;
  const corResto = `color-mix(in srgb, ${c.b.cor} 30%, #fff)`;
  const frac = total > 0 ? (feito / total) * 100 : 0;
  const fundo = total > 0 ? `conic-gradient(${corFeito} 0 ${frac}%, ${corResto} ${frac}% 100%)` : "conic-gradient(var(--line) 0 100%)";
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ width: 140, height: 140, borderRadius: "50%", background: fundo }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[{ rotulo: feitoRotulo, valor: feito, cor: corFeito }, { rotulo: restoRotulo, valor: restante, cor: corResto }].map((it, j) => (
          <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.cor, flexShrink: 0 }} />
            <span className="sub" style={{ fontSize: 12, flex: 1 }}>{it.rotulo}</span>
            <b className="oc-num" style={{ fontSize: 13, color: c.b.cor }}>{fmt(it.valor)}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function Barras({ c }: { c: CardG }) {
  const max = Math.max(1, c.a.m.valor, c.b.m.valor);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 150, padding: "0 8px" }}>
      {[c.a, c.b].map((x, j) => (
        <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <b className="oc-num" style={{ fontSize: 12.5, color: x.cor }}>{fmt(x.m.valor)}</b>
          <div style={{ width: "70%", maxWidth: 64, height: `${Math.max(3, (x.m.valor / max) * 100)}%`, background: x.cor, borderRadius: "7px 7px 0 0", transition: "height .3s" }} />
          <span className="sub" style={{ fontSize: 11.5, textAlign: "center" }}>{x.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
