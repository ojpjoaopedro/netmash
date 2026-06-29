"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Building2, Users, Ban, RotateCcw, Trash2, LogOut, RefreshCw, Plus, X, DollarSign,
  LayoutDashboard, KeyRound, Settings, Crown, User, Pencil, Sun, Moon,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { dataBR, brl } from "@/lib/format";
import { useBrand } from "@/lib/brand";

type Empresa = {
  id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number;
  dono_id: string | null; dono: { id: string; nome: string | null; email: string | null } | null;
  acessoCortado: boolean; plano: string | null; valor: number; slug: string | null; cnpj: string | null;
  nLanc: number; nCli: number; nFunc: number;
};
type Resp = { empresas: Empresa[]; totais: { empresas: number; usuarios: number; faturamento: number; ativos: number }; precos?: { superadmin: number; acesso: number } };
type Form = { editId: string | null; nomeEmpresa: string; responsavel: string; email: string; senha: string; cnpj: string; segmento: string; saldoInicial: string; qtdSuperadmins: string; qtdAcessos: string; logo: string; slug: string };

function seatsDePlano(plano: string | null): { qs: number; qa: number } {
  const m = (plano || "").match(/(\d+)\s*Super Admin.*?(\d+)\s*Acesso/i);
  return { qs: m ? Number(m[1]) : 1, qa: m ? Number(m[2]) : 0 };
}
function mascaraCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}
type Aba = "visao" | "empresas" | "permissoes" | "config";

const PRECO_SUPERADMIN = 79.9; // R$ por administrador da empresa
const PRECO_ACESSO = 39.9;     // R$ por acesso (funcionário)
const AREAS = [{ k: "financas", l: "Finanças" }, { k: "saude", l: "Saúde do Cliente" }, { k: "comercial", l: "Comercial" }, { k: "marketing", l: "Marketing" }];
type Acesso = { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null };
type NovoCliente = { nomeEmpresa: string; cnpj: string; responsavel: string; emailResp: string; funcionarios: { nome: string; email: string }[] };

export default function Admin() {
  const router = useRouter();
  const { theme, toggleTheme } = useBrand();
  const [estado, setEstado] = useState<"carregando" | "semlogin" | "negado" | "ok" | "erro">("carregando");
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aba, setAba] = useState<Aba>("visao");
  const [permEmpresa, setPermEmpresa] = useState("");
  const [acessos, setAcessos] = useState<Acesso[] | null>(null);
  const [novoAcesso, setNovoAcesso] = useState<{ nome: string; email: string; senha: string; areas: string[] }>({ nome: "", email: "", senha: "", areas: [] });
  const [salvAcesso, setSalvAcesso] = useState(false);
  const [erroAcesso, setErroAcesso] = useState("");
  const [precoForm, setPrecoForm] = useState<{ sa: string; ac: string } | null>(null);
  const [salvPreco, setSalvPreco] = useState(false);
  const [novo, setNovo] = useState<NovoCliente | null>(null);
  const [salvNovo, setSalvNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState("");

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
  useEffect(() => { if (data?.precos) setPrecoForm({ sa: String(data.precos.superadmin), ac: String(data.precos.acesso) }); }, [data]);

  async function acao(action: string, body: Record<string, string>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    if (!supabase) return;
    setBusy(JSON.stringify(body));
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action, ...body }) });
    setBusy(null);
    await carregar();
  }
  function abrirCadastro() { setErroNovo(""); setNovo({ nomeEmpresa: "", cnpj: "", responsavel: "", emailResp: "", funcionarios: [] }); }
  function addFunc() { setNovo((n) => (n ? { ...n, funcionarios: [...n.funcionarios, { nome: "", email: "" }] } : n)); }
  function setFunc(i: number, campo: "nome" | "email", v: string) { setNovo((n) => { if (!n) return n; const fs = n.funcionarios.slice(); fs[i] = { ...fs[i], [campo]: v }; return { ...n, funcionarios: fs }; }); }
  function rmFunc(i: number) { setNovo((n) => (n ? { ...n, funcionarios: n.funcionarios.filter((_, k) => k !== i) } : n)); }
  async function criarNovo(e: React.FormEvent) {
    e.preventDefault();
    if (!novo || !supabase) return;
    if (!novo.nomeEmpresa.trim() || !novo.emailResp.includes("@")) { setErroNovo("Informe o nome da empresa e o e-mail do responsável."); return; }
    setSalvNovo(true); setErroNovo("");
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "criar", nomeEmpresa: novo.nomeEmpresa, cnpj: novo.cnpj, responsavel: novo.responsavel, emailResp: novo.emailResp, funcionarios: novo.funcionarios }) });
    const j = await res.json().catch(() => ({}));
    setSalvNovo(false);
    if (!res.ok) { setErroNovo(j.error || "Não consegui cadastrar."); return; }
    setNovo(null); setAba("empresas"); await carregar();
  }
  function abrirEdicao(e: Empresa) {
    setErroForm("");
    const { qs, qa } = seatsDePlano(e.plano);
    setForm({ editId: e.id, nomeEmpresa: e.nome, responsavel: e.dono?.nome || "", email: e.dono?.email || "", senha: "", cnpj: e.cnpj || "", segmento: e.segmento || "", saldoInicial: String(e.saldo_inicial ?? 0), qtdSuperadmins: String(qs), qtdAcessos: String(qa), logo: "", slug: e.slug || "" });
  }
  function onLogo(file: File) { const r = new FileReader(); r.onload = () => setForm((f) => (f ? { ...f, logo: String(r.result) } : f)); r.readAsDataURL(file); }
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !supabase) return;
    setSalvando(true); setErroForm("");
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: form.editId ? "editar" : "criar", empresaId: form.editId || undefined, ...form }) });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErroForm(j.error || "Não consegui salvar."); return; }
    const novo = !form.editId;
    setForm(null); if (novo) setAba("empresas"); await carregar();
  }
  async function entrarComOutra() { if (supabase) await supabase.auth.signOut(); router.push("/login"); }

  async function tokenH() { const { data: sess } = await supabase!.auth.getSession(); return { Authorization: `Bearer ${sess.session?.access_token}` }; }
  async function selecionarEmpresa(id: string) {
    setPermEmpresa(id); setErroAcesso(""); setNovoAcesso({ nome: "", email: "", senha: "", areas: [] }); setAcessos(null);
    if (!id || !supabase) return;
    const res = await fetch(`/api/admin?empresaId=${id}`, { headers: await tokenH() });
    setAcessos(res.ok ? (await res.json()).acessos : []);
  }
  async function criarAcesso() {
    if (!supabase || !permEmpresa) return;
    if (!novoAcesso.email || novoAcesso.senha.length < 6) { setErroAcesso("Informe e-mail e senha (mín. 6)."); return; }
    setSalvAcesso(true); setErroAcesso("");
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-criar", empresaId: permEmpresa, ...novoAcesso }) });
    const j = await res.json().catch(() => ({}));
    setSalvAcesso(false);
    if (!res.ok) { setErroAcesso(j.error || "Não consegui criar."); return; }
    await selecionarEmpresa(permEmpresa);
  }
  async function removerAcesso(userId: string) {
    if (!supabase || !window.confirm("Remover este acesso?")) return;
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-remover", userId }) });
    await selecionarEmpresa(permEmpresa);
  }
  function toggleArea(k: string) {
    setNovoAcesso((n) => ({ ...n, areas: n.areas.includes(k) ? n.areas.filter((x) => x !== k) : [...n.areas, k] }));
  }
  async function salvarPrecos() {
    if (!precoForm || !supabase) return;
    setSalvPreco(true);
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "config-precos", precoSuperadmin: Number(precoForm.sa), precoAcesso: Number(precoForm.ac) }) });
    setSalvPreco(false);
    await carregar();
  }

  if (estado === "carregando") return <Casca><div className="spin" /></Casca>;
  if (estado === "semlogin") return <Casca><Aviso titulo="Faça login" texto="Entre com a conta de Super Admin para acessar o painel." botao={() => router.push("/login")} botaoTxt="Ir para o login" /></Casca>;
  if (estado === "negado") return <Casca><Aviso titulo="Acesso restrito 🔒" texto="Você está logado, mas esta área é só para Super Admin. Entre com a conta de Super Admin." botao={entrarComOutra} botaoTxt="Entrar com outra conta" botao2={() => router.push("/")} botao2Txt="Voltar ao painel" /></Casca>;
  if (estado === "erro") return <Casca><Aviso titulo="Ops" texto="Não consegui carregar. Tente novamente em instantes." botao={carregar} botaoTxt="Tentar de novo" botao2={entrarComOutra} botao2Txt="Entrar com outra conta" /></Casca>;

  const t = data?.totais;
  const precos = data?.precos ?? { superadmin: PRECO_SUPERADMIN, acesso: PRECO_ACESSO };
  const NAV: { k: Aba; label: string; Icon: typeof Building2 }[] = [
    { k: "visao", label: "Visão geral", Icon: LayoutDashboard },
    { k: "empresas", label: "Empresas", Icon: Building2 },
    { k: "permissoes", label: "Equipe & Acessos", Icon: KeyRound },
    { k: "config", label: "Configurações", Icon: Settings },
  ];

  return (
    <div className="adm">
      <style>{CSS}</style>
      <div className="adm-shell">
        <aside className="adm-side">
          <div className="adm-brand"><ShieldCheck size={18} /> Super Admin</div>
          <nav className="adm-nav">
            {NAV.map(({ k, label, Icon }) => (
              <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}><Icon size={18} /> {label}</button>
            ))}
          </nav>
          <div className="adm-side-foot">
            <button onClick={toggleTheme}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}</button>
            <button onClick={() => router.push("/")}><LayoutDashboard size={15} /> Meu painel</button>
            <button onClick={carregar}><RefreshCw size={15} /> Atualizar</button>
            <button onClick={entrarComOutra}><LogOut size={15} /> Sair</button>
          </div>
        </aside>

        <main className="adm-main">
          <div className="adm-eyebrow"><ShieldCheck size={15} /> Painel Super Admin · Minhas Métricas</div>

          {aba === "visao" && (
            <>
              <h1>Visão geral do negócio</h1>
              <div className="adm-kpis" style={{ marginTop: 18 }}>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(16,185,129,.16)", color: "#10B981" }}><DollarSign size={20} /></span><div><b>{brl(t?.faturamento ?? 0)}</b><small>Faturamento (planos)</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><Building2 size={20} /></span><div><b>{t?.empresas ?? 0}</b><small>Clientes</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(139,92,246,.16)", color: "#8b5cf6" }}><Users size={20} /></span><div><b>{t?.ativos ?? 0}</b><small>Acessos ativos</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(239,68,68,.16)", color: "#EF4444" }}><Ban size={20} /></span><div><b>{data?.empresas.filter((e) => e.acessoCortado).length ?? 0}</b><small>Cortados</small></div></div>
              </div>
              <h3 className="adm-h3">Últimos clientes</h3>
              <div className="adm-tablewrap">
                <table className="adm-table">
                  <thead><tr><th>Empresa</th><th>Dono</th><th>Plano</th><th>Criada</th></tr></thead>
                  <tbody>
                    {data?.empresas.slice(0, 6).map((e) => (
                      <tr key={e.id}><td><b>{e.nome}</b></td><td className="adm-sub">{e.dono?.email || "—"}</td><td>{e.plano || "—"}</td><td className="adm-sub">{dataBR(e.criado_em)}</td></tr>
                    ))}
                    {!data?.empresas.length && <tr><td colSpan={4} className="adm-sub" style={{ textAlign: "center", padding: 26 }}>Nenhuma empresa ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === "empresas" && (
            <>
              <div className="adm-headrow">
                <h1>Empresas <span className="adm-sub">({t?.empresas ?? 0})</span></h1>
                <button className="adm-btn" onClick={abrirCadastro}><Plus size={15} /> Cadastrar cliente</button>
              </div>
              <div className="adm-tablewrap" style={{ marginTop: 16 }}>
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
                            <button className="adm-btn sm ghost" onClick={() => abrirEdicao(e)}><Pencil size={13} /> Editar</button>
                            {e.dono_id && (e.acessoCortado
                              ? <button className="adm-btn sm ghost" disabled={!!busy} onClick={() => acao("restaurar", { userId: e.dono_id! })}><RotateCcw size={13} /> Restaurar</button>
                              : <button className="adm-btn sm warn" disabled={!!busy} onClick={() => acao("cortar", { userId: e.dono_id! }, `Cortar o acesso de "${e.nome}"?`)}><Ban size={13} /> Cortar</button>)}
                            <button className="adm-btn sm danger" disabled={!!busy} onClick={() => acao("excluir", { empresaId: e.id }, `EXCLUIR a empresa "${e.nome}" e TODOS os dados? Não pode ser desfeito.`)}><Trash2 size={13} /> Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!data?.empresas.length && <tr><td colSpan={9} className="adm-sub" style={{ textAlign: "center", padding: 30 }}>Nenhuma empresa cadastrada ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === "permissoes" && (
            <>
              <h1>Equipe & Acessos</h1>
              <p className="adm-sub" style={{ marginTop: 6, maxWidth: 640 }}>Como administrador geral, escolha a empresa e crie os logins da equipe, definindo o que cada um pode ver. O Dashboard fica visível para todos.</p>
              <L label="Empresa">
                <select className="adm-sel" value={permEmpresa} onChange={(ev) => selecionarEmpresa(ev.target.value)}>
                  <option value="">— escolha a empresa —</option>
                  {data?.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}{e.dono?.email ? ` (${e.dono.email})` : ""}</option>)}
                </select>
              </L>

              {permEmpresa && (
                <div className="adm-acgrid">
                  <div className="adm-acbox">
                    <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 15.5, fontWeight: 700 }}>Dar acesso a um colaborador</h3>
                    {erroAcesso && <div className="adm-erro">{erroAcesso}</div>}
                    <L label="Nome"><input value={novoAcesso.nome} onChange={(ev) => setNovoAcesso({ ...novoAcesso, nome: ev.target.value })} placeholder="Nome do colaborador" /></L>
                    <div className="adm-grid2">
                      <L label="E-mail (login)"><input type="email" value={novoAcesso.email} onChange={(ev) => setNovoAcesso({ ...novoAcesso, email: ev.target.value })} placeholder="email@empresa.com" /></L>
                      <L label="Senha"><input type="text" value={novoAcesso.senha} onChange={(ev) => setNovoAcesso({ ...novoAcesso, senha: ev.target.value })} placeholder="mín. 6 caracteres" /></L>
                    </div>
                    <div className="adm-f"><span>O que ele pode acessar</span>
                      <div className="adm-areas">
                        {AREAS.map((a) => <button type="button" key={a.k} className={"adm-area" + (novoAcesso.areas.includes(a.k) ? " on" : "")} onClick={() => toggleArea(a.k)}>{novoAcesso.areas.includes(a.k) ? "✓ " : ""}{a.l}</button>)}
                      </div>
                    </div>
                    <button className="adm-btn" style={{ marginTop: 14 }} disabled={salvAcesso} onClick={criarAcesso}>{salvAcesso ? "Criando…" : "Criar acesso"}</button>
                    <p className="adm-sub" style={{ marginTop: 10 }}>O colaborador entra com esse e-mail e senha e vê só o que você marcar. O Dashboard fica visível para todos.</p>
                  </div>

                  <div className="adm-acbox">
                    <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 15.5, fontWeight: 700 }}>Quem tem acesso</h3>
                    {acessos === null ? <p className="adm-sub">Carregando…</p> : acessos.length === 0 ? <p className="adm-sub">Ninguém ainda.</p> : acessos.map((p) => (
                      <div key={p.id} className="adm-acrow">
                        <div><b>{p.nome || "—"}</b><div className="adm-sub">{p.email}</div></div>
                        {p.papel === "dono"
                          ? <span className="adm-badge ativo">Dono (tudo)</span>
                          : <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="adm-sub">{p.areas && p.areas.length ? p.areas.map((k) => AREAS.find((a) => a.k === k)?.l || k).join(", ") : "só dashboard"}</span><button className="adm-btn sm danger" onClick={() => removerAcesso(p.id)}><Trash2 size={13} /></button></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="adm-h3">Níveis do sistema</h3>
              <div className="adm-perms">
                <div className="adm-perm"><span className="adm-pico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><ShieldCheck size={20} /></span><div><b>Super Admin (Minhas Métricas)</b><p>Você — administrador geral. Gerencia todas as empresas e os acessos aqui.</p></div></div>
                <div className="adm-perm"><span className="adm-pico" style={{ background: "rgba(245,158,11,.16)", color: "#F59E0B" }}><Crown size={20} /></span><div><b>Super Admin da empresa (responsável)</b><p>Administra a própria empresa.</p></div></div>
                <div className="adm-perm"><span className="adm-pico" style={{ background: "rgba(139,92,246,.16)", color: "#8b5cf6" }}><User size={20} /></span><div><b>Admin / Acesso (funcionário)</b><p>Vê só as áreas liberadas acima.</p></div></div>
              </div>
            </>
          )}

          {aba === "config" && (
            <>
              <h1>Configurações</h1>
              <h3 className="adm-h3">Preços do plano (por assento / mês)</h3>
              <div className="adm-grid2" style={{ maxWidth: 520 }}>
                <L label="Por Super Admin (R$)"><input type="number" step="0.01" value={precoForm?.sa ?? ""} onChange={(ev) => setPrecoForm({ sa: ev.target.value, ac: precoForm?.ac ?? "" })} /></L>
                <L label="Por Acesso / funcionário (R$)"><input type="number" step="0.01" value={precoForm?.ac ?? ""} onChange={(ev) => setPrecoForm({ sa: precoForm?.sa ?? "", ac: ev.target.value })} /></L>
              </div>
              <button className="adm-btn" style={{ marginTop: 16 }} disabled={salvPreco} onClick={salvarPrecos}>{salvPreco ? "Salvando…" : "Salvar preços"}</button>
              <p className="adm-sub" style={{ marginTop: 12, maxWidth: 560 }}>Esses preços são usados no cálculo automático do plano ao cadastrar ou editar um cliente.</p>
            </>
          )}
        </main>
      </div>

      {form && (
        <div className="adm-modalbg" onClick={() => !salvando && setForm(null)}>
          <form className="adm-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={salvar}>
            <div className="adm-mhead"><h3>{form.editId ? "Editar empresa" : "Cadastrar novo cliente"}</h3><button type="button" onClick={() => setForm(null)}><X size={18} /></button></div>
            {erroForm && <div className="adm-erro">{erroForm}</div>}
            <div className="adm-grid2">
              <L label="Nome da empresa"><input value={form.nomeEmpresa} onChange={(ev) => setForm({ ...form, nomeEmpresa: ev.target.value })} required /></L>
              <L label="CNPJ (opcional)"><input value={form.cnpj} onChange={(ev) => setForm({ ...form, cnpj: mascaraCnpj(ev.target.value) })} placeholder="00.000.000/0000-00" inputMode="numeric" /></L>
              <L label="Segmento (opcional)"><input value={form.segmento} onChange={(ev) => setForm({ ...form, segmento: ev.target.value })} placeholder="Ex: Comércio" /></L>
              <L label="Saldo inicial em caixa (R$)"><input type="number" step="0.01" value={form.saldoInicial} onChange={(ev) => setForm({ ...form, saldoInicial: ev.target.value })} /></L>
              <L label="Responsável"><input value={form.responsavel} onChange={(ev) => setForm({ ...form, responsavel: ev.target.value })} /></L>
              <L label="E-mail do responsável"><input type="email" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} required /></L>
              <L label={form.editId ? "Nova senha (em branco = manter)" : "Senha de acesso"}><input type="text" value={form.senha} onChange={(ev) => setForm({ ...form, senha: ev.target.value })} required={!form.editId} minLength={6} placeholder={form.editId ? "deixe em branco p/ manter" : "mín. 6 caracteres"} /></L>
              <L label="Nº de Super Admins (administradores)"><input type="number" min="1" value={form.qtdSuperadmins} onChange={(ev) => setForm({ ...form, qtdSuperadmins: ev.target.value })} /></L>
              <L label="Nº de Acessos (funcionários)"><input type="number" min="0" value={form.qtdAcessos} onChange={(ev) => setForm({ ...form, qtdAcessos: ev.target.value })} /></L>
              <L label="Endereço da página (slug)"><input value={form.slug} onChange={(ev) => setForm({ ...form, slug: ev.target.value })} placeholder="auto pelo nome" /></L>
            </div>
            <div className="adm-valor">Plano: <b>{brl((Number(form.qtdSuperadmins) || 0) * precos.superadmin + (Number(form.qtdAcessos) || 0) * precos.acesso)}/mês</b> <span>(Super Admin R$ {precos.superadmin.toFixed(2).replace(".", ",")} · Acesso R$ {precos.acesso.toFixed(2).replace(".", ",")} cada)</span></div>
            <L label={form.editId ? "Logo (envie só p/ trocar)" : "Logo da empresa"}><input type="file" accept="image/*" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) onLogo(f); }} /></L>
            {form.logo && <img src={form.logo} alt="" style={{ maxHeight: 48, marginTop: 8, objectFit: "contain" }} />}
            <button className="adm-btn" type="submit" disabled={salvando} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{salvando ? "Salvando…" : form.editId ? "Salvar alterações" : "Cadastrar cliente"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>{form.editId ? <>Página em <b>minhasmetricas.com/{form.slug || "(nome)"}</b>. As permissões dos funcionários são editadas dentro da empresa, em “Acessos”.</> : <>O responsável é o 1º <b>Super Admin</b>. Os <b>Acessos</b> são adicionados depois em “Acessos”. Cria também a página <b>minhasmetricas.com/{form.slug || "(nome)"}</b>.</>}</p>
          </form>
        </div>
      )}

      {novo && (
        <div className="adm-modalbg" onClick={() => !salvNovo && setNovo(null)}>
          <form className="adm-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={criarNovo}>
            <div className="adm-mhead"><h3>Cadastrar novo cliente</h3><button type="button" onClick={() => setNovo(null)}><X size={18} /></button></div>
            {erroNovo && <div className="adm-erro">{erroNovo}</div>}
            <div className="adm-grid2">
              <L label="Nome da empresa"><input value={novo.nomeEmpresa} onChange={(ev) => setNovo({ ...novo, nomeEmpresa: ev.target.value })} required /></L>
              <L label="CNPJ (opcional)"><input value={novo.cnpj} onChange={(ev) => setNovo({ ...novo, cnpj: mascaraCnpj(ev.target.value) })} placeholder="00.000.000/0000-00" inputMode="numeric" /></L>
              <L label="Responsável (Super Admin)"><input value={novo.responsavel} onChange={(ev) => setNovo({ ...novo, responsavel: ev.target.value })} /></L>
              <L label="E-mail do responsável"><input type="email" value={novo.emailResp} onChange={(ev) => setNovo({ ...novo, emailResp: ev.target.value })} required /></L>
            </div>
            <div className="adm-funhead"><span>Funcionários (acessos)</span><button type="button" className="adm-btn sm ghost" onClick={addFunc}><Plus size={13} /> Adicionar</button></div>
            {novo.funcionarios.length === 0 && <p className="adm-sub" style={{ marginTop: 6 }}>Nenhum funcionário ainda. Clique em “Adicionar” para incluir acessos.</p>}
            {novo.funcionarios.map((f, i) => (
              <div key={i} className="adm-funrow">
                <input placeholder={`Nome do funcionário ${i + 1}`} value={f.nome} onChange={(ev) => setFunc(i, "nome", ev.target.value)} />
                <input placeholder="e-mail de acesso" type="email" value={f.email} onChange={(ev) => setFunc(i, "email", ev.target.value)} />
                <button type="button" className="adm-funx" onClick={() => rmFunc(i)}><X size={15} /></button>
              </div>
            ))}
            <div className="adm-valor" style={{ marginTop: 14 }}>Plano: <b>{brl(precos.superadmin + novo.funcionarios.filter((f) => f.email.includes("@")).length * precos.acesso)}/mês</b> <span>(1 Super Admin + {novo.funcionarios.filter((f) => f.email.includes("@")).length} acesso(s))</span></div>
            <button className="adm-btn" type="submit" disabled={salvNovo} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{salvNovo ? "Cadastrando…" : "Cadastrar cliente"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>O responsável e cada funcionário recebem um e-mail para <b>criar a senha</b> e acessar. Cria a página <b>minhasmetricas.com/{novo.nomeEmpresa ? novo.nomeEmpresa.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "(nome)"}</b>.</p>
          </form>
        </div>
      )}
    </div>
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
.adm-shell{display:flex;min-height:100vh}
.adm-side{width:240px;flex-shrink:0;background:#0d0d0d;border-right:1px solid #1d1d1d;padding:22px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
.adm-brand{display:flex;align-items:center;gap:8px;color:#1AADE2;font-weight:800;font-size:16px;padding:6px 8px 18px}
.adm-nav{display:flex;flex-direction:column;gap:4px}
.adm-nav button{display:flex;align-items:center;gap:11px;background:none;border:0;color:#cfd3d8;font-weight:600;font-size:14.5px;padding:11px 12px;border-radius:11px;cursor:pointer;font-family:inherit;text-align:left;width:100%}
.adm-nav button:hover{background:#161616}
.adm-nav button.on{background:#16242b;color:#1AADE2}
.adm-side-foot{margin-top:auto;display:flex;flex-direction:column;gap:6px;border-top:1px solid #1d1d1d;padding-top:12px}
.adm-side-foot button{display:flex;align-items:center;gap:9px;background:none;border:0;color:#9aa0a6;font-size:13.5px;font-weight:600;padding:9px 12px;border-radius:10px;cursor:pointer;font-family:inherit}
.adm-side-foot button:hover{color:#f4f5f7;background:#161616}
.adm-main{flex:1;padding:28px 26px 60px;max-width:1120px;min-width:0}
.adm-main h1{font-size:25px;font-weight:800;letter-spacing:-.02em}
.adm-headrow{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.adm-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#1AADE2;font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:11.5px;margin-bottom:14px}
.adm-h3{font-size:15px;font-weight:700;margin:26px 0 12px}
.adm-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:8px}
.adm-card{background:#121212;border:1px solid #222;border-radius:16px;padding:18px;display:flex;align-items:center;gap:14px}
.adm-ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.adm-card b{font-size:24px;font-weight:800;display:block;line-height:1}
.adm-card small{color:#9aa0a6;font-size:13px}
.adm-tablewrap{background:#121212;border:1px solid #222;border-radius:16px;overflow-x:auto}
.adm-table{width:100%;border-collapse:collapse;font-size:14px;min-width:760px}
.adm-table th{color:#9aa0a6;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:14px 14px;border-bottom:1px solid #222;font-weight:700}
.adm-table td{padding:13px 14px;border-bottom:1px solid #1d1d1d;vertical-align:middle}
.adm-table tr:last-child td{border-bottom:0}
.adm-table .num{text-align:right}
.adm-sub{color:#9aa0a6;font-size:12.5px;font-weight:400}
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
.adm-perms{display:grid;gap:12px;margin-top:18px;max-width:660px}
.adm-perm{display:flex;gap:14px;background:#121212;border:1px solid #222;border-radius:14px;padding:18px}
.adm-pico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.adm-perm b{font-size:15.5px}.adm-perm p{color:#9aa0a6;font-size:13.5px;line-height:1.5;margin-top:4px}
.adm-sel{background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:10px;padding:11px 12px;font-size:14px;font-family:inherit;width:100%;max-width:480px}
.adm-sel:focus{outline:0;border-color:#1AADE2}
.adm-acgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
.adm-acbox{background:#121212;border:1px solid #222;border-radius:16px;padding:20px}
.adm-areas{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.adm-area{background:#161616;border:1px solid #2a2a2a;color:#cfd3d8;border-radius:99px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.adm-area.on{background:#16242b;border-color:#1AADE2;color:#1AADE2}
.adm-acrow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #1d1d1d}
.adm-acrow:last-child{border-bottom:0}
.adm-chips{display:flex;gap:8px;flex-wrap:wrap}
.adm-chip{background:#161616;border:1px solid #2a2a2a;border-radius:99px;padding:7px 14px;font-size:13px;font-weight:600;color:#cfd3d8}
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
.adm-funhead{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
.adm-funhead span{font-size:13px;color:#9aa0a6;font-weight:700}
.adm-funrow{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:8px;align-items:center}
.adm-funrow input{background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;min-width:0}
.adm-funrow input:focus{outline:0;border-color:#1AADE2}
.adm-funx{background:#2a1212;border:1px solid #6b1f1f;color:#EF4444;border-radius:9px;width:38px;height:38px;display:grid;place-items:center;cursor:pointer}
@media(max-width:820px){
  .adm-shell{flex-direction:column}
  .adm-side{width:auto;height:auto;position:static;flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px;border-right:0;border-bottom:1px solid #1d1d1d;padding:12px}
  .adm-brand{display:none}
  .adm-nav{flex-direction:row;flex-wrap:wrap}
  .adm-nav button{padding:8px 12px}
  .adm-side-foot{margin:0 0 0 auto;flex-direction:row;border:0;padding:0}
  .adm-main{padding:20px 16px 50px}
  .adm-kpis{grid-template-columns:repeat(2,1fr)}
  .adm-grid2{grid-template-columns:1fr}
  .adm-acgrid{grid-template-columns:1fr}
}

/* ===== TEMA CLARO (a barra lateral continua escura, igual ao Hub) ===== */
body.theme-light .adm{background:#FAFAFA;color:#18181b}
body.theme-light .adm-main h1{color:#18181b}
body.theme-light .adm-card{background:#fff;border-color:rgba(0,0,0,.08)}
body.theme-light .adm-card small,
body.theme-light .adm-sub,
body.theme-light .adm-table th{color:#52525b}
body.theme-light .adm-tablewrap{background:#fff;border-color:rgba(0,0,0,.08)}
body.theme-light .adm-table th{border-bottom-color:rgba(0,0,0,.10)}
body.theme-light .adm-table td{border-bottom-color:rgba(0,0,0,.07)}
body.theme-light .adm-table tr:hover td{background:rgba(0,0,0,.025)}
body.theme-light .adm-perm,
body.theme-light .adm-acbox,
body.theme-light .adm-aviso,
body.theme-light .adm-modal{background:#fff;border-color:rgba(0,0,0,.08)}
body.theme-light .adm-perm p,
body.theme-light .adm-aviso p,
body.theme-light .adm-f span,
body.theme-light .adm-funhead span,
body.theme-light .adm-mhead button{color:#52525b}
body.theme-light .adm-sel,
body.theme-light .adm-f input,
body.theme-light .adm-funrow input{background:#fff;border-color:rgba(0,0,0,.14);color:#18181b}
body.theme-light .adm-area,
body.theme-light .adm-chip,
body.theme-light .adm-btn.ghost{background:#f1f1f3;border-color:rgba(0,0,0,.12);color:#27272a}
body.theme-light .adm-area.on{background:#16242b;border-color:#1AADE2;color:#1AADE2}
`;
