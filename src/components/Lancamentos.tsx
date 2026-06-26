"use client";
import { useMemo, useState } from "react";
import { Lancamento, Tipo, delLancamento, marcarPago } from "@/lib/db";
import { brl, dataBR } from "@/lib/format";
import LancamentoModal from "./LancamentoModal";

export default function Lancamentos({ lancs, reload }: { lancs: Lancamento[]; reload: () => void }) {
  const [filtro, setFiltro] = useState<"todos" | Tipo>("todos");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Lancamento | null>(null);

  const lista = useMemo(() => {
    return lancs
      .filter((l) => filtro === "todos" || l.tipo === filtro)
      .filter((l) => !busca || (l.descricao + " " + (l.categoria || "") + " " + (l.contato || "")).toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (a.data_competencia < b.data_competencia ? 1 : -1));
  }, [lancs, filtro, busca]);

  return (
    <>
      <div className="section-title">
        <h2>Lançamentos</h2>
        <button className="btn" onClick={() => { setEdit(null); setModal(true); }}>+ Novo lançamento</button>
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="period">
          <button className={filtro === "todos" ? "active" : ""} onClick={() => setFiltro("todos")}>Todos</button>
          <button className={filtro === "receita" ? "active" : ""} onClick={() => setFiltro("receita")}>📥 Receitas</button>
          <button className={filtro === "despesa" ? "active" : ""} onClick={() => setFiltro("despesa")}>📤 Despesas</button>
        </div>
        <input style={{ flex: 1, minWidth: 180 }} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar por descrição, categoria ou contato" />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {lista.length === 0 ? (
          <div className="empty"><div className="big">💸</div>Nenhum lançamento ainda. Clique em <b>+ Novo lançamento</b>.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Status</th><th className="num">Valor</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id}>
                  <td className="mono">{dataBR(l.data_competencia)}</td>
                  <td>
                    <b>{l.descricao}</b>
                    {l.contato && <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{l.contato}</div>}
                  </td>
                  <td><span className="chip muted">{l.categoria || "—"}</span></td>
                  <td>
                    {l.pago
                      ? <span className="chip green">{l.tipo === "receita" ? "Recebido" : "Pago"}</span>
                      : <button className="chip amber" style={{ border: 0, cursor: "pointer" }} onClick={async () => { await marcarPago(l.id, true); reload(); }} title="Marcar como pago/recebido">⏳ Em aberto</button>}
                  </td>
                  <td className="num" style={{ color: l.tipo === "receita" ? "var(--green)" : "var(--red)" }}>
                    {l.tipo === "receita" ? "+" : "−"} {brl(l.valor)}
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="btn ghost sm" onClick={() => { setEdit(l); setModal(true); }}>✏️</button>{" "}
                    <button className="btn ghost sm" onClick={async () => { if (confirm("Excluir este lançamento?")) { await delLancamento(l.id); reload(); } }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <LancamentoModal
          edit={edit}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); reload(); }}
        />
      )}
    </>
  );
}
