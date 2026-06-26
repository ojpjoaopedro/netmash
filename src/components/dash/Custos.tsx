"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Wand2, RefreshCw, Trash2, Pencil } from "lucide-react";
import {
  DespesaFixa, getDespesasFixas, addDespesaFixa, updateDespesaFixa, delDespesaFixa, totalFixasAtivas, ORIGEM_RECORRENTE,
} from "@/lib/custos";
import { Lancamento, Funcionario, addLancamentosLote, delLancamento, CATEGORIAS_DESPESA } from "@/lib/db";
import { custoFolha } from "@/lib/calc";
import { brl, mesDe, ultimosMeses, rotuloMes } from "@/lib/format";
import { SecHead } from "./Kit";
import LancamentoModal from "../LancamentoModal";

function num(s: string) { return Number(String(s).replace(/\./g, "").replace(",", ".")) || 0; }

function FixaModal({ edit, onClose, onSaved }: { edit: DespesaFixa | null; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(edit?.nome ?? "");
  const [categoria, setCategoria] = useState(edit?.categoria ?? "Aluguel");
  const [valor, setValor] = useState(edit ? String(edit.valor) : "");
  const [dia, setDia] = useState(edit ? String(edit.dia_venc) : "5");
  const [ativo, setAtivo] = useState(edit ? edit.ativo : true);

  async function salvar() {
    if (!nome.trim() || !num(valor)) return;
    const dados = { nome: nome.trim(), categoria, valor: num(valor), dia_venc: Math.min(28, Math.max(1, Number(dia) || 1)), ativo };
    if (edit) await updateDespesaFixa(edit.id, dados); else await addDespesaFixa(dados);
    onSaved();
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{edit ? "Editar despesa fixa" : "Nova despesa fixa"}</h2>
        <p className="sub" style={{ marginTop: 4 }}>Custo que se repete todo mês (aluguel, internet, software…).</p>
        <div className="field" style={{ marginTop: 14 }}><label className="f">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Aluguel da loja" /></div>
        <div className="row">
          <div className="field"><label className="f">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label className="f">Valor (R$)</label><input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
        </div>
        <div className="row">
          <div className="field"><label className="f">Dia do vencimento</label><input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="numeric" placeholder="5" /></div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 600, paddingBottom: 11 }}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} style={{ width: 18, height: 18 }} /> Ativa
            </label>
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={salvar} disabled={!nome.trim() || !num(valor)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function Custos({ lancs, funcs, reload }: { lancs: Lancamento[]; funcs: Funcionario[]; reload: () => void }) {
  const [fixas, setFixas] = useState<DespesaFixa[]>([]);
  const [selMes, setSelMes] = useState(ultimosMeses(1)[0]);
  const [incluirFolha, setIncluirFolha] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<DespesaFixa | null>(null);
  const [custoAvulso, setCustoAvulso] = useState(false);
  const [msg, setMsg] = useState("");

  const recarregarFixas = async () => setFixas(await getDespesasFixas());
  useEffect(() => { recarregarFixas(); }, []);
  const folha = custoFolha(funcs);
  const totalFixas = totalFixasAtivas(fixas);
  const totalMes = totalFixas + (incluirFolha ? folha.total : 0);

  const jaGerado = useMemo(
    () => lancs.filter((l) => l.origem === ORIGEM_RECORRENTE && mesDe(l.data_competencia) === selMes),
    [lancs, selMes],
  );

  const meses = ultimosMeses(6);

  async function gerar(regerar = false) {
    if (regerar) for (const l of jaGerado) await delLancamento(l.id);
    const lote = fixas.filter((d) => d.ativo).map((d) => ({
      tipo: "despesa" as const, descricao: d.nome, categoria: d.categoria, valor: d.valor,
      data_competencia: `${selMes}-${String(d.dia_venc).padStart(2, "0")}`,
      vencimento: `${selMes}-${String(d.dia_venc).padStart(2, "0")}`,
      pago: false, data_pagamento: null, forma: "boleto", contato: null, origem: ORIGEM_RECORRENTE,
    }));
    if (incluirFolha && folha.total > 0) {
      lote.push({
        tipo: "despesa", descricao: "Folha de pagamento", categoria: "Folha de pagamento", valor: folha.total,
        data_competencia: `${selMes}-05`, vencimento: `${selMes}-05`,
        pago: false, data_pagamento: null, forma: "transferência", contato: null, origem: ORIGEM_RECORRENTE,
      });
    }
    await addLancamentosLote(lote);
    setMsg(`✅ ${lote.length} despesa(s) lançada(s) em ${rotuloMes(selMes)}.`);
    reload();
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <>
      <SecHead icon="DollarSign" titulo="Custos & Despesas" sub="Despesas fixas, folha de pagamento e custos do mês" cor="#EF4444"
        right={<button className="btn ghost sm" onClick={() => setCustoAvulso(true)}><Plus size={14} /> Custo avulso</button>} />

      {msg && <div className="ok">{msg}</div>}

      {/* Resumo */}
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="kbadge tint-red">📌</div><div className="klabel">Despesas fixas / mês</div><div className="kval" style={{ fontSize: 23 }}>{brl(totalFixas)}</div><div className="ktrend" style={{ color: "var(--muted)" }}>{fixas.filter((f) => f.ativo).length} item(ns)</div></div>
        <div className="card kpi"><div className="kbadge tint-blue">👥</div><div className="klabel">Folha de pagamento</div><div className="kval" style={{ fontSize: 23 }}>{brl(folha.total)}</div><div className="ktrend" style={{ color: "var(--muted)" }}>{folha.ativos} colaborador(es)</div></div>
        <div className="card kpi"><div className="kbadge tint-amber">🧮</div><div className="klabel">Custo fixo total / mês</div><div className="kval" style={{ fontSize: 23 }}>{brl(totalMes)}</div><div className="ktrend warn">fixas {incluirFolha ? "+ folha" : ""}</div></div>
      </div>

      {/* Gerar no mês */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3><Wand2 size={16} style={{ verticalAlign: "-3px", marginRight: 6, color: "var(--brand)" }} />Lançar despesas do mês</h3>
        <p className="sub" style={{ marginBottom: 14 }}>Cria os lançamentos de despesa (em aberto) deste mês a partir das despesas fixas {incluirFolha ? "e da folha" : ""}. Eles entram na DRE, no fluxo de caixa e em Contas a pagar.</p>
        <div className="row" style={{ alignItems: "center" }}>
          <div className="field" style={{ maxWidth: 200, margin: 0 }}>
            <label className="f">Mês</label>
            <select value={selMes} onChange={(e) => setSelMes(e.target.value)}>
              {meses.map((m) => <option key={m} value={m}>{rotuloMes(m)}</option>)}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 600, flex: "none" }}>
            <input type="checkbox" checked={incluirFolha} onChange={(e) => setIncluirFolha(e.target.checked)} style={{ width: 18, height: 18 }} /> Incluir folha de pagamento
          </label>
          <div style={{ flex: 1 }} />
          {jaGerado.length > 0
            ? <button className="btn ghost" onClick={() => gerar(true)}><RefreshCw size={15} /> Regerar ({jaGerado.length} já lançadas)</button>
            : <button className="btn" onClick={() => gerar(false)}><Wand2 size={15} /> Gerar despesas de {rotuloMes(selMes)}</button>}
        </div>
      </div>

      {/* Despesas fixas */}
      <div className="card" style={{ padding: 0 }}>
        <div className="section-title" style={{ padding: "16px 18px 0", margin: 0 }}>
          <h2 style={{ fontSize: 16 }}>📌 Despesas fixas</h2>
          <button className="btn sm" onClick={() => { setEdit(null); setModal(true); }}><Plus size={14} /> Nova despesa fixa</button>
        </div>
        {fixas.length === 0 ? <div className="empty">Nenhuma despesa fixa cadastrada.</div> : (
          <table className="table" style={{ marginTop: 8 }}>
            <thead><tr><th>Nome</th><th>Categoria</th><th>Vencimento</th><th className="num">Valor</th><th></th></tr></thead>
            <tbody>
              {fixas.map((d) => (
                <tr key={d.id} style={{ opacity: d.ativo ? 1 : 0.5 }}>
                  <td><b>{d.nome}</b> {!d.ativo && <span className="chip muted">inativa</span>}</td>
                  <td><span className="chip muted">{d.categoria}</span></td>
                  <td>dia {d.dia_venc}</td>
                  <td className="num" style={{ color: "var(--red)" }}>{brl(d.valor)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => { setEdit(d); setModal(true); }}><Pencil size={13} /></button>{" "}
                    <button className="btn ghost sm" onClick={async () => { if (confirm("Remover despesa fixa?")) { await delDespesaFixa(d.id); recarregarFixas(); } }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <FixaModal edit={edit} onClose={() => setModal(false)} onSaved={() => { setModal(false); recarregarFixas(); }} />}
      {custoAvulso && <LancamentoModal tipoInicial="despesa" onClose={() => setCustoAvulso(false)} onSaved={() => { setCustoAvulso(false); reload(); }} />}
    </>
  );
}
