"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { addLancamentosLote, Tipo } from "@/lib/db";
import { brl, hoje } from "@/lib/format";

type Linha = Record<string, unknown>;
type Mapa = { descricao: string; valor: string; data: string; tipo: string; categoria: string; contato: string };

const ALVOS: { key: keyof Mapa; label: string; dicas: string[] }[] = [
  { key: "descricao", label: "Descrição", dicas: ["desc", "histor", "lançamento", "lancamento", "nome", "item"] },
  { key: "valor", label: "Valor", dicas: ["valor", "preço", "preco", "total", "r$", "amount"] },
  { key: "data", label: "Data", dicas: ["data", "venc", "compet" , "date", "dia"] },
  { key: "tipo", label: "Tipo (receita/despesa)", dicas: ["tipo", "natureza", "entrada", "saída", "saida", "d/c"] },
  { key: "categoria", label: "Categoria", dicas: ["categ", "classific", "grupo", "plano"] },
  { key: "contato", label: "Cliente/Fornecedor", dicas: ["cliente", "fornecedor", "contato", "razão", "razao", "favorecido"] },
];

function parseValor(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "");
  // formato brasileiro 1.234,56
  if (s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")) {
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(s) || 0;
}

function parseData(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // serial do Excel
    const d = XLSX.SSF ? new Date(Math.round((v - 25569) * 86400 * 1000)) : new Date();
    return d.toISOString().slice(0, 10);
  }
  const s = String(v || "").trim();
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const yyyy = y.length === 2 ? "20" + y : y;
    return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0, 10);
  return hoje();
}

function adivinhar(headers: string[], dicas: string[]): string {
  const h = headers.find((x) => dicas.some((d) => x.toLowerCase().includes(d)));
  return h || "";
}

export default function Importar({ reload }: { reload: () => void }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapa, setMapa] = useState<Mapa>({ descricao: "", valor: "", data: "", tipo: "", categoria: "", contato: "" });
  const [tipoPadrao, setTipoPadrao] = useState<Tipo>("despesa");
  const [modoTipo, setModoTipo] = useState<"coluna" | "sinal" | "fixo">("fixo");
  const [pago, setPago] = useState(true);
  const [nomeArq, setNomeArq] = useState("");
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [importando, setImportando] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(""); setOkMsg("");
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArq(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Linha>(ws, { defval: "" });
      if (!json.length) { setErro("A planilha parece vazia."); return; }
      const hs = Object.keys(json[0]);
      setHeaders(hs);
      setLinhas(json);
      setMapa({
        descricao: adivinhar(hs, ALVOS[0].dicas),
        valor: adivinhar(hs, ALVOS[1].dicas),
        data: adivinhar(hs, ALVOS[2].dicas),
        tipo: adivinhar(hs, ALVOS[3].dicas),
        categoria: adivinhar(hs, ALVOS[4].dicas),
        contato: adivinhar(hs, ALVOS[5].dicas),
      });
      setModoTipo(adivinhar(hs, ALVOS[3].dicas) ? "coluna" : "fixo");
    } catch {
      setErro("Não consegui ler o arquivo. Use Excel (.xlsx) ou CSV.");
    }
  }

  function montarLancamentos() {
    return linhas.map((row) => {
      const valorBruto = parseValor(row[mapa.valor]);
      let tipo: Tipo = tipoPadrao;
      if (modoTipo === "coluna" && mapa.tipo) {
        const t = String(row[mapa.tipo] || "").toLowerCase();
        tipo = /rec|entr|crédito|credito|^c$|recebi/.test(t) ? "receita" : "despesa";
      } else if (modoTipo === "sinal") {
        tipo = valorBruto < 0 ? "despesa" : "receita";
      }
      const data = mapa.data ? parseData(row[mapa.data]) : hoje();
      return {
        tipo,
        descricao: String(row[mapa.descricao] || "Importado").slice(0, 200) || "Importado",
        categoria: mapa.categoria ? String(row[mapa.categoria] || "") || null : null,
        valor: Math.abs(valorBruto),
        data_competencia: data,
        vencimento: data,
        pago,
        data_pagamento: pago ? data : null,
        forma: null,
        contato: mapa.contato ? String(row[mapa.contato] || "") || null : null,
        origem: "planilha",
      };
    }).filter((l) => l.valor > 0);
  }

  const previa = mapa.descricao && mapa.valor ? montarLancamentos().slice(0, 5) : [];
  const totalValido = mapa.descricao && mapa.valor ? montarLancamentos().length : 0;

  async function importar() {
    setImportando(true); setErro(""); setOkMsg("");
    const lotes = montarLancamentos();
    if (!lotes.length) { setErro("Nenhuma linha válida (verifique a coluna de Valor)."); setImportando(false); return; }
    await addLancamentosLote(lotes);
    setImportando(false);
    setOkMsg(`✅ ${lotes.length} lançamento(s) importado(s) com sucesso!`);
    setLinhas([]); setHeaders([]); setNomeArq("");
    reload();
  }

  function baixarModelo() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Descrição", "Tipo", "Categoria", "Cliente/Fornecedor", "Valor"],
      [hoje(), "Venda de produto", "receita", "Vendas", "Cliente A", 1500],
      [hoje(), "Compra de material", "despesa", "Fornecedores", "Fornecedor X", 430.5],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, "modelo-importacao.xlsx");
  }

  return (
    <>
      <div className="section-title">
        <h2>Importar planilha</h2>
        <button className="btn ghost" onClick={baixarModelo}>⬇️ Baixar modelo</button>
      </div>

      {erro && <div className="err">{erro}</div>}
      {okMsg && <div className="ok">{okMsg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>1. Envie seu arquivo (Excel .xlsx ou CSV)</h3>
        <p className="sub">O sistema lê a primeira aba e tenta reconhecer as colunas automaticamente.</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        {nomeArq && <p style={{ color: "var(--cyan)", marginTop: 10, fontWeight: 600 }}>📄 {nomeArq} — {linhas.length} linha(s)</p>}
      </div>

      {headers.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>2. Confira o mapeamento das colunas</h3>
            <div className="grid two">
              {ALVOS.map((a) => (
                <div className="field" key={a.key}>
                  <label className="f">{a.label}</label>
                  <select value={mapa[a.key]} onChange={(e) => setMapa({ ...mapa, [a.key]: e.target.value })}>
                    <option value="">— ignorar —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 12 }}>Como identificar receita ou despesa?</h3>
            <div className="period" style={{ width: "fit-content", flexWrap: "wrap" }}>
              <button className={modoTipo === "coluna" ? "active" : ""} onClick={() => setModoTipo("coluna")} disabled={!mapa.tipo}>Pela coluna Tipo</button>
              <button className={modoTipo === "sinal" ? "active" : ""} onClick={() => setModoTipo("sinal")}>Pelo sinal (negativo = despesa)</button>
              <button className={modoTipo === "fixo" ? "active" : ""} onClick={() => setModoTipo("fixo")}>Tudo como…</button>
            </div>
            {modoTipo === "fixo" && (
              <div className="period" style={{ width: "fit-content", marginTop: 8 }}>
                <button className={tipoPadrao === "receita" ? "active" : ""} onClick={() => setTipoPadrao("receita")}>📥 Receita</button>
                <button className={tipoPadrao === "despesa" ? "active" : ""} onClick={() => setTipoPadrao("despesa")}>📤 Despesa</button>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, cursor: "pointer", fontWeight: 600 }}>
              <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 18, height: 18 }} />
              Marcar como já pago/recebido (entra no caixa). Desmarque para virar contas em aberto.
            </label>
          </div>

          {previa.length > 0 && (
            <div className="card">
              <h3>3. Prévia ({totalValido} lançamento(s) válido(s))</h3>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {previa.map((l, i) => (
                      <tr key={i}>
                        <td className="mono">{l.data_competencia}</td>
                        <td>{l.descricao}</td>
                        <td><span className={`chip ${l.tipo === "receita" ? "green" : "red"}`}>{l.tipo}</span></td>
                        <td>{l.categoria || "—"}</td>
                        <td className="num" style={{ color: l.tipo === "receita" ? "var(--green)" : "var(--red)" }}>{brl(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sub" style={{ marginTop: 10 }}>Mostrando as 5 primeiras linhas.</p>
              <button className="btn" onClick={importar} disabled={importando}>
                {importando ? "Importando…" : `✅ Importar ${totalValido} lançamento(s)`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
