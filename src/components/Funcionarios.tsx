"use client";
import { useState } from "react";
import { Funcionario, addFuncionario, updateFuncionario, delFuncionario } from "@/lib/db";
import { custoFolha } from "@/lib/calc";
import { brl, dataBR, hoje } from "@/lib/format";

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

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

      {funcs.length === 0 ? (
        <div className="card"><div className="empty"><div className="big">👥</div>Nenhum colaborador cadastrado.</div></div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {funcs.map((f) => (
            <div key={f.id} className="card" style={{ padding: 16, opacity: f.ativo ? 1 : 0.55 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "var(--accent)22", color: "var(--accent)", fontWeight: 800, fontSize: 16 }}>{iniciais(f.nome)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 15 }}>{f.nome}</b>
                    <span className="chip" style={{ background: f.ativo ? "rgba(16,185,129,.12)" : "rgba(113,113,122,.18)", color: f.ativo ? "#10B981" : "var(--muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", padding: "2px 8px", borderRadius: 99 }}>{f.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                  {f.cargo && <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "var(--accent)14", color: "var(--accent)" }}>{f.cargo}</span>}
                </div>
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 5, fontSize: 12.5 }}>
                {f.departamento && <div className="sub">🏢 {f.departamento}</div>}
                <div className="sub">📅 Admissão {dataBR(f.admissao)}</div>
                <div className="sub">💵 Salário <b style={{ color: "var(--txt)" }}>{brl(f.salario)}</b>{f.beneficios ? ` · Custo total ${brl(f.salario + f.beneficios)}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <button className="btn ghost sm" onClick={() => { setEdit(f); setModal(true); }}>✏️ Editar</button>
                <button className="btn ghost sm" onClick={async () => { if (confirm("Remover colaborador?")) { await delFuncionario(f.id); reload(); } }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <FuncModal edit={edit} onClose={() => setModal(false)} onSaved={() => { setModal(false); reload(); }} />}
    </>
  );
}
