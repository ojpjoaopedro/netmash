"use client";
import { useEffect, useRef, useState } from "react";
import {
  Shield, Crown, Plus, Trash2, X, Check,
  Eye, EyeOff, Lock, SlidersHorizontal, LayoutDashboard, DollarSign, Megaphone, Sparkles, Compass, Presentation, Settings,
} from "lucide-react";
import { mascararTelefone, mascararCPF, cpfValido, emailValido, isoParaBR, mascararDataBR, validarDataBR } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";
import { supabase, supabaseReady } from "@/lib/supabase";

const AZUL = "#1AADE2", VERDE = "#10B981", AMBAR = "#F59E0B", VERMELHO = "#EF4444";

/** Itens do menu que um Admin pode liberar, agrupados como no Hub. */
const GRUPOS = [
  { titulo: "Métricas", itens: [
    { k: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { k: "financas", label: "Finanças", Icon: DollarSign },
    { k: "marketing", label: "Marketing", Icon: Megaphone },
  ] },
  { titulo: "Ações", itens: [
    { k: "assistente", label: "Assistente", Icon: Sparkles },
    { k: "planejamento", label: "Planejamento", Icon: Compass },
    { k: "apresentacao", label: "Gerar apresentação", Icon: Presentation },
    { k: "config", label: "Configurações", Icon: Settings },
  ] },
];
const TODAS = GRUPOS.flatMap((g) => g.itens.map((i) => i.k));
const rotulo = (k: string) => GRUPOS.flatMap((g) => g.itens).find((i) => i.k === k)?.label || k;

type Perm = "total" | string[];
type Diretor = {
  id: string; nome: string; area: string; acesso: string; email: string;
  telefone: string; cpf: string; pix: string; nascimento: string; admissao?: string; permissoes: Perm;
};
type Store = { sup: Diretor; admins: Diretor[] };

const SUPER_PADRAO: Diretor = {
  id: "super", nome: "", area: "Geral", acesso: "", email: "",
  telefone: "", cpf: "", pix: "", nascimento: "", permissoes: "total",
};
const KEY = "me_diretores";
function ler(): Store {
  if (typeof window === "undefined") return { sup: { ...SUPER_PADRAO }, admins: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.sup) { if (s.sup.nome === "Super Admin") s.sup.nome = ""; return s; } } catch { /* ignore */ }
  return { sup: { ...SUPER_PADRAO }, admins: [] };
}
function salvar(s: Store) { if (typeof window !== "undefined") { const cru = JSON.stringify(s); localStorage.setItem(KEY, cru); salvarEstadoRemoto(KEY, cru); window.dispatchEvent(new Event("me:diretores")); } }

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}
const chaves = (p: Perm): string[] => (p === "total" ? TODAS.slice() : p);
function resumoPerm(p: Perm): string {
  const n = chaves(p).length;
  if (n === 0) return "Sem acesso";
  if (n >= TODAS.length) return "Acesso total";
  return `${n} ${n === 1 ? "área" : "áreas"}`;
}

/** Campo editável (parece texto, salva ao sair do foco). */
/** Campo com rótulo no padrão do formulário "Dados da empresa" (salva ao sair, com flash). */
function CampoLabel({ label, valor, onSalvar, placeholder, tipo, disabled, lock, onFocar, onDesfocar, formatar, validar, onInvalido, erroData: erroExterno, onErroData }: {
  label: string; valor: string; onSalvar?: (v: string, el: HTMLElement) => void; placeholder?: string; tipo?: string;
  disabled?: boolean; lock?: boolean; onFocar?: () => void; onDesfocar?: () => void;
  formatar?: (v: string) => string; validar?: (v: string) => boolean; onInvalido?: () => void;
  erroData?: string; onErroData?: (m: string) => void;
}) {
  const ehData = tipo === "date";
  const [erroLocal, setErroLocal] = useState("");
  // se o pai controlar o erro (para sobreviver a re-render), usa ele; senão, estado local
  const erroData = onErroData ? (erroExterno || "") : erroLocal;
  const setErroData = onErroData || setErroLocal;
  return (
    <div className="field">
      <label className="f" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{label}{lock && <Lock size={11} style={{ opacity: .6 }} />}</label>
      {disabled
        ? <input value={valor} readOnly title="Definido pelo login, não editável" style={{ opacity: .8, cursor: "default" }} />
        : ehData
          ? <>
              <input defaultValue={isoParaBR(valor)} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10}
                style={erroData ? { borderColor: "var(--red)" } : undefined}
                onInput={(e) => { e.currentTarget.value = mascararDataBR(e.currentTarget.value); if (erroData) setErroData(""); }}
                onFocus={() => onFocar?.()}
                onBlur={(e) => {
                  onDesfocar?.();
                  const { iso, erro } = validarDataBR(e.target.value);
                  setErroData(erro);
                  if (erro) return;                                    // inválida/futura: mostra recado, não salva
                  if (iso !== valor) onSalvar?.(iso, e.currentTarget);
                }} />
              {erroData && <span style={{ color: "var(--red)", fontSize: 11.5, marginTop: 5, display: "inline-block" }}>{erroData}</span>}
            </>
          : <input defaultValue={valor} placeholder={placeholder} type={tipo || "text"}
              onInput={(e) => { if (formatar) e.currentTarget.value = formatar(e.currentTarget.value); }}
              onFocus={() => onFocar?.()}
              onBlur={(e) => {
                onDesfocar?.();
                let v = e.target.value;
                if (formatar) { v = formatar(v); e.target.value = v; }
                // inválido: não salva e limpa o campo
                if (validar && v.trim() && !validar(v)) { e.target.value = ""; onSalvar?.("", e.currentTarget); onInvalido?.(); return; }
                if (v !== valor) onSalvar?.(v, e.currentTarget);
              }} />}
    </div>
  );
}

/** Posição para o selinho "Salvo" colar logo após o texto digitado. */
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

export default function Diretores({ loginEmail = "", irParaPlano }: { loginEmail?: string; irParaPlano?: () => void }) {
  const [store, setStore] = useState<Store>({ sup: { ...SUPER_PADRAO }, admins: [] });
  const [carregado, setCarregado] = useState(false);
  const [permAberto, setPermAberto] = useState(false);
  const [selId, setSelId] = useState<string>("super");
  // selinho "Salvo" ao lado do campo editado
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);
  const salvo = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: fimDoTexto(el, r) });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  };
  const [aExcluir, setAExcluir] = useState<Diretor | null>(null);
  const [aviso, setAviso] = useState<{ titulo: string; texto: string } | null>(null);
  // erros de data ficam aqui no pai (o Card remonta e apagaria o estado local)
  const [errosData, setErrosData] = useState<Record<string, string>>({});
  const setErroData = (k: string, m: string) => setErrosData((x) => ({ ...x, [k]: m }));
  const [upgrade, setUpgrade] = useState(false);
  // alterar senha (super admin)
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
    // altera a senha DE VERDADE no login do usuário (Supabase Auth)
    if (supabaseReady && supabase) {
      const { error } = await supabase.auth.updateUser({ password: s1 });
      if (error) { setSenhaSalvando(false); setSenhaErro("Não consegui alterar a senha agora. Faça login de novo e tente outra vez."); return; }
    }
    setSenhaSalvando(false); setSenhaOk(true);
    window.setTimeout(() => setSenhaAberta(false), 1300);
  };
  const [focoId, setFocoId] = useState<string | null>(null);
  const focoT = useRef<number | undefined>(undefined);
  const aoFocar = (id: string) => { window.clearTimeout(focoT.current); setFocoId(id); };
  const aoDesfocar = () => { focoT.current = window.setTimeout(() => setFocoId(null), 200); };

  useEffect(() => { setStore(ler()); setCarregado(true); }, []);
  useEffect(() => { if (carregado) salvar(store); }, [store, carregado]);

  // Puxa os usuários REAIS da empresa (dono + colaboradores cadastrados no admin)
  // e preenche o SuperAdmin (nome/e-mail) e os Admins já com nome e e-mail.
  useEffect(() => {
    if (!carregado || !supabaseReady || !supabase) return;
    let vivo = true;
    (async () => {
      try {
        const { data: sess } = await supabase!.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/colaboradores", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;   // só o dono consegue ler; se não for, mantém o que tem
        const { colaboradores } = (await res.json()) as { colaboradores: { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null }[] };
        if (!vivo || !Array.isArray(colaboradores)) return;
        setStore((prev) => {
          const next: Store = { sup: { ...prev.sup }, admins: prev.admins.map((a) => ({ ...a })) };
          const dono = colaboradores.find((c) => c.papel === "dono");
          if (dono) {
            if (!next.sup.nome && dono.nome) next.sup.nome = dono.nome;
            if (dono.email) { next.sup.email = dono.email; next.sup.acesso = dono.email; }
          }
          for (const c of colaboradores.filter((c) => c.papel !== "dono")) {
            const emailL = (c.email || "").toLowerCase();
            const existe = next.admins.find((a) => a.id === c.id
              || (emailL && (a.email || "").toLowerCase() === emailL)
              || (emailL && (a.acesso || "").toLowerCase() === emailL));
            if (existe) {
              if (!existe.nome && c.nome) existe.nome = c.nome;
              if (c.email) { existe.email = c.email; existe.acesso = c.email; }
            } else {
              next.admins.push({ id: c.id, nome: c.nome || "", area: "", acesso: c.email || "", email: c.email || "",
                telefone: "", cpf: "", pix: "", nascimento: "", permissoes: (Array.isArray(c.areas) && c.areas.length ? c.areas : "total") });
            }
          }
          return next;
        });
      } catch { /* ignore */ }
    })();
    return () => { vivo = false; };
  }, [carregado]);

  const setCampoSuper = (patch: Partial<Diretor>) => setStore((s) => ({ ...s, sup: { ...s.sup, ...patch } }));
  const setCampoAdmin = (id: string, patch: Partial<Diretor>) => setStore((s) => ({ ...s, admins: s.admins.map((a) => a.id === id ? { ...a, ...patch } : a) }));
  const removerAdmin = (id: string) => setStore((s) => ({ ...s, admins: s.admins.filter((a) => a.id !== id) }));
  const setPerm = (id: string, permissoes: Perm) => setStore((s) => ({ ...s, admins: s.admins.map((a) => a.id === id ? { ...a, permissoes } : a) }));

  const abrirPerm = (id: string) => { setSelId(id); setPermAberto(true); };

  const Card = ({ d, sup }: { d: Diretor; sup: boolean }) => {
    const set = sup ? setCampoSuper : (p: Partial<Diretor>) => setCampoAdmin(d.id, p);
    const badge = sup ? { txt: "SUPERADMIN", cor: AMBAR, Icon: Crown } : { txt: "ADMIN", cor: AZUL, Icon: Shield };
    return (
      <div className="card diretor-card compacto" style={{ padding: 16, position: "relative" }}>
        {!sup && focoId === d.id && (
          <button title="Excluir" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir(d)}
            style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: VERMELHO }}>
            <Trash2 size={14} />
          </button>
        )}
        {sup && (
          <button onClick={abrirSenha}
            style={{ position: "absolute", top: 14, right: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)" }}>
            <Lock size={14} /> Alterar senha
          </button>
        )}
        {/* cabeçalho: avatar + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingRight: 30 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: `${badge.cor}22`, color: badge.cor, fontWeight: 800, fontSize: 15 }}>
            {iniciais(d.nome) || <badge.Icon size={18} />}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${badge.cor}1f`, color: badge.cor, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "4px 10px", borderRadius: 99 }}>
            <badge.Icon size={12} /> {badge.txt}
          </span>
        </div>

        {/* formulário no mesmo padrão de "Dados da empresa" */}
        <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
          <CampoLabel label="Nome" valor={d.nome} placeholder={sup ? "Seu nome aqui" : "Nome do diretor"} onSalvar={(v, el) => { set({ nome: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="Cargo" valor={d.area} onSalvar={(v, el) => { set({ area: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          {sup
            ? <CampoLabel label="E-mail de acesso" valor={loginEmail || "minhasmetricas@gmail.com"} disabled lock />
            : <CampoLabel label="E-mail de acesso" valor={d.acesso} placeholder="login@empresa.com" validar={emailValido} onInvalido={() => setAviso({ titulo: "E-mail inválido", texto: "O e-mail digitado não parece correto. Use o formato nome@empresa.com." })} onSalvar={(v, el) => { set({ acesso: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />}
        </div>
        <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <CampoLabel label="Telefone" valor={d.telefone} formatar={mascararTelefone} onSalvar={(v, el) => { set({ telefone: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="CPF" valor={d.cpf} formatar={mascararCPF} validar={cpfValido} onInvalido={() => setAviso({ titulo: "CPF inválido", texto: "O CPF digitado não é válido. Confira os números e digite novamente." })} onSalvar={(v, el) => { set({ cpf: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="Data de nascimento" valor={d.nascimento} tipo="date" erroData={errosData[`${d.id}:nasc`]} onErroData={(m) => setErroData(`${d.id}:nasc`, m)} onSalvar={(v, el) => { set({ nascimento: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
        </div>

        {!sup && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 7 }}>Acesso ao menu</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: VERDE, background: "rgba(16,185,129,.12)", padding: "4px 10px", borderRadius: 99 }}>
                <Check size={12} /> {resumoPerm(d.permissoes)}
              </span>
              <button onClick={() => abrirPerm(d.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
                <SlidersHorizontal size={12} /> Permissões
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!carregado) return null;

  const selecionado: Diretor | null = selId === "super" ? store.sup : (store.admins.find((a) => a.id === selId) || null);
  const selTotal = selecionado ? selecionado.permissoes === "total" : true;
  const selMarcadas = selecionado ? chaves(selecionado.permissoes) : TODAS;
  const selLocked = selId === "super";
  const alternar = (k: string) => {
    if (!selecionado || selLocked) return;
    const base = new Set(chaves(selecionado.permissoes));
    if (base.has(k)) base.delete(k); else base.add(k);
    setPerm(selecionado.id, Array.from(base));
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <Card d={store.sup} sup />
        {store.admins.map((a) => <Card key={a.id} d={a} sup={false} />)}
        <button onClick={() => setUpgrade(true)}
          style={{ minHeight: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", borderRadius: 16, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--muted)"; }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><Plus size={20} /></span>
          <b style={{ fontSize: 13 }}>Cadastrar admin</b>
        </button>
      </div>

      {/* modal central: Permissões de acesso */}
      {permAberto && (
        <div onClick={() => setPermAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 640, padding: 20, maxHeight: "88vh", overflow: "auto" }}>
            {/* cabeçalho */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><SlidersHorizontal size={18} /></span>
                <div style={{ lineHeight: 1.25 }}>
                  <b style={{ fontSize: 15 }}>Permissões de acesso</b>
                  <div className="sub" style={{ fontSize: 11.5, fontStyle: "italic" }}>Escolha um diretor e marque o que ele vê no menu.</div>
                </div>
              </div>
              <button onClick={() => setPermAberto(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>

            {/* seletor de diretor */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              {[store.sup, ...store.admins].map((d) => {
                const on = selId === d.id;
                const bloq = d.id === "super";
                const nome1 = (d.nome || (bloq ? "Super" : "Admin")).split(" ")[0];
                return (
                  <button key={d.id} onClick={() => setSelId(d.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "5px 12px 5px 6px", borderRadius: 99, border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--brand) 12%, transparent)" : "transparent", color: on ? "var(--brand)" : "var(--muted)" }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: on ? "var(--brand)" : "var(--bg-2)", color: on ? "#fff" : "var(--muted)", fontSize: 9, fontWeight: 800 }}>{iniciais(d.nome) || "?"}</span>
                    {nome1}{bloq && <Lock size={11} />}
                  </button>
                );
              })}
            </div>

            {/* contador + ações */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "12px 0" }}>
              <span className="sub" style={{ fontSize: 12 }}>{selMarcadas.length} de {TODAS.length} itens liberados</span>
              {!selLocked && (
                <div style={{ display: "flex", gap: 14 }}>
                  <button onClick={() => selecionado && setPerm(selecionado.id, "total")} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "var(--brand)" }}>Marcar tudo</button>
                  <button onClick={() => selecionado && setPerm(selecionado.id, [])} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>Limpar</button>
                </div>
              )}
            </div>

            {selLocked && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: AMBAR, background: "rgba(245,158,11,.12)", padding: "6px 12px", borderRadius: 8, marginBottom: 12 }}><Lock size={13} /> Super Admin tem acesso total fixo.</div>}

            {/* itens agrupados com toggle de olho */}
            {GRUPOS.map((g) => (
              <div key={g.titulo} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8 }}>{g.titulo}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {g.itens.map((it) => {
                    const on = selMarcadas.includes(it.k);
                    return (
                      <button key={it.k} disabled={selLocked} onClick={() => alternar(it.k)}
                        style={{ display: "flex", alignItems: "center", gap: 9, cursor: selLocked ? "default" : "pointer", fontFamily: "inherit", textAlign: "left", padding: "9px 12px", borderRadius: 10, border: `1px solid ${on ? "var(--brand)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--brand) 9%, transparent)" : "transparent", color: on ? "var(--txt)" : "var(--muted)", opacity: selLocked && !on ? 0.5 : 1 }}>
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
              <button className="btn ghost" onClick={() => setPermAberto(false)}>Fechar</button>
              <button className="btn" onClick={() => setPermAberto(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* pop-up: cadastrar admin exige upgrade do plano */}
      {upgrade && (
        <div onClick={() => setUpgrade(false)} style={{ position: "fixed", inset: 0, zIndex: 95, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 26, textAlign: "center", border: `1px solid ${AMBAR}`, background: "linear-gradient(160deg, rgba(245,158,11,.10), var(--card) 60%)" }}>
            <span style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", margin: "0 auto 14px", background: "rgba(245,158,11,.16)", color: AMBAR }}><Crown size={26} /></span>
            <b style={{ fontSize: 17 }}>Cadastrar mais admins é um recurso Pro</b>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.55 }}>Faça o upgrade do seu plano para adicionar novos administradores e definir níveis de acesso para cada um.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setUpgrade(false)}>Agora não</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: AMBAR, color: "#3b2e05" }} onClick={() => { setUpgrade(false); irParaPlano?.(); }}>Planos</button>
            </div>
          </div>
        </div>
      )}

      {/* aviso: CPF ou e-mail inválido */}
      {aviso && (
        <div onClick={() => setAviso(null)} style={{ position: "fixed", inset: 0, zIndex: 95, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24, border: `1px solid ${VERMELHO}`, background: "linear-gradient(160deg, rgba(239,68,68,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.16)", color: VERMELHO, flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>{aviso.titulo}</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{aviso.texto}</p>
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 18 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAviso(null)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {/* pop-up: alterar senha (super admin) */}
      {senhaAberta && (
        <div onClick={() => setSenhaAberta(false)} style={{ position: "fixed", inset: 0, zIndex: 95, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Lock size={19} /></span>
              <div>
                <b style={{ fontSize: 16 }}>Alterar senha</b>
                <p className="sub" style={{ margin: "2px 0 0", fontSize: 12 }}>Acesso: {loginEmail || "minhasmetricas@gmail.com"}</p>
              </div>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">Nova senha</label>
              <input type={verSenha ? "text" : "password"} value={s1} placeholder="Mínimo 6 caracteres" autoFocus
                onChange={(e) => { setS1(e.target.value); setSenhaErro(""); }} />
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label className="f">Confirmar nova senha</label>
              <input type={verSenha ? "text" : "password"} value={s2} placeholder="Digite a senha novamente"
                onChange={(e) => { setS2(e.target.value); setSenhaErro(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") salvarSenha(); }} />
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

      {/* selinho "Salvo" ao lado do campo editado */}
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 96, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* confirmação de exclusão de admin */}
      {aExcluir && (
        <div onClick={() => setAExcluir(null)} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: VERMELHO, flexShrink: 0 }}><Trash2 size={18} /></span>
              <b style={{ fontSize: 15 }}>Excluir admin &ldquo;{aExcluir.nome || "sem nome"}&rdquo;?</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAExcluir(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} onClick={() => { removerAdmin(aExcluir.id); setAExcluir(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
