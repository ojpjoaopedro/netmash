"use client";
import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Lancamento } from "@/lib/db";
import { brl } from "@/lib/format";

const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function CalendarioPgto({ lancs }: { lancs: Lancamento[] }) {
  const anos = useMemo(() => [...new Set(lancs.map((l) => (l.vencimento || l.data_competencia || "").slice(0, 4)))].filter(Boolean).sort().reverse(), [lancs]);
  const [ano, setAno] = useState(anos[0] || String(new Date().getFullYear()));

  // Mapa: "YYYY-MM-DD" -> valor de despesas com vencimento nesse dia
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lancs) {
      if (l.tipo !== "despesa" || !l.vencimento) continue;
      if (l.vencimento.slice(0, 4) !== ano) continue;
      m.set(l.vencimento.slice(0, 10), (m.get(l.vencimento.slice(0, 10)) || 0) + l.valor);
    }
    return m;
  }, [lancs, ano]);

  const totalMes = (mi: number) => {
    let t = 0;
    for (const [dia, v] of porDia) if (Number(dia.slice(5, 7)) === mi + 1) t += v;
    return t;
  };

  return (
    <>
      <div className="section-title" style={{ gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.18)" }}><CalendarClock size={20} color="var(--accent)" /></span>
          <h2 style={{ margin: 0 }}>Calendário de Pagamentos</h2>
        </div>
        {anos.length > 1 && (
          <select value={ano} onChange={(e) => setAno(e.target.value)} style={{ marginLeft: "auto", background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--txt)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      <div className="grid two" style={{ gap: 14 }}>
        {NOMES_MES.map((nome, mi) => {
          const primeiroDiaSemana = new Date(Number(ano), mi, 1).getDay();
          const diasNoMes = new Date(Number(ano), mi + 1, 0).getDate();
          const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
          const total = totalMes(mi);
          return (
            <div key={mi} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <b style={{ fontSize: 14.5 }}>{nome}</b>
                {total > 0 && <b style={{ color: "var(--green)", fontSize: 13 }}>{brl(total)}</b>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
                {DOW.map((d, i) => <span key={i} className="sub" style={{ fontSize: 9.5, padding: "2px 0" }}>{d}</span>)}
                {celulas.map((dia, i) => {
                  if (dia === null) return <span key={i} />;
                  const iso = `${ano}-${String(mi + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                  const temPgto = porDia.has(iso);
                  return (
                    <span key={i} title={temPgto ? brl(porDia.get(iso)!) : undefined}
                      style={{ fontSize: 11, padding: "4px 0", borderRadius: 7, fontWeight: temPgto ? 800 : 400,
                        color: temPgto ? "#06222e" : "var(--muted)", background: temPgto ? "var(--accent)" : "transparent" }}>{dia}</span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="sub" style={{ fontSize: 12, marginTop: 12 }}>Os dias em destaque têm <b>contas a pagar</b> (despesas) com vencimento. O valor de cada mês é o total a pagar. Cadastre vencimentos em <b>Contas</b> ou <b>Lançamentos</b>.</p>
    </>
  );
}
