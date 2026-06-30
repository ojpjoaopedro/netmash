"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type Cupom = { id: string; codigo: string; descricao: string | null; percentual: number; ativo: boolean };
type FormC = { id?: string; codigo: string; descricao: string; percentual: string; ativo: boolean };
const VAZIO: FormC = { codigo: "", descricao: "", percentual: "", ativo: true };

export default function AdminCupons() {
  const [cupons, setCupons] = useState<Cupom[] | null>(supabaseReady ? null : []);
  const [form, setForm] = useState<FormC | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const tokenH = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, []);

  const carregar = useCallback(async () => {
    if (!supabaseReady) return;
    const res = await fetch("/api/cupons-admin", { headers: { ...(await tokenH()) } });
    const j = await res.json().catch(() => ({}));
    setCupons(res.ok ? (j.cupons ?? []) : []);
  }, [tokenH]);

  useEffect(() => { carregar(); }, [carregar]);

  function novo() { setErro(""); setForm({ ...VAZIO }); }
  function editar(c: Cupom) { setErro(""); setForm({ id: c.id, codigo: c.codigo, descricao: c.descricao || "", percentual: String(c.percentual).replace(".", ","), ativo: c.ativo }); }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSalvando(true); setErro("");
    const res = await fetch("/api/cupons-admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "salvar", ...form }) });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErro(j.error || "Não consegui salvar."); return; }
    setForm(null);
    await carregar();
  }

  async function excluir(c: Cupom) {
    if (!window.confirm(`Excluir o cupom "${c.codigo}"?`)) return;
    const res = await fetch("/api/cupons-admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "excluir", id: c.id }) });
    if (res.ok) await carregar();
  }

  if (!supabaseReady) return <p className="adm-sub">Conecte o Supabase para gerenciar os cupons.</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Cupons {cupons && <span style={{ opacity: .5, fontWeight: 600 }}>({cupons.length})</span>}</h2>
          <p className="adm-sub" style={{ margin: "4px 0 0" }}>Cupons de desconto que o cliente digita no checkout.</p>
        </div>
        <button className="adm-btn" onClick={novo}><Plus size={15} /> Adicionar cupom</button>
      </div>

      {cupons === null ? <p className="adm-sub">Carregando…</p>
        : cupons.length === 0 ? (
          <div className="adm-acbox" style={{ textAlign: "center", padding: "34px 20px" }}>
            <Ticket size={30} style={{ opacity: .4 }} />
            <p className="adm-sub" style={{ marginTop: 10 }}>Nenhum cupom ainda. Clique em <b>Adicionar cupom</b>.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {cupons.map((c) => (
              <div key={c.id} className="adm-acbox" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, letterSpacing: ".04em", background: "#16242b", color: "#1AADE2", border: "1px solid #1AADE255", borderRadius: 8, padding: "6px 12px" }}>{c.codigo}</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="adm-sub">{c.descricao || <span style={{ opacity: .5 }}>sem descrição</span>} {!c.ativo && <span className="adm-badge cortado" style={{ marginLeft: 6 }}>Inativo</span>}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#10B981" }}>{c.percentual}%</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="adm-btn sm ghost" onClick={() => editar(c)}><Pencil size={13} /> Editar</button>
                  <button className="adm-btn sm danger" onClick={() => excluir(c)}><Trash2 size={13} /> Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {form && (
        <div className="adm-modalbg" onClick={() => setForm(null)}>
          <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
            <div className="adm-mhead"><h3>{form.id ? "Editar cupom" : "Novo cupom"}</h3><button type="button" onClick={() => setForm(null)}>✕</button></div>
            {erro && <div className="adm-erro">{erro}</div>}
            <div className="adm-grid2">
              <label className="adm-f"><span>Código (ex: BEMVINDO10)</span><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="BEMVINDO10" /></label>
              <label className="adm-f"><span>Desconto (%)</span><input value={form.percentual} onChange={(e) => setForm({ ...form, percentual: e.target.value })} inputMode="decimal" placeholder="10" /></label>
            </div>
            <label className="adm-f"><span>Descrição (opcional)</span><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Desconto de boas-vindas" /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", marginTop: 12 }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Cupom ativo
            </label>
            <button className="adm-btn" type="submit" disabled={salvando} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>{salvando ? "Salvando…" : "Salvar cupom"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
