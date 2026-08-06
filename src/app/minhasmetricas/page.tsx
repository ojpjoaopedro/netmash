"use client";
import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, Compass, Settings,
  Users, Upload, Building2, LogOut, Sun, Moon, X,
  Menu, Presentation, Sparkles, Volume2, VolumeX, ChevronDown, Image as ImageIcon, HardHat,
  ChevronsLeft, ChevronsRight, User, Camera, Layers, CalendarDays, FileText, BarChart3,
  Gift, CreditCard, ArrowLeft, ArrowUpCircle, ArrowDownCircle, ChevronRight, Trash2, UserPlus,
  PlayCircle, Play, Bell, Eye, EyeOff, Instagram, Wallet, Cake, Home as HomeIcon,
} from "lucide-react";
import { playTick, setSom, somLigado } from "@/lib/ui-sound";
import GuiaConfiguracao from "@/components/GuiaConfiguracao";
import { assinarNav, pegarAlvo, navegar } from "@/lib/nav";
import { supabase, supabaseReady } from "@/lib/supabase";
import { salvarEstadoRemoto, apagarEstadoRemoto, sincronizarEstado, limparDadosLocaisDaConta } from "@/lib/estado-remoto";
import { reduzirImagem } from "@/lib/imagem";
import {
  getPerfil, getEmpresa, getLancamentos, getFuncionarios, getClientes, logout,
  Perfil, Empresa, Lancamento, Funcionario, Cliente,
} from "@/lib/db";
import { getIndicadores, aplicarReais, Metrica, Categoria } from "@/lib/indicadores";
import { useBrand } from "@/lib/brand";
import { fraseDoDia } from "@/components/dash/ResumoHome";
import { useOcultar } from "@/components/ocultar";
import PainelCobrancas from "@/components/PainelCobrancas";
import CalendarioRecebimento from "@/components/CalendarioRecebimento";
import PromoParaVoce from "@/components/PromoParaVoce";
import CropLogo from "@/components/CropLogo";
import IndicatorEditor from "@/components/dash/IndicatorEditor";
import GerarApresentacao from "@/components/dash/GerarApresentacao";
import Assistente from "@/components/dash/Assistente";
import Funcionarios from "@/components/Funcionarios";
import Importar from "@/components/Importar";
import Config from "@/components/Config";
import LgpdConsent from "@/components/LgpdConsent";
import EstruturaFinancas from "./financas-estrutura";
import RelatoriosFinancas from "@/components/RelatoriosFinancas";
import FolhaPagamento from "@/components/FolhaPagamento";
import FinancasDashboard from "@/components/FinancasDashboard";
import CalendarioPagamentos from "@/components/CalendarioPagamentos";
import TermosDeUso from "@/components/TermosDeUso";
import MeusBeneficios from "@/components/MeusBeneficios";
import MeuPlano from "@/components/MeuPlano";

type View =
  | "dashboard" | "painel" | "financas" | "marketing" | "planejamento" | "clientes" | "config"
  | "assistente" | "equipe" | "apresentacao" | "importar" | "empresa";

// URL <-> seção: o endereço muda por seção (nomes genéricos), a empresa nunca aparece.
const VIEW_SEG: Record<string, string> = {
  dashboard: "home", painel: "painel", financas: "financas", planejamento: "planejamento", clientes: "clientes",
  assistente: "assistente", config: "config", equipe: "equipe", empresa: "empresa",
  importar: "importar", apresentacao: "apresentacao", marketing: "marketing",
};
const SEG_VIEW: Record<string, View> = {
  home: "dashboard", dashboard: "dashboard", painel: "painel", financas: "financas", planejamento: "planejamento",
  clientes: "clientes", assistente: "assistente", config: "config", equipe: "equipe",
  empresa: "empresa", importar: "importar", apresentacao: "apresentacao", marketing: "marketing",
};

const METRICAS = [
  { key: "dashboard", label: "Home", Icon: LayoutDashboard },
  { key: "painel", label: "Dashboard", Icon: BarChart3 },
  { key: "analises", label: "Análises financeiras", Icon: FileText },
] as const;
// sem métricas recolhidas por enquanto
const METRICAS_MAIS: { key: string; label: string; Icon: typeof LayoutDashboard }[] = [];
// Menu do app (mobile): abre pelo MENU do topo. Os itens de cadastro ficam nos cards
// de "Configurações"; aqui ficam só os itens de sistema.
const MENU_APP: { aba: string; label: string; Icon: typeof LayoutDashboard }[] = [
  { aba: "beneficios", label: "Meus Benefícios", Icon: Gift },
  { aba: "plano", label: "Plano", Icon: CreditCard },
];
// Cards de Configurações (mobile): só os itens de cadastro.
const CONFIG_CARDS = ["dados", "equipe"];
// Sub-abas (pílulas) — Empresa e Equipe
const PILL_EQ: { key: View; label: string }[] = [{ key: "empresa", label: "Dados da empresa" }, { key: "equipe", label: "Equipe" }];
const SUBTABS: Record<string, { key: View; label: string }[]> = {
  empresa: PILL_EQ, equipe: PILL_EQ,
};
// Azul é a cor padrão do app: todos os ícones do menu usam ela.
// (depois cada empresa poderá trocar essa cor.)
const NAV_COR: Record<string, string> = {};
const corDe = (k: string) => NAV_COR[k] || "var(--brand)";
const grupoDe = (v: string) => v;
// anos fixos no seletor do topo (o mesmo em todas as páginas)
const ANOS = ["2026", "2027", "2028"];
// SISTEMA fica oculto (recolhível): tudo que não é o essencial do dia a dia
const SISTEMA_KEYS: string[] = [];
const OPERACOES = [
  { key: "assistente", label: "Assistente", Icon: Sparkles },
  { key: "config", label: "Configurações", Icon: Settings },
] as const;

// trava por empresa: o Colégio Araguaia não exibe "Meus Benefícios" nem "Plano"
const soDigitos = (s?: string | null) => (s || "").replace(/\D/g, "");
function ehColegioAraguaia(empresa?: { nome?: string | null; cnpj?: string | null } | null) {
  return soDigitos(empresa?.cnpj) === "33364563000118" || (empresa?.nome || "").toLowerCase().includes("araguaia");
}

export default function Home({ secao }: { secao?: string } = {}) {
  const router = useRouter();
  const { brand, save: saveBrand, theme, toggleTheme, aplicarRemoto: aplicarBrandRemoto, aplicarLogoCor } = useBrand();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancs, setLancs] = useState<Lancamento[]>([]);
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metrs, setMetrs] = useState<Metrica[]>([]);
  const [view, setView] = useState<View>((secao && SEG_VIEW[secao]) || "dashboard");
  // ===== App mobile (estilo Asaas): detecção de celular, frase do dia, ocultar =====
  const [estreito, setEstreito] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const upd = () => setEstreito(mq.matches);
    upd(); mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  const [fraseHome, setFraseHome] = useState<{ t: string; a: string } | null>(null);
  useEffect(() => setFraseHome(fraseDoDia()), []);
  const { oculto: ocultoHome, toggle: toggleOcultarHome } = useOcultar();
  // back inteligente das telas internas: cada tela registra como voltar 1 nível;
  // se não houver nível interno, o botão azul do topo volta para a Home.
  const voltarRef = useRef<(() => boolean) | null>(null);
  const [abaFin, setAbaFin] = useState("");   // aba atual do Finanças (p/ destacar Dashboard/Análises na barra)
  // reflete a seção atual na URL (/dashboard/<seção>), sem recarregar o painel
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = "/dashboard/" + (VIEW_SEG[view] || "home");
    if (window.location.pathname !== url) window.history.replaceState(null, "", url);
  }, [view]);
  // o Guia de configuração pede navegação; a página troca a view
  useEffect(() => assinarNav((a) => setView(a.view as View)), []);
  const [editor, setEditor] = useState<Categoria | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  // notificações (sino da Home mobile): aniversariantes do mês
  const [notifAberto, setNotifAberto] = useState(false);
  // tutorial guiado dos 3 cards na home do celular (mesmo do desktop)
  const [tutMobile, setTutMobile] = useState(false);
  useEffect(() => { try { if (estreito && localStorage.getItem("me_tut_financas") !== "1") setTutMobile(true); } catch { /* ignore */ } }, [estreito]);
  const fecharTutMobile = () => { setTutMobile(false); try { localStorage.setItem("me_tut_financas", "1"); } catch { /* ignore */ } };
  const [politicaAberta, setPoliticaAberta] = useState(false);   // modal da Política de privacidade (rodapé mobile)
  const [niverLogins, setNiverLogins] = useState<{ id: string; nome: string; nascimento: string }[]>([]);
  useEffect(() => {
    const ler = () => {
      try {
        const s = JSON.parse(localStorage.getItem("me_diretores") || "null");
        const lista = s ? [s.sup, ...(s.admins || [])] : [];
        setNiverLogins(lista.filter((p: { nome?: string; nascimento?: string }) => p && p.nascimento && (p.nome || "").trim())
          .map((p: { id?: string; email?: string; nome: string; nascimento: string }, i: number) => ({ id: `login:${p.id || p.email || i}`, nome: p.nome, nascimento: p.nascimento })));
      } catch { setNiverLogins([]); }
    };
    ler();
    window.addEventListener("me:diretores", ler);
    return () => window.removeEventListener("me:diretores", ler);
  }, []);
  const niverMes = useMemo(() => {
    const mes = new Date().getMonth();
    const mesDe = (iso: string) => Number(iso.slice(5, 7)) - 1;
    const ativos = funcs.filter((f) => f.ativo && f.nascimento).map((f) => ({ id: f.id, nome: f.nome, nascimento: f.nascimento! }));
    const vistos = new Set(ativos.map((p) => (p.nome || "").trim().toLowerCase()));
    const inativos = new Set(funcs.filter((f) => !f.ativo).map((f) => (f.nome || "").trim().toLowerCase()));
    const todos = [...ativos, ...niverLogins.filter((p) => { const n = (p.nome || "").trim().toLowerCase(); return !vistos.has(n) && !inativos.has(n); })];
    return todos.filter((p) => mesDe(p.nascimento) === mes).sort((a, b) => a.nascimento.slice(8, 10).localeCompare(b.nascimento.slice(8, 10)));
  }, [funcs, niverLogins]);
  // nome do Super Admin (definido em Configurações › Meus Usuários) para o rodapé
  const [superNome, setSuperNome] = useState("");
  useEffect(() => {
    const ler = () => { try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); setSuperNome(s?.sup?.nome || ""); } catch { /* ignore */ } };
    ler();
    window.addEventListener("me:diretores", ler);
    window.addEventListener("storage", ler);
    return () => { window.removeEventListener("me:diretores", ler); window.removeEventListener("storage", ler); };
  }, []);
  const [sistemaAberto, setSistemaAberto] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [sideOculta, setSideOculta] = useState(false);   // recolher o sidebar (desktop)
  const [anoSel, setAnoSel] = useState(ANOS.includes(String(new Date().getFullYear())) ? String(new Date().getFullYear()) : ANOS[0]);
  const [fotoPerfil, setFotoPerfil] = useState("");      // foto do avatar (fica no navegador)
  const [bemVindoFechado, setBemVindoFechado] = useState(false);
  const [som, setSomState] = useState(true);
  useEffect(() => { setSomState(somLigado()); }, []);
  const toggleSom = () => { const v = !som; setSom(v); setSomState(v); };

  const carregarDados = useCallback(async () => {
    const [e, l, f, c, m] = await Promise.all([getEmpresa(), getLancamentos(), getFuncionarios(), getClientes(), getIndicadores()]);
    setEmpresa(e); setLancs(l); setFuncs(f); setClientes(c); setMetrs(m);
  }, []);

  useEffect(() => {
    (async () => {
      if (supabaseReady && supabase) {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) { router.replace("/login"); return; }
      }
      const p = await getPerfil();
      if (supabaseReady && !p) { router.replace("/login"); return; }
      // troca de conta no mesmo navegador: zera o cache local para os dados de uma
      // empresa não vazarem para outra (recarrega do banco em seguida).
      try {
        const idConta = p?.id || "";
        const ultima = localStorage.getItem("me_conta_atual");
        if (idConta && ultima && ultima !== idConta) limparDadosLocaisDaConta();
        if (idConta) localStorage.setItem("me_conta_atual", idConta);
      } catch { /* ignore */ }
      setPerfil(p);
      await carregarDados();
      setCarregando(false);
    })();
  }, [router, carregarDados]);

  // chave da foto POR USUÁRIO (cada login tem a sua; antes era por empresa e vazava)
  const fotoKey = perfil?.id ? `me_foto_perfil:${perfil.id}` : "me_foto_perfil";
  useEffect(() => {
    if (typeof window !== "undefined") setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
  }, []);
  // carrega a foto do usuário logado (chave por id)
  useEffect(() => {
    if (typeof window === "undefined" || !perfil?.id) return;
    try { setFotoPerfil(localStorage.getItem(`me_foto_perfil:${perfil.id}`) || ""); } catch { /* ignore */ }
  }, [perfil?.id]);

  // Sincroniza TODO o painel com o banco ao abrir: puxa o que está salvo no banco
  // para o navegador (e, na 1ª vez, sobe o que já existia localmente).
  const sincronizou = useRef(false);
  useEffect(() => {
    if (sincronizou.current || !supabaseReady || !empresa) return;
    sincronizou.current = true;
    const eb = empresa as { id?: string } | null;
    const chaves = [
      "me_calendario_pagamentos", "me_calendario_recebimentos",
      "me_diretores", "me_func_extra",
      "fin_brand", "fin_theme", ...(perfil?.id ? [`me_foto_perfil:${perfil.id}`] : []),
      "me_termos_aceite", "me_termos_aceite:privacidade", "me_termos_aceite:servicos", "me_termos_aceite:protecao",
      "me_guia_concluido", "me_guia_min", "me_tour_financas",
      "me_som", "me_ocultar_valores", "me_bemvindo_fechado",
      "me_empresa_extra:default", ...(eb?.id ? [`me_empresa_extra:${eb.id}`] : []),
    ];
    void sincronizarEstado(chaves).then((vals) => {
      // reaplica no que a página lê só uma vez na montagem
      setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
      // a foto pode ser grande e não caber no localStorage: pega direto do banco (chave por usuário)
      if (perfil?.id) setFotoPerfil(vals[`me_foto_perfil:${perfil.id}`] || localStorage.getItem(`me_foto_perfil:${perfil.id}`) || "");
      // logo/cores vêm do banco (logo grande pode não caber no localStorage): aplica DIRETO
      if (vals["fin_brand"] || vals["fin_theme"]) aplicarBrandRemoto(vals["fin_brand"], vals["fin_theme"]);
    });
  }, [empresa]);

  // Carrega logo/cores do banco SEMPRE que a empresa estiver pronta (F5 inclusive),
  // independente do sync geral acima. É o que garante a marca não sumir ao recarregar.
  useEffect(() => {
    if (!supabaseReady || !empresa) return;
    let vivo = true;
    void sincronizarEstado(["fin_brand", "fin_theme"]).then((v) => {
      if (vivo && (v["fin_brand"] || v["fin_theme"])) aplicarBrandRemoto(v["fin_brand"] || null, v["fin_theme"] || null);
    });
    return () => { vivo = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [empresa]);

  // FONTE CONFIÁVEL: logo/cor guardados na própria tabela empresas (carrega sempre, por qualquer usuário)
  useEffect(() => {
    const e = empresa as (Empresa & { logo_url?: string | null; cor?: string | null }) | null;
    if (e && (e.logo_url || e.cor)) aplicarLogoCor(e.logo_url ?? undefined, e.cor ?? undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [empresa]);

  /** Troca a foto do avatar: abre a tela de recorte (quadrado) e guarda o recorte no navegador. */
  const [recorteFoto, setRecorteFoto] = useState<string | null>(null);
  const [confirmarRemoverFoto, setConfirmarRemoverFoto] = useState(false);
  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    const r = new FileReader();
    r.onload = () => setRecorteFoto(String(r.result));
    r.readAsDataURL(arq);
  }
  async function salvarFotoPerfil(url: string) {
    const reduzida = await reduzirImagem(url, 256, 0.82);              // reduz/comprime antes de guardar
    setFotoPerfil(reduzida);
    salvarEstadoRemoto(fotoKey, reduzida);                            // banco SEMPRE (independente do localStorage)
    try { localStorage.setItem(fotoKey, reduzida); } catch { /* imagem grande: fica no banco + na sessão */ }
  }
  function removerFotoPerfil() {
    setFotoPerfil("");
    apagarEstadoRemoto(fotoKey);
    try { localStorage.removeItem(fotoKey); } catch { /* ignore */ }
  }

  // Interliga a identidade: aplica logo/cor da empresa logada (banco) na marca do painel.
  useEffect(() => {
    // Na conta da plataforma (Super Admin) mantemos a marca Minhas Métricas — não aplica logo de cliente.
    if (["minhasmetricas@gmail.com"].includes((perfil?.email || "").toLowerCase())) return;
    const eb = empresa as (Empresa & { logo_url?: string | null; cor?: string | null }) | null;
    if (!eb) return;
    const patch: { logo?: string; cor?: string; nome?: string } = {};
    if (eb.logo_url && eb.logo_url !== brand.logo) patch.logo = eb.logo_url;
    if (eb.cor && eb.cor !== brand.cor) patch.cor = eb.cor;
    if (eb.nome && eb.nome !== "Minha Empresa" && (!brand.nome || brand.nome === "Minha Empresa")) patch.nome = eb.nome;
    if (Object.keys(patch).length) saveBrand(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa]);

  const nomeMarca = brand.nome && brand.nome !== "Minha Empresa" ? brand.nome : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");
  // saudação usa o nome da empresa quando definido; senão, saudação personalizada ou 1º nome do usuário
  const saudacaoNome = (nomeMarca && nomeMarca !== "Minha Empresa") ? nomeMarca : (brand.saudacao || perfil?.nome || "").split(" ")[0];
  const logoH = brand.logoTamanho || 40;

  if (carregando) {
    return <div className="app"><div className="main"><div className="spin" /></div></div>;
  }

  const saldoInicial = empresa?.saldo_inicial ?? 0;
  const effMetrs = aplicarReais(metrs, lancs, clientes);
  const brandObj = { nome: nomeMarca, logo: brand.logo };

  // Controle de acesso: dono vê tudo; colaborador vê só as áreas liberadas.
  const ehDono = !supabaseReady || (perfil?.papel ?? "dono") !== "colaborador";
  const areasPerm = perfil?.areas ?? [];
  const ehSuper = ["minhasmetricas@gmail.com"].includes((perfil?.email || "").toLowerCase());
  // Marca da barra lateral. No painel modelo (Super Admin / demonstração) mostramos
  // um placeholder desenhado na tela — sem depender de arquivo de imagem — que ocupa
  // o espaço todo e leva de volta ao início. Cliente real segue com a própria logo.
  const marcaPainel = ehSuper || !supabaseReady;
  const irParaHome = () => { setView("dashboard"); setMenuAberto(false); };
  const marcaInterna = marcaPainel ? (
    <button
      onClick={irParaHome}
      title={brand.logo ? "Início" : "Sua logomarca aqui — clique para voltar ao início"}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        background: "transparent", border: 0, borderRadius: 12,
        padding: "4px 6px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      }}
    >
      {brand.logo ? (
        <img src={brand.logo} alt={nomeMarca} style={{ height: logoH, maxHeight: logoH, width: "auto", maxWidth: logoH * 6, objectFit: "contain", display: "block", borderRadius: 8 }} />
      ) : (
        <>
          <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(150deg, var(--brand), var(--brand-dark))", color: "#fff" }}>
            <ImageIcon size={17} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
            <b style={{ fontSize: 13, color: "#f4f5f7", fontWeight: 800, letterSpacing: "-.01em" }}>Sua logomarca</b>
            <small style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>aqui</small>
          </span>
        </>
      )}
    </button>
  ) : (
    brand.logo
      ? <img src={brand.logo} alt={nomeMarca} style={{ height: logoH, maxHeight: logoH, width: "auto", maxWidth: logoH * 6, objectFit: "contain", display: "block", borderRadius: 8 }} />
      : <span className="fallback">{nomeMarca}</span>
  );
  const metricasVis = (ehDono ? METRICAS.slice() : METRICAS.filter((m) => m.key === "dashboard" || areasPerm.includes(m.key)));
  const metricasMaisVis = (ehDono ? METRICAS_MAIS.slice() : METRICAS_MAIS.filter((m) => areasPerm.includes(m.key))).filter((m) => !ehSuper || m.key !== "marketing");
  const maisTemAtivo = metricasMaisVis.some((m) => grupoDe(view) === m.key);
  const opsKeys: string[] = ehDono
    ? OPERACOES.map((o) => o.key)
    : (() => {
        const ops = new Set<string>();
        if (areasPerm.includes("assistente")) ops.add("assistente");
        if (areasPerm.includes("config")) ops.add("config");
        if (areasPerm.includes("financas")) ["contas", "ferramentas", "relatorios", "apresentacao"].forEach((k) => ops.add(k));
        return [...ops];
      })();
  const opsVis = OPERACOES.filter((o) => opsKeys.includes(o.key));
  const opsCore = opsVis.filter((o) => !SISTEMA_KEYS.includes(o.key));
  const opsSistema = opsVis.filter((o) => SISTEMA_KEYS.includes(o.key));
  const sistemaTemAtivo = opsSistema.some((o) => o.key === view);

  const navClick = (k: View) => { playTick(); setView(k); setMenuAberto(false); };

  return (
    <div className="app">


      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="drawer-overlay" onClick={() => setMenuAberto(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="brand" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>{marcaInterna}</span>
              <button className="iconbtn" onClick={() => setMenuAberto(false)}><X size={18} /></button>
            </div>
            <div className="navgroup"><nav className="nav">
              <button onClick={() => { playTick(); setView("assistente"); setMenuAberto(false); }}><Sparkles size={16} color="var(--brand)" /> Assistente</button>
              <button onClick={() => { playTick(); navegar({ view: "config", aba: "dados" }); setMenuAberto(false); }}><Building2 size={16} color="var(--brand)" /> Dados da empresa</button>
              <button onClick={() => { playTick(); navegar({ view: "config", aba: "equipe" }); setMenuAberto(false); }}><Users size={16} color="var(--brand)" /> Equipe</button>
            </nav></div>
            <div className="navgroup"><nav className="nav">
              <button onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={18} /> Sair</button>
            </nav></div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`side${sideOculta ? " side-oculta" : ""}`}>
        <div className="brand" style={{ justifyContent: "space-between", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>{marcaInterna}</span>
          <button className="iconbtn" title="Recolher menu" onClick={() => setSideOculta(true)} style={{ flexShrink: 0 }}>
            <ChevronsLeft size={18} />
          </button>
        </div>

        <div className="navgroup">
          <div className="gl">Métricas</div>
          <nav className="nav">
            {metricasVis.map(({ key, label, Icon }) => { const at = key === "analises" ? (view === "financas" && abaFin === "relatorios") : grupoDe(view) === key; return (
              <button key={key} className={at ? "active" : ""} onClick={() => { playTick(); if (key === "analises") navegar({ view: "financas", aba: "relatorios" }); else setView(key as View); }}>
                <Icon size={16} color={corDe(key)} /> {label}
              </button>
            ); })}
            {metricasMaisVis.length > 0 && (maisAberto || maisTemAtivo) && metricasMaisVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
              <button key={key} className={at ? "active" : ""} onClick={() => { playTick(); setView(key as View); }}>
                <Icon size={16} color={corDe(key)} /> {label}
              </button>
            ); })}
            {metricasMaisVis.length > 0 && !maisTemAtivo && (
              <button onClick={() => setMaisAberto((v) => !v)} style={{ color: "var(--muted)", justifyContent: "flex-start" }}>
                <ChevronDown size={16} style={{ transform: maisAberto ? "none" : "rotate(-90deg)", transition: ".15s" }} /> {maisAberto ? "Menos" : "Mais métricas"}
              </button>
            )}
          </nav>
        </div>

        <div className="navgroup">
          <div className="gl">Operações</div>
          <nav className="nav">
            {opsCore.map(({ key, label, Icon }) => { const at = view === key; return (
              <button key={key} className={at ? "active" : ""} onClick={() => { playTick(); setView(key as View); }}>
                <Icon size={16} color={corDe(key)} /> {label}
              </button>
            ); })}
          </nav>
        </div>

        {opsSistema.length > 0 && (
          <div className="navgroup">
            <button className="gl" onClick={() => setSistemaAberto((v) => !v)} style={{ background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>Sistema <span>{(sistemaAberto || sistemaTemAtivo) ? "▾" : "▸"}</span></button>
            {(sistemaAberto || sistemaTemAtivo) && (
              <nav className="nav">
                {opsSistema.map(({ key, label, Icon }) => { const at = view === key; return (
                  <button key={key} className={at ? "active" : ""} onClick={() => { playTick(); setView(key as View); }}>
                    <Icon size={16} color={corDe(key)} /> {label}
                  </button>
                ); })}
              </nav>
            )}
          </div>
        )}

        <div className="side-foot">
          {/* avatar clicável: troca a foto. Sem foto, mostra um genérico de pessoa. */}
          <label className="av av-btn" title="Clique para alterar sua foto">
            {fotoPerfil
              ? <img src={fotoPerfil} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={20} />}
            <span className="av-edit"><Camera size={14} /></span>
            {fotoPerfil && (
              <button className="av-x" title="Remover foto" onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmarRemoverFoto(true); }}
                style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", border: "2px solid var(--card)", background: "#EF4444", color: "#fff", padding: 0, lineHeight: 0 }}>
                <X size={11} strokeWidth={3} />
              </button>
            )}
            <input type="file" accept="image/*" onChange={escolherFoto} style={{ display: "none" }} />
          </label>
          <div className="who">
            <b>{(perfil?.nome || "").trim().split(" ")[0] || superNome.trim().split(" ")[0] || saudacaoNome || nomeMarca}</b>
            {/* mostra o nome da empresa digitado; sem nome, cai no selo do painel modelo */}
            <small>{nomeMarca !== "Minha Empresa" ? nomeMarca : (marcaPainel ? "Painel demonstrativo" : nomeMarca)}</small>
          </div>
          <button className="iconbtn" title={supabaseReady ? "Sair" : "Login"}
            onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={17} /></button>
        </div>
      </aside>

      {/* botão flutuante para reabrir o menu recolhido (desktop) */}
      {sideOculta && (
        <button className="side-reabrir desk-only" title="Expandir menu" onClick={() => setSideOculta(false)}>
          <ChevronsRight size={18} />
        </button>
      )}

      {/* recorte quadrado da foto de perfil */}
      {recorteFoto && (
        <CropLogo src={recorteFoto} quadrado
          titulo="Ajustar sua foto"
          dica="Arraste o quadro e puxe os cantos para recortar sua foto (formato quadrado)."
          textoRemover="Remover e ficar sem foto"
          onConfirm={(dataUrl) => { salvarFotoPerfil(dataUrl); setRecorteFoto(null); }}
          onCancel={() => setRecorteFoto(null)}
          onRemover={() => { removerFotoPerfil(); setRecorteFoto(null); }} />
      )}

      {/* confirmação de remover a foto de perfil */}
      {confirmarRemoverFoto && (
        <div onClick={() => setConfirmarRemoverFoto(false)}
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: "#EF4444", flexShrink: 0 }}><Trash2 size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Remover a foto?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Sua foto de perfil será apagada e volta o ícone padrão.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setConfirmarRemoverFoto(false)}>Cancelar</button>
              <button className="btn" style={{ background: "#EF4444" }} onClick={() => { removerFotoPerfil(); setConfirmarRemoverFoto(false); }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className={`main${view === "financas" ? " main--wide" : ""}`}>

        {/* ===== APP MOBILE: Home estilo Asaas ===== */}
        {estreito && view === "dashboard" && (
          <div className="mhome">
            <div className="mhome-top">
              <button onClick={() => setMenuAberto(true)} title="Menu"><Menu size={24} color="#79d6f7" /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setTutMobile(true)} title="Tutorial guiado"><Sparkles size={22} color="#79d6f7" /></button>
                <button onClick={toggleOcultarHome} title={ocultoHome ? "Mostrar valores" : "Ocultar valores"}>{ocultoHome ? <EyeOff size={22} color="#79d6f7" /> : <Eye size={22} color="#79d6f7" />}</button>
                <button onClick={() => setNotifAberto((v) => !v)} title="Aniversariantes do mês" style={{ position: "relative" }}><Bell size={22} color="#79d6f7" />{niverMes.length > 0 && <span className="mhome-dot" />}</button>
              </div>
            </div>

            <div className="mhome-quote">
              <p>{fraseHome ? `“${fraseHome.t.replace(/\.\s*$/, "")}”` : "…"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button onClick={async () => { if (!fraseHome) return; const txt = `“${fraseHome.t.replace(/\.\s*$/, "")}”\n\n📊 Pulso do dia · Minhas Métricas`; try { if (navigator.share) { await navigator.share({ text: txt }); } else { await navigator.clipboard.writeText(txt); } } catch { /* ignore */ } }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: 0, borderRadius: 99, padding: "9px 16px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 18px -8px rgba(220,39,67,.55)" }}>
                  <Instagram size={15} /> Compartilhar
                </button>
              </div>
            </div>

            <div style={{ padding: "2px 16px 8px", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Escolha aqui o melhor lugar para preencher seus dados</div>
            <div className="mhome-wgrid" style={{ padding: "0 14px 10px" }}>
              {[{ aba: "estrutura", label: "Painel financeiro", Icon: Layers }, { aba: "calendario", label: "Calendário", Icon: CalendarDays }, { aba: "folha", label: "Folha de pagamento", Icon: Wallet }].map((c) => (
                <button key={c.aba} data-aba={c.aba} className="mhome-wcard" onClick={() => { playTick(); navegar({ view: "financas", aba: c.aba }); }}>
                  <span className="mhome-wcard-ico"><c.Icon size={22} /></span>
                  <b>{c.label}</b>
                </button>
              ))}
            </div>

            <div className="mhome-gray">
              <div style={{ marginTop: 4 }}><PainelCobrancas ano={Number(anoSel)} semTitulo /></div>
            </div>

            {/* rodapé com links (estilo app) */}
            {(() => { const link: React.CSSProperties = { background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", padding: 0 }; return (
              <div style={{ padding: "20px 16px 26px", marginTop: 8, borderTop: "1px solid var(--line)", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <button style={link} onClick={() => setPoliticaAberta(true)}>Política de privacidade</button>
                  <span style={{ color: "var(--line-2)" }}>·</span>
                  <button style={link} onClick={() => { playTick(); navegar({ view: "config", aba: "beneficios" }); }}>Benefícios</button>
                  <span style={{ color: "var(--line-2)" }}>·</span>
                  <button style={link} onClick={() => { playTick(); navegar({ view: "config", aba: "plano" }); }}>Planos</button>
                </div>
              </div>
            ); })()}

            {tutMobile && <TutorialFinancas onFim={fecharTutMobile} />}
          </div>
        )}

        {/* barra fixa no rodapé (efeito vidro) — navegação principal, em TODAS as telas do app (some com o menu aberto) */}
        {estreito && !menuAberto && (
          <div className="mhome-tabbar">
            <button className={`mhome-tab${view === "dashboard" ? " ativo" : ""}`} onClick={() => { playTick(); setView("dashboard"); }}><HomeIcon size={22} /><b>Home</b></button>
            <button className={`mhome-tab${view === "financas" && abaFin === "dashboard" ? " ativo" : ""}`} onClick={() => { playTick(); navegar({ view: "financas", aba: "dashboard" }); }}><LayoutDashboard size={22} /><b>Dashboard</b></button>
            <button className={`mhome-tab${view === "financas" && abaFin === "relatorios" ? " ativo" : ""}`} onClick={() => { playTick(); navegar({ view: "financas", aba: "relatorios" }); }}><FileText size={22} /><b>Análises</b></button>
          </div>
        )}

        {/* notificações: aniversariantes do mês (sino do topo, mobile e desktop) */}
        {notifAberto && (
          <div onClick={() => setNotifAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(15,23,42,.4)", backdropFilter: "blur(1px)", display: "flex", justifyContent: "flex-end", alignItems: "flex-start", padding: "62px 16px 0" }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 340, padding: 16, boxShadow: "0 18px 44px -18px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Cake size={15} /></span>
                <b style={{ fontSize: 14, textTransform: "capitalize" }}>Aniversariantes de {new Date().toLocaleDateString("pt-BR", { month: "long" })}</b>
              </div>
              {niverMes.length === 0
                ? <p className="sub" style={{ fontStyle: "italic", fontSize: 13, margin: 0 }}>Nenhum aniversariante neste mês.</p>
                : <div style={{ display: "grid", gap: 9 }}>
                    {niverMes.map((p) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span title={p.nome} style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                        <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 10px", borderRadius: 99 }}>🎈 {p.nascimento.slice(8, 10)}/{p.nascimento.slice(5, 7)}</span>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        )}

        {/* modal: Política de privacidade (aberto pelo rodapé) */}
        {politicaAberta && (
          <div onClick={() => setPoliticaAberta(false)} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 14, overflow: "auto" }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, padding: 0, maxHeight: "92vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
                <b style={{ fontSize: 15 }}>Termos e Políticas</b>
                <button onClick={() => setPoliticaAberta(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
              </div>
              <div style={{ padding: 18 }}><TermosDeUso /></div>
            </div>
          </div>
        )}


        {/* ===== DESKTOP: controles + conteúdo do dashboard ===== */}
        {!estreito && (
        <>
        <div className="topctrls">
          {/* o seletor de ano agora fica dentro de cada tela (Finanças/Calendário têm o seu) */}
          <button className="btn ghost sm desk-only" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}</button>
          <button className="btn ghost sm desk-only" onClick={toggleSom} title={som ? "Desligar sons" : "Ligar sons"}>{som ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
          {view === "dashboard" && (
            <button className="btn ghost sm desk-only" onClick={() => setNotifAberto((v) => !v)} title="Aniversariantes do mês" style={{ position: "relative" }}>
              <Bell size={15} />{niverMes.length > 0 && <span style={{ position: "absolute", top: 3, right: 5, width: 7, height: 7, borderRadius: "50%", background: "#EF4444" }} />}
            </button>
          )}
        </div>
        {SUBTABS[view] && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {SUBTABS[view].map((t) => {
              const at = view === t.key;
              return <button key={t.key} onClick={() => { playTick(); setView(t.key); }}
                style={{ flexShrink: 0, background: at ? "var(--brand)" : "var(--card)", color: at ? "#fff" : "var(--txt)", border: at ? "1px solid var(--brand)" : "1px solid var(--line-2)", boxShadow: "none", borderRadius: 99, padding: "6px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>;
            })}
          </div>
        )}
        {view === "dashboard" && lancs.length === 0 && !bemVindoFechado && (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>👋 Bem-vindo ao seu painel!</h3>
              <button className="iconbtn" title="Fechar" onClick={() => { setBemVindoFechado(true); if (typeof window !== "undefined") { localStorage.setItem("me_bemvindo_fechado", "1"); salvarEstadoRemoto("me_bemvindo_fechado", "1"); } }}>✕</button>
            </div>
            <p className="sub" style={{ marginBottom: 14 }}>Comece configurando sua empresa. O restante do painel se monta a partir daí.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn" href="/guia" target="_blank" rel="noopener">📖 Como usar o app</a>
              <button className="btn ghost" onClick={() => setView("empresa")}>🎨 Configurar empresa / logo</button>
              <button className="btn ghost" onClick={() => setView("importar")}>📥 Importar planilha</button>
            </div>
          </div>
        )}
        {!estreito && view === "dashboard" && <div style={{ margin: "6px 2px 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Escolha aqui o melhor lugar para preencher seus dados</div>}
        {!estreito && view === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            {[{ aba: "estrutura", label: "Painel financeiro", sub: "Receitas, custos e resultado", Icon: Layers },
              { aba: "calendario", label: "Calendário", sub: "Contas a pagar e a receber", Icon: CalendarDays },
              { aba: "folha", label: "Folha de pagamento", sub: "Salários, benefícios e encargos", Icon: Wallet }].map((c) => (
              <button key={c.aba} onClick={() => { playTick(); navegar({ view: "financas", aba: c.aba }); }}
                style={{ position: "relative", overflow: "hidden", minHeight: 168, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  padding: "22px 24px", borderRadius: 22, color: "#fff",
                  border: "1px solid color-mix(in srgb, var(--brand) 45%, transparent)",
                  background: "linear-gradient(140deg, color-mix(in srgb, var(--brand) 96%, #4bc6ff), color-mix(in srgb, var(--brand-dark) 78%, #06122e))",
                  boxShadow: "0 20px 44px -18px color-mix(in srgb, var(--brand) 70%, transparent), 0 0 30px -10px color-mix(in srgb, var(--brand) 55%, transparent)",
                  transition: "transform .18s ease, box-shadow .18s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 28px 54px -18px color-mix(in srgb, var(--brand) 85%, transparent), 0 0 44px -8px color-mix(in srgb, var(--brand) 70%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 20px 44px -18px color-mix(in srgb, var(--brand) 70%, transparent), 0 0 30px -10px color-mix(in srgb, var(--brand) 55%, transparent)"; }}>
                {/* grade de pontos (tech) */}
                <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(rgba(255,255,255,.18) 1px, transparent 1px)", backgroundSize: "18px 18px", maskImage: "radial-gradient(120% 90% at 85% -10%, #000, transparent 70%)", WebkitMaskImage: "radial-gradient(120% 90% at 85% -10%, #000, transparent 70%)" }} />
                {/* orbe de brilho */}
                <span aria-hidden style={{ position: "absolute", right: -40, top: -50, width: 150, height: 150, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle, rgba(255,255,255,.28), transparent 68%)" }} />
                <span aria-hidden style={{ position: "absolute", left: -30, bottom: -50, width: 120, height: 120, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle, color-mix(in srgb, var(--brand) 60%, transparent), transparent 70%)" }} />
                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <span style={{ width: 56, height: 56, borderRadius: 16, display: "grid", placeItems: "center", flexShrink: 0, background: "linear-gradient(150deg, rgba(255,255,255,.28), rgba(255,255,255,.08))", border: "1px solid rgba(255,255,255,.4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 8px 20px -8px rgba(0,0,0,.35)" }}><c.Icon size={28} color="#fff" /></span>
                  <span style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.28)" }}><ChevronRight size={18} color="#fff" /></span>
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <b style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", display: "block", lineHeight: 1.15 }}>{c.label}</b>
                  <p style={{ margin: "5px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.82)" }}>{c.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {view === "dashboard" && <div style={{ marginTop: 16 }}><PainelCobrancas ano={Number(anoSel)} semTitulo /></div>}
        {view === "dashboard" && (
          <div className="cal-promo" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
            <CalendarioRecebimento ano={Number(anoSel)} />
            <PromoParaVoce />
          </div>
        )}
        {!estreito && view === "dashboard" && (() => { const link: React.CSSProperties = { background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--muted)", padding: 0 }; return (
          <div style={{ marginTop: 20, padding: "18px 0 6px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
            <button style={link} onClick={() => setPoliticaAberta(true)}>Política de privacidade</button>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <button style={link} onClick={() => { playTick(); navegar({ view: "config", aba: "beneficios" }); }}>Benefícios</button>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <button style={link} onClick={() => { playTick(); navegar({ view: "config", aba: "plano" }); }}>Plano</button>
          </div>
        ); })()}
        </>
        )}

        {/* Conteúdo das telas (desktop e mobile-sub); no mobile ganha padding próprio */}
        <div className={estreito && view !== "dashboard" ? "msub-body" : undefined} style={estreito && view === "dashboard" ? { display: "none" } : undefined}>
        {/* telas ainda em construção — o conteúdo o Diogo define depois */}
        {view === "financas" && <TelaFinancas empresa={empresa} brand={brand} ano={Number(anoSel)} setAno={(a) => setAnoSel(String(a))} reload={carregarDados} voltarRef={voltarRef} onAba={setAbaFin} />}
        {view === "painel" && <TelaPainel ano={Number(anoSel)} setAno={(a) => setAnoSel(String(a))} />}
        {view === "marketing" && <EmConstrucao titulo="Marketing" />}
        {view === "planejamento" && <TelaUpgrade Icon={Compass} titulo="Planejamento estratégico" texto="Defina metas, pilares e o rumo da sua empresa em um só lugar. Avance no seu plano ativando este módulo." preco="R$ 29,90" />}
        {view === "clientes" && <TelaUpgrade Icon={UserPlus} titulo="Cadastro de clientes" texto="Cadastre e organize seus clientes em um só lugar. Ative este módulo no seu plano para liberar esta tela." preco="R$ 39,90" />}
        {view === "config" && <TelaConfig empresa={empresa} funcs={funcs} reload={carregarDados} brand={brand} saveBrand={saveBrand} loginEmail={perfil?.email || ""} ehDono={ehDono} voltarRef={voltarRef} />}
        {view === "assistente" && <Assistente metrs={effMetrs} lancs={lancs} clientes={clientes} funcs={funcs} saldoInicial={saldoInicial} nome={saudacaoNome} reload={carregarDados} brand={brandObj} ano={Number(anoSel)} />}
        {view === "apresentacao" && <GerarApresentacao funcs={funcs} brand={brandObj} ano={Number(anoSel)} />}
        {view === "equipe" && <Funcionarios funcs={funcs} reload={carregarDados} empresa={empresa} brand={brand} loginEmail={perfil?.email || ""} ehDono={ehDono} />}
        {view === "importar" && <Importar reload={carregarDados} empresa={empresa} brand={brand} />}
        {view === "empresa" && <Config empresa={empresa} reload={carregarDados} brand={brand} saveBrand={saveBrand} />}
        </div>
      </main>

      {editor && (
        <IndicatorEditor categoria={editor} onClose={() => setEditor(null)}
          onSaved={async () => { setMetrs(await getIndicadores()); setEditor(null); }} />
      )}

      <LgpdConsent userKey={perfil?.email || perfil?.id || "demo"} onSair={async () => { await logout(); router.replace("/login"); }} />

      {/* Guia de configuração inicial (some quando tudo estiver preenchido) — só no desktop */}
      {!estreito && <GuiaConfiguracao empresa={empresa} brand={brand} funcsCount={funcs.length} />}


    </div>
  );
}

/** Espaçador no lugar do antigo aviso das abas de Finanças (mantém o respiro sem o texto). */
function AvisoFinancas() {
  return <div aria-hidden style={{ marginBottom: 18, height: 48 }} />;
}

/** Seletor: Calendário de Pagamentos ou de Recebimentos. */
function EscolhaCalendario({ onEscolher }: { onEscolher: (t: "pagamentos" | "recebimentos" | "financeiro") => void }) {
  const opcoes = [
    { key: "pagamentos" as const, titulo: "Despesas", desc: "Contas a pagar, com vencimentos e despesas recorrentes.", Icon: ArrowUpCircle, cor: "#EF4444" },
    { key: "recebimentos" as const, titulo: "Faturamento", desc: "Faturamento marcado por data.", Icon: ArrowDownCircle, cor: "#10B981" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
      {opcoes.map((o) => (
        <button key={o.key} onClick={() => onEscolher(o.key)} className="card"
          style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: 22, display: "flex", alignItems: "center", gap: 16, border: "1px solid var(--line)", background: "var(--card)" }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, flexShrink: 0, display: "grid", placeItems: "center", background: `${o.cor}1f`, color: o.cor }}><o.Icon size={26} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block", fontSize: 16 }}>{o.titulo}</b>
            <span className="sub" style={{ display: "block", marginTop: 3, fontSize: 12.5, lineHeight: 1.5 }}>{o.desc}</span>
          </span>
          <ChevronRight size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
        </button>
      ))}
    </div>
  );
}

/** Um dos calendários (pagamentos ou recebimentos) com botão de voltar à escolha. */
function SubCalendario({ tipo, ano, onVoltar }: { tipo: "pagamentos" | "recebimentos"; ano: number; onVoltar: () => void }) {
  return (
    <div>
      <button className="botao-voltar-interno" onClick={onVoltar} title="Voltar" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", marginBottom: 14, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}>
        <ArrowLeft size={17} /> Voltar
      </button>
      <CalendarioPagamentos anoInicial={ano} tipo={tipo} />
    </div>
  );
}

/**
 * Tela Dashboard (mesmo estilo do Finanças): título + abas.
 * Abre no Dashboard e tem a aba "Análises financeiras".
 */
function TelaPainel({ ano, setAno }: { ano: number; setAno: (a: number) => void }) {
  return <FinancasDashboard ano={ano} setAno={setAno} />;
}

// ---- Tutorial guiado das 3 abas de Finanças (+ vídeo) ----
const PASSOS_FIN: { sel: string; emoji: string; titulo: string; texto: React.ReactNode }[] = [
  { sel: '[data-aba="estrutura"]', emoji: "🧾", titulo: "Painel financeiro", texto: <>É <b>aqui que você preenche</b> suas <b>receitas</b> e <b>custos</b> e vê o <b>resultado</b> do mês. Tudo começa por aqui.</> },
  { sel: '[data-aba="calendario"]', emoji: "🗓️", titulo: "Calendário", texto: <>Marque as <b>contas a pagar e a receber</b> por data. O que você lança no Calendário <b>aparece automaticamente no Painel financeiro</b>: os dois estão <b>conectados</b>.</> },
  { sel: '[data-aba="folha"]', emoji: "💼", titulo: "Folha de pagamento", texto: <>Cadastre <b>salários</b>, <b>benefícios</b> e <b>encargos</b> da equipe. Os totais também entram no Painel financeiro.</> },
  { sel: '[data-tour="video"]', emoji: "▶️", titulo: "Vídeo", texto: <>Quer ver tudo em ação? Assista ao <b>vídeo-tutorial</b> completo.</> },
];
function TutorialFinancas({ onFim }: { onFim: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const cur = PASSOS_FIN[step];
  // ampulheta de 5s por passo: só libera o "Próximo" quando termina (força ler cada item)
  const [prog, setProg] = useState(0);
  useEffect(() => {
    setProg(0);
    const start = Date.now();
    const id = window.setInterval(() => { const p = Math.min(100, ((Date.now() - start) / 8000) * 100); setProg(p); if (p >= 100) window.clearInterval(id); }, 50);
    return () => window.clearInterval(id);
  }, [step]);
  const pronto = prog >= 100;
  useEffect(() => {
    const upd = () => { const el = document.querySelector(cur.sel); if (el) { const r = el.getBoundingClientRect(); setRect({ left: r.left, top: r.top, width: r.width, height: r.height }); } else setRect(null); };
    upd(); const t = window.setTimeout(upd, 140);
    window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [step, cur.sel]);
  const popW = 340;
  const largura = typeof window !== "undefined" ? window.innerWidth : 1200;
  const altura = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = rect ? Math.max(16, Math.min(rect.left, largura - popW - 16)) : 0;
  const abaixo = rect ? rect.top + rect.height + 16 : 0;
  const top = rect && abaixo + 220 > altura ? Math.max(16, rect.top - 220) : abaixo;
  const ultimo = step === PASSOS_FIN.length - 1;
  const posBalao: React.CSSProperties = rect
    ? { position: "fixed", left, top, width: popW }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: popW };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 170, background: rect ? undefined : "rgba(15,23,42,.62)" }}>
      {rect && <div style={{ position: "fixed", left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(15,23,42,.62)", border: "2px solid var(--brand)", pointerEvents: "none", transition: "all .2s" }} />}
      <div style={{ ...posBalao, maxWidth: "calc(100vw - 32px)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 14, boxShadow: "0 22px 54px -12px rgba(0,0,0,.55)", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{cur.emoji}</span>
          <b style={{ fontSize: 15.5, flex: 1 }}>{cur.titulo}</b>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 9px", borderRadius: 99 }}>{step + 1} de {PASSOS_FIN.length}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--txt)" }}>{cur.texto}</p>
        {/* ampulheta / linha do tempo de 5s */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 12px" }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>⏳</span>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prog}%`, background: "var(--brand)", transition: "width .05s linear" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {step > 0 && <button className="btn ghost sm" onClick={() => setStep((s) => s - 1)}>Anterior</button>}
          <div style={{ flex: 1 }} />
          <button className="btn sm" disabled={!pronto} onClick={() => { if (ultimo) onFim(); else setStep((s) => s + 1); }}
            style={{ opacity: pronto ? 1 : .5, cursor: pronto ? "pointer" : "default" }}>{ultimo ? "Concluir ✓" : "Próximo →"}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tela de Finanças no formato do Hub: título com "Gerar DRE", os atalhos e as
 * três abas (Dashboard, Estrutura de Receitas e Custos, Calendário de
 * Pagamentos). Cada aba abre "em construção" por enquanto.
 */
function TelaFinancas({ empresa, brand, ano, setAno, reload, voltarRef, onNivel, onAba }: { empresa: Empresa | null; brand: React.ComponentProps<typeof Config>["brand"]; ano: number; setAno: (a: number) => void; reload: () => Promise<void>; voltarRef?: React.MutableRefObject<(() => boolean) | null>; onNivel?: (label: string) => void; onAba?: (aba: string) => void }) {
  const [aba, setAba] = useState<"dashboard" | "estrutura" | "folha" | "calendario" | "relatorios" | "importar">("estrutura");
  // dentro do Calendário: escolha entre pagamentos e recebimentos (null = mostra as 2 opções)
  const [calSub, setCalSub] = useState<"pagamentos" | "recebimentos" | "financeiro" | null>(null);
  // no celular, Finanças abre num menu de CARDS; ao tocar num card, "entra" na seção
  const [estreito, setEstreito] = useState(false);
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const upd = () => setEstreito(mq.matches);
    upd(); mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  // Guia de configuração pode abrir uma aba/sub específica de Finanças
  useEffect(() => {
    const aplicar = (a: { view: string; aba?: string; sub?: string }) => {
      if (a.view !== "financas") return;
      if (a.aba) { setAba(a.aba as typeof aba); setEntrou(true); }
      if (a.sub === "pagamentos" || a.sub === "recebimentos") setCalSub(a.sub);
    };
    const at = pegarAlvo(); if (at) aplicar(at);
    return assinarNav(aplicar);
  }, []);
  // registra como voltar 1 nível (calendário → dentro; seção → cards) para o botão do topo
  useEffect(() => {
    if (!voltarRef) return;
    voltarRef.current = () => {
      if (calSub) { setCalSub(null); return true; }
      // Dashboard e Relatórios são abertos pelos atalhos da Home (não são cards do menu de Finanças):
      // o voltar deles vai direto pra Home. Os cards do menu voltam pro menu de cards.
      const abaCard = aba !== "dashboard" && aba !== "relatorios";
      if (entrou && abaCard) { setEntrou(false); return true; }
      return false;
    };
    return () => { if (voltarRef) voltarRef.current = null; };
  }, [calSub, entrou, aba, voltarRef]);
  // rótulo do voltar no topo: nos cards internos volta para "Finanças"; nos atalhos da Home, "Home"
  useEffect(() => {
    const abaCard = aba !== "dashboard" && aba !== "relatorios";
    onNivel?.(calSub || (entrou && abaCard) ? "Finanças" : "Home");
  }, [entrou, calSub, aba, onNivel]);
  // informa a aba atual à página (para destacar Dashboard/Análises na barra fixa)
  useEffect(() => { onAba?.(aba); }, [aba, onAba]);

  // pop-up do vídeo-tutorial (ainda não gravado)
  const [videoTut, setVideoTut] = useState(false);
  // tutorial guiado das 3 abas (+ vídeo); abre 1x sozinho e pelo botão "Tutorial"
  const [tutFin, setTutFin] = useState(false);
  useEffect(() => { try { if (!estreito && localStorage.getItem("me_tut_financas") !== "1") setTutFin(true); } catch { /* ignore */ } }, [estreito]);
  const fecharTutFin = () => { setTutFin(false); try { localStorage.setItem("me_tut_financas", "1"); } catch { /* ignore */ } };
  const rotulos: Record<typeof aba, string> = {
    dashboard: "Dashboard", estrutura: "Painel financeiro", folha: "Folha de pagamento",
    calendario: "Calendário", relatorios: "Análises financeiras", importar: "Importar planilha",
  };
  // aba em barra (estilo print2): ícone + rótulo, ativo em azul com sublinhado
  const tab = (ativo: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
    padding: "11px 16px", marginBottom: -1, fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    background: "transparent", border: 0,
    borderBottom: `2px solid ${ativo ? "var(--brand)" : "transparent"}`,
    color: ativo ? "var(--brand)" : "var(--muted)",
  });
  // Dashboard e Relatórios saíram das abas: agora são abertos pelos 2 cards da Home.
  const abas: { key: typeof aba; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "estrutura", label: "Painel financeiro", Icon: Layers },
    { key: "calendario", label: "Calendário", Icon: CalendarDays },
    { key: "folha", label: "Folha de pagamento", Icon: Wallet },
  ];
  // Dashboard/Relatório são abertos pelos atalhos da Home: sem cabeçalho/abas, só um "Voltar".
  const ehAtalhoHome = aba === "dashboard" || aba === "relatorios";
  return (
    <div>
      {/* Voltar (só nos atalhos da Home: Dashboard/Relatório) */}
      {!estreito && ehAtalhoHome && (
        <button onClick={() => { playTick(); navegar({ view: "dashboard" }); }} title="Voltar para a Home"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", marginBottom: 16, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}>
          <ArrowLeft size={17} /> Voltar
        </button>
      )}

      {/* título — escondido no celular (o cabeçalho azul já mostra "Finanças") */}
      {!estreito && !ehAtalhoHome && (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff", flexShrink: 0 }}>
          <DollarSign size={22} />
        </span>
        <h2 style={{ margin: 0, fontSize: "clamp(21px, 6vw, 27px)", fontWeight: 800, letterSpacing: "-.6px" }}>Finanças</h2>
        <button data-tour="video" onClick={() => setVideoTut(true)} title="Assistir ao vídeo-tutorial"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)", padding: "6px 12px", borderRadius: 99 }}>
          <PlayCircle size={18} /> Vídeo
        </button>
        <button onClick={() => setTutFin(true)} title="Fazer o tutorial guiado"
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)", padding: "6px 12px", borderRadius: 99 }}>
          <Sparkles size={16} /> Tutorial
        </button>
      </div>
      )}
      {tutFin && !estreito && <TutorialFinancas onFim={fecharTutFin} />}

      {/* no celular vai direto pro conteúdo (a navegação é pela barra fixa da Home) */}
      {(
      <>
      {/* DESKTOP: barra de abas */}
      {!estreito && !ehAtalhoHome && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        <div className="abas-scroll" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, overflowX: "auto" }}>
          {abas.map((a, i) => (
            <Fragment key={a.key}>
              {i > 0 && <span style={{ width: 1, height: 18, background: "var(--line-2)", alignSelf: "center", margin: "0 4px", flexShrink: 0 }} />}
              <button data-aba={a.key} onClick={() => { setAba(a.key); if (a.key === "calendario") setCalSub(null); }} style={tab(aba === a.key)}>
                <a.Icon size={16} /> {a.label}
              </button>
            </Fragment>
          ))}
        </div>
      </div>
      )}

      {/* aviso/informativo por aba (no Calendário, só na tela de escolha) */}
      {!estreito && !ehAtalhoHome && !(aba === "calendario" && calSub) && <AvisoFinancas />}

      {aba === "estrutura" ? <EstruturaFinancas ano={ano} setAno={setAno} />
        : aba === "folha" ? <FolhaPagamento empresa={empresa} />
        : aba === "dashboard" ? <FinancasDashboard ano={ano} setAno={setAno} />
        : aba === "calendario" ? (calSub
            ? (calSub === "financeiro"
                ? <div>
                    <button className="botao-voltar-interno" onClick={() => setCalSub(null)} title="Voltar" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", marginBottom: 14, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}><ArrowLeft size={17} /> Voltar</button>
                    <CalendarioRecebimento ano={ano} />
                  </div>
                : <SubCalendario tipo={calSub} ano={ano} onVoltar={() => setCalSub(null)} />)
            : <EscolhaCalendario onEscolher={setCalSub} />)
        : aba === "relatorios" ? <RelatoriosFinancas empresa={empresa} brand={brand} ano={ano} setAno={setAno} />
        : aba === "importar" ? <Importar reload={reload} empresa={empresa} brand={brand} />
        : <EmConstrucao titulo={rotulos[aba]} />}
      </>
      )}


      {videoTut && (
        <div onClick={() => setVideoTut(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(3px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, background: "var(--card)", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
              <b style={{ fontSize: 15 }}>Vídeo-tutorial · Finanças</b>
              <button onClick={() => setVideoTut(false)} title="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", padding: 2 }}><X size={20} /></button>
            </div>
            {/* tela do player (16:9) */}
            <div style={{ position: "relative", aspectRatio: "16 / 9", background: "radial-gradient(120% 120% at 50% 40%, #1f2937, #0b1220)", display: "grid", placeItems: "center" }}>
              <span style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "2px solid rgba(255,255,255,.55)", color: "#fff", backdropFilter: "blur(2px)" }}>
                <Play size={34} fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
              </span>
              {/* barra de progresso decorativa */}
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, height: 4, borderRadius: 99, background: "rgba(255,255,255,.22)" }}>
                <div style={{ width: "0%", height: "100%", borderRadius: 99, background: "#fff" }} />
              </div>
            </div>
            <div style={{ padding: "16px 18px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--txt)" }}>Tutorial será enviado em breve</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Configurações no mesmo formato de Finanças: título + abas Dados da empresa / Equipe. */
function TelaConfig({ empresa, funcs, reload, brand, saveBrand, loginEmail, ehDono = true, voltarRef, onNivel }: {
  empresa: Empresa | null; funcs: Funcionario[]; reload: () => Promise<void>;
  brand: React.ComponentProps<typeof Config>["brand"]; saveBrand: React.ComponentProps<typeof Config>["saveBrand"];
  loginEmail?: string; ehDono?: boolean; voltarRef?: React.MutableRefObject<(() => boolean) | null>; onNivel?: (label: string) => void;
}) {
  type AbaCfg = "dados" | "equipe" | "beneficios" | "plano";
  const [aba, setAba] = useState<AbaCfg>("equipe");
  // no celular Configurações abre num menu de CARDS (igual Finanças); ao tocar, "entra"
  const [estreito, setEstreito] = useState(false);
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const upd = () => setEstreito(mq.matches);
    upd(); mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  // alvo de "voltar" quando se chega aqui vindo de outra tela (ex.: Folha de pagamento)
  const [voltarAlvo, setVoltarAlvo] = useState<import("@/lib/nav").AlvoNav | null>(null);
  // Guia de configuração / MENU podem abrir uma aba específica (entra direto na seção)
  useEffect(() => {
    const abrir = (a: import("@/lib/nav").AlvoNav) => { if (a.view === "config" && a.aba) { setAba(a.aba as AbaCfg); setEntrou(true); setVoltarAlvo(a.voltar ?? null); } };
    const a = pegarAlvo(); if (a) abrir(a);
    return assinarNav(abrir);
  }, []);
  // ao trocar de aba manualmente, some o "voltar"
  useEffect(() => { if (aba !== "equipe") setVoltarAlvo(null); }, [aba]);
  // back inteligente: só os cards de cadastro voltam pro menu de cards.
  // Termos/Benefícios/Plano vêm do MENU do topo (não são cards), então voltam pra Home.
  useEffect(() => {
    if (!voltarRef) return;
    voltarRef.current = () => { if (entrou && CONFIG_CARDS.includes(aba)) { setEntrou(false); return true; } return false; };
    return () => { if (voltarRef) voltarRef.current = null; };
  }, [entrou, aba, voltarRef]);
  useEffect(() => { onNivel?.(entrou && CONFIG_CARDS.includes(aba) ? "Configurações" : "Home"); }, [entrou, aba, onNivel]);
  // destaca a aba Meus Benefícios por 5s APÓS o usuário fechar o recado de parabéns
  const [destaqueBenef, setDestaqueBenef] = useState(false);
  useEffect(() => {
    const destacar = () => {
      if (typeof window === "undefined" || localStorage.getItem("me_destacar_benef") !== "1") return;
      localStorage.removeItem("me_destacar_benef");   // dispara uma única vez
      setDestaqueBenef(true); window.setTimeout(() => setDestaqueBenef(false), 5000);
    };
    destacar();   // caso o usuário abra Configurações só depois de fechar o recado
    window.addEventListener("me:destacar-beneficios", destacar);
    return () => window.removeEventListener("me:destacar-beneficios", destacar);
  }, []);
  // Benefícios e Plano saíram das abas (agora ficam no rodapé); o conteúdo continua acessível por lá.
  const abas: { key: AbaCfg; label: string; Icon: typeof Settings }[] = [
    { key: "dados", label: "Dados da Empresa", Icon: Building2 },
    { key: "equipe", label: "Equipe", Icon: Users },
  ];
  const tab = (ativo: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
    padding: "11px 15px", marginBottom: -1, fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    background: "transparent", border: 0,
    borderBottom: `2px solid ${ativo ? "var(--brand)" : "transparent"}`,
    color: ativo ? "var(--brand)" : "var(--muted)",
  });
  const rotulo = abas.find((a) => a.key === aba)?.label || "";
  return (
    <div>
      {/* título — escondido no celular (o cabeçalho azul já mostra "Configurações") */}
      {!estreito && (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff", flexShrink: 0 }}>
          <Settings size={22} />
        </span>
        <h2 style={{ margin: 0, fontSize: "clamp(21px, 6vw, 27px)", fontWeight: 800, letterSpacing: "-.6px" }}>Configurações</h2>
      </div>
      )}

      {/* no celular vai direto pro conteúdo (a navegação é pelo menu ☰ e pela barra fixa) */}
      {(
      <>
      {!estreito && (
      <div className="abas-scroll" style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto", borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {abas.map((a, i) => (
          <Fragment key={a.key}>
            {i > 0 && <span style={{ width: 1, height: 18, background: "var(--line-2)", alignSelf: "center", margin: "0 4px", flexShrink: 0 }} />}
            <button onClick={() => setAba(a.key)} style={tab(aba === a.key)}
              className={a.key === "beneficios" && destaqueBenef ? "destaque-benef" : undefined}>
              <a.Icon size={16} /> {a.label}
            </button>
          </Fragment>
        ))}
      </div>
      )}

      {aba === "equipe" && voltarAlvo && (
        <button onClick={() => { const v = voltarAlvo; setVoltarAlvo(null); navegar(v); }} title="Voltar para a Folha de pagamento"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", marginBottom: 14, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}>
          <ArrowLeft size={17} /> Voltar para a Folha de pagamento
        </button>
      )}

      {aba === "dados" ? <Config secao="tudo" empresa={empresa} reload={reload} brand={brand} saveBrand={saveBrand} />
        : aba === "equipe" ? <Funcionarios funcs={funcs} reload={reload} empresa={empresa} brand={brand} loginEmail={loginEmail} ehDono={ehDono} irParaPlano={() => setAba("plano")} />
        : aba === "beneficios" ? <MeusBeneficios />
        : aba === "plano" ? <MeuPlano />
        : <EmConstrucao titulo={rotulo} />}
      </>
      )}
    </div>
  );
}

/** Tela ainda sem conteúdo definido — placeholder padrão de "em construção". */
/** Tela de módulo bloqueado: convida a fazer upgrade e leva ao Plano. */
function TelaUpgrade({ Icon, titulo, texto, preco }: { Icon: typeof Compass; titulo: string; texto: string; preco: string }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 18 }}>
      <div style={{ padding: "44px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: "linear-gradient(140deg, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%)" }}>
        <span style={{ width: 66, height: 66, borderRadius: 18, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)" }}>
          <Icon size={32} />
        </span>
        <div style={{ maxWidth: 460 }}>
          <h2 style={{ margin: 0, fontSize: 23 }}>{titulo}</h2>
          <p className="sub" style={{ marginTop: 8, lineHeight: 1.6 }}>{texto}</p>
        </div>
        <button className="btn" onClick={() => navegar({ view: "config", aba: "plano" })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14.5, marginTop: 4 }}>
          <ArrowUpCircle size={18} /> Fazer upgrade
        </button>
        <p className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>A partir de {preco} / mês.</p>
      </div>
    </div>
  );
}

function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="card" style={{ padding: "56px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <span style={{ width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", background: "rgba(245,158,11,.14)", color: "#F59E0B" }}>
        <HardHat size={30} />
      </span>
      <div>
        <h2 style={{ margin: 0, fontSize: 22 }}>{titulo}</h2>
        <p className="sub" style={{ marginTop: 6 }}>Em construção. Esta área está sendo preparada e chega em breve.</p>
      </div>
    </div>
  );
}

