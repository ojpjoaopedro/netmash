"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Building2, Users, Trash2, LogOut, Plus, X, DollarSign,
  LayoutDashboard, KeyRound, Pencil, Eye, EyeOff, Send, UserPlus,
  ArrowLeft, ExternalLink, Image as ImageIcon, Palette, FileText, Search, Info,
  HeartPulse, ShoppingCart, Megaphone, Package,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { dataBR, dataHoraBR, brl } from "@/lib/format";
import { useBrand } from "@/lib/brand";
import AdminProdutos from "@/components/AdminProdutos";
import AdminCupons from "@/components/AdminCupons";
import AdminVendas from "@/components/AdminVendas";

type Empresa = {
  id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number;
  dono_id: string | null; dono: { id: string; nome: string | null; email: string | null } | null;
  acessoCortado: boolean; plano: string | null; valor: number; slug: string | null; cnpj: string | null;
  cidade: string | null; estado: string | null;
  logo_url: string | null; cor: string | null; nLanc: number; nCli: number; nFunc: number;
};
type Resp = { empresas: Empresa[]; totais: { empresas: number; usuarios: number; faturamento: number; ativos: number }; precos?: { superadmin: number; acesso: number }; lgpd?: LgpdRow[] };
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
type Aba = "visao" | "empresas" | "produtos" | "cupons" | "vendas" | "permissoes" | "config" | "documentos";
type LgpdRow = { id: string; user_id?: string | null; email: string | null; nome: string | null; empresa_id: string | null; empresaNome?: string | null; aceito_em: string; versao: string | null; user_agent?: string | null };

const PRECO_SUPERADMIN = 79.9; // R$ por administrador da empresa
const PRECO_ACESSO = 39.9;     // R$ por acesso (funcionário)
const AREAS = [
  { k: "financas", l: "Finanças", Icon: DollarSign },
  { k: "saude", l: "Cliente", Icon: HeartPulse },
  { k: "comercial", l: "Comercial", Icon: ShoppingCart },
  { k: "marketing", l: "Marketing", Icon: Megaphone },
  { k: "estoque", l: "Estoque", Icon: Package },
];
type Acesso = { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null; cortado?: boolean };
type NovoCliente = { nomeEmpresa: string; cnpj: string; responsavel: string; emailResp: string; funcionarios: { nome: string; email: string }[] };

// Dados de demonstração — usados quando o Supabase não está configurado (localhost),
// pra você visualizar/ajustar a tela sem precisar de login.
const DEMO_RESP: Resp = {
  empresas: [
    { id: "demo-araguaia", nome: "Colégio Araguaia", segmento: "Educação", criado_em: "2026-06-29T12:00:00Z", saldo_inicial: 0, dono_id: "d1", dono: { id: "d1", nome: "Secretaria Araguaia", email: "secretaria@colegioaraguaia.com.br" }, acessoCortado: false, plano: "1 Super Admin + 1 Acesso", valor: 119.8, slug: "colegioaraguaia", cnpj: "33.364.563/0001-18", cidade: "Aparecida de Goiânia", estado: "GO", logo_url: null, cor: "#E11D48", nLanc: 24, nCli: 8, nFunc: 3 },
    { id: "demo-metricas", nome: "Metricas", segmento: null, criado_em: "2026-06-29T09:00:00Z", saldo_inicial: 0, dono_id: "d2", dono: { id: "d2", nome: "Minhas Métricas", email: "minhasmetricas@gmail.com" }, acessoCortado: false, plano: null, valor: 0, slug: "metricas", cnpj: null, cidade: "Itajaí", estado: "SC", logo_url: null, cor: null, nLanc: 0, nCli: 0, nFunc: 0 },
    { id: "demo-jp", nome: "JP Contabilidade", segmento: "Serviços", criado_em: "2026-06-20T10:00:00Z", saldo_inicial: 0, dono_id: "d3", dono: { id: "d3", nome: "João Pedro", email: "jp@gmail.com" }, acessoCortado: false, plano: "1 Super Admin + 2 Acessos", valor: 199.6, slug: "jp", cnpj: "12.345.678/0001-90", cidade: "Goiânia", estado: "GO", logo_url: null, cor: "#16A34A", nLanc: 51, nCli: 14, nFunc: 5 },
    { id: "demo-walk", nome: "Walk Store", segmento: "Comércio", criado_em: "2026-05-26T08:00:00Z", saldo_inicial: 0, dono_id: "d4", dono: { id: "d4", nome: "Pedro Walk", email: "pedro@gmail.com" }, acessoCortado: true, plano: "1 Super Admin", valor: 79.9, slug: "walk", cnpj: null, cidade: "São Paulo", estado: "SP", logo_url: null, cor: null, nLanc: 9, nCli: 3, nFunc: 1 },
  ],
  totais: { empresas: 4, usuarios: 11, faturamento: 399.3, ativos: 3 },
  precos: { superadmin: 79.9, acesso: 39.9 },
};

export default function Admin() {
  const router = useRouter();
  const { theme, toggleTheme, setTheme } = useBrand();
  // Admin abre no tema claro por padrão (a não ser que o usuário já tenha escolhido um).
  useEffect(() => { if (typeof window !== "undefined" && !localStorage.getItem("fin_theme")) setTheme("light"); }, [setTheme]);
  const [demo, setDemo] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [estado, setEstado] = useState<"carregando" | "semlogin" | "negado" | "ok" | "erro">("carregando");
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verLink, setVerLink] = useState<{ nome: string; link: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
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
  const [acessosMap, setAcessosMap] = useState<Record<string, Acesso[]>>({});   // acessos por empresa, p/ mostrar no Responsável
  const [precoForm, setPrecoForm] = useState<{ sa: string; ac: string } | null>(null);
  const [salvPreco, setSalvPreco] = useState(false);
  const [novo, setNovo] = useState<NovoCliente | null>(null);
  const [salvNovo, setSalvNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState("");
  // login embutido no próprio /admin (não redireciona para /login)
  const [logEmail, setLogEmail] = useState("");
  const [logSenha, setLogSenha] = useState("");
  const [logErro, setLogErro] = useState("");
  const [logBusy, setLogBusy] = useState(false);
  const [logVer, setLogVer] = useState(false);
  const [buscaLgpd, setBuscaLgpd] = useState("");
  const [lgpdDet, setLgpdDet] = useState<LgpdRow | null>(null);

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
  async function entrarAdmin(ev: React.FormEvent) {
    ev.preventDefault();
    if (!supabase) return;
    setLogErro(""); setLogBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: logEmail.trim(), password: logSenha });
    setLogBusy(false);
    if (error) { setLogErro("E-mail ou senha incorretos."); return; }
    setLogSenha(""); setEstado("carregando"); await carregar();
  }
  useEffect(() => { if (data?.precos) setPrecoForm({ sa: String(data.precos.superadmin), ac: String(data.precos.acesso) }); }, [data]);
  // Ao abrir o detalhe de uma empresa, já carrega a equipe dela.
  useEffect(() => { if (detalheId) selecionarEmpresa(detalheId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [detalheId]);
  // sempre que os acessos de uma empresa carregam, guarda no mapa p/ exibir na coluna Responsável
  useEffect(() => { if (permEmpresa && acessos) setAcessosMap((m) => ({ ...m, [permEmpresa]: acessos })); }, [permEmpresa, acessos]);
  // ao carregar as empresas, busca os acessos de cada uma (p/ mostrar controles por acesso)
  useEffect(() => {
    if (demo || !supabase || !data?.empresas?.length) return;
    let vivo = true;
    (async () => {
      const h = await tokenH();
      for (const e of (data?.empresas ?? [])) {
        try { const res = await fetch(`/api/admin?empresaId=${e.id}`, { headers: h }); if (res.ok && vivo) { const j = await res.json(); setAcessosMap((m) => ({ ...m, [e.id]: (j.acessos as Acesso[]) || [] })); } } catch { /* ignore */ }
      }
    })();
    return () => { vivo = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [data?.empresas?.length]);
  // ação em UM acesso (ativar/desativar, reenviar, remover) + recarrega os acessos da empresa
  async function acaoAcesso(empresaId: string, action: string, userId: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    if (demo) {
      setAcessosMap((m) => {
        let arr = (m[empresaId] || []).map((a) => a.id === userId ? { ...a, cortado: action === "cortar" ? true : action === "restaurar" ? false : a.cortado } : a);
        if (action === "acesso-remover") arr = arr.filter((a) => a.id !== userId);
        return { ...m, [empresaId]: arr };
      });
      return;
    }
    if (!supabase) return;
    setBusy(userId);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action, userId }) });
      if (res.ok) {
        const r = await fetch(`/api/admin?empresaId=${empresaId}`, { headers: await tokenH() });
        if (r.ok) { const j = await r.json(); setAcessosMap((m) => ({ ...m, [empresaId]: (j.acessos as Acesso[]) || [] })); }
      }
    } catch { /* ignore */ }
    setBusy(null);
  }
  // Ver painel entrando como UM usuário específico (abre o modal com o link mágico).
  async function verPainelAcesso(userId: string, nome: string) {
    if (demo) { setVerLink({ nome, link: `${window.location.origin}/dashboard/home` }); return; }
    if (!supabase) return;
    setBusy(userId);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-acessar", userId }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.link) setVerLink({ nome, link: j.link as string });
    } catch { /* ignore */ }
    setBusy(null);
  }

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
  async function salvarDados(empresaId: string, patch: { nomeEmpresa?: string; cnpj?: string; segmento?: string; cidade?: string; estado?: string; responsavel?: string; email?: string; logo?: string }) {
    const aplicar = (emp: Empresa): Empresa => ({
      ...emp,
      ...(patch.nomeEmpresa !== undefined ? { nome: patch.nomeEmpresa } : {}),
      ...(patch.cnpj !== undefined ? { cnpj: patch.cnpj || null } : {}),
      ...(patch.segmento !== undefined ? { segmento: patch.segmento || null } : {}),
      ...(patch.cidade !== undefined ? { cidade: patch.cidade || null } : {}),
      ...(patch.estado !== undefined ? { estado: patch.estado || null } : {}),
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
  // Gera o link mágico para visualizar o painel da empresa sem login (abrir em aba anônima).
  async function verPainel(e: Empresa) {
    if (demo) { setVerLink({ nome: e.nome, link: `${window.location.origin}/dashboard/home` }); return; }
    setBusy("ver-" + e.id);
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acessar", empresaId: e.id }) });
    setBusy(null);
    if (!res.ok) { window.alert("Não consegui gerar o acesso agora."); return; }
    const j = await res.json();
    setVerLink({ nome: e.nome, link: j.link as string });
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
  // Cria e envia UM acesso de funcionário (usado pelas linhas "+", uma por funcionário).
  async function criarAcessoDireto(d: { nome: string; email: string; areas: string[] }): Promise<boolean> {
    if (!permEmpresa || !d.email.includes("@")) return false;
    if (demo) {
      setAcessos((a) => [...(a ?? []), { id: "demo-novo-" + Date.now(), nome: d.nome || d.email, email: d.email, papel: "colaborador", areas: d.areas }]);
      return true;
    }
    if (!supabase) return false;
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-criar", empresaId: permEmpresa, nome: d.nome, email: d.email, areas: d.areas }) });
    if (!res.ok) return false;
    await selecionarEmpresa(permEmpresa);
    return true;
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
  if (estado === "semlogin" || estado === "negado") {
    return (
      <Casca>
        <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 20 }}>
          <form onSubmit={entrarAdmin} className="adm-login">
            <div className="adm-brand" style={{ justifyContent: "center", marginBottom: 6 }}><img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" style={{ height: 50, width: "auto", maxWidth: "88%", objectFit: "contain" }} /></div>
            <h2 style={{ textAlign: "center", margin: "6px 0 2px" }}>Área do Super Admin</h2>
            <p className="adm-sub" style={{ textAlign: "center", marginBottom: 18 }}>Entre com a conta de administrador.</p>
            {estado === "negado" && <div className="adm-login-msg">Essa conta não é Super Admin. Entre com a conta de administrador.</div>}
            {logErro && <div className="adm-login-msg err">{logErro}</div>}
            <label className="adm-login-l">E-mail</label>
            <input className="adm-login-i" type="email" value={logEmail} onChange={(e) => setLogEmail(e.target.value)} placeholder="admin@empresa.com" required autoFocus />
            <label className="adm-login-l">Senha</label>
            <div style={{ position: "relative" }}>
              <input className="adm-login-i" type={logVer ? "text" : "password"} value={logSenha} onChange={(e) => setLogSenha(e.target.value)} required style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setLogVer((v) => !v)} title={logVer ? "Ocultar" : "Mostrar"} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, cursor: "pointer", color: "#9aa0a6", display: "grid", placeItems: "center" }}>{logVer ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            <button className="adm-btn" type="submit" disabled={logBusy} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{logBusy ? "Entrando…" : "Entrar"}</button>
          </form>
        </div>
      </Casca>
    );
  }
  if (estado === "erro") return <Casca><Aviso titulo="Ops" texto="Não consegui carregar. Tente novamente em instantes." botao={carregar} botaoTxt="Tentar de novo" botao2={entrarComOutra} botao2Txt="Entrar com outra conta" /></Casca>;

  const t = data?.totais;
  const precos = data?.precos ?? { superadmin: PRECO_SUPERADMIN, acesso: PRECO_ACESSO };
  const qLgpd = buscaLgpd.trim().toLowerCase();
  const lgpdLista = (data?.lgpd ?? []).filter((r) => !qLgpd
    || (r.nome || "").toLowerCase().includes(qLgpd)
    || (r.email || "").toLowerCase().includes(qLgpd)
    || (r.empresaNome || "").toLowerCase().includes(qLgpd));
  const NAV: { k: Aba; label: string; Icon: typeof Building2 }[] = [
    { k: "visao", label: "Visão geral", Icon: LayoutDashboard },
    { k: "empresas", label: "Empresas", Icon: Building2 },
    { k: "documentos", label: "Documentos (LGPD)", Icon: FileText },
  ];

  const detalhe = detalheId ? (data?.empresas.find((e) => e.id === detalheId) ?? null) : null;
  // A empresa "Metricas" (conta minhasmetricas@gmail.com) é o modelo: é dela que
  // as outras devem herdar. Aqui só a marcamos; a herança em si é decisão à parte.
  const ehPadrao = (e: Empresa) => (e.dono?.email || "").toLowerCase() === "minhasmetricas@gmail.com";

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
          <div className="adm-brand"><img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" style={{ height: 40, width: "auto", maxWidth: "100%", objectFit: "contain" }} /></div>
          <nav className="adm-nav">
            {NAV.map(({ k, label, Icon }) => (
              <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}><Icon size={18} /> {label}</button>
            ))}
          </nav>
          <div className="adm-side-foot">
            <button onClick={entrarComOutra}><LogOut size={15} /> Sair</button>
          </div>
        </aside>

        <main className="adm-main">
          <>

          {aba === "visao" && (
            <>
              <h1>Visão geral do negócio</h1>
              <div className="adm-kpis" style={{ marginTop: 18 }}>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(16,185,129,.16)", color: "#10B981" }}><DollarSign size={20} /></span><div><b style={{ fontSize: 15, fontStyle: "italic", color: "var(--muted, #9aa0a6)" }}>Integrar com Stripe</b><small>Faturamento (planos)</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><Building2 size={20} /></span><div><b>{t?.empresas ?? 0}</b><small>Clientes</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(139,92,246,.16)", color: "#8b5cf6" }}><Users size={20} /></span><div><b>{t?.ativos ?? 0}</b><small>Acessos ativos</small></div></div>
              </div>
              <h3 className="adm-h3">Últimos clientes</h3>
              <div className="adm-tablewrap">
                <table className="adm-table">
                  <thead><tr><th>Empresa</th><th>E-mail de acesso</th><th>Plano</th><th>Criada</th></tr></thead>
                  <tbody>
                    {data?.empresas.slice(0, 6).map((e) => (
                      <tr key={e.id}>
                        <td><b>{e.nome}</b>{ehPadrao(e) && <span className="adm-badge-padrao">Padrão</span>}</td>
                        <td className="adm-sub">{e.dono?.email || "—"}</td>
                        <td><span className="adm-sub" style={{ fontStyle: "italic" }}>Integrar com Stripe</span></td>
                        <td className="adm-sub">{dataHoraBR(e.criado_em)}</td>
                      </tr>
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
                  <thead><tr><th>Criada</th><th>Empresa</th><th>Responsável</th><th style={{ textAlign: "center" }}>Acesso</th><th style={{ textAlign: "center" }}>Ações</th><th>Plano</th></tr></thead>
                  <tbody>
                    {data?.empresas.map((e) => {
                      type P = { key: string; nome: string; email: string | null; dono: boolean; cortado: boolean; toggle: () => void; verP: () => void; reenviar: () => void; trash: (() => void) | null };
                      const confExcluir = `Excluir a empresa "${e.nome}"? Isso apaga a empresa, o login e todos os dados dela. Não dá para desfazer.`;
                      const donoP: P | null = e.dono ? {
                        key: "d-" + e.id, nome: e.dono.nome || "—", email: e.dono.email, dono: true, cortado: e.acessoCortado,
                        toggle: () => e.dono_id && acao(e.acessoCortado ? "restaurar" : "cortar", { userId: e.dono_id }),
                        verP: () => verPainel(e), reenviar: () => reenviarAcesso(e),
                        trash: ehPadrao(e) ? null : () => acao("excluir", { empresaId: e.id }, confExcluir),
                      } : null;
                      const colabs: P[] = (acessosMap[e.id] || []).filter((a) => a.papel !== "dono" && a.email !== e.dono?.email).map((a) => ({
                        key: a.id, nome: a.nome || a.email || "usuário", email: a.email, dono: false, cortado: !!a.cortado,
                        toggle: () => acaoAcesso(e.id, a.cortado ? "restaurar" : "cortar", a.id),
                        verP: () => verPainelAcesso(a.id, a.nome || a.email || "usuário"),
                        reenviar: () => acaoAcesso(e.id, "acesso-reenviar", a.id),
                        trash: () => acaoAcesso(e.id, "acesso-remover", a.id, `Remover o acesso de ${a.nome || a.email}?`),
                      }));
                      const pessoas: P[] = donoP ? [donoP, ...colabs] : colabs;
                      const linha: React.CSSProperties = { minHeight: 48, display: "flex", alignItems: "center", padding: "6px 0" };
                      const spacer = <span style={{ width: 30, height: 30, display: "inline-block", flexShrink: 0 }} />;
                      return (
                      <tr key={e.id}>
                        <td className="adm-sub" style={{ verticalAlign: "top", paddingTop: 16 }}>{dataBR(e.criado_em)}</td>
                        <td style={{ verticalAlign: "top", paddingTop: 16 }}><b>{e.nome}</b></td>
                        <td style={{ verticalAlign: "top" }}>
                          {pessoas.length ? pessoas.map((p, i) => (
                            <div key={p.key} style={{ ...linha, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", borderTop: i ? "1px solid var(--line-2, #2a2a2a)" : undefined }}>
                              <div style={{ textDecoration: p.cortado ? "line-through" : "none", opacity: p.cortado ? .55 : 1 }}>{p.nome}</div>
                              <div className="adm-sub">{p.email}</div>
                            </div>
                          )) : <span className="adm-sub">—</span>}
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "top" }}>
                          {pessoas.map((p, i) => (
                            <div key={p.key} style={{ ...linha, justifyContent: "center", borderTop: i ? "1px solid var(--line-2, #2a2a2a)" : undefined }}>
                              <button type="button" className={"adm-switch" + (p.cortado ? "" : " on")} disabled={!!busy || (p.dono && !e.dono_id)} title={p.cortado ? "Ativar acesso" : "Desativar acesso"} onClick={p.toggle}><span className="adm-switch-knob" /></button>
                            </div>
                          ))}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          {pessoas.map((p, i) => (
                            <div key={p.key} style={{ ...linha, justifyContent: "center", gap: 6, borderTop: i ? "1px solid var(--line-2, #2a2a2a)" : undefined }}>
                              <button className="adm-btn sm adm-ic" disabled={!!busy} title="Ver painel" onClick={p.verP}><Eye size={16} /></button>
                              <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Reenviar acesso por e-mail" onClick={p.reenviar}><Send size={16} /></button>
                              {p.dono ? (
                                <>
                                  <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Editar cadastro da empresa" onClick={() => abrirEdicao(e)}><Pencil size={16} /></button>
                                  <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Adicionar acesso (novo usuário)" onClick={() => selecionarEmpresa(e.id)}><UserPlus size={16} /></button>
                                </>
                              ) : (
                                <>
                                  <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Editar / gerenciar este acesso" onClick={() => selecionarEmpresa(e.id)}><Pencil size={16} /></button>
                                  {spacer}
                                </>
                              )}
                              {p.trash ? <button className="adm-btn sm danger adm-ic" disabled={!!busy} title={p.dono ? "Excluir empresa" : "Remover acesso"} onClick={p.trash}><Trash2 size={16} /></button> : spacer}
                            </div>
                          ))}
                        </td>
                        <td style={{ verticalAlign: "top", paddingTop: 16 }}><span className="adm-sub" style={{ fontStyle: "italic" }}>Integrar com Stripe</span></td>
                      </tr>
                      );
                    })}
                    {!data?.empresas.length && <tr><td colSpan={8} className="adm-sub" style={{ textAlign: "center", padding: 30 }}>Nenhuma empresa cadastrada ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === "produtos" && <AdminProdutos />}

          {aba === "cupons" && <AdminCupons />}

          {aba === "documentos" && (
            <>
              <div className="adm-headrow">
                <div>
                  <h1>Documentos · Consentimentos LGPD</h1>
                  <p className="adm-sub" style={{ marginTop: 4 }}>Registro de quem aceitou a proteção de dados ao entrar na plataforma. {(data?.lgpd?.length ?? 0)} aceite(s).</p>
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9aa0a6" }} />
                  <input value={buscaLgpd} onChange={(e) => setBuscaLgpd(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa…"
                    style={{ width: 320, maxWidth: "60vw", padding: "10px 12px 10px 34px", borderRadius: 12, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", color: "inherit", fontSize: 13.5, outline: "none" }} />
                </div>
              </div>
              {(!data?.lgpd || data.lgpd.length === 0) ? (
                <div className="adm-card" style={{ padding: 22 }}>Nenhum consentimento registrado ainda. Assim que os usuários aceitarem a LGPD no app, os registros aparecem aqui.</div>
              ) : (
                <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
                  <table className="adm-table">
                    <thead><tr><th>Nome</th><th>E-mail</th><th>Empresa</th><th>Aceito em</th><th>Versão</th><th colSpan={2}></th></tr></thead>
                    <tbody>
                      {lgpdLista.map((r) => (
                        <tr key={r.id}>
                          <td>{r.nome || "—"}</td>
                          <td>{r.email || "—"}</td>
                          <td>{r.empresaNome || "—"}</td>
                          <td className="mono">{dataHoraBR(r.aceito_em)}</td>
                          <td>{r.versao || "1.0"}</td>
                          <td style={{ textAlign: "right", paddingRight: 4 }}>
                            <button className="adm-btn sm ghost adm-ic" title="Ver todos os dados deste aceite" onClick={() => setLgpdDet(r)}><Info size={15} /></button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="adm-btn sm danger adm-ic" disabled={!!busy} title="Remover este registro" onClick={() => acao("lgpd-remover", { lgpdId: r.id }, `Remover o registro de consentimento de "${r.nome || r.email || "—"}"?`)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                      {lgpdLista.length === 0 && <tr><td colSpan={7} className="adm-sub" style={{ textAlign: "center", padding: 26 }}>Nenhum resultado para “{buscaLgpd}”.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
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
        </main>
      </div>

      {lgpdDet && (
        <div className="adm-modalbg" onClick={() => setLgpdDet(null)}>
          <div className="adm-modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><FileText size={18} /> Dados do consentimento</h2>
            <p className="adm-sub" style={{ marginTop: 4, marginBottom: 14 }}>Tudo o que registramos sobre este aceite da LGPD.</p>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["Nome", lgpdDet.nome || "—"],
                ["E-mail", lgpdDet.email || "—"],
                ["Empresa", lgpdDet.empresaNome || "—"],
                ["Aceito em", dataHoraBR(lgpdDet.aceito_em)],
                ["Versão do termo", lgpdDet.versao || "1.0"],
                ["Dispositivo / navegador", lgpdDet.user_agent || "—"],
                ["ID do usuário", lgpdDet.user_id || "—"],
                ["ID do registro", lgpdDet.id],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, alignItems: "start", borderBottom: "1px solid var(--line,#222)", paddingBottom: 10 }}>
                  <span className="adm-sub" style={{ fontWeight: 700 }}>{k}</span>
                  <span style={{ wordBreak: "break-word", fontSize: 13.5 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="adm-btn ghost" onClick={() => setLgpdDet(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {verLink && (
        <div className="adm-modalbg" onClick={() => { setVerLink(null); setCopiado(false); }}>
          <div className="adm-modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={18} /> Ver painel · {verLink.nome}</h2>
            <p className="adm-sub" style={{ marginTop: 6, lineHeight: 1.55 }}>Copie o link abaixo e cole numa <b>aba anônima</b> (Ctrl+Shift+N no Chrome). Você entra direto no painel da empresa, sem login nem senha. O link vale por cerca de 1 hora.</p>
            <input readOnly value={verLink.link} onFocus={(ev) => ev.currentTarget.select()} style={{ width: "100%", marginTop: 14, padding: "11px 12px", fontSize: 12.5, borderRadius: 10, border: "1px solid var(--line-2, #2a2a2a)", background: "var(--card-2, #0d0d0d)", color: "inherit" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="adm-btn" style={{ flex: 1, justifyContent: "center" }} onClick={async () => { try { await navigator.clipboard.writeText(verLink.link); setCopiado(true); window.setTimeout(() => setCopiado(false), 2000); } catch { /* ignore */ } }}>{copiado ? "✅ Copiado!" : "Copiar link"}</button>
              <button className="adm-btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setVerLink(null); setCopiado(false); }}>Fechar</button>
            </div>
            <p className="adm-sub" style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.5, opacity: .85 }}>Dica: use aba anônima para não desconectar você da conta de administrador. Nessa visualização você entra como a empresa (acesso total).</p>
          </div>
        </div>
      )}

      {form && (
        <div className="adm-modalbg" onClick={() => !salvando && setForm(null)}>
          <form className="adm-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={salvar}>
            <div className="adm-mhead"><h3>{form.editId ? "Editar empresa" : "Cadastrar novo cliente"}</h3><button type="button" onClick={() => setForm(null)}><X size={18} /></button></div>
            {erroForm && <div className="adm-erro">{erroForm}</div>}
            <div className="adm-grid2">
              <L label="Nome da empresa"><input value={form.nomeEmpresa} onChange={(ev) => setForm({ ...form, nomeEmpresa: ev.target.value })} required /></L>
              <L label="CNPJ (opcional)"><input value={form.cnpj} onChange={(ev) => setForm({ ...form, cnpj: mascaraCnpj(ev.target.value) })} placeholder="00.000.000/0000-00" inputMode="numeric" /></L>
              <L label="Responsável"><input value={form.responsavel} onChange={(ev) => setForm({ ...form, responsavel: ev.target.value })} /></L>
              <L label="E-mail do responsável"><input type="email" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} required /></L>
              <L label={form.editId ? "Nova senha (em branco = manter)" : "Senha de acesso"}><input type="text" value={form.senha} onChange={(ev) => setForm({ ...form, senha: ev.target.value })} required={!form.editId} minLength={6} placeholder={form.editId ? "deixe em branco p/ manter" : "mín. 6 caracteres"} /></L>
              <L label="Endereço da página (slug)"><input value={form.slug} onChange={(ev) => setForm({ ...form, slug: ev.target.value })} placeholder="auto pelo nome" /></L>
            </div>
            <button className="adm-btn" type="submit" disabled={salvando} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{salvando ? "Salvando…" : form.editId ? "Salvar alterações" : "Cadastrar cliente"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>Página em <b>minhasmetricas.com/{form.slug || "(nome)"}</b>.</p>
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
            <div className="adm-valor" style={{ marginTop: 14 }}>Plano: <b>{brl(precos.superadmin)}/mês</b> <span>(1 Super Admin)</span></div>
            <button className="adm-btn" type="submit" disabled={salvNovo} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{salvNovo ? "Cadastrando…" : "Cadastrar cliente"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>O responsável recebe um e-mail para <b>criar a senha</b> e acessar.</p>
          </form>
        </div>
      )}

      {permEmpresa && (() => {
        const emp = data?.empresas.find((x) => x.id === permEmpresa);
        return (
          <div className="adm-modalbg" onClick={() => setPermEmpresa("")}>
            <div className="adm-modal" onClick={(ev) => ev.stopPropagation()}>
              <div className="adm-mhead"><h3>Acessos · {emp?.nome || "empresa"}</h3><button type="button" onClick={() => setPermEmpresa("")}><X size={18} /></button></div>
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {acessos === null ? <p className="adm-sub">Carregando…</p>
                  : acessos.length === 0 ? <p className="adm-sub">Nenhum acesso ainda.</p>
                  : acessos.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2, #2a2a2a)", background: "var(--card-2, #0d0d0d)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.nome || a.email} {a.papel === "dono" && <span className="adm-sub" style={{ fontWeight: 700 }}>(Super Admin)</span>}</div>
                        <div className="adm-sub" style={{ fontSize: 12 }}>{a.email}</div>
                      </div>
                      {a.papel !== "dono" && <button className="adm-btn sm danger adm-ic" title="Remover acesso" onClick={() => removerAcesso(a.id)}><Trash2 size={14} /></button>}
                    </div>
                  ))}
              </div>
              {erroAcesso && <div className="adm-erro">{erroAcesso}</div>}
              {okAcesso && <div className="adm-sub" style={{ color: "#16a34a", fontWeight: 700, marginBottom: 10 }}>{okAcesso}</div>}
              <div className="adm-grid2">
                <L label="Nome (opcional)"><input value={novoAcesso.nome} onChange={(ev) => setNovoAcesso({ ...novoAcesso, nome: ev.target.value })} placeholder="Nome do usuário" /></L>
                <L label="E-mail de acesso"><input type="email" value={novoAcesso.email} onChange={(ev) => setNovoAcesso({ ...novoAcesso, email: ev.target.value })} placeholder="email@empresa.com" /></L>
              </div>
              <button className="adm-btn" onClick={criarAcesso} disabled={salvAcesso} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}><UserPlus size={15} /> {salvAcesso ? "Criando…" : "Adicionar acesso"}</button>
              <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>O novo usuário recebe um e-mail para <b>criar a senha</b> e acessar.</p>
            </div>
          </div>
        );
      })()}
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
.adm-badge-padrao{margin-left:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:99px;color:#1AADE2;border:1px solid #1AADE255;background:#1AADE214;vertical-align:middle}
.adm-btn{display:inline-flex;align-items:center;gap:7px;background:#1AADE2;color:#06222e;border:0;border-radius:99px;padding:10px 16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit}
.adm-btn:hover{filter:brightness(1.08)}
.adm-btn:disabled{opacity:.5;cursor:default}
.adm-btn.sm{padding:6px 11px;font-size:12.5px;font-weight:700}
.adm-btn.adm-ic{padding:8px;border-radius:10px;line-height:0}
.adm-login{width:100%;max-width:380px;background:#121212;border:1px solid #222;border-radius:20px;padding:30px 28px}
body.theme-light .adm-login{background:#fff;border-color:rgba(0,0,0,.08);box-shadow:0 10px 40px -12px rgba(0,0,0,.15)}
.adm-login-l{display:block;font-size:12.5px;font-weight:700;color:#9aa0a6;margin:12px 0 6px}
.adm-login-i{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:12px;padding:13px 14px;color:#f4f5f7;font-size:15px;font-family:inherit;outline:none}
body.theme-light .adm-login-i{background:#f4f4f5;border-color:rgba(0,0,0,.1);color:#18181b}
.adm-login-i:focus{border-color:#1AADE2}
.adm-login-msg{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#EF4444;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;margin-bottom:6px}
.adm-login-msg.err{background:rgba(239,68,68,.12)}
.adm-btn.ghost{background:#161616;border:1px solid #333;color:#f4f5f7}
.adm-btn.ghost:hover{border-color:#1AADE2;filter:none}
.adm-btn.warn{background:#2a1d10;border:1px solid #6b4e1f;color:#F59E0B}
.adm-btn.danger{background:color-mix(in srgb,#EF4444 12%,transparent);border:1px solid color-mix(in srgb,#EF4444 34%,transparent);color:#EF4444}
.adm-btn.danger:hover{background:color-mix(in srgb,#EF4444 20%,transparent)}
.adm-perms{display:grid;gap:12px;margin-top:18px;max-width:660px}
.adm-perm{display:flex;gap:14px;background:#121212;border:1px solid #222;border-radius:14px;padding:18px}
.adm-pico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.adm-perm b{font-size:15.5px}.adm-perm p{color:#9aa0a6;font-size:13.5px;line-height:1.5;margin-top:4px}
.adm-sel{background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:10px;padding:11px 12px;font-size:14px;font-family:inherit;width:100%;max-width:480px}
.adm-sel:focus{outline:0;border-color:#1AADE2}
.adm-acgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
.adm-acbox{background:#121212;border:1px solid #222;border-radius:16px;padding:20px}
.adm-areas{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.adm-area{display:inline-flex;align-items:center;gap:6px;background:#161616;border:1px solid #2a2a2a;color:#cfd3d8;border-radius:99px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .12s}
.adm-area svg{opacity:.75}
.adm-area:hover:not(:disabled){border-color:#3a3a3a}
.adm-area.on{background:#16242b;border-color:#1AADE2;color:#1AADE2}
.adm-area.on svg{opacity:1}
.adm-area:disabled{cursor:default;opacity:.85}

/* Equipe & Acessos — card redesenhado */
.adm-eqp-card{display:flex;flex-direction:column}
.adm-eqp-super{display:flex;align-items:center;gap:13px;background:linear-gradient(135deg,rgba(26,173,226,.13),rgba(26,173,226,.03));border:1px solid rgba(26,173,226,.32);border-radius:14px;padding:14px 15px;margin-bottom:20px}
.adm-eqp-super-ico{width:40px;height:40px;border-radius:11px;flex-shrink:0;display:grid;place-items:center;background:#1AADE2;color:#04141c}
.adm-eqp-super-txt{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.adm-eqp-tag{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1AADE2}
.adm-eqp-super-txt b{font-size:15px;line-height:1.25}
.adm-eqp-super-mail{font-size:12.5px;color:#9aa0a6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adm-eqp-super-badge{flex-shrink:0;background:#10331f;border:1px solid #1d5b32;color:#7be3a4;font-size:11px;font-weight:700;padding:5px 10px;border-radius:99px}
.adm-eqp-sec{margin-top:6px}
.adm-eqp-sec + .adm-eqp-sec{margin-top:22px;border-top:1px solid #1d1d1d;padding-top:18px}
.adm-eqp-emp{background:#0e0e0e;border:1px solid #232323;border-radius:14px;padding:14px;margin-bottom:12px;display:flex;flex-direction:column;gap:10px;transition:border-color .15s}
.adm-eqp-emp:focus-within{border-color:#1AADE2}
.adm-eqp-emp.enviado{border-color:#1d5b32;background:#0c1610}
.adm-eqp-emp-top{display:flex;align-items:center;gap:9px}
.adm-eqp-emp-n{flex-shrink:0;width:22px;height:22px;border-radius:7px;background:#1c1c1c;color:#9aa0a6;font-size:12px;font-weight:800;display:grid;place-items:center}
.adm-eqp-inp{flex:1;width:100%;background:#0f0f0f;border:1px solid #2a2a2a;color:#f4f5f7;border-radius:9px;padding:9px 11px;font-size:14px;font-family:inherit}
.adm-eqp-inp:focus{outline:0;border-color:#1AADE2}
.adm-eqp-inp:disabled{opacity:.7}
.adm-eqp-x{flex-shrink:0;width:30px;height:30px;border-radius:8px;border:1px solid #2a2a2a;background:#161616;color:#9aa0a6;cursor:pointer;display:grid;place-items:center}
.adm-eqp-x:hover{color:#EF4444;border-color:#6b1f1f}
.adm-eqp-emp-foot{display:flex;justify-content:flex-end;margin-top:2px}
.adm-eqp-send{display:inline-flex;align-items:center;gap:7px;background:none;border:0;color:#1AADE2;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;padding:4px 2px}
.adm-eqp-send:hover:not(:disabled){text-decoration:underline}
.adm-eqp-send:disabled{color:#5a5f64;cursor:default}
.adm-eqp-sent{display:inline-flex;align-items:center;gap:6px;color:#7be3a4;font-size:12.5px;font-weight:700}
.adm-eqp-add{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;background:none;border:1.5px dashed #2f2f2f;color:#cfd3d8;border-radius:12px;padding:12px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .12s}
.adm-eqp-add:hover{border-color:#1AADE2;color:#1AADE2;background:rgba(26,173,226,.05)}
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
