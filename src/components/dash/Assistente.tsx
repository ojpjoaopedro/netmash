"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, ArrowRight, MessageCircle, Plus, Mic, MicOff, Check, Presentation } from "lucide-react";
import GerarApresentacao from "./GerarApresentacao";
import { addLancamento } from "@/lib/db";
import { brl, isoParaBR, mascararDataBR, brParaISO } from "@/lib/format";
import { PERGUNTAS, responder, type Resposta, type Bloco, type Tom, type Ctx } from "@/lib/assistente";
import { parseLancamento, type LancParsed } from "@/lib/lancParser";
import { SeletorCusto, SeletorReceita } from "@/components/CalendarioPagamentos";
import { carregarEstrutura, lerPagamentos, salvarPagamentos, lerRecebimentos, salvarRecebimentos } from "@/app/minhasmetricas/financas-estrutura";

const uidLanc = () => Math.random().toString(36).slice(2);
const mascaraMoedaBR = (v: string) => { const n = (v || "").replace(/\D/g, ""); return n ? (parseInt(n, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""; };

const COR: Record<Tom, string> = { good: "var(--green)", bad: "var(--red)", warn: "var(--amber)", info: "var(--accent)" };

function BlocoView({ b }: { b: Bloco }) {
  if (b.tipo === "p") return <p style={{ margin: "6px 0", lineHeight: 1.55, color: b.tom ? COR[b.tom] : "var(--txt)" }}>{b.texto}</p>;
  if (b.tipo === "kpi") return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="sub" style={{ fontSize: 12.5 }}>{b.label}</span>
      <b style={{ fontSize: 20, color: b.tom ? COR[b.tom] : "var(--txt)" }}>{b.valor}</b>
    </div>
  );
  if (b.tipo === "lista") return (
    <div style={{ margin: "8px 0" }}>
      {b.itens.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: i < b.itens.length - 1 ? "1px solid var(--line)" : undefined }}>
          <span style={{ fontSize: 13.5, color: it.tom ? COR[it.tom] : "var(--txt)" }}>{it.nome}</span>
          {it.valor && <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{it.valor}</span>}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "7px 0", padding: "9px 11px", background: "rgba(26,173,226,.08)", border: "1px solid rgba(26,173,226,.25)", borderRadius: 10 }}>
      <ArrowRight size={16} style={{ marginTop: 2, flexShrink: 0, color: "var(--accent)" }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{b.texto}</span>
    </div>
  );
}

type Msg = { de: "bot" | "user"; texto?: string; resp?: Resposta };

// Reconhecimento de voz do navegador (gratuito; melhor no Chrome).
type SR = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void };
function criarSR(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function Assistente({ metrs, lancs, clientes, funcs, saldoInicial, nome, reload, brand, ano }: Ctx & { nome: string; reload?: () => void; brand: { nome: string; logo: string | null }; ano: number }) {
  const ctx: Ctx = { metrs, lancs, clientes, funcs, saldoInicial };
  const [modo, setModo] = useState<"perguntar" | "registrar" | "apresentar">("perguntar");

  // ---- modo PERGUNTAR ----
  const [msgs, setMsgs] = useState<Msg[]>([
    { de: "bot", resp: { titulo: `Oi${nome ? `, ${nome}` : ""}! 👋`, blocos: [{ tipo: "p", texto: "Sou seu assistente. Eu respondo sobre os seus números." }] } },
  ]);
  const [txt, setTxt] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p) return;
    setMsgs((m) => [...m, { de: "user", texto: p }, { de: "bot", resp: responder(p, ctx) }]);
    setTxt("");
  }

  // ---- modo REGISTRAR ----
  const [entrada, setEntrada] = useState("");
  const [gravando, setGravando] = useState(false);
  const [previa, setPrevia] = useState<LancParsed | null>(null);
  const [freqLanc, setFreqLanc] = useState<"unica" | "mensal">("mensal");
  const [salvando, setSalvando] = useState(false);
  const [msgReg, setMsgReg] = useState("");
  const [erroReg, setErroReg] = useState("");
  const srRef = useRef<SR | null>(null);
  // data digitada em pt-BR (texto), sincronizada com previa.data (ISO)
  const [dataTxt, setDataTxt] = useState("");
  const previaAberta = useRef(false);
  useEffect(() => {
    const aberta = !!previa;
    if (aberta && !previaAberta.current) setDataTxt(isoParaBR(previa!.data));
    previaAberta.current = aberta;
  }, [previa]);
  // estrutura do ano (para os seletores de grupo/item e canal)
  const estrutura = useMemo(() => carregarEstrutura(ano), [ano, previa]);

  function interpretar(texto: string) {
    setErroReg(""); setMsgReg("");
    const p = parseLancamento(texto);
    if (!p) { setErroReg("Não consegui identificar o valor. Tente algo como “gastei 150 com gasolina hoje”."); return; }
    setPrevia(p);
  }

  function ouvir() {
    if (gravando) { srRef.current?.stop(); return; }
    const sr = criarSR();
    if (!sr) { setErroReg("Seu navegador não tem reconhecimento de voz. Use o Chrome no celular/computador."); return; }
    srRef.current = sr;
    sr.lang = "pt-BR"; sr.continuous = false; sr.interimResults = false;
    setErroReg(""); setMsgReg(""); setGravando(true);
    sr.onresult = (e) => {
      const fala = e.results?.[0]?.[0]?.transcript || "";
      setEntrada(fala);
      interpretar(fala);
    };
    sr.onerror = () => setErroReg("Não consegui ouvir. Verifique a permissão do microfone.");
    sr.onend = () => setGravando(false);
    sr.start();
  }

  async function salvarLanc() {
    if (!previa) return;
    if (!previa.item || !previa.item.trim()) { setErroReg(previa.tipo === "despesa" ? "Escolha o grupo e o item." : "Escolha o canal de venda."); return; }
    if (previa.tipo === "despesa" && !previa.grupo) { setErroReg("Escolha o grupo."); return; }
    setSalvando(true); setErroReg("");
    try {
      const iso = previa.data;                       // YYYY-MM-DD
      const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1, dia = Number(iso.slice(8, 10)) || 1;
      const ym = y * 12 + m;
      // grava no Calendário → aparece na Estrutura de Receitas e Custos
      const novo = {
        id: uidLanc(), descricao: previa.item, valor: previa.valor, dia, mes: m, ano: y,
        recorrente: freqLanc !== "unica", freq: freqLanc,
        grupo: previa.tipo === "despesa" ? previa.grupo : undefined, item: previa.item,
        confirmados: previa.pago ? [ym] : [], confirmadosDia: [] as string[],
      };
      if (previa.tipo === "despesa") salvarPagamentos([...lerPagamentos(), novo]);
      else salvarRecebimentos([...lerRecebimentos(), novo]);
      // mantém também no histórico (para o "Perguntar")
      await addLancamento({
        tipo: previa.tipo, descricao: previa.item, categoria: previa.grupo || null, valor: previa.valor,
        data_competencia: iso, vencimento: iso, pago: previa.pago,
        data_pagamento: previa.pago ? iso : null, forma: null, contato: null, origem: "assistente",
      });
      setPrevia(null); setEntrada(""); setDataTxt(""); setFreqLanc("mensal");
      setMsgReg(`✅ ${previa.tipo === "receita" ? "Faturamento" : "Despesa"} de ${brl(previa.valor)} lançado na Estrutura!`);
      reload?.();
    } catch {
      setErroReg("Não consegui salvar. Tente novamente.");
    }
    setSalvando(false);
  }

  const EXEMPLOS = ["Recebi 2000 de um cliente", "Paguei 1200 de fornecedor", "Gastei 350 com marketing", "Paguei 89,90 de internet"];

  return (
    <>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, padding: "11px 14px", borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)", flexShrink: 0 }}>
          <Sparkles size={18} color="var(--accent)" />
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: 15.5 }}>Assistente</h3>
          <p className="sub" style={{ fontSize: 11.5, marginTop: 1 }}>Converse com seus números ou registre lançamentos por texto, voz e planilha.</p>
        </div>
      </div>

      {/* Alternância de modo */}
      <div className="period" style={{ width: "fit-content", marginBottom: 22 }}>
        <button className={modo === "apresentar" ? "active" : ""} onClick={() => setModo("apresentar")} style={{ display: "flex", alignItems: "center", gap: 6 }}><Presentation size={14} /> Apresentação</button>
        <button className={modo === "perguntar" ? "active" : ""} onClick={() => setModo("perguntar")} style={{ display: "flex", alignItems: "center", gap: 6 }}><MessageCircle size={14} /> Perguntar</button>
        <button className={modo === "registrar" ? "active" : ""} onClick={() => setModo("registrar")} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Registrar</button>
      </div>

      {modo === "apresentar" ? (
        <GerarApresentacao funcs={funcs} brand={brand} ano={ano} />
      ) : modo === "perguntar" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {msgs.map((m, i) => m.de === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--accent)", color: "#06222e", padding: "7px 12px", borderRadius: "14px 14px 4px 14px", fontWeight: 600, fontSize: 13 }}>{m.texto}</div>
            ) : (
              <div key={i} className="card" style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "11px 14px", borderRadius: "14px 14px 14px 4px" }}>
                {m.resp && <>
                  <b style={{ fontSize: 14, display: "block", marginBottom: 4 }}>{m.resp.titulo}</b>
                  {m.resp.blocos.map((b, k) => <BlocoView key={k} b={b} />)}
                </>}
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {PERGUNTAS.map((p) => (
              <button key={p.id} className="btn ghost sm" onClick={() => enviar(p.chip)}>{p.chip}</button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); enviar(txt); }} style={{ display: "flex", gap: 6, position: "sticky", bottom: 0, background: "var(--bg)", paddingTop: 6 }}>
            <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Pergunte algo… ex: como está meu caixa?"
              style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "9px 13px", fontSize: 13 }} />
            <button type="submit" className="btn" style={{ display: "flex", alignItems: "center", gap: 6 }}><Send size={15} /> Enviar</button>
          </form>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <p className="sub" style={{ marginBottom: 10, fontSize: 12 }}>Escreva ou fale o que entrou/saiu. Ex.: <i>&ldquo;gastei 150 com gasolina hoje&rdquo;</i>. Eu monto o lançamento e você confirma.</p>
            <form onSubmit={(e) => { e.preventDefault(); interpretar(entrada); }} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Ex: recebi 2 mil de venda hoje"
                style={{ flex: "1 1 160px", minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "9px 13px", fontSize: 13 }} />
              <button type="button" onClick={ouvir} className={"btn " + (gravando ? "" : "ghost")} title="Falar" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {gravando ? <MicOff size={16} /> : <Mic size={16} />}{gravando ? "Ouvindo…" : ""}
              </button>
              <button type="submit" className="btn">Interpretar</button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {EXEMPLOS.map((ex) => <button key={ex} className="btn ghost sm" onClick={() => { setEntrada(ex); interpretar(ex); }}>{ex}</button>)}
            </div>
          </div>

          {msgReg && <div className="ok" style={{ marginBottom: 12 }}>{msgReg}</div>}

          {previa && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Confira o lançamento</h3>
              <div className="period" style={{ width: "fit-content", marginBottom: 12 }}>
                <button className={previa.tipo === "receita" ? "active" : ""} onClick={() => setPrevia({ ...previa, tipo: "receita" })}>📥 Receita</button>
                <button className={previa.tipo === "despesa" ? "active" : ""} onClick={() => setPrevia({ ...previa, tipo: "despesa" })}>📤 Despesa</button>
              </div>
              <div className="grid two">
                <div className="field"><label className="f">{previa.tipo === "receita" ? "Canal de venda" : "Grupo e item"}</label>
                  {previa.tipo === "despesa"
                    ? <SeletorCusto blocos={estrutura.custos} grupo={previa.grupo || ""} item={previa.item || ""} onSelecionar={(g, i) => setPrevia({ ...previa, grupo: g, item: i, descricao: i })} />
                    : <SeletorReceita canais={estrutura.receitas.map((r) => ({ nome: r.nome, cor: r.cor }))} item={previa.item || ""} onSelecionar={(i) => setPrevia({ ...previa, grupo: "", item: i, descricao: i })} />}
                </div>
                <div className="field"><label className="f">Valor (R$)</label>
                  <input value={previa.valor ? mascaraMoedaBR(String(Math.round(previa.valor * 100))) : ""} placeholder="0,00" inputMode="decimal"
                    onChange={(e) => { const m = mascaraMoedaBR(e.target.value); setPrevia({ ...previa, valor: Number(m.replace(/\./g, "").replace(",", ".")) || 0 }); }} /></div>
                <div className="field"><label className="f">Data</label>
                  <input value={dataTxt} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10}
                    onChange={(e) => { const br = mascararDataBR(e.target.value); setDataTxt(br); const iso = brParaISO(br); if (iso) setPrevia({ ...previa, data: iso }); }} /></div>
                <div className="field" style={{ justifyContent: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                    <input type="checkbox" checked={previa.pago} onChange={(e) => setPrevia({ ...previa, pago: e.target.checked })} style={{ width: 18, height: 18 }} />
                    {previa.tipo === "receita" ? "Já recebido" : "Já pago"}
                  </label>
                </div>
                <div className="field"><label className="f">Recorrência</label>
                  <select value={freqLanc} onChange={(e) => setFreqLanc(e.target.value as "unica" | "mensal")}>
                    <option value="mensal">Mensal (repete todo mês)</option>
                    <option value="unica">Não recorrente (só nesta data)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={salvarLanc} disabled={salvando} style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> {salvando ? "Salvando…" : "Salvar lançamento"}</button>
                <button className="btn ghost" onClick={() => setPrevia(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}

      {erroReg && (
        <div onClick={() => setErroReg("")} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, margin: "0 auto 12px", display: "grid", placeItems: "center", background: "rgba(245,158,11,.16)", color: "var(--amber)", fontSize: 24 }}>!</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--txt)" }}>{erroReg}</p>
            <button className="btn" onClick={() => setErroReg("")} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>Entendi</button>
          </div>
        </div>
      )}
    </>
  );
}
