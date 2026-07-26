"use client";
import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { brl } from "@/lib/format";
import { MES, carregarEstrutura, Dados } from "@/app/minhasmetricas/financas-estrutura";

const CHAVE = "me_financas_estrutura";
const ANOS_MODELO = [2026, 2027, 2028];
const MES_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const PALETA = ["#1AADE2", "#10B981", "#8b5cf6", "#F59E0B", "#EC4899", "#EF4444", "#0EA5E9", "#14B8A6"];

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

/* ── Modelo (download) ─────────────────────────────────────────────────────── */
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

function estilizar(ws: XLSX.WorkSheet, papeis: Papel[], brandHex?: string) {
  const N = 1 + 12;
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
      // trava as linhas de estrutura (título, cabeçalho, RECEITAS/CUSTOS e grupos)
      s.protection = { locked: papel === "titulo" || papel === "cabecalho" || papel === "secao" || papel === "grupo" };
      cell.s = s;
    }
  }

  // rows extras (desbloqueadas) para o usuário poder acrescentar itens
  const buffer = 120;
  for (let r = papeis.length; r < papeis.length + buffer; r++) {
    for (let c = 0; c < N; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = (ws[addr] ||= { t: "s", v: "" }) as XLSX.CellObject;
      cell.s = { protection: { locked: false } };
    }
  }
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: papeis.length + buffer - 1, c: N - 1 } });
  // protege a planilha, permitindo editar as células liberadas e inserir/remover linhas de itens
  ws["!protect"] = { selectLockedCells: true, selectUnlockedCells: true, insertRows: true, deleteRows: true, formatCells: true };
}

/* ── Leitura da planilha enviada ───────────────────────────────────────────── */
type ItemV = { nome: string; v: number[] };
type UpDados = { receitas: ItemV[]; grupos: { nome: string; itens: ItemV[] }[] };

/** Lê uma aba (matriz) e devolve receitas + grupos de custo, cada item com seus 12 meses. */
function parseAba(ws: XLSX.WorkSheet): (UpDados & { rotulos: Set<string> }) | null {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  let hr = -1; let mesCols: Record<number, number> = {};
  for (let i = 0; i < aoa.length; i++) {
    const cols: Record<number, number> = {}; let cnt = 0;
    (aoa[i] || []).forEach((c, ci) => { const mi = mesIndex(c); if (mi >= 0) { cols[ci] = mi; cnt++; } });
    if (cnt >= 3) { hr = i; mesCols = cols; break; }
  }
  if (hr < 0) return null;
  const hrow = aoa[hr] || [];
  let itemCol = hrow.findIndex((c) => /item|descri|nome/i.test(String(c)));
  if (itemCol < 0) itemCol = 0;

  const up: UpDados = { receitas: [], grupos: [] };
  const rotulos = new Set<string>();   // nomes das linhas de estrutura (seções/grupos), em maiúsculo
  let modo: "receita" | "custo" = "receita";
  let grupoAtual = "";
  for (let i = hr + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const nome = String(row[itemCol] || "").trim();
    if (!nome) continue;
    const cels = Object.entries(mesCols).map(([ci, mi]) => ({ mi, raw: row[Number(ci)] }));
    const temValor = cels.some((c) => String(c.raw ?? "").trim() !== "");
    if (!temValor) { // linha de seção (RECEITAS / bloco) ou grupo
      rotulos.add(nome.toUpperCase());
      if (/receita/i.test(nome)) modo = "receita";
      else { modo = "custo"; grupoAtual = nome; }
      continue;
    }
    const v = Array(12).fill(0);
    for (const c of cels) v[c.mi] = round2(parseValor(c.raw));
    if (modo === "receita") up.receitas.push({ nome, v });
    else {
      let g = up.grupos.find((x) => x.nome === grupoAtual);
      if (!g) { g = { nome: grupoAtual || "Custos", itens: [] }; up.grupos.push(g); }
      g.itens.push({ nome, v });
    }
  }
  return { ...up, rotulos };
}

/* ── Comparação com a Estrutura atual ──────────────────────────────────────── */
type Status = "novo" | "alterado" | "removido";
type Diff = { status: Status; tipo: "receita" | "despesa"; categoria: string; nome: string; vDe: number[] | null; vPara: number[] | null };

const difere = (a: number[], b: number[]) => MES.some((_, m) => round2(a[m] || 0) !== round2(b[m] || 0));
const soma = (v: number[]) => v.reduce((s, x) => s + (x || 0), 0);

function comparar(base: Dados, up: UpDados): Diff[] {
  const diffs: Diff[] = [];
  // Receitas
  const baseRec = new Map(base.receitas.map((r) => [r.nome, r.v]));
  const upRec = new Map(up.receitas.map((r) => [r.nome, r.v]));
  for (const r of up.receitas) {
    const b = baseRec.get(r.nome);
    if (!b) diffs.push({ status: "novo", tipo: "receita", categoria: "Receitas", nome: r.nome, vDe: null, vPara: r.v });
    else if (difere(b, r.v)) diffs.push({ status: "alterado", tipo: "receita", categoria: "Receitas", nome: r.nome, vDe: b, vPara: r.v });
  }
  for (const r of base.receitas) if (!upRec.has(r.nome)) diffs.push({ status: "removido", tipo: "receita", categoria: "Receitas", nome: r.nome, vDe: r.v, vPara: null });

  // Custos (por grupo + nome)
  const chave = (g: string, n: string) => `${g}||${n}`;
  const baseCus = new Map<string, { grupo: string; v: number[] }>();
  base.custos.forEach((bl) => bl.grupos.forEach((g) => g.itens.forEach((it) => baseCus.set(chave(g.nome, it.nome), { grupo: g.nome, v: it.v }))));
  const upCus = new Map<string, { grupo: string; v: number[] }>();
  up.grupos.forEach((g) => g.itens.forEach((it) => upCus.set(chave(g.nome, it.nome), { grupo: g.nome, v: it.v })));
  for (const [k, u] of upCus) {
    const b = baseCus.get(k);
    if (!b) diffs.push({ status: "novo", tipo: "despesa", categoria: u.grupo, nome: k.split("||")[1], vDe: null, vPara: u.v });
    else if (difere(b.v, u.v)) diffs.push({ status: "alterado", tipo: "despesa", categoria: u.grupo, nome: k.split("||")[1], vDe: b.v, vPara: u.v });
  }
  for (const [k, b] of baseCus) if (!upCus.has(k)) diffs.push({ status: "removido", tipo: "despesa", categoria: b.grupo, nome: k.split("||")[1], vDe: b.v, vPara: null });
  return diffs;
}

/** Aplica a planilha na Estrutura: atualiza/adiciona/remove itens e devolve a nova Estrutura. */
function aplicarNaEstrutura(base: Dados, up: UpDados): Dados {
  const novo: Dados = structuredClone(base);
  let corIdx = 0;
  const proxCor = () => PALETA[corIdx++ % PALETA.length];

  // Receitas: mantém só as que estão na planilha, atualiza valores, adiciona novas
  const upRecNomes = new Set(up.receitas.map((r) => r.nome));
  novo.receitas = novo.receitas.filter((r) => upRecNomes.has(r.nome));
  for (const ur of up.receitas) {
    const ex = novo.receitas.find((r) => r.nome === ur.nome);
    if (ex) ex.v = ur.v.slice();
    else novo.receitas.push({ nome: ur.nome, cor: proxCor(), v: ur.v.slice() });
  }

  // Custos: sincroniza item a item dentro de cada grupo existente
  for (const bl of novo.custos) for (const g of bl.grupos) {
    const ug = up.grupos.find((x) => x.nome === g.nome);
    const nomesUp = new Set(ug ? ug.itens.map((i) => i.nome) : []);
    g.itens = g.itens.filter((it) => nomesUp.has(it.nome));
    if (ug) for (const ui of ug.itens) {
      const ex = g.itens.find((it) => it.nome === ui.nome);
      if (ex) ex.v = ui.v.slice();
      else g.itens.push({ nome: ui.nome, v: ui.v.slice() });
    }
  }
  // grupos novos (que não existem na Estrutura) entram no primeiro bloco
  const gruposBase = new Set(novo.custos.flatMap((bl) => bl.grupos.map((g) => g.nome)));
  const novosGrupos = up.grupos.filter((g) => g.itens.length && !gruposBase.has(g.nome));
  if (novosGrupos.length) {
    if (!novo.custos.length) novo.custos.push({ nome: "Custos", grupos: [] });
    const bloco = novo.custos[0];
    for (const g of novosGrupos) bloco.grupos.push({ nome: g.nome, cor: proxCor(), itens: g.itens.map((i) => ({ nome: i.nome, v: i.v.slice() })) });
  }
  return novo;
}

/* ── Componente ────────────────────────────────────────────────────────────── */
export default function Importar({ reload, empresa = null, brand }: { reload: () => void; empresa?: Empresa | null; brand?: Brand }) {
  const [diffs, setDiffs] = useState<Diff[] | null>(null);
  const [upDados, setUpDados] = useState<UpDados | null>(null);
  const [nomeArq, setNomeArq] = useState("");
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [aplicando, setAplicando] = useState(false);
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

  async function processar(file: File) {
    setErro(""); setOkMsg(""); setNomeArq(file.name); setDiffs(null); setUpDados(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      // usa a aba "2026" (ou a primeira aba com valores) — a Estrutura é de um ano
      let up: (UpDados & { rotulos: Set<string> }) | null = null;
      const preferida = wb.SheetNames.find((n) => n.trim() === "2026");
      const ordem = preferida ? [preferida, ...wb.SheetNames.filter((n) => n !== preferida)] : wb.SheetNames;
      for (const nome of ordem) {
        const p = parseAba(wb.Sheets[nome]);
        if (p && (p.receitas.some((r) => soma(r.v) > 0) || p.grupos.some((g) => g.itens.some((i) => soma(i.v) > 0)))) { up = p; break; }
      }
      if (!up) { setErro("Não encontrei valores na planilha. Use o modelo (meses nas colunas, itens nas linhas)."); return; }

      // valida a estrutura: as linhas travadas (RECEITAS, blocos e grupos) não podem ter sido alteradas
      const base = carregarEstrutura();
      const faltando: string[] = [];
      if (!up.rotulos.has("RECEITAS")) faltando.push("RECEITAS");
      for (const bl of base.custos) {
        if (!up.rotulos.has(bl.nome.toUpperCase())) faltando.push(bl.nome.toUpperCase());
        for (const g of bl.grupos) if (!up.rotulos.has(g.nome.toUpperCase())) faltando.push(g.nome);
      }
      if (faltando.length) {
        setErro(`A estrutura foi alterada (faltou: ${faltando.slice(0, 3).join(", ")}${faltando.length > 3 ? "…" : ""}). Essas linhas são travadas. Baixe o modelo de novo e altere apenas os valores dos meses.`);
        return;
      }

      const d = comparar(base, up);
      setUpDados(up); setDiffs(d);
    } catch {
      setErro("Não consegui ler o arquivo. Use Excel (.xlsx) ou CSV.");
    }
  }

  function aplicar() {
    if (!upDados) return;
    setAplicando(true); setErro(""); setOkMsg("");
    const nova = aplicarNaEstrutura(carregarEstrutura(), upDados);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(nova));
      window.dispatchEvent(new Event("me:estrutura"));
    } catch { /* ignore */ }
    setAplicando(false);
    setOkMsg(`✅ Estrutura atualizada! ${diffs?.length || 0} alteração(ões) aplicada(s).`);
    setDiffs(null); setUpDados(null); setNomeArq("");
    reload();
  }

  function baixarExcel() {
    const cab = cabecalhoEmpresa(empresa, brand);
    const wb = XLSX.utils.book_new();
    ANOS_MODELO.forEach((ano, i) => {
      const { aoa, papeis } = montarMatriz(ano, i === 0, cab);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      estilizar(ws, papeis, brand?.cor);
      XLSX.utils.book_append_sheet(wb, ws, String(ano));
    });
    XLSX.writeFile(wb, "minhas-metricas-estrutura.xlsx");
  }

  const COR: Record<Status, string> = { novo: "#10B981", alterado: "#F59E0B", removido: "#EF4444" };
  const ROTULO: Record<Status, string> = { novo: "Novo", alterado: "Alterado", removido: "Removido" };
  const resumo = (d: Diff) => {
    if (d.status === "removido") return "Linha apagada da planilha";
    if (d.status === "novo") {
      const ms = (d.vPara || []).map((x, m) => (x ? `${MES[m]} ${brl(x)}` : null)).filter(Boolean);
      return ms.length ? ms.join(", ") : "Linha adicionada";
    }
    const ms: string[] = [];
    for (let m = 0; m < 12; m++) if (round2(d.vDe![m] || 0) !== round2(d.vPara![m] || 0)) ms.push(`${MES[m]}: ${brl(d.vDe![m] || 0)} → ${brl(d.vPara![m] || 0)}`);
    return ms.join("   ·   ");
  };
  const totalNovo = (d: Diff) => (d.vPara ? soma(d.vPara) : 0);

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
            <p className="sub" style={{ marginTop: 4, lineHeight: 1.55 }}>O modelo tem uma aba para cada ano (2026, 2027 e 2028), com os <b>meses nas colunas</b> e os <b>itens nas linhas</b>. A aba de 2026 já vem preenchida com a sua <b>Estrutura de Receitas e Custos</b>. Edite os valores, adicione ou apague linhas e suba de volta: o sistema mostra só o que mudou.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button className="btn" onClick={baixarExcel} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 14 }}>📊 Baixar arquivo Excel</button>
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
              <span className="sub" style={{ fontSize: 12.5 }}>{diffs ? `${diffs.length} alteração(ões) encontrada(s)` : "processando…"} · clique ou arraste para trocar</span>
            </>
          ) : (
            <>
              <b style={{ fontSize: 15 }}>Clique aqui ou arraste seu arquivo</b>
              <span className="sub" style={{ fontSize: 12.5 }}>Excel (.xlsx) ou CSV</span>
            </>
          )}
        </label>
      </div>

      {diffs && diffs.length === 0 && (
        <div className="card">
          <b style={{ fontSize: 15 }}>Nenhuma diferença encontrada</b>
          <p className="sub" style={{ marginTop: 6 }}>A planilha está igual à Estrutura de Receitas e Custos atual. Edite valores ou adicione/apague linhas para ver as mudanças aqui.</p>
        </div>
      )}

      {diffs && diffs.length > 0 && (
        <div className="card">
          <h3>Confira o que mudou ({diffs.length} alteração(ões))</h3>
          <p className="sub" style={{ margin: "4px 0 12px" }}>Só aparecem os itens que foram adicionados, alterados ou apagados. Ao aplicar, sua Estrutura de Receitas e Custos é atualizada.</p>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Situação</th><th>Item</th><th>Categoria</th><th>O que mudou</th><th className="num">Novo total</th></tr></thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={i}>
                    <td><span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, color: "#fff", background: COR[d.status] }}>{ROTULO[d.status]}</span></td>
                    <td style={{ textDecoration: d.status === "removido" ? "line-through" : "none", opacity: d.status === "removido" ? .7 : 1 }}>{d.nome}</td>
                    <td>{d.categoria}</td>
                    <td className="sub" style={{ fontSize: 12.5 }}>{resumo(d)}</td>
                    <td className="num" style={{ color: d.tipo === "receita" ? "var(--green)" : "var(--red)" }}>{d.status === "removido" ? "-" : brl(totalNovo(d))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn" onClick={aplicar} disabled={aplicando} style={{ marginTop: 14 }}>
            {aplicando ? "Aplicando…" : `✅ Aplicar ${diffs.length} alteração(ões) na Estrutura`}
          </button>
        </div>
      )}
    </>
  );
}
