"use client";
import { useState } from "react";
import { Funcionario, addFuncionario, updateFuncionario, delFuncionario } from "@/lib/db";
import { custoFolha } from "@/lib/calc";
import { brl, dataBR, hoje } from "@/lib/format";

function FuncModal({ edit, onClose, onSaved }: { edit: Funcionario | null; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(edit?.nome ?? "");
  const [cargo, setCargo] = useState(edit?.cargo ?? "");
  const [departamento, setDepartamento] = useState(edit?.departamento ?? "");
  const [salario, setSalario] = useState(edit ? String(edit.salario) : "");
  const [beneficios, setBeneficios] = useState(edit ? String(edit.beneficios) : "");
  const [admissao, setAdmissao] = useState(edit?.admissao ?? hoje());
  const [ativo, setAtivo] = useState(edit ? edit.ativo : true);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const num = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
    const dados = {
      nome: nome.trim(), cargo: cargo.trim() || null, departamento: departamento.trim() || null,
      salario: num(salario), beneficios: num(beneficios), admissao: admissao || null, ativo, contato: null,
    };
    if (edit) await updateFuncionario(edit.id, dados);
    else await addFuncionario(dados);
    setSalvando(false);
    onSaved();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{edit ? "Editar colaborador" : "Novo colaborador"}</h2>
        <div className="field" style={{ marginTop: 14 }}>
          <label className="f">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </div>
        <div className="row">
          <div className="field"><label className="f">Cargo</label><input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Vendedor" /></div>
          <div className="field"><label className="f">Departamento</label><input value={departamento} onChange={(e) => setDepartamento(e.target.value)} placeholder="Ex: Comercial" /></div>
        </div>
        <div className="row">
          <div className="field"><label className="f">Salário (R$)</label><input value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
          <div className="field"><label className="f">Benefícios (R$)</label><input value={beneficios} onChange={(e) => setBeneficios(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
        </div>
        <div className="row">
          <div className="field"><label className="f">Admissão</label><input type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} /></div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 600, paddingBottom: 11 }}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} style={{ width: 18, height: 18 }} />
              Ativo
            </label>
          </div>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Funcionarios({ funcs, reload }: { funcs: Funcionario[]; reload: () => void }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Funcionario | null>(null);
  const folha = custoFolha(funcs);

  return (
    <>
      <div className="section-title">
        <h2>Equipe</h2>
        <button className="btn" onClick={() => { setEdit(null); setModal(true); }}>+ Novo colaborador</button>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="kbadge tint-blue">👥</div><div className="klabel">Ativos</div><div className="kval" style={{ fontSize: 24 }}>{folha.ativos}</div></div>
        <div className="card kpi"><div className="kbadge tint-cyan">💵</div><div className="klabel">Salários / mês</div><div className="kval" style={{ fontSize: 22 }}>{brl(folha.salarios)}</div></div>
        <div className="card kpi"><div className="kbadge tint-amber">🎁</div><div className="klabel">Custo total folha</div><div className="kval" style={{ fontSize: 22 }}>{brl(folha.total)}</div><div className="ktrend" style={{ color: "var(--muted)" }}>com benefícios</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {funcs.length === 0 ? (
          <div className="empty"><div className="big">👥</div>Nenhum colaborador cadastrado.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Nome</th><th>Cargo</th><th>Departamento</th><th>Admissão</th><th className="num">Salário</th><th className="num">Custo total</th><th></th></tr></thead>
            <tbody>
              {funcs.map((f) => (
                <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
                  <td><b>{f.nome}</b> {!f.ativo && <span className="chip muted">inativo</span>}</td>
                  <td>{f.cargo || "—"}</td>
                  <td>{f.departamento || "—"}</td>
                  <td className="mono">{dataBR(f.admissao)}</td>
                  <td className="num">{brl(f.salario)}</td>
                  <td className="num">{brl(f.salario + f.beneficios)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => { setEdit(f); setModal(true); }}>✏️</button>{" "}
                    <button className="btn ghost sm" onClick={async () => { if (confirm("Remover colaborador?")) { await delFuncionario(f.id); reload(); } }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <FuncModal edit={edit} onClose={() => setModal(false)} onSaved={() => { setModal(false); reload(); }} />}
    </>
  );
}
