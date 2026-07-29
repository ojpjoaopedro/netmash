"use client";
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, DollarSign, Compass, Settings,
  Users, Upload, Building2, LogOut, Sun, Moon, X,
  Menu, Presentation, Sparkles, Volume2, VolumeX, ChevronDown, Image as ImageIcon, HardHat,
  ChevronsLeft, ChevronsRight, User, Camera, Layers, CalendarDays, FileText,
  Palette, UserCog, Gift, CreditCard, ArrowLeft, ArrowUpCircle, ArrowDownCircle, ChevronRight, Trash2, UserPlus,
  PlayCircle, Play,
} from "lucide-react";
import { playTick, setSom, somLigado } from "@/lib/ui-sound";
import GuiaConfiguracao from "@/components/GuiaConfiguracao";
import { assinarNav, pegarAlvo, navegar } from "@/lib/nav";
import { supabase, supabaseReady } from "@/lib/supabase";
import { salvarEstadoRemoto, apagarEstadoRemoto, sincronizarEstado, limparDadosLocaisDaConta } from "@/lib/estado-remoto";
import {
  getPerfil, getEmpresa, getLancamentos, getFuncionarios, getClientes, logout,
  Perfil, Empresa, Lancamento, Funcionario, Cliente,
} from "@/lib/db";
import { getIndicadores, aplicarReais, Metrica, Categoria } from "@/lib/indicadores";
import { useBrand } from "@/lib/brand";
import ResumoHome from "@/components/dash/ResumoHome";
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
import FinancasDashboard from "@/components/FinancasDashboard";
import CalendarioPagamentos from "@/components/CalendarioPagamentos";
import Diretores from "@/components/Diretores";
import TermosDeUso from "@/components/TermosDeUso";
import MeusBeneficios from "@/components/MeusBeneficios";
import MeuPlano from "@/components/MeuPlano";

type View =
  | "dashboard" | "financas" | "marketing" | "planejamento" | "clientes" | "config"
  | "assistente" | "equipe" | "apresentacao" | "importar" | "empresa";

// URL <-> seção: o endereço muda por seção (nomes genéricos), a empresa nunca aparece.
const VIEW_SEG: Record<string, string> = {
  dashboard: "home", financas: "financas", planejamento: "planejamento", clientes: "clientes",
  assistente: "assistente", config: "config", equipe: "equipe", empresa: "empresa",
  importar: "importar", apresentacao: "apresentacao", marketing: "marketing",
};
const SEG_VIEW: Record<string, View> = {
  home: "dashboard", dashboard: "dashboard", financas: "financas", planejamento: "planejamento",
  clientes: "clientes", assistente: "assistente", config: "config", equipe: "equipe",
  empresa: "empresa", importar: "importar", apresentacao: "apresentacao", marketing: "marketing",
};

const METRICAS = [
  { key: "dashboard", label: "Home", Icon: LayoutDashboard },
  { key: "financas", label: "Finanças", Icon: DollarSign },
  { key: "planejamento", label: "Planejamento", Icon: Compass },
  { key: "clientes", label: "Cadastro de clientes", Icon: UserPlus },
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
  { key: "assistente", label: "Assistente", Icon: Sparkles },
  { key: "config", label: "Configurações", Icon: Settings },
] as const;

export default function Home({ secao }: { secao?: string } = {}) {
  const router = useRouter();
  const { brand, save: saveBrand, theme, toggleTheme } = useBrand();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancs, setLancs] = useState<Lancamento[]>([]);
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metrs, setMetrs] = useState<Metrica[]>([]);
  const [view, setView] = useState<View>((secao && SEG_VIEW[secao]) || "dashboard");
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
      setFotoPerfil(localStorage.getItem("me_foto_perfil") || "");
    }
  }, []);

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
      "fin_brand", "fin_theme", "me_foto_perfil",
      "me_termos_aceite", "me_termos_aceite:privacidade", "me_termos_aceite:servicos", "me_termos_aceite:protecao",
      "me_guia_concluido", "me_guia_min", "me_tour_financas",
      "me_som", "me_ocultar_valores", "me_bemvindo_fechado",
      "me_empresa_extra:default", ...(eb?.id ? [`me_empresa_extra:${eb.id}`] : []),
    ];
    void sincronizarEstado(chaves).then(() => {
      // reaplica no que a página lê só uma vez na montagem
      setBemVindoFechado(localStorage.getItem("me_bemvindo_fechado") === "1");
      setFotoPerfil(localStorage.getItem("me_foto_perfil") || "");
    });
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
  function salvarFotoPerfil(url: string) {
    setFotoPerfil(url);
    try { localStorage.setItem("me_foto_perfil", url); salvarEstadoRemoto("me_foto_perfil", url); } catch { /* imagem grande demais: fica só na sessão */ }
  }
  function removerFotoPerfil() {
    setFotoPerfil("");
    try { localStorage.removeItem("me_foto_perfil"); apagarEstadoRemoto("me_foto_perfil"); } catch { /* ignore */ }
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
      <main className="main">
        <div className="topctrls">
          {/* o seletor de ano agora fica dentro de cada tela (Finanças/Calendário têm o seu) */}
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
        {view === "dashboard" && <ResumoHome funcs={funcs} nome={saudacaoNome} />}
        {view === "dashboard" && <div style={{ marginTop: 16 }}><PainelCobrancas ano={Number(anoSel)} /></div>}
        {view === "dashboard" && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start" }}>
            <CalendarioRecebimento ano={Number(anoSel)} />
            <PromoParaVoce />
          </div>
        )}
        {/* telas ainda em construção — o conteúdo o Diogo define depois */}
        {view === "financas" && <TelaFinancas empresa={empresa} brand={brand} ano={Number(anoSel)} setAno={(a) => setAnoSel(String(a))} reload={carregarDados} />}
        {view === "marketing" && <EmConstrucao titulo="Marketing" />}
        {view === "planejamento" && <TelaUpgrade Icon={Compass} titulo="Planejamento estratégico" texto="Defina metas, pilares e o rumo da sua empresa em um só lugar. Avance no seu plano ativando este módulo." preco="R$ 29,90" />}
        {view === "clientes" && <TelaUpgrade Icon={UserPlus} titulo="Cadastro de clientes" texto="Cadastre e organize seus clientes em um só lugar. Ative este módulo no seu plano para liberar esta tela." preco="R$ 39,90" />}
        {view === "config" && <TelaConfig empresa={empresa} funcs={funcs} reload={carregarDados} brand={brand} saveBrand={saveBrand} loginEmail={perfil?.email || ""} />}
        {view === "assistente" && <Assistente metrs={effMetrs} lancs={lancs} clientes={clientes} funcs={funcs} saldoInicial={saldoInicial} nome={saudacaoNome} reload={carregarDados} brand={brandObj} ano={Number(anoSel)} />}
        {view === "apresentacao" && <GerarApresentacao funcs={funcs} brand={brandObj} ano={Number(anoSel)} />}
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

/** Avisos/informativos por aba de Finanças. */
function AvisoFinancas({ aba }: { aba: string }) {
  const textos: Record<string, React.ReactNode> = {
    dashboard: <>A <b>Dashboard</b> é preenchida automaticamente com os <b>dados</b> da <b>Estrutura de Receitas e Custos</b>.</>,
    relatorios: <>Os <b>Relatórios</b> são preenchidos automaticamente com os <b>dados</b> da <b>Estrutura de Receitas e Custos</b>.</>,
    estrutura: <>Essa é a <b>principal tela de Finanças</b>. Você pode preencher <b>diretamente por aqui</b>, pelo <b>Calendário</b> ou <b>importando uma planilha</b> de Excel. Todas se complementam e centralizam os dados aqui. <b>28% das empresas</b> preenchem somente por aqui, sem usar o calendário nem a planilha.</>,
    calendario: <>Cerca de <b>60% das empresas</b> preferem preencher por aqui.</>,
    importar: <>Cerca de <b>12% dos empresários</b> preferem subir os dados por <b>planilha</b>.</>,
  };
  const txt = textos[aba];
  if (!txt) return null;
  return (
    <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 11, borderRadius: 14, padding: "13px 16px",
      background: "color-mix(in srgb, var(--brand) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 22%, transparent)" }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "var(--brand)", color: "#fff", fontSize: 13, fontWeight: 800 }}>i</span>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--txt)" }}>{txt}</p>
    </div>
  );
}

/** Seletor: Calendário de Pagamentos ou de Recebimentos. */
function EscolhaCalendario({ onEscolher }: { onEscolher: (t: "pagamentos" | "recebimentos") => void }) {
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
      <button onClick={onVoltar} title="Voltar" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", marginBottom: 14, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "transparent", color: "var(--muted)" }}>
        <ArrowLeft size={17} /> Voltar
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
function TelaFinancas({ empresa, brand, ano, setAno, reload }: { empresa: Empresa | null; brand: React.ComponentProps<typeof Config>["brand"]; ano: number; setAno: (a: number) => void; reload: () => Promise<void> }) {
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

  // pop-up do vídeo-tutorial (ainda não gravado)
  const [videoTut, setVideoTut] = useState(false);
  // tour guiado das 5 abas: aparece 1x na 1ª vez que o cliente entra em Finanças
  // e/ou ao concluir o Guia de configuração (o que vier primeiro).
  const [tourOn, setTourOn] = useState(false);
  useEffect(() => {
    const ver = () => {
      try {
        if (localStorage.getItem("me_tour_financas") !== "1") setTourOn(true);
      } catch { /* ignore */ }
    };
    ver();
    window.addEventListener("me:guia-concluido", ver);
    return () => window.removeEventListener("me:guia-concluido", ver);
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
    { key: "relatorios", label: "Relatórios", Icon: FileText },
    { key: "estrutura", label: "Estrutura de Receitas e Custos", Icon: Layers },
    { key: "calendario", label: "Calendário", Icon: CalendarDays },
    { key: "importar", label: "Importar planilha", Icon: Upload },
  ];
  return (
    <div>
      {/* título */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff", flexShrink: 0 }}>
          <DollarSign size={22} />
        </span>
        <h2 style={{ margin: 0, fontSize: "clamp(21px, 6vw, 27px)", fontWeight: 800, letterSpacing: "-.6px" }}>Finanças</h2>
        <button data-tour="video" onClick={() => setVideoTut(true)} title="Assistir ao vídeo-tutorial"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)", padding: "6px 12px", borderRadius: 99 }}>
          <PlayCircle size={18} /> Vídeo
        </button>
      </div>

      {/* barra de abas: tabs rolam na horizontal; "Ver tutorial" fica fixo à direita */}
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
        <button onClick={() => setTourOn(true)} title="Rever o tutorial das abas"
          style={{ flexShrink: 0, alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)", padding: "7px 14px", borderRadius: 99 }}>
          <Sparkles size={14} /> Ver tutorial
        </button>
      </div>

      {/* aviso/informativo por aba (no Calendário, só na tela de escolha) */}
      {!(aba === "calendario" && calSub) && <AvisoFinancas aba={aba} />}

      {aba === "estrutura" ? <EstruturaFinancas ano={ano} setAno={setAno} />
        : aba === "dashboard" ? <FinancasDashboard ano={ano} setAno={setAno} />
        : aba === "calendario" ? (calSub
            ? <SubCalendario tipo={calSub} ano={ano} onVoltar={() => setCalSub(null)} />
            : <EscolhaCalendario onEscolher={setCalSub} />)
        : aba === "relatorios" ? <RelatoriosFinancas empresa={empresa} brand={brand} ano={ano} />
        : aba === "importar" ? <Importar reload={reload} empresa={empresa} brand={brand} />
        : <EmConstrucao titulo={rotulos[aba]} />}

      {tourOn && <TourFinancas setAba={(k) => { setAba(k); if (k === "calendario") setCalSub(null); }}
        onVerVideo={() => setVideoTut(true)}
        onFim={() => { setTourOn(false); try { localStorage.setItem("me_tour_financas", "1"); salvarEstadoRemoto("me_tour_financas", "1"); } catch { /* ignore */ } }} />}

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

/** Tour guiado das abas de Finanças + vídeo (aparece na 1ª entrada e/ou ao concluir o Guia). */
function TourFinancas({ setAba, onFim, onVerVideo }: { setAba: (k: "dashboard" | "estrutura" | "calendario" | "relatorios" | "importar") => void; onFim: () => void; onVerVideo: () => void }) {
  const STEPS: { key?: "dashboard" | "relatorios" | "estrutura" | "calendario" | "importar"; seletor?: string; emoji: string; titulo: string; texto: React.ReactNode; nota?: React.ReactNode }[] = [
    { key: "dashboard", emoji: "📊", titulo: "Dashboard", texto: <>É o <b>resultado de tudo</b> que você preenche na <b>Estrutura de Receitas e Custos</b>.</> },
    { key: "relatorios", emoji: "📄", titulo: "Relatórios", texto: <>Aqui você <b>gera arquivos</b> (como o DRE), faz <b>comparativos</b> e visualiza os <b>gráficos</b> gerados a partir da Estrutura de Receitas e Custos.</> },
    { key: "estrutura", emoji: "🧱", titulo: "Estrutura", texto: <>A <b>mais importante</b>: é aqui que os dados são <b>de fato colocados</b>. Você pode preencher <b>diretamente por aqui</b>, pelo <b>Calendário</b> ou pela <b>Importação de planilha</b>.</> },
    { key: "calendario", emoji: "🗓️", titulo: "Calendário", texto: <>Preencha <b>despesas</b> e <b>faturamento</b> pelas <b>datas</b>. Dá para já deixar <b>provisionado</b> o que está previsto para entrar e sair.</> },
    { key: "importar", emoji: "📥", titulo: "Importar planilha", texto: <>Primeiro preencha a <b>Estrutura</b> com os primeiros números. Depois <b>baixe o Excel</b>, complete os dados nele e <b>suba de volta aqui</b>. Os dados vão <b>automaticamente</b> para a Estrutura.</> },
    { seletor: '[data-tour="video"]', emoji: "🎬", titulo: "Vídeo-tutorial", texto: <>Assista ao <b>vídeo-tutorial</b> de Finanças.</> },
  ];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const cur = STEPS[step];
  useEffect(() => { if (cur.key) setAba(cur.key); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  useEffect(() => {
    const sel = cur.seletor || `[data-aba="${cur.key}"]`;
    const upd = () => { const el = document.querySelector(sel); if (el) { const r = el.getBoundingClientRect(); setRect({ left: r.left, top: r.top, width: r.width, height: r.height }); } };
    upd(); const t = window.setTimeout(upd, 90);
    window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [step, cur.key, cur.seletor]);
  if (!rect) return null;
  const popW = 340;
  const left = Math.max(16, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - popW - 16));
  const top = rect.top + rect.height + 16;
  const ultimo = step === STEPS.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150 }}>
      {/* clareira em volta da aba (escurece o resto) */}
      <div style={{ position: "fixed", left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(15,23,42,.62)", border: "2px solid var(--brand)", pointerEvents: "none", transition: "all .2s" }} />
      {/* balão */}
      <div style={{ position: "fixed", left, top, width: popW, maxWidth: "calc(100vw - 32px)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 14, boxShadow: "0 22px 54px -12px rgba(0,0,0,.55)", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{cur.emoji}</span>
          <b style={{ fontSize: 15.5, flex: 1 }}>{cur.titulo}</b>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 9px", borderRadius: 99 }}>{step + 1} de {STEPS.length}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--txt)" }}>{cur.texto}</p>
        {cur.nota && <p className="sub" style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5 }}>{cur.nota}</p>}
        {/* trilha de progresso */}
        <div style={{ display: "flex", gap: 5, margin: "14px 0" }}>
          {STEPS.map((_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "var(--brand)" : "var(--line)" }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {step > 0 && <button className="btn ghost sm" onClick={() => setStep((s) => s - 1)}>Anterior</button>}
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => { if (ultimo) { onFim(); onVerVideo(); } else setStep((s) => s + 1); }}>{ultimo ? "Assistir ✓" : "Próximo →"}</button>
        </div>
      </div>
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
        <h2 style={{ margin: 0, fontSize: "clamp(21px, 6vw, 27px)", fontWeight: 800, letterSpacing: "-.6px" }}>Configurações</h2>
      </div>

      {/* barra de abas: rola na horizontal no mobile */}
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

