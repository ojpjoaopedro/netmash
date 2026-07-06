"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, HeartPulse, ShoppingCart, Megaphone,
  ListChecks, CalendarClock, Users, Upload, Building2, Bell, LogOut, Sun, Moon, Play, Wrench, FileText, X, Receipt,
  Menu, Presentation, Contact, ShieldCheck, Sparkles, BarChart3, Target, Filter,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  getPerfil, getEmpresa, getLancamentos, getFuncionarios, getClientes, logout,
  Perfil, Empresa, Lancamento, Funcionario, Cliente,
} from "@/lib/db";
import { getIndicadores, aplicarReais, Metrica, Categoria } from "@/lib/indicadores";
import { gerarInsights } from "@/lib/insights";
import { gerarDeck, gerarRelatorio, abrirHtml, slug, type Secao } from "@/lib/apresentacao";
import { useBrand } from "@/lib/brand";
import DashboardHub from "@/components/dash/DashboardHub";
import AreaOverview, { AreaConfig } from "@/components/dash/AreaOverview";
import MarketingFull from "@/components/dash/MarketingFull";
import Ferramentas from "@/components/dash/Ferramentas";
import IndicatorEditor from "@/components/dash/IndicatorEditor";
import Relatorios from "@/components/dash/Relatorios";
import GerarApresentacao from "@/components/dash/GerarApresentacao";
import Custos from "@/components/dash/Custos";
import Clientes from "@/components/dash/Clientes";
import Acessos from "@/components/dash/Acessos";
import ApresentarModal from "@/components/dash/ApresentarModal";
import Assistente from "@/components/dash/Assistente";
import AnaliseResultados from "@/components/dash/AnaliseResultados";
import GestaoComercial from "@/components/dash/GestaoComercial";
import MarketingTrafego from "@/components/dash/MarketingTrafego";
import ResumoHome from "@/components/dash/ResumoHome";
import GraficosHome from "@/components/dash/GraficosHome";
import Lancamentos from "@/components/Lancamentos";
import Contas from "@/components/Contas";
import Funcionarios from "@/components/Funcionarios";
import Importar from "@/components/Importar";
import Config from "@/components/Config";

type View =
  | "dashboard" | "graficos" | "financas" | "analise" | "saude" | "comercial" | "gestaovista" | "marketing" | "trafego"
  | "assistente" | "lancamentos" | "contas" | "custos" | "clientes" | "equipe" | "ferramentas" | "relatorios" | "apresentacao" | "importar" | "acessos" | "empresa";

const METRICAS = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "financas", label: "Finanças", Icon: DollarSign },
  { key: "saude", label: "Saúde do Cliente", Icon: HeartPulse },
  { key: "comercial", label: "Comercial", Icon: ShoppingCart },
  { key: "marketing", label: "Marketing", Icon: Megaphone },
] as const;
// Sub-abas (pílulas) dentro de cada área — enxuga o menu principal
const SUBTABS: Record<string, { key: View; label: string }[]> = {
  financas: [{ key: "financas", label: "Visão geral" }, { key: "analise", label: "Análise de Resultados" }],
  analise: [{ key: "financas", label: "Visão geral" }, { key: "analise", label: "Análise de Resultados" }],
  comercial: [{ key: "comercial", label: "Visão geral" }, { key: "gestaovista", label: "Gestão à Vista" }],
  gestaovista: [{ key: "comercial", label: "Visão geral" }, { key: "gestaovista", label: "Gestão à Vista" }],
  marketing: [{ key: "marketing", label: "Visão geral" }, { key: "trafego", label: "Tráfego Pago" }],
  trafego: [{ key: "marketing", label: "Visão geral" }, { key: "trafego", label: "Tráfego Pago" }],
};
// Cor de cada aba por área (estilo Hub)
const NAV_COR: Record<string, string> = {
  dashboard: "#1AADE2", financas: "#10B981", analise: "#10B981", saude: "#EF4444",
  comercial: "#1AADE2", gestaovista: "#1AADE2", marketing: "#8b5cf6", trafego: "#EC4899",
};
const corDe = (k: string) => NAV_COR[k] || "var(--accent)";
const navStyle = (ativo: boolean, k: string): React.CSSProperties | undefined =>
  ativo ? { color: corDe(k), background: corDe(k) + "1f", boxShadow: `inset 0 0 0 1px ${corDe(k)}3d` } : undefined;
// Sub-view -> área pai (pra o menu pai acender quando você está numa sub-aba)
const grupoDe = (v: string) => v === "analise" ? "financas" : v === "gestaovista" ? "comercial" : v === "trafego" ? "marketing" : v;
// Itens de "Sistema" (saída + configuração) — ficam numa seção recolhível pra enxugar o menu
const SISTEMA_KEYS = ["relatorios", "apresentacao", "ferramentas", "importar", "acessos", "empresa"];
const OPERACOES = [
  { key: "assistente", label: "Assistente", Icon: Sparkles },
  { key: "lancamentos", label: "Lançamentos", Icon: ListChecks },
  { key: "clientes", label: "Clientes & Vendas", Icon: Contact },
  { key: "custos", label: "Custos & Despesas", Icon: Receipt },
  { key: "contas", label: "Contas a pagar/receber", Icon: CalendarClock },
  { key: "equipe", label: "Equipe", Icon: Users },
  { key: "ferramentas", label: "Ferramentas", Icon: Wrench },
  { key: "relatorios", label: "Relatórios / PDF", Icon: FileText },
  { key: "apresentacao", label: "Gerar apresentação", Icon: Presentation },
  { key: "acessos", label: "Equipe & Acessos", Icon: ShieldCheck },
  { key: "importar", label: "Importar planilha", Icon: Upload },
  { key: "empresa", label: "Empresa", Icon: Building2 },
] as const;

const AREAS: Record<string, AreaConfig> = {
  financas: {
    categoria: "financeiro", titulo: "Finanças", icon: "DollarSign", cor: "#10B981",
    principal: "faturamento", secundarias: ["mrr", "margem"], unidadePrincipalLabel: "faturamento",
    analises: [
      { icon: "Sparkles", titulo: "Consolidado do ano", sub: "Evolução mês a mês do ano inteiro", cor: "#F59E0B" },
      { icon: "Scale", titulo: "Ponto de equilíbrio", sub: "Quanto precisa faturar para dar lucro", cor: "#8b5cf6" },
      { icon: "PiggyBank", titulo: "Saldo de caixa", sub: "DRE: receitas, custos e resultado", cor: "#10B981" },
    ],
  },
  saude: {
    categoria: "cliente", titulo: "Saúde do Cliente", icon: "HeartPulse", cor: "#8b5cf6",
    principal: "clientes_ativos", secundarias: ["nps", "cross_sell"], unidadePrincipalLabel: "base ativa",
    analises: [
      { icon: "Sparkles", titulo: "Consolidado do ano", sub: "Evolução mês a mês de todos os indicadores", cor: "#F59E0B" },
    ],
  },
  comercial: {
    categoria: "comercial", titulo: "Comercial", icon: "ShoppingCart", cor: "#1AADE2",
    principal: "novos_clientes", secundarias: ["ticket_medio", "conversao"], unidadePrincipalLabel: "vendas",
    analises: [
      { icon: "Sparkles", titulo: "Consolidado do ano", sub: "Evolução mês a mês de todos os indicadores", cor: "#F59E0B" },
    ],
  },
};

export default function Home() {
  const router = useRouter();
  const { brand, save: saveBrand, theme, toggleTheme } = useBrand();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancs, setLancs] = useState<Lancamento[]>([]);
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metrs, setMetrs] = useState<Metrica[]>([]);
  const [view, setView] = useState<View>("dashboard");
  const [editor, setEditor] = useState<Categoria | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [apresOpen, setApresOpen] = useState(false);
  const [sistemaAberto, setSistemaAberto] = useState(false);
  const [bemVindoFechado, setBemVindoFechado] = useState(false);

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
      setPerfil(p);
      await carregarDados();
      setCarregando(false);
    })();
  }, [router, carregarDados]);

  useEffect(() => {
    if (typeof window !== "undefined") setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
  }, []);

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
  const saudacaoNome = (brand.saudacao || perfil?.nome || "").split(" ")[0];
  const logoH = brand.logoTamanho || 40;

  if (carregando) {
    return <div className="app"><div className="main"><div className="spin" /></div></div>;
  }

  const saldoInicial = empresa?.saldo_inicial ?? 0;
  const effMetrs = aplicarReais(metrs, lancs, clientes);
  const brandObj = { nome: nomeMarca, logo: brand.logo };
  const insights = gerarInsights(effMetrs, lancs, saldoInicial);
  const alertas = insights.filter((i) => i.tone === "bad" || i.tone === "warn");

  // Controle de acesso: dono vê tudo; colaborador vê só as áreas liberadas.
  const ehDono = !supabaseReady || (perfil?.papel ?? "dono") !== "colaborador";
  const areasPerm = perfil?.areas ?? [];
  const ehSuper = ["minhasmetricas@gmail.com"].includes((perfil?.email || "").toLowerCase());
  // Marca exibida na barra lateral. Super Admin (plataforma) = Minhas Métricas; clientes = sua própria logo.
  const marcaInterna = ehSuper ? (
    <>
      <img src="/icon.svg" alt="Minhas Métricas" style={{ height: logoH, width: logoH, borderRadius: 9, flexShrink: 0 }} />
      <span className="fallback">Minhas <b>Métricas</b></span>
    </>
  ) : (
    brand.logo
      ? <img src={brand.logo} alt={nomeMarca} style={{ height: logoH, maxHeight: logoH, width: "auto", maxWidth: logoH * 6, objectFit: "contain" }} />
      : <span className="fallback">{nomeMarca}</span>
  );
  const metricasVis = (ehDono ? METRICAS.slice() : METRICAS.filter((m) => m.key === "dashboard" || areasPerm.includes(m.key))).filter((m) => !ehSuper || m.key !== "marketing");
  const opsKeys: string[] = ehDono
    ? OPERACOES.map((o) => o.key)
    : (() => {
        const ops = new Set<string>(["assistente", "relatorios", "apresentacao"]);
        if (areasPerm.includes("financas")) ["lancamentos", "custos", "contas", "ferramentas"].forEach((k) => ops.add(k));
        if (areasPerm.includes("comercial")) ops.add("clientes");
        return [...ops];
      })();
  const opsVis = OPERACOES.filter((o) => opsKeys.includes(o.key)).filter((o) => !ehSuper || (o.key !== "clientes" && o.key !== "equipe"));
  const opsCore = opsVis.filter((o) => !SISTEMA_KEYS.includes(o.key));
  const opsSistema = opsVis.filter((o) => SISTEMA_KEYS.includes(o.key));
  const sistemaTemAtivo = opsSistema.some((o) => o.key === view);

  const VIEW_SECAO: Partial<Record<View, Secao>> = {
    financas: "financeiro", saude: "cliente", comercial: "comercial", marketing: "marketing", equipe: "colaboradores",
  };
  function gerarApres(meses: string[], tipo: "deck" | "relatorio") {
    const sec = view === "dashboard" ? null : VIEW_SECAO[view];
    const secoes = sec ? new Set<Secao>([sec]) : new Set<Secao>(["financeiro", "cliente", "comercial", "marketing", "colaboradores"]);
    const data = { metrs: effMetrs, lancs, funcs, saldoInicial, brand: brandObj };
    const html = tipo === "deck" ? gerarDeck(data, meses, secoes) : gerarRelatorio(data, meses, secoes);
    abrirHtml(html, `apresentacao-${slug(nomeMarca)}.html`);
    setApresOpen(false);
  }
  const apresTitulo = view === "dashboard" || !VIEW_SECAO[view] ? "Visão geral (tudo)" : "Esta área";
  // "Apresentar" só faz sentido nos painéis de métrica (Dashboard + 5 áreas). Nas telas operacionais (Clientes, Custos, Lançamentos…) o botão some.
  const podeApresentar = METRICAS.some((m) => m.key === grupoDe(view));

  const navClick = (k: View) => { setView(k); setMenuAberto(false); };

  return (
    <div className="app">
      {/* Top bar (mobile) */}
      <header className="mobiletop">
        <div className="brand">
          {marcaInterna}
        </div>
        <div className="mt-actions">
          <button className="iconbtn" style={{ position: "relative" }} onClick={() => setNotifOpen((v) => !v)} title="Notificações">
            <Bell size={18} />
            {alertas.length > 0 && <span style={{ position: "absolute", top: 0, right: 0, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 99, background: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center" }}>{alertas.length}</span>}
          </button>
          <button className="iconbtn" onClick={toggleTheme} title="Tema">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="iconbtn" onClick={() => setMenuAberto(true)} title="Menu"><Menu size={22} /></button>
        </div>
        {notifOpen && (
          <div style={{ position: "fixed", top: 54, right: 8, left: 8, maxWidth: 360, marginLeft: "auto", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 12, boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)", zIndex: 60 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 13 }}>Notificações</b>
              <button className="iconbtn" onClick={() => setNotifOpen(false)}><X size={14} /></button>
            </div>
            {insights.length === 0 ? <p className="sub">Tudo tranquilo ✅</p> : insights.map((ins, i) => (
              <div key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : undefined }}>
                <b style={{ fontSize: 12.5, color: ins.tone === "bad" ? "var(--red)" : ins.tone === "warn" ? "var(--amber)" : "var(--txt)" }}>{ins.titulo}</b>
                <div className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>{ins.texto}</div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="drawer-overlay" onClick={() => setMenuAberto(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="brand" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{marcaInterna}</span>
              <button className="iconbtn" onClick={() => setMenuAberto(false)}><X size={18} /></button>
            </div>
            <div className="navgroup"><div className="gl">Métricas</div><nav className="nav">
              {metricasVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
                <button key={key} className={at ? "active" : ""} style={navStyle(at, key)} onClick={() => navClick(key as View)}><Icon size={18} color={corDe(key)} /> {label}</button>
              ); })}
            </nav></div>
            <div className="navgroup"><div className="gl">Operações</div><nav className="nav">
              {opsCore.map(({ key, label, Icon }) => (
                <button key={key} className={view === key ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={18} /> {label}</button>
              ))}
            </nav></div>
            {opsSistema.length > 0 && (
              <div className="navgroup">
                <button className="gl" onClick={() => setSistemaAberto((v) => !v)} style={{ background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>Sistema <span>{(sistemaAberto || sistemaTemAtivo) ? "▾" : "▸"}</span></button>
                {(sistemaAberto || sistemaTemAtivo) && <nav className="nav">
                  {opsSistema.map(({ key, label, Icon }) => (
                    <button key={key} className={view === key ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={18} /> {label}</button>
                  ))}
                </nav>}
              </div>
            )}
            <div className="navgroup"><nav className="nav">
              {podeApresentar && <button onClick={() => { setApresOpen(true); setMenuAberto(false); }}><Play size={18} /> Apresentar</button>}
              <button onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={18} /> Sair</button>
            </nav></div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="side">
        <div className="brand">
          {marcaInterna}
        </div>

        <div className="navgroup">
          <div className="gl">Métricas</div>
          <nav className="nav">
            {metricasVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
              <button key={key} className={at ? "active" : ""} style={navStyle(at, key)} onClick={() => setView(key as View)}>
                <Icon size={18} color={corDe(key)} /> {label}
              </button>
            ); })}
          </nav>
        </div>

        <div className="navgroup">
          <div className="gl">Operações</div>
          <nav className="nav">
            {opsCore.map(({ key, label, Icon }) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as View)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </div>

        {opsSistema.length > 0 && (
          <div className="navgroup">
            <button className="gl" onClick={() => setSistemaAberto((v) => !v)} style={{ background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>Sistema <span>{(sistemaAberto || sistemaTemAtivo) ? "▾" : "▸"}</span></button>
            {(sistemaAberto || sistemaTemAtivo) && (
              <nav className="nav">
                {opsSistema.map(({ key, label, Icon }) => (
                  <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as View)}>
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        )}

        <div className="side-foot">
          <div className="av">{(saudacaoNome || nomeMarca).charAt(0).toUpperCase()}</div>
          <div className="who">
            <b>{perfil?.nome || saudacaoNome || nomeMarca}</b>
            <small>{supabaseReady ? (perfil?.papel || "dono") : "demonstração"}</small>
          </div>
          <div style={{ position: "relative" }}>
            <button className="iconbtn" title="Notificações" onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={17} />
              {alertas.length > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 99, background: "var(--red)", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "grid", placeItems: "center" }}>{alertas.length}</span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", bottom: 44, right: 0, width: 290, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 12, boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)", zIndex: 60 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ fontSize: 13 }}>Notificações</b>
                  <button className="iconbtn" onClick={() => setNotifOpen(false)}><X size={14} /></button>
                </div>
                {insights.length === 0 ? <p className="sub">Tudo tranquilo por aqui ✅</p> : insights.map((ins, i) => (
                  <div key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : undefined }}>
                    <b style={{ fontSize: 12.5, color: ins.tone === "bad" ? "var(--red)" : ins.tone === "warn" ? "var(--amber)" : "var(--txt)" }}>{ins.titulo}</b>
                    <div className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>{ins.texto}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="iconbtn" title={supabaseReady ? "Sair" : "Login"}
            onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={17} /></button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topctrls">
          {ehSuper && <a className="btn ghost sm" href="/admin"><ShieldCheck size={14} /> Super Admin</a>}
          {podeApresentar && <button className="btn sm" onClick={() => setApresOpen(true)}><Play size={14} /> Apresentar</button>}
          <button className="btn ghost sm desk-only" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}</button>
        </div>
        {SUBTABS[view] && (
          <div className="period" style={{ marginBottom: 16, flexWrap: "wrap" }}>
            {SUBTABS[view].map((t) => (
              <button key={t.key} className={view === t.key ? "active" : ""} onClick={() => setView(t.key)}>{t.label}</button>
            ))}
          </div>
        )}
        {view === "dashboard" && lancs.length === 0 && !bemVindoFechado && (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>👋 Bem-vindo ao seu painel!</h3>
              <button className="iconbtn" title="Fechar" onClick={() => { setBemVindoFechado(true); if (typeof window !== "undefined") localStorage.setItem("me_bemvindo_fechado", "1"); }}>✕</button>
            </div>
            <p className="sub" style={{ marginBottom: 14 }}>Comece configurando sua empresa e lançando os primeiros dados — os gráficos e indicadores se montam sozinhos.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn" href="/guia" target="_blank" rel="noopener">📖 Como usar o app</a>
              <button className="btn ghost" onClick={() => setView("empresa")}>🎨 Configurar empresa / logo</button>
              <button className="btn ghost" onClick={() => setView("lancamentos")}>💸 Adicionar lançamento</button>
              <button className="btn ghost" onClick={() => setView("custos")}>📌 Cadastrar custos</button>
              <button className="btn ghost" onClick={() => setEditor("financeiro")}>📊 Editar indicadores</button>
            </div>
          </div>
        )}
        {view === "dashboard" && <ResumoHome lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} nome={saudacaoNome} />}
        {view === "dashboard" && <DashboardHub metrs={effMetrs} lancs={lancs} saldoInicial={saldoInicial} nome={saudacaoNome} />}
        {view === "graficos" && <GraficosHome onOpen={(v) => setView(v as View)} mostrarMarketing={!ehSuper} />}
        {AREAS[view] && <AreaOverview metrs={effMetrs} cfg={AREAS[view]} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} onEditar={setEditor} />}
        {view === "marketing" && <MarketingFull metrs={effMetrs} onEditar={() => setEditor("marketing")} />}
        {view === "analise" && <AnaliseResultados lancs={lancs} saldoInicial={saldoInicial} />}
        {view === "gestaovista" && <GestaoComercial metrs={effMetrs} lancs={lancs} saldoInicial={saldoInicial} onEditar={() => setEditor("comercial")} />}
        {view === "trafego" && <MarketingTrafego metrs={effMetrs} lancs={lancs} saldoInicial={saldoInicial} onEditar={() => setEditor("marketing")} />}
        {view === "ferramentas" && <Ferramentas lancs={lancs} />}
        {view === "relatorios" && <Relatorios metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "apresentacao" && <GerarApresentacao metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "assistente" && <Assistente metrs={effMetrs} lancs={lancs} clientes={clientes} funcs={funcs} saldoInicial={saldoInicial} nome={saudacaoNome} reload={carregarDados} onImportar={() => setView("importar")} />}
        {view === "lancamentos" && <Lancamentos lancs={lancs} reload={carregarDados} />}
        {view === "clientes" && <Clientes clientes={clientes} lancs={lancs} reload={carregarDados} />}
        {view === "custos" && <Custos lancs={lancs} funcs={funcs} reload={carregarDados} />}
        {view === "contas" && <Contas lancs={lancs} reload={carregarDados} />}
        {view === "equipe" && <Funcionarios funcs={funcs} reload={carregarDados} />}
        {view === "acessos" && <Acessos />}
        {view === "importar" && <Importar reload={carregarDados} />}
        {view === "empresa" && <Config empresa={empresa} reload={carregarDados} brand={brand} saveBrand={saveBrand} />}
      </main>

      {editor && (
        <IndicatorEditor categoria={editor} onClose={() => setEditor(null)}
          onSaved={async () => { setMetrs(await getIndicadores()); setEditor(null); }} />
      )}

      {apresOpen && (
        <ApresentarModal titulo={apresTitulo} onClose={() => setApresOpen(false)} onGerar={gerarApres} />
      )}

      {/* Bottom nav (mobile) — estilo Hub: atalhos fixos + Menu */}
      <nav className="bottomnav">
        <button className={grupoDe(view) === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><LayoutDashboard size={20} />Home</button>
        <button className={view === "graficos" ? "active" : ""} onClick={() => setView("graficos")}><BarChart3 size={20} />Gráficos</button>
        <button className={grupoDe(view) === "financas" ? "active" : ""} onClick={() => setView("financas")}><DollarSign size={20} />Finanças</button>
        <button className={view === "equipe" ? "active" : ""} onClick={() => setView("equipe")}><Users size={20} />Equipe</button>
      </nav>
    </div>
  );
}
