"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info, CheckCircle2 } from "lucide-react";
import { lerRecebimentos, datasDaDespesa, ocConfirmada, valorDaOcorrencia } from "@/app/minhasmetricas/financas-estrutura";
import { isoParaBR } from "@/lib/format";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const RECEBIDA = "var(--brand)";   // já recebido (confirmado)
const A_RECEBER = "#F59E0B";       // aguardando (a receber)

type Dia = { conf: number; pend: number };

/** Mini-calendário de recebimentos do mês, com marcadores de recebidas e a receber. */
export default function CalendarioRecebimento({ ano }: { ano: number }) {
  const [montado, setMontado] = useState(false);
  const [versao, setVersao] = useState(0);
  const [mes, setMes] = useState(0);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [info, setInfo] = useState<"receb" | "areceber" | null>(null);

  useEffect(() => {
    setMontado(true);
    setMes(new Date().getMonth());
    const h = () => setVersao((v) => v + 1);
    window.addEventListener("me:recebimentos", h);
    return () => window.removeEventListener("me:recebimentos", h);
  }, []);

  // mapa iso -> { confirmado, pendente } para o ano todo
  const mapa = useMemo(() => {
    void versao;
    const m: Record<string, Dia> = {};
    if (montado) {
      for (const p of lerRecebimentos()) {
        for (const o of datasDaDespesa(p, ano)) {
          const alvo = (m[o.iso] ||= { conf: 0, pend: 0 });
          const v = valorDaOcorrencia(p, o, ano);
          if (ocConfirmada(p, o, ano)) alvo.conf += v; else alvo.pend += v;
        }
      }
    }
    return m;
  }, [montado, versao, ano]);

  if (!montado) return null;

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const iso = (d: number) => `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const detalhe = diaSel ? mapa[diaSel] : undefined;

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <b style={{ fontSize: 16 }}>Calendário de recebimento</b>
      <p className="sub" style={{ margin: "6px 0 12px", fontSize: 12.5, lineHeight: 1.5 }}>
        Acompanhe as cobranças recebidas e o que está previsto para receber no mês.
      </p>

      {/* legenda */}
      <div style={{ display: "flex", gap: 18, marginBottom: 12, flexWrap: "wrap" }}>
        <Legenda cor={RECEBIDA} texto="Recebidas" aberto={info === "receb"} onClick={() => setInfo(info === "receb" ? null : "receb")} dica="Cobranças já recebidas (confirmadas no Calendário) naquele dia." />
        <Legenda cor={A_RECEBER} texto="A receber" aberto={info === "areceber"} onClick={() => setInfo(info === "areceber" ? null : "areceber")} dica="Cobranças previstas para aquele dia e ainda não confirmadas." />
      </div>

      {/* navegação de mês */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button className="iconbtn" onClick={() => setMes((m) => Math.max(0, m - 1))} disabled={mes === 0} title="Mês anterior"><ChevronLeft size={18} /></button>
        <b style={{ fontSize: 14 }}>{MES_NOME[mes]} {ano}</b>
        <button className="iconbtn" onClick={() => setMes((m) => Math.min(11, m + 1))} disabled={mes === 11} title="Próximo mês"><ChevronRight size={18} /></button>
      </div>

      {/* grade */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {SEM.map((s) => <div key={s} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", paddingBottom: 6 }}>{s}</div>)}
        {Array.from({ length: primeiroDiaSemana }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => {
          const di = iso(d);
          const info = mapa[di];
          const sel = diaSel === di;
          return (
            <button key={d} onClick={() => setDiaSel(sel ? null : di)}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 10, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                background: sel ? "var(--brand)" : "transparent", color: sel ? "var(--brand-ct,#fff)" : "var(--txt)", display: "grid", placeItems: "center", transition: ".12s" }}
              onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
              {d}
              {info && (info.conf > 0 || info.pend > 0) && (
                <span style={{ position: "absolute", bottom: 6, display: "flex", gap: 3 }}>
                  {info.conf > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: sel ? "var(--brand-ct,#fff)" : RECEBIDA }} />}
                  {info.pend > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: sel ? "var(--brand-ct,#fff)" : A_RECEBER }} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* detalhe do dia selecionado */}
      {diaSel && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--brand)", fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>
            <span style={{ display: "grid", placeItems: "center", width: 18, height: 18 }}>📅</span> {isoParaBR(diaSel)}
          </div>
          {detalhe && (detalhe.conf > 0 || detalhe.pend > 0) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {detalhe.conf > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={20} color={RECEBIDA} />
                  <div><div className="sub" style={{ fontSize: 12 }}>Cobranças recebidas</div><b className="oc-num" style={{ fontSize: 16 }}>{fmt(detalhe.conf)}</b></div>
                </div>
              )}
              {detalhe.pend > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${A_RECEBER}`, display: "grid", placeItems: "center" }} />
                  <div><div className="sub" style={{ fontSize: 12 }}>A receber</div><b className="oc-num" style={{ fontSize: 16, color: A_RECEBER }}>{fmt(detalhe.pend)}</b></div>
                </div>
              )}
            </div>
          ) : <p className="sub" style={{ fontSize: 12.5 }}>Nenhuma cobrança neste dia.</p>}
        </div>
      )}
    </div>
  );
}

function Legenda({ cor, texto, dica, aberto, onClick }: { cor: string; texto: string; dica: string; aberto: boolean; onClick: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, position: "relative" }}>
      <span style={{ width: 10, height: 10, borderRadius: cor === "var(--brand)" ? 2 : "50%", background: cor }} />
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
