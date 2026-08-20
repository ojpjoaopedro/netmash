"use client";
/**
 * Painel interno (superadmin): gestão de empresas/clientes, usuários e acessos
 * da plataforma. NÃO é a tela do cliente (essa fica em minhasmetricas/page.tsx).
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Trash2, LogOut, Plus, X, DollarSign,
  LayoutDashboard, Pencil, Eye, EyeOff, Send, UserPlus,
  FileText, Search, Info, ImageIcon, Copy, ExternalLink, Check, Bell,
  Code2, BookOpen, Database, KeyRound, Megaphone, Wallet, Percent, Target,
  ShoppingCart, RotateCw, CircleAlert, Clock3,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { dataBR, dataHoraBR, brl, mascararCPF } from "@/lib/format";
import { PRECO_SUPERADMIN, PRECO_ACESSO } from "@/lib/precos";
import { NOTIFICACOES } from "@/lib/notificacoes";
import { useBrand } from "@/lib/brand";
import { enviarLogo } from "@/lib/imagem";

type Empresa = {
  id: string; nome: string; segmento: string | null; criado_em: string; saldo_inicial: number;
  dono_id: string | null; dono: { id: string; nome: string | null; email: string | null } | null;
  acessoCortado: boolean; plano: string | null; valor: number; slug: string | null; cnpj: string | null;
  responsavel?: string | null; responsavel_cpf?: string | null; ultimo_acesso?: string | null;
  cidade: string | null; estado: string | null;
  logo_url: string | null; cor: string | null;
  planos: Record<string, boolean> | null;   // módulos ativos por empresa (folha, acesso2, planejamento)
};
type Resp = { empresas: Empresa[]; totais: { empresas: number; usuarios: number; faturamento: number; ativos: number }; precos?: { superadmin: number; acesso: number }; lgpd?: LgpdRow[]; catalogo?: Plano[]; imagemSuperadmin?: string | null; linkSuperadmin?: string | null; notificacoes?: Record<string, boolean>; precosWiven?: Record<string, { preco: number; primeiraCobranca: number | null; produto: string | null }> };
type Form = { editId: string | null; nomeEmpresa: string; responsavel: string; email: string; senha: string; cnpj: string; cpf: string; segmento: string; saldoInicial: string; qtdSuperadmins: string; qtdAcessos: string; logo: string; slug: string };

// catálogo de produtos (planos). Vem do banco (planos_catalogo); estes são o
// fallback quando a tabela ainda não existe. O Super Admin é o plano base (fixo).
type Plano = { chave: string; nome: string; descricao: string | null; preco: number; ordem?: number; imagem?: string | null; link_pagamento?: string | null };
const CATALOGO_PADRAO: Plano[] = [
  { chave: "folha", nome: "Folha de pagamento", descricao: "Salários, benefícios e encargos da equipe", preco: 39.9 },
  { chave: "acesso2", nome: "2º acesso", descricao: "Login adicional de administrador", preco: 9.9 },
  { chave: "planejamento", nome: "Planejamento estratégico", descricao: "Metas e pilares da empresa", preco: 29.9 },
];

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
type Aba = "visao" | "empresas" | "produtos" | "notificacoes" | "vendas" | "permissoes" | "config" | "documentos" | "docdev" | "marketing";
type VendaAdm = {
  id: string; identifier: string; criado_em: string; pago_em: string | null;
  nome: string | null; empresa: string | null; email: string; telefone: string | null;
  plano_chave: string; plano_nome: string | null; valor: number;
  status: string; origem: string | null; alerta: boolean; erro: string | null;
  empresa_id: string | null; user_id: string | null; wiven_transaction_id: string | null;
};
type TotaisVendas = { recebido: number; vendas: number; pendentes: number; reembolsos: number; chargebacks: number; clientes: number; alertas: number };
type VendasResp = { vendas: VendaAdm[]; totais: TotaisVendas; aviso?: string };
type FiltroVenda = "todas" | "pago" | "pendente" | "alerta";
type LgpdRow = { id: string; user_id?: string | null; email: string | null; nome: string | null; empresa_id: string | null; empresaNome?: string | null; aceito_em: string; versao: string | null; user_agent?: string | null; localizacao?: string | null };

type Acesso = { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null; cortado?: boolean };
type NovoCliente = { nomeEmpresa: string; cnpj: string; cpf: string; responsavel: string; emailResp: string; funcionarios: { nome: string; email: string }[]; planos: Record<string, boolean> };

// Dados de demonstração — usados quando o Supabase não está configurado (localhost),
// pra você visualizar/ajustar a tela sem precisar de login.
const DEMO_RESP: Resp = {
  empresas: [
    { id: "demo-araguaia", nome: "Colégio Araguaia", segmento: "Educação", criado_em: "2026-06-29T12:00:00Z", saldo_inicial: 0, dono_id: "d1", dono: { id: "d1", nome: "Secretaria Araguaia", email: "secretaria@colegioaraguaia.com.br" }, acessoCortado: false, plano: "1 Super Admin + 1 Acesso", valor: 119.8, slug: "colegioaraguaia", cnpj: "33.364.563/0001-18", cidade: "Aparecida de Goiânia", estado: "GO", logo_url: null, cor: "#E11D48", planos: { folha: true } },
    { id: "demo-metricas", nome: "Metricas", segmento: null, criado_em: "2026-06-29T09:00:00Z", saldo_inicial: 0, dono_id: "d2", dono: { id: "d2", nome: "Minhas Métricas", email: "minhasmetricas@gmail.com" }, acessoCortado: false, plano: null, valor: 0, slug: "metricas", cnpj: null, cidade: "Itajaí", estado: "SC", logo_url: null, cor: null, planos: {} },
    { id: "demo-jp", nome: "JP Contabilidade", segmento: "Serviços", criado_em: "2026-06-20T10:00:00Z", saldo_inicial: 0, dono_id: "d3", dono: { id: "d3", nome: "João Pedro", email: "jp@gmail.com" }, acessoCortado: false, plano: "1 Super Admin + 2 Acessos", valor: 199.6, slug: "jp", cnpj: "12.345.678/0001-90", cidade: "Goiânia", estado: "GO", logo_url: null, cor: "#16A34A", planos: { planejamento: true } },
    { id: "demo-walk", nome: "Walk Store", segmento: "Comércio", criado_em: "2026-05-26T08:00:00Z", saldo_inicial: 0, dono_id: "d4", dono: { id: "d4", nome: "Pedro Walk", email: "pedro@gmail.com" }, acessoCortado: true, plano: "1 Super Admin", valor: 79.9, slug: "walk", cnpj: null, cidade: "São Paulo", estado: "SP", logo_url: null, cor: null, planos: {} },
  ],
  totais: { empresas: 4, usuarios: 11, faturamento: 399.3, ativos: 3 },
  precos: { superadmin: PRECO_SUPERADMIN, acesso: PRECO_ACESSO },
};

// Vendas de exemplo (só aparecem no modo demonstração, sem Supabase).
const DEMO_VENDAS: VendasResp = {
  vendas: [
    { id: "v1", identifier: "mm_demo1", criado_em: "2026-08-16T14:20:00Z", pago_em: "2026-08-16T14:23:00Z", nome: "João Pedro", empresa: "JP Contabilidade", email: "jp@gmail.com", telefone: "(62) 99999-0001", plano_chave: "superadmin", plano_nome: "Minhas Métricas", valor: 79.9, status: "pago", origem: "api", alerta: false, erro: null, empresa_id: "demo-jp", user_id: "d3", wiven_transaction_id: "tx_demo1" },
    { id: "v2", identifier: "mm_demo2", criado_em: "2026-08-16T10:02:00Z", pago_em: null, nome: "Marina Alves", empresa: "Studio Marina", email: "marina@studio.com.br", telefone: "(11) 98888-0002", plano_chave: "superadmin", plano_nome: "Minhas Métricas", valor: 79.9, status: "pendente", origem: "link", alerta: false, erro: null, empresa_id: null, user_id: null, wiven_transaction_id: null },
    { id: "v3", identifier: "mm_demo3", criado_em: "2026-08-14T09:40:00Z", pago_em: "2026-08-14T09:41:00Z", nome: "Pedro Walk", empresa: "Walk Store", email: "pedro@gmail.com", telefone: "(11) 97777-0003", plano_chave: "folha", plano_nome: "Folha de pagamento", valor: 39.9, status: "reembolsado", origem: "api", alerta: true, erro: null, empresa_id: "demo-walk", user_id: "d4", wiven_transaction_id: "tx_demo3" },
  ],
  totais: { recebido: 79.9, vendas: 1, pendentes: 1, reembolsos: 1, chargebacks: 0, clientes: 1, alertas: 1 },
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
  const [filtroAcesso, setFiltroAcesso] = useState<"ativos" | "desativados">("ativos");   // filtro por status do acesso (Super Admin)
  const [verLink, setVerLink] = useState<{ nome: string; link: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aba, setAba] = useState<Aba>("visao");
  const [mktMes, setMktMes] = useState(0);   // mês selecionado na Análise de marketing
  const [mktAno, setMktAno] = useState(2026);   // ano selecionado na Análise de marketing
  const [mkt, setMkt] = useState<Record<string, Record<string, string>>>({});  // valores por mês, preenchidos à mão
  useEffect(() => {
    setMktMes(new Date().getMonth());
    try { const raw = localStorage.getItem("me_mkt"); if (raw) setMkt(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
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
  // Vendas (aba Vendas): compras feitas na landing /assinar, confirmadas pelo webhook da Wiven.
  const [vendas, setVendas] = useState<VendasResp | null>(null);
  const [vendaBusy, setVendaBusy] = useState<string | null>(null);
  const [filtroVenda, setFiltroVenda] = useState<FiltroVenda>("todas");
  const [buscaLgpd, setBuscaLgpd] = useState("");
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [confirmAcao, setConfirmAcao] = useState<{ titulo: string; texto: string; okTxt: string; onOk: () => void } | null>(null);   // popup de confirmação genérico
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
  // Editar nome/e-mail de um acesso (modal enxuto, estilo "Editar empresa").
  const [editAcesso, setEditAcesso] = useState<{ id: string; empresaId: string; nome: string; email: string } | null>(null);
  async function salvarEditAcesso() {
    if (!editAcesso) return;
    if (demo) {
      setAcessosMap((m) => ({ ...m, [editAcesso.empresaId]: (m[editAcesso.empresaId] || []).map((a) => a.id === editAcesso.id ? { ...a, nome: editAcesso.nome, email: editAcesso.email } : a) }));
      setEditAcesso(null); return;
    }
    if (!supabase) return;
    setBusy(editAcesso.id);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "acesso-editar", userId: editAcesso.id, nome: editAcesso.nome, email: editAcesso.email }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        const r = await fetch(`/api/admin?empresaId=${editAcesso.empresaId}`, { headers: await tokenH() });
        if (r.ok) { const jj = await r.json(); setAcessosMap((m) => ({ ...m, [editAcesso.empresaId]: (jj.acessos as Acesso[]) || [] })); }
        setEditAcesso(null);
      } else { window.alert(j.error || "Não consegui salvar."); }
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
  // liga/desliga um módulo (plano) de uma empresa, salvando no banco
  async function togglePlano(empresaId: string, planoKey: string, ativo: boolean) {
    setData((d) => d ? { ...d, empresas: d.empresas.map((e) => e.id === empresaId ? { ...e, planos: { ...(e.planos || {}), [planoKey]: ativo } } : e) } : d);
    if (demo || !supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "planos", empresaId, planoKey, ativo }) });
  }
  // Liga/desliga um tipo de notificação do cliente (seção Notificações).
  async function toggleNotif(chave: string, ligado: boolean) {
    setData((d) => d ? { ...d, notificacoes: { ...(d.notificacoes || {}), [chave]: ligado } } : d);
    if (demo || !supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "notif-toggle", notifChave: chave, notifLigado: ligado }) });
  }
  // cadastro de produto (plano) no catálogo
  const [novoProduto, setNovoProduto] = useState<{ nome: string; descricao: string; preco: string; imagem: string } | null>(null);
  const [salvProd, setSalvProd] = useState(false);
  const [imgProd, setImgProd] = useState<string | null>(null); // chave em upload na tabela
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({}); // rascunho do link por produto
  const [copiadoLink, setCopiadoLink] = useState<string | null>(null); // chave recém-copiada (feedback)
  // Salva o link de pagamento de um produto (Super Admin vai no app_kv pela chave "superadmin").
  async function salvarLinkProduto(chave: string, link: string) {
    if (!supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "plano-link", planoKey: chave, link }) });
    await carregar();
  }
  async function copiarLink(chave: string, link: string) {
    try { await navigator.clipboard.writeText(link); setCopiadoLink(chave); setTimeout(() => setCopiadoLink((c) => (c === chave ? null : c)), 1500); } catch { /* ignore */ }
  }
  async function salvarProduto() {
    if (!novoProduto || !novoProduto.nome.trim() || !supabase) return;
    setSalvProd(true);
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "plano-add", nome: novoProduto.nome, descricao: novoProduto.descricao, preco: novoProduto.preco, imagem: novoProduto.imagem || null }) });
    setSalvProd(false); setNovoProduto(null); await carregar();
  }
  // Lê um arquivo de imagem, reduz e devolve como data URL (base64) para salvar no banco.
  function lerImagem(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 320; const esc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/webp", 0.85));
        };
        img.onerror = reject; img.src = String(r.result);
      };
      r.onerror = reject; r.readAsDataURL(file);
    });
  }
  // Troca a imagem de um produto já cadastrado (clicando na miniatura da tabela).
  async function trocarImagemProduto(chave: string, file: File | null) {
    if (!supabase) return;
    setImgProd(chave);
    const dataUrl = file ? await lerImagem(file) : null;
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "plano-img", planoKey: chave, imagem: dataUrl }) });
    await carregar(); setImgProd(null);
  }
  async function excluirProduto(chave: string, nome: string) {
    if (!window.confirm(`Excluir o produto "${nome}"? Ele some das colunas das empresas.`) || !supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: "plano-del", planoKey: chave }) });
    await carregar();
  }
  // Super Admin: liga/desliga o acesso do responsável. Ao DESLIGAR, desativa também
  // todos os módulos (planos) da empresa. Ao religar, só volta o acesso.
  async function toggleSuperAdmin(e: Empresa) {
    if (!e.dono_id) return;
    if (e.acessoCortado) { acao("restaurar", { userId: e.dono_id }); return; }
    // desligar: apaga os módulos ativos e corta o acesso
    await Promise.all(catalogo.filter((c) => e.planos?.[c.chave]).map((c) => togglePlano(e.id, c.chave, false)));
    acao("cortar", { userId: e.dono_id });
  }
  function abrirCadastro() { setErroNovo(""); setNovo({ nomeEmpresa: "", cnpj: "", cpf: "", responsavel: "", emailResp: "", funcionarios: [], planos: {} }); }
  async function criarNovo(e: React.FormEvent) {
    e.preventDefault();
    if (!novo || !supabase) return;
    if (!novo.nomeEmpresa.trim() || !novo.emailResp.includes("@")) { setErroNovo("Informe o nome da empresa e o e-mail do responsável."); return; }
    setSalvNovo(true); setErroNovo("");
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action: "criar", nomeEmpresa: novo.nomeEmpresa, cnpj: novo.cnpj, cpf: novo.cpf, responsavel: novo.responsavel, emailResp: novo.emailResp, funcionarios: novo.funcionarios, planos: novo.planos }) });
    const j = await res.json().catch(() => ({}));
    setSalvNovo(false);
    if (!res.ok) { setErroNovo(j.error || "Não consegui cadastrar."); return; }
    setNovo(null); setAba("empresas"); await carregar();
  }
  function abrirEdicao(e: Empresa) {
    setErroForm("");
    const { qs, qa } = seatsDePlano(e.plano);
    setForm({ editId: e.id, nomeEmpresa: e.nome, responsavel: e.responsavel || e.dono?.nome || "", email: e.dono?.email || "", senha: "", cnpj: e.cnpj || "", cpf: e.responsavel_cpf || "", segmento: e.segmento || "", saldoInicial: String(e.saldo_inicial ?? 0), qtdSuperadmins: String(qs), qtdAcessos: String(qa), logo: "", slug: e.slug || "" });
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (demo) {
      const valor = (Number(form.qtdSuperadmins) || 0) * precos.superadmin + (Number(form.qtdAcessos) || 0) * precos.acesso;
      const qs = Math.max(1, Number(form.qtdSuperadmins) || 1), qa = Math.max(0, Number(form.qtdAcessos) || 0);
      const plano = `${qs} Super Admin${qs > 1 ? "s" : ""} + ${qa} Acesso${qa !== 1 ? "s" : ""}`;
      setData((d) => d ? { ...d, empresas: d.empresas.map((emp) => emp.id === form.editId ? {
        ...emp, nome: form.nomeEmpresa, cnpj: form.cnpj || null, segmento: form.segmento || null,
        responsavel: form.responsavel || emp.responsavel, responsavel_cpf: form.cpf || null,
        slug: form.slug || emp.slug, valor, plano, logo_url: form.logo || emp.logo_url,
        dono: emp.dono ? { ...emp.dono, nome: form.responsavel || emp.dono.nome, email: form.email || emp.dono.email } : emp.dono,
      } : emp) } : d);
      setForm(null);
      return;
    }
    if (!supabase) return;
    setSalvando(true); setErroForm("");
    // se veio uma logo nova (imagem embutida), sobe pro cofre e manda só o link
    let logo = form.logo;
    if (logo && logo.startsWith("data:")) { const u = await enviarLogo(logo, form.editId || undefined); if (u) logo = u; }
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` }, body: JSON.stringify({ action: form.editId ? "editar" : "criar", empresaId: form.editId || undefined, ...form, logo }) });
    const j = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) { setErroForm(j.error || "Não consegui salvar."); return; }
    const novo = !form.editId;
    setForm(null); if (novo) setAba("empresas"); await carregar();
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

  // ── Vendas ────────────────────────────────────────────────────────────────
  async function carregarVendas() {
    if (demo) { setVendas(DEMO_VENDAS); return; }
    if (!supabase) return;
    try {
      const res = await fetch("/api/vendas-admin", { headers: await tokenH() });
      if (res.ok) setVendas(await res.json());
    } catch { /* ignore */ }
  }
  useEffect(() => { if (aba === "vendas" && !vendas) carregarVendas(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [aba]);
  // "resolver" tira o aviso de uma venda; "liberar" tenta de novo criar o acesso.
  async function acaoVenda(id: string, action: "resolver" | "liberar") {
    if (demo || !supabase) return;
    setVendaBusy(id);
    try {
      const res = await fetch("/api/vendas-admin", { method: "POST", headers: { "Content-Type": "application/json", ...(await tokenH()) }, body: JSON.stringify({ action, id }) });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) window.alert(j.error || "Não consegui concluir.");
      await carregarVendas();
    } catch { /* ignore */ }
    setVendaBusy(null);
  }
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
  // catálogo de produtos (planos): do banco; se vazio/sem tabela, usa o padrão
  const catalogo: Plano[] = (data?.catalogo && data.catalogo.length) ? data.catalogo : CATALOGO_PADRAO;
  // o "2º acesso" é automático: verde quando a empresa tem um login extra (colaborador)
  const temAcessoExtra = (e: Empresa) => (acessosMap[e.id] || []).some((a) => a.papel !== "dono" && a.email !== e.dono?.email);
  const qLgpd = buscaLgpd.trim().toLowerCase();
  const lgpdLista = (data?.lgpd ?? []).filter((r) => !qLgpd
    || (r.nome || "").toLowerCase().includes(qLgpd)
    || (r.email || "").toLowerCase().includes(qLgpd)
    || (r.empresaNome || "").toLowerCase().includes(qLgpd));
  const NAV: { k: Aba; label: string; Icon: typeof Building2 }[] = [
    { k: "visao", label: "Visão geral", Icon: LayoutDashboard },
    { k: "produtos", label: "Produtos", Icon: DollarSign },
    { k: "vendas", label: "Vendas", Icon: ShoppingCart },
    { k: "empresas", label: "Empresas", Icon: Building2 },
    { k: "notificacoes", label: "Notificações", Icon: Bell },
    { k: "documentos", label: "Documentos (LGPD)", Icon: FileText },
    { k: "docdev", label: "Documentação técnica", Icon: Code2 },
    { k: "marketing", label: "Análise de marketing", Icon: Megaphone },
  ];

  // Indicadores de marketing preenchidos à mão, por mês (salvos no navegador).
  const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MKT: { key: string; label: string; Icon: typeof Wallet; cor: string; hint: string }[] = [
    { key: "investido", label: "Valor investido", Icon: Wallet, cor: "#1AADE2", hint: "R$" },
    { key: "vendas", label: "Vendas", Icon: DollarSign, cor: "#10B981", hint: "R$" },
    { key: "cpl", label: "CPL", Icon: UserPlus, cor: "#8b5cf6", hint: "R$" },
    { key: "cpm", label: "CPM", Icon: Eye, cor: "#F59E0B", hint: "R$" },
    { key: "conversao", label: "Conversão", Icon: Percent, cor: "#EC4899", hint: "%" },
    { key: "roas", label: "ROAS", Icon: Target, cor: "#1AADE2", hint: "x" },
  ];
  const setMktVal = (key: string, val: string) => {
    setMkt((m) => {
      const mesKey = `${mktAno}-${mktMes}`;
      const next = { ...m, [mesKey]: { ...(m[mesKey] || {}), [key]: val } };
      try { localStorage.setItem("me_mkt", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Links principais para o time de desenvolvimento (abrem a página completa em nova aba).
  const REPO = "https://github.com/ojpjoaopedro/netmash";
  type LinkDev = { titulo: string; desc: string; url: string; Icon: typeof Code2 };
  const DOCS_DEV: LinkDev[] = [
    { titulo: "Repositório (código)", desc: "Todo o código-fonte do projeto no GitHub.", url: REPO, Icon: Code2 },
    { titulo: "README", desc: "Visão geral, como rodar e o mapa de telas → arquivos (cliente x admin).", url: `${REPO}/blob/main/README.md`, Icon: BookOpen },
    { titulo: "Como o app foi feito", desc: "Linguagens, ferramentas e o porquê de cada escolha (resumo técnico).", url: `${REPO}/blob/main/docs/como-o-app-foi-feito.md`, Icon: Info },
    { titulo: "CLAUDE.md", desc: "Regras e convenções do projeto (deploy, idioma, multiempresa).", url: `${REPO}/blob/main/CLAUDE.md`, Icon: FileText },
    { titulo: ".env.example", desc: "Todas as variáveis de ambiente que o sistema usa.", url: `${REPO}/blob/main/.env.example`, Icon: KeyRound },
    { titulo: "Banco de dados (migrations)", desc: "Scripts SQL do Supabase, com um README explicando cada um.", url: `${REPO}/tree/main/migrations`, Icon: Database },
  ];
  const cardDev = (l: LinkDev) => (
    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="adm-card"
      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 18, textDecoration: "none", color: "inherit" }}>
      <span style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand,#1AADE2) 16%, transparent)", color: "var(--brand,#1AADE2)" }}><l.Icon size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15 }}>{l.titulo} <ExternalLink size={13} style={{ opacity: .6, flexShrink: 0 }} /></b>
        <p className="adm-sub" style={{ marginTop: 3 }}>{l.desc}</p>
      </div>
    </a>
  );

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
              <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}><Icon size={16} /> {label}</button>
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
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><Building2 size={20} /></span><div><b>{t?.empresas ?? 0}</b><small>Clientes</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(139,92,246,.16)", color: "#8b5cf6" }}><Users size={20} /></span><div><b>{t?.ativos ?? 0}</b><small>Acessos ativos</small></div></div>
              </div>
              <h3 className="adm-h3">Últimos clientes</h3>
              <div className="adm-tablewrap">
                <table className="adm-table">
                  <thead><tr><th>Criada</th><th>E-mail de acesso</th><th>Nome</th><th>CPF</th><th>Empresa</th><th>Último acesso</th></tr></thead>
                  <tbody>
                    {data?.empresas.slice(0, 6).map((e) => (
                      <tr key={e.id}>
                        <td className="adm-sub">{dataHoraBR(e.criado_em)}</td>
                        <td className="adm-sub">{e.dono?.email || "—"}</td>
                        <td>{e.responsavel || e.dono?.nome || "—"}</td>
                        <td className="adm-sub">{e.responsavel_cpf || "—"}</td>
                        <td><b>{e.nome}</b>{ehPadrao(e) && <span className="adm-badge-padrao">Padrão</span>}</td>
                        <td className="adm-sub">{e.ultimo_acesso ? dataHoraBR(e.ultimo_acesso) : "—"}</td>
                      </tr>
                    ))}
                    {!data?.empresas.length && <tr><td colSpan={6} className="adm-sub" style={{ textAlign: "center", padding: 26 }}>Nenhuma empresa ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === "empresas" && (
            <>
              <div className="adm-headrow">
                <h1>Empresas</h1>
                <button className="adm-btn" onClick={abrirCadastro}><Plus size={15} /> Cadastrar cliente</button>
              </div>
              {(() => { const OPS: { k: "ativos" | "desativados"; label: string }[] = [{ k: "ativos", label: "Ativos" }, { k: "desativados", label: "Desativados" }]; return (
                <div style={{ display: "inline-flex", background: "var(--card-2,#0d0d0d)", border: "1px solid var(--line-2,#2a2a2a)", borderRadius: 99, padding: 3, marginTop: 16 }}>
                  {OPS.map((o) => (
                    <button key={o.k} type="button" onClick={() => setFiltroAcesso(o.k)}
                      style={{ padding: "6px 16px", borderRadius: 99, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, transition: ".12s",
                        background: filtroAcesso === o.k ? "var(--brand,#1AADE2)" : "transparent",
                        color: filtroAcesso === o.k ? "#fff" : "var(--muted,#9aa0a6)" }}>{o.label}</button>
                  ))}
                </div>
              ); })()}
              <div style={{ position: "relative", maxWidth: 440, marginTop: 14 }}>
                <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa0a6" }} />
                <input value={buscaEmpresa} onChange={(e) => setBuscaEmpresa(e.target.value)} placeholder="Buscar empresa, responsável ou e-mail…"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", color: "inherit", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div className="adm-tablewrap" style={{ marginTop: 14 }}>
                <table className="adm-table">
                  <thead><tr><th style={{ textAlign: "center", width: 34 }}>#</th><th>Criada</th><th style={{ textAlign: "center", width: 92 }}>Logo</th><th>Empresa</th><th>Responsável</th><th style={{ textAlign: "center" }}>Super Admin</th>{catalogo.map((c) => <th key={c.chave} style={{ textAlign: "center" }}>{c.nome}</th>)}<th style={{ textAlign: "center" }}>Ações</th></tr></thead>
                  <tbody>
                    {(() => { const q = buscaEmpresa.trim().toLowerCase(); const arr = (data?.empresas ?? []).filter((e) => {
                      if (filtroAcesso === "ativos" ? e.acessoCortado : !e.acessoCortado) return false;
                      if (!q) return true;
                      return (e.nome || "").toLowerCase().includes(q) || (e.dono?.nome || "").toLowerCase().includes(q) || (e.dono?.email || "").toLowerCase().includes(q)
                        || (acessosMap[e.id] || []).some((a) => (a.nome || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q));
                    }); return arr.map((e, i) => {
                      type P = { key: string; nome: string; email: string | null; dono: boolean; cortado: boolean; toggle: () => void; verP: () => void; reenviar: () => void; editar: () => void; trash: (() => void) | null };
                      const confExcluir = `Excluir a empresa "${e.nome}"? Isso apaga a empresa, o login e todos os dados dela. Não dá para desfazer.`;
                      const donoP: P | null = e.dono ? {
                        key: "d-" + e.id, nome: e.dono.nome || "—", email: e.dono.email, dono: true, cortado: e.acessoCortado,
                        toggle: () => e.dono_id && acao(e.acessoCortado ? "restaurar" : "cortar", { userId: e.dono_id }),
                        verP: () => verPainel(e), reenviar: () => reenviarAcesso(e), editar: () => abrirEdicao(e),
                        trash: ehPadrao(e) ? null : () => acao("excluir", { empresaId: e.id }, confExcluir),
                      } : null;
                      const colabs: P[] = (acessosMap[e.id] || []).filter((a) => a.papel !== "dono" && a.email !== e.dono?.email).map((a) => ({
                        key: a.id, nome: a.nome || a.email || "usuário", email: a.email, dono: false, cortado: !!a.cortado,
                        toggle: () => acaoAcesso(e.id, a.cortado ? "restaurar" : "cortar", a.id),
                        verP: () => verPainelAcesso(a.id, a.nome || a.email || "usuário"),
                        reenviar: () => acaoAcesso(e.id, "acesso-reenviar", a.id),
                        editar: () => setEditAcesso({ id: a.id, empresaId: e.id, nome: a.nome || "", email: a.email || "" }),
                        trash: () => acaoAcesso(e.id, "acesso-remover", a.id, `Remover o acesso de ${a.nome || a.email}?`),
                      }));
                      const pessoas: P[] = donoP ? [donoP, ...colabs] : colabs;
                      const linha: React.CSSProperties = { minHeight: 40, display: "flex", alignItems: "center", padding: "3px 0" };
                      const spacer = <span style={{ width: 28, height: 28, display: "inline-block", flexShrink: 0 }} />;
                      return (
                      <tr key={e.id}>
                        <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 12, color: "#8b93a0", fontWeight: 700 }}>{arr.length - i}</td>
                        <td className="adm-sub" style={{ verticalAlign: "top", paddingTop: 12 }}>{dataBR(e.criado_em)}</td>
                        <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 12 }} title="Logo definida pela própria empresa">
                          {e.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.logo_url} alt={e.nome} style={{ height: 34, maxHeight: 34, width: "auto", maxWidth: 120, objectFit: "contain", borderRadius: 8, display: "inline-block" }} />
                          ) : (
                            <span style={{ width: 34, height: 34, borderRadius: 8, display: "inline-grid", placeItems: "center", background: e.cor || "var(--card-2,#0d0d0d)", color: "#fff", fontWeight: 800, fontSize: 14 }}>{(e.nome || "?").trim().charAt(0).toUpperCase()}</span>
                          )}
                        </td>
                        <td style={{ verticalAlign: "top", paddingTop: 12 }}><b>{e.nome}</b></td>
                        <td style={{ verticalAlign: "top" }}>
                          {pessoas.length ? pessoas.map((p, i) => (
                            <div key={p.key} style={{ ...linha, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", borderTop: i ? "1px solid var(--line-2, #2a2a2a)" : undefined }}>
                              <div style={{ opacity: p.cortado ? .6 : 1 }}>{p.nome}</div>
                              <div className="adm-sub">{p.email}</div>
                              {p.dono && e.responsavel_cpf && <div className="adm-sub" style={{ fontSize: 11 }}>CPF: {e.responsavel_cpf}</div>}
                            </div>
                          )) : <span className="adm-sub">—</span>}
                        </td>
                        {/* Super Admin: status Ativo/Desativado + ação pequena embaixo */}
                        <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 11 }}>
                          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: e.acessoCortado ? "#94a3b8" : "#10B981" }}>{e.acessoCortado ? "Desativado" : "Ativo"}</span>
                            <button type="button" disabled={!!busy || !e.dono_id} onClick={() => setConfirmAcao({ titulo: e.acessoCortado ? "Ativar acesso" : "Desativar acesso", texto: e.acessoCortado ? `Reativar o acesso (Super Admin) de "${e.nome}"? A empresa volta a conseguir entrar no painel.` : `Desativar o acesso (Super Admin) de "${e.nome}"? A empresa deixa de entrar no painel e todos os módulos são desligados.`, okTxt: e.acessoCortado ? "Ativar" : "Desativar", onOk: () => toggleSuperAdmin(e) })} title={e.acessoCortado ? "Ativar acesso (Super Admin)" : "Desativar acesso (desliga todos os módulos)"}
                              style={{ background: "transparent", border: 0, cursor: e.dono_id ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, color: e.acessoCortado ? "var(--brand,#1AADE2)" : "#ef4444", textDecoration: "underline", padding: 0 }}>{e.acessoCortado ? "ativar" : "desativar"}</button>
                          </div>
                        </td>
                        {/* módulos: ligam/desligam por empresa (catálogo dinâmico). "acesso2" é automático. */}
                        {catalogo.map((c) => {
                          if (c.chave === "acesso2") { const extra = temAcessoExtra(e); return (
                            <td key={c.chave} style={{ textAlign: "center", verticalAlign: "top", paddingTop: 10 }}>
                              <button type="button" className={"adm-switch" + (extra ? " on" : "")} disabled title={extra ? "Tem acesso extra (login adicional)" : "Sem acesso extra"} style={{ opacity: .85, cursor: "default" }}><span className="adm-switch-knob" /></button>
                            </td>
                          ); }
                          const on = !!e.planos?.[c.chave]; return (
                          <td key={c.chave} style={{ textAlign: "center", verticalAlign: "top", paddingTop: 10 }}>
                            <button type="button" className={"adm-switch" + (on ? " on" : "")} disabled={!!busy} title={(on ? "Desativar " : "Ativar ") + c.nome} onClick={() => setConfirmAcao({ titulo: (on ? "Desativar " : "Ativar ") + c.nome, texto: `${on ? "Desativar" : "Ativar"} o módulo "${c.nome}" para "${e.nome}"?${on ? "" : " A empresa passa a ter acesso a esse recurso."}`, okTxt: on ? "Desativar" : "Ativar", onOk: () => togglePlano(e.id, c.chave, !on) })}><span className="adm-switch-knob" /></button>
                          </td>
                        ); })}
                        <td style={{ verticalAlign: "top" }}>
                          {pessoas.map((p, i) => (
                            <div key={p.key} style={{ ...linha, justifyContent: "center", gap: 6, borderTop: i ? "1px solid var(--line-2, #2a2a2a)" : undefined }}>
                              <button className="adm-btn sm adm-ic" disabled={!!busy} title="Ver painel" onClick={p.verP}><Eye size={16} /></button>
                              <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Reenviar acesso por e-mail" onClick={p.reenviar}><Send size={16} /></button>
                              <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title={p.dono ? "Editar cadastro da empresa" : "Editar acesso (nome e e-mail)"} onClick={p.editar}><Pencil size={16} /></button>
                              {p.dono
                                ? <button className="adm-btn sm ghost adm-ic" disabled={!!busy} title="Adicionar acesso (novo usuário)" onClick={() => selecionarEmpresa(e.id)}><UserPlus size={16} /></button>
                                : spacer}
                              {p.trash ? <button className="adm-btn sm danger adm-ic" disabled={!!busy} title={p.dono ? "Excluir empresa" : "Remover acesso"} onClick={p.trash}><Trash2 size={16} /></button> : spacer}
                            </div>
                          ))}
                        </td>
                      </tr>
                      );
                    }); })()}
                    {!data?.empresas.length && <tr><td colSpan={7 + catalogo.length} className="adm-sub" style={{ textAlign: "center", padding: 30 }}>Nenhuma empresa cadastrada ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === "produtos" && (() => {
            const clientes = t?.empresas ?? 0;
            const nMod = (key: string) => (data?.empresas.filter((e) => e.planos?.[key]).length ?? 0);
            const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", color: "inherit", fontSize: 14, fontFamily: "inherit" };
            // célula editável do link de pagamento: input + copiar + abrir em outra aba
            const celulaLink = (chave: string, stored: string | null | undefined) => {
              const val = linkDraft[chave] !== undefined ? linkDraft[chave] : (stored || "");
              const temLink = !!val.trim();
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 220 }}>
                  <input value={val} placeholder="Colar link do checkout…"
                    onChange={(ev) => setLinkDraft((d) => ({ ...d, [chave]: ev.target.value }))}
                    onBlur={() => { if (val.trim() !== (stored || "").trim()) salvarLinkProduto(chave, val.trim()); }}
                    style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", color: "inherit", fontSize: 12, fontFamily: "inherit" }} />
                  <button className="adm-btn sm adm-ic" title={copiadoLink === chave ? "Copiado!" : "Copiar link"} disabled={!temLink} onClick={() => copiarLink(chave, val.trim())} style={{ opacity: temLink ? 1 : .4 }}>
                    {copiadoLink === chave ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <a className="adm-btn sm adm-ic" title="Abrir em outra aba" href={temLink ? val.trim() : undefined} target="_blank" rel="noopener noreferrer"
                    style={{ pointerEvents: temLink ? "auto" : "none", opacity: temLink ? 1 : .4, textDecoration: "none" }}><ExternalLink size={14} /></a>
                </div>
              );
            };
            // Preço que vale é o do produto cadastrado na Wiven (lido do link).
            const celulaPreco = (chave: string) => {
              const p = data?.precosWiven?.[chave];
              if (!p) return <span className="adm-sub">—</span>;
              return (
                <div style={{ whiteSpace: "nowrap" }}>
                  <b>{brl(p.preco)}</b><span className="adm-sub"> / mês</span>
                  {p.primeiraCobranca != null && <div className="adm-sub" style={{ fontSize: 11.5 }}>1ª cobrança {brl(p.primeiraCobranca)}</div>}
                  {p.produto && <div className="adm-sub" style={{ fontSize: 11 }}>{p.produto}</div>}
                </div>
              );
            };
            return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0 }}>Produtos</h1>
                <button className="adm-btn" onClick={() => setNovoProduto({ nome: "", descricao: "", preco: "", imagem: "" })}><Plus size={15} /> Cadastrar produto</button>
              </div>
              <div className="adm-tablewrap" style={{ marginTop: 16 }}>
                <table className="adm-table">
                  <thead><tr><th style={{ width: 64 }}>Imagem</th><th>Produto</th><th>Descrição</th><th>Link de pagamento</th><th>Preço na Wiven</th><th>Acessos ativos</th><th></th></tr></thead>
                  <tbody>
                    <tr>
                      <td>
                        <label title={data?.imagemSuperadmin ? "Trocar imagem" : "Enviar imagem"} style={{ cursor: imgProd === "superadmin" ? "wait" : "pointer", display: "inline-block", position: "relative" }}>
                          <input type="file" accept="image/*" style={{ display: "none" }} disabled={imgProd === "superadmin"}
                            onChange={(ev) => { const f = ev.target.files?.[0] || null; ev.target.value = ""; trocarImagemProduto("superadmin", f); }} />
                          {data?.imagemSuperadmin ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={data.imagemSuperadmin} alt="Super Admin" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", border: "1px solid var(--line-2,#2a2a2a)", display: "block", opacity: imgProd === "superadmin" ? 0.5 : 1 }} />
                          ) : (
                            <span style={{ width: 40, height: 40, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--card-2,#0d0d0d)", border: "1px dashed var(--line-2,#3a3a3a)", color: "var(--muted,#888)" }}><Plus size={15} /></span>
                          )}
                        </label>
                        {data?.imagemSuperadmin && <button title="Remover imagem" onClick={() => trocarImagemProduto("superadmin", null)} style={{ display: "block", marginTop: 3, fontSize: 10, background: "transparent", border: 0, cursor: "pointer", color: "var(--muted,#888)", fontFamily: "inherit", padding: 0 }}>remover</button>}
                      </td>
                      <td><b>Super Admin</b><span className="adm-badge" style={{ marginLeft: 8 }}>Principal</span></td>
                      <td className="adm-sub">Acesso principal da empresa (plano base)</td>
                      <td>{celulaLink("superadmin", data?.linkSuperadmin)}</td>
                      <td>{celulaPreco("superadmin")}</td>
                      <td><b>{clientes}</b></td>
                      <td></td>
                    </tr>
                    {catalogo.map((c) => (
                      <tr key={c.chave}>
                        <td>
                          <label title={c.imagem ? "Trocar imagem" : "Enviar imagem"} style={{ cursor: imgProd === c.chave ? "wait" : "pointer", display: "inline-block", position: "relative" }}>
                            <input type="file" accept="image/*" style={{ display: "none" }} disabled={imgProd === c.chave}
                              onChange={(ev) => { const f = ev.target.files?.[0] || null; ev.target.value = ""; trocarImagemProduto(c.chave, f); }} />
                            {c.imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.imagem} alt={c.nome} style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", border: "1px solid var(--line-2,#2a2a2a)", display: "block", opacity: imgProd === c.chave ? 0.5 : 1 }} />
                            ) : (
                              <span style={{ width: 40, height: 40, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--card-2,#0d0d0d)", border: "1px dashed var(--line-2,#3a3a3a)", color: "var(--muted,#888)" }}><Plus size={15} /></span>
                            )}
                          </label>
                          {c.imagem && <button title="Remover imagem" onClick={() => trocarImagemProduto(c.chave, null)} style={{ display: "block", marginTop: 3, fontSize: 10, background: "transparent", border: 0, cursor: "pointer", color: "var(--muted,#888)", fontFamily: "inherit", padding: 0 }}>remover</button>}
                        </td>
                        <td><b>{c.nome}</b></td>
                        <td className="adm-sub">{c.descricao || "—"}</td>
                        <td>{celulaLink(c.chave, c.link_pagamento)}</td>
                        <td>{celulaPreco(c.chave)}</td>
                        <td><b>{c.chave === "acesso2" ? (data?.empresas.filter(temAcessoExtra).length ?? 0) : nMod(c.chave)}</b></td>
                        <td style={{ textAlign: "right" }}><button className="adm-btn sm danger adm-ic" title="Excluir produto" onClick={() => excluirProduto(c.chave, c.nome)}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {novoProduto && (
                <div onClick={() => setNovoProduto(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}>
                  <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "var(--card, #141414)", border: "1px solid var(--line-2, #2a2a2a)", borderRadius: 16, padding: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <b style={{ fontSize: 16 }}>Cadastrar produto</b>
                      <button onClick={() => setNovoProduto(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}><X size={18} /></button>
                    </div>
                    <label style={{ display: "block", marginBottom: 10 }}><span className="adm-sub" style={{ display: "block", marginBottom: 5 }}>Nome do produto</span><input value={novoProduto.nome} onChange={(ev) => setNovoProduto({ ...novoProduto, nome: ev.target.value })} placeholder="Ex: Relatórios avançados" style={inp} /></label>
                    <label style={{ display: "block", marginBottom: 10 }}><span className="adm-sub" style={{ display: "block", marginBottom: 5 }}>Descrição</span><input value={novoProduto.descricao} onChange={(ev) => setNovoProduto({ ...novoProduto, descricao: ev.target.value })} placeholder="O que o plano oferece" style={inp} /></label>
                    <label style={{ display: "block", marginBottom: 14 }}><span className="adm-sub" style={{ display: "block", marginBottom: 5 }}>Preço (R$/mês)</span><input value={novoProduto.preco} onChange={(ev) => setNovoProduto({ ...novoProduto, preco: ev.target.value })} inputMode="decimal" placeholder="19,90" style={inp} /></label>
                    <div style={{ marginBottom: 16 }}>
                      <span className="adm-sub" style={{ display: "block", marginBottom: 6 }}>Imagem do produto (opcional)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <label title="Enviar imagem" style={{ cursor: "pointer", flexShrink: 0 }}>
                          <input type="file" accept="image/*" style={{ display: "none" }}
                            onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) setNovoProduto({ ...novoProduto, imagem: await lerImagem(f) }); }} />
                          {novoProduto.imagem ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={novoProduto.imagem} alt="Prévia" style={{ width: 60, height: 60, borderRadius: 12, objectFit: "cover", border: "1px solid var(--line-2,#2a2a2a)", display: "block" }} />
                          ) : (
                            <span style={{ width: 60, height: 60, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--card-2,#0d0d0d)", border: "1px dashed var(--line-2,#3a3a3a)", color: "var(--muted,#888)" }}><ImageIcon size={20} /></span>
                          )}
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className="adm-sub" style={{ fontSize: 12 }}>{novoProduto.imagem ? "Clique na imagem para trocar." : "Clique no quadro para enviar. PNG ou JPG."}</span>
                          {novoProduto.imagem && <button onClick={() => setNovoProduto({ ...novoProduto, imagem: "" })} style={{ alignSelf: "flex-start", background: "transparent", border: 0, cursor: "pointer", color: "var(--muted,#888)", fontFamily: "inherit", fontSize: 12, padding: 0 }}>Remover</button>}
                        </div>
                      </div>
                    </div>
                    <button className="adm-btn" disabled={salvProd || !novoProduto.nome.trim()} onClick={salvarProduto} style={{ width: "100%", justifyContent: "center" }}>{salvProd ? "Salvando…" : "Cadastrar produto"}</button>
                  </div>
                </div>
              )}
            </>
            );
          })()}

          {aba === "vendas" && (() => {
            const tv = vendas?.totais;
            const lista = (vendas?.vendas ?? []).filter((v) =>
              filtroVenda === "todas" ? true : filtroVenda === "alerta" ? v.alerta : v.status === filtroVenda);
            const CORES: Record<string, { fundo: string; cor: string; label: string }> = {
              pago:        { fundo: "rgba(16,185,129,.14)",  cor: "#10B981", label: "Pago" },
              pendente:    { fundo: "rgba(245,158,11,.16)",  cor: "#F59E0B", label: "Aguardando" },
              reembolsado: { fundo: "rgba(239,68,68,.14)",   cor: "#ef4444", label: "Reembolsado" },
              chargeback:  { fundo: "rgba(239,68,68,.14)",   cor: "#ef4444", label: "Chargeback" },
              cancelado:   { fundo: "rgba(148,163,184,.16)", cor: "#94a3b8", label: "Cancelado" },
              falhou:      { fundo: "rgba(239,68,68,.14)",   cor: "#ef4444", label: "Falhou" },
            };
            const selo = (s: string) => {
              const c = CORES[s] || { fundo: "rgba(148,163,184,.16)", cor: "#94a3b8", label: s };
              return <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, background: c.fundo, color: c.cor }}>{c.label}</span>;
            };
            const FILTROS: { k: FiltroVenda; label: string }[] = [
              { k: "todas", label: "Todas" }, { k: "pago", label: "Pagas" },
              { k: "pendente", label: "Aguardando" }, { k: "alerta", label: "Precisam de atenção" },
            ];
            return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0 }}>Vendas</h1>
                <button className="adm-btn" onClick={carregarVendas}><RotateCw size={15} /> Atualizar</button>
              </div>

              {vendas?.aviso && (
                <div className="adm-card" style={{ marginTop: 14, padding: 14, display: "flex", gap: 10, alignItems: "center", color: "#F59E0B" }}>
                  <CircleAlert size={17} /> <span style={{ fontSize: 13.5 }}>{vendas.aviso}</span>
                </div>
              )}

              <div className="adm-kpis" style={{ marginTop: 18 }}>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(16,185,129,.16)", color: "#10B981" }}><Wallet size={20} /></span><div><b>{brl(tv?.recebido ?? 0)}</b><small>Recebido</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(26,173,226,.16)", color: "#1AADE2" }}><ShoppingCart size={20} /></span><div><b>{tv?.vendas ?? 0}</b><small>Vendas pagas</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(245,158,11,.16)", color: "#F59E0B" }}><Clock3 size={20} /></span><div><b>{tv?.pendentes ?? 0}</b><small>Aguardando</small></div></div>
                <div className="adm-card"><span className="adm-ico" style={{ background: "rgba(239,68,68,.16)", color: "#ef4444" }}><CircleAlert size={20} /></span><div><b>{(tv?.reembolsos ?? 0) + (tv?.chargebacks ?? 0)}</b><small>Reembolsos e chargebacks</small></div></div>
              </div>

              <div style={{ display: "inline-flex", background: "var(--card-2,#0d0d0d)", border: "1px solid var(--line-2,#2a2a2a)", borderRadius: 99, padding: 3, marginTop: 18, flexWrap: "wrap" }}>
                {FILTROS.map((o) => (
                  <button key={o.k} type="button" onClick={() => setFiltroVenda(o.k)}
                    style={{ padding: "6px 16px", borderRadius: 99, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, transition: ".12s",
                      background: filtroVenda === o.k ? "var(--brand,#1AADE2)" : "transparent",
                      color: filtroVenda === o.k ? "#fff" : "var(--muted,#9aa0a6)" }}>
                    {o.label}{o.k === "alerta" && (tv?.alertas ?? 0) > 0 ? ` (${tv?.alertas})` : ""}
                  </button>
                ))}
              </div>

              <div className="adm-tablewrap" style={{ marginTop: 14 }}>
                <table className="adm-table">
                  <thead><tr><th>Quando</th><th>Cliente</th><th>Empresa</th><th>Plano</th><th style={{ textAlign: "right" }}>Valor</th><th style={{ textAlign: "center" }}>Status</th><th>Conta</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
                  <tbody>
                    {lista.map((v) => (
                      <tr key={v.id} style={v.alerta ? { background: "rgba(239,68,68,.05)" } : undefined}>
                        <td className="adm-sub">{dataHoraBR(v.criado_em)}</td>
                        <td><b>{v.nome || "—"}</b><div className="adm-sub" style={{ fontSize: 12 }}>{v.email}</div></td>
                        <td>{v.empresa || "—"}</td>
                        <td className="adm-sub">{v.plano_nome || v.plano_chave}</td>
                        <td style={{ textAlign: "right" }}><b>{brl(v.valor)}</b></td>
                        <td style={{ textAlign: "center" }}>{selo(v.status)}</td>
                        <td className="adm-sub">
                          {v.user_id ? "Criada" : v.status === "pago" ? "Pendente" : "—"}
                          {v.erro && <div style={{ color: "#ef4444", fontSize: 11.5, marginTop: 3 }}>{v.erro}</div>}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {v.status === "pago" && !v.user_id && (
                            <button className="adm-btn sm" disabled={vendaBusy === v.id} onClick={() => acaoVenda(v.id, "liberar")} style={{ marginRight: 6 }}>
                              {vendaBusy === v.id ? "…" : "Liberar acesso"}
                            </button>
                          )}
                          {v.alerta && (
                            <button className="adm-btn sm" disabled={vendaBusy === v.id} onClick={() => acaoVenda(v.id, "resolver")}>Resolvido</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!lista.length && <tr><td colSpan={8} className="adm-sub" style={{ textAlign: "center", padding: 26 }}>{vendas ? "Nenhuma venda neste filtro." : "Carregando…"}</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="adm-sub" style={{ marginTop: 12, fontSize: 12.5 }}>
                As vendas entram pela página <b>/assinar</b> e são confirmadas pelo webhook da Wiven. Reembolso e chargeback aparecem aqui como aviso: o corte de acesso continua sendo feito à mão, na aba Empresas.
              </p>
            </>
            );
          })()}

          {aba === "notificacoes" && (
            <>
              <div>
                <h1 style={{ margin: 0 }}>Notificações</h1>
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 18, maxWidth: 760 }}>
                {NOTIFICACOES.map((n) => {
                  const ligado = data?.notificacoes?.[n.chave] ?? n.defaultOn;
                  return (
                    <div key={n.chave} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px", borderRadius: 14, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card,#141414)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, minWidth: 0 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", background: ligado ? "color-mix(in srgb, var(--brand,#1AADE2) 16%, transparent)" : "var(--card-2,#0d0d0d)", color: ligado ? "var(--brand,#1AADE2)" : "var(--muted,#888)" }}><Bell size={18} /></span>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ fontSize: 14.5 }}>{n.titulo}</b>
                          <div className="adm-sub" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>{n.descricao}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span className="adm-sub" style={{ fontSize: 12, fontWeight: 700, color: ligado ? "#10B981" : "var(--muted,#888)" }}>{ligado ? "Ligada" : "Desligada"}</span>
                        <button type="button" className={"adm-switch" + (ligado ? " on" : "")} title={ligado ? "Desligar notificação" : "Ligar notificação"} onClick={() => toggleNotif(n.chave, !ligado)}><span className="adm-switch-knob" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}


          {aba === "documentos" && (
            <>
              <div className="adm-headrow" style={{ marginBottom: 16 }}>
                <div>
                  <h1>Documentos · Consentimentos LGPD</h1>
                </div>
              </div>
              <div style={{ position: "relative", marginBottom: 22 }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9aa0a6" }} />
                <input value={buscaLgpd} onChange={(e) => setBuscaLgpd(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa…"
                  style={{ width: 320, maxWidth: "100%", padding: "10px 12px 10px 34px", borderRadius: 12, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", color: "inherit", fontSize: 13.5, outline: "none" }} />
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

          {aba === "docdev" && (
            <>
              <div className="adm-headrow">
                <div>
                  <h1>Documentação técnica</h1>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {DOCS_DEV.map(cardDev)}
              </div>
            </>
          )}

          {aba === "marketing" && (
            <>
              <div className="adm-headrow"><div><h1>Análise de marketing</h1></div></div>
              <div style={{ background: "linear-gradient(165deg, #0d1526, #080d18)", border: "1px solid rgba(148,163,184,.16)", borderRadius: 20, padding: "clamp(16px, 3vw, 28px)", boxShadow: "0 24px 60px -30px rgba(0,0,0,.6)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1AADE2,#0e7ba6)", color: "#fff", flexShrink: 0 }}><Megaphone size={20} /></span>
                    <div>
                      <b style={{ color: "#eaf2ff", fontSize: 15 }}>Desempenho das campanhas</b>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {[2026, 2027, 2028].map((y) => (
                        <button key={y} onClick={() => setMktAno(y)} style={{ padding: "6px 13px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
                          background: mktAno === y ? "#1AADE2" : "rgba(255,255,255,.06)", color: mktAno === y ? "#fff" : "#9db0d6" }}>{y}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {MES3.map((m, i) => (
                        <button key={m} onClick={() => setMktMes(i)} style={{ padding: "6px 11px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                          background: mktMes === i ? "#1AADE2" : "rgba(255,255,255,.06)", color: mktMes === i ? "#fff" : "#9db0d6" }}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
                  {MKT.map((k) => (
                    <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(148,163,184,.14)", borderRadius: 16, padding: 18 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${k.cor} 20%, transparent)`, color: k.cor, marginBottom: 12 }}><k.Icon size={19} /></span>
                      <div style={{ color: "#9db0d6", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>{k.label}</div>
                      <input value={mkt[`${mktAno}-${mktMes}`]?.[k.key] ?? ""} onChange={(e) => setMktVal(k.key, e.target.value)} placeholder={k.hint}
                        style={{ width: "100%", background: "transparent", border: 0, borderBottom: "1px solid rgba(148,163,184,.20)", outline: "none", color: "#f4f8ff", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", margin: "4px 0 0", padding: "2px 0", fontFamily: "inherit" }} />
                    </div>
                  ))}
                </div>
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
                ["Localização (aprox.)", lgpdDet.localizacao || "—"],
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
              <L label="CPF do responsável"><input value={form.cpf} onChange={(ev) => setForm({ ...form, cpf: mascararCPF(ev.target.value) })} placeholder="000.000.000-00" inputMode="numeric" /></L>
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
              <L label="CPF do responsável"><input value={novo.cpf} onChange={(ev) => setNovo({ ...novo, cpf: mascararCPF(ev.target.value) })} placeholder="000.000.000-00" inputMode="numeric" /></L>
              <L label="E-mail do responsável"><input type="email" value={novo.emailResp} onChange={(ev) => setNovo({ ...novo, emailResp: ev.target.value })} required /></L>
            </div>
            <div style={{ marginTop: 18 }}>
              <div className="adm-sub" style={{ fontWeight: 700, marginBottom: 9 }}>Planos ativos</div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 11, border: "1px solid var(--line-2,#2a2a2a)", background: "var(--card-2,#0d0d0d)", opacity: .8 }}>
                  <input type="checkbox" checked disabled style={{ width: 17, height: 17, flexShrink: 0 }} />
                  <b style={{ flex: 1, fontSize: 13.5 }}>Super Admin <span className="adm-sub" style={{ fontWeight: 500 }}>(base)</span></b>
                  <span className="adm-sub" style={{ flexShrink: 0 }}>{brl(precos.superadmin)}/mês</span>
                </label>
                {catalogo.filter((c) => c.chave !== "acesso2").map((c) => {
                  const on = !!novo.planos?.[c.chave];
                  return (
                    <label key={c.chave} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 11, cursor: "pointer",
                      border: `1px solid ${on ? "var(--brand,#1AADE2)" : "var(--line-2,#2a2a2a)"}`, background: on ? "color-mix(in srgb, var(--brand,#1AADE2) 10%, transparent)" : "var(--card-2,#0d0d0d)", transition: ".12s" }}>
                      <input type="checkbox" checked={on} onChange={(ev) => setNovo({ ...novo, planos: { ...(novo.planos || {}), [c.chave]: ev.target.checked } })} style={{ width: 17, height: 17, flexShrink: 0 }} />
                      <b style={{ flex: 1, fontSize: 13.5 }}>{c.nome}</b>
                      <span className="adm-sub" style={{ flexShrink: 0 }}>{brl(c.preco)}/mês</span>
                    </label>
                  );
                })}
              </div>
            </div>
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

      {editAcesso && (
        <div className="adm-modalbg" onClick={() => setEditAcesso(null)}>
          <div className="adm-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="adm-mhead"><h3>Editar acesso</h3><button type="button" onClick={() => setEditAcesso(null)}><X size={18} /></button></div>
            <div className="adm-grid2">
              <L label="Nome"><input value={editAcesso.nome} onChange={(ev) => setEditAcesso({ ...editAcesso, nome: ev.target.value })} placeholder="Nome do usuário" /></L>
              <L label="E-mail de acesso"><input type="email" value={editAcesso.email} onChange={(ev) => setEditAcesso({ ...editAcesso, email: ev.target.value })} placeholder="email@empresa.com" /></L>
            </div>
            <button className="adm-btn" onClick={salvarEditAcesso} disabled={busy === editAcesso.id} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{busy === editAcesso.id ? "Salvando…" : "Salvar alterações"}</button>
            <p className="adm-sub" style={{ marginTop: 10, textAlign: "center" }}>Alterar o e-mail muda o login deste usuário.</p>
          </div>
        </div>
      )}

      {confirmAcao && (
        <div className="adm-modalbg" onClick={() => setConfirmAcao(null)}>
          <div className="adm-modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="adm-mhead"><h3>{confirmAcao.titulo}</h3><button type="button" onClick={() => setConfirmAcao(null)}><X size={18} /></button></div>
            <p className="adm-sub" style={{ lineHeight: 1.55, marginBottom: 18 }}>{confirmAcao.texto}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="adm-btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmAcao(null)}>Cancelar</button>
              <button className="adm-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => { const f = confirmAcao.onOk; setConfirmAcao(null); f(); }}>{confirmAcao.okTxt}</button>
            </div>
          </div>
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
.adm-side{width:210px;flex-shrink:0;background:#0d0d0d;border-right:1px solid #1d1d1d;padding:16px 10px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
.adm-brand{display:flex;align-items:center;gap:8px;color:#1AADE2;font-weight:800;font-size:16px;padding:6px 8px 18px}
.adm-nav{display:flex;flex-direction:column;gap:2px}
.adm-nav button{display:flex;align-items:center;gap:9px;background:none;border:0;color:#cfd3d8;font-weight:600;font-size:13px;padding:8px 10px;border-radius:9px;cursor:pointer;font-family:inherit;text-align:left;width:100%}
.adm-nav button:hover{background:#161616}
.adm-nav button.on{background:#16242b;color:#1AADE2}
.adm-side-foot{margin-top:auto;display:flex;flex-direction:column;gap:6px;border-top:1px solid #1d1d1d;padding-top:12px}
.adm-side-foot button{display:flex;align-items:center;gap:9px;background:none;border:0;color:#9aa0a6;font-size:13.5px;font-weight:600;padding:9px 12px;border-radius:10px;cursor:pointer;font-family:inherit}
.adm-side-foot button:hover{color:#f4f5f7;background:#161616}
.adm-main{flex:1;padding:28px 26px 60px;max-width:1200px;min-width:0}
.adm-main h1{font-size:25px;font-weight:800;letter-spacing:-.02em}
.adm-headrow{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:40px}
.adm-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#1AADE2;font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:11.5px;margin-bottom:14px}
.adm-h3{font-size:15px;font-weight:700;margin:26px 0 12px}
.adm-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:8px}
.adm-card{background:#121212;border:1px solid #222;border-radius:16px;padding:18px;display:flex;align-items:center;gap:14px}
.adm-ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.adm-card b{font-size:24px;font-weight:800;display:block;line-height:1}
.adm-card small{color:#9aa0a6;font-size:13px}
.adm-tablewrap{background:#121212;border:1px solid #222;border-radius:16px;overflow-x:auto}
.adm-table{width:100%;border-collapse:collapse;font-size:12px;min-width:820px}
.adm-table th{color:#8b93a0;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:9px 10px;border-bottom:1px solid #2a2a2a;font-weight:800;background:#171717}
.adm-table th:first-child{border-top-left-radius:16px}
.adm-table th:last-child{border-top-right-radius:16px}
.adm-table td{padding:8px 10px;border-bottom:1px solid #1d1d1d;vertical-align:middle}
.adm-table th:not(:last-child),.adm-table td:not(:last-child){border-right:1px solid #202020}
.adm-table tbody tr{transition:background .12s}
.adm-table tbody tr:hover{background:#161616}
.adm-table tr:last-child td{border-bottom:0}
.adm-table .num{text-align:right}
.adm-sub{color:#9aa0a6;font-size:11.5px;font-weight:400}
.adm-badge{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
.adm-badge.ativo{color:#10B981;border-color:#10B98155;background:#10B9811a}
.adm-badge.cortado{color:#EF4444;border-color:#EF444455;background:#EF44441a}
.adm-badge-padrao{margin-left:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:99px;color:#1AADE2;border:1px solid #1AADE255;background:#1AADE214;vertical-align:middle}
.adm-btn{display:inline-flex;align-items:center;gap:7px;background:#1AADE2;color:#06222e;border:0;border-radius:99px;padding:10px 16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit}
.adm-btn:hover{filter:brightness(1.08)}
.adm-btn:disabled{opacity:.5;cursor:default}
.adm-btn.sm{padding:6px 11px;font-size:12.5px;font-weight:700}
.adm-btn.adm-ic{padding:7px;border-radius:9px;line-height:0}
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
body.theme-light .adm-table th{border-bottom-color:rgba(0,0,0,.10);background:#f6f7f9}
body.theme-light .adm-table td{border-bottom-color:rgba(0,0,0,.07)}
body.theme-light .adm-table th:not(:last-child),body.theme-light .adm-table td:not(:last-child){border-right-color:rgba(0,0,0,.06)}
body.theme-light .adm-table tbody tr:hover{background:rgba(0,0,0,.022)}
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
