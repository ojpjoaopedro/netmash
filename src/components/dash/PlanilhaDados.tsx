"use client";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { CATALOGO, def, getIndicadores, setIndicador, valorMes, type Categoria } from "@/lib/indicadores";
import { playSuccess } from "@/lib/ui-sound";
import { SecHead } from "./Kit";

const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CATS: { k: Categoria; label: string; cor: string }[] = [
  { k: "financeiro", label: "Finanças", cor: "#10B981" },
  { k: "comercial", label: "Comercial", cor: "#1AADE2" },
  { k: "marketing", label: "Marketing", cor: "#8b5cf6" },
];

function parseNum(s: string): number | null {
  const t = (s || "").trim().replace(/\./g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function metaSugerida(key: string): number {
  const d = def(key);
  if (!d) return 0;
  return d.unidade === "%" || d.unidade === "score" ? Math.round(d.metaAno) : Math.round(d.metaAno / 12);
}

export default function PlanilhaDados({ reload }: { reload?: () => void }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const [cat, setCat] = useState<Categoria>("financeiro");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const inds = CATALOGO.filter((d) => d.categoria === cat);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    (async () => {
      const metrs = await getIndicadores();
      if (!vivo) return;
      const v: Record<string, string> = {}, t: Record<string, number> = {};
      for (const d of inds) for (const m of meses) {
        const cell = valorMes(metrs, d.key, m);
        if (cell) { v[`${d.key}|${m}`] = String(cell.value); t[`${d.key}|${m}`] = cell.target; }
      }
      setVals(v); setTargets(t); setSalvo(false); setCarregando(false);
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  function set(key: string, m: string, valor: string) {
    setVals((prev) => ({ ...prev, [`${key}|${m}`]: valor }));
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    for (const d of inds) for (const m of meses) {
      const n = parseNum(vals[`${d.key}|${m}`]);
      if (n === null) continue;
      const meta = targets[`${d.key}|${m}`] ?? metaSugerida(d.key);
      await setIndicador(d.key, m, n, meta);
    }
    setSalvando(false); setSalvo(true); playSuccess(); reload?.();
    setTimeout(() => setSalvo(false), 2500);
  }

  const totalLinha = (key: string, agg?: string) => {
    const nums = meses.map((m) => parseNum(vals[`${key}|${m}`])).filter((x): x is number => x !== null);
    if (!nums.length) return "";
    if (agg === "last") return nums[nums.length - 1];
    return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
  };

  return (
    <>
      <SecHead icon="BarChart3" titulo="Planilha de dados" sub="Digite os números mês a mês — igual a uma planilha" cor="#10B981" />

      {/* Abas de categoria */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {CATS.map((c) => {
          const at = cat === c.k;
          return <button key={c.k} onClick={() => setCat(c.k)}
            style={{ background: at ? c.cor : "var(--card)", color: at ? "#fff" : "var(--txt)", border: at ? `1px solid ${c.cor}` : "1px solid var(--line-2)", borderRadius: 99, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{c.label}</button>;
        })}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {carregando ? (
          <div style={{ padding: 30, textAlign: "center" }}><Loader2 size={22} className="spin" /></div>
        ) : (
          <table className="table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, background: "var(--card)", zIndex: 1, minWidth: 150 }}>Indicador</th>
                {MES3.map((m) => <th key={m} className="num" style={{ minWidth: 74 }}>{m}</th>)}
                <th className="num" style={{ minWidth: 90 }}>Total/Últ.</th>
              </tr>
            </thead>
            <tbody>
              {inds.map((d) => (
                <tr key={d.key}>
                  <td style={{ position: "sticky", left: 0, background: "var(--card)", zIndex: 1, fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: d.cor, flexShrink: 0 }} />{d.label}</span>
                  </td>
                  {meses.map((m) => (
                    <td key={m} style={{ padding: 3 }}>
                      <input inputMode="decimal" placeholder="–" value={vals[`${d.key}|${m}`] ?? ""} onChange={(e) => set(d.key, m, e.target.value)}
                        style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 7, padding: "6px 6px", fontSize: 12.5, fontFamily: "inherit", textAlign: "right" }} />
                    </td>
                  ))}
                  <td className="num mono" style={{ fontWeight: 700, color: d.cor }}>{totalLinha(d.key, d.agg) !== "" ? totalLinha(d.key, d.agg) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="btn" onClick={salvar} disabled={salvando}>{salvando ? <><Loader2 size={14} className="spin" /> Salvando…</> : <><Check size={14} /> Salvar planilha</>}</button>
        {salvo && <span style={{ color: "#10B981", fontWeight: 700, fontSize: 13 }}>✅ Dados salvos!</span>}
      </div>
      <p className="sub" style={{ marginTop: 10, fontSize: 12 }}>Dica: em Finanças, <b>Faturamento</b> e <b>Custos</b> também se preenchem sozinhos a partir dos seus <b>Lançamentos</b>. Se um mês tem lançamentos, eles têm prioridade sobre o valor digitado aqui.</p>
    </>
  );
}
