"use client";
import { useEffect, useRef, useState } from "react";
import {
  Shield, Crown, Plus, Trash2, X, Check,
  Eye, EyeOff, Lock, SlidersHorizontal, LayoutDashboard, DollarSign, Megaphone, Sparkles, Compass, Presentation, Settings,
} from "lucide-react";

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
function salvar(s: Store) { if (typeof window !== "undefined") { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event("me:diretores")); } }

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
function CampoLabel({ label, valor, onSalvar, placeholder, tipo, disabled, lock, onFocar, onDesfocar }: {
  label: string; valor: string; onSalvar?: (v: string, el: HTMLElement) => void; placeholder?: string; tipo?: string;
  disabled?: boolean; lock?: boolean; onFocar?: () => void; onDesfocar?: () => void;
}) {
  return (
    <div className="field">
      <label className="f" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{label}{lock && <Lock size={11} style={{ opacity: .6 }} />}</label>
      {disabled
        ? <input value={valor} readOnly title="Definido pelo login, não editável" style={{ opacity: .8, cursor: "default" }} />
        : <input defaultValue={valor} placeholder={placeholder} type={tipo || "text"}
            style={tipo === "date" && !valor ? { color: "#9ca3af" } : undefined}
            onInput={tipo === "date" ? (e) => { e.currentTarget.style.color = e.currentTarget.value ? "" : "#9ca3af"; } : undefined}
            onFocus={() => onFocar?.()}
            onBlur={(e) => { onDesfocar?.(); if (e.target.value !== valor) onSalvar?.(e.target.value, e.currentTarget); }} />}
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
  const [upgrade, setUpgrade] = useState(false);
  const [focoId, setFocoId] = useState<string | null>(null);
  const focoT = useRef<number | undefined>(undefined);
  const aoFocar = (id: string) => { window.clearTimeout(focoT.current); setFocoId(id); };
  const aoDesfocar = () => { focoT.current = window.setTimeout(() => setFocoId(null), 200); };

  useEffect(() => { setStore(ler()); setCarregado(true); }, []);
  useEffect(() => { if (carregado) salvar(store); }, [store, carregado]);

  const setCampoSuper = (patch: Partial<Diretor>) => setStore((s) => ({ ...s, sup: { ...s.sup, ...patch } }));
  const setCampoAdmin = (id: string, patch: Partial<Diretor>) => setStore((s) => ({ ...s, admins: s.admins.map((a) => a.id === id ? { ...a, ...patch } : a) }));
  const removerAdmin = (id: string) => setStore((s) => ({ ...s, admins: s.admins.filter((a) => a.id !== id) }));
  const setPerm = (id: string, permissoes: Perm) => setStore((s) => ({ ...s, admins: s.admins.map((a) => a.id === id ? { ...a, permissoes } : a) }));

  const abrirPerm = (id: string) => { setSelId(id); setPermAberto(true); };

  const Card = ({ d, sup }: { d: Diretor; sup: boolean }) => {
    const set = sup ? setCampoSuper : (p: Partial<Diretor>) => setCampoAdmin(d.id, p);
    const badge = sup ? { txt: "SUPERADMIN", cor: AMBAR, Icon: Crown } : { txt: "ADMIN", cor: AZUL, Icon: Shield };
    return (
      <div className="card diretor-card" style={{ padding: 18, position: "relative" }}>
        {!sup && focoId === d.id && (
          <button title="Excluir" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir(d)}
            style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: VERMELHO }}>
            <Trash2 size={14} />
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
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
          <CampoLabel label="Nome" valor={d.nome} placeholder={sup ? "Seu nome aqui" : "Nome do diretor"} onSalvar={(v, el) => { set({ nome: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="Cargo" valor={d.area} placeholder="Ex: Diretor" onSalvar={(v, el) => { set({ area: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          {sup
            ? <CampoLabel label="E-mail de acesso" valor={loginEmail || "minhasmetricas@gmail.com"} disabled lock />
            : <CampoLabel label="E-mail de acesso" valor={d.acesso} placeholder="login@empresa.com" onSalvar={(v, el) => { set({ acesso: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <CampoLabel label="Telefone" valor={d.telefone} placeholder="(00) 00000-0000" onSalvar={(v, el) => { set({ telefone: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="CPF" valor={d.cpf} placeholder="000.000.000-00" onSalvar={(v, el) => { set({ cpf: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="Chave Pix" valor={d.pix} placeholder="E-mail, telefone ou CPF" onSalvar={(v, el) => { set({ pix: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <CampoLabel label="Data de nascimento" valor={d.nascimento} tipo="date" onSalvar={(v, el) => { set({ nascimento: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <CampoLabel label="Data de admissão" valor={d.admissao || ""} tipo="date" onSalvar={(v, el) => { set({ admissao: v }); salvo(el); }} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
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
