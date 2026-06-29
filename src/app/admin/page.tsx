"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Building2, Users, Ban, RotateCcw, Trash2, LogOut, Plus, X, DollarSign,
  LayoutDashboard, KeyRound, Settings, Pencil, Eye, Send,
  ArrowLeft, CreditCard, Receipt, ExternalLink, Image as ImageIcon, Palette, FileText,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { dataBR, brl } from "@/lib/format";
import { useBrand } from "@/lib/brand";

type Empresa = {
  id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number;
  dono_id: string | null; dono: { id: string; nome: string | null; email: string | null } | null;
  acessoCortado: boolean; plano: string | null; valor: number; slug: string | null; cnpj: string | null;
  logo_url: string | null; cor: string | null; nLanc: number; nCli: number; nFunc: number;
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

// Dados de demonstração — usados quando o Supabase não está configurado (localhost),
// pra você visualizar/ajustar a tela sem precisar de login.
const DEMO_RESP: Resp = {
  empresas: [
    { id: "demo-araguaia", nome: "Colégio Araguaia", segmento: "Educação", criado_em: "2026-06-29T12:00:00Z", saldo_inicial: 0, dono_id: "d1", dono: { id: "d1", nome: "Secretaria Araguaia", email: "secretaria@colegioaraguaia.com.br" }, acessoCortado: false, plano: "1 Super Admin + 1 Acesso", valor: 119.8, slug: "colegioaraguaia", cnpj: "33.364.563/0001-18", logo_url: null, cor: "#E11D48", nLanc: 24, nCli: 8, nFunc: 3 },
    { id: "demo-metricas", nome: "Metricas", segmento: null, criado_em: "2026-06-29T09:00:00Z", saldo_inicial: 0, dono_id: "d2", dono: { id: "d2", nome: "Minhas Métricas", email: "minhasmetricas@gmail.com" }, acessoCortado: false, plano: null, valor: 0, slug: "metricas", cnpj: null, logo_url: null, cor: null, nLanc: 0, nCli: 0, nFunc: 0 },
    { id: "demo-jp", nome: "JP Contabilidade", segmento: "Serviços", criado_em: "2026-06-20T10:00:00Z", saldo_inicial: 0, dono_id: "d3", dono: { id: "d3", nome: "João Pedro", email: "jp@gmail.com" }, acessoCortado: false, plano: "1 Super Admin + 2 Acessos", valor: 199.6, slug: "jp", cnpj: "12.345.678/0001-90", logo_url: null, cor: "#16A34A", nLanc: 51, nCli: 14, nFunc: 5 },
    { id: "demo-walk", nome: "Walk Store", segmento: "Comércio", criado_em: "2026-05-26T08:00:00Z", saldo_inicial: 0, dono_id: "d4", dono: { id: "d4", nome: "Pedro Walk", email: "pedro@gmail.com" }, acessoCortado: true, plano: "1 Super Admin", valor: 79.9, slug: "walk", cnpj: null, logo_url: null, cor: null, nLanc: 9, nCli: 3, nFunc: 1 },
  ],
  totais: { empresas: 4, usuarios: 11, faturamento: 399.3, ativos: 3 },
  precos: { superadmin: 79.9, acesso: 39.9 },
};

export default function Admin() {
  const router = useRouter();
  const { theme, toggleTheme } = useBrand();
  const [demo, setDemo] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
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
  const [okAcesso, setOkAcesso] = useState("");
  const [precoForm, setPrecoForm] = useState<{ sa: string; ac: string } | null>(null);
  const [salvPreco, setSalvPreco] = useState(false);
  const [novo, setNovo] = useState<NovoCliente | null>(null);
  const [salvNovo, setSalvNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState("");

  const carregar = useCallback(async () => {
    if (!supabaseReady || !supabase) { setData(DEMO_RESP); setDemo(true); setEstado("ok"); return; }
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
  // Ao abrir o detalhe de uma empresa, já carrega a equipe dela.
  useEffect(() => { if (detalheId) selecionarEmpresa(detalheId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [detalheId]);

  async function acao(action: string, body: Record<string, string>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    if (demo) {
      setData((d) => {
        if (!d) return d;
        let empresas = d.empresas;
        if (action === "excluir") empresas = empresas.filter((e) => e.id !== body.empresaId);
        if (action === "cortar") empresas = empresas.map((e) => (e.dono_id === body.userId ? { ...e, acessoCortado: true } : e));
        if (action === "restaurar") empresas = empresas.map((e) => (e.dono_id === body.userId ? { ...e, acessoCortado: false } : e));
        return { ...d, empresas, totais: { ...d.totais, empresas: empresas.length, ativos: empresas.filter((e) => !e.acessoCortado).length } };
      });
      if (action === "excluir") setDetalheId(null);
      return;
    }
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
    if (!form) return;
    if (demo) {
      const valor = (Number(form.qtdSuperadmins) || 0) * precos.superadmin + (Number(form.qtdAcessos) || 0) * precos.acesso;
      const qs = Math.max(1, Number(form.qtdSuperadmins) || 1), qa = Math.max(0, Number(form.qtdAcessos) || 0);
      const plano = `${qs} Super Admin${qs > 1 ? "s" : ""} + ${qa} Acesso${qa !== 1 ? "s" : ""}`;
      setData((d) => d ? { ...d, empresas: d.empresas.map((emp) => emp.id === form.editId ? {
        ...emp, nome: form.nomeEmpresa, cnpj: form.cnpj || null, segmento: form.segmento || null,
        slug: form.slug || emp.slug, valor, plano, logo_url: form.logo || emp.logo_url,
        dono: emp.dono ? { ...emp.dono, nome: form.responsavel || emp.dono.nome, email: form.email || emp.dono.email } : emp.dono,
      } : emp) } : d);
      setForm(null);
      return;
    }
    if (!supabase) return;
    setSalvando(true); setErroForm("");
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: form.editId ? "editar" : "criar", empresaId: form.editId || undefined, ...form }) });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErroForm(j.error || "Não consegui salvar."); return; }
    const novo = !form.editId;
    setForm(null); if (novo) setAba("empresas"); await carregar();
  }
  async function salvarCor(empresaId: string, cor: string) {
    if (demo) {
      setData((d) => d ? { ...d, empresas: d.empresas.map((emp) => emp.id === empresaId ? { ...emp, cor } : emp) } : d);
      return;
    }
    if (!supabase) return;
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "empresa-cor", empresaId, cor }) });
    setData((d) => d ? { ...d, empresas: d.empresas.map((emp) => emp.id === empresaId ? { ...emp, cor } : emp) } : d);
  }
  async function salvarDados(empresaId: string, patch: { nomeEmpresa?: string; cnpj?: string; segmento?: string; responsavel?: string; email?: string; logo?: string }) {
    const aplicar = (emp: Empresa): Empresa => ({
      ...emp,
      ...(patch.nomeEmpresa !== undefined ? { nome: patch.nomeEmpresa } : {}),
      ...(patch.cnpj !== undefined ? { cnpj: patch.cnpj || null } : {}),
      ...(patch.segmento !== undefined ? { segmento: patch.segmento || null } : {}),
      ...(patch.logo ? { logo_url: patch.logo } : {}),
      dono: emp.dono ? { ...emp.dono, ...(patch.responsavel !== undefined ? { nome: patch.responsavel || null } : {}), ...(patch.email ? { email: patch.email } : {}) } : emp.dono,
    });
    if (!demo && supabase) {
      await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "empresa-dados", empresaId, ...patch }) });
    }
    setData((d) => d ? { ...d, empresas: d.empresas.map((emp) => emp.id === empresaId ? aplicar(emp) : emp) } : d);
  }
  async function reenviarAcesso(e: Empresa) {
    if (!e.dono?.email) { window.alert("Essa empresa ainda não tem e-mail de responsável."); return; }
    const linkSlug = e.slug ? ` e o link minhasmetricas.com/${e.slug}` : "";
    if (demo) { window.alert(`(Demonstração) E-mail de acesso reenviado para ${e.dono.email}${linkSlug}.`); return; }
    setBusy("reenviar-" + e.id);
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "reenviar", empresaId: e.id }) });
    setBusy(null);
    window.alert(res.ok ? `Acesso reenviado para ${e.dono.email}.` : "Não consegui reenviar o acesso agora.");
  }
  async function entrarComOutra() { if (supabase) await supabase.auth.signOut(); router.push("/login"); }

  async function tokenH() { const { data: sess } = await supabase!.auth.getSession(); return { Authorization: `Bearer ${sess.session?.access_token}` }; }
  async function selecionarEmpresa(id: string) {
    setPermEmpresa(id); setErroAcesso(""); setOkAcesso(""); setNovoAcesso({ nome: "", email: "", senha: "", areas: [] }); setAcessos(null);
    if (!id) return;
    if (demo) {
      const emp = data?.empresas.find((e) => e.id === id);
      setAcessos(emp?.dono ? [
        { id: emp.dono.id, nome: emp.dono.nome, email: emp.dono.email, papel: "dono", areas: null },
        { id: "demo-colab-" + id, nome: "Colaborador Exemplo", email: "colaborador@empresa.com", papel: "colaborador", areas: ["financas", "comercial"] },
      ] : []);
      return;
    }
    if (!supabase) return;
    const res = await fetch(`/api/admin?empresaId=${id}`, { headers: await tokenH() });
    setAcessos(res.ok ? (await res.json()).acessos : []);
  }
  async function criarAcesso() {
    if (!permEmpresa) return;
    if (!novoAcesso.email.includes("@")) { setErroAcesso("Informe o e-mail do colaborador."); return; }
    if (demo) {
      setAcessos((a) => [...(a ?? []), { id: "demo-novo-" + Date.now(), nome: novoAcesso.nome || novoAcesso.email, email: novoAcesso.email, papel: "colaborador", areas: novoAcesso.areas }]);
      setOkAcesso(`✅ (Demonstração) Acesso criado para ${novoAcesso.email}.`);
      setNovoAcesso({ nome: "", email: "", senha: "", areas: [] });
      return;
    }
    if (!supabase) return;
    setSalvAcesso(true); setErroAcesso(""); setOkAcesso("");
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-criar", empresaId: permEmpresa, nome: novoAcesso.nome, email: novoAcesso.email, areas: novoAcesso.areas }) });
    const j = await res.json().catch(() => ({}));
    setSalvAcesso(false);
    if (!res.ok) { setErroAcesso(j.error || "Não consegui criar."); return; }
    setOkAcesso(`✅ Acesso criado! Enviamos um e-mail para ${novoAcesso.email} criar a senha.`);
    setNovoAcesso({ nome: "", email: "", senha: "", areas: [] });
    await selecionarEmpresa(permEmpresa);
  }
  async function removerAcesso(userId: string) {
    if (!window.confirm("Remover este acesso?")) return;
    if (demo) { setAcessos((a) => (a ?? []).filter((x) => x.id !== userId)); return; }
    if (!supabase) return;
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
  if (estado === "negado") return <Casca><Aviso titulo="Acesso restrito 🔒" texto="Você está logado, mas esta área é só para Super Admin. Entre com a conta de Super Admin." botao={entrarComOutra} botaoTxt="Entrar com outra conta" botao2={() => router.push("/minhasmetricas")} botao2Txt="Voltar ao painel" /></Casca>;
  if (estado === "erro") return <Casca><Aviso titulo="Ops" texto="Não consegui carregar. Tente novamente em instantes." botao={carregar} botaoTxt="Tentar de novo" botao2={entrarComOutra} botao2Txt="Entrar com outra conta" /></Casca>;

  const t = data?.totais;
  const precos = data?.precos ?? { superadmin: PRECO_SUPERADMIN, acesso: PRECO_ACESSO };
  const NAV: { k: Aba; label: string; Icon: typeof Building2 }[] = [
    { k: "visao", label: "Visão geral", Icon: LayoutDashboard },
    { k: "empresas", label: "Empresas", Icon: Building2 },
    { k: "config", label: "Configurações", Icon: Settings },
  ];

  const detalhe = detalheId ? (data?.empresas.find((e) => e.id === detalheId) ?? null) : null;

  return (
    <div className="adm">
      <style>{CSS}</style>
      <button
        className="adm-theme-fab"
        onClick={toggleTheme}
        title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        aria-label="Alternar tema claro/escuro"
      >
        <Eye size={17} />
      </button>
      <div className="adm-shell">
        <aside className="adm-side">
          <div className="adm-brand"><ShieldCheck size={18} /> Super Admin</div>
          <nav className="adm-nav">
            {NAV.map(({ k, label, Icon }) => (
              <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}><Icon size={18} /> {label}</button>
            ))}
            <button onClick={() => window.open("/gerarproposta", "_blank", "noopener")}><FileText size={18} /> Gerar proposta</button>
          </nav>
          <div className="adm-side-foot">
            <button onClick={entrarComOutra}><LogOut size={15} /> Sair</button>
          </div>
        </aside>

        <main className="adm-main">
          {detalhe ? (
            <DetalheEmpresa key={detalhe.id} e={detalhe} onBack={() => setDetalheId(null)} onEditar={abrirEdicao} onSalvarCor={salvarCor} onSalvarDados={salvarDados} equipe={{ acessos, novoAcesso, setNovoAcesso, criar: criarAcesso, remover: removerAcesso, toggleArea, salvando: salvAcesso, erro: erroAcesso, ok: okAcesso }} />
          ) : (
          <>
          {demo && <div className="adm-demo"><Eye size={14} /> Modo demonstração — dados de exemplo (no site no ar aparecem os clientes reais).</div>}
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
                      <tr key={e.id} className="adm-clickrow" onClick={() => setDetalheId(e.id)} title="Ver detalhes"><td><b>{e.nome}</b></td><td className="adm-sub">{e.dono?.email || "—"}</td><td>{e.plano || "—"}</td><td className="adm-sub">{dataBR(e.criado_em)}</td></tr>
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
                  <thead><tr><th>Empresa</th><th>Responsável</th><th>Plano</th><th>Criada</th><th className="num">Equipe</th><th style={{ textAlign: "center" }}>Acesso</th><th>Ações</th></tr></thead>
                  <tbody>
                    {data?.empresas.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="adm-emp">
                            <div className="adm-emp-logo">{e.logo_url ? <img src={e.logo_url} alt="" /> : <span>{(e.nome || "?").trim().charAt(0).toUpperCase()}</span>}</div>
                            <b className="adm-link" onClick={() => setDetalheId(e.id)} title="Ver detalhes">{e.nome}</b>
                          </div>
                        </td>
                        <td>{e.dono ? <><div>{e.dono.nome || "—"}</div><div className="adm-sub">{e.dono.email}</div></> : <span className="adm-sub">—</span>}</td>
                        <td>{e.plano ? <><div>{e.plano}</div>{e.valor > 0 && <div className="adm-sub">{brl(e.valor)}</div>}</> : <span className="adm-sub">—</span>}</td>
                        <td className="adm-sub">{dataBR(e.criado_em)}</td>
                        <td className="num">{e.nFunc}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className={"adm-switch" + (e.acessoCortado ? "" : " on")}
                            disabled={!e.dono_id || !!busy}
                            title={e.acessoCortado ? "Ativar acesso" : "Desativar acesso"}
                            onClick={() => e.dono_id && acao(e.acessoCortado ? "restaurar" : "cortar", { userId: e.dono_id })}
                          >
                            <span className="adm-switch-knob" />
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="adm-btn sm ghost" onClick={() => abrirEdicao(e)}><Pencil size={13} /> Editar</button>
                            <button className="adm-btn sm ghost" disabled={!!busy} onClick={() => reenviarAcesso(e)}><Send size={13} /> Reenviar acesso</button>
                            {e.dono_id && (e.acessoCortado
                              ? <button className="adm-btn sm ghost" disabled={!!busy} onClick={() => acao("restaurar", { userId: e.dono_id! })}><RotateCcw size={13} /> Restaurar</button>
                              : <button className="adm-btn sm warn" disabled={!!busy} onClick={() => acao("cortar", { userId: e.dono_id! }, `Cortar o acesso de "${e.nome}"?`)}><Ban size={13} /> Cortar</button>)}
                            <button className="adm-btn sm danger" disabled={!!busy} onClick={() => acao("excluir", { empresaId: e.id }, `EXCLUIR a empresa "${e.nome}" e TODOS os dados? Não pode ser desfeito.`)}><Trash2 size={13} /> Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!data?.empresas.length && <tr><td colSpan={7} className="adm-sub" style={{ textAlign: "center", padding: 30 }}>Nenhuma empresa cadastrada ainda.</td></tr>}
                  </tbody>
                </table>
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

const COR_PRESETS = ["#1AADE2", "#E11D48", "#16A34A", "#7C3AED", "#F59E0B", "#0EA5E9", "#EC4899", "#0F172A"];

function DetalheEmpresa({ e, onBack, onEditar, onSalvarCor, onSalvarDados, equipe }: {
  e: Empresa;
  onBack: () => void;
  onEditar: (e: Empresa) => void;
  onSalvarCor: (empresaId: string, cor: string) => Promise<void> | void;
  onSalvarDados: (empresaId: string, patch: { nomeEmpresa?: string; cnpj?: string; segmento?: string; responsavel?: string; email?: string; logo?: string }) => Promise<void> | void;
  equipe: {
    acessos: Acesso[] | null;
    novoAcesso: { nome: string; email: string; senha: string; areas: string[] };
    setNovoAcesso: (v: { nome: string; email: string; senha: string; areas: string[] }) => void;
    criar: () => void;
    remover: (userId: string) => void;
    toggleArea: (k: string) => void;
    salvando: boolean;
    erro: string;
    ok: string;
  };
}) {
  const inicial = (e.nome || "?").trim().charAt(0).toUpperCase();
  const criado = e.criado_em ? new Date(e.criado_em) : null;
  const meses = criado ? Math.max(0, Math.round((Date.now() - criado.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
  const desde = meses < 1 ? "menos de 1 mês" : meses === 1 ? "1 mês" : `${meses} meses`;
  const [cor, setCor] = useState((e.cor || "#1AADE2").toUpperCase());
  const [salvandoCor, setSalvandoCor] = useState(false);
  const [corSalva, setCorSalva] = useState(false);
  const mudarCor = (c: string) => { setCor(c.toUpperCase()); setCorSalva(false); };
  async function salvarCorClick() { setSalvandoCor(true); await onSalvarCor(e.id, cor); setSalvandoCor(false); setCorSalva(true); }

  // Edição inline dos dados cadastrais.
  const [dados, setDados] = useState({ nome: e.nome, cnpj: e.cnpj || "", segmento: e.segmento || "", responsavel: e.dono?.nome || "", email: e.dono?.email || "" });
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [dadosSalvos, setDadosSalvos] = useState(false);
  const setD = (k: keyof typeof dados, v: string) => { setDados((d) => ({ ...d, [k]: v })); setDadosSalvos(false); };
  const dirty = dados.nome !== e.nome || dados.cnpj !== (e.cnpj || "") || dados.segmento !== (e.segmento || "") || dados.responsavel !== (e.dono?.nome || "") || dados.email !== (e.dono?.email || "");
  async function salvarDadosClick() {
    setSalvandoDados(true);
    await onSalvarDados(e.id, { nomeEmpresa: dados.nome, cnpj: dados.cnpj, segmento: dados.segmento, responsavel: dados.responsavel, email: dados.email });
    setSalvandoDados(false); setDadosSalvos(true);
  }
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  function escolherLogo(file: File) { const r = new FileReader(); r.onload = () => { const url = String(r.result); setLogoPreview(url); onSalvarDados(e.id, { logo: url }); }; r.readAsDataURL(file); }
  const logoMostrar = logoPreview || e.logo_url;
  return (
    <div className="adm-det">
      <button className="adm-det-back" onClick={onBack}><ArrowLeft size={16} /> Voltar para a lista</button>

      <div className="adm-det-head">
        <div className="adm-det-logo">{e.logo_url ? <img src={e.logo_url} alt="Logo" /> : <span>{inicial}</span>}</div>
        <div className="adm-det-htxt">
          <h1>{e.nome}</h1>
          <div className="adm-det-meta">
            {e.acessoCortado ? <span className="adm-badge cortado">Acesso cortado</span> : <span className="adm-badge ativo">Ativo</span>}
            {e.slug && <a href={`/${e.slug}`} target="_blank" rel="noopener" className="adm-det-slug"><ExternalLink size={13} /> minhasmetricas.com/{e.slug}</a>}
          </div>
        </div>
      </div>

      <div className="adm-det-grid">
        <div className="adm-det-card">
          <h4><Building2 size={15} /> Dados cadastrais</h4>
          <div className="adm-det-form">
            <label className="adm-det-f"><span>Nome da empresa</span><input value={dados.nome} onChange={(ev) => setD("nome", ev.target.value)} /></label>
            <label className="adm-det-f"><span>CNPJ</span><input value={dados.cnpj} onChange={(ev) => setD("cnpj", mascaraCnpj(ev.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" /></label>
            <label className="adm-det-f"><span>Segmento</span><input value={dados.segmento} onChange={(ev) => setD("segmento", ev.target.value)} placeholder="Ex: Educação" /></label>
            <label className="adm-det-f"><span>Responsável</span><input value={dados.responsavel} onChange={(ev) => setD("responsavel", ev.target.value)} /></label>
            <label className="adm-det-f"><span>E-mail</span><input type="email" value={dados.email} onChange={(ev) => setD("email", ev.target.value)} /></label>
            <div className="adm-det-f"><span>Cadastrado em</span><div className="adm-det-ro">{dataBR(e.criado_em)}</div></div>
          </div>
          <button className="adm-btn sm" style={{ marginTop: 16 }} disabled={!dirty || salvandoDados} onClick={salvarDadosClick}>
            {salvandoDados ? "Salvando…" : dadosSalvos && !dirty ? "✓ Salvo" : "Salvar alterações"}
          </button>
        </div>

        <div className="adm-det-card">
          <h4><CreditCard size={15} /> Plano &amp; cobrança</h4>
          <dl>
            <div><dt>Plano</dt><dd>{e.plano || "—"}</dd></div>
            <div><dt>Mensalidade</dt><dd className="adm-det-strong">{e.valor > 0 ? brl(e.valor) : "—"}</dd></div>
            <div><dt>Cliente há</dt><dd>{desde}</dd></div>
            <div><dt><Receipt size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Pagamentos efetuados</dt><dd className="adm-sub">em breve</dd></div>
          </dl>
          <button className="adm-btn sm ghost" style={{ marginTop: 16 }} onClick={() => onEditar(e)}><Pencil size={13} /> Editar plano</button>
        </div>

        <div className="adm-det-card">
          <h4><Palette size={15} /> Cor principal</h4>
          <p className="adm-sub" style={{ margin: "0 0 14px" }}>Essa cor vira o destaque da página pública da empresa{e.slug ? <> (minhasmetricas.com/{e.slug})</> : null}.</p>
          <div className="adm-cor-row">
            <input type="color" className="adm-cor-pick" value={cor} onChange={(ev) => mudarCor(ev.target.value)} />
            <input type="text" className="adm-cor-hex" value={cor} onChange={(ev) => mudarCor(ev.target.value)} maxLength={7} />
          </div>
          <div className="adm-cor-presets">
            {COR_PRESETS.map((c) => (
              <button key={c} type="button" className={"adm-cor-sw" + (cor === c ? " on" : "")} style={{ background: c }} onClick={() => mudarCor(c)} title={c} />
            ))}
          </div>
          <div className="adm-cor-prev" style={{ borderColor: cor }}>
            <span className="adm-cor-dot" style={{ background: cor }} />
            <span style={{ color: cor, fontWeight: 800 }}>Prévia do destaque</span>
            <span className="adm-cor-btn" style={{ background: cor }}>Entrar no painel →</span>
          </div>
          <button className="adm-btn sm" style={{ marginTop: 14 }} disabled={salvandoCor} onClick={salvarCorClick}>
            {salvandoCor ? "Salvando…" : corSalva ? "✓ Cor salva" : "Salvar cor"}
          </button>
        </div>

        <div className="adm-det-card">
          <h4><ImageIcon size={15} /> Logomarca</h4>
          <div className="adm-det-logobox">
            {logoMostrar ? <img src={logoMostrar} alt="Logo da empresa" /> : <span className="adm-sub">Nenhuma logo enviada ainda</span>}
          </div>
          <label className="adm-btn sm ghost" style={{ marginTop: 12, cursor: "pointer" }}>
            <ImageIcon size={13} /> {logoMostrar ? "Trocar logo" : "Enviar logo"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(ev) => { const f = ev.target.files?.[0]; if (f) escolherLogo(f); }} />
          </label>
        </div>

        <div className="adm-det-card adm-det-wide">
          <h4><KeyRound size={15} /> Equipe &amp; Acessos</h4>
          <p className="adm-sub" style={{ margin: "0 0 16px" }}>Crie logins para a equipe dessa empresa e defina o que cada um vê. O Dashboard fica visível para todos.</p>
          <div className="adm-eqp-grid">
            <div>
              <h5 className="adm-det-h5">Dar acesso a um colaborador</h5>
              {equipe.erro && <div className="adm-erro">{equipe.erro}</div>}
              {equipe.ok && <div className="adm-ok">{equipe.ok}</div>}
              <label className="adm-det-f"><span>Nome</span><input value={equipe.novoAcesso.nome} onChange={(ev) => equipe.setNovoAcesso({ ...equipe.novoAcesso, nome: ev.target.value })} placeholder="Nome do colaborador" /></label>
              <label className="adm-det-f" style={{ marginTop: 11 }}><span>E-mail (login)</span><input type="email" value={equipe.novoAcesso.email} onChange={(ev) => equipe.setNovoAcesso({ ...equipe.novoAcesso, email: ev.target.value })} placeholder="email@empresa.com" /></label>
              <div className="adm-det-f" style={{ marginTop: 11 }}><span>O que ele pode acessar</span>
                <div className="adm-areas">
                  {AREAS.map((a) => <button type="button" key={a.k} className={"adm-area" + (equipe.novoAcesso.areas.includes(a.k) ? " on" : "")} onClick={() => equipe.toggleArea(a.k)}>{equipe.novoAcesso.areas.includes(a.k) ? "✓ " : ""}{a.l}</button>)}
                </div>
              </div>
              <button className="adm-btn sm" style={{ marginTop: 14 }} disabled={equipe.salvando} onClick={equipe.criar}><Send size={13} /> {equipe.salvando ? "Enviando…" : "Criar e enviar acesso"}</button>
            </div>
            <div>
              <h5 className="adm-det-h5">Quem tem acesso</h5>
              {equipe.acessos === null ? <p className="adm-sub">Carregando…</p> : equipe.acessos.length === 0 ? <p className="adm-sub">Ninguém ainda.</p> : equipe.acessos.map((p) => (
                <div key={p.id} className="adm-acrow">
                  <div><b>{p.nome || "—"}</b><div className="adm-sub">{p.email}</div></div>
                  {p.papel === "dono"
                    ? <span className="adm-badge ativo">Dono (tudo)</span>
                    : <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="adm-sub">{p.areas && p.areas.length ? p.areas.map((k) => AREAS.find((a) => a.k === k)?.l || k).join(", ") : "só dashboard"}</span><button className="adm-btn sm danger" onClick={() => equipe.remover(p.id)}><Trash2 size={13} /></button></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
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
.adm-ok{background:#10331f;border:1px solid #1d5b32;color:#9bf0bd;border-radius:10px;padding:10px 12px;font-size:13.5px;margin-bottom:6px}
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

/* ===== Botão flutuante de tema (olho) no canto superior direito ===== */
.adm-theme-fab{position:fixed;top:16px;right:20px;z-index:60;width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;cursor:pointer;background:rgba(22,22,22,.85);backdrop-filter:blur(8px);
  border:1px solid #2a2a2a;color:#cfd3d8;transition:.18s ease;box-shadow:0 6px 18px -8px rgba(0,0,0,.55)}
.adm-theme-fab:hover{color:#1AADE2;border-color:#1AADE2;transform:translateY(-1px)}
.adm-theme-fab:active{transform:translateY(0)}
@media(max-width:820px){.adm-theme-fab{top:10px;right:12px;width:34px;height:34px}}

/* ===== Logo + nome na tabela de empresas ===== */
.adm-emp{display:flex;align-items:center;gap:11px}
.adm-emp-logo{width:36px;height:36px;border-radius:9px;flex-shrink:0;display:grid;place-items:center;overflow:hidden;
  background:#16242b;border:1px solid #233a44;color:#1AADE2;font-weight:800;font-size:15px}
.adm-emp-logo img{width:100%;height:100%;object-fit:contain;background:#fff}

/* ===== Botão deslizante (liga/desliga acesso) — estilo celular ===== */
.adm-switch{position:relative;display:inline-block;width:46px;height:26px;border-radius:99px;background:#3a3a3a;border:0;
  cursor:pointer;transition:background .18s;flex-shrink:0;padding:0;vertical-align:middle}
.adm-switch.on{background:#10B981}
.adm-switch:disabled{opacity:.5;cursor:not-allowed}
.adm-switch-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;
  transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.adm-switch.on .adm-switch-knob{left:23px}

/* ===== Linhas clicáveis + banner de demo ===== */
.adm-clickrow{cursor:pointer;transition:background .12s}
.adm-clickrow:hover td{background:#161616}
.adm-link{cursor:pointer;transition:color .15s}
.adm-link:hover{color:#1AADE2}
.adm-demo{display:inline-flex;align-items:center;gap:8px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);
  color:#F59E0B;font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:10px;margin-bottom:14px}

/* ===== Tela de detalhe do cliente ===== */
.adm-det-back{display:inline-flex;align-items:center;gap:7px;background:none;border:0;color:#9aa0a6;font-weight:600;
  font-size:13.5px;cursor:pointer;font-family:inherit;padding:4px 0;margin-bottom:18px}
.adm-det-back:hover{color:#1AADE2}
.adm-det-head{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:24px}
.adm-det-logo{width:64px;height:64px;border-radius:16px;flex-shrink:0;display:grid;place-items:center;overflow:hidden;
  background:linear-gradient(135deg,#16242b,#0f1a1f);border:1px solid #233a44;color:#1AADE2;font-size:26px;font-weight:800}
.adm-det-logo img{width:100%;height:100%;object-fit:contain;background:#fff}
.adm-det-htxt{flex:1;min-width:200px}
.adm-det-htxt h1{font-size:25px;font-weight:800;letter-spacing:-.02em;margin:0}
.adm-det-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:9px}
.adm-det-slug{display:inline-flex;align-items:center;gap:6px;color:#1AADE2;font-size:13px;font-weight:600}
.adm-det-slug:hover{text-decoration:underline}
.adm-det-actions{display:flex;gap:8px;flex-wrap:wrap}
.adm-det-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:760px){.adm-det-grid{grid-template-columns:1fr}.adm-det-actions{width:100%}}
.adm-det-card{background:#121212;border:1px solid #222;border-radius:16px;padding:20px}
.adm-det-card h4{display:flex;align-items:center;gap:8px;margin:0 0 16px;font-size:12.5px;font-weight:700;color:#cfd3d8;
  text-transform:uppercase;letter-spacing:.05em}
.adm-det-card h4 svg{color:#1AADE2}
.adm-det-card dl{margin:0;display:flex;flex-direction:column;gap:12px}
.adm-det-card dl > div{display:flex;justify-content:space-between;align-items:baseline;gap:14px}
.adm-det-card dt{color:#9aa0a6;font-size:13px;flex-shrink:0}
.adm-det-card dd{margin:0;font-size:14px;font-weight:600;text-align:right;word-break:break-word}
.adm-det-strong{color:#10B981!important;font-size:16px!important;font-weight:800!important}
.adm-det-stats{display:flex;gap:10px}
.adm-det-stats > div{flex:1;background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:14px;text-align:center}
.adm-det-stats b{display:block;font-size:24px;font-weight:800;line-height:1;margin-bottom:4px}
.adm-det-stats span{font-size:11.5px;color:#9aa0a6}
.adm-det-logobox{min-height:84px;border:1px dashed #2a2a2a;border-radius:12px;display:grid;place-items:center;padding:14px;background:#0f0f0f}
.adm-det-logobox img{max-height:72px;max-width:100%;object-fit:contain}
.adm-det-form{display:flex;flex-direction:column;gap:11px}
.adm-det-f{display:flex;flex-direction:column;gap:5px}
.adm-det-f span{font-size:12px;color:#9aa0a6;font-weight:600}
.adm-det-f input{background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:9px;padding:9px 11px;font-size:14px;font-family:inherit}
.adm-det-f input:focus{outline:0;border-color:#1AADE2}
.adm-det-ro{font-size:14px;font-weight:600;padding:9px 0;color:#cfd3d8}
.adm-det-wide{grid-column:1 / -1}
.adm-det-h5{margin:0 0 12px;font-size:14px;font-weight:700}
.adm-eqp-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
@media(max-width:760px){.adm-eqp-grid{grid-template-columns:1fr}}
.adm-cor-row{display:flex;gap:10px;align-items:center}
.adm-cor-pick{width:48px;height:42px;padding:3px;border:1px solid #2a2a2a;border-radius:10px;background:#0f0f0f;cursor:pointer;flex-shrink:0}
.adm-cor-pick::-webkit-color-swatch{border:0;border-radius:6px}
.adm-cor-pick::-webkit-color-swatch-wrapper{padding:0}
.adm-cor-hex{flex:1;min-width:0;background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:10px;padding:11px 12px;font-size:14px;font-family:inherit;text-transform:uppercase}
.adm-cor-hex:focus{outline:0;border-color:#1AADE2}
.adm-cor-presets{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.adm-cor-sw{width:30px;height:30px;border-radius:8px;border:2px solid transparent;cursor:pointer;transition:.12s;box-shadow:0 0 0 1px rgba(255,255,255,.08) inset}
.adm-cor-sw:hover{transform:scale(1.08)}
.adm-cor-sw.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.adm-cor-prev{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding:14px;border:1.5px solid;border-radius:12px;background:#0f0f0f}
.adm-cor-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.adm-cor-btn{margin-left:auto;color:#fff;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:99px}

/* ===== TEMA CLARO (a barra lateral continua escura, igual ao Hub) ===== */
body.theme-light .adm{background:#FAFAFA;color:#18181b}
body.theme-light .adm-clickrow:hover td{background:rgba(0,0,0,.025)}
body.theme-light .adm-det-card,
body.theme-light .adm-det-stats > div{background:#fff;border-color:rgba(0,0,0,.08)}
body.theme-light .adm-det-card h4{color:#3f3f46}
body.theme-light .adm-det-card dt,
body.theme-light .adm-det-stats span{color:#52525b}
body.theme-light .adm-det-logobox{background:#fafafa;border-color:rgba(0,0,0,.14)}
body.theme-light .adm-det-logo{background:linear-gradient(135deg,#e8f6fc,#f4fbfe);border-color:rgba(26,173,226,.22)}
body.theme-light .adm-cor-pick,
body.theme-light .adm-cor-hex,
body.theme-light .adm-cor-prev{background:#fafafa;border-color:rgba(0,0,0,.14);color:#18181b}
body.theme-light .adm-det-f input{background:#fff;border-color:rgba(0,0,0,.14);color:#18181b}
body.theme-light .adm-det-ro{color:#27272a}
body.theme-light .adm-emp-logo{background:#e8f6fc;border-color:rgba(26,173,226,.22)}
body.theme-light .adm-switch{background:#cbd5e1}
body.theme-light .adm-switch.on{background:#10B981}
body.theme-light .adm-theme-fab{background:rgba(255,255,255,.9);border-color:rgba(0,0,0,.10);
  color:#52525b;box-shadow:0 6px 16px -8px rgba(15,23,42,.18)}
body.theme-light .adm-theme-fab:hover{color:#1AADE2;border-color:#1AADE2}
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
