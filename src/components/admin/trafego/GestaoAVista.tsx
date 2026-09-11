"use client";
/** Aba Gestão à Vista: galeria de criativos (anúncios). Ranking do mês, por semana ou por campanha. */
import { useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Download, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { CARD, LBL, INP, authHeaders } from "./shared";
import {
  listaSemanas, brl, num, pct, mesLabel, agregarCriativosMes, cCpl, cCpc, cCtr, cCpm, type Criativo,
} from "@/lib/trafego";

type Visao = "mes" | "semana" | "campanha";

export default function GestaoAVista({ criativos, mes, reload }: { criativos: Criativo[]; mes: string; reload: () => void }) {
  const [visao, setVisao] = useState<Visao>("mes");
  const [compacto, setCompacto] = useState(false);
  const [editar, setEditar] = useState<Partial<Criativo> | null>(null);
  const [puxando, setPuxando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const doMes = useMemo(() => criativos.filter((c) => c.mes === mes), [criativos, mes]);

  const puxar = async () => {
    setPuxando(true); setMsg(null);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "sync-meta-criativos", mes, mesInteiro: true }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao puxar.");
      reload(); setMsg(`${j.criativos} criativos puxados.`);
    } catch (e) { setMsg((e as Error).message); } finally { setPuxando(false); }
  };
  const apagar = async (c: Criativo) => {
    if (!confirm("Apagar este criativo?")) return;
    await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "apagar-criativo", id: c.id }) });
    reload();
  };

  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${compacto ? 180 : 260}px,1fr))`, gap: compacto ? 12 : 16 };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={LBL}>Gestão à Vista</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Cada card é um criativo com a copy e o resultado. {mesLabel(mes)}.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={puxar} disabled={puxando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 15px", fontWeight: 700, color: "#fff", background: "#1877F2", display: "inline-flex", alignItems: "center", gap: 7 }}>{puxando ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}{puxando ? "Puxando..." : "Puxar do Facebook"}</button>
          <button onClick={() => setEditar({ mes, semana: 1 })} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 15px", fontWeight: 700, color: "#fff", background: "#1AADE2", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={16} />Novo criativo</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setVisao("mes")} style={pill(visao === "mes", "#10B981")}>🏆 Ranking do mês</button>
        <button onClick={() => setVisao("semana")} style={pill(visao === "semana", "#2563eb")}>Por semana</button>
        <button onClick={() => setVisao("campanha")} style={pill(visao === "campanha", "#a855f7")}>Por campanha</button>
        <button onClick={() => setCompacto((v) => !v)} style={pill(compacto, "#F59E0B")}>▤ Compacto</button>
      </div>

      {msg && <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, color: "var(--muted)", fontSize: 13 }}>{msg}</div>}

      {doMes.length === 0 && <div style={{ ...CARD, textAlign: "center", padding: 44, color: "var(--muted)" }}><span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "var(--bg-2)", color: "#1AADE2", marginBottom: 12 }}><ImageIcon size={24} /></span><div style={{ fontWeight: 700, color: "var(--txt)" }}>Sem criativos em {mesLabel(mes)}</div><p style={{ margin: "6px 0 0" }}>Clique em Novo criativo ou use Puxar do Facebook.</p></div>}

      {visao === "mes" && doMes.length > 0 && (
        <div style={grid}>
          {agregarCriativosMes(doMes).map((c, i) => <Card key={c.id || i} c={c} rank={i + 1} compacto={compacto} />)}
        </div>
      )}
      {visao === "semana" && listaSemanas(mes).map((s) => {
        const lista = doMes.filter((c) => c.semana === s).sort((a, b) => b.leads - a.leads);
        if (lista.length === 0) return null;
        return (
          <div key={s}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", background: "rgba(37,99,235,.14)", padding: "4px 12px", borderRadius: 99, display: "inline-block", marginBottom: 10 }}>Semana {s}</div>
            <div style={grid}>{lista.map((c, i) => <Card key={c.id || i} c={c} compacto={compacto} onEditar={() => setEditar(c)} onApagar={() => apagar(c)} />)}</div>
          </div>
        );
      })}
      {visao === "campanha" && Object.entries(grupoPorTema(doMes)).map(([tema, lista]) => (
        <div key={tema}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#a855f7", background: "rgba(168,85,247,.14)", padding: "4px 12px", borderRadius: 99, display: "inline-block", marginBottom: 10 }}>📣 {tema}</div>
          <div style={grid}>{lista.map((c, i) => <Card key={c.id || i} c={c} compacto={compacto} onEditar={() => setEditar(c)} onApagar={() => apagar(c)} />)}</div>
        </div>
      ))}

      {editar && <ModalCriativo inicial={editar} mesAtual={mes} onFechar={() => setEditar(null)} onSalvo={() => { setEditar(null); reload(); }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}

const pill = (on: boolean, cor: string): React.CSSProperties => ({ cursor: "pointer", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, background: on ? cor : "var(--bg-2)", color: on ? "#fff" : "var(--muted)" });
function grupoPorTema(cs: Criativo[]): Record<string, Criativo[]> {
  const o: Record<string, Criativo[]> = {};
  cs.forEach((c) => { const t = c.tema || "Sem campanha"; (o[t] = o[t] || []).push(c); });
  return o;
}
const MEDAL = ["", "🥇", "🥈", "🥉"];

function Card({ c, rank, compacto, onEditar, onApagar }: { c: Criativo; rank?: number; compacto?: boolean; onEditar?: () => void; onApagar?: () => void }) {
  const stats: [string, string, string?][] = compacto
    ? [["Leads", num(c.leads), "#3B82F6"], ["Custo/lead", brl(cCpl(c)), "#10B981"]]
    : [["Investido", brl(c.investido)], ["Leads", num(c.leads), "#3B82F6"], ["Custo/lead", brl(cCpl(c)), "#10B981"], ["Cliques", num(c.cliques)], ["CPC", brl(cCpc(c))], ["CTR", pct(cCtr(c))], ["CPM", brl(cCpm(c))], ["Impressões", num(c.impressoes)]];
  return (
    <div style={{ ...CARD, padding: compacto ? 10 : 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "var(--bg-2)", aspectRatio: "4 / 5", marginBottom: 10 }}>
        {c.midia_tipo === "video" && c.midia_url ? (
          <video src={c.midia_url} controls style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
        ) : c.midia_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.midia_url} alt={c.titulo || "criativo"} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--muted)" }}><ImageIcon size={30} /></div>
        )}
        {rank != null && rank <= 3 && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 20 }}>{MEDAL[rank]}</span>}
        {rank != null && rank > 3 && <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 99, padding: "2px 8px" }}>{rank}º</span>}
        {c.origem === "meta" && <span style={{ position: "absolute", top: 8, right: 8, background: "#1877F2", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "3px 6px" }}>Meta</span>}
        {(onEditar || onApagar) && (
          <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
            {onEditar && <button onClick={onEditar} style={miniBtn}><Pencil size={13} /></button>}
            {onApagar && <button onClick={onApagar} style={{ ...miniBtn, color: "#EF4444" }}><Trash2 size={13} /></button>}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compacto ? "1fr 1fr" : "1fr 1fr", gap: 6 }}>
        {stats.map(([l, v, cor]) => (
          <div key={l} style={{ background: "var(--bg-2)", borderRadius: 8, padding: "6px 9px" }}>
            <div style={{ fontSize: 9.5, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div>
            <b style={{ fontSize: 14, color: cor || "var(--txt)" }}>{v}</b>
          </div>
        ))}
      </div>
      {!compacto && (c.titulo || c.copy) && (
        <div style={{ marginTop: 10 }}>
          {c.titulo && <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.titulo}</div>}
          {c.copy && <div style={{ fontSize: 12.5, color: "var(--muted)", whiteSpace: "pre-line", marginTop: 3, maxHeight: 84, overflow: "hidden" }}>{c.copy}</div>}
        </div>
      )}
    </div>
  );
}
const miniBtn: React.CSSProperties = { cursor: "pointer", background: "rgba(0,0,0,.6)", border: 0, color: "#fff", borderRadius: 7, padding: 6, display: "grid", placeItems: "center" };

function ModalCriativo({ inicial, mesAtual, onFechar, onSalvo }: { inicial: Partial<Criativo>; mesAtual: string; onFechar: () => void; onSalvo: () => void }) {
  const [f, setF] = useState<Partial<Criativo>>({ semana: 1, midia_tipo: "image", investido: 0, cliques: 0, cliques_todos: 0, impressoes: 0, leads: 0, ...inicial });
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof Criativo, v: string | number) => setF((o) => ({ ...o, [k]: v }));

  const escolherImagem = async (file: File) => {
    setSubindo(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
      const r = await fetch("/api/marketing/criativo-upload", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro no upload.");
      setF((o) => ({ ...o, midia_url: j.url, midia_tipo: "image" }));
    } catch (e) { alert((e as Error).message); } finally { setSubindo(false); }
  };
  const salvar = async () => {
    setSalvando(true);
    await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-criativo", ...f, mes: mesAtual }) });
    setSalvando(false); onSalvo();
  };
  const campos: { k: keyof Criativo; label: string; prefixo?: string }[] = [
    { k: "investido", label: "Investido", prefixo: "R$" }, { k: "impressoes", label: "Impressões" },
    { k: "cliques", label: "Cliques (link)" }, { k: "cliques_todos", label: "Cliques (todos)" }, { k: "leads", label: "Leads" },
  ];
  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, width: 500, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <b style={{ fontSize: 16 }}>{inicial.id ? "Editar criativo" : "Novo criativo"}</b>
          <button onClick={onFechar} style={{ cursor: "pointer", background: "transparent", border: 0, color: "var(--muted)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {/* mídia */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 90, height: 112, borderRadius: 10, overflow: "hidden", background: "var(--bg-2)", flexShrink: 0, display: "grid", placeItems: "center" }}>
              {f.midia_url ? (f.midia_tipo === "video"
                ? <video src={f.midia_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={f.midia_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />)
                : <ImageIcon size={26} color="var(--muted)" />}
            </div>
            <div style={{ flex: 1, display: "grid", gap: 8 }}>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) escolherImagem(file); }} />
              <button onClick={() => fileRef.current?.click()} disabled={subindo} style={{ cursor: "pointer", border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--txt)", borderRadius: 10, padding: "10px", fontWeight: 700, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}><Upload size={15} />{subindo ? "Enviando..." : "Enviar imagem"}</button>
              <input value={f.midia_url && f.midia_tipo === "video" ? f.midia_url : ""} onChange={(e) => setF((o) => ({ ...o, midia_url: e.target.value, midia_tipo: "video" }))} placeholder="ou cole a URL de um vídeo" style={{ ...INP, fontSize: 13, padding: "9px 11px" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <label><div style={lbl}>Campanha / tema</div><input value={f.tema || ""} onChange={(e) => set("tema", e.target.value)} placeholder="Ex.: Dor financeira" style={INP} /></label>
            <label><div style={lbl}>Semana</div>
              <select value={f.semana} onChange={(e) => set("semana", Number(e.target.value))} style={{ ...INP, cursor: "pointer" }}>
                {listaSemanas(mesAtual).map((s) => <option key={s} value={s}>Semana {s}</option>)}
              </select>
            </label>
          </div>
          <label><div style={lbl}>Título</div><input value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} placeholder="Nome/título do anúncio" style={INP} /></label>
          <label><div style={lbl}>Copy</div><textarea value={f.copy || ""} onChange={(e) => set("copy", e.target.value)} placeholder="Texto do anúncio" rows={3} style={{ ...INP, resize: "vertical", fontFamily: "inherit" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {campos.map((c) => (
              <label key={c.k}><div style={lbl}>{c.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...INP, padding: "0 10px" }}>
                  {c.prefixo && <span style={{ color: "var(--muted)", fontSize: 13 }}>{c.prefixo}</span>}
                  <input inputMode="decimal" value={(f[c.k] as number) ?? ""} onChange={(e) => set(c.k, e.target.value === "" ? 0 : Number(e.target.value.replace(",", ".")) || 0)} placeholder="0" style={{ width: "100%", border: 0, background: "transparent", color: "var(--txt)", fontSize: 15, fontWeight: 700, padding: "10px 0", outline: "none" }} />
                </div>
              </label>
            ))}
          </div>
          <button onClick={salvar} disabled={salvando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "12px", fontWeight: 700, color: "#fff", background: "#10B981", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}><Save size={16} />{salvando ? "Salvando..." : "Salvar criativo"}</button>
        </div>
      </div>
    </div>
  );
}
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 };
