"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  User, Phone, Mail, CreditCard, KeyRound, Cake, Trash2, Plus, Power, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Crown, Shield, Lock, SlidersHorizontal, Eye, EyeOff, Check, X,
  LayoutDashboard, DollarSign, BarChart3, Sparkles, Settings, ArrowLeft, Wallet,
} from "lucide-react";
import { Funcionario, Empresa, addFuncionario, updateFuncionario, delFuncionario } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { mascararTelefone, mascararCPF, cpfValido, emailValido, isoParaBR, mascararDataBR, validarDataBR } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";
import { supabase, supabaseReady } from "@/lib/supabase";
import BotaoRelatorioEquipe from "./RelatorioEquipe";
import { motivoLimiteAcessos, podeAdicionarAcesso } from "@/lib/planos";

const VERMELHO = "#EF4444", VERDE = "#10B981", AMARELO = "#F59E0B", AZUL = "#1AADE2", AMBAR = "#F59E0B";
const hojeISO = () => new Date().toISOString().slice(0, 10);
const brData = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

/** Itens do menu que um Admin pode liberar (mesmo agrupamento do Hub). */
const GRUPOS = [
  { titulo: "Métricas", itens: [
    { k: "dashboard", label: "Home", Icon: LayoutDashboard },
    { k: "financas", label: "Finanças", Icon: DollarSign },
    { k: "painel", label: "Dashboard", Icon: BarChart3 },
    { k: "folha", label: "Folha de pagamento", Icon: Wallet },
  ] },
  { titulo: "Operações", itens: [
    { k: "assistente", label: "Assistente", Icon: Sparkles },
    { k: "config", label: "Configurações", Icon: Settings },
  ] },
];
const TODAS = GRUPOS.flatMap((g) => g.itens.map((i) => i.k));
type Perm = "total" | string[];
const chaves = (p: Perm): string[] => (p === "total" ? TODAS.slice() : p);
function resumoPerm(p: Perm): string {
  const n = chaves(p).length;
  if (n === 0) return "Sem áreas";
  if (n >= TODAS.length) return "Acesso total";
  return `${n} ${n === 1 ? "área" : "áreas"}`;
}

/** Campo editável direto na tela: parece texto, salva ao sair do foco. */
function Campo({ valor, onSalvar, placeholder, tipo, style, disabled, titulo, onFocar, onDesfocar, formatar }: {
  valor: string | null | undefined; onSalvar: (v: string, el: HTMLElement) => void;
  placeholder?: string; tipo?: string; style?: React.CSSProperties; disabled?: boolean; titulo?: string;
  onFocar?: () => void; onDesfocar?: () => void; formatar?: (v: string) => string;
}) {
  const ehData = tipo === "date";
  const base = ehData ? isoParaBR(valor ?? "") : (valor ?? "");
  const [erroData, setErroData] = useState("");
  if (disabled) {
    return <input value={base} readOnly disabled title={titulo || "Somente leitura"} placeholder={placeholder}
      style={{ border: 0, outline: "none", background: "transparent", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", opacity: .6, cursor: "default", ...style }} />;
  }
  const input = (
    <input
      defaultValue={base}
      placeholder={ehData ? "dd/mm/aaaa" : placeholder}
      type={ehData ? "text" : (tipo || "text")}
      inputMode={ehData ? "numeric" : undefined}
      maxLength={ehData ? 10 : undefined}
      onInput={(e) => {
        if (ehData) { e.currentTarget.value = mascararDataBR(e.currentTarget.value); if (erroData) setErroData(""); }
        else if (formatar) e.currentTarget.value = formatar(e.currentTarget.value);
      }}
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; onFocar?.(); }}
      onBlur={(e) => {
        e.currentTarget.style.background = "transparent"; onDesfocar?.();
        if (ehData) {
          const { iso, erro } = validarDataBR(e.target.value);
          setErroData(erro);
          if (erro) return;                                  // inválida/futura: mostra recado, não salva
          if (iso !== (valor ?? "")) onSalvar(iso, e.currentTarget);
          return;
        }
        let v = e.target.value;
        if (formatar) { v = formatar(v); e.target.value = v; }
        if (v !== base) onSalvar(v, e.currentTarget);
      }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", transition: "background .12s", ...style }}
    />
  );
  if (!ehData) return input;
  return (
    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      {input}
      {erroData && <span style={{ color: "var(--red)", fontSize: 10.5, lineHeight: 1.3, marginTop: 2 }}>{erroData}</span>}
    </span>
  );
}

/** Campo do nome no card: quebra em até 2 linhas sem crescer o card. */
function CampoNome({ valor, onSalvar, placeholder, style, disabled, onFocar, onDesfocar }: {
  valor: string | null | undefined; onSalvar: (v: string, el: HTMLElement) => void;
  placeholder?: string; style?: React.CSSProperties; disabled?: boolean; onFocar?: () => void; onDesfocar?: () => void;
}) {
  const base = valor ?? "";
  const ajustar = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 40)}px`; };
  if (disabled) return <div style={{ padding: "2px 5px", width: "100%", opacity: .75, ...style }}>{base || placeholder}</div>;
  return (
    <textarea
      defaultValue={base}
      placeholder={placeholder}
      rows={1}
      ref={(el) => { if (el) ajustar(el); }}
      onInput={(e) => ajustar(e.currentTarget)}
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; onFocar?.(); }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; onDesfocar?.(); if (e.target.value !== base) onSalvar(e.target.value.replace(/\n/g, " ").trim(), e.currentTarget); }}
      style={{ border: 0, outline: "none", background: "transparent", resize: "none", overflow: "hidden", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", lineHeight: 1.2, transition: "background .12s", ...style }}
    />
  );
}

/** Linha com ícone + prefixo fixo + campo editável (telefone, CPF, Pix, datas…). */
function LinhaEdit({ icone, prefixo, prefixoClaro, valor, placeholder, tipo, disabled, onSalvar, onFocar, onDesfocar, formatar }: {
  icone: React.ReactNode; prefixo?: string; prefixoClaro?: boolean; valor: string | null | undefined;
  placeholder?: string; tipo?: string; disabled?: boolean; onSalvar: (v: string, el: HTMLElement) => void;
  onFocar?: () => void; onDesfocar?: () => void; formatar?: (v: string) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", minWidth: 0 }}>
      <span style={{ flexShrink: 0, display: "grid", placeItems: "center", color: "var(--brand)" }}>{icone}</span>
      {prefixo && <span style={{ flexShrink: 0, color: prefixoClaro ? "var(--muted-2)" : undefined }}>{prefixo}</span>}
      <Campo valor={valor} placeholder={placeholder} tipo={tipo} disabled={disabled} formatar={formatar} onSalvar={onSalvar} onFocar={onFocar} onDesfocar={onDesfocar} style={{ fontSize: 12.5 }} />
    </div>
  );
}

/** Seletor de tipo da pessoa: Funcionário ou Sócio (guardado no campo cargo/área). */
function TipoSelect({ valor, disabled, onSalvar }: { valor: string; disabled?: boolean; onSalvar: (v: string, el: HTMLElement) => void }) {
  const atual = valor === "Sócio" ? "Sócio" : "Funcionário";
  return (
    <select value={atual} disabled={disabled} onChange={(e) => onSalvar(e.target.value, e.currentTarget)}
      style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", background: "transparent", border: 0, cursor: disabled ? "default" : "pointer", textAlign: "center", padding: "2px 4px", outline: "none", appearance: "auto" }}>
      <option value="Funcionário">Funcionário</option>
      <option value="Sócio">Sócio</option>
    </select>
  );
}

type DiretorRel = { nome: string; cargo?: string; area?: string; email?: string; telefone?: string; cpf?: string; pix?: string; nascimento?: string };

// ---- Usuários com login (superadmin + admins), guardados em me_diretores (sincroniza no banco) ----
type DPessoa = { id: string; nome: string; area: string; acesso: string; email: string; telefone: string; cpf: string; pix: string; nascimento: string; permissoes: Perm };
type DStore = { sup: DPessoa; admins: DPessoa[] };
const SUPER_PADRAO: DPessoa = { id: "super", nome: "", area: "Geral", acesso: "", email: "", telefone: "", cpf: "", pix: "", nascimento: "", permissoes: "total" };
const KEY_DIR = "me_diretores";
function lerDir(): DStore {
  if (typeof window === "undefined") return { sup: { ...SUPER_PADRAO }, admins: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY_DIR) || "null"); if (s && s.sup) { if (s.sup.nome === "Super Admin") s.sup.nome = ""; return s; } } catch { /* ignore */ }
  return { sup: { ...SUPER_PADRAO }, admins: [] };
}
function salvarDir(s: DStore) { if (typeof window !== "undefined") { const cru = JSON.stringify(s); localStorage.setItem(KEY_DIR, cru); salvarEstadoRemoto(KEY_DIR, cru); window.dispatchEvent(new Event("me:diretores")); } }

// nível de acesso de cada linha da tabela
type Nivel = "superadmin" | "admin" | "sem";
type Linha = {
  chave: string; origem: "func" | "login"; ehSuper: boolean; nivel: Nivel; perfilId?: string;
  func?: Funcionario; nome: string; cargo: string; email: string; telefone: string; cpf: string; pix: string; nascimento: string;
  ativo: boolean; areas: Perm;
};

export default function Funcionarios({ funcs, reload, empresa = null, brand, loginEmail = "", ehDono = true, irParaPlano }: {
  funcs: Funcionario[]; reload: () => void; empresa?: Empresa | null; brand?: Brand;
  loginEmail?: string; ehDono?: boolean; irParaPlano?: () => void;
}) {
  const [filtro, setFiltro] = useState<"ativos" | "desativados">("ativos");
  const [soAcesso, setSoAcesso] = useState(false);   // mostrar só quem tem acesso ao app (login)
  const [modo, setModo] = useState<"card" | "lista">("lista");
  const emailLog = (loginEmail || "").trim().toLowerCase();
  // no celular o botão de apagar fica sempre visível (sem hover)
  const [estreito, setEstreito] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const upd = () => setEstreito(mq.matches);
    upd(); mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  // usuários com login (superadmin + admins) — em me_diretores, enriquecido pelo banco
  const [dir, setDir] = useState<DStore>({ sup: { ...SUPER_PADRAO }, admins: [] });
  const [dirCarregado, setDirCarregado] = useState(false);
  useEffect(() => { setDir(lerDir()); setDirCarregado(true); }, []);
  useEffect(() => { if (dirCarregado) salvarDir(dir); }, [dir, dirCarregado]);

  // Puxa os usuários REAIS da empresa (dono + admins). É a fonte da verdade dos níveis.
  const recarregarColab = useCallback(async () => {
    if (!supabaseReady || !supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/colaboradores", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;   // só o dono consegue ler; admin mantém o que já tem
    const { colaboradores } = (await res.json()) as { colaboradores: { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null }[] };
    if (!Array.isArray(colaboradores)) return;
    setDir((prev) => {
      const sup = { ...prev.sup };
      const dono = colaboradores.find((c) => c.papel === "dono");
      if (dono) { if (!sup.nome && dono.nome) sup.nome = dono.nome; if (dono.email) { sup.email = dono.email; sup.acesso = dono.email; } }
      const admins: DPessoa[] = colaboradores.filter((c) => c.papel !== "dono").map((c) => {
        const emailL = (c.email || "").toLowerCase();
        const old = prev.admins.find((a) => a.id === c.id || (emailL && (a.email || "").toLowerCase() === emailL));
        return {
          id: c.id, nome: old?.nome || c.nome || "", area: old?.area || "",
          acesso: c.email || old?.acesso || "", email: c.email || old?.email || "",
          telefone: old?.telefone || "", cpf: old?.cpf || "", pix: old?.pix || "", nascimento: old?.nascimento || "",
          permissoes: Array.isArray(c.areas) ? c.areas : [],
        };
      });
      return { sup, admins };
    });
  }, []);
  useEffect(() => { if (dirCarregado) void recarregarColab(); }, [dirCarregado, recarregarColab]);

  // busca + ordenação (só Nome, Nascimento e Tipo) no modo Lista
  const [busca, setBusca] = useState("");
  const [sortCol, setSortCol] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ordenarPor = (col: string) => { if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const ORDENAVEIS = new Set(["nome", "nascimento", "cargo"]);
  // qual linha está em edição (algum campo com foco) — libera a lixeira só nela
  const [focoId, setFocoId] = useState<string | null>(null);
  const focoT = useRef<number | undefined>(undefined);
  const aoFocar = (id: string) => { window.clearTimeout(focoT.current); setFocoId(id); };
  const aoDesfocar = () => { focoT.current = window.setTimeout(() => setFocoId(null), 200); };

  // cria um card em branco na hora, pronto para preencher direto na tela
  const [criando, setCriando] = useState(false);
  async function novoInline() {
    if (criando) return;
    setCriando(true);
    setFiltro("ativos");
    try {
      await addFuncionario({
        nome: "", cargo: null, departamento: null, salario: 0, beneficios: 0,
        ativo: true, contato: null, foto: null, email: null, cpf: null, pix: null, nascimento: null,
      });
      await reload();
    } finally { setCriando(false); }
  }

  const [aDesativar, setADesativar] = useState<{ f: Funcionario; data: string } | null>(null);
  const [aAtivar, setAAtivar] = useState<Funcionario | null>(null);
  const [aExcluir, setAExcluir] = useState<{ nome: string; onOk: () => void } | null>(null);
  const [aviso, setAviso] = useState<{ titulo: string; texto: string; plano?: boolean } | null>(null);

  // Salva CPF/e-mail. Se estiver inválido: avisa, NÃO salva e limpa o campo.
  const salvarCpf = (id: string, v: string, el: HTMLElement) => {
    if (v.trim() && !cpfValido(v)) {
      setAviso({ titulo: "CPF inválido", texto: `O CPF "${v.trim()}" não é válido. Confira os números e digite novamente.` });
      (el as HTMLInputElement).value = ""; salvarCampoFunc(id, { cpf: null }, el); return;
    }
    salvarCampoFunc(id, { cpf: v.trim() || null }, el);
  };
  const salvarEmail = (id: string, v: string, el: HTMLElement) => {
    if (v.trim() && !emailValido(v)) {
      setAviso({ titulo: "E-mail inválido", texto: `O e-mail "${v.trim()}" não parece correto. Use o formato nome@empresa.com.` });
      (el as HTMLInputElement).value = ""; salvarCampoFunc(id, { email: null }, el); return;
    }
    salvarCampoFunc(id, { email: v.trim() || null }, el);
  };

  const [desfazer, setDesfazer] = useState<{ texto: string; onDesfazer: () => void } | null>(null);
  const [segRestante, setSegRestante] = useState(0);
  const desfazerI = useRef<number | undefined>(undefined);
  const fecharDesfazer = () => { window.clearInterval(desfazerI.current); setDesfazer(null); };
  const mostrarDesfazer = (texto: string, onDesfazer: () => void) => {
    setDesfazer({ texto, onDesfazer });
    setSegRestante(10);
    window.clearInterval(desfazerI.current);
    desfazerI.current = window.setInterval(() => {
      setSegRestante((s) => { if (s <= 1) { window.clearInterval(desfazerI.current); setDesfazer(null); return 0; } return s - 1; });
    }, 1000);
  };

  async function excluir(f: Funcionario) {
    await delFuncionario(f.id);
    reload();
    const { id: _id, empresa_id: _emp, ...copia } = f;
    void _id; void _emp;
    mostrarDesfazer(`"${f.nome}" excluído`, async () => { await addFuncionario(copia); reload(); });
  }

  // avisinho "Salvo" — aparece logo em frente ao texto digitado
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);
  function fimDoTexto(el: HTMLElement, r: DOMRect): number {
    if (!(el instanceof HTMLInputElement) || el.type === "date") return r.right;
    const cs = getComputedStyle(el);
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");
    if (!ctx) return r.right;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const largura = ctx.measureText(el.value).width;
    const padEsq = parseFloat(cs.paddingLeft) || 0;
    return Math.min(r.left + padEsq + largura, r.right);
  }
  const flashEm = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: fimDoTexto(el, r) });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  };
  async function salvarCampoFunc(id: string, patch: Partial<Funcionario>, el: HTMLElement) {
    if (patch.nome != null) patch = { ...patch, nome: patch.nome.toUpperCase() };   // nome da equipe sempre em MAIÚSCULO
    await updateFuncionario(id, patch);
    reload();
    flashEm(el);
  }
  // salva um campo de um usuário com login (em me_diretores)
  function salvarCampoLogin(l: Linha, patch: Partial<DPessoa>, el: HTMLElement) {
    if (patch.nome != null) patch = { ...patch, nome: patch.nome.toUpperCase() };   // nome da equipe sempre em MAIÚSCULO
    if (l.ehSuper) setDir((s) => ({ ...s, sup: { ...s.sup, ...patch } }));
    else setDir((s) => ({ ...s, admins: s.admins.map((a) => a.id === l.perfilId ? { ...a, ...patch } : a) }));
    flashEm(el);
  }

  // ---- monta as linhas: usuários com login (topo) + equipe comum ----
  // mostra as linhas de login quando há login real (Supabase) OU quando o demo já tem um superadmin preenchido
  const mostrarLogins = supabaseReady || !!(dir.sup?.nome?.trim() || dir.sup?.email?.trim());
  const loginList = mostrarLogins && dirCarregado
    ? [{ p: dir.sup, nivel: "superadmin" as Nivel, ehSuper: true }, ...dir.admins.map((a) => ({ p: a, nivel: "admin" as Nivel, ehSuper: false }))]
    : [];
  const loginByEmail = new Map<string, { nivel: Nivel; perfilId: string; areas: Perm; ehSuper: boolean }>();
  loginList.forEach((x) => { const e = (x.p.email || "").toLowerCase(); if (e) loginByEmail.set(e, { nivel: x.nivel, perfilId: x.p.id, areas: x.p.permissoes, ehSuper: x.ehSuper }); });
  const emailsFunc = new Set(funcs.map((f) => (f.email || "").toLowerCase()).filter(Boolean));

  const funcLinhas: Linha[] = funcs.map((f) => {
    const e = (f.email || "").toLowerCase();
    const lg = e ? loginByEmail.get(e) : undefined;
    return {
      chave: `f:${f.id}`, origem: "func", func: f, ehSuper: !!lg?.ehSuper, nivel: lg?.nivel || "sem", perfilId: lg?.perfilId,
      nome: f.nome || "", cargo: f.cargo || "", email: f.email || "", telefone: f.contato || "", cpf: f.cpf || "", pix: f.pix || "", nascimento: f.nascimento || "",
      ativo: f.ativo, areas: lg?.areas ?? [],
    };
  });
  const loginLinhas: Linha[] = loginList
    .filter((x) => { const e = (x.p.email || "").toLowerCase(); if (e && emailsFunc.has(e)) return false; return x.ehSuper || !!e; })
    .map((x) => ({
      chave: x.ehSuper ? "login:super" : `login:${x.p.id}`, origem: "login", ehSuper: x.ehSuper, nivel: x.nivel, perfilId: x.p.id,
      nome: x.p.nome || "", cargo: x.p.area || "", email: x.p.email || "", telefone: x.p.telefone || "", cpf: x.p.cpf || "", pix: x.p.pix || "", nascimento: x.p.nascimento || "",
      ativo: true, areas: x.p.permissoes,
    }));

  // dono edita tudo; admin edita as linhas de funcionário (a equipe) e a própria linha de login.
  // linhas de login de OUTROS usuários (superadmin/admins) só o dono ou o próprio dono da linha editam.
  const podeEditar = (l: Linha) => ehDono || l.origem === "func" || (!!emailLog && !!l.email && l.email.toLowerCase() === emailLog);
  const ehMinha = (l: Linha) => !!emailLog && !!l.email && l.email.toLowerCase() === emailLog;

  // ---- modo Lista: busca + ordenação por coluna ----
  const COLS: { k: string; label: string }[] = [
    { k: "nome", label: "Nome" }, { k: "contato", label: "Telefone" }, { k: "email", label: "E-mail" },
    { k: "cpf", label: "CPF" }, { k: "nascimento", label: "Nascimento" }, { k: "cargo", label: "Tipo" },
  ];
  const bq = busca.trim().toLowerCase();
  const passaBusca = (l: Linha) => !bq || [l.nome, l.telefone, l.email, l.cpf, l.pix, l.cargo].some((x) => (x || "").toLowerCase().includes(bq));
  const loginVis = (filtro === "ativos" ? loginLinhas : []).filter(passaBusca);
  const funcVis0 = funcLinhas.filter((l) => filtro === "ativos" ? l.ativo : !l.ativo).filter(passaBusca);
  const funcVis = funcVis0.slice().sort((a, b) => (!a.nome.trim() !== !b.nome.trim()) ? (a.nome.trim() ? -1 : 1) : a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const valDe = (l: Linha, col: string): string => col === "nome" ? l.nome : col === "nascimento" ? l.nascimento : col === "cargo" ? l.cargo : "";
  const funcTab = sortCol
    ? funcVis.slice().sort((a, b) => { const r = valDe(a, sortCol).localeCompare(valDe(b, sortCol), "pt-BR", { sensitivity: "base", numeric: true }); return sortDir === "asc" ? r : -r; })
    : funcVis;
  // "com acesso ao app" = qualquer pessoa com nível de acesso (login), inclusive
  // funcionários que também são admin (ex: Luciana).
  const linhasBase: Linha[] = [...loginVis, ...funcTab];
  const linhas: Linha[] = soAcesso ? linhasBase.filter((l) => l.nivel !== "sem") : linhasBase;

  const seta = (k: string) => sortCol !== k
    ? <ChevronsUpDown size={13} style={{ opacity: .4 }} />
    : (sortDir === "asc" ? <ChevronUp size={13} style={{ color: "var(--brand)" }} /> : <ChevronDown size={13} style={{ color: "var(--brand)" }} />);
  const iniciaisDe = (n: string) => n.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  // ---- trocar nível de acesso (cria/remove login de verdade) ----
  const [processando, setProcessando] = useState(false);
  const [aRemover, setARemover] = useState<Linha | null>(null);
  const [confirmarAdmin, setConfirmarAdmin] = useState<Linha | null>(null);   // confirma antes de dar acesso Admin (envia e-mail + muda o plano)
  async function tokenAtual(): Promise<string | null> {
    if (!supabaseReady || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  async function promover(l: Linha) {
    const email = (l.email || "").trim();
    if (!emailValido(email)) { setAviso({ titulo: "Falta o e-mail", texto: "Preencha um e-mail válido nesta pessoa antes de dar acesso de Admin. É para lá que vai o convite." }); return; }
    const token = await tokenAtual();
    if (!token) { setAviso({ titulo: "Sessão expirada", texto: "Entre novamente e tente de novo." }); return; }
    setProcessando(true);
    try {
      const r = await fetch("/api/colaboradores", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ nome: l.nome ? l.nome.toUpperCase() : email, email, areas: [] }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 402) { setAviso({ titulo: "Limite de acessos do seu plano", texto: (j as { error?: string }).error || motivoLimiteAcessos(empresa?.planos), plano: true }); return; }
      if (!r.ok) { setAviso({ titulo: "Não consegui dar o acesso", texto: (j as { error?: string }).error || "Tente novamente." }); return; }
      await recarregarColab();
      setAviso({ titulo: "Acesso de Admin criado", texto: `Enviamos um e-mail para ${email} criar a senha. Depois de criar a senha, ele entra como Admin. Ajuste as permissões pelo botão “Permissões”.` });
    } finally { setProcessando(false); }
  }
  async function remover(l: Linha) {
    if (!l.perfilId || l.perfilId === "super") return;
    const token = await tokenAtual();
    if (!token) { setAviso({ titulo: "Sessão expirada", texto: "Entre novamente e tente de novo." }); return; }
    setProcessando(true);
    try {
      const r = await fetch(`/api/colaboradores?id=${l.perfilId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAviso({ titulo: "Não consegui remover o acesso", texto: (j as { error?: string }).error || "Tente novamente." }); return; }
      await recarregarColab();
    } finally { setProcessando(false); }
  }
  function trocarNivel(l: Linha, novo: Nivel) {
    if (novo === l.nivel) return;
    if (novo === "superadmin") {
      // só no modo demonstração (sem login real): marca a pessoa como superadmin copiando os dados dela pro sup
      if (supabaseReady) return;
      setDir((s) => ({ ...s, sup: { ...s.sup, nome: l.nome, area: l.cargo || "Geral", email: l.email, acesso: l.email, telefone: l.telefone, cpf: l.cpf, pix: l.pix, nascimento: l.nascimento } }));
      return;
    }
    if (novo === "admin") {
      const email = (l.email || "").trim();
      if (!emailValido(email)) { setAviso({ titulo: "Falta o e-mail", texto: "Preencha um e-mail válido nesta pessoa antes de dar acesso de Admin. É para lá que vai o convite." }); return; }
      // Quantos logins cabem é o que a empresa contratou (dono + cada 2º acesso).
      if (supabaseReady && !podeAdicionarAcesso(empresa?.planos, 1 + dir.admins.length)) {
        setAviso({ titulo: "Limite de acessos do seu plano", texto: motivoLimiteAcessos(empresa?.planos), plano: true });
        return;
      }
      setConfirmarAdmin(l);   // pede confirmação (envia e-mail + atualiza o plano)
    }
    else if (novo === "sem") setARemover(l);
  }

  // ---- permissões (áreas do menu) de um admin ----
  const [permAlvo, setPermAlvo] = useState<Linha | null>(null);
  const [permSel, setPermSel] = useState<string[]>([]);
  const [salvandoPerm, setSalvandoPerm] = useState(false);
  const abrirPerm = (l: Linha) => { setPermAlvo(l); setPermSel(chaves(l.areas)); };
  const alternarPerm = (k: string) => setPermSel((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  async function salvarPermissoes() {
    if (!permAlvo?.perfilId) { setPermAlvo(null); return; }
    setSalvandoPerm(true);
    try {
      const token = await tokenAtual();
      if (token) await fetch("/api/colaboradores", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: permAlvo.perfilId, areas: permSel }) }).catch(() => {});
      // reflete localmente
      const pid = permAlvo.perfilId;
      setDir((s) => ({ ...s, admins: s.admins.map((a) => a.id === pid ? { ...a, permissoes: permSel } : a) }));
    } finally { setSalvandoPerm(false); setPermAlvo(null); }
  }

  // ---- trocar a própria senha ----
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [s1, setS1] = useState(""); const [s2, setS2] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [senhaErro, setSenhaErro] = useState(""); const [senhaOk, setSenhaOk] = useState(false);
  const [senhaSalvando, setSenhaSalvando] = useState(false);
  const abrirSenha = () => { setS1(""); setS2(""); setSenhaErro(""); setSenhaOk(false); setVerSenha(false); setSenhaAberta(true); };
  const salvarSenha = async () => {
    if (s1.length < 6) { setSenhaErro("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (s1 !== s2) { setSenhaErro("As senhas não conferem. Digite a mesma senha nos dois campos."); return; }
    setSenhaErro(""); setSenhaSalvando(true);
    if (supabaseReady && supabase) {
      const { error } = await supabase.auth.updateUser({ password: s1 });
      if (error) { setSenhaSalvando(false); setSenhaErro("Não consegui alterar a senha agora. Faça login de novo e tente outra vez."); return; }
    }
    setSenhaSalvando(false); setSenhaOk(true);
    window.setTimeout(() => setSenhaAberta(false), 1300);
  };

  // relatório: superadmin + admins entram junto da equipe
  const diretoresRel: DiretorRel[] = dirCarregado
    ? [dir.sup, ...dir.admins].filter((d) => (d.nome || "").trim()).map((d) => ({ nome: d.nome, cargo: "Diretor", area: d.area, email: d.email, telefone: d.telefone, cpf: d.cpf, pix: d.pix, nascimento: d.nascimento }))
    : [];

  // chave liga/desliga: ativos em verde, desativados em vermelho
  const opc = (k: "ativos" | "desativados", txt: string) => {
    const cor = k === "ativos" ? VERDE : VERMELHO;
    const on = filtro === k;
    return (
      <button onClick={() => setFiltro(k)}
        style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0,
          background: on ? `${cor}22` : "transparent", color: on ? cor : "var(--muted)", transition: ".15s" }}>
        {txt}
      </button>
    );
  };

  // etiqueta/seletor de nível de acesso na coluna
  const NivelCel = ({ l }: { l: Linha }) => {
    if (l.ehSuper) {
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${AMBAR}1f`, color: AMBAR, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", padding: "4px 10px", borderRadius: 99 }}><Crown size={12} /> Superadmin</span>;
    }
    const chip = l.nivel === "admin"
      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${AZUL}1f`, color: AZUL, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", padding: "4px 10px", borderRadius: 99 }}><Shield size={12} /> Admin</span>
      : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(148,163,184,.16)", color: "var(--muted)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>Sem acesso</span>;
    if (!ehDono) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
          {chip}
          {l.nivel === "admin" && <span style={{ fontSize: 10.5, color: VERDE, fontWeight: 700 }}>{resumoPerm(l.areas)}</span>}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <select value={l.nivel === "admin" ? "admin" : "sem"} disabled={processando}
          onChange={(e) => trocarNivel(l, e.target.value as Nivel)}
          title="Nível de acesso ao painel"
          style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "5px 8px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: l.nivel === "admin" ? AZUL : "var(--muted)", cursor: processando ? "wait" : "pointer" }}>
          <option value="superadmin" disabled={supabaseReady}>Superadmin</option>
          <option value="admin">Admin</option>
          <option value="sem">Sem acesso</option>
        </select>
        {l.nivel === "admin" && (
          <button onClick={() => abrirPerm(l)} title="Escolher o que este admin vê no menu"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)", fontFamily: "inherit", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>
            <SlidersHorizontal size={11} /> {resumoPerm(l.areas)}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* imprimir PDF */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <BotaoRelatorioEquipe funcs={funcs} empresa={empresa}
          brand={brand ?? { nome: "Minha Empresa", logo: null, cor: "#1AADE2", saudacao: "", logoTamanho: 40 }}
          diretores={diretoresRel} />
      </div>

      {/* filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={() => setSoAcesso((v) => !v)} title={soAcesso ? "Voltar a mostrar todos" : "Mostrar só quem tem login/acesso ao app"}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${soAcesso ? "var(--brand)" : "var(--line-2)"}`,
            background: soAcesso ? "var(--brand)" : "transparent",
            color: soAcesso ? "var(--brand-ct,#fff)" : "var(--muted)" }}>
          {soAcesso ? <><ArrowLeft size={14} /> Voltar à tela completa</> : <><KeyRound size={14} /> Com acesso ao app</>}
        </button>
        {!soAcesso && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 99, padding: 2 }}>
            {opc("ativos", "Ativos")}
            {opc("desativados", "Desativados")}
          </div>
        )}
      </div>

      {modo === "lista" ? (
        <div>
          {/* busca no topo */}
          <div style={{ position: "relative", maxWidth: 400, marginBottom: 14 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail, CPF ou cargo…" style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10 }} />
          </div>
          {/* tabela ordenável (clique nos títulos das colunas) */}
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 14px 36px -26px rgba(0,0,0,.45)" }}>
            <table className="eq-tab" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1218, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 240 }} />{/* Nome (mais larga) */}
                <col style={{ width: 115 }} />{/* Telefone */}
                <col style={{ width: 215 }} />{/* E-mail (mais larga) */}
                <col style={{ width: 115 }} />{/* CPF */}
                <col style={{ width: 115 }} />{/* Nascimento */}
                <col style={{ width: 105 }} />{/* Cargo */}
                <col style={{ width: 150 }} />{/* Nível de acesso */}
                <col style={{ width: 85 }} />{/* Status */}
                <col style={{ width: 78 }} />{/* Ações */}
              </colgroup>
              <thead>
                <tr>
                  {COLS.map((c) => ORDENAVEIS.has(c.k) ? (
                    <th key={c.k} className={`eq-th${c.k === "nome" ? " eq-fix" : ""}`} onClick={() => ordenarPor(c.k)} title="Ordenar por esta coluna">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{c.label} {seta(c.k)}</span>
                    </th>
                  ) : (
                    <th key={c.k} className={`eq-th${c.k === "nome" ? " eq-fix" : ""}`} style={{ cursor: "default" }}>{c.label}</th>
                  ))}
                  <th className="eq-th" title="Nível de acesso ao painel" style={{ cursor: "default" }}>Nível de acesso</th>
                  <th className="eq-th" style={{ textAlign: "center", cursor: "default" }}>Status</th>
                  <th className="eq-th" style={{ width: 84 }} />
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const edit = podeEditar(l);
                  const roDica = l.ehSuper ? "Só o superadmin pode editar os próprios dados." : "Só o próprio usuário pode editar estes dados.";
                  return (
                    <tr key={l.chave} className="eq-row" style={{ opacity: l.ativo ? 1 : .6 }}>
                      <td className="eq-fix">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", minWidth: 18, textAlign: "right" }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Campo valor={l.nome} placeholder="Nome" disabled={!edit} titulo={roDica} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar}
                              onSalvar={(v, el) => l.origem === "func" ? salvarCampoFunc(l.func!.id, { nome: v.trim() || l.nome }, el) : salvarCampoLogin(l, { nome: v.trim() }, el)}
                              style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }} />
                          </div>
                        </div>
                      </td>
                      <td><Campo valor={l.telefone} placeholder="—" disabled={!edit} titulo={roDica} formatar={mascararTelefone} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar}
                        onSalvar={(v, el) => l.origem === "func" ? salvarCampoFunc(l.func!.id, { contato: v.trim() || null }, el) : salvarCampoLogin(l, { telefone: v.trim() }, el)} /></td>
                      <td><Campo valor={l.email} placeholder="—" disabled={l.origem === "login" || !edit} titulo={l.origem === "login" ? "E-mail de login, não editável aqui." : roDica} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar}
                        onSalvar={(v, el) => l.origem === "func" ? salvarEmail(l.func!.id, v, el) : undefined} /></td>
                      <td><Campo valor={l.cpf} placeholder="—" disabled={!edit} titulo={roDica} formatar={mascararCPF} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar}
                        onSalvar={(v, el) => l.origem === "func" ? salvarCpf(l.func!.id, v, el) : salvarCampoLogin(l, { cpf: v.trim() }, el)} /></td>
                      <td><Campo valor={l.nascimento} placeholder="dd/mm/aaaa" tipo="date" disabled={!edit} titulo={roDica} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar}
                        onSalvar={(v, el) => l.origem === "func" ? salvarCampoFunc(l.func!.id, { nascimento: v || null }, el) : salvarCampoLogin(l, { nascimento: v }, el)} /></td>
                      <td style={{ textAlign: "center" }}><TipoSelect valor={l.cargo} disabled={!edit}
                        onSalvar={(v, el) => l.origem === "func" ? salvarCampoFunc(l.func!.id, { cargo: v }, el) : salvarCampoLogin(l, { area: v }, el)} /></td>
                      <td><NivelCel l={l} /></td>
                      <td style={{ textAlign: "center" }}>
                        {l.origem === "func" && l.func ? (
                          <button title={l.func.ativo ? "Clique para desativar" : "Clique para ativar"} onClick={() => l.func!.ativo ? setADesativar({ f: l.func!, data: hojeISO() }) : setAAtivar(l.func!)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: 0, fontFamily: "inherit", background: l.func.ativo ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", color: l.func.ativo ? VERDE : VERMELHO, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "5px 11px", borderRadius: 99 }}>
                            <Power size={11} /> {l.func.ativo ? "Ativo" : "Inativo"}
                          </button>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,.12)", color: VERDE, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "5px 11px", borderRadius: 99 }}>
                            <Power size={11} /> Ativo
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        {(ehMinha(l) || l.ehSuper) && (
                          <button title="Trocar a senha" onClick={abrirSenha}
                            style={{ width: 28, height: 28, borderRadius: 8, display: "inline-grid", placeItems: "center", cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)", marginRight: 6, verticalAlign: "middle" }}>
                            <Lock size={14} />
                          </button>
                        )}
                        {l.origem === "func" && l.func && edit && !l.ehSuper && (
                          <button title="Excluir" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir({ nome: l.func!.nome, onOk: () => excluir(l.func!) })}
                            style={{ width: 28, height: 28, borderRadius: 8, display: "inline-grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: VERMELHO, verticalAlign: "middle" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {linhas.length === 0 && <tr><td colSpan={COLS.length + 3} style={{ textAlign: "center", padding: 26, color: "var(--muted)" }}>{bq ? "Nenhum resultado para a busca." : "Ninguém cadastrado ainda."}</td></tr>}
                {filtro === "ativos" && (
                  <tr className="eq-row">
                    <td colSpan={COLS.length + 3} style={{ padding: "8px 10px" }}>
                      <button onClick={novoInline} disabled={criando}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: criando ? "wait" : "pointer", opacity: criando ? .6 : 1, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--brand)", background: "transparent", border: 0, padding: "4px 8px", borderRadius: 8 }}
                        onMouseEnter={(e) => { if (!criando) e.currentTarget.style.background = "color-mix(in srgb, var(--brand) 10%, transparent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <Plus size={15} /> Cadastrar equipe
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="grid equipe-grid" style={{ gap: 14 }}>
          {loginVis.map((l) => {
            const edit = podeEditar(l);
            return (
              <div key={l.chave} className="card equipe-card" style={{ padding: 0, overflow: "hidden", borderRadius: 18, position: "relative" }}>
                <div style={{ height: 64, background: l.ehSuper ? "linear-gradient(135deg, #f59e0b, #b45309)" : "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))" }} />
                <div style={{ position: "absolute", top: 12, right: 12, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.92)", color: l.ehSuper ? AMBAR : AZUL, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "4px 10px", borderRadius: 99, boxShadow: "0 2px 6px -2px rgba(0,0,0,.3)" }}>
                  {l.ehSuper ? <><Crown size={11} /> Superadmin</> : <><Shield size={11} /> Admin</>}
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: -34 }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", display: "grid", placeItems: "center", background: l.ehSuper ? "linear-gradient(135deg, #f59e0b, #b45309)" : "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))", color: "#fff", fontWeight: 800, fontSize: 22, border: "3px solid var(--card)", boxShadow: "0 6px 16px -6px rgba(0,0,0,.45)" }}>
                    {iniciaisDe(l.nome) || (l.ehSuper ? <Crown size={26} /> : <Shield size={26} />)}
                  </div>
                </div>
                <div style={{ padding: "8px 16px 0" }}>
                  <CampoNome valor={l.nome} placeholder="Nome" disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoLogin(l, { nome: v.trim() }, el)} style={{ fontSize: 16, fontWeight: 800, textAlign: "center", textTransform: "uppercase" }} />
                  <div style={{ marginTop: 2 }}>
                    <TipoSelect valor={l.cargo} disabled={!edit} onSalvar={(v, el) => salvarCampoLogin(l, { area: v }, el)} />
                  </div>
                </div>
                <div style={{ padding: "12px 16px 16px", marginTop: 10, display: "grid", gap: 10, borderTop: "1px solid var(--line)" }}>
                  <LinhaEdit icone={<Mail size={14} />} valor={l.email} placeholder="E-mail" disabled onSalvar={() => {}} />
                  <LinhaEdit icone={<Phone size={14} />} valor={l.telefone} placeholder="Telefone" disabled={!edit} formatar={mascararTelefone} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoLogin(l, { telefone: v.trim() }, el)} />
                  <LinhaEdit icone={<CreditCard size={14} />} prefixo="CPF" prefixoClaro valor={l.cpf} disabled={!edit} formatar={mascararCPF} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoLogin(l, { cpf: v.trim() }, el)} />
                  <LinhaEdit icone={<KeyRound size={14} />} prefixo="Pix" prefixoClaro valor={l.pix} disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoLogin(l, { pix: v.trim() }, el)} />
                  <LinhaEdit icone={<Cake size={14} />} prefixo="Nasc." valor={l.nascimento} tipo="date" disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoLogin(l, { nascimento: v }, el)} />
                  {!l.ehSuper && ehDono && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                      <button onClick={() => abrirPerm(l)} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}><SlidersHorizontal size={12} /> {resumoPerm(l.areas)}</button>
                      <button onClick={() => setARemover(l)} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: VERMELHO, fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}><X size={12} /> Remover acesso</button>
                    </div>
                  )}
                  {ehMinha(l) && (
                    <button onClick={abrirSenha} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}><Lock size={14} /> Trocar senha</button>
                  )}
                </div>
              </div>
            );
          })}
          {funcVis.map((l) => {
            const f = l.func!;
            const edit = podeEditar(l);
            return (
              <div key={l.chave} className="card equipe-card" style={{ padding: 0, overflow: "hidden", borderRadius: 18, opacity: f.ativo ? 1 : 0.72, position: "relative", transition: "transform .18s, box-shadow .18s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 20px 42px -24px rgba(0,0,0,.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ height: 64, background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))" }} />
                {edit && (focoId === l.chave || estreito || !f.ativo) && (
                  <button className="card-trash" title="Remover" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir({ nome: f.nome, onOk: () => excluir(f) })}
                    style={{ position: "absolute", top: 12, left: 12, width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(255,255,255,.92)", color: VERMELHO, boxShadow: "0 2px 6px -2px rgba(0,0,0,.3)" }}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => f.ativo ? setADesativar({ f, data: hojeISO() }) : setAAtivar(f)} title={f.ativo ? "Clique para desativar" : "Clique para ativar"}
                  style={{ position: "absolute", top: 12, right: 12, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: 0, fontFamily: "inherit", background: "rgba(255,255,255,.92)", color: f.ativo ? VERDE : VERMELHO, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "4px 10px", borderRadius: 99, boxShadow: "0 2px 6px -2px rgba(0,0,0,.3)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.ativo ? VERDE : VERMELHO }} /> {f.ativo ? "Ativo" : "Inativo"}
                </button>
                <div style={{ display: "flex", justifyContent: "center", marginTop: -34 }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))", color: "var(--brand-ct,#fff)", fontWeight: 800, fontSize: 23, border: "3px solid var(--card)", boxShadow: "0 6px 16px -6px rgba(0,0,0,.45)" }}>
                    {iniciais(f.nome) || <User size={30} />}
                  </div>
                </div>
                <div style={{ padding: "8px 16px 0" }}>
                  <CampoNome valor={f.nome} placeholder="Nome" disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoFunc(f.id, { nome: v.trim() || f.nome }, el)} style={{ fontSize: 16, fontWeight: 800, textAlign: "center", textTransform: "uppercase" }} />
                  <div style={{ marginTop: 2 }}>
                    <TipoSelect valor={f.cargo || ""} disabled={!edit} onSalvar={(v, el) => salvarCampoFunc(f.id, { cargo: v }, el)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    {ehDono ? (
                      <select value="sem" disabled={processando} onChange={(e) => trocarNivel(l, e.target.value as Nivel)} title="Nível de acesso ao painel"
                        style={{ fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "4px 8px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--muted)", cursor: processando ? "wait" : "pointer" }}>
                        <option value="super" disabled>Superadmin</option>
                        <option value="admin">Admin</option>
                        <option value="sem">Sem acesso</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, background: "rgba(148,163,184,.16)", padding: "3px 9px", borderRadius: 99 }}>Sem acesso</span>
                    )}
                  </div>
                </div>
                <div style={{ padding: "12px 16px 16px", marginTop: 10, display: "grid", gap: 10, borderTop: "1px solid var(--line)" }}>
                  <LinhaEdit icone={<Phone size={14} />} valor={f.contato} placeholder="Telefone" disabled={!edit} formatar={mascararTelefone} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoFunc(f.id, { contato: v.trim() || null }, el)} />
                  <LinhaEdit icone={<Mail size={14} />} valor={f.email} placeholder="E-mail" disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarEmail(f.id, v, el)} />
                  <LinhaEdit icone={<CreditCard size={14} />} prefixo="CPF" prefixoClaro valor={f.cpf} disabled={!edit} formatar={mascararCPF} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCpf(f.id, v, el)} />
                  <LinhaEdit icone={<KeyRound size={14} />} prefixo="Pix" prefixoClaro valor={f.pix} disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoFunc(f.id, { pix: v.trim() || null }, el)} />
                  <LinhaEdit icone={<Cake size={14} />} prefixo="Nasc." valor={f.nascimento} tipo="date" disabled={!edit} onFocar={() => aoFocar(l.chave)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampoFunc(f.id, { nascimento: v || null }, el)} />
                </div>
                {!f.ativo && f.desativado_em && (
                  <div style={{ margin: "0 16px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: AMARELO, background: "rgba(245,158,11,.12)", padding: "4px 10px", borderRadius: 8 }}>
                    Desativado em {brData(f.desativado_em)}
                  </div>
                )}
              </div>
            );
          })}

          {filtro === "ativos" && (
            <button onClick={novoInline} disabled={criando}
              style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: criando ? "wait" : "pointer", opacity: criando ? .6 : 1, fontFamily: "inherit", borderRadius: 18, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".15s" }}
              onMouseEnter={(e) => { if (!criando) { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--muted)"; }}>
              <span style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Plus size={22} /></span>
              <b style={{ fontSize: 13.5 }}>Cadastrar equipe</b>
            </button>
          )}
        </div>
      )}

      {/* modal: permissões de um admin */}
      {permAlvo && (
        <div onClick={() => setPermAlvo(null)} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 620, padding: 20, maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><SlidersHorizontal size={18} /></span>
                <div style={{ lineHeight: 1.25 }}>
                  <b style={{ fontSize: 15 }}>Permissões de {permAlvo.nome || "admin"}</b>
                  <div className="sub" style={{ fontSize: 11.5, fontStyle: "italic" }}>Marque o que este admin vê no menu.</div>
                </div>
              </div>
              <button onClick={() => setPermAlvo(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "14px 0" }}>
              <span className="sub" style={{ fontSize: 12 }}>{permSel.filter((k) => TODAS.includes(k)).length} de {TODAS.length} itens liberados</span>
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={() => setPermSel(TODAS.slice())} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "var(--brand)" }}>Marcar tudo</button>
                <button onClick={() => setPermSel([])} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>Limpar</button>
              </div>
            </div>
            {GRUPOS.map((g) => (
              <div key={g.titulo} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8 }}>{g.titulo}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {g.itens.map((it) => {
                    const on = permSel.includes(it.k);
                    return (
                      <button key={it.k} onClick={() => alternarPerm(it.k)}
                        style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "9px 12px", borderRadius: 10, border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--brand) 9%, transparent)" : "transparent", color: on ? "var(--txt)" : "var(--muted)" }}>
                        <it.Icon size={15} style={{ color: on ? "var(--brand)" : "var(--muted)", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{it.label}</span>
                        {on ? <Eye size={15} style={{ color: "var(--brand)" }} /> : <EyeOff size={15} style={{ color: "var(--muted)" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <button className="btn ghost" onClick={() => setPermAlvo(null)}>Fechar</button>
              <button className="btn" onClick={salvarPermissoes} disabled={salvandoPerm} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} /> {salvandoPerm ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação: remover acesso (demote) */}
      {aRemover && (
        <div onClick={() => setARemover(null)} style={{ position: "fixed", inset: 0, zIndex: 92, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 24, border: `1px solid ${VERMELHO}`, background: "linear-gradient(160deg, rgba(239,68,68,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.16)", color: VERMELHO, flexShrink: 0 }}><X size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Remover o acesso de &ldquo;{aRemover.nome || aRemover.email}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Ele deixa de ser Admin e perde o login no painel. O cadastro na equipe (se houver) continua.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setARemover(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} disabled={processando} onClick={async () => { const alvo = aRemover; setARemover(null); if (alvo) await remover(alvo); }}>{processando ? "Removendo…" : "Remover acesso"}</button>
            </div>
          </div>
        </div>
      )}

      {/* pop-up: confirmar dar acesso Admin (envia e-mail + atualiza o plano) */}
      {confirmarAdmin && (
        <div onClick={() => setConfirmarAdmin(null)} style={{ position: "fixed", inset: 0, zIndex: 93, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", flexShrink: 0 }}><User size={19} /></span>
              <div>
                <b style={{ fontSize: 15.5 }}>Dar acesso de Admin para &ldquo;{confirmarAdmin.nome || confirmarAdmin.email}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 6, lineHeight: 1.55, fontSize: 13 }}>
                  Ao confirmar:
                </p>
                <ul className="sub" style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
                  <li>Enviaremos um <b>e-mail</b> para <b>{confirmarAdmin.email}</b> criar a senha e acessar o painel.</li>
                  <li>O <b>valor do seu plano será atualizado</b> (a cobrança é por usuário com acesso).</li>
                </ul>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmarAdmin(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} disabled={processando} onClick={async () => { const alvo = confirmarAdmin; setConfirmarAdmin(null); if (alvo) await promover(alvo); }}>{processando ? "Enviando…" : "Confirmar e enviar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* pop-up: trocar a própria senha */}
      {senhaAberta && (
        <div onClick={() => setSenhaAberta(false)} style={{ position: "fixed", inset: 0, zIndex: 95, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Lock size={19} /></span>
              <div>
                <b style={{ fontSize: 16 }}>Alterar senha</b>
                <p className="sub" style={{ margin: "2px 0 0", fontSize: 12 }}>Acesso: {loginEmail || "sua conta"}</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">Nova senha</label>
              <input type={verSenha ? "text" : "password"} value={s1} placeholder="Mínimo 6 caracteres" autoFocus onChange={(e) => { setS1(e.target.value); setSenhaErro(""); }} />
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label className="f">Confirmar nova senha</label>
              <input type={verSenha ? "text" : "password"} value={s2} placeholder="Digite a senha novamente" onChange={(e) => { setS2(e.target.value); setSenhaErro(""); }} onKeyDown={(e) => { if (e.key === "Enter") salvarSenha(); }} />
            </div>
            <button onClick={() => setVerSenha((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", color: "var(--muted)", fontSize: 12.5, fontWeight: 600 }}>
              {verSenha ? <EyeOff size={14} /> : <Eye size={14} />} {verSenha ? "Ocultar senhas" : "Mostrar senhas"}
            </button>
            {senhaErro && <div className="err" style={{ marginTop: 12 }}>{senhaErro}</div>}
            {senhaOk && <div className="ok" style={{ marginTop: 12 }}>✅ Senha alterada com sucesso!</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setSenhaAberta(false)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={salvarSenha} disabled={senhaOk || senhaSalvando}>{senhaSalvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* aviso genérico (CPF/e-mail/acesso) */}
      {aviso && (
        <div onClick={() => setAviso(null)}
          style={{ position: "fixed", inset: 0, zIndex: 96, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 24, border: `1px solid ${VERMELHO}`, background: "linear-gradient(160deg, rgba(239,68,68,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.16)", color: VERMELHO, flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>{aviso.titulo}</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{aviso.texto}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {aviso.plano && irParaPlano ? (
                <>
                  <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAviso(null)}>Agora não</button>
                  <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setAviso(null); irParaPlano(); }}>Ver planos</button>
                </>
              ) : (
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAviso(null)}>Entendi</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* confirmação de desativação */}
      {aDesativar && (
        <div onClick={() => setADesativar(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 24, border: `1px solid ${AMARELO}`, background: "linear-gradient(160deg, rgba(245,158,11,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.16)", color: AMARELO, flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>Desativar &ldquo;{aDesativar.f.nome || "colaborador"}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Confirme a data em que ele será desativado.</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">Data da desativação</label>
              <input type="date" value={aDesativar.data} onChange={(e) => setADesativar((a) => a ? { ...a, data: e.target.value } : a)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setADesativar(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: AMARELO, color: "#3b2e05" }}
                onClick={async () => { await updateFuncionario(aDesativar.f.id, { ativo: false, desativado_em: aDesativar.data }); setADesativar(null); reload(); }}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de reativação */}
      {aAtivar && (
        <div onClick={() => setAAtivar(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24, border: `1px solid ${VERDE}`, background: "linear-gradient(160deg, rgba(16,185,129,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(16,185,129,.16)", color: VERDE, flexShrink: 0 }}><Power size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Reativar &ldquo;{aAtivar.nome || "colaborador"}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Ele volta a aparecer como ativo na equipe.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAAtivar(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERDE }}
                onClick={async () => { await updateFuncionario(aAtivar.id, { ativo: true, desativado_em: null }); setAAtivar(null); reload(); }}>
                Reativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* selinho "Salvo" */}
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 90, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* barra "desfazer exclusão" */}
      {desfazer && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 85,
          display: "flex", alignItems: "center", gap: 14, background: "#1e293b", color: "#fff",
          padding: "10px 12px 10px 18px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)" }}>
          <span style={{ fontSize: 13 }}>{desfazer.texto}</span>
          <button onClick={() => { desfazer.onDesfazer(); fecharDesfazer(); }}
            style={{ background: "transparent", border: 0, color: "#38BDF8", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Desfazer exclusão
          </button>
          <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{segRestante}</span>
        </div>
      )}

      {/* confirmação de exclusão */}
      {aExcluir && (
        <div onClick={() => setAExcluir(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: VERMELHO, flexShrink: 0 }}>
                <Trash2 size={19} />
              </span>
              <div>
                <b style={{ fontSize: 15 }}>Excluir &ldquo;{aExcluir.nome}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Você ainda pode desfazer por alguns segundos depois de excluir.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAExcluir(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} onClick={() => { aExcluir.onOk(); setAExcluir(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
