"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { ColabPerfil, getColaboradores, convidarColaborador, removerColaborador } from "@/lib/db";
import { supabaseReady } from "@/lib/supabase";
import { SecHead } from "./Kit";

const AREAS_ACESSO = [
  { key: "financas", label: "Finanças" },
  { key: "saude", label: "Saúde do Cliente" },
  { key: "comercial", label: "Comercial" },
  { key: "marketing", label: "Marketing" },
] as const;

const LABEL: Record<string, string> = { financas: "Finanças", saude: "Saúde do Cliente", comercial: "Comercial", marketing: "Marketing" };

export default function Acessos() {
  const [lista, setLista] = useState<ColabPerfil[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [areas, setAreas] = useState<Record<string, boolean>>({ financas: true, saude: false, comercial: false, marketing: false });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  async function recarregar() { setLista(await getColaboradores()); setLoading(false); }
  useEffect(() => { if (supabaseReady) recarregar(); else setLoading(false); }, []);

  async function convidar() {
    setErr(""); setMsg("");
    if (!email.trim() || senha.length < 6) { setErr("Informe e-mail e senha (mín. 6 caracteres)."); return; }
    setSalvando(true);
    const sel = Object.keys(areas).filter((k) => areas[k]);
    const r = await convidarColaborador(nome.trim(), email.trim(), senha, sel);
    setSalvando(false);
    if (r.ok) {
      setMsg(`✅ Acesso criado para ${email.trim()}.`);
      setNome(""); setEmail(""); setSenha("");
      recarregar();
      setTimeout(() => setMsg(""), 4000);
    } else setErr(r.error || "Erro ao criar acesso.");
  }

  if (!supabaseReady) {
    return (
      <>
        <SecHead icon="ShieldCheck" titulo="Equipe & Acessos" sub="Dê acesso ao painel para sua equipe" cor="#8b5cf6" />
        <div className="card"><div className="empty"><div className="big">🔒</div>Disponível na versão com login (online). No modo demonstração não há contas de verdade.</div></div>
      </>
    );
  }

  return (
    <>
      <SecHead icon="ShieldCheck" titulo="Equipe & Acessos" sub="Crie logins para sua equipe e defina o que cada um pode ver" cor="#8b5cf6" />

      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}

      <div className="grid two">
        {/* Convidar */}
        <div className="card">
          <h3><UserPlus size={16} style={{ verticalAlign: "-3px", marginRight: 6, color: "var(--brand)" }} />Dar acesso a um colaborador</h3>
          <div className="field" style={{ marginTop: 12 }}><label className="f">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do colaborador" /></div>
          <div className="row">
            <div className="field"><label className="f">E-mail (login)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" /></div>
            <div className="field"><label className="f">Senha</label><input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 6 caracteres" /></div>
          </div>
          <label className="f" style={{ marginTop: 4 }}>O que ele pode acessar</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {AREAS_ACESSO.map((a) => (
              <button key={a.key} onClick={() => setAreas((s) => ({ ...s, [a.key]: !s[a.key] }))}
                className={`chip ${areas[a.key] ? "cyan" : "muted"}`}
                style={{ cursor: "pointer", border: areas[a.key] ? "1px solid var(--brand)" : "1px solid var(--line)", padding: "8px 13px", fontSize: 13 }}>
                {areas[a.key] ? "✓ " : ""}{a.label}
              </button>
            ))}
          </div>
          <button className="btn" onClick={convidar} disabled={salvando || !email.trim() || senha.length < 6}>{salvando ? "Criando…" : "Criar acesso"}</button>
          <p className="sub" style={{ marginTop: 10 }}>O colaborador entra com esse e-mail e senha e vê só o que você marcar. O Dashboard fica visível para todos.</p>
        </div>

        {/* Lista */}
        <div className="card" style={{ padding: 0 }}>
          <div className="section-title" style={{ padding: "16px 18px 0", margin: 0 }}><h2 style={{ fontSize: 16 }}>👥 Quem tem acesso</h2></div>
          {loading ? <div className="spin" /> : lista.length === 0 ? <div className="empty">Ninguém ainda.</div> : (
            <table className="table" style={{ marginTop: 8 }}>
              <thead><tr><th>Pessoa</th><th>Acesso</th><th></th></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.nome || c.email}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{c.email}</div></td>
                    <td>
                      {c.papel === "dono"
                        ? <span className="chip cyan"><ShieldCheck size={12} /> Dono (tudo)</span>
                        : (c.areas && c.areas.length ? c.areas.map((a) => <span key={a} className="chip muted" style={{ marginRight: 4 }}>{LABEL[a] || a}</span>) : <span className="chip muted">Só Dashboard</span>)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {c.papel !== "dono" && <button className="btn ghost sm" onClick={async () => { if (confirm(`Remover acesso de ${c.nome || c.email}?`)) { await removerColaborador(c.id); recarregar(); } }}><Trash2 size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
