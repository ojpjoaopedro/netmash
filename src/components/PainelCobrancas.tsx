"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, LayoutGrid, Calendar, Info, ChevronDown } from "lucide-react";
import { lerRecebimentos, lerPagamentos, datasDaDespesa, ocConfirmada, valorDaOcorrencia, carregarEstruturaComPagamentos } from "@/app/minhasmetricas/financas-estrutura";
import { brParaISO, isoParaBR } from "@/lib/format";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const AMBAR = "#F59E0B", VERMELHO = "#EF4444", VERDE = "#10B981";
const PALETA = ["#8B5CF6", "#14B8A6", "#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#0EA5E9", "#A855F7"];

type Metrica = { valor: number; qtd: number };
const zero = (): Metrica => ({ valor: 0, qtd: 0 });

/** Painel "Situação das cobranças": recebíveis e pagamentos do Calendário, por período. */
export default function PainelCobrancas({ ano }: { ano: number }) {
  const [montado, setMontado] = useState(false);
  const [versao, setVersao] = useState(0);
  const [modo, setModo] = useState<"card" | "grafico">("grafico");
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
    window.addEventListener("me:estrutura", h);
    return () => { window.removeEventListener("me:recebimentos", h); window.removeEventListener("me:pagamentos", h); window.removeEventListener("me:estrutura", h); };
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

  // meses (0..11) do ano que caem dentro do período selecionado
  const mesesPeriodo = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 12; m++) {
      const ini = `${ano}-${String(m + 1).padStart(2, "0")}-01`;
      const ult = new Date(ano, m + 1, 0).getDate();
      const fim = `${ano}-${String(m + 1).padStart(2, "0")}-${String(ult).padStart(2, "0")}`;
      if (fim >= deISO && ini <= ateISO) out.push(m);
    }
    return out;
  }, [ano, deISO, ateISO]);

  // faturamento por canal: puxa da Composição das Receitas (Estrutura), somando os meses do período
  const porCanal = useMemo(() => {
    void versao;
    if (!montado) return [] as { nome: string; valor: number; cor: string }[];
    const d = carregarEstruturaComPagamentos(ano);
    return d.receitas
      .map((r) => ({ nome: (r.nome || "Sem canal").trim() || "Sem canal", valor: mesesPeriodo.reduce((s, mi) => s + (r.v[mi] || 0), 0) }))
      .filter((x) => x.valor > 0.005)
      .sort((a, b) => b.valor - a.valor)
      .map((x, i) => ({ ...x, cor: PALETA[i % PALETA.length] }));
  }, [montado, versao, ano, mesesPeriodo]);

  // despesas realizadas: puxa da Estrutura de Custos (soma dos custos no período)
  const custosEstrutura = useMemo<Metrica>(() => {
    void versao;
    if (!montado) return zero();
    const d = carregarEstruturaComPagamentos(ano);
    let valor = 0, qtd = 0;
    for (const b of d.custos) for (const g of b.grupos) for (const it of g.itens) {
      const v = mesesPeriodo.reduce((s, mi) => s + (it.v[mi] || 0), 0);
      if (v > 0.005) { valor += v; qtd++; }
    }
    return { valor, qtd };
  }, [montado, versao, ano, mesesPeriodo]);

  const itens: Item[] = [
    { tipo: "canal", titulo: "Faturamento por canal", dica: "Faturamento do período separado por canal de venda.", canal: porCanal },
    { tipo: "lista", titulo: "Despesa", dica: "A pagar e despesas em atraso vêm do Calendário; as despesas realizadas vêm da Estrutura de Custos.",
      lados: [
        { rotulo: "Despesas pagas", m: custosEstrutura, cor: VERDE },
        { rotulo: "A pagar", m: dados.pagAPagar, cor: AMBAR },
        { rotulo: "Despesas em atraso", m: dados.pagAtraso, cor: VERMELHO },
      ] },
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
              <Calendar size={14} /> {preset === "custom" && (de || ate) ? `${de || "…"} a ${ate || "…"}` : ROTULO[preset]} <ChevronDown size={14} />
            </button>
            {filtroAberto && (
              <>
                <div onClick={() => setFiltroAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41, width: 250, maxWidth: "calc(100vw - 24px)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 12, boxShadow: "0 18px 44px -12px rgba(0,0,0,.4)", padding: 12 }}>
                  {OPCOES.map((o) => (
                    <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", cursor: "pointer", fontSize: 13.5, borderRadius: 8 }}>
                      <input type="radio" name="periodo-cobrancas" checked={presetTmp === o.v} onChange={() => setPresetTmp(o.v)} style={{ accentColor: "var(--brand)", width: 16, height: 16 }} />
                      {o.nome}
                    </label>
                  ))}
                  {presetTmp === "custom" && (
                    <div style={{ padding: "6px 6px 2px", display: "grid", gap: 8 }}>
                      <div><label className="f">De</label><input type="date" value={brParaISO(deTmp)} onChange={(e) => setDeTmp(isoParaBR(e.target.value))} style={{ width: "100%" }} /></div>
                      <div><label className="f">Até</label><input type="date" value={brParaISO(ateTmp)} onChange={(e) => setAteTmp(isoParaBR(e.target.value))} style={{ width: "100%" }} /></div>
                      {(deTmp || ateTmp) && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Período: <b style={{ color: "var(--txt)" }}>{deTmp || "…"}</b> até <b style={{ color: "var(--txt)" }}>{ateTmp || "…"}</b></div>
                      )}
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
              ? (it.tipo === "canal" ? <CanalLista canal={it.canal} /> : it.tipo === "lista" ? <ListaLados lados={it.lados} /> : <DoisLados a={it.a} b={it.b} />)
              : (it.tipo === "canal" ? <PizzaCanal canal={it.canal} vazio="Nenhum faturamento no período." />
                  : it.tipo === "lista" ? <PizzaCanal canal={it.lados.map((l) => ({ nome: l.rotulo, valor: l.m.valor, cor: l.cor }))} vazio="Nenhuma despesa no período." />
                  : <Barras c={it} />)}
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
  | { tipo: "lista"; titulo: string; dica: string; lados: Lado[] }
  | { tipo: "barras"; titulo: string; dica: string; a: Lado; b: Lado };
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
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 51, width: 230, maxWidth: "calc(100vw - 24px)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 14px 34px -12px rgba(0,0,0,.4)", padding: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--txt)", textAlign: "left", fontWeight: 400 }}>
                {dica}
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

/** Modo card: N linhas (valor + barra + nº de lançamentos). */
function ListaLados({ lados }: { lados: Lado[] }) {
  const max = Math.max(1, ...lados.map((l) => l.m.valor));
  return (
    <>
      {lados.map((x, j) => (
        <div key={j} style={{ marginBottom: j < lados.length - 1 ? 14 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span className="sub" style={{ fontSize: 12 }}>{x.rotulo}</span>
            <b className="oc-num" style={{ fontSize: 17, color: x.cor }}>{fmt(x.m.valor)}</b>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: "var(--line)", overflow: "hidden", marginTop: 7 }}>
            <div style={{ height: "100%", width: `${Math.max(2, (x.m.valor / max) * 100)}%`, background: x.cor, borderRadius: 6 }} />
          </div>
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

/** Modo gráfico: pizza de várias fatias (SVG), com % em cada fatia. */
function PizzaCanal({ canal, vazio = "Nenhum dado no período." }: { canal: Canal[]; vazio?: string }) {
  const dados = canal.filter((c) => c.valor > 0.005);
  const total = dados.reduce((s, c) => s + c.valor, 0);
  if (total <= 0) return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ width: 150, height: 150, borderRadius: "50%", background: "conic-gradient(var(--line) 0 100%)" }} />
      </div>
      <p className="sub" style={{ fontSize: 12.5 }}>{vazio}</p>
    </>
  );
  const cx = 100, cy = 100, r = 82, expl = 5;
  let a0 = -Math.PI / 2;
  const fatias = dados.map((c) => {
    const frac = c.valor / total;
    const a1 = a0 + frac * 2 * Math.PI;
    const mid = (a0 + a1) / 2;
    const ox = Math.cos(mid) * expl, oy = Math.sin(mid) * expl;
    const large = frac > 0.5 ? 1 : 0;
    // fatia única (100%): desenha um círculo cheio
    const path = frac >= 0.999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${(cx + ox).toFixed(2)} ${(cy + oy).toFixed(2)} L ${(cx + ox + r * Math.cos(a0)).toFixed(2)} ${(cy + oy + r * Math.sin(a0)).toFixed(2)} A ${r} ${r} 0 ${large} 1 ${(cx + ox + r * Math.cos(a1)).toFixed(2)} ${(cy + oy + r * Math.sin(a1)).toFixed(2)} Z`;
    const lr = r * 0.62;
    const lx = cx + ox + lr * Math.cos(mid), ly = cy + oy + lr * Math.sin(mid);
    a0 = a1;
    return { path, cor: c.cor, lx, ly, pct: Math.round(frac * 100) };
  });
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 190, height: "auto", display: "block" }}>
          {fatias.map((s, i) => <path key={i} d={s.path} fill={s.cor} stroke="var(--card)" strokeWidth="1.5" />)}
          {fatias.map((s, i) => s.pct >= 5 && (
            <text key={"t" + i} x={s.lx.toFixed(1)} y={s.ly.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="#fff">{s.pct}%</text>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {dados.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.cor, flexShrink: 0 }} />
            <span className="sub" style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
            <span className="sub" style={{ fontSize: 11.5 }}>{Math.round((c.valor / total) * 100)}%</span>
            <b className="oc-num" style={{ fontSize: 13 }}>{fmt(c.valor)}</b>
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
