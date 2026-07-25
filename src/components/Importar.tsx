"use client";
import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { addLancamentosLote, Tipo, Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { brl } from "@/lib/format";
import { MES, carregarEstrutura } from "@/app/minhasmetricas/financas-estrutura";

/** Lançamento já pronto para importar (extraído da matriz de meses). */
type Lanc = { tipo: Tipo; descricao: string; categoria: string | null; valor: number; data: string };

const ANOS_MODELO = [2026, 2027, 2028];
const MES_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function round2(n: number) { return Math.round(n * 100) / 100; }

function parseValor(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "");
  if (s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")) {
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(s) || 0;
}

/** Descobre o índice do mês (0..11) a partir do texto do cabeçalho ("Jan", "janeiro"…). */
function mesIndex(c: unknown): number {
  const s = String(c).trim().toLowerCase();
  if (!s) return -1;
  for (let i = 0; i < 12; i++) if (s.startsWith(MES[i].toLowerCase())) return i;
  for (let i = 0; i < 12; i++) if (s.startsWith(MES_FULL[i])) return i;
  return -1;
}

/* ── Cabeçalho da empresa (mesmo para todas as abas) ───────────────────────── */
function cabecalhoEmpresa(empresa: Empresa | null, brand?: Brand) {
  const nome = brand?.nome && brand.nome !== "Minha Empresa" ? brand.nome
    : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");
  const cnpj = empresa?.cnpj || "";
  const cidade = (empresa && "cidade" in empresa ? (empresa as { cidade?: string }).cidade : "") || "";
  let resp = "";
  try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); resp = s?.sup?.nome || ""; } catch { /* ignore */ }
  return { nome, cnpj, cidade, resp };
}

type Papel = "titulo" | "kv" | "vazio" | "cabecalho" | "secao" | "grupo" | "item";

/** Monta a matriz de um ano (meses nas colunas, itens nas linhas) + o papel de cada linha (p/ formatar). */
function montarMatriz(ano: number, comValores: boolean, cab: ReturnType<typeof cabecalhoEmpresa>) {
  const d = carregarEstrutura();
  const aoa: (string | number)[][] = [];
  const papeis: Papel[] = [];
  const add = (row: (string | number)[], papel: Papel) => { aoa.push(row); papeis.push(papel); };
  const linhaValores = (v: number[]) => MES.map((_, m) => (comValores && v[m] ? round2(v[m]) : "")) as (string | number)[];

  add([`ESTRUTURA DE RECEITAS E CUSTOS ${ano}`], "titulo");
  add(["Empresa", cab.nome], "kv");
  add(["CNPJ", cab.cnpj], "kv");
  add(["Cidade", cab.cidade], "kv");
  add(["Responsável financeiro", cab.resp], "kv");
  add([], "vazio");
  add(["Item", ...MES], "cabecalho");

  add(["RECEITAS"], "secao");
  for (const r of d.receitas) add([r.nome, ...linhaValores(r.v)], "item");

  for (const b of d.custos) {
    add([b.nome.toUpperCase()], "secao");
    for (const g of b.grupos) {
      add([g.nome], "grupo");
      for (const it of g.itens) add([it.nome, ...linhaValores(it.v)], "item");
    }
  }
  return { aoa, papeis };
}

function toARGB(hex?: string) {
  let h = (hex || "#1AADE2").replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return "FF" + h.toUpperCase();
}

/** Aplica as cores/bordas na planilha (título, cabeçalho, seções e bordas nas células preenchidas). */
function estilizar(ws: XLSX.WorkSheet, papeis: Papel[], brandHex?: string) {
  const N = 1 + 12; // Item + 12 meses
  const brand = toARGB(brandHex);
  const b = { style: "thin", color: { rgb: "FFCBD5E1" } } as const;
  const bordas = { top: b, bottom: b, left: b, right: b };
  const cabRow = papeis.indexOf("cabecalho");
  ws["!merges"] = [];
  ws["!cols"] = [{ wch: 28 }, ...Array.from({ length: 12 }, () => ({ wch: 10 }))];
  ws["!rows"] = papeis.map((p) => ({ hpt: p === "titulo" ? 24 : p === "cabecalho" || p === "secao" ? 19 : 16 }));

  for (let r = 0; r < papeis.length; r++) {
    const papel = papeis[r];
    if (papel === "titulo" || papel === "secao") ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: N - 1 } });
    const naTabela = r >= cabRow;
    const ultimaCol = papel === "kv" ? 1 : (naTabela ? N - 1 : 0);
    for (let c = 0; c <= ultimaCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = (ws[addr] ||= { t: "s", v: "" }) as XLSX.CellObject;
      const num = typeof cell.v === "number";
      const s: Record<string, unknown> = {};
      if (papel === "titulo") { s.font = { bold: true, sz: 14, color: { rgb: "FFFFFFFF" } }; s.fill = { fgColor: { rgb: brand } }; s.alignment = { vertical: "center" }; }
      else if (papel === "kv") { if (c === 0) s.font = { bold: true, color: { rgb: "FF334155" } }; }
      else if (papel === "cabecalho") { s.font = { bold: true, color: { rgb: "FF0F172A" } }; s.fill = { fgColor: { rgb: "FFE2E8F0" } }; s.alignment = { horizontal: c === 0 ? "left" : "center", vertical: "center" }; s.border = bordas; }
      else if (papel === "secao") { s.font = { bold: true, color: { rgb: "FF0F172A" } }; s.fill = { fgColor: { rgb: "FFCBD9EC" } }; s.alignment = { vertical: "center" }; s.border = bordas; }
      else if (papel === "grupo") { s.font = { bold: true, italic: true, color: { rgb: "FF334155" } }; s.fill = { fgColor: { rgb: "FFF1F5F9" } }; s.border = bordas; }
      else if (papel === "item") { s.border = bordas; s.alignment = { horizontal: c === 0 ? "left" : "right" }; }
      if (num) { cell.z = "#,##0"; s.numFmt = "#,##0"; }
      cell.s = s;
    }
  }
}

export default function Importar({ reload, empresa = null, brand }: { reload: () => void; empresa?: Empresa | null; brand?: Brand }) {
  const [prev, setPrev] = useState<Lanc[]>([]);
  const [nomeArq, setNomeArq] = useState("");
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [importando, setImportando] = useState(false);
  const [pago, setPago] = useState(true);
  const [arrastando, setArrastando] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processar(file);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processar(file);
  }

  /** Lê todas as abas (2026/2027/2028…) e extrai os lançamentos da matriz. */
  function extrair(wb: XLSX.WorkBook): Lanc[] {
    const out: Lanc[] = [];
    const anoPadrao = 2026;
    for (const nomeAba of wb.SheetNames) {
      const ws = wb.Sheets[nomeAba];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      // acha a linha de cabeçalho (a que tem os meses)
      let hr = -1; let mesCols: Record<number, number> = {};
      for (let i = 0; i < aoa.length; i++) {
        const cols: Record<number, number> = {}; let cnt = 0;
        (aoa[i] || []).forEach((c, ci) => { const mi = mesIndex(c); if (mi >= 0) { cols[ci] = mi; cnt++; } });
        if (cnt >= 3) { hr = i; mesCols = cols; break; }
      }
      if (hr < 0) continue;
      // ano: pelo nome da aba, senão pelo título
      let ano = /^20\d\d$/.test(nomeAba.trim()) ? Number(nomeAba.trim()) : 0;
      if (!ano) for (let i = 0; i < hr; i++) { const m = String((aoa[i] || []).join(" ")).match(/20\d\d/); if (m) { ano = Number(m[0]); break; } }
      if (!ano) ano = anoPadrao;
      const hrow = aoa[hr] || [];
      let itemCol = hrow.findIndex((c) => /item|descri|nome/i.test(String(c)));
      if (itemCol < 0) itemCol = 0;

      let modo: Tipo = "receita"; let categoria = "Receitas";
      for (let i = hr + 1; i < aoa.length; i++) {
        const row = aoa[i] || [];
        const nome = String(row[itemCol] || "").trim();
        if (!nome) continue;
        const vals: [number, number][] = [];
        for (const ci in mesCols) { const v = parseValor(row[Number(ci)]); if (v > 0) vals.push([mesCols[ci], v]); }
        if (!vals.length) { // linha de seção ou grupo
          if (/receita/i.test(nome)) { modo = "receita"; categoria = "Receitas"; }
          else { modo = "despesa"; categoria = nome; }
          continue;
        }
        for (const [mi, v] of vals) {
          out.push({ tipo: modo, descricao: nome.slice(0, 200), categoria, valor: v, data: `${ano}-${String(mi + 1).padStart(2, "0")}-01` });
        }
      }
    }
    return out;
  }

  async function processar(file: File) {
    setErro(""); setOkMsg(""); setNomeArq(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const lancs = extrair(wb);
      if (!lancs.length) { setErro("Não encontrei valores na planilha. Use o modelo (meses nas colunas, itens nas linhas)."); setPrev([]); return; }
      setPrev(lancs);
    } catch {
      setErro("Não consegui ler o arquivo. Use Excel (.xlsx) ou CSV.");
    }
  }

  async function importar() {
    setImportando(true); setErro(""); setOkMsg("");
    const lotes = prev.map((o) => ({
      tipo: o.tipo, descricao: o.descricao || "Importado", categoria: o.categoria || null,
      valor: o.valor, data_competencia: o.data, vencimento: o.data,
      pago, data_pagamento: pago ? o.data : null, forma: null, contato: null, origem: "planilha",
    }));
    await addLancamentosLote(lotes);
    setImportando(false);
    setOkMsg(`✅ ${lotes.length} lançamento(s) importado(s) com sucesso!`);
    setPrev([]); setNomeArq("");
    reload();
  }

  function baixarExcel() {
    const cab = cabecalhoEmpresa(empresa, brand);
    const wb = XLSX.utils.book_new();
    ANOS_MODELO.forEach((ano, i) => {
      const { aoa, papeis } = montarMatriz(ano, i === 0, cab); // só a aba 2026 vem preenchida
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      estilizar(ws, papeis, brand?.cor);
      XLSX.utils.book_append_sheet(wb, ws, String(ano));
    });
    XLSX.writeFile(wb, "minhas-metricas-estrutura.xlsx");
  }

  async function abrirSheets() {
    const cab = cabecalhoEmpresa(empresa, brand);
    const { aoa } = montarMatriz(ANOS_MODELO[0], true, cab);
    const tsv = aoa.map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setOkMsg("✅ Planilha de 2026 copiada! Na aba do Google que abriu: clique na célula A1 e aperte Ctrl+V. Pronto, ela se preenche.");
    } catch {
      // se o navegador bloquear a cópia, baixa um CSV para importar (Arquivo > Importar no Sheets)
      const blob = new Blob(["﻿" + aoa.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "minhas-metricas-2026.csv"; a.click(); URL.revokeObjectURL(url);
      setOkMsg("Baixei um CSV de 2026. No Google Sheets use Arquivo > Importar para carregar.");
    }
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
            <p className="sub" style={{ marginTop: 4, lineHeight: 1.55 }}>O modelo tem uma aba para cada ano (2026, 2027 e 2028), com os <b>meses nas colunas</b> e os <b>itens nas linhas</b> para facilitar o preenchimento. A aba de 2026 já vem preenchida com a sua <b>Estrutura de Receitas e Custos</b>. É só completar os meses que faltam.</p>
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
              <span className="sub" style={{ fontSize: 12.5 }}>{prev.length} lançamento(s) encontrado(s) · clique ou arraste para trocar</span>
            </>
          ) : (
            <>
              <b style={{ fontSize: 15 }}>Clique aqui ou arraste seu arquivo</b>
              <span className="sub" style={{ fontSize: 12.5 }}>Excel (.xlsx) ou CSV</span>
            </>
          )}
        </label>
      </div>

      {prev.length > 0 && (
        <div className="card">
          <h3>Confira antes de importar ({prev.length} lançamento(s))</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 14px", cursor: "pointer", fontWeight: 600 }}>
            <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 18, height: 18 }} />
            Marcar como já pago/recebido (entra no caixa). Desmarque para virar contas em aberto.
          </label>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {prev.slice(0, 8).map((l, i) => (
                  <tr key={i}>
                    <td className="mono">{l.data}</td>
                    <td>{l.descricao}</td>
                    <td><span className={`chip ${l.tipo === "receita" ? "green" : "red"}`}>{l.tipo}</span></td>
                    <td>{l.categoria || "-"}</td>
                    <td className="num" style={{ color: l.tipo === "receita" ? "var(--green)" : "var(--red)" }}>{brl(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prev.length > 8 && <p className="sub" style={{ marginTop: 10 }}>Mostrando os 8 primeiros de {prev.length}.</p>}
          <button className="btn" onClick={importar} disabled={importando} style={{ marginTop: 12 }}>
            {importando ? "Importando…" : `✅ Importar ${prev.length} lançamento(s)`}
          </button>
        </div>
      )}
    </>
  );
}
