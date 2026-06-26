"use client";

import { useEffect, useState } from "react";
import {
  CATALOGO,
  def,
  getIndicadores,
  setIndicador,
  valorMes,
  type Categoria,
} from "@/lib/indicadores";
import { rotuloMes, ultimosMeses } from "@/lib/format";

const NOMES_CATEGORIA: Record<Categoria, string> = {
  financeiro: "Finanças",
  cliente: "Saúde do Cliente",
  comercial: "Comercial",
  marketing: "Marketing",
};

/** Converte texto digitado (aceita vírgula) em número. "" -> null. */
function parseNum(s: string): number | null {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Meta sugerida do mês: %/score usam a meta anual; BRL/count usam /12. */
function metaSugerida(key: string): number {
  const d = def(key);
  if (!d) return 0;
  if (d.unidade === "%" || d.unidade === "score") return Math.round(d.metaAno);
  return Math.round(d.metaAno / 12);
}

type Linha = { valor: string; meta: string };

export default function IndicatorEditor({
  categoria,
  onClose,
  onSaved,
}: {
  categoria: Categoria;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meses = ultimosMeses(12);
  const [period, setPeriod] = useState<string>(ultimosMeses(1)[0]);
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [salvo, setSalvo] = useState(false);

  const indicadores = CATALOGO.filter((d) => d.categoria === categoria);

  // Recarrega valores ao trocar o mês (ou na montagem).
  useEffect(() => {
    let vivo = true;
    (async () => {
      const metrs = await getIndicadores();
      if (!vivo) return;
      const next: Record<string, Linha> = {};
      for (const d of indicadores) {
        const m = valorMes(metrs, d.key, period);
        next[d.key] = { valor: m ? String(m.value) : "", meta: m ? String(m.target) : "" };
      }
      setLinhas(next);
      setSalvo(false);
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, categoria]);

  function atualizar(key: string, campo: keyof Linha, valor: string) {
    setLinhas((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { valor: "", meta: "" }), [campo]: valor },
    }));
  }

  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    for (const d of indicadores) {
      const linha = linhas[d.key];
      if (!linha) continue;
      const value = parseNum(linha.valor);
      if (value === null) continue; // só salva linhas com valor preenchido
      const meta = parseNum(linha.meta);
      await setIndicador(d.key, period, value, meta ?? metaSugerida(d.key));
    }
    setSalvando(false);
    setSalvo(true);
    onSaved();
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button className="close" type="button" aria-label="Fechar" onClick={onClose}>
          ✕
        </button>
        <h2>Editar indicadores — {NOMES_CATEGORIA[categoria]}</h2>
        <p className="sub">
          Aqui você digita o valor real realizado e a meta de cada indicador, mês a mês.
          Selecione o mês e preencha os campos.
        </p>

        {salvo && <div className="ok" style={{ marginTop: 14 }}>✅ Indicadores salvos com sucesso.</div>}

        <div className="field" style={{ marginTop: 16 }}>
          <label className="f" htmlFor="ie-mes">
            Mês de referência
          </label>
          <select
            id="ie-mes"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </select>
        </div>

        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Valor</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map((d) => {
              const linha = linhas[d.key] ?? { valor: "", meta: "" };
              const sugestao = String(metaSugerida(d.key));
              return (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td>
                    <input
                      inputMode="decimal"
                      placeholder="—"
                      value={linha.valor}
                      onChange={(e) => atualizar(d.key, "valor", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      placeholder={sugestao}
                      value={linha.meta}
                      onChange={(e) => atualizar(d.key, "meta", e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <button className="btn ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
