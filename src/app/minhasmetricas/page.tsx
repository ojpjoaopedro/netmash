"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, Compass, Settings,
  Users, Upload, Building2, LogOut, Sun, Moon, X,
  Menu, Presentation, Sparkles, Volume2, VolumeX, ChevronDown, Image as ImageIcon, HardHat,
  ChevronsLeft, ChevronsRight, User, Camera, Layers, CalendarDays, FileText,
  Palette, UserCog, Gift, CreditCard, ArrowLeft, ArrowUpCircle, ArrowDownCircle, ChevronRight,
} from "lucide-react";
import { playTick, setSom, somLigado } from "@/lib/ui-sound";
import GuiaConfiguracao from "@/components/GuiaConfiguracao";
import { assinarNav, pegarAlvo } from "@/lib/nav";
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
import EstruturaFinancas from "./financas-estrutura";
import RelatoriosFinancas from "@/components/RelatoriosFinancas";
import FinancasDashboard from "@/components/FinancasDashboard";
import CalendarioPagamentos from "@/components/CalendarioPagamentos";
import Diretores from "@/components/Diretores";
import TermosDeUso from "@/components/TermosDeUso";
import MeusBeneficios from "@/components/MeusBeneficios";
import MeuPlano from "@/components/MeuPlano";

type View =
  | "dashboard" | "financas" | "marketing" | "planejamento" | "config"
  | "assistente" | "equipe" | "apresentacao" | "importar" | "empresa";

const METRICAS = [
  { key: "dashboard", label: "Home", Icon: LayoutDashboard },
  { key: "financas", label: "Finanças", Icon: DollarSign },
  { key: "planejamento", label: "Planejamento", Icon: Compass },
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
const corDe = (k: string) => NAV_COR[k] || "var(--brand)";
const grupoDe = (v: string) => v;
// anos fixos no seletor do topo (o mesmo em todas as páginas)
const ANOS = ["2026", "2027", "2028"];
// SISTEMA fica oculto (recolhível): tudo que não é o essencial do dia a dia
const SISTEMA_KEYS: string[] = [];
const OPERACOES = [
  { key: "apresentacao", label: "Gerar apresentação", Icon: Presentation },
  { key: "assistente", label: "Assistente", Icon: Sparkles },
  { key: "config", label: "Configurações", Icon: Settings },
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
  // o Guia de configuração pede navegação; a página troca a view
  useEffect(() => assinarNav((a) => setView(a.view as View)), []);
  const [editor, setEditor] = useState<Categoria | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
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
        const ops = new Set<string>(["assistente", "relatorios", "apresentacao"]);
        if (areasPerm.includes("financas")) ["contas", "ferramentas"].forEach((k) => ops.add(k));
        return [...ops];
      })();
  const opsVis = OPERACOES.filter((o) => opsKeys.includes(o.key));
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
            <b>{superNome.trim().split(" ")[0] || perfil?.nome || saudacaoNome || nomeMarca}</b>
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

      {/* Main */}
      <main className="main">
        <div className="topctrls">
          {/* o selo "Painel demonstrativo" agora fica no rodapé do menu, sob o nome */}
          {/* seletor de ano — fixo no topo de todas as páginas (estilo sutil) */}
          <div role="group" aria-label="Selecionar ano"
            style={{ display: "inline-flex", gap: 2, padding: 4, borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
            {ANOS.map((a) => {
              const on = anoSel === a;
              return (
                <button key={a} onClick={() => { playTick(); setAnoSel(a); }}
                  style={{ padding: "6px 16px", borderRadius: 999, border: 0, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    background: on ? "var(--card)" : "transparent", color: on ? "var(--txt)" : "var(--muted)",
                    boxShadow: on ? "0 1px 3px rgba(0,0,0,.14)" : "none" }}>{a}</button>
              );
            })}
          </div>
          <button className="btn ghost sm desk-only" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "Tema claro" : "Tema escuro"}</button>
          <button className="btn ghost sm desk-only" onClick={toggleSom} title={som ? "Desligar sons" : "Ligar sons"}>{som ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
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
        {view === "dashboard" && <ResumoHome funcs={funcs} nome={saudacaoNome} />}
        {/* telas ainda em construção — o conteúdo o Diogo define depois */}
        {view === "financas" && <TelaFinancas empresa={empresa} brand={brand} ano={Number(anoSel)} reload={carregarDados} />}
        {view === "marketing" && <EmConstrucao titulo="Marketing" />}
        {view === "planejamento" && <EmConstrucao titulo="Planejamento" />}
        {view === "config" && <TelaConfig empresa={empresa} funcs={funcs} reload={carregarDados} brand={brand} saveBrand={saveBrand} loginEmail={perfil?.email || ""} />}
        {view === "assistente" && <Assistente metrs={effMetrs} lancs={lancs} clientes={clientes} funcs={funcs} saldoInicial={saldoInicial} nome={saudacaoNome} reload={carregarDados} onImportar={() => setView("importar")} />}
        {view === "apresentacao" && <GerarApresentacao metrs={effMetrs} lancs={lancs} funcs={funcs} saldoInicial={saldoInicial} brand={brandObj} />}
        {view === "equipe" && <Funcionarios funcs={funcs} reload={carregarDados} />}
        {view === "importar" && <Importar reload={carregarDados} empresa={empresa} brand={brand} />}
        {view === "empresa" && <Config empresa={empresa} reload={carregarDados} brand={brand} saveBrand={saveBrand} />}
      </main>

      {editor && (
        <IndicatorEditor categoria={editor} onClose={() => setEditor(null)}
          onSaved={async () => { setMetrs(await getIndicadores()); setEditor(null); }} />
      )}

      <LgpdConsent userKey={perfil?.email || perfil?.id || "demo"} onSair={async () => { await logout(); router.replace("/login"); }} />

      {/* Guia de configuração inicial (some quando tudo estiver preenchido) */}
      <GuiaConfiguracao empresa={empresa} brand={brand} funcsCount={funcs.length} />


      {/* Bottom nav (mobile) — estilo Hub: atalhos fixos + Menu */}
      <nav className="bottomnav">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => { playTick(); setView("dashboard"); }}><LayoutDashboard size={20} />Home</button>
        <button className={view === "assistente" ? "active" : ""} onClick={() => { playTick(); setView("assistente"); }}><Sparkles size={20} />Assistente</button>
        <button className={view === "equipe" ? "active" : ""} onClick={() => { playTick(); setView("equipe"); }}><Users size={20} />Equipe</button>
      </nav>
    </div>
  );
}

/** Seletor: Calendário de Pagamentos ou de Recebimentos. */
function EscolhaCalendario({ onEscolher }: { onEscolher: (t: "pagamentos" | "recebimentos") => void }) {
  const opcoes = [
    { key: "pagamentos" as const, titulo: "Calendário de Pagamentos", desc: "Contas a pagar, com vencimentos e despesas recorrentes.", Icon: ArrowUpCircle, cor: "#EF4444" },
    { key: "recebimentos" as const, titulo: "Calendário de Recebimentos", desc: "Recebíveis marcados por data.", Icon: ArrowDownCircle, cor: "#10B981" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
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
      <button onClick={onVoltar} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 13px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}>
        <ArrowLeft size={16} /> {tipo === "pagamentos" ? "Calendário de Pagamentos" : "Calendário de Recebimentos"}
      </button>
      <CalendarioPagamentos anoInicial={ano} tipo={tipo} />
    </div>
  );
}

/**
 * Tela de Finanças no formato do Hub: título com "Gerar DRE", os atalhos e as
 * três abas (Dashboard, Estrutura de Receitas e Custos, Calendário de
 * Pagamentos). Cada aba abre "em construção" por enquanto.
 */
function TelaFinancas({ empresa, brand, ano, reload }: { empresa: Empresa | null; brand: React.ComponentProps<typeof Config>["brand"]; ano: number; reload: () => Promise<void> }) {
  const [aba, setAba] = useState<"dashboard" | "estrutura" | "calendario" | "relatorios" | "importar">("dashboard");
  // dentro do Calendário: escolha entre pagamentos e recebimentos (null = mostra as 2 opções)
  const [calSub, setCalSub] = useState<"pagamentos" | "recebimentos" | null>(null);
  // Guia de configuração pode abrir uma aba/sub específica de Finanças
  useEffect(() => {
    const aplicar = (a: { view: string; aba?: string; sub?: string }) => {
      if (a.view !== "financas") return;
      if (a.aba) setAba(a.aba as typeof aba);
      if (a.sub === "pagamentos" || a.sub === "recebimentos") setCalSub(a.sub);
    };
    const at = pegarAlvo(); if (at) aplicar(at);
    return assinarNav(aplicar);
  }, []);
  const rotulos: Record<typeof aba, string> = {
    dashboard: "Dashboard", estrutura: "Estrutura de Receitas e Custos",
    calendario: "Calendário", relatorios: "Relatórios", importar: "Importar planilha",
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
  const abas: { key: typeof aba; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { key: "estrutura", label: "Estrutura de Receitas e Custos", Icon: Layers },
    { key: "calendario", label: "Calendário", Icon: CalendarDays },
    { key: "relatorios", label: "Relatórios", Icon: FileText },
    { key: "importar", label: "Importar planilha", Icon: Upload },
  ];
  return (
    <div>
      {/* título */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff", flexShrink: 0 }}>
          <DollarSign size={22} />
        </span>
        <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: "-.6px" }}>Finanças</h2>
      </div>

      {/* barra de abas */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {abas.map((a) => (
          <button key={a.key} onClick={() => { setAba(a.key); if (a.key === "calendario") setCalSub(null); }} style={tab(aba === a.key)}>
            <a.Icon size={16} /> {a.label}
          </button>
        ))}
      </div>

      {aba === "estrutura" ? <EstruturaFinancas />
        : aba === "dashboard" ? <FinancasDashboard />
        : aba === "calendario" ? (calSub
            ? <SubCalendario tipo={calSub} ano={ano} onVoltar={() => setCalSub(null)} />
            : <EscolhaCalendario onEscolher={setCalSub} />)
        : aba === "relatorios" ? <RelatoriosFinancas empresa={empresa} brand={brand} ano={ano} />
        : aba === "importar" ? <Importar reload={reload} empresa={empresa} brand={brand} />
        : <EmConstrucao titulo={rotulos[aba]} />}
    </div>
  );
}

/** Configurações no mesmo formato de Finanças: título + abas Dados da empresa / Equipe. */
function TelaConfig({ empresa, funcs, reload, brand, saveBrand, loginEmail }: {
  empresa: Empresa | null; funcs: Funcionario[]; reload: () => Promise<void>;
  brand: React.ComponentProps<typeof Config>["brand"]; saveBrand: React.ComponentProps<typeof Config>["saveBrand"];
  loginEmail?: string;
}) {
  type AbaCfg = "usuarios" | "dados" | "personalizacao" | "equipe" | "termos" | "beneficios" | "plano";
  const [aba, setAba] = useState<AbaCfg>("usuarios");
  // Guia de configuração pode abrir uma aba específica
  useEffect(() => {
    const a = pegarAlvo(); if (a?.view === "config" && a.aba) setAba(a.aba as AbaCfg);
    return assinarNav((b) => { if (b.view === "config" && b.aba) setAba(b.aba as AbaCfg); });
  }, []);
  // ao concluir o guia, destaca a aba Meus Benefícios por 5s
  const [destaqueBenef, setDestaqueBenef] = useState(false);
  useEffect(() => {
    const onConcluido = () => {
      if (typeof window !== "undefined" && localStorage.getItem("me_guia_concluido") === "1") {
        setDestaqueBenef(true); window.setTimeout(() => setDestaqueBenef(false), 5000);
      }
    };
    window.addEventListener("me:guia-concluido", onConcluido);
    return () => window.removeEventListener("me:guia-concluido", onConcluido);
  }, []);
  const abas: { key: AbaCfg; label: string; Icon: typeof Settings }[] = [
    { key: "usuarios", label: "Meus Usuários", Icon: UserCog },
    { key: "dados", label: "Dados da Empresa", Icon: Building2 },
    { key: "personalizacao", label: "Personalização", Icon: Palette },
    { key: "equipe", label: "Equipe", Icon: Users },
    { key: "termos", label: "Termos de uso", Icon: FileText },
    { key: "beneficios", label: "Meus Benefícios", Icon: Gift },
    { key: "plano", label: "Plano", Icon: CreditCard },
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
      {/* título */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff", flexShrink: 0 }}>
          <Settings size={22} />
        </span>
        <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: "-.6px" }}>Configurações</h2>
      </div>

      {/* barra de abas */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {abas.map((a) => (
          <button key={a.key} onClick={() => setAba(a.key)} style={tab(aba === a.key)}
            className={a.key === "beneficios" && destaqueBenef ? "destaque-benef" : undefined}>
            <a.Icon size={16} /> {a.label}
          </button>
        ))}
      </div>

      {aba === "dados" ? <Config secao="dados" empresa={empresa} reload={reload} brand={brand} saveBrand={saveBrand} />
        : aba === "personalizacao" ? <Config secao="identidade" empresa={empresa} reload={reload} brand={brand} saveBrand={saveBrand} />
        : aba === "equipe" ? <Funcionarios funcs={funcs} reload={reload} empresa={empresa} brand={brand} />
        : aba === "usuarios" ? <Diretores loginEmail={loginEmail} irParaPlano={() => setAba("plano")} />
        : aba === "termos" ? <TermosDeUso />
        : aba === "beneficios" ? <MeusBeneficios />
        : aba === "plano" ? <MeuPlano />
        : <EmConstrucao titulo={rotulo} />}
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

