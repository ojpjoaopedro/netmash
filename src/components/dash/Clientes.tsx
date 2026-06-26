"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { Cliente, Lancamento, addCliente, updateCliente, delCliente, addLancamento, FORMAS } from "@/lib/db";
import { brl, dataBR, hoje } from "@/lib/format";
import { SecHead } from "./Kit";

function num(s: string) { return Number(String(s).replace(/\./g, "").replace(",", ".")) || 0; }

function ClienteModal({ edit, onClose, onSaved }: { edit: Cliente | null; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(edit?.nome ?? "");
  const [email, setEmail] = useState(edit?.email ?? "");
  const [telefone, setTelefone] = useState(edit?.telefone ?? "");
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    if (edit) await updateCliente(edit.id, { nome: nome.trim(), email: email.trim() || null, telefone: telefone.trim() || null });
    else await addCliente({ nome: nome.trim(), email: email.trim() || null, telefone: telefone.trim() || null });
    setSalvando(false); onSaved();
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{edit ? "Editar cliente" : "Novo cliente"}</h2>
        <div className="field" style={{ marginTop: 14 }}><label className="f">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" /></div>
        <div className="row">
          <div className="field"><label className="f">E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" /></div>
          <div className="field"><label className="f">Telefone</label><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

function VendaModal({ clientes, onClose, onSaved }: { clientes: Cliente[]; onClose: () => void; onSaved: () => void }) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [novoNome, setNovoNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState("pix");
  const [pago, setPago] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const v = num(valor);
    if (!v) return;
    setSalvando(true);
    let cid = clienteId;
    let nome = clientes.find((c) => c.id === clienteId)?.nome ?? "";
    if (clienteId === "__novo__") {
      const c = await addCliente({ nome: novoNome.trim() || "Cliente" });
      cid = c?.id ?? ""; nome = c?.nome ?? novoNome.trim();
    }
    await addLancamento({
      tipo: "receita", descricao: descricao.trim() || `Venda — ${nome}`, categoria: "Vendas", valor: v,
      data_competencia: data, vencimento: data, pago, data_pagamento: pago ? data : null,
      forma, contato: nome || null, origem: "venda", cliente_id: cid || null,
    });
    setSalvando(false); onSaved();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>Registrar venda</h2>
        <p className="sub" style={{ marginTop: 4 }}>A venda entra no Faturamento (Finanças) e no Comercial automaticamente.</p>
        <div className="field" style={{ marginTop: 14 }}>
          <label className="f">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            <option value="__novo__">+ Novo cliente…</option>
          </select>
        </div>
        {clienteId === "__novo__" && (
          <div className="field"><label className="f">Nome do novo cliente</label><input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome" /></div>
        )}
        <div className="row">
          <div className="field"><label className="f">Valor (R$)</label><input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
          <div className="field"><label className="f">Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <div className="field"><label className="f">Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Produto / serviço vendido" /></div>
        <div className="row">
          <div className="field"><label className="f">Forma</label><select value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 600, paddingBottom: 11 }}>
              <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 18, height: 18 }} /> Já recebido
            </label>
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn green" onClick={salvar} disabled={salvando || !num(valor)}>{salvando ? "Salvando…" : "Registrar venda"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Clientes({ clientes, lancs, reload }: { clientes: Cliente[]; lancs: Lancamento[]; reload: () => void }) {
  const [modalCli, setModalCli] = useState(false);
  const [editCli, setEditCli] = useState<Cliente | null>(null);
  const [modalVenda, setModalVenda] = useState(false);

  const porCliente = useMemo(() => {
    const map = new Map<string, { n: number; total: number }>();
    for (const l of lancs) {
      if (l.tipo !== "receita" || !l.cliente_id) continue;
      const c = map.get(l.cliente_id) || { n: 0, total: 0 };
      c.n++; c.total += l.valor; map.set(l.cliente_id, c);
    }
    return map;
  }, [lancs]);

  const vendas = lancs.filter((l) => l.tipo === "receita" && (l.origem === "venda" || l.cliente_id));
  const totalVendido = vendas.reduce((a, l) => a + l.valor, 0);

  return (
    <>
      <SecHead icon="Users" titulo="Clientes & Vendas" sub="Cadastre clientes e registre vendas — alimenta Finanças e Comercial" cor="#1AADE2"
        right={<div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost sm" onClick={() => { setEditCli(null); setModalCli(true); }}><Plus size={14} /> Cliente</button>
          <button className="btn sm green" onClick={() => setModalVenda(true)}><ShoppingCart size={14} /> Registrar venda</button>
        </div>} />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="kbadge tint-blue">👥</div><div className="klabel">Clientes</div><div className="kval" style={{ fontSize: 24 }}>{clientes.length}</div></div>
        <div className="card kpi"><div className="kbadge tint-green">💰</div><div className="klabel">Total vendido</div><div className="kval" style={{ fontSize: 22 }}>{brl(totalVendido)}</div></div>
        <div className="card kpi"><div className="kbadge tint-amber">🧾</div><div className="klabel">Nº de vendas</div><div className="kval" style={{ fontSize: 24 }}>{vendas.length}</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {clientes.length === 0 ? (
          <div className="empty"><div className="big">👥</div>Nenhum cliente ainda. Clique em <b>+ Cliente</b> ou registre uma venda.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Cliente</th><th>Contato</th><th>Desde</th><th className="num">Vendas</th><th className="num">Total comprado</th><th></th></tr></thead>
            <tbody>
              {clientes.map((c) => {
                const st = porCliente.get(c.id) || { n: 0, total: 0 };
                return (
                  <tr key={c.id}>
                    <td><b>{c.nome}</b></td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{c.email || c.telefone || "—"}</td>
                    <td className="mono">{dataBR(c.criado_em)}</td>
                    <td className="num">{st.n}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{brl(st.total)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn ghost sm" onClick={() => { setEditCli(c); setModalCli(true); }}><Pencil size={13} /></button>{" "}
                      <button className="btn ghost sm" onClick={async () => { if (confirm("Excluir cliente? (as vendas continuam nos lançamentos)")) { await delCliente(c.id); reload(); } }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalCli && <ClienteModal edit={editCli} onClose={() => setModalCli(false)} onSaved={() => { setModalCli(false); reload(); }} />}
      {modalVenda && <VendaModal clientes={clientes} onClose={() => setModalVenda(false)} onSaved={() => { setModalVenda(false); reload(); }} />}
    </>
  );
}
