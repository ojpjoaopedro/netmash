"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Copy, Check, ExternalLink, Package } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type Produto = {
  id: string; nome: string; descricao: string | null; imagem: string | null; slug: string;
  preco: number; modo: string; intervalo: string | null; parcelas: number | null;
  libera_acesso: boolean; ativo: boolean;
  pos_venda_msg?: string | null; pos_venda_btn_texto?: string | null; pos_venda_btn_link?: string | null;
};
type FormP = {
  id?: string; nome: string; descricao: string; imagem: string; slug: string;
  preco: string; modo: "pagamento" | "assinatura"; intervalo: "month" | "year"; parcelas: string;
  libera_acesso: boolean; ativo: boolean;
  pos_venda_msg: string; pos_venda_btn_texto: string; pos_venda_btn_link: string;
};

const VAZIO: FormP = { nome: "", descricao: "", imagem: "", slug: "", preco: "", modo: "pagamento", intervalo: "month", parcelas: "1", libera_acesso: true, ativo: true, pos_venda_msg: "", pos_venda_btn_texto: "", pos_venda_btn_link: "" };

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[] | null>(supabaseReady ? null : []);
  const [form, setForm] = useState<FormP | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [copiado, setCopiado] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const tokenH = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, []);

  const carregar = useCallback(async () => {
    if (!supabaseReady) return;
    const res = await fetch("/api/produtos-admin", { headers: { ...(await tokenH()) } });
    const j = await res.json().catch(() => ({}));
    setProdutos(res.ok ? (j.produtos ?? []) : []);
  }, [tokenH]);

  useEffect(() => { carregar(); }, [carregar]);

  function novo() { setErro(""); setOk(""); setForm({ ...VAZIO }); }
  function editar(p: Produto) {
    setErro(""); setOk("");
    setForm({ id: p.id, nome: p.nome, descricao: p.descricao || "", imagem: p.imagem || "", slug: p.slug, preco: String(p.preco).replace(".", ","), modo: p.modo === "assinatura" ? "assinatura" : "pagamento", intervalo: p.intervalo === "year" ? "year" : "month", parcelas: String(p.parcelas || 1), libera_acesso: p.libera_acesso, ativo: p.ativo, pos_venda_msg: p.pos_venda_msg || "", pos_venda_btn_texto: p.pos_venda_btn_texto || "", pos_venda_btn_link: p.pos_venda_btn_link || "" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.nome.trim()) { setErro("Informe o nome do produto."); return; }
    setSalvando(true); setErro(""); setOk("");
    const res = await fetch("/api/produtos-admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "salvar", ...form }) });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErro(j.error || "Não consegui salvar."); return; }
    setOk(`✅ Produto salvo! Link do checkout: ${origin}/checkout/${j.slug}`);
    setForm(null);
    await carregar();
  }

  async function excluir(p: Produto) {
    if (!window.confirm(`Excluir o produto "${p.nome}"? Isso não apaga vendas já feitas.`)) return;
    const res = await fetch("/api/produtos-admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "excluir", id: p.id }) });
    if (res.ok) await carregar();
  }

  function copiarLink(slug: string) {
    const link = `${origin}/checkout/${slug}`;
    navigator.clipboard?.writeText(link).then(() => { setCopiado(slug); setTimeout(() => setCopiado(""), 1800); });
  }

  if (!supabaseReady) return <p className="adm-sub">Conecte o Supabase para gerenciar os produtos do checkout.</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Produtos {produtos && <span style={{ opacity: .5, fontWeight: 600 }}>({produtos.length})</span>}</h2>
          <p className="adm-sub" style={{ margin: "4px 0 0" }}>Cada produto gera um link de checkout. Comprar libera o acesso ao app e dispara o e-mail de senha.</p>
        </div>
        <button className="adm-btn" onClick={novo}><Plus size={15} /> Adicionar produto</button>
      </div>

      {ok && <div className="adm-ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {/* LISTA */}
      {produtos === null ? <p className="adm-sub">Carregando…</p>
        : produtos.length === 0 ? (
          <div className="adm-acbox" style={{ textAlign: "center", padding: "34px 20px" }}>
            <Package size={30} style={{ opacity: .4 }} />
            <p className="adm-sub" style={{ marginTop: 10 }}>Nenhum produto ainda. Clique em <b>Adicionar produto</b> para criar o primeiro.</p>
          </div>
        ) : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th>Produto</th><th>Endereço (link)</th><th>Preço</th><th>Tipo</th><th>Ações</th></tr></thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--bg-2,#0d0d0d)", border: "1px solid var(--line,#222)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                          {p.imagem ? <img src={p.imagem} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={18} style={{ opacity: .4 }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.nome} {!p.ativo && <span className="adm-badge cortado" style={{ marginLeft: 4 }}>Inativo</span>}</div>
                          {p.descricao && <div className="adm-sub" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descricao}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="adm-sub" style={{ fontFamily: "monospace" }}>/checkout/{p.slug}</span></td>
                    <td><b>{brl(Number(p.preco))}{p.modo === "assinatura" ? (p.intervalo === "year" ? "/ano" : "/mês") : ""}</b>{p.libera_acesso && <div className="adm-sub" style={{ fontSize: 11.5 }}>libera acesso</div>}</td>
                    <td>{p.modo === "assinatura" ? "Assinatura" : "Único"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="adm-btn sm ghost" onClick={() => copiarLink(p.slug)} title="Copiar link">{copiado === p.slug ? <Check size={14} /> : <Copy size={14} />}</button>
                        <a className="adm-btn sm ghost" href={`/checkout/${p.slug}`} target="_blank" rel="noreferrer" title="Abrir checkout"><ExternalLink size={14} /></a>
                        <button className="adm-btn sm ghost" onClick={() => editar(p)} title="Editar"><Pencil size={14} /></button>
                        <button className="adm-btn sm danger" onClick={() => excluir(p)} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* MODAL FORM */}
      {form && (
        <div className="adm-modalbg" onClick={() => setForm(null)}>
          <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
            <div className="adm-mhead"><h3>{form.id ? "Editar produto" : "Novo produto"}</h3><button type="button" onClick={() => setForm(null)}>✕</button></div>
            {erro && <div className="adm-erro">{erro}</div>}

            <Campo label="Nome do produto"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Minhas Métricas — Acesso" /></Campo>
            <Campo label="Descrição"><textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Aparece na página de checkout" style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", color: "#f4f5f7", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", width: "100%", resize: "vertical" }} /></Campo>

            <div className="adm-grid2">
              <Campo label="Preço (R$)"><input value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} inputMode="decimal" placeholder="19,99" /></Campo>
              <Campo label="Cobrança">
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className={"adm-area" + (form.modo === "pagamento" ? " on" : "")} onClick={() => setForm({ ...form, modo: "pagamento" })}>Único</button>
                  <button type="button" className={"adm-area" + (form.modo === "assinatura" ? " on" : "")} onClick={() => setForm({ ...form, modo: "assinatura" })}>Assinatura</button>
                </div>
              </Campo>
            </div>

            <div className="adm-grid2">
              {form.modo === "assinatura" ? (
                <Campo label="Intervalo">
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className={"adm-area" + (form.intervalo === "month" ? " on" : "")} onClick={() => setForm({ ...form, intervalo: "month" })}>Mensal</button>
                    <button type="button" className={"adm-area" + (form.intervalo === "year" ? " on" : "")} onClick={() => setForm({ ...form, intervalo: "year" })}>Anual</button>
                  </div>
                </Campo>
              ) : (
                <Campo label="Parcelas no cartão (máx.)"><input value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} inputMode="numeric" placeholder="1" /></Campo>
              )}
              <Campo label="Imagem (URL — opcional)"><input value={form.imagem} onChange={(e) => setForm({ ...form, imagem: e.target.value })} placeholder="https://…" /></Campo>
            </div>

            <Campo label="Endereço do checkout (slug)"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="deixe em branco p/ gerar do nome" /></Campo>

            <div style={{ display: "flex", gap: 18, margin: "6px 0 4px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={form.libera_acesso} onChange={(e) => setForm({ ...form, libera_acesso: e.target.checked })} /> Comprar libera acesso ao app
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Produto ativo (à venda)
              </label>
            </div>

            <div style={{ borderTop: "1px solid var(--line,#2a2a2a)", margin: "16px 0 6px", paddingTop: 14 }}>
              <h4 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700 }}>💬 Pós-venda (opcional)</h4>
              <p className="adm-sub" style={{ margin: "0 0 8px" }}>Mensagem e botão que aparecem na tela de agradecimento após a compra.</p>
            </div>
            <Campo label="Mensagem pós-venda"><textarea value={form.pos_venda_msg} onChange={(e) => setForm({ ...form, pos_venda_msg: e.target.value })} rows={2} placeholder="Ex: Obrigado pela compra! Seu acesso já está sendo liberado." style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", color: "#f4f5f7", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", width: "100%", resize: "vertical" }} /></Campo>
            <div className="adm-grid2">
              <Campo label="Texto do botão"><input value={form.pos_venda_btn_texto} onChange={(e) => setForm({ ...form, pos_venda_btn_texto: e.target.value })} placeholder="Ex: Acessar o app" /></Campo>
              <Campo label="Link do botão"><input value={form.pos_venda_btn_link} onChange={(e) => setForm({ ...form, pos_venda_btn_link: e.target.value })} placeholder="https://…" /></Campo>
            </div>

            <button className="adm-btn" type="submit" disabled={salvando} style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>{salvando ? "Salvando…" : "Salvar produto"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="adm-f" style={{ display: "block", marginBottom: 10 }}><span style={{ display: "block", marginBottom: 5 }}>{label}</span>{children}</label>;
}
