"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, Megaphone, Compass, Settings,
  Users, Upload, Building2, LogOut, Sun, Moon, X,
  Menu, Presentation, ShieldCheck, Sparkles, Volume2, VolumeX, ChevronDown, Image as ImageIcon, HardHat,
  ChevronsLeft, ChevronsRight, User, Camera, FileText, BarChart3,
} from "lucide-react";
import { playTick, setSom, somLigado } from "@/lib/ui-sound";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  getPerfil, getEmpresa, getLancamentos, getFuncionarios, getClientes, logout,
  Perfil, Empresa, Lancamento, Funcionario, Cliente,
} from "@/lib/db";
import { getIndicadores, aplicarReais, Metrica, Categoria } from "@/lib/indicadores";
import { useBrand } from "@/lib/brand";
import ResumoHome from "@/components/dash/ResumoHome";
import IndicatorEditor from "@/components/dash/IndicatorEditor";
import GerarApresentacao from "@/components/dash/GerarApresentacao";
import Assistente from "@/components/dash/Assistente";
import Funcionarios from "@/components/Funcionarios";
import Importar from "@/components/Importar";
import Config from "@/components/Config";
import LgpdConsent from "@/components/LgpdConsent";

type View =
  | "dashboard" | "financas" | "marketing" | "planejamento" | "config"
  | "assistente" | "equipe" | "apresentacao" | "importar" | "empresa";

const METRICAS = [
  { key: "dashboard", label: "Home", Icon: LayoutDashboard },
  { key: "financas", label: "Finanças", Icon: DollarSign },
  { key: "marketing", label: "Marketing", Icon: Megaphone },
] as const;
// sem métricas recolhidas por enquanto
const METRICAS_MAIS: { key: string; label: string; Icon: typeof LayoutDashboard }[] = [];
// Sub-abas (pílulas) — Empresa e Equipe
const PILL_EQ: { key: View; label: string }[] = [{ key: "empresa", label: "Dados da empresa" }, { key: "equipe", label: "Equipe" }];
const SUBTABS: Record<string, { key: View; label: string }[]> = {
  empresa: PILL_EQ, equipe: PILL_EQ,
};
// Azul é a cor padrão do app: todos os ícones do menu usam ela.
// (depois cada empresa poderá trocar essa cor.)
const NAV_COR: Record<string, string> = {};
const AZUL = "#1AADE2";
const corDe = (k: string) => NAV_COR[k] || AZUL;
const grupoDe = (v: string) => v;
// anos fixos no seletor do topo (o mesmo em todas as páginas)
const ANOS = ["2026", "2027", "2028"];
// SISTEMA fica oculto (recolhível): tudo que não é o essencial do dia a dia
const SISTEMA_KEYS = ["apresentacao", "importar", "empresa"];
const OPERACOES = [
  { key: "assistente", label: "Assistente", Icon: Sparkles },
  { key: "planejamento", label: "Planejamento", Icon: Compass },
  { key: "equipe", label: "Equipe", Icon: Users },
  { key: "config", label: "Configurações", Icon: Settings },
  { key: "apresentacao", label: "Gerar apresentação", Icon: Presentation },
  { key: "importar", label: "Importar planilha", Icon: Upload },
  { key: "empresa", label: "Empresa & marca", Icon: Building2 },
] as const;

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
  const [menuAberto, setMenuAberto] = useState(false);
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
      setPerfil(p);
      await carregarDados();
      setCarregando(false);
    })();
  }, [router, carregarDados]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
      setFotoPerfil(localStorage.getItem("me_foto_perfil") || "");
    }
  }, []);

  /** Troca a foto do avatar: lê o arquivo escolhido e guarda no navegador. */
  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    if (!arq) return;
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      setFotoPerfil(url);
      try { localStorage.setItem("me_foto_perfil", url); } catch { /* imagem grande demais: fica só na sessão */ }
    };
    r.readAsDataURL(arq);
    e.target.value = "";
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
  const saudacaoNome = (brand.saudacao || perfil?.nome || "").split(" ")[0];
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
      title="Sua logomarca aqui — clique para voltar ao início"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        background: "transparent", border: 0, borderRadius: 12,
        padding: "4px 6px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(150deg, #1AADE2, #0c6e9e)", color: "#fff" }}>
        <ImageIcon size={17} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
        <b style={{ fontSize: 13, color: "#f4f5f7", fontWeight: 800, letterSpacing: "-.01em" }}>Sua logomarca</b>
        <small style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>aqui</small>
      </span>
    </button>
  ) : (
    brand.logo
      ? <img src={brand.logo} alt={nomeMarca} style={{ height: logoH, maxHeight: logoH, width: "auto", maxWidth: logoH * 6, objectFit: "contain" }} />
      : <span className="fallback">{nomeMarca}</span>
  );
  const metricasVis = (ehDono ? METRICAS.slice() : METRICAS.filter((m) => m.key === "dashboard" || areasPerm.includes(m.key)));
  const metricasMaisVis = (ehDono ? METRICAS_MAIS.slice() : METRICAS_MAIS.filter((m) => areasPerm.includes(m.key))).filter((m) => !ehSuper || m.key !== "marketing");
  const maisTemAtivo = metricasMaisVis.some((m) => grupoDe(view) === m.key);
  const opsKeys: string[] = ehDono
    ? OPERACOES.map((o) => o.key)
    : (() => {
        const ops = new Set<string>(["assistente", "relatorios", "apresentacao"]);
        if (areasPerm.includes("financas")) ["contas", "ferramentas"].forEach((k) => ops.add(k));
        return [...ops];
      })();
  const opsVis = OPERACOES.filter((o) => opsKeys.includes(o.key)).filter((o) => !ehSuper || o.key !== "equipe");
  const opsCore = opsVis.filter((o) => !SISTEMA_KEYS.includes(o.key));
  const opsSistema = opsVis.filter((o) => SISTEMA_KEYS.includes(o.key));
  const sistemaTemAtivo = opsSistema.some((o) => o.key === view);

  const navClick = (k: View) => { playTick(); setView(k); setMenuAberto(false); };

  return (
    <div className="app">
      {/* Top bar (mobile) */}
      <header className="mobiletop">
        <div className="brand">
          {marcaInterna}
        </div>
        <div className="mt-actions">
          {/* notificações desativadas por enquanto */}
          <button className="iconbtn" onClick={toggleTheme} title="Tema">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="iconbtn" onClick={toggleSom} title={som ? "Desligar sons" : "Ligar sons"}>{som ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="iconbtn" onClick={() => setMenuAberto(true)} title="Menu"><Menu size={22} /></button>
        </div>
      </header>

      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="drawer-overlay" onClick={() => setMenuAberto(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="brand" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>{marcaInterna}</span>
              <button className="iconbtn" onClick={() => setMenuAberto(false)}><X size={18} /></button>
            </div>
            <div className="navgroup"><div className="gl">Métricas</div><nav className="nav">
              {metricasVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
                <button key={key} className={at ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={16} color={corDe(key)} /> {label}</button>
              ); })}
              {metricasMaisVis.length > 0 && (maisAberto || maisTemAtivo) && metricasMaisVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
                <button key={key} className={at ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={16} color={corDe(key)} /> {label}</button>
              ); })}
              {metricasMaisVis.length > 0 && !maisTemAtivo && (
                <button onClick={() => setMaisAberto((v) => !v)} style={{ color: "var(--muted)", justifyContent: "flex-start" }}><ChevronDown size={16} style={{ transform: maisAberto ? "none" : "rotate(-90deg)", transition: ".15s" }} /> {maisAberto ? "Menos" : "Mais métricas"}</button>
              )}
            </nav></div>
            <div className="navgroup"><div className="gl">Operações</div><nav className="nav">
              {opsCore.map(({ key, label, Icon }) => { const at = view === key; return (
                <button key={key} className={at ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={16} color={corDe(key)} /> {label}</button>
              ); })}
            </nav></div>
            {opsSistema.length > 0 && (
              <div className="navgroup">
                <button className="gl" onClick={() => setSistemaAberto((v) => !v)} style={{ background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>Sistema <span>{(sistemaAberto || sistemaTemAtivo) ? "▾" : "▸"}</span></button>
                {(sistemaAberto || sistemaTemAtivo) && <nav className="nav">
                  {opsSistema.map(({ key, label, Icon }) => { const at = view === key; return (
                    <button key={key} className={at ? "active" : ""} onClick={() => navClick(key as View)}><Icon size={16} color={corDe(key)} /> {label}</button>
                  ); })}
                </nav>}
              </div>
            )}
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
            {metricasVis.map(({ key, label, Icon }) => { const at = grupoDe(view) === key; return (
              <button key={key} className={at ? "active" : ""} onClick={() => { playTick(); setView(key as View); }}>
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
            <input type="file" accept="image/*" onChange={escolherFoto} style={{ display: "none" }} />
          </label>
          <div className="who">
            <b>{perfil?.nome || saudacaoNome || nomeMarca}</b>
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

      {/* Main */}
      <main className="main">
        <div className="topctrls">
          {marcaPainel && (
            <span
              title="Este é o painel modelo, usado para demonstração."
              style={{
                marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 12, fontWeight: 700, color: "#1AADE2",
                background: "rgba(26,173,226,.10)", border: "1px solid rgba(26,173,226,.35)",
                padding: "6px 13px", borderRadius: 999,
              }}
            >
              <ShieldCheck size={13} /> Painel demonstrativo
            </span>
          )}
          {/* seletor de ano — fixo no topo de todas as páginas */}
          <div className="period" role="group" aria-label="Selecionar ano">
            {ANOS.map((a) => (
              <button key={a} className={anoSel === a ? "active" : ""} onClick={() => { playTick(); setAnoSel(a); }}>{a}</button>
            ))}
          </div>
          <button className="btn ghost sm desk-only" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}</button>
          <button className="btn ghost sm desk-only" onClick={toggleSom} title={som ? "Desligar sons" : "Ligar sons"}>{som ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
        </div>
        {SUBTABS[view] && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {SUBTABS[view].map((t) => {
              const at = view === t.key;
              return <button key={t.key} onClick={() => { playTick(); setView(t.key); }}
                style={{ flexShrink: 0, background: at ? "linear-gradient(135deg,#22b8f0,#0c6e9e)" : "var(--card)", color: at ? "#fff" : "var(--txt)", border: at ? "1px solid #37c6f0" : "1px solid var(--line-2)", boxShadow: at ? "0 6px 16px -8px rgba(26,173,226,.7)" : "none", borderRadius: 99, padding: "6px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>;
            })}
          </div>
        )}
        {view === "dashboard" && lancs.length === 0 && !bemVindoFechado && (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(26,173,226,.35)", background: "linear-gradient(135deg, rgba(26,173,226,.10), transparent)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>👋 Bem-vindo ao seu painel!</h3>
              <button className="iconbtn" title="Fechar" onClick={() => { setBemVindoFechado(true); if (typeof window !== "undefined") localStorage.setItem("me_bemvindo_fechado", "1"); }}>✕</button>
            </div>
            <p className="sub" style={{ marginBottom: 14 }}>Comece configurando sua empresa. O restante do painel se monta a partir daí.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn" href="/guia" target="_blank" rel="noopener">📖 Como usar o app</a>
              <button className="btn ghost" onClick={() => setView("empresa")}>🎨 Configurar empresa / logo</button>
              <button className="btn ghost" onClick={() => setView("importar")}>📥 Importar planilha</button>
            </div>
          </div>
        )}
        {view === "dashboard" && <ResumoHome lancs={lancs} clientes={clientes} saldoInicial={saldoInicial} nome={saudacaoNome} ano={anoSel} />}
        {/* telas ainda em construção — o conteúdo o Diogo define depois */}
        {view === "financas" && <TelaFinancas />}
        {view === "marketing" && <EmConstrucao titulo="Marketing" />}
        {view === "planejamento" && <EmConstrucao titulo="Planejamento" />}
        {view === "config" && <EmConstrucao titulo="Configurações" />}
        {view === "assistente" && <Assistente metrs={effMetrs} lancs={lancs} clientes={clientes} funcs={funcs} saldoInicial={saldoInicial} nome={saudacaoNome} reload={carregarDados} onImportar={() => setView("importar")} />}
        {view === "apresentacao" && <GerarApresentacao metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "equipe" && <Funcionarios funcs={funcs} reload={carregarDados} />}
        {view === "importar" && <Importar reload={carregarDados} />}
        {view === "empresa" && <Config empresa={empresa} reload={carregarDados} brand={brand} saveBrand={saveBrand} />}
      </main>

      {editor && (
        <IndicatorEditor categoria={editor} onClose={() => setEditor(null)}
          onSaved={async () => { setMetrs(await getIndicadores()); setEditor(null); }} />
      )}

      <LgpdConsent userKey={perfil?.email || perfil?.id || "demo"} onSair={async () => { await logout(); router.replace("/login"); }} />


      {/* Bottom nav (mobile) — estilo Hub: atalhos fixos + Menu */}
      <nav className="bottomnav">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => { playTick(); setView("dashboard"); }}><LayoutDashboard size={20} />Home</button>
        <button className={view === "assistente" ? "active" : ""} onClick={() => { playTick(); setView("assistente"); }}><Sparkles size={20} />Assistente</button>
        <button className={view === "equipe" ? "active" : ""} onClick={() => { playTick(); setView("equipe"); }}><Users size={20} />Equipe</button>
      </nav>
    </div>
  );
}

/**
 * Tela de Finanças no formato do Hub: título com "Gerar DRE", os atalhos e as
 * três abas (Dashboard, Estrutura de Receitas e Custos, Calendário de
 * Pagamentos). Cada aba abre "em construção" por enquanto.
 */
function TelaFinancas() {
  const [aba, setAba] = useState<"dashboard" | "estrutura" | "calendario" | "graficos" | "analise">("dashboard");
  const rotulos: Record<typeof aba, string> = {
    dashboard: "Dashboard", estrutura: "Estrutura de Receitas e Custos",
    calendario: "Calendário de Pagamentos", graficos: "Gráficos", analise: "Análise Receita x Custo",
  };
  const pill = (ativo: boolean, cor: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
    padding: "8px 15px", borderRadius: 12, fontSize: 12.5, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    border: `1px solid ${ativo ? cor : cor + "55"}`,
    background: ativo ? cor : cor + "14",
    color: ativo ? "#fff" : cor,
  });
  const abas: { key: typeof aba; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "estrutura", label: "Estrutura de Receitas e Custos" },
    { key: "calendario", label: "Calendário de Pagamentos" },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,#1AADE2,#0c6e9e)", color: "#fff", flexShrink: 0 }}>
              <DollarSign size={22} />
            </span>
            <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-.02em" }}>Finanças</h2>
            <button style={pill(false, "#1AADE2")}><FileText size={14} /> Gerar DRE</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => setAba("graficos")} style={pill(aba === "graficos", "#1AADE2")}><BarChart3 size={14} /> Gráficos</button>
            <button onClick={() => setAba("analise")} style={pill(aba === "analise", "#8b5cf6")}><BarChart3 size={14} /> Análise Receita x Custo</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {abas.map((a) => (
            <button key={a.key} onClick={() => setAba(a.key)} style={pill(aba === a.key, "#1AADE2")}>{a.label}</button>
          ))}
        </div>
      </div>
      <EmConstrucao titulo={rotulos[aba]} />
    </div>
  );
}

/** Tela ainda sem conteúdo definido — placeholder padrão de "em construção". */
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

