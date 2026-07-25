"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { addLancamentosLote, Tipo, Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { brl, hoje } from "@/lib/format";
import { carregarEstrutura } from "@/app/minhasmetricas/financas-estrutura";

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

/** Monta a planilha (matriz de linhas) a partir da Estrutura de Receitas e Custos + cabeçalho da empresa. */
function montarPlanilha(empresa: Empresa | null, brand?: Brand): (string | number)[][] {
  const d = carregarEstrutura();
  const ano = new Date().getFullYear();
  const nomeEmpresa = brand?.nome && brand.nome !== "Minha Empresa" ? brand.nome
    : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");
  const cnpj = empresa?.cnpj || "";
  const cidade = (empresa && "cidade" in empresa ? (empresa as { cidade?: string }).cidade : "") || "";
  let responsavel = "";
  try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); responsavel = s?.sup?.nome || ""; } catch { /* ignore */ }
  const dataMes = (m: number) => `${ano}-${String(m + 1).padStart(2, "0")}-01`;

  const aoa: (string | number)[][] = [
    ["ESTRUTURA DE RECEITAS E CUSTOS"],
    ["Empresa", nomeEmpresa],
    ["CNPJ", cnpj],
    ["Cidade", cidade],
    ["Responsável financeiro", responsavel],
    [],
    ["Data", "Descrição", "Tipo", "Categoria", "Valor"],
  ];
  for (const r of d.receitas) for (let m = 0; m < 12; m++) if (r.v[m] > 0) aoa.push([dataMes(m), r.nome, "receita", "Receitas", r.v[m]]);
  for (const b of d.custos) for (const g of b.grupos) for (const it of g.itens) for (let m = 0; m < 12; m++) if (it.v[m] > 0) aoa.push([dataMes(m), it.nome, "despesa", g.nome, it.v[m]]);
  return aoa;
}

export default function Importar({ reload, empresa = null, brand }: { reload: () => void; empresa?: Empresa | null; brand?: Brand }) {
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
  const [arrastando, setArrastando] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processar(file);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processar(file);
  }

  async function processar(file: File) {
    setErro(""); setOkMsg("");
    setNomeArq(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // lê como matriz e pula as linhas de cabeçalho da empresa (Empresa/CNPJ/…)
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      const ehCabecalho = (row: unknown[]) => row.some((c) => /descri|valor|data|tipo|categ/i.test(String(c)));
      let hi = aoa.findIndex(ehCabecalho);
      if (hi < 0) hi = 0;
      const hs = (aoa[hi] as unknown[]).map((c) => String(c).trim()).filter((c) => c);
      const json: Linha[] = (aoa.slice(hi + 1) as unknown[][])
        .filter((r) => r.some((c) => String(c).trim() !== ""))
        .map((r) => Object.fromEntries(hs.map((h, i) => [h, r[i]])));
      if (!json.length) { setErro("A planilha parece vazia."); return; }
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

  function baixarExcel() {
    const ws = XLSX.utils.aoa_to_sheet(montarPlanilha(empresa, brand));
    ws["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 12 }, { wch: 22 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estrutura");
    XLSX.writeFile(wb, "minhas-metricas-estrutura.xlsx");
  }
  async function abrirSheets() {
    // copia como TSV para colar direto no Google Sheets (Ctrl+V)
    const tsv = montarPlanilha(empresa, brand).map((r) => r.join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); setOkMsg("Planilha copiada! Abra o Google Sheets e cole com Ctrl+V."); } catch { setOkMsg("Abra o Google Sheets e importe o CSV baixado."); }
    window.open("https://sheets.new", "_blank", "noopener");
  }

  return (
    <>
      <div className="section-title">
        <h2>Importar planilha</h2>
      </div>

      {erro && <div className="err">{erro}</div>}
      {okMsg && <div className="ok">{okMsg}</div>}

      {/* modelo baseado na Estrutura de Receitas e Custos */}
      <div className="card" style={{ marginBottom: 16, background: "linear-gradient(150deg, rgba(26,173,226,.08), transparent)", border: "1px solid rgba(26,173,226,.2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(26,173,226,.16)", color: "var(--brand)", fontWeight: 800 }}>i</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 15 }}>Como deve ser seu arquivo</b>
            <p className="sub" style={{ marginTop: 4, lineHeight: 1.55 }}>O modelo já vem preenchido com os dados da sua <b>Estrutura de Receitas e Custos</b>. Atualize sempre que houver novos lançamentos, linhas ou um novo mês. Na primeira vez, ele vem só com o cabeçalho.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button className="btn" onClick={baixarExcel} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 14 }}>📊 Baixar arquivo Excel</button>
              <button className="btn" onClick={abrirSheets} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 14, background: "#188038" }}>📗 Abrir modelo no Google Sheets</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Envie seu arquivo (Excel .xlsx ou CSV)</h3>
        <p className="sub">O sistema lê o arquivo e preenche automaticamente a Estrutura de Receitas e Custos.</p>
        <label
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={onDrop}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12,
            minHeight: 150, borderRadius: 16, cursor: "pointer", textAlign: "center", padding: 20, transition: ".15s",
            border: `2px dashed ${arrastando ? "var(--brand)" : "var(--line-2)"}`,
            background: arrastando ? "color-mix(in srgb, var(--brand) 8%, var(--bg-2))" : "var(--bg-2)" }}>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: "none" }} />
          <span style={{ width: 52, height: 52, borderRadius: 15, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          </span>
          {nomeArq ? (
            <>
              <b style={{ fontSize: 14.5 }}>📄 {nomeArq}</b>
              <span className="sub" style={{ fontSize: 12.5 }}>{linhas.length} linha(s) · clique ou arraste para trocar</span>
            </>
          ) : (
            <>
              <b style={{ fontSize: 15 }}>Clique aqui ou arraste seu arquivo</b>
              <span className="sub" style={{ fontSize: 12.5 }}>Excel (.xlsx) ou CSV</span>
            </>
          )}
        </label>
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
