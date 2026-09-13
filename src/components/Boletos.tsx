"use client";
/**
 * Meus boletos: cadastra um boleto pela linha digitável (ou lê o código de barras
 * pela câmera, onde o navegador suporta), guarda no Calendário (aparece no dia do
 * vencimento) e agenda lembrete por push (7/3/1 dias antes, à escolha). Os dados
 * ficam no mesmo lugar das contas a pagar (me_calendario_pagamentos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Check, Bell, Camera, X, ScanLine, CalendarClock, AlertCircle } from "lucide-react";
import { lerPagamentos, salvarPagamentos, type Pagamento } from "@/app/minhasmetricas/financas-estrutura";
import { parseLinhaDigitavel } from "@/lib/boleto";

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(2, "0");
const vencIso = (p: Pagamento) => `${p.ano}-${pad(p.mes + 1)}-${pad(p.dia)}`;
const fmtData = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const diasAte = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(hojeIso() + "T00:00:00").getTime()) / 86400000);
const OPCOES_LEMBRETE = [7, 3, 1];

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const BDClass = (typeof window !== "undefined" ? (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector : undefined);

export default function Boletos() {
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [aberto, setAberto] = useState(false);
  const recarregar = useCallback(() => setLista(lerPagamentos().filter((p) => p.boleto).sort((a, b) => vencIso(a).localeCompare(vencIso(b)))), []);
  useEffect(() => {
    recarregar();
    window.addEventListener("me:pagamentos", recarregar);
    return () => window.removeEventListener("me:pagamentos", recarregar);
  }, [recarregar]);

  const pagar = (p: Pagamento) => {
    const iso = vencIso(p);
    const todos = lerPagamentos().map((x) => {
      if (x.id !== p.id) return x;
      const cd = new Set(x.confirmadosDia || []);
      if (cd.has(iso)) cd.delete(iso); else cd.add(iso);   // alterna pago/não pago
      return { ...x, confirmadosDia: [...cd] };
    });
    salvarPagamentos(todos); recarregar();
  };
  const excluir = (p: Pagamento) => {
    if (!confirm(`Excluir o boleto "${p.descricao}"?`)) return;
    salvarPagamentos(lerPagamentos().filter((x) => x.id !== p.id)); recarregar();
  };

  const pendentes = lista.filter((p) => !(p.confirmadosDia || []).includes(vencIso(p)));
  const totalPend = pendentes.reduce((a, p) => a + p.valor, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Meus boletos</h2>
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "2px 0 0" }}>Cadastre e receba lembrete antes de vencer. Aparece no calendário automaticamente.</p>
        </div>
        <button onClick={() => setAberto((v) => !v)} style={btnPrim}>
          {aberto ? <X size={16} /> : <Plus size={16} />}{aberto ? "Fechar" : "Novo boleto"}
        </button>
      </div>

      {pendentes.length > 0 && (
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13.5 }}>Boletos em aberto</span>
          <b style={{ fontSize: 20 }}>{pendentes.length} · {brl(totalPend)}</b>
        </div>
      )}

      {aberto && <FormBoleto onSalvo={() => { setAberto(false); recarregar(); }} />}

      {lista.length === 0 && !aberto && (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "var(--bg-2)", color: "var(--brand)", marginBottom: 12 }}><ScanLine size={24} /></span>
          <div style={{ fontWeight: 700, color: "var(--txt)" }}>Nenhum boleto cadastrado</div>
          <p style={{ margin: "6px 0 0" }}>Clique em Novo boleto, cole a linha digitável ou leia pela câmera.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {lista.map((p) => {
          const iso = vencIso(p); const dias = diasAte(iso); const pago = (p.confirmadosDia || []).includes(iso);
          const cor = pago ? "#10B981" : dias < 0 ? "#EF4444" : dias <= 3 ? "#F59E0B" : "var(--muted)";
          const estado = pago ? "Pago" : dias < 0 ? `Venceu há ${-dias}d` : dias === 0 ? "Vence hoje" : `Faltam ${dias}d`;
          return (
            <div key={p.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: pago ? 0.7 : 1 }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", flexShrink: 0, background: pago ? "rgba(16,185,129,.14)" : "var(--bg-2)", color: cor }}><CalendarClock size={20} /></span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 15, textDecoration: pago ? "line-through" : "none" }}>{p.descricao || "Boleto"}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                  <span>Vence {fmtData(iso)}</span>
                  <span style={{ color: cor, fontWeight: 700 }}>{estado}</span>
                  {p.lembrar && p.lembrar.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Bell size={12} /> {p.lembrar.join(", ")}d antes</span>}
                </div>
              </div>
              <b style={{ fontSize: 17, minWidth: 90, textAlign: "right" }}>{brl(p.valor)}</b>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => pagar(p)} title={pago ? "Marcar como não pago" : "Marcar como pago"} style={{ ...btnIcon, color: pago ? "var(--muted)" : "#10B981", borderColor: pago ? "var(--line)" : "rgba(16,185,129,.4)" }}><Check size={16} /></button>
                <button onClick={() => excluir(p)} title="Excluir" style={{ ...btnIcon, color: "#EF4444" }}><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormBoleto({ onSalvo }: { onSalvo: () => void }) {
  const [linha, setLinha] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState("");
  const [lembrar, setLembrar] = useState<number[]>([7, 3]);
  const [aviso, setAviso] = useState("");
  const [camAberta, setCamAberta] = useState(false);

  const aplicarLinha = (txt: string) => {
    setLinha(txt);
    const info = parseLinhaDigitavel(txt);
    if (!info.valido) { if (txt.replace(/\D/g, "").length >= 40 || /pix/i.test(txt)) setAviso("Não reconheci esse código. Confira ou preencha na mão."); return; }
    if (info.valor != null) setValor(info.valor.toFixed(2).replace(".", ","));
    if (info.vencimento) setVenc(info.vencimento);
    if (info.beneficiario && !descricao.trim()) setDescricao(info.beneficiario);
    const notas: string[] = [];
    if (info.banco) notas.push(info.banco);
    if (info.beneficiario) notas.push(info.beneficiario);
    if (!info.vencimento) notas.push("confira a data (não vem no código)");
    setAviso(notas.join(" · "));
  };

  const toggleLembrar = (d: number) => setLembrar((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d].sort((a, b) => b - a)));

  const salvar = () => {
    const v = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (v <= 0) return setAviso("Informe o valor do boleto.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) return setAviso("Informe a data de vencimento.");
    const [y, m, d] = venc.split("-").map(Number);
    const novo: Pagamento = {
      id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      descricao: descricao.trim() || "Boleto", valor: v, dia: d, mes: m - 1, ano: y,
      recorrente: false, freq: "unica", boleto: true, linha: linha.replace(/\D/g, "") || undefined, lembrar, confirmadosDia: [],
    };
    salvarPagamentos([...lerPagamentos(), novo]);
    onSalvo();
  };

  return (
    <div style={{ ...card, display: "grid", gap: 14 }}>
      {/* linha digitável + câmera */}
      <div>
        <div style={label}>Linha digitável (código de barras)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={linha} onChange={(e) => aplicarLinha(e.target.value)} inputMode="numeric" placeholder="Cole aqui o número do boleto" style={inp} />
          {BDClass && <button onClick={() => setCamAberta(true)} title="Ler com a câmera" style={{ ...btnIcon, width: 46, height: 46, flexShrink: 0, color: "var(--brand)" }}><Camera size={20} /></button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 10 }} className="bol-grid">
        <label><div style={label}>Descrição</div><input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Fornecedor, energia..." style={inp} /></label>
        <label><div style={label}>Vencimento</div><input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} style={inp} /></label>
      </div>
      <label style={{ maxWidth: 200 }}><div style={label}>Valor</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, ...inp, padding: "0 12px" }}>
          <span style={{ color: "var(--muted)" }}>R$</span>
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "12px 0", outline: "none" }} />
        </div>
      </label>

      <div>
        <div style={{ ...label, display: "flex", alignItems: "center", gap: 6 }}><Bell size={13} /> Me lembrar antes de vencer</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {OPCOES_LEMBRETE.map((d) => {
            const on = lembrar.includes(d);
            return <button key={d} onClick={() => toggleLembrar(d)} style={{ cursor: "pointer", border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`, background: on ? "rgba(26,173,226,.12)" : "var(--bg-2)", color: on ? "var(--brand)" : "var(--muted)", borderRadius: 99, padding: "8px 16px", fontSize: 13.5, fontWeight: 700 }}>{d} {d === 1 ? "dia" : "dias"} antes</button>;
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>O aviso chega por notificação. Ative as notificações no app pra receber.</div>
      </div>

      {aviso && <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#F59E0B", fontSize: 13, fontWeight: 600 }}><AlertCircle size={15} />{aviso}</div>}

      <div><button onClick={salvar} style={btnPrim}><Check size={16} /> Salvar boleto</button></div>

      {camAberta && <LeitorCamera onLido={(v) => { setCamAberta(false); aplicarLinha(v); }} onFechar={() => setCamAberta(false)} />}
      <style>{`@media(max-width:520px){.bol-grid{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

function LeitorCamera({ onLido, onFechar }: { onLido: (v: string) => void; onFechar: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null; let parar = false; let raf = 0;
    const det = BDClass ? new BDClass({ formats: ["itf", "code_128", "qr_code"] }) : null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current; if (!v) return;
        v.srcObject = stream; await v.play();
        const tick = async () => {
          if (parar || !det || !videoRef.current) return;
          try {
            const res = await det.detect(videoRef.current);
            const achado = res.find((r) => r.rawValue.replace(/\D/g, "").length >= 40);
            if (achado) { onLido(achado.rawValue); return; }
          } catch { /* ignora frames ruins */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch { setErro("Não consegui abrir a câmera. Cole o número na mão."); }
    })();
    return () => { parar = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onLido]);

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Aponte para o código de barras</b>
          <button onClick={onFechar} style={{ cursor: "pointer", background: "transparent", border: 0, color: "var(--muted)" }}><X size={18} /></button>
        </div>
        {erro ? <div style={{ color: "#EF4444", fontSize: 14, padding: "20px 0", textAlign: "center" }}>{erro}</div>
          : <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "3/4", objectFit: "cover" }} />}
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0", textAlign: "center" }}>Segure firme, com boa luz, sobre a faixa do código.</p>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 };
const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt)", fontSize: 15, fontWeight: 600, padding: "12px", borderRadius: 10, outline: "none" };
const btnPrim: React.CSSProperties = { cursor: "pointer", border: 0, borderRadius: 10, padding: "11px 20px", fontWeight: 700, color: "#fff", background: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 8 };
const btnIcon: React.CSSProperties = { cursor: "pointer", width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt)" };
