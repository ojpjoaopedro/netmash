"use client";
import { useState } from "react";
import { Lancamento, Tipo, addLancamento, updateLancamento, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, FORMAS } from "@/lib/db";
import { hoje } from "@/lib/format";

type Props = {
  edit?: Lancamento | null;
  tipoInicial?: Tipo;
  comoConta?: boolean; // abre já como "em aberto" (conta a pagar/receber)
  onClose: () => void;
  onSaved: () => void;
};

export default function LancamentoModal({ edit, tipoInicial = "receita", comoConta = false, onClose, onSaved }: Props) {
  const [tipo, setTipo] = useState<Tipo>(edit?.tipo ?? tipoInicial);
  const [descricao, setDescricao] = useState(edit?.descricao ?? "");
  const [valor, setValor] = useState(edit ? String(edit.valor) : "");
  const [categoria, setCategoria] = useState(edit?.categoria ?? "");
  const [data, setData] = useState(edit?.data_competencia ?? hoje());
  const [vencimento, setVencimento] = useState(edit?.vencimento ?? hoje());
  const [pago, setPago] = useState(edit ? edit.pago : !comoConta);
  const [forma, setForma] = useState(edit?.forma ?? "pix");
  const [contato, setContato] = useState(edit?.contato ?? "");
  const [salvando, setSalvando] = useState(false);

  const cats = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  async function salvar() {
    const v = Number(String(valor).replace(/\./g, "").replace(",", "."));
    if (!descricao.trim() || !v) return;
    setSalvando(true);
    const dados = {
      tipo, descricao: descricao.trim(), categoria: categoria || null, valor: v,
      data_competencia: data, vencimento: vencimento || null,
      pago, data_pagamento: pago ? (edit?.data_pagamento ?? hoje()) : null,
      forma, contato: contato.trim() || null, origem: edit?.origem ?? "manual",
    };
    if (edit) await updateLancamento(edit.id, dados);
    else await addLancamento(dados);
    setSalvando(false);
    onSaved();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{edit ? "Editar lançamento" : comoConta ? "Nova conta" : "Novo lançamento"}</h2>
        <p className="sub" style={{ marginTop: 4 }}>Registre uma entrada ou saída de dinheiro.</p>

        <div className="period" style={{ width: "fit-content", margin: "6px 0 16px" }}>
          <button className={tipo === "receita" ? "active" : ""} onClick={() => setTipo("receita")}>📥 Receita</button>
          <button className={tipo === "despesa" ? "active" : ""} onClick={() => setTipo("despesa")}>📤 Despesa</button>
        </div>

        <div className="field">
          <label className="f">Descrição</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Venda para Cliente A" />
        </div>

        <div className="row">
          <div className="field">
            <label className="f">Valor (R$)</label>
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </div>
          <div className="field">
            <label className="f">Categoria</label>
            <input list="cats" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Selecione ou digite" />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label className="f">Data (competência)</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Vencimento</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label className="f">Forma</label>
            <select value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="f">{tipo === "receita" ? "Cliente" : "Fornecedor"}</label>
            <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 18px", cursor: "pointer", fontWeight: 600 }}>
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 18, height: 18 }} />
          {pago ? "✅ Já foi pago/recebido (entra no caixa)" : "⏳ Em aberto (conta a pagar/receber)"}
        </label>

        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={salvar} disabled={salvando || !descricao.trim() || !valor}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
