"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Building2, Users, Ban, RotateCcw, Trash2, LogOut, RefreshCw, Plus, X, DollarSign } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { dataBR, brl } from "@/lib/format";

type Empresa = {
  id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number;
  dono_id: string | null; dono: { id: string; nome: string | null; email: string | null } | null;
  acessoCortado: boolean; plano: string | null; valor: number; slug: string | null; cnpj: string | null;
  nLanc: number; nCli: number; nFunc: number;
};
type Resp = { empresas: Empresa[]; totais: { empresas: number; usuarios: number; faturamento: number; ativos: number } };
type Form = { nomeEmpresa: string; responsavel: string; email: string; senha: string; cnpj: string; qtdSuperadmins: string; qtdAcessos: string; logo: string; slug: string };

const PRECO_SUPERADMIN = 79.9; // R$ por administrador da empresa
const PRECO_ACESSO = 39.9;     // R$ por acesso (funcionário)
type Estado = "carregando" | "semlogin" | "negado" | "ok" | "erro";

export default function Admin() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const carregar = useCallback(async () => {
    if (!supabaseReady || !supabase) { setEstado("semlogin"); return; }
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setEstado("semlogin"); return; }
    const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { setEstado("negado"); return; }
    if (!res.ok) { setEstado("erro"); return; }
    setData(await res.json()); setEstado("ok");
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function acao(action: string, body: Record<string, string>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    if (!supabase) return;
    setBusy(JSON.stringify(body));
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
      body: JSON.stringify({ action, ...body }),
    });
    setBusy(null);
    await carregar();
  }

  function abrirCadastro() {
    setErroForm("");
    setForm({ nomeEmpresa: "", responsavel: "", email: "", senha: "", cnpj: "", qtdSuperadmins: "1", qtdAcessos: "0", logo: "", slug: "" });
  }
  function onLogo(file: File) {
    const r = new FileReader();
    r.onload = () => setForm((f) => (f ? { ...f, logo: String(r.result) } : f));
    r.readAsDataURL(file);
  }
  async function criarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !supabase) return;
    setSalvando(true); setErroForm("");
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
      body: JSON.stringify({ action: "criar", ...form }),
    });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErroForm(j.error || "Não consegui cadastrar."); return; }
    setForm(null);
    await carregar();
  }

  async function entrarComOutra() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  if (estado === "carregando") return <Casca><div className="spin" /></Casca>;
  if (estado === "semlogin") return <Casca><Aviso titulo="Faça login" texto="Entre com a conta de Super Admin para acessar o painel." botao={() => router.push("/login")} botaoTxt="Ir para o login" /></Casca>;
  if (estado === "negado") return <Casca><Aviso titulo="Acesso restrito 🔒" texto="Você está logado, mas esta área é só para Super Admin. Entre com a conta de Super Admin." botao={entrarComOutra} botaoTxt="Entrar com outra conta" botao2={() => router.push("/")} botao2Txt="Voltar ao painel" /></Casca>;
  if (estado === "erro") return <Casca><Aviso titulo="Ops" texto="Não consegui carregar. Tente novamente em instantes." botao={carregar} botaoTxt="Tentar de novo" botao2={entrarComOutra} botao2Txt="Entrar com outra conta" /></Casca>;

  const t = data?.totais;
  return (
    <Casca>
      <div className="adm-head">
        <div>
          <div className="adm-eyebrow"><ShieldCheck size={15} /> Painel Super Admin</div>
          <h1>Minhas Métricas — Empresas</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="adm-btn" onClick={abrirCadastro}><Plus size={15} /> Cadastrar cliente</button>
          <button className="adm-btn ghost" onClick={carregar}><RefreshCw size={15} /> Atualizar</button>
          <button className="adm-btn ghost" onClick={() => router.push("/")}><LogOut size={15} /> Sair</button>
        </div>
      </div>

      <div className="adm-kpis">
        <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(16,185,129,.16)", color: "#10B981" }}><DollarSign size={20} /></span><div><b>{brl(t?.faturamento ?? 0)}</b><small>Faturamento (planos)</small></div></div>
        <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><Building2 size={20} /></span><div><b>{t?.empresas ?? 0}</b><small>Clientes</small></div></div>
        <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(139,92,246,.16)", color: "#8b5cf6" }}><Users size={20} /></span><div><b>{t?.ativos ?? 0}</b><small>Acessos ativos</small></div></div>
        <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(239,68,68,.16)", color: "#EF4444" }}><Ban size={20} /></span><div><b>{data?.empresas.filter((e) => e.acessoCortado).length ?? 0}</b><small>Cortados</small></div></div>
      </div>

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead><tr><th>Empresa</th><th>Dono</th><th>Plano</th><th>Criada</th><th className="num">Lanç.</th><th className="num">Clientes</th><th className="num">Equipe</th><th>Acesso</th><th>Ações</th></tr></thead>
          <tbody>
            {data?.empresas.map((e) => (
              <tr key={e.id}>
                <td><b>{e.nome}</b>{e.slug ? <div className="adm-sub"><a href={`/${e.slug}`} target="_blank" rel="noopener" style={{ color: "#1AADE2" }}>/{e.slug}</a></div> : (e.segmento && <div className="adm-sub">{e.segmento}</div>)}</td>
                <td>{e.dono ? <><div>{e.dono.nome || "—"}</div><div className="adm-sub">{e.dono.email}</div></> : <span className="adm-sub">—</span>}</td>
                <td>{e.plano ? <><div>{e.plano}</div>{e.valor > 0 && <div className="adm-sub">{brl(e.valor)}</div>}</> : <span className="adm-sub">—</span>}</td>
                <td className="adm-sub">{dataBR(e.criado_em)}</td>
                <td className="num">{e.nLanc}</td>
                <td className="num">{e.nCli}</td>
                <td className="num">{e.nFunc}</td>
                <td>{e.acessoCortado ? <span className="adm-badge cortado">Cortado</span> : <span className="adm-badge ativo">Ativo</span>}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {e.dono_id && (e.acessoCortado
                      ? <button className="adm-btn sm ghost" disabled={!!busy} onClick={() => acao("restaurar", { userId: e.dono_id! })}><RotateCcw size={13} /> Restaurar</button>
                      : <button className="adm-btn sm warn" disabled={!!busy} onClick={() => acao("cortar", { userId: e.dono_id! }, `Cortar o acesso de "${e.nome}"? O dono não conseguirá entrar até você restaurar.`)}><Ban size={13} /> Cortar</button>)}
                    <button className="adm-btn sm danger" disabled={!!busy} onClick={() => acao("excluir", { empresaId: e.id }, `EXCLUIR a empresa "${e.nome}" e TODOS os dados dela? Isso não pode ser desfeito.`)}><Trash2 size={13} /> Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {!data?.empresas.length && <tr><td colSpan={9} className="adm-sub" style={{ textAlign: "center", padding: 30 }}>Nenhuma empresa cadastrada ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="adm-modalbg" onClick={() => !salvando && setForm(null)}>
          <form className="adm-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={criarCliente}>
            <div className="adm-mhead"><h3>Cadastrar novo cliente</h3><button type="button" onClick={() => setForm(null)}><X size={18} /></button></div>
            {erroForm && <div className="adm-erro">{erroForm}</div>}
            <div className="adm-grid2">
              <L label="Nome da empresa"><input value={form.nomeEmpresa} onChange={(ev) => setForm({ ...form, nomeEmpresa: ev.target.value })} required /></L>
              <L label="CNPJ (opcional)"><input value={form.cnpj} onChange={(ev) => setForm({ ...form, cnpj: ev.target.value })} /></L>
              <L label="Responsável"><input value={form.responsavel} onChange={(ev) => setForm({ ...form, responsavel: ev.target.value })} /></L>
              <L label="E-mail do responsável"><input type="email" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} required /></L>
              <L label="Senha de acesso"><input type="text" value={form.senha} onChange={(ev) => setForm({ ...form, senha: ev.target.value })} required minLength={6} placeholder="mín. 6 caracteres" /></L>
              <L label="Nº de Super Admins (administradores)"><input type="number" min="1" value={form.qtdSuperadmins} onChange={(ev) => setForm({ ...form, qtdSuperadmins: ev.target.value })} /></L>
              <L label="Nº de Acessos (funcionários)"><input type="number" min="0" value={form.qtdAcessos} onChange={(ev) => setForm({ ...form, qtdAcessos: ev.target.value })} /></L>
              <L label="Endereço da página (slug)"><input value={form.slug} onChange={(ev) => setForm({ ...form, slug: ev.target.value })} placeholder="auto pelo nome" /></L>
            </div>
            <div className="adm-valor">Plano: <b>{brl((Number(form.qtdSuperadmins) || 0) * PRECO_SUPERADMIN + (Number(form.qtdAcessos) || 0) * PRECO_ACESSO)}/mês</b> <span>(Super Admin R$ {PRECO_SUPERADMIN.toFixed(2).replace(".", ",")} · Acesso R$ {PRECO_ACESSO.toFixed(2).replace(".", ",")} cada)</span></div>
            <L label="Logo da empresa"><input type="file" accept="image/*" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) onLogo(f); }} /></L>
            {form.logo && <img src={form.logo} alt="" style={{ maxHeight: 48, marginTop: 8, objectFit: "contain" }} />}
            <button className="adm-btn" type="submit" disabled={salvando} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{salvando ? "Cadastrando…" : "Cadastrar cliente"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>O responsável é o 1º <b>Super Admin</b>. Os <b>Acessos</b> (funcionários) são adicionados depois em “Acessos”, com permissões por área. Cria também a página <b>minhasmetricas.com/{form.slug || "(nome)"}</b>.</p>
          </form>
        </div>
      )}
    </Casca>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="adm-f"><span>{label}</span>{children}</label>;
}

function Casca({ children }: { children: React.ReactNode }) {
  return <div className="adm"><style>{CSS}</style><div className="adm-wrap">{children}</div></div>;
}
function Aviso({ titulo, texto, botao, botaoTxt, botao2, botao2Txt }: { titulo: string; texto: string; botao: () => void; botaoTxt: string; botao2?: () => void; botao2Txt?: string }) {
  return (
    <div className="adm-aviso">
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="adm-btn" onClick={botao}>{botaoTxt}</button>
        {botao2 && <button className="adm-btn ghost" onClick={botao2}>{botao2Txt}</button>}
      </div>
    </div>
  );
}

const CSS = `
.adm{min-height:100vh;background:#0A0A0A;color:#f4f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.adm-wrap{max-width:1140px;margin:0 auto;padding:28px 22px 60px}
.adm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.adm-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#1AADE2;font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:12px}
.adm-head h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-top:6px}
.adm-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.adm-card{background:#121212;border:1px solid #222;border-radius:16px;padding:18px;display:flex;align-items:center;gap:14px}
.adm-ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.adm-card b{font-size:26px;font-weight:800;display:block;line-height:1}
.adm-card small{color:#9aa0a6;font-size:13px}
.adm-tablewrap{background:#121212;border:1px solid #222;border-radius:16px;overflow-x:auto}
.adm-table{width:100%;border-collapse:collapse;font-size:14px;min-width:840px}
.adm-table th{color:#9aa0a6;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:14px 14px;border-bottom:1px solid #222;font-weight:700}
.adm-table td{padding:13px 14px;border-bottom:1px solid #1d1d1d;vertical-align:middle}
.adm-table tr:last-child td{border-bottom:0}
.adm-table .num{text-align:right}
.adm-sub{color:#9aa0a6;font-size:12.5px}
.adm-badge{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
.adm-badge.ativo{color:#10B981;border-color:#10B98155;background:#10B9811a}
.adm-badge.cortado{color:#EF4444;border-color:#EF444455;background:#EF44441a}
.adm-btn{display:inline-flex;align-items:center;gap:7px;background:#1AADE2;color:#06222e;border:0;border-radius:99px;padding:10px 16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit}
.adm-btn:hover{filter:brightness(1.08)}
.adm-btn:disabled{opacity:.5;cursor:default}
.adm-btn.sm{padding:6px 11px;font-size:12.5px;font-weight:700}
.adm-btn.ghost{background:#161616;border:1px solid #333;color:#f4f5f7}
.adm-btn.ghost:hover{border-color:#1AADE2;filter:none}
.adm-btn.warn{background:#2a1d10;border:1px solid #6b4e1f;color:#F59E0B}
.adm-btn.danger{background:#2a1212;border:1px solid #6b1f1f;color:#EF4444}
.adm-aviso{background:#121212;border:1px solid #222;border-radius:16px;padding:40px;text-align:center;max-width:460px;margin:60px auto}
.adm-aviso h2{font-size:24px;font-weight:800;margin-bottom:10px}
.adm-aviso p{color:#9aa0a6;line-height:1.6;margin-bottom:22px}
.spin{width:34px;height:34px;border:3px solid #222;border-top-color:#1AADE2;border-radius:50%;animation:admspin .8s linear infinite;margin:80px auto}
@keyframes admspin{to{transform:rotate(360deg)}}
.adm-modalbg{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;z-index:60}
.adm-modal{background:#121212;border:1px solid #2a2a2a;border-radius:18px;padding:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto}
.adm-mhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.adm-mhead h3{font-size:18px;font-weight:800}
.adm-mhead button{background:none;border:0;color:#9aa0a6;cursor:pointer}
.adm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.adm-f{display:flex;flex-direction:column;gap:5px;margin-top:10px}
.adm-f span{font-size:12.5px;color:#9aa0a6;font-weight:600}
.adm-f input{background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit}
.adm-f input:focus{outline:0;border-color:#1AADE2}
.adm-erro{background:#2a1212;border:1px solid #6b1f1f;color:#EF4444;border-radius:10px;padding:10px 12px;font-size:13.5px;margin-bottom:6px}
.adm-valor{margin-top:14px;background:#0f1a14;border:1px solid #1f3a2c;color:#10B981;border-radius:10px;padding:11px 14px;font-size:15px;font-weight:700}
.adm-valor span{color:#9aa0a6;font-size:12px;font-weight:500}
@media(max-width:760px){.adm-kpis{grid-template-columns:repeat(2,1fr)}.adm-grid2{grid-template-columns:1fr}}
`;
