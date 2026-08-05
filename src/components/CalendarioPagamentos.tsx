"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, Plus, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import BotaoOcultar from "./ocultar";
import { AnimNum } from "./AnimNum";
import { carregarEstrutura, salvarEstrutura, Bloco, Freq, datasDaDespesa, ocConfirmada, valorDaOcorrencia } from "@/app/minhasmetricas/financas-estrutura";
import { isoParaBR, mascararDataBR, brParaISO } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";

/** Dropdown em árvore igual à Estrutura de Custos: blocos, grupos (bolinha + seta) e itens, com cadastrar. */
export function SeletorCusto({ blocos, grupo, item, onSelecionar, onRenomear }: { blocos: Bloco[]; grupo: string; item: string; onSelecionar: (g: string, i: string) => void; onRenomear?: (grupo: string, antigo: string, novo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const salvarEdicao = (g: string, antigo: string) => { const nv = editNome.trim(); setEditItem(null); if (nv && nv !== antigo) onRenomear?.(g, antigo, nv); };
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number }>({ top: 0, left: 0, maxH: 400 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);
  const toggle = (k: string) => setExpandidos((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const escolher = (g: string, i: string) => { onSelecionar(g, i); setAberto(false); setNovoEm(null); setNovoNome(""); };
  const alternar = () => {
    if (!aberto && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const largura = 300;
      const cabeDireita = window.innerWidth - r.right > largura + 24;
      const left = cabeDireita ? r.right + 14 : Math.max(12, r.left - largura - 14);   // ao lado (direita, ou esquerda se não couber)
      const top = Math.max(12, Math.min(r.top, window.innerHeight - 380));
      setPos({ top, left, maxH: window.innerHeight - top - 16 });
    }
    setAberto((v) => !v);
  };
  return (
    <div ref={ref}>
      <button ref={btnRef} type="button" onClick={alternar}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left", border: "1px solid var(--line-2)", background: "var(--bg-2)", color: item ? "var(--txt)" : "var(--muted)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item ? `${grupo} › ${item}` : "Selecione"}</span>
        <ChevronDown size={15} style={{ flexShrink: 0, color: "var(--muted)", transform: aberto ? "rotate(180deg)" : "none", transition: ".15s" }} />
      </button>
      {aberto && (
        <div style={{ position: "fixed", zIndex: 120, top: pos.top, left: pos.left, width: 300, maxWidth: "calc(100vw - 24px)", maxHeight: pos.maxH, overflowY: "auto", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 18px 44px -12px rgba(0,0,0,.5)", padding: 6 }}>
          {blocos.map((b, bi) => (
            <div key={bi}>
              <div style={{ padding: "8px 8px 4px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)" }}>{b.nome}</div>
              {b.grupos.map((g, gi) => {
                const k = `${bi}-${gi}`; const exp = expandidos.has(k);
                return (
                  <div key={gi}>
                    <button type="button" onClick={() => toggle(k)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 8px", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", borderRadius: 8 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      {exp ? <ChevronDown size={13} style={{ color: "var(--muted)", flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                      <i style={{ width: 8, height: 8, borderRadius: 99, background: g.cor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{g.nome}</span>
                    </button>
                    {exp && (
                      <div style={{ paddingLeft: 26 }}>
                        {g.itens.map((it, ii) => {
                          const ik = `${k}-${ii}`;
                          const selecionado = grupo === g.nome && item === it.nome;
                          if (editItem === ik) {
                            return (
                              <div key={ii} style={{ display: "flex", gap: 6, padding: "3px 4px" }}>
                                <input autoFocus value={editNome} onChange={(e) => setEditNome(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(g.nome, it.nome); if (e.key === "Escape") setEditItem(null); }}
                                  onBlur={() => salvarEdicao(g.nome, it.nome)} style={{ flex: 1, fontSize: 12 }} />
                              </div>
                            );
                          }
                          return (
                            <div key={ii} onMouseEnter={() => setHoverItem(ik)} onMouseLeave={() => setHoverItem(null)}
                              style={{ display: "flex", alignItems: "center", gap: 2, borderRadius: 7, background: selecionado ? "color-mix(in srgb, var(--brand) 14%, transparent)" : (hoverItem === ik ? "var(--bg-2)" : "transparent") }}>
                              <button type="button" onClick={() => escolher(g.nome, it.nome)}
                                style={{ flex: 1, minWidth: 0, textAlign: "left", padding: "5px 8px", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--txt)", background: "transparent", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nome}</button>
                              {onRenomear && hoverItem === ik && (
                                <button type="button" title="Editar nome" onClick={(e) => { e.stopPropagation(); setEditItem(ik); setEditNome(it.nome); }}
                                  style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", padding: "2px 6px", flexShrink: 0 }}><Pencil size={12} /></button>
                              )}
                            </div>
                          );
                        })}
                        {novoEm === k ? (
                          <div style={{ display: "flex", gap: 6, padding: "4px 8px 8px" }}>
                            <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do item"
                              onKeyDown={(e) => { if (e.key === "Enter" && novoNome.trim()) escolher(g.nome, novoNome.trim()); }} style={{ flex: 1 }} />
                            <button type="button" className="btn sm" onClick={() => novoNome.trim() && escolher(g.nome, novoNome.trim())} disabled={!novoNome.trim()}>OK</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setNovoEm(k); setNovoNome(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--brand)", fontWeight: 700, borderRadius: 7 }}>+ cadastrar item em &ldquo;{g.nome}&rdquo;</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Seletor de canal de receita (lista simples, com bolinha e cadastrar), para os recebimentos. */
export function SeletorReceita({ canais, item, onSelecionar, onRenomear }: { canais: { nome: string; cor?: string }[]; item: string; onSelecionar: (i: string) => void; onRenomear?: (antigo: string, novo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [hoverI, setHoverI] = useState<number | null>(null);
  const [editI, setEditI] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number }>({ top: 0, left: 0, maxH: 400 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);
  const escolher = (nome: string) => { onSelecionar(nome); setAberto(false); setNovo(false); setNovoNome(""); };
  const salvarEd = (antigo: string) => { const nv = editNome.trim(); setEditI(null); if (nv && nv !== antigo) onRenomear?.(antigo, nv); };
  const alternar = () => {
    if (!aberto && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const largura = 300;
      const cabeDireita = window.innerWidth - r.right > largura + 24;
      const left = cabeDireita ? r.right + 14 : Math.max(12, r.left - largura - 14);
      const top = Math.max(12, Math.min(r.top, window.innerHeight - 360));
      setPos({ top, left, maxH: window.innerHeight - top - 16 });
    }
    setAberto((v) => !v);
  };
  return (
    <div ref={ref}>
      <button ref={btnRef} type="button" onClick={alternar}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left", border: "1px solid var(--line-2)", background: "var(--bg-2)", color: item ? "var(--txt)" : "var(--muted)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item || "Selecione"}</span>
        <ChevronDown size={15} style={{ flexShrink: 0, color: "var(--muted)", transform: aberto ? "rotate(180deg)" : "none", transition: ".15s" }} />
      </button>
      {aberto && (
        <div style={{ position: "fixed", zIndex: 120, top: pos.top, left: pos.left, width: 300, maxWidth: "calc(100vw - 24px)", maxHeight: pos.maxH, overflowY: "auto", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 18px 44px -12px rgba(0,0,0,.5)", padding: 6 }}>
          <div style={{ padding: "8px 8px 4px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)" }}>Canais de receita</div>
          {canais.map((c, i) => editI === i ? (
            <div key={i} style={{ display: "flex", gap: 6, padding: "3px 4px" }}>
              <input autoFocus value={editNome} onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") salvarEd(c.nome); if (e.key === "Escape") setEditI(null); }}
                onBlur={() => salvarEd(c.nome)} style={{ flex: 1, fontSize: 12 }} />
            </div>
          ) : (
            <div key={i} onMouseEnter={() => setHoverI(i)} onMouseLeave={() => setHoverI(null)}
              style={{ display: "flex", alignItems: "center", gap: 2, borderRadius: 7, background: item === c.nome ? "color-mix(in srgb, var(--brand) 14%, transparent)" : (hoverI === i ? "var(--bg-2)" : "transparent") }}>
              <button type="button" onClick={() => escolher(c.nome)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "6px 8px", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "var(--txt)", background: "transparent" }}>
                <i style={{ width: 8, height: 8, borderRadius: 99, background: c.cor || "#94a3b8", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
              </button>
              {onRenomear && hoverI === i && (
                <button type="button" title="Editar nome" onClick={(e) => { e.stopPropagation(); setEditI(i); setEditNome(c.nome); }}
                  style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", padding: "2px 6px", flexShrink: 0 }}><Pencil size={12} /></button>
              )}
            </div>
          ))}
          {novo ? (
            <div style={{ display: "flex", gap: 6, padding: "4px 8px 8px" }}>
              <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do canal"
                onKeyDown={(e) => { if (e.key === "Enter" && novoNome.trim()) escolher(novoNome.trim()); }} style={{ flex: 1 }} />
              <button type="button" className="btn sm" onClick={() => novoNome.trim() && escolher(novoNome.trim())} disabled={!novoNome.trim()}>OK</button>
            </div>
          ) : (
            <button type="button" onClick={() => { setNovo(true); setNovoNome(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--brand)", fontWeight: 700, borderRadius: 7 }}>+ cadastrar novo canal</button>
          )}
        </div>
      )}
    </div>
  );
}

const FREQ_LABEL: Record<Freq, string> = { unica: "Única", mensal: "Mensal", semanal: "Semanal", diaria_uteis: "Diária (dias úteis)", diaria_todos: "Diária" };
const rotuloFreq = (d: Despesa) => FREQ_LABEL[d.freq || (d.recorrente ? "mensal" : "unica")];

const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
const ANOS = [2026, 2027, 2028];
const BRAND = "#1AADE2", VERDE = "#10B981", AMBAR = "#F59E0B", VERMELHO = "#EF4444";
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtR0 = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const uid = () => Math.random().toString(36).slice(2);
/** Máscara de moeda "conforme digita": os dígitos entram pela direita (centavos) -> 2.000,00 */
function mascaraMoeda(v: string): string {
  const dig = (v || "").replace(/\D/g, "");
  if (!dig) return "";
  return (parseInt(dig, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Páscoa (algoritmo de Meeus/Butcher) para derivar os feriados móveis. */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}
const cacheFer: Record<number, Map<string, string>> = {};
function feriados(ano: number): Map<string, string> {
  if (cacheFer[ano]) return cacheFer[ano];
  const map = new Map<string, string>();
  const fixos: [number, number, string][] = [
    [0, 1, "Confraternização Universal"], [3, 21, "Tiradentes"], [4, 1, "Dia do Trabalho"],
    [8, 7, "Independência"], [9, 12, "N. Sra. Aparecida"], [10, 2, "Finados"],
    [10, 15, "Proclamação da República"], [10, 20, "Consciência Negra"], [11, 25, "Natal"],
  ];
  fixos.forEach(([m, d, n]) => map.set(`${m}-${d}`, n));
  const p = pascoa(ano);
  const rel = (off: number, nome: string) => { const dt = new Date(p); dt.setDate(dt.getDate() + off); map.set(`${dt.getMonth()}-${dt.getDate()}`, nome); };
  rel(-47, "Carnaval"); rel(-2, "Sexta-feira Santa"); rel(60, "Corpus Christi");
  cacheFer[ano] = map;
  return map;
}
const nomeFeriado = (dt: Date) => feriados(dt.getFullYear()).get(`${dt.getMonth()}-${dt.getDate()}`);
const ehFinalDeSemana = (dt: Date) => dt.getDay() === 0 || dt.getDay() === 6;

/** Próximo dia útil (pula fim de semana e feriado). */
function proxUtil(ano: number, mes: number, dia: number): Date {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const dt = new Date(ano, mes, Math.min(dia, ultimo));
  while (ehFinalDeSemana(dt) || nomeFeriado(dt)) dt.setDate(dt.getDate() + 1);
  return dt;
}

type Despesa = { id: string; descricao: string; valor: number; dia: number; mes: number; ano: number; recorrente: boolean; freq?: Freq; pulados?: number[]; ate?: number; puladosDia?: string[]; ateDia?: string; grupo?: string; item?: string;
  confirmados?: number[]; valores?: Record<number, number>; pagoEm?: Record<number, string>;
  confirmadosDia?: string[]; valoresDia?: Record<string, number>; pagoEmDia?: Record<string, string> };
const isoDia = (ano: number, mes: number, dia: number) => `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
const CLARO = "#93c5fd";   // azul bem claro para ocorrências pendentes (a confirmar)
type TipoCal = "pagamentos" | "recebimentos";
type CfgCal = { key: string; evento: string; legenda: string; tituloDia: string; novo: string; editar: string; add: string; ph: string; vazio: string; recorrencia: boolean;
  acaoPagar: string; pago: string; emAberto: string; aConfirmar: string; recorrenteLabel: string; dicaItem: string; itemLabel: string; realizadoLabel: string };
const CFG: Record<TipoCal, CfgCal> = {
  pagamentos: { key: "me_calendario_pagamentos", evento: "me:pagamentos", legenda: "Vencimento", tituloDia: "Vencimento", novo: "Nova conta", editar: "Editar conta", add: "Adicionar conta", ph: "Ex: Aluguel", vazio: "Nenhuma conta neste dia.", recorrencia: true,
    acaoPagar: "Pagar", pago: "Pago", emAberto: "Em aberto", aConfirmar: "A confirmar", recorrenteLabel: "Pagamento recorrente", dicaItem: "Este pagamento entra direto na Estrutura de Custos, no DRE e nos Gráficos, no item escolhido.", itemLabel: "Descrição", realizadoLabel: "Pago" },
  recebimentos: { key: "me_calendario_recebimentos", evento: "me:recebimentos", legenda: "Recebimento", tituloDia: "Recebimento", novo: "Novo recebível", editar: "Editar recebível", add: "Adicionar recebível", ph: "Ex: Cliente X", vazio: "Nenhum recebimento neste dia.", recorrencia: true,
    acaoPagar: "Receber", pago: "Recebido", emAberto: "A receber", aConfirmar: "A receber", recorrenteLabel: "Recebimento recorrente", dicaItem: "Este recebimento entra direto na Composição das Receitas, no DRE e nos Gráficos, no canal escolhido.", itemLabel: "Descrição", realizadoLabel: "Recebido" },
};
function ler(key: string): Despesa[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
const ym = (ano: number, mes: number) => ano * 12 + mes;   // índice absoluto ano-mês

type Ocor = { d: Despesa; venc: Date; mesGer: number; iso: string; confirmado: boolean; valor: number };

export default function CalendarioPagamentos({ anoInicial = 2026, tipo = "pagamentos" }: { anoInicial?: number; tipo?: TipoCal }) {
  const cfg = CFG[tipo];
  const [ano, setAno] = useState(ANOS.includes(anoInicial) ? anoInicial : 2026);
  const [desps, setDesps] = useState<Despesa[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [modal, setModal] = useState<{ mes: number; dia: number } | null>(null);
  const [form, setForm] = useState<{ editId?: string; descricao: string; valor: string; recorrente: boolean; freq: Freq; grupo: string; item: string } | null>(null);
  const [hover, setHover] = useState<{ mes: number; dia: number; x: number; y: number } | null>(null);
  const fecharHoverT = useRef<number | undefined>(undefined);   // atraso para o tooltip não sumir ao levar o mouse até ele
  const [aExcluir, setAExcluir] = useState<{ d: Despesa; venym: number; iso: string; porMes: boolean } | null>(null);
  const [pagar, setPagar] = useState<{ d: Despesa; mesGer: number; iso: string; valor: string; data: string } | null>(null);
  const [baixaPrim, setBaixaPrim] = useState<{ id: string; iso: string; valor: number; item: string; recorrente: boolean } | null>(null);

  useEffect(() => { setDesps(ler(cfg.key)); setCarregado(true); }, [cfg.key]);
  useEffect(() => { if (carregado) { const cru = JSON.stringify(desps); localStorage.setItem(cfg.key, cru); salvarEstadoRemoto(cfg.key, cru); window.dispatchEvent(new Event(cfg.evento)); } }, [desps, carregado, cfg.key, cfg.evento]);

  // blocos de custo (com grupos e itens) para direcionar o pagamento ao lugar certo na Estrutura
  const [estruturaVersao, setEstruturaVersao] = useState(0);
  const custosBlocos = useMemo(() => {
    if (tipo !== "pagamentos") return [];
    const blocos = structuredClone(carregarEstrutura(ano).custos);
    // inclui os itens já criados pelos próprios pagamentos (para reaproveitar na árvore)
    for (const p of desps) {
      if (!p.grupo || !p.item) continue;
      const g = blocos.flatMap((b) => b.grupos).find((x) => x.nome === p.grupo);
      if (g && !g.itens.some((it) => it.nome === p.item)) g.itens.push({ nome: p.item, v: [] });
    }
    return blocos;
  }, [ano, tipo, desps, estruturaVersao]);
  // renomeia um item na Estrutura (pelo lápis do seletor) e mantém os pagamentos ligados
  const renomearItem = (grupo: string, antigo: string, novo: string) => {
    const est = carregarEstrutura(ano);
    const it = est.custos.flatMap((b) => b.grupos).find((x) => x.nome === grupo)?.itens.find((x) => x.nome === antigo);
    if (it) { it.nome = novo; salvarEstrutura(ano, est); window.dispatchEvent(new Event("me:estrutura")); }
    setDesps((xs) => xs.map((x) => (x.grupo === grupo && x.item === antigo) ? { ...x, item: novo, descricao: novo } : x));
    setForm((f) => (f && f.grupo === grupo && f.item === antigo) ? { ...f, item: novo } : f);
    setEstruturaVersao((v) => v + 1);
  };
  // canais de receita (para os recebimentos), com os já criados pelos próprios recebimentos
  const canaisReceita = useMemo(() => {
    if (tipo !== "recebimentos") return [] as { nome: string; cor?: string }[];
    const canais = carregarEstrutura(ano).receitas.map((r) => ({ nome: r.nome, cor: r.cor }));
    for (const p of desps) if (p.item && !canais.some((c) => c.nome === p.item)) canais.push({ nome: p.item, cor: undefined });
    return canais;
  }, [ano, tipo, desps, estruturaVersao]);
  const renomearCanal = (antigo: string, novo: string) => {
    const est = carregarEstrutura(ano);
    const r = est.receitas.find((x) => x.nome === antigo);
    if (r) { r.nome = novo; salvarEstrutura(ano, est); window.dispatchEvent(new Event("me:estrutura")); }
    setDesps((xs) => xs.map((x) => x.item === antigo ? { ...x, item: novo, descricao: novo } : x));
    setForm((f) => (f && f.item === antigo) ? { ...f, item: novo } : f);
    setEstruturaVersao((v) => v + 1);
  };

  // ocorrências do ano, indexadas por "mes-dia" (mensal/semanal/diária conforme a frequência)
  const porDia = useMemo(() => {
    const map: Record<string, Ocor[]> = {};
    for (const d of desps) {
      for (const o of datasDaDespesa(d, ano)) {
        const venc = new Date(ano, o.mes, o.dia);
        const k = `${o.mes}-${o.dia}`;
        (map[k] ||= []).push({ d, venc, mesGer: o.mes, iso: o.iso, confirmado: ocConfirmada(d, o, ano), valor: valorDaOcorrencia(d, o, ano) });
      }
    }
    return map;
  }, [desps, ano]);

  // previsto = soma de tudo (confirmado + pendente); realizado = só o confirmado
  const totalPrevisto = (m: number) => Object.entries(porDia).reduce((s, [k, arr]) => (Number(k.split("-")[0]) === m ? s + arr.reduce((a, o) => a + o.valor, 0) : s), 0);
  const totalRealizado = (m: number) => Object.entries(porDia).reduce((s, [k, arr]) => (Number(k.split("-")[0]) === m ? s + arr.reduce((a, o) => a + (o.confirmado ? o.valor : 0), 0) : s), 0);
  const doDia = (m: number, dia: number): Ocor[] => porDia[`${m}-${dia}`] || [];

  if (!carregado) return null;
  const HOJE = new Date();   // destaque do dia atual (recalcula a cada render/dia)

  // o nome do lançamento vem do item/canal escolhido
  const salvarForm = () => {
    if (!form) return;
    if (tipo === "pagamentos" && (!form.grupo || !form.item.trim())) return;   // grupo e item são obrigatórios
    if (tipo === "recebimentos" && !form.item.trim()) return;                  // canal é obrigatório
    const desc = form.item.trim();
    if (!desc) return;
    const valor = Number(form.valor.replace(/\./g, "").replace(",", ".")) || 0;
    const item = form.item.trim() || undefined;
    const freq: Freq = form.freq;
    const recorrente = freq !== "unica";
    if (form.editId) {
      setDesps((xs) => xs.map((x) => x.id === form.editId ? { ...x, descricao: desc, valor, recorrente, freq, grupo: form.grupo || undefined, item } : x));
    } else if (modal) {
      // nada entra confirmado no cadastro; a confirmação do pagamento/recebimento é feita na 2ª tela (dia)
      const novoId = uid();
      const isoPrim = isoDia(ano, modal.mes, modal.dia);
      setDesps((xs) => [...xs, { id: novoId, descricao: desc, valor, dia: modal.dia, mes: modal.mes, ano, recorrente, freq, grupo: form.grupo || undefined, item,
        confirmados: [], confirmadosDia: [] }]);
      setForm(null);
      setBaixaPrim({ id: novoId, iso: isoPrim, valor, item: desc, recorrente });
      return;
    }
    setForm(null);
  };
  // dar baixa na 1ª parcela (ou no lançamento único) logo após cadastrar
  const confirmarBaixaPrim = () => {
    if (!baixaPrim) return;
    setDesps((xs) => xs.map((x) => x.id === baixaPrim.id ? {
      ...x,
      confirmadosDia: Array.from(new Set([...(x.confirmadosDia || []), baixaPrim.iso])),
    } : x));
    setBaixaPrim(null);
  };
  // pagar: abre o popup para confirmar/ajustar valor e data (por ocorrência)
  const abrirPagar = (o: Ocor) => setPagar({ d: o.d, mesGer: o.mesGer, iso: o.iso, valor: o.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), data: isoParaBR(o.iso) });
  const confirmarPagamento = () => {
    if (!pagar) return;
    const iso = pagar.iso;
    const val = Number(pagar.valor.replace(/\./g, "").replace(",", ".")) || 0;
    const dataISO = brParaISO(pagar.data) || pagar.data;   // guarda em ISO
    setDesps((xs) => xs.map((x) => x.id === pagar.d.id ? {
      ...x,
      confirmadosDia: Array.from(new Set([...(x.confirmadosDia || []), iso])),
      valoresDia: { ...(x.valoresDia || {}), [iso]: val },
      pagoEmDia: { ...(x.pagoEmDia || {}), [iso]: dataISO },
    } : x));
    setPagar(null);
  };
  const excluir = (id: string) => setDesps((xs) => xs.filter((x) => x.id !== id));
  // exclusão do mensal (por mês)
  const excluirApenasMes = (d: Despesa, venym: number) => { setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, pulados: [...(x.pulados || []), venym] } : x)); setAExcluir(null); };
  const excluirDaqui = (d: Despesa, venym: number) => {
    if (venym <= ym(d.ano, d.mes)) setDesps((xs) => xs.filter((x) => x.id !== d.id));
    else setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, ate: venym } : x));
    setAExcluir(null);
  };
  // exclusão do semanal/diária (por dia)
  const excluirApenasDia = (d: Despesa, iso: string) => { setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, puladosDia: [...(x.puladosDia || []), iso] } : x)); setAExcluir(null); };
  const excluirDaquiDia = (d: Despesa, iso: string) => {
    if (iso <= isoDia(d.ano, d.mes, d.dia)) setDesps((xs) => xs.filter((x) => x.id !== d.id));
    else setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, ateDia: iso } : x));
    setAExcluir(null);
  };

  return (
    <div>
      {/* seletor de ano + legenda */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "14px 18px", marginBottom: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        {/* título destacado no centro */}
        <b style={{ flex: "1 1 auto", display: "flex", justifyContent: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap" }}>
            {tipo === "pagamentos" ? "Calendário de Pagamentos" : "Calendário de Recebimentos"}
          </span>
        </b>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: AMBAR, display: "inline-block" }} /> Feriado nacional</span>
          <BotaoOcultar />
        </div>
      </div>

      {/* 12 meses */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
        {MES_NOME.map((nome, m) => (
          <div key={m} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
              <b style={{ fontSize: 15 }}>{nome}</b>
              {totalPrevisto(m) > 0 ? (
                <div style={{ display: "flex", gap: 14, textAlign: "right" }}>
                  <div style={{ lineHeight: 1.15 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--txt)", display: "block" }} className="oc-num"><AnimNum value={totalPrevisto(m)} fmt={fmtR0} /></span>
                    <span style={{ fontSize: 8.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>Previsto</span>
                  </div>
                  <div style={{ lineHeight: 1.15 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: VERDE, display: "block" }} className="oc-num"><AnimNum value={totalRealizado(m)} fmt={fmtR0} /></span>
                    <span style={{ fontSize: 8.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>{cfg.realizadoLabel}</span>
                  </div>
                </div>
              ) : <span style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }} className="oc-num">–</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {SEM.map((s, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted-2)", paddingBottom: 4 }}>{s}</div>)}
              {Array.from({ length: new Date(ano, m, 1).getDay() }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: new Date(ano, m + 1, 0).getDate() }, (_, i) => i + 1).map((dia) => {
                const dt = new Date(ano, m, dia);
                const fer = nomeFeriado(dt);
                const ocs = doDia(m, dia);
                const temDesp = ocs.length > 0;
                const temConfirmado = ocs.some((o) => o.confirmado);
                const soPendente = temDesp && !temConfirmado;   // dia só com pagamentos a confirmar
                const ehHoje = ano === HOJE.getFullYear() && m === HOJE.getMonth() && dia === HOJE.getDate();
                return (
                  <button key={dia} onClick={() => { setForm(null); setHover(null); setModal({ mes: m, dia }); }} title={ehHoje ? "Hoje" : (temDesp ? undefined : (fer || undefined))}
                    onMouseEnter={(e) => { if (temDesp) { window.clearTimeout(fecharHoverT.current); const r = e.currentTarget.getBoundingClientRect(); setHover({ mes: m, dia, x: r.left + r.width / 2, y: r.top }); } }}
                    onMouseMove={(e) => { if (temDesp) { window.clearTimeout(fecharHoverT.current); if (!hover || hover.mes !== m || hover.dia !== dia) { const r = e.currentTarget.getBoundingClientRect(); setHover({ mes: m, dia, x: r.left + r.width / 2, y: r.top }); } } }}
                    onMouseLeave={() => { fecharHoverT.current = window.setTimeout(() => setHover(null), 420); }}
                    style={{ position: "relative", aspectRatio: "1", display: "grid", placeItems: "center", cursor: "pointer", border: 0, fontFamily: "inherit",
                      borderRadius: "50%",
                      background: temDesp ? (soPendente ? "rgba(147,197,253,.22)" : "rgba(26,173,226,.16)") : "transparent",
                      color: "var(--txt)", fontSize: 11.5, fontWeight: ehHoje || temDesp ? 700 : 500 }}>
                    {ehHoje ? <span style={{ borderBottom: "2px solid var(--muted-2)", paddingBottom: 1, lineHeight: 1 }}>{dia}</span> : dia}
                    {fer && <i style={{ position: "absolute", top: 3, right: 6, width: 5, height: 5, borderRadius: 99, background: AMBAR }} />}
                    {temDesp && <i style={{ position: "absolute", bottom: 2, width: 5, height: 5, borderRadius: 99, background: soPendente ? CLARO : BRAND }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* modal do dia */}
      {modal && (() => {
        const ocs = doDia(modal.mes, modal.dia);
        const fer = nomeFeriado(new Date(ano, modal.mes, modal.dia));
        const total = ocs.reduce((s, o) => s + (o.confirmado ? o.valor : 0), 0);   // total = só confirmados
        return (
          <div onClick={() => { setModal(null); setForm(null); }} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                <div>
                  <b style={{ fontSize: 17 }}>{modal.dia} de {MES_NOME[modal.mes]} · {ano}</b>
                  {fer && <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: AMBAR }}><i style={{ width: 6, height: 6, borderRadius: 99, background: AMBAR }} /> {fer}</div>}
                </div>
                <button onClick={() => { setModal(null); setForm(null); }} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {ocs.map((o) => (
                  <div key={o.d.id} style={{ display: "flex", flexDirection: "column", gap: 9, background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px", border: o.confirmado ? "1px solid rgba(16,185,129,.35)" : "1px solid var(--line-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: o.confirmado ? VERDE : CLARO }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5, color: o.confirmado ? undefined : CLARO }}>{o.d.descricao}</b>
                        <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--muted)" }}>
                          {rotuloFreq(o.d)}{o.d.item ? ` · ${o.d.grupo ? `${o.d.grupo} › ` : ""}${o.d.item}` : (o.d.grupo ? ` · ${o.d.grupo}` : "")}
                        </div>
                      </div>
                      <b className="oc-num" style={{ fontSize: 13.5, whiteSpace: "nowrap", color: o.confirmado ? undefined : CLARO }}>{fmtR(o.valor)}</b>
                      <button title="Editar" onClick={() => setForm({ editId: o.d.id, descricao: o.d.descricao, valor: o.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), recorrente: o.d.recorrente, freq: o.d.freq || (o.d.recorrente ? "mensal" : "unica"), grupo: o.d.grupo || "", item: o.d.item || "" })}
                        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={14} /></button>
                      <button title="Excluir" onClick={() => o.d.recorrente ? setAExcluir({ d: o.d, venym: ym(ano, o.mesGer), iso: o.iso, porMes: (o.d.freq || "mensal") === "mensal" }) : excluir(o.d.id)} style={{ background: "transparent", border: 0, cursor: "pointer", color: VERMELHO, padding: 2 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {o.confirmado
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, color: VERDE, background: "rgba(16,185,129,.14)", padding: "3px 10px", borderRadius: 99 }}><Check size={13} /> {cfg.pago}</span>
                        : <span style={{ fontSize: 11.5, fontWeight: 800, color: "#94a3b8", background: "rgba(148,163,184,.14)", padding: "3px 10px", borderRadius: 99 }}>{cfg.emAberto}</span>}
                      {!o.confirmado && (
                        <button onClick={() => abrirPagar(o)} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12.5, padding: "7px 14px", borderRadius: 9, border: 0, background: VERDE, color: "#fff" }}><Check size={16} /> {cfg.acaoPagar}</button>
                      )}
                    </div>
                  </div>
                ))}
                {ocs.length === 0 && !form && <p className="sub" style={{ fontStyle: "italic", fontSize: 12.5 }}>{cfg.vazio}</p>}
              </div>

              {ocs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>Total do dia</span>
                  <b className="oc-num" style={{ fontSize: 15, color: VERDE }}>{fmtR(total)}</b>
                </div>
              )}

              {/* formulário de nova conta / edição */}
              {form ? (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <div className="field">
                    <label className="f" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {cfg.itemLabel}
                      <span title={cfg.dicaItem}
                        style={{ display: "inline-grid", placeItems: "center", width: 15, height: 15, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--muted)", fontSize: 10, fontWeight: 800, cursor: "help" }}>?</span>
                    </label>
                    {tipo === "pagamentos"
                      ? <SeletorCusto blocos={custosBlocos} grupo={form.grupo} item={form.item} onSelecionar={(g, i) => setForm({ ...form, grupo: g, item: i })} onRenomear={renomearItem} />
                      : <SeletorReceita canais={canaisReceita} item={form.item} onSelecionar={(i) => setForm({ ...form, grupo: "", item: i })} onRenomear={renomearCanal} />}
                  </div>
                  <div className="field"><label className="f">Valor (R$)</label><input value={form.valor} onChange={(e) => setForm({ ...form, valor: mascaraMoeda(e.target.value) })} placeholder="0,00" inputMode="decimal" /></div>
                  <div className="field">
                    <label className="f">Recorrência</label>
                    <select value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value as Freq, recorrente: e.target.value !== "unica" })}>
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="diaria_todos">Diária, todos os dias da semana</option>
                      <option value="diaria_uteis">Diária, apenas em dias úteis</option>
                      <option value="unica">Não recorrente (só neste dia)</option>
                    </select>
                  </div>
                  <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={salvarForm} disabled={tipo === "pagamentos" ? (!form.grupo || !form.item.trim()) : !form.item.trim()}>{form.editId ? "Salvar" : "+ Cadastrar"}</button>
                </div>
              ) : (
                <button onClick={() => setForm({ descricao: "", valor: "", recorrente: true, freq: "mensal", grupo: "", item: "" })}
                  style={{ width: "100%", marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--brand)" }}>
                  <Plus size={16} /> {cfg.add}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* tooltip ao passar o mouse sobre um dia com vencimento */}
      {hover && !modal && (() => {
        const ocs = doDia(hover.mes, hover.dia);
        if (!ocs.length) return null;
        const total = ocs.reduce((s, o) => s + (o.confirmado ? o.valor : 0), 0);   // total = só confirmados
        return (
          <div onMouseEnter={() => window.clearTimeout(fecharHoverT.current)} onMouseLeave={() => { fecharHoverT.current = window.setTimeout(() => setHover(null), 200); }}
            style={{ position: "fixed", left: hover.x, top: hover.y, transform: "translate(-50%, -100%)", zIndex: 95, paddingBottom: 12,
            background: "#0f172a", color: "#fff", borderRadius: 12, boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)", minWidth: 250, maxWidth: "calc(100vw - 24px)", border: "1px solid rgba(148,163,184,.2)" }}>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(148,163,184,.2)" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#7c8aa5" }}>Dia {hover.dia}</span>
                <b className="oc-num" style={{ fontSize: 13.5, color: "#38BDF8" }}>{fmtR(total)}</b>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {ocs.map((o) => (
                  <div key={o.d.id} style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12.5 }}>
                      <span style={{ color: o.confirmado ? "#e2e8f0" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.d.descricao}</span>
                      <b className="oc-num" style={{ whiteSpace: "nowrap", color: o.confirmado ? "#fff" : "#94a3b8", fontWeight: o.confirmado ? 700 : 500 }}>{fmtR(o.valor)}</b>
                    </div>
                    {o.confirmado
                      ? <span style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#34d399", background: "rgba(16,185,129,.18)", padding: "3px 10px", borderRadius: 99 }}><Check size={12} /> {cfg.pago}</span>
                      : <button onClick={() => abrirPagar(o)} style={{ justifySelf: "stretch", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12, padding: "6px 12px", borderRadius: 8, border: 0, background: "#10B981", color: "#fff" }}><Check size={15} /> {cfg.acaoPagar}</button>}
                    <button onClick={() => { setHover(null); o.d.recorrente ? setAExcluir({ d: o.d, venym: ym(ano, o.mesGer), iso: o.iso, porMes: (o.d.freq || "mensal") === "mensal" }) : excluir(o.d.id); }}
                      style={{ justifySelf: "stretch", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11.5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,.5)", background: "transparent", color: "#f87171" }}>
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* confirmação de exclusão de recorrente */}
      {aExcluir && (
        <div onClick={() => setAExcluir(null)} style={{ position: "fixed", inset: 0, zIndex: 95, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: VERMELHO, flexShrink: 0 }}><Trash2 size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Excluir &ldquo;{aExcluir.d.descricao}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Esta é uma conta recorrente. O que você quer excluir?</p>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
              {aExcluir.porMes ? (
                <>
                  <button className="btn ghost" style={{ justifyContent: "center" }} onClick={() => excluirApenasMes(aExcluir.d, aExcluir.venym)}>Apenas deste mês</button>
                  <button className="btn" style={{ justifyContent: "center", background: VERMELHO }} onClick={() => excluirDaqui(aExcluir.d, aExcluir.venym)}>Todos a partir deste mês</button>
                </>
              ) : (
                <>
                  <button className="btn ghost" style={{ justifyContent: "center" }} onClick={() => excluirApenasDia(aExcluir.d, aExcluir.iso)}>Apenas deste dia</button>
                  <button className="btn" style={{ justifyContent: "center", background: VERMELHO }} onClick={() => excluirDaquiDia(aExcluir.d, aExcluir.iso)}>Todos a partir deste dia</button>
                </>
              )}
              <button onClick={() => setAExcluir(null)} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", padding: "6px 0" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* popup de pagamento: confirma e permite ajustar valor e data */}
      {pagar && (
        <div onClick={() => setPagar(null)} style={{ position: "fixed", inset: 0, zIndex: 96, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24, border: `1px solid ${VERDE}`, background: "linear-gradient(160deg, rgba(16,185,129,.08), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: VERDE, color: "#fff", flexShrink: 0 }}><Check size={22} strokeWidth={3} /></span>
              <div>
                <b style={{ fontSize: 16 }}>{tipo === "recebimentos" ? "Confirmar recebimento" : "Confirmar pagamento"}</b>
                <p className="sub" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{pagar.d.descricao}</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">{tipo === "recebimentos" ? "Valor recebido (R$)" : "Valor pago (R$)"}</label>
              <input value={pagar.valor} onChange={(e) => setPagar({ ...pagar, valor: mascaraMoeda(e.target.value) })} inputMode="decimal" />
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label className="f">{tipo === "recebimentos" ? "Data do recebimento" : "Data do pagamento"}</label>
              <input value={pagar.data} onChange={(e) => setPagar({ ...pagar, data: mascararDataBR(e.target.value) })} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} />
            </div>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 8 }}>Ao confirmar, este valor entra na {tipo === "recebimentos" ? "Composição das Receitas" : "Estrutura de Custos"}, no DRE e nos Gráficos.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPagar(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERDE }} onClick={confirmarPagamento}><Check size={15} /> {tipo === "recebimentos" ? "Confirmar recebimento" : "Confirmar pagamento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* dar baixa na 1ª parcela logo após cadastrar uma conta recorrente */}
      {baixaPrim && (
        <div onClick={() => setBaixaPrim(null)} style={{ position: "fixed", inset: 0, zIndex: 97, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24, border: `1px solid ${VERDE}`, background: "linear-gradient(160deg, rgba(16,185,129,.08), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: VERDE, color: "#fff", flexShrink: 0 }}><Check size={22} strokeWidth={3} /></span>
              <div>
                <b style={{ fontSize: 16 }}>{tipo === "recebimentos" ? (baixaPrim.recorrente ? "Já recebeu a primeira?" : "Já recebeu?") : (baixaPrim.recorrente ? "Já pagou a primeira?" : "Já pagou?")}</b>
                <p className="sub" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{baixaPrim.item} · {fmtR(baixaPrim.valor)} · {isoParaBR(baixaPrim.iso)}</p>
              </div>
            </div>
            <p className="sub" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>{baixaPrim.recorrente ? "Conta cadastrada. Quer dar baixa na primeira parcela agora? As próximas você confirma na data de cada uma." : "Lançamento cadastrado. Quer dar baixa agora? Você também pode confirmar depois, na data."}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setBaixaPrim(null)}>Agora não</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERDE }} onClick={confirmarBaixaPrim}><Check size={15} /> {tipo === "recebimentos" ? "Confirmar recebimento" : "Confirmar pagamento"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
