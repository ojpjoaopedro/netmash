"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, HeartPulse, ShoppingCart, Megaphone,
  ListChecks, CalendarClock, Users, Upload, Building2, Bell, LogOut, Sun, Moon, Play, Wrench, FileText, X, Receipt,
  Menu, Presentation, Contact,
} from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  getPerfil, getEmpresa, getLancamentos, getFuncionarios, getClientes, logout,
  Perfil, Empresa, Lancamento, Funcionario, Cliente,
} from "@/lib/db";
import { getIndicadores, aplicarReais, Metrica, Categoria } from "@/lib/indicadores";
import { gerarInsights } from "@/lib/insights";
import { gerarDeck, abrirHtml, slug, type Secao } from "@/lib/apresentacao";
import { ultimosMeses } from "@/lib/format";
import { useBrand } from "@/lib/brand";
import DashboardHub from "@/components/dash/DashboardHub";
import AreaOverview, { AreaConfig } from "@/components/dash/AreaOverview";
import MarketingFull from "@/components/dash/MarketingFull";
import Ferramentas from "@/components/dash/Ferramentas";
import IndicatorEditor from "@/components/dash/IndicatorEditor";
import Relatorios from "@/components/dash/Relatorios";
import Apresentacao from "@/components/dash/Apresentacao";
import GerarApresentacao from "@/components/dash/GerarApresentacao";
import Custos from "@/components/dash/Custos";
import Clientes from "@/components/dash/Clientes";
import Lancamentos from "@/components/Lancamentos";
import Contas from "@/components/Contas";
import Funcionarios from "@/components/Funcionarios";
import Importar from "@/components/Importar";
import Config from "@/components/Config";

type View =
  | "dashboard" | "financas" | "saude" | "comercial" | "marketing"
  | "lancamentos" | "contas" | "custos" | "clientes" | "equipe" | "ferramentas" | "relatorios" | "apresentacao" | "importar" | "empresa";

const METRICAS = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "financas", label: "Finanças", Icon: DollarSign },
  { key: "saude", label: "Saúde do Cliente", Icon: HeartPulse },
  { key: "comercial", label: "Comercial", Icon: ShoppingCart },
  { key: "marketing", label: "Marketing", Icon: Megaphone },
] as const;
const OPERACOES = [
  { key: "lancamentos", label: "Lançamentos", Icon: ListChecks },
  { key: "clientes", label: "Clientes & Vendas", Icon: Contact },
  { key: "custos", label: "Custos & Despesas", Icon: Receipt },
  { key: "contas", label: "Contas a pagar/receber", Icon: CalendarClock },
  { key: "equipe", label: "Equipe", Icon: Users },
  { key: "ferramentas", label: "Ferramentas", Icon: Wrench },
  { key: "relatorios", label: "Relatórios / PDF", Icon: FileText },
  { key: "apresentacao", label: "Gerar apresentação", Icon: Presentation },
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
  const [apresentando, setApresentando] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

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

  const nomeMarca = brand.nome && brand.nome !== "Minha Empresa" ? brand.nome : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");
  const saudacaoNome = (brand.saudacao || perfil?.nome || "").split(" ")[0];

  if (carregando) {
    return <div className="app"><div className="main"><div className="spin" /></div></div>;
  }

  const saldoInicial = empresa?.saldo_inicial ?? 0;
  const effMetrs = aplicarReais(metrs, lancs, clientes);
  const brandObj = { nome: nomeMarca, logo: brand.logo };
  const insights = gerarInsights(effMetrs, lancs, saldoInicial);
  const alertas = insights.filter((i) => i.tone === "bad" || i.tone === "warn");

  const VIEW_SECAO: Partial<Record<View, Secao>> = {
    financas: "financeiro", saude: "cliente", comercial: "comercial", marketing: "marketing", equipe: "colaboradores",
  };
  function apresentarArea(v: View) {
    const sec = VIEW_SECAO[v];
    if (!sec) return;
    abrirHtml(
      gerarDeck({ metrs: effMetrs, lancs, funcs, saldoInicial, brand: brandObj }, ultimosMeses(6), new Set<Secao>([sec])),
      `apresentacao-${slug(nomeMarca)}.html`,
    );
  }

  const navClick = (k: View) => { setView(k); setMenuAberto(false); };

  return (
    <div className="app">
      {/* Top bar (mobile) */}
      <header className="mobiletop">
        <div className="brand">
          {brand.logo ? <img src={brand.logo} alt={nomeMarca} /> : <span className="fallback">{nomeMarca}</span>}
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
              {brand.logo ? <img src={brand.logo} alt={nomeMarca} /> : <span className="fallback">{nomeMarca}</span>}
              <button className="iconbtn" onClick={() => setMenuAberto(false)}><X size={18} /></button>
            </div>
            <div className="navgroup"><div className="gl">Métricas</div><nav className="nav">
              {METRICAS.map(({ key, label, Icon }) => (
                <button key={key} className={view === key ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={18} /> {label}</button>
              ))}
            </nav></div>
            <div className="navgroup"><div className="gl">Operações</div><nav className="nav">
              {OPERACOES.map(({ key, label, Icon }) => (
                <button key={key} className={view === key ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={18} /> {label}</button>
              ))}
            </nav></div>
            <div className="navgroup"><nav className="nav">
              <button onClick={() => { setApresentando(true); setMenuAberto(false); }}><Play size={18} /> Apresentar (slideshow)</button>
              <button onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={18} /> Sair</button>
            </nav></div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="side">
        <div className="brand">
          {brand.logo
            ? <img src={brand.logo} alt={nomeMarca} />
            : <span className="fallback">{nomeMarca}</span>}
        </div>

        <div className="navgroup">
          <div className="gl">Métricas</div>
          <nav className="nav">
            {METRICAS.map(({ key, label, Icon }) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as View)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="navgroup">
          <div className="gl">Operações</div>
          <nav className="nav">
            {OPERACOES.map(({ key, label, Icon }) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as View)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </div>

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
        {(["financas", "saude", "comercial", "marketing", "equipe"] as View[]).includes(view) && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button className="btn ghost sm" onClick={() => apresentarArea(view)}><Play size={14} /> Apresentar esta área</button>
          </div>
        )}
        {view === "dashboard" && lancs.length === 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>👋 Bem-vindo ao seu painel!</h3>
            <p className="sub" style={{ marginBottom: 14 }}>Comece configurando sua empresa e lançando os primeiros dados — os gráficos e indicadores se montam sozinhos.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setView("empresa")}>🎨 Configurar empresa / logo</button>
              <button className="btn ghost" onClick={() => setView("lancamentos")}>💸 Adicionar lançamento</button>
              <button className="btn ghost" onClick={() => setView("custos")}>📌 Cadastrar custos</button>
              <button className="btn ghost" onClick={() => setEditor("financeiro")}>📊 Editar indicadores</button>
            </div>
          </div>
        )}
        {view === "dashboard" && <DashboardHub metrs={effMetrs} lancs={lancs} saldoInicial={saldoInicial} nome={saudacaoNome} />}
        {AREAS[view] && <AreaOverview metrs={effMetrs} cfg={AREAS[view]} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} onEditar={setEditor} />}
        {view === "marketing" && <MarketingFull metrs={effMetrs} />}
        {view === "ferramentas" && <Ferramentas lancs={lancs} />}
        {view === "relatorios" && <Relatorios metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "apresentacao" && <GerarApresentacao metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "lancamentos" && <Lancamentos lancs={lancs} reload={carregarDados} />}
        {view === "clientes" && <Clientes clientes={clientes} lancs={lancs} reload={carregarDados} />}
        {view === "custos" && <Custos lancs={lancs} funcs={funcs} reload={carregarDados} />}
        {view === "contas" && <Contas lancs={lancs} reload={carregarDados} />}
        {view === "equipe" && <Funcionarios funcs={funcs} reload={carregarDados} />}
        {view === "importar" && <Importar reload={carregarDados} />}
        {view === "empresa" && <Config empresa={empresa} reload={carregarDados} brand={brand} saveBrand={saveBrand} />}
      </main>

      {editor && (
        <IndicatorEditor categoria={editor} onClose={() => setEditor(null)}
          onSaved={async () => { setMetrs(await getIndicadores()); setEditor(null); }} />
      )}

      {/* FABs */}
      <div className="fab-row">
        <button className="fab" onClick={() => setApresentando(true)}><Play size={15} /> Apresentar</button>
        <button className="fab" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
      </div>

      {apresentando && (
        <Apresentacao metrs={effMetrs} lancs={lancs} saldoInicial={saldoInicial} brand={brandObj} onClose={() => setApresentando(false)} />
      )}

      {/* Bottom nav (mobile) */}
      <nav className="bottomnav">
        {METRICAS.map(({ key, label, Icon }) => (
          <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as View)}>
            <Icon size={20} />{label.split(" ")[0]}
          </button>
        ))}
      </nav>
    </div>
  );
}
