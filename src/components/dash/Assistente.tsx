"use client";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, ArrowRight, MessageCircle, Plus, Mic, MicOff, FileSpreadsheet, Check, Camera } from "lucide-react";
import { Lancamento, Cliente, Funcionario, addLancamento, Tipo } from "@/lib/db";
import { Metrica } from "@/lib/indicadores";
import { brl } from "@/lib/format";
import { PERGUNTAS, responder, type Resposta, type Bloco, type Tom, type Ctx } from "@/lib/assistente";
import { parseLancamento, parseLancamentoOCR, type LancParsed } from "@/lib/lancParser";

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

export default function Assistente({ metrs, lancs, clientes, funcs, saldoInicial, nome, reload, onImportar }: Ctx & { nome: string; reload?: () => void; onImportar?: () => void }) {
  const ctx: Ctx = { metrs, lancs, clientes, funcs, saldoInicial };
  const [modo, setModo] = useState<"perguntar" | "registrar">("perguntar");

  // ---- modo PERGUNTAR ----
  const [msgs, setMsgs] = useState<Msg[]>([
    { de: "bot", resp: { titulo: `Oi${nome ? `, ${nome}` : ""}! 👋`, blocos: [{ tipo: "p", texto: "Sou seu assistente. Em “Perguntar” eu respondo sobre seus números. Em “Registrar” você lança gastos e recebimentos por texto, voz 🎤 ou planilha 📊." }] } },
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
  const [salvando, setSalvando] = useState(false);
  const [msgReg, setMsgReg] = useState("");
  const [erroReg, setErroReg] = useState("");
  const [lendoImg, setLendoImg] = useState(false);
  const [progOCR, setProgOCR] = useState(0);
  const srRef = useRef<SR | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function lerImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroReg(""); setMsgReg(""); setPrevia(null); setLendoImg(true); setProgOCR(0);
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(file, "por", { logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") setProgOCR(Math.round(m.progress * 100)); } });
      const p = parseLancamentoOCR(data.text || "");
      if (!p) setErroReg("Não achei um valor na imagem. Tente um print mais nítido, ou digite/fale o lançamento.");
      else { setEntrada(""); setPrevia(p); }
    } catch {
      setErroReg("Não consegui ler a imagem. Tente novamente.");
    }
    setLendoImg(false);
  }

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
    setSalvando(true); setErroReg("");
    try {
      await addLancamento({
        tipo: previa.tipo, descricao: previa.descricao, categoria: null, valor: previa.valor,
        data_competencia: previa.data, vencimento: previa.data, pago: previa.pago,
        data_pagamento: previa.pago ? previa.data : null, forma: null, contato: null, origem: "assistente",
      });
      setPrevia(null); setEntrada("");
      setMsgReg(`✅ ${previa.tipo === "receita" ? "Recebimento" : "Despesa"} de ${brl(previa.valor)} registrado!`);
      reload?.();
    } catch {
      setErroReg("Não consegui salvar. Tente novamente.");
    }
    setSalvando(false);
  }

  const EXEMPLOS = ["gastei 150 com gasolina hoje", "recebi 2 mil de venda", "paguei 89,90 de internet ontem"];

  return (
    <>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)", flexShrink: 0 }}>
          <Sparkles size={22} color="var(--accent)" />
        </span>
        <div>
          <h3 style={{ marginBottom: 2 }}>Assistente</h3>
          <p className="sub" style={{ fontSize: 12.5 }}>Converse com seus números ou registre lançamentos por texto, voz e planilha.</p>
        </div>
      </div>

      {/* Alternância de modo */}
      <div className="period" style={{ width: "fit-content", marginBottom: 14 }}>
        <button className={modo === "perguntar" ? "active" : ""} onClick={() => setModo("perguntar")} style={{ display: "flex", alignItems: "center", gap: 6 }}><MessageCircle size={14} /> Perguntar</button>
        <button className={modo === "registrar" ? "active" : ""} onClick={() => setModo("registrar")} style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Registrar</button>
      </div>

      {modo === "perguntar" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {msgs.map((m, i) => m.de === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--accent)", color: "#06222e", padding: "9px 14px", borderRadius: "14px 14px 4px 14px", fontWeight: 600, fontSize: 14 }}>{m.texto}</div>
            ) : (
              <div key={i} className="card" style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "14px 18px", borderRadius: "14px 14px 14px 4px" }}>
                {m.resp && <>
                  <b style={{ fontSize: 15, display: "block", marginBottom: 6 }}>{m.resp.titulo}</b>
                  {m.resp.blocos.map((b, k) => <BlocoView key={k} b={b} />)}
                </>}
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {PERGUNTAS.map((p) => (
              <button key={p.id} className="btn ghost sm" onClick={() => enviar(p.chip)}>{p.chip}</button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); enviar(txt); }} style={{ display: "flex", gap: 8, position: "sticky", bottom: 0, background: "var(--bg)", paddingTop: 6 }}>
            <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Pergunte algo… ex: como está meu caixa?"
              style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14 }} />
            <button type="submit" className="btn" style={{ display: "flex", alignItems: "center", gap: 6 }}><Send size={16} /> Enviar</button>
          </form>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <p className="sub" style={{ marginBottom: 10 }}>Escreva ou fale o que entrou/saiu. Ex.: <i>&ldquo;gastei 150 com gasolina hoje&rdquo;</i>. Eu monto o lançamento e você confirma.</p>
            <form onSubmit={(e) => { e.preventDefault(); interpretar(entrada); }} style={{ display: "flex", gap: 8 }}>
              <input value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Ex: recebi 2 mil de venda hoje"
                style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 12, padding: "12px 14px", fontSize: 14 }} />
              <button type="button" onClick={ouvir} className={"btn " + (gravando ? "" : "ghost")} title="Falar" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {gravando ? <MicOff size={16} /> : <Mic size={16} />}{gravando ? "Ouvindo…" : ""}
              </button>
              <button type="submit" className="btn">Interpretar</button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <button className="btn ghost sm" onClick={() => imgRef.current?.click()} disabled={lendoImg} style={{ display: "flex", alignItems: "center", gap: 6 }}><Camera size={13} /> {lendoImg ? `Lendo… ${progOCR}%` : "Imagem / print"}</button>
              {onImportar && <button className="btn ghost sm" onClick={onImportar} style={{ display: "flex", alignItems: "center", gap: 6 }}><FileSpreadsheet size={13} /> Importar planilha</button>}
              <input ref={imgRef} type="file" accept="image/*" onChange={lerImagem} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {EXEMPLOS.map((ex) => <button key={ex} className="btn ghost sm" onClick={() => { setEntrada(ex); interpretar(ex); }}>{ex}</button>)}
            </div>
          </div>

          {lendoImg && <div className="card" style={{ marginBottom: 12, textAlign: "center" }}><p className="sub">📷 Lendo a imagem… {progOCR}% (a primeira leitura baixa o idioma e pode demorar alguns segundos)</p></div>}
          {erroReg && <div className="err" style={{ marginBottom: 12 }}>{erroReg}</div>}
          {msgReg && <div className="ok" style={{ marginBottom: 12 }}>{msgReg}</div>}

          {previa && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Confira o lançamento</h3>
              <div className="period" style={{ width: "fit-content", marginBottom: 12 }}>
                <button className={previa.tipo === "receita" ? "active" : ""} onClick={() => setPrevia({ ...previa, tipo: "receita" })}>📥 Receita</button>
                <button className={previa.tipo === "despesa" ? "active" : ""} onClick={() => setPrevia({ ...previa, tipo: "despesa" })}>📤 Despesa</button>
              </div>
              <div className="grid two">
                <div className="field"><label className="f">Descrição</label><input value={previa.descricao} onChange={(e) => setPrevia({ ...previa, descricao: e.target.value })} /></div>
                <div className="field"><label className="f">Valor (R$)</label><input value={String(previa.valor).replace(".", ",")} onChange={(e) => setPrevia({ ...previa, valor: Number(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })} inputMode="decimal" /></div>
                <div className="field"><label className="f">Data</label><input type="date" value={previa.data} onChange={(e) => setPrevia({ ...previa, data: e.target.value })} /></div>
                <div className="field" style={{ justifyContent: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                    <input type="checkbox" checked={previa.pago} onChange={(e) => setPrevia({ ...previa, pago: e.target.checked })} style={{ width: 18, height: 18 }} />
                    {previa.tipo === "receita" ? "Já recebido" : "Já pago"} (entra no caixa)
                  </label>
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
    </>
  );
}
