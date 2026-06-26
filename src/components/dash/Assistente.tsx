"use client";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import { Lancamento, Cliente, Funcionario } from "@/lib/db";
import { Metrica } from "@/lib/indicadores";
import { PERGUNTAS, responder, type Resposta, type Bloco, type Tom, type Ctx } from "@/lib/assistente";

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
  // acao
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "7px 0", padding: "9px 11px", background: "rgba(26,173,226,.08)", border: "1px solid rgba(26,173,226,.25)", borderRadius: 10 }}>
      <ArrowRight size={16} style={{ marginTop: 2, flexShrink: 0, color: "var(--accent)" }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{b.texto}</span>
    </div>
  );
}

type Msg = { de: "bot" | "user"; texto?: string; resp?: Resposta };

export default function Assistente({ metrs, lancs, clientes, funcs, saldoInicial, nome }: Ctx & { nome: string }) {
  const ctx: Ctx = { metrs, lancs, clientes, funcs, saldoInicial };
  const [msgs, setMsgs] = useState<Msg[]>([
    { de: "bot", resp: { titulo: `Oi${nome ? `, ${nome}` : ""}! 👋`, blocos: [{ tipo: "p", texto: "Sou seu assistente. Pergunte sobre caixa, lucro, gastos, contas a pagar/receber, clientes ou equipe — ou toque numa sugestão abaixo." }] } },
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

  return (
    <>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)", flexShrink: 0 }}>
          <Sparkles size={22} color="var(--accent)" />
        </span>
        <div>
          <h3 style={{ marginBottom: 2 }}>Assistente</h3>
          <p className="sub" style={{ fontSize: 12.5 }}>Converse com seus números — respostas na hora, com base nos seus dados.</p>
        </div>
      </div>

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
  );
}
