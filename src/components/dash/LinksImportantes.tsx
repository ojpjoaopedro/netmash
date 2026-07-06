"use client";
import { useEffect, useState } from "react";
import { Link2, ExternalLink, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { SecHead } from "./Kit";

type Link = { label: string; desc: string; url: string; cor: string };
const CORES = ["#1AADE2", "#10B981", "#8b5cf6", "#F59E0B", "#EF4444", "#EC4899"];
const SUGESTOES: Link[] = [
  { label: "CRM", desc: "Gestão de relacionamento e vendas.", url: "", cor: "#1AADE2" },
  { label: "Plataforma / Curso", desc: "Portal de ensino ou área do cliente.", url: "", cor: "#10B981" },
  { label: "Checkout", desc: "Página de pagamentos e vendas.", url: "", cor: "#F59E0B" },
];
const CHAVE = "me_links";

function ler(): Link[] {
  if (typeof window === "undefined") return SUGESTOES;
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || "null"); return Array.isArray(v) ? v : SUGESTOES; } catch { return SUGESTOES; }
}
function salvar(v: Link[]) { if (typeof window !== "undefined") localStorage.setItem(CHAVE, JSON.stringify(v)); }
const normUrl = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

export default function LinksImportantes() {
  const [links, setLinks] = useState<Link[]>(SUGESTOES);
  const [edit, setEdit] = useState<number | null>(null);
  const [rasc, setRasc] = useState<Link>({ label: "", desc: "", url: "", cor: "#1AADE2" });

  useEffect(() => { setLinks(ler()); }, []);
  function persist(v: Link[]) { setLinks(v); salvar(v); }

  function novo() { setRasc({ label: "", desc: "", url: "", cor: CORES[links.length % CORES.length] }); setEdit(-1); }
  function editar(i: number) { setRasc({ ...links[i] }); setEdit(i); }
  function confirmar() {
    if (!rasc.label.trim()) return;
    const item = { ...rasc, url: normUrl(rasc.url.trim()) };
    persist(edit === -1 ? [...links, item] : links.map((l, i) => (i === edit ? item : l)));
    setEdit(null);
  }
  function remover(i: number) { if (confirm("Remover este link?")) persist(links.filter((_, x) => x !== i)); }

  return (
    <>
      <SecHead icon="Link2" titulo="Links Importantes" sub="Acessos rápidos aos seus sistemas" cor="#1AADE2" />
      <div style={{ marginBottom: 14 }}><button className="btn sm" onClick={novo}><Plus size={14} /> Novo link</button></div>

      {edit !== null && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
          <div className="row">
            <div className="field"><label className="f">Nome</label><input value={rasc.label} onChange={(e) => setRasc({ ...rasc, label: e.target.value })} placeholder="Ex: CRM" /></div>
            <div className="field"><label className="f">Endereço (URL)</label><input value={rasc.url} onChange={(e) => setRasc({ ...rasc, url: e.target.value })} placeholder="app.seucrm.com" /></div>
          </div>
          <div className="field"><label className="f">Descrição</label><input value={rasc.desc} onChange={(e) => setRasc({ ...rasc, desc: e.target.value })} placeholder="Para que serve" /></div>
          <div className="field"><label className="f">Cor</label>
            <div style={{ display: "flex", gap: 8 }}>{CORES.map((c) => (
              <button key={c} onClick={() => setRasc({ ...rasc, cor: c })} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: rasc.cor === c ? "2px solid var(--txt)" : "2px solid transparent", cursor: "pointer" }} />
            ))}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn sm" onClick={confirmar}><Check size={14} /> Salvar</button>
            <button className="btn ghost sm" onClick={() => setEdit(null)}><X size={14} /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {links.map((l, i) => (
          <div key={i} className="card" style={{ padding: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: l.cor + "22", color: l.cor }}><Link2 size={22} /></span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="iconbtn" title="Editar" onClick={() => editar(i)}><Pencil size={14} /></button>
                <button className="iconbtn" title="Remover" onClick={() => remover(i)}><Trash2 size={14} /></button>
              </div>
            </div>
            <b style={{ display: "block", fontSize: 16, marginTop: 12 }}>{l.label}</b>
            <p className="sub" style={{ marginTop: 4, fontSize: 12.5, minHeight: 32 }}>{l.desc || "—"}</p>
            {l.url ? (
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, fontWeight: 700, color: l.cor }}>
                Acessar <ExternalLink size={14} />
              </a>
            ) : <span className="sub" style={{ fontSize: 12, marginTop: 8, display: "inline-block", fontStyle: "italic" }}>Clique em ✏️ para adicionar o link</span>}
          </div>
        ))}
      </div>
    </>
  );
}
