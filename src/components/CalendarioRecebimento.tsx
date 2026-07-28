"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { lerRecebimentos, lerPagamentos, datasDaDespesa, ocConfirmada, valorDaOcorrencia } from "@/app/minhasmetricas/financas-estrutura";
import { isoParaBR } from "@/lib/format";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const REC = "#10B981";   // recebimentos (entra)
const PAG = "#EF4444";   // pagamentos (sai)

type Dia = { recConf: number; recPend: number; pagConf: number; pagPend: number };

/** Mini-calendário financeiro do mês: recebimentos e pagamentos juntos. */
export default function CalendarioRecebimento({ ano }: { ano: number }) {
  const [montado, setMontado] = useState(false);
  const [versao, setVersao] = useState(0);
  const [mes, setMes] = useState(0);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [info, setInfo] = useState<"rec" | "pag" | null>(null);

  useEffect(() => {
    setMontado(true);
    setMes(new Date().getMonth());
    const h = () => setVersao((v) => v + 1);
    window.addEventListener("me:recebimentos", h);
    window.addEventListener("me:pagamentos", h);
    return () => { window.removeEventListener("me:recebimentos", h); window.removeEventListener("me:pagamentos", h); };
  }, []);

  // mapa iso -> valores de recebimentos e pagamentos (confirmado e pendente)
  const mapa = useMemo(() => {
    void versao;
    const m: Record<string, Dia> = {};
    if (montado) {
      for (const p of lerRecebimentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          const alvo = (m[o.iso] ||= { recConf: 0, recPend: 0, pagConf: 0, pagPend: 0 });
          const v = valorDaOcorrencia(p, o, ano);
          if (ocConfirmada(p, o, ano)) alvo.recConf += v; else alvo.recPend += v;
        }
      }
      for (const p of lerPagamentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          const alvo = (m[o.iso] ||= { recConf: 0, recPend: 0, pagConf: 0, pagPend: 0 });
          const v = valorDaOcorrencia(p, o, ano);
          if (ocConfirmada(p, o, ano)) alvo.pagConf += v; else alvo.pagPend += v;
        }
      }
    }
    return m;
  }, [montado, versao, ano]);

  if (!montado) return null;

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const iso = (d: number) => `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const det = diaSel ? mapa[diaSel] : undefined;

  const linhas: { rotulo: string; valor: number; cor: string; cheio: boolean }[] = det ? [
    { rotulo: "Recebido", valor: det.recConf, cor: REC, cheio: true },
    { rotulo: "A receber", valor: det.recPend, cor: REC, cheio: false },
    { rotulo: "Pago", valor: det.pagConf, cor: PAG, cheio: true },
    { rotulo: "A pagar", valor: det.pagPend, cor: PAG, cheio: false },
  ].filter((l) => l.valor > 0) : [];

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <b style={{ fontSize: 16, marginBottom: 12 }}>Calendário financeiro</b>

      {/* legenda */}
      <div style={{ display: "flex", gap: 18, marginBottom: 10, flexWrap: "wrap" }}>
        <Legenda cor={REC} texto="Recebimentos" aberto={info === "rec"} onClick={() => setInfo(info === "rec" ? null : "rec")} dica="Cobranças a receber e já recebidas." />
        <Legenda cor={PAG} texto="Pagamentos" aberto={info === "pag"} onClick={() => setInfo(info === "pag" ? null : "pag")} dica="Contas a pagar e já pagas." />
      </div>

      {/* navegação de mês */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button className="iconbtn" onClick={() => setMes((m) => Math.max(0, m - 1))} disabled={mes === 0} title="Mês anterior"><ChevronLeft size={18} /></button>
        <b style={{ fontSize: 14 }}>{MES_NOME[mes]} {ano}</b>
        <button className="iconbtn" onClick={() => setMes((m) => Math.min(11, m + 1))} disabled={mes === 11} title="Próximo mês"><ChevronRight size={18} /></button>
      </div>

      {/* grade compacta */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {SEM.map((s) => <div key={s} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", paddingBottom: 3 }}>{s}</div>)}
        {Array.from({ length: primeiroDiaSemana }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => {
          const di = iso(d);
          const day = mapa[di];
          const temRec = !!day && (day.recConf > 0 || day.recPend > 0);
          const temPag = !!day && (day.pagConf > 0 || day.pagPend > 0);
          const sel = diaSel === di;
          return (
            <button key={d} onClick={() => setDiaSel(sel ? null : di)}
              style={{ position: "relative", height: 38, borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                background: sel ? "var(--brand)" : "transparent", color: sel ? "var(--brand-ct,#fff)" : "var(--txt)", display: "grid", placeItems: "center", transition: ".12s" }}
              onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
              {d}
              {(temRec || temPag) && (
                <span style={{ position: "absolute", bottom: 4, display: "flex", gap: 3 }}>
                  {temRec && <span style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? "var(--brand-ct,#fff)" : REC }} />}
                  {temPag && <span style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? "var(--brand-ct,#fff)" : PAG }} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* detalhe do dia selecionado */}
      {diaSel && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--brand)", fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>
            📅 {isoParaBR(diaSel)}
          </div>
          {linhas.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {linhas.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: l.cheio ? l.cor : "transparent", border: `2px solid ${l.cor}` }} />
                  <span className="sub" style={{ fontSize: 12.5, flex: 1 }}>{l.rotulo}</span>
                  <b className="oc-num" style={{ fontSize: 15, color: l.cor }}>{fmt(l.valor)}</b>
                </div>
              ))}
            </div>
          ) : <p className="sub" style={{ fontSize: 12.5 }}>Nenhum lançamento neste dia.</p>}
        </div>
      )}
    </div>
  );
}

function Legenda({ cor, texto, dica, aberto, onClick }: { cor: string; texto: string; dica: string; aberto: boolean; onClick: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, position: "relative" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: cor }} />
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{texto}</span>
      <button onClick={onClick} title="Sobre" style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, display: "grid", placeItems: "center", color: aberto ? "var(--brand)" : "var(--muted)" }}><Info size={14} /></button>
      {aberto && (
        <>
          <div onClick={onClick} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
          <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 51, width: 220, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "0 14px 34px -12px rgba(0,0,0,.4)", padding: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--txt)", fontWeight: 400 }}>
            {dica}
          </div>
        </>
      )}
    </div>
  );
}
