"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";

const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
const ANOS = [2026, 2027, 2028];
const BRAND = "#1AADE2", VERDE = "#10B981", AMBAR = "#F59E0B", VERMELHO = "#EF4444";
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtR0 = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const uid = () => Math.random().toString(36).slice(2);

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

type Despesa = { id: string; descricao: string; valor: number; dia: number; mes: number; ano: number; recorrente: boolean; pulados?: number[]; ate?: number };
const KEY = "me_calendario_pagamentos";
function ler(): Despesa[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
const ym = (ano: number, mes: number) => ano * 12 + mes;   // índice absoluto ano-mês

type Ocor = { d: Despesa; venc: Date; mesGer: number };

export default function CalendarioPagamentos({ anoInicial = 2026 }: { anoInicial?: number }) {
  const [ano, setAno] = useState(ANOS.includes(anoInicial) ? anoInicial : 2026);
  const [desps, setDesps] = useState<Despesa[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [modal, setModal] = useState<{ mes: number; dia: number } | null>(null);
  const [form, setForm] = useState<{ editId?: string; descricao: string; valor: string; recorrente: boolean } | null>(null);
  const [hover, setHover] = useState<{ mes: number; dia: number; x: number; y: number } | null>(null);
  const [aExcluir, setAExcluir] = useState<{ d: Despesa; venym: number } | null>(null);

  useEffect(() => { setDesps(ler()); setCarregado(true); }, []);
  useEffect(() => { if (carregado) localStorage.setItem(KEY, JSON.stringify(desps)); }, [desps, carregado]);

  // ocorrências do ano, indexadas por "mes-dia"
  const porDia = useMemo(() => {
    const map: Record<string, Ocor[]> = {};
    for (const d of desps) {
      const meses: number[] = [];
      if (d.recorrente) {
        for (let m = 0; m < 12; m++) {
          const idx = ym(ano, m);
          if (idx < ym(d.ano, d.mes)) continue;                 // antes do início
          if (d.ate != null && idx >= d.ate) continue;          // encerrada a partir de "ate"
          if (d.pulados?.includes(idx)) continue;               // mês pulado
          meses.push(m);
        }
      } else if (d.ano === ano) meses.push(d.mes);
      for (const m of meses) {
        const venc = proxUtil(ano, m, d.dia);
        if (venc.getFullYear() !== ano) continue;
        const k = `${venc.getMonth()}-${venc.getDate()}`;
        (map[k] ||= []).push({ d, venc, mesGer: m });
      }
    }
    return map;
  }, [desps, ano]);

  const totalMes = (m: number) => Object.entries(porDia).reduce((s, [k, arr]) => (Number(k.split("-")[0]) === m ? s + arr.reduce((a, o) => a + o.d.valor, 0) : s), 0);
  const doDia = (m: number, dia: number): Ocor[] => porDia[`${m}-${dia}`] || [];

  if (!carregado) return null;

  const salvarForm = () => {
    if (!form || !form.descricao.trim()) return;
    const valor = Number(form.valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (form.editId) {
      setDesps((xs) => xs.map((x) => x.id === form.editId ? { ...x, descricao: form.descricao.trim(), valor, recorrente: form.recorrente } : x));
    } else if (modal) {
      setDesps((xs) => [...xs, { id: uid(), descricao: form.descricao.trim(), valor, dia: modal.dia, mes: modal.mes, ano, recorrente: form.recorrente }]);
    }
    setForm(null);
  };
  const excluir = (id: string) => setDesps((xs) => xs.filter((x) => x.id !== id));
  const excluirApenasMes = (d: Despesa, venym: number) => { setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, pulados: [...(x.pulados || []), venym] } : x)); setAExcluir(null); };
  const excluirDaqui = (d: Despesa, venym: number) => {
    if (venym <= ym(d.ano, d.mes)) setDesps((xs) => xs.filter((x) => x.id !== d.id));
    else setDesps((xs) => xs.map((x) => x.id === d.id ? { ...x, ate: venym } : x));
    setAExcluir(null);
  };

  return (
    <div>
      {/* seletor de ano + legenda */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "14px 18px", marginBottom: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>Ano</span>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: BRAND, display: "inline-block" }} /> Vencimento</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: AMBAR, display: "inline-block" }} /> Feriado nacional</span>
        </div>
      </div>

      {/* 12 meses */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {MES_NOME.map((nome, m) => (
          <div key={m} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <b style={{ fontSize: 15 }}>{nome}</b>
              <span style={{ fontSize: 13, fontWeight: 800, color: totalMes(m) > 0 ? VERDE : "var(--muted)" }}>{totalMes(m) > 0 ? fmtR0(totalMes(m)) : "–"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {SEM.map((s, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted-2)", paddingBottom: 4 }}>{s}</div>)}
              {Array.from({ length: new Date(ano, m, 1).getDay() }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: new Date(ano, m + 1, 0).getDate() }, (_, i) => i + 1).map((dia) => {
                const dt = new Date(ano, m, dia);
                const fer = nomeFeriado(dt);
                const ocs = doDia(m, dia);
                const temDesp = ocs.length > 0;
                return (
                  <button key={dia} onClick={() => { setForm(null); setHover(null); setModal({ mes: m, dia }); }} title={temDesp ? undefined : (fer || undefined)}
                    onMouseEnter={(e) => { if (temDesp) { const r = e.currentTarget.getBoundingClientRect(); setHover({ mes: m, dia, x: r.left + r.width / 2, y: r.top }); } }}
                    onMouseLeave={() => setHover(null)}
                    style={{ position: "relative", aspectRatio: "1", display: "grid", placeItems: "center", cursor: "pointer", border: 0, fontFamily: "inherit",
                      borderRadius: "50%", background: temDesp ? "rgba(26,173,226,.16)" : "transparent", color: "var(--txt)", fontSize: 11.5, fontWeight: temDesp ? 700 : 500 }}>
                    {dia}
                    {fer && <i style={{ position: "absolute", top: 3, right: 6, width: 5, height: 5, borderRadius: 99, background: AMBAR }} />}
                    {temDesp && <i style={{ position: "absolute", bottom: 2, width: 5, height: 5, borderRadius: 99, background: BRAND }} />}
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
        const total = ocs.reduce((s, o) => s + o.d.valor, 0);
        return (
          <div onClick={() => { setModal(null); setForm(null); }} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>Vencimento</div>
                  <b style={{ fontSize: 17 }}>{modal.dia} de {MES_NOME[modal.mes]} · {ano}</b>
                  {fer && <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: AMBAR }}><i style={{ width: 6, height: 6, borderRadius: 99, background: AMBAR }} /> {fer}</div>}
                </div>
                <button onClick={() => { setModal(null); setForm(null); }} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {ocs.map((o) => (
                  <div key={o.d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-2)", borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: BRAND }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13.5 }}>{o.d.descricao}</b>
                      <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--muted)" }}>{o.d.recorrente ? "Recorrente" : "Única"}</div>
                    </div>
                    <b style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>{fmtR(o.d.valor)}</b>
                    <button title="Editar" onClick={() => setForm({ editId: o.d.id, descricao: o.d.descricao, valor: String(o.d.valor).replace(".", ","), recorrente: o.d.recorrente })}
                      style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={14} /></button>
                    <button title="Excluir" onClick={() => o.d.recorrente ? setAExcluir({ d: o.d, venym: ym(ano, o.mesGer) }) : excluir(o.d.id)} style={{ background: "transparent", border: 0, cursor: "pointer", color: VERMELHO, padding: 2 }}><Trash2 size={14} /></button>
                  </div>
                ))}
                {ocs.length === 0 && !form && <p className="sub" style={{ fontStyle: "italic", fontSize: 12.5 }}>Nenhuma conta neste dia.</p>}
              </div>

              {ocs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>Total do dia</span>
                  <b style={{ fontSize: 15, color: VERDE }}>{fmtR(total)}</b>
                </div>
              )}

              {/* formulário de nova conta / edição */}
              {form ? (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>{form.editId ? "Editar conta" : "Nova conta"}</span>
                    <button onClick={() => setForm(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--brand)", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>cancelar</button>
                  </div>
                  <div className="field"><label className="f">Descrição</label><input autoFocus value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel" /></div>
                  <div className="field"><label className="f">Valor (R$)</label><input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" inputMode="decimal" /></div>
                  <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, margin: "6px 0 14px" }}>
                    <input type="checkbox" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} style={{ width: 17, height: 17 }} />
                    Pagamento recorrente
                    <span className="sub" style={{ fontSize: 11 }}>(repete nos próximos meses, sempre em dia útil)</span>
                  </label>
                  <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={salvarForm} disabled={!form.descricao.trim()}>{form.editId ? "Salvar" : "+ Cadastrar"}</button>
                </div>
              ) : (
                <button onClick={() => setForm({ descricao: "", valor: "", recorrente: false })}
                  style={{ width: "100%", marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--brand)" }}>
                  <Plus size={16} /> Adicionar conta
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
        const total = ocs.reduce((s, o) => s + o.d.valor, 0);
        return (
          <div style={{ position: "fixed", left: hover.x, top: hover.y - 10, transform: "translate(-50%, -100%)", zIndex: 95, pointerEvents: "none",
            background: "#0f172a", color: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)", minWidth: 220, border: "1px solid rgba(148,163,184,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(148,163,184,.2)" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#7c8aa5" }}>Dia {hover.dia}</span>
              <b style={{ fontSize: 13.5, color: "#38BDF8" }}>{fmtR(total)}</b>
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {ocs.map((o) => (
                <div key={o.d.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12.5 }}>
                  <span style={{ color: "#e2e8f0" }}>{o.d.descricao}</span>
                  <b style={{ whiteSpace: "nowrap" }}>{fmtR(o.d.valor)}</b>
                </div>
              ))}
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
              <button className="btn ghost" style={{ justifyContent: "center" }} onClick={() => excluirApenasMes(aExcluir.d, aExcluir.venym)}>Apenas o vencimento deste mês</button>
              <button className="btn" style={{ justifyContent: "center", background: VERMELHO }} onClick={() => excluirDaqui(aExcluir.d, aExcluir.venym)}>Todos a partir deste mês</button>
              <button onClick={() => setAExcluir(null)} style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", padding: "6px 0" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
