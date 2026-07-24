"use client";
import { useEffect, useRef, useState } from "react";
import {
  Shield, ShieldCheck, Crown, Phone, CreditCard, KeyRound, Cake, Plus, Trash2, X, Check,
  Eye, EyeOff, Lock, SlidersHorizontal, Send, LayoutDashboard, DollarSign, Megaphone, Sparkles, Compass, Presentation, Settings,
} from "lucide-react";
import { Funcionario, Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import BotaoRelatorioEquipe from "./RelatorioEquipe";

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
  telefone: string; cpf: string; pix: string; nascimento: string; permissoes: Perm;
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
function salvar(s: Store) { if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s)); }

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
function Campo({ valor, onSalvar, placeholder, tipo, style, onFocar, onDesfocar }: {
  valor: string; onSalvar: (v: string) => void; placeholder?: string; tipo?: string;
  style?: React.CSSProperties; onFocar?: () => void; onDesfocar?: () => void;
}) {
  return (
    <input defaultValue={valor} placeholder={placeholder} type={tipo || "text"}
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; onFocar?.(); }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; onDesfocar?.(); if (e.target.value !== valor) onSalvar(e.target.value); }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", ...style }} />
  );
}

function Linha({ icone, prefixo, valor, placeholder, tipo, onSalvar, onFocar, onDesfocar }: {
  icone: React.ReactNode; prefixo?: string; valor: string; placeholder?: string; tipo?: string;
  onSalvar: (v: string) => void; onFocar?: () => void; onDesfocar?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", minWidth: 0 }}>
      <span style={{ flexShrink: 0, display: "grid", placeItems: "center", color: "var(--brand)" }}>{icone}</span>
      {prefixo && <span style={{ flexShrink: 0 }}>{prefixo}</span>}
      <Campo valor={valor} placeholder={placeholder} tipo={tipo} onSalvar={onSalvar} onFocar={onFocar} onDesfocar={onDesfocar} style={{ fontSize: 12.5 }} />
    </div>
  );
}

export default function Diretores({ funcs = [], empresa = null, brand, loginEmail = "" }: { funcs?: Funcionario[]; empresa?: Empresa | null; brand?: Brand; loginEmail?: string }) {
  const [store, setStore] = useState<Store>({ sup: { ...SUPER_PADRAO }, admins: [] });
  const [carregado, setCarregado] = useState(false);
  const [permAberto, setPermAberto] = useState(false);
  const [selId, setSelId] = useState<string>("super");
  const [aExcluir, setAExcluir] = useState<Diretor | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<number | undefined>(undefined);
  const reenviar = (d: Diretor) => {
    const alvo = (d.acesso || d.email).trim();
    setToast(alvo ? `Acesso ao Minhas Métricas reenviado para ${alvo}` : "Preencha o e-mail de acesso primeiro.");
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 3000);
  };
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
      <div className="card diretor-card" style={{ padding: 16, position: "relative" }}>
        {!sup && focoId === d.id && (
          <button title="Excluir" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir(d)}
            style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: VERMELHO }}>
            <Trash2 size={13} />
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 24 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: `${badge.cor}22`, color: badge.cor, fontWeight: 800, fontSize: 15 }}>
            {iniciais(d.nome) || <badge.Icon size={18} />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Campo valor={d.nome} placeholder={sup ? "Seu nome aqui" : "Nome do diretor"} onSalvar={(v) => set({ nome: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} style={{ fontSize: 15, fontWeight: 700 }} />
            <span style={{ marginTop: 4, marginLeft: 5, display: "inline-flex", alignItems: "center", gap: 4, background: `${badge.cor}1f`, color: badge.cor, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "3px 8px", borderRadius: 99 }}>
              <badge.Icon size={11} /> {badge.txt}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
          {sup ? (
            // e-mail de acesso do Super Admin: já conhecido pelo login, não editável
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", minWidth: 0 }} title="E-mail de acesso (definido pelo login, não editável)">
              <span style={{ flexShrink: 0, display: "grid", placeItems: "center", color: "var(--brand)" }}><ShieldCheck size={13} /></span>
              <span>Acesso</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--txt)" }}>{loginEmail || "minhasmetricas@gmail.com"}</span>
              <Lock size={11} style={{ flexShrink: 0, opacity: .6 }} />
            </div>
          ) : (
            <Linha icone={<ShieldCheck size={13} />} prefixo="Acesso" valor={d.acesso} placeholder="login@empresa.com" onSalvar={(v) => set({ acesso: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          )}
          <Linha icone={<Phone size={13} />} valor={d.telefone} placeholder="Telefone" onSalvar={(v) => set({ telefone: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <Linha icone={<CreditCard size={13} />} prefixo="CPF" valor={d.cpf} placeholder="000.000.000-00" onSalvar={(v) => set({ cpf: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <Linha icone={<KeyRound size={13} />} prefixo="Pix" valor={d.pix} placeholder="chave" onSalvar={(v) => set({ pix: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
          <Linha icone={<Cake size={13} />} prefixo="Nasc." valor={d.nascimento} tipo="date" onSalvar={(v) => set({ nascimento: v })} onFocar={() => aoFocar(d.id)} onDesfocar={aoDesfocar} />
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)", display: "grid", gap: 10 }}>
          {!sup && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 7 }}>Acesso ao menu</div>
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
          <button onClick={() => reenviar(d)} title="Reenviar o acesso ao Minhas Métricas por e-mail"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line-2)", background: "color-mix(in srgb, var(--brand) 8%, transparent)", color: "var(--brand)" }}>
            <Send size={13} /> Reenviar acesso por e-mail
          </button>
        </div>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><Shield size={19} /></span>
          <h2 style={{ margin: 0, fontSize: 19 }}>Diretores</h2>
        </div>
        <BotaoRelatorioEquipe
          funcs={funcs} empresa={empresa}
          brand={brand ?? { nome: "Minha Empresa", logo: null, cor: "#1AADE2", saudacao: "", logoTamanho: 40 }}
          diretores={[store.sup, ...store.admins].filter((d) => d.nome.trim()).map((d) => ({
            nome: d.nome, cargo: "Diretor", area: d.area,
            email: d.email, telefone: d.telefone, cpf: d.cpf, pix: d.pix, nascimento: d.nascimento,
          }))} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        <Card d={store.sup} sup />
        {store.admins.map((a) => <Card key={a.id} d={a} sup={false} />)}
        <button onClick={() => setUpgrade(true)}
          style={{ minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", borderRadius: 16, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".15s" }}
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
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}>{g.titulo}</div>
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
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: AMBAR, color: "#3b2e05" }} onClick={() => setUpgrade(false)}>Fazer upgrade</button>
            </div>
          </div>
        </div>
      )}

      {/* aviso de reenvio de acesso */}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 95, display: "inline-flex", alignItems: "center", gap: 8, background: "#1e293b", color: "#fff", padding: "10px 16px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)", fontSize: 13, fontWeight: 600 }}>
          <Send size={15} style={{ color: "#38BDF8" }} /> {toast}
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
