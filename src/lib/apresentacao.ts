import { custoFolha } from "./calc";
import { brl, brlCompact, pct, hoje, dataBR } from "./format";
import type { Funcionario } from "./db";
import { carregarEstruturaComPagamentos, MES, type Dados } from "@/app/minhasmetricas/financas-estrutura";

const ACCENT = "#1AADE2";
const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export type Secao = "faturamento" | "despesas" | "resultado" | "fatCanal" | "despGrupo" | "graficos" | "equipe" | "aniversarios";
export const SECOES: { key: Secao; label: string }[] = [
  { key: "faturamento", label: "Faturamento" },
  { key: "despesas", label: "Despesas" },
  { key: "resultado", label: "Resultado final" },
  { key: "fatCanal", label: "Faturamento por canal" },
  { key: "despGrupo", label: "Despesas por grupos" },
  { key: "graficos", label: "Gráficos" },
  { key: "equipe", label: "Equipe" },
  { key: "aniversarios", label: "Aniversariantes do mês" },
];

export type DadosApres = {
  funcs: Funcionario[];
  brand: { nome: string; logo: string | null };
  ano: number;
};

function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function slug(s: string): string {
  return (s || "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa";
}
function logoOuNome(b: DadosApres["brand"]): string {
  return b.logo ? `<img class="logo" src="${b.logo}" alt="${esc(b.nome)}" />` : `<div class="logo-nome">${esc(b.nome)}</div>`;
}
function bigCard(label: string, valor: string, nota?: string, cor?: string): string {
  return `<div class="card"><div class="card-label">${esc(label)}</div><div class="card-valor"${cor ? ` style="color:${cor}"` : ""}>${esc(valor)}</div>${nota ? `<div class="card-nota">${esc(nota)}</div>` : ""}</div>`;
}

/* ---------- dados da Estrutura de Receitas e Custos ---------- */
function idxMeses(meses: string[], ano: number): number[] {
  const idx = meses.filter((m) => Number(m.slice(0, 4)) === ano).map((m) => Number(m.slice(5, 7)) - 1).filter((m) => m >= 0 && m < 12);
  return idx.length ? idx : Array.from({ length: 12 }, (_, i) => i);
}
const fatMes = (d: Dados, mi: number) => d.receitas.reduce((s, r) => s + (r.v[mi] || 0), 0);
const despMes = (d: Dados, mi: number) => d.custos.reduce((s, b) => s + b.grupos.reduce((s2, g) => s2 + g.itens.reduce((s3, it) => s3 + (it.v[mi] || 0), 0), 0), 0);
function porCanal(d: Dados, idx: number[]): { nome: string; valor: number }[] {
  return d.receitas.map((r) => ({ nome: r.nome || "(sem nome)", valor: idx.reduce((s, mi) => s + (r.v[mi] || 0), 0) })).filter((x) => x.valor > 0.005).sort((a, b) => b.valor - a.valor);
}
function porGrupo(d: Dados, idx: number[]): { nome: string; valor: number }[] {
  return d.custos.flatMap((b) => b.grupos).map((g) => ({ nome: g.nome || "(sem nome)", valor: idx.reduce((s, mi) => s + g.itens.reduce((s2, it) => s2 + (it.v[mi] || 0), 0), 0) })).filter((x) => x.valor > 0.005).sort((a, b) => b.valor - a.valor);
}

/* ---------- gráficos SVG ---------- */
function svgBarras(pts: { rotulo: string; valor: number }[], cor: string): string {
  const W = 1000, H = 380, padL = 74, padR = 24, padT = 20, padB = 52;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...pts.map((p) => p.valor));
  const slot = plotW / Math.max(1, pts.length);
  const barW = Math.min(58, slot - 16);
  let bars = "", labels = "";
  pts.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = (p.valor / max) * plotH;
    bars += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${(padT + plotH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${cor}"></rect>`;
    labels += `<text x="${cx.toFixed(1)}" y="${(H - padB + 22).toFixed(1)}" class="axis-x">${esc(p.rotulo)}</text>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) { const val = (max / 4) * g, y = padT + plotH - (val / max) * plotH; grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(W - padR).toFixed(1)}" y2="${y.toFixed(1)}" class="grid"></line><text x="${(padL - 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="axis-y">${esc(brlCompact(val))}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">${grid}${bars}${labels}</svg>`;
}
function svgDuplo(pts: { rotulo: string; a: number; b: number }[], corA: string, corB: string, legA: string, legB: string): string {
  const W = 1000, H = 400, padL = 74, padR = 24, padT = 20, padB = 52;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.a, p.b)));
  const slot = plotW / Math.max(1, pts.length);
  const barW = Math.min(40, (slot - 14) / 2), gap = 6;
  let bars = "", labels = "";
  pts.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const hA = (p.a / max) * plotH, hB = (p.b / max) * plotH;
    bars += `<rect x="${(cx - barW - gap / 2).toFixed(1)}" y="${(padT + plotH - hA).toFixed(1)}" width="${barW.toFixed(1)}" height="${hA.toFixed(1)}" rx="4" fill="${corA}"></rect><rect x="${(cx + gap / 2).toFixed(1)}" y="${(padT + plotH - hB).toFixed(1)}" width="${barW.toFixed(1)}" height="${hB.toFixed(1)}" rx="4" fill="${corB}"></rect>`;
    labels += `<text x="${cx.toFixed(1)}" y="${(H - padB + 22).toFixed(1)}" class="axis-x">${esc(p.rotulo)}</text>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) { const val = (max / 4) * g, y = padT + plotH - (val / max) * plotH; grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(W - padR).toFixed(1)}" y2="${y.toFixed(1)}" class="grid"></line><text x="${(padL - 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="axis-y">${esc(brlCompact(val))}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">${grid}${bars}${labels}</svg><div class="legend"><span><i style="background:${corA}"></i> ${esc(legA)}</span><span><i style="background:${corB}"></i> ${esc(legB)}</span></div>`;
}

/* ---------- tabelas ---------- */
function tabelaBreak(linhas: { nome: string; valor: number }[], titulo: string, cor: string): string {
  const tot = linhas.reduce((s, l) => s + l.valor, 0);
  const rows = linhas.length
    ? linhas.map((l) => `<tr><td><span class="dot" style="background:${cor}"></span>${esc(l.nome)}</td><td style="text-align:right">${esc(brl(l.valor))}</td><td style="text-align:right;color:var(--muted)">${tot > 0 ? Math.round((l.valor / tot) * 100) : 0}%</td></tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:var(--muted)">Sem dados no período.</td></tr>`;
  return `<table class="tbl" style="margin-top:26px"><thead><tr><th>${esc(titulo)}</th><th style="text-align:right">Valor</th><th style="text-align:right">Participação</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td style="font-weight:800">Total</td><td style="text-align:right;font-weight:800">${esc(brl(tot))}</td><td></td></tr></tfoot></table>`;
}
function tabelaEquipe(funcs: Funcionario[]): string {
  const f = custoFolha(funcs);
  const ativos = funcs.filter((x) => x.ativo);
  const linhas = ativos.length
    ? ativos.map((c) => `<tr><td>${esc(c.nome)}</td><td>${esc(c.cargo || "-")}</td><td style="text-align:right">${esc(brl(c.salario))}</td><td style="text-align:right">${esc(brl(c.salario + c.beneficios))}</td></tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Nenhum colaborador cadastrado.</td></tr>`;
  return `<div class="grid g3" style="margin-top:24px">${bigCard("Colaboradores ativos", String(f.ativos))}${bigCard("Salários / mês", brl(f.salarios))}${bigCard("Custo total folha", brl(f.total), "com benefícios", "#F59E0B")}</div>
    <table class="tbl"><thead><tr><th>Nome</th><th>Cargo</th><th style="text-align:right">Salário</th><th style="text-align:right">Custo total</th></tr></thead><tbody>${linhas}</tbody></table>`;
}
function blocoAniversarios(funcs: Funcionario[]): string {
  const mA = new Date().getMonth() + 1;
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const nome1 = (n: string) => (n || "").trim().split(/\s+/).slice(0, 2).join(" ");
  const niver = funcs.filter((f) => f.ativo && f.nascimento && Number(f.nascimento.slice(5, 7)) === mA);
  const admis = funcs.filter((f) => f.ativo && f.admissao && Number(f.admissao.slice(5, 7)) === mA);
  const lista = (arr: Funcionario[], campo: "nascimento" | "admissao") => arr.length
    ? `<div class="grid g2" style="margin-top:14px">${arr.map((f) => `<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span style="font-weight:700">${esc(nome1(f.nome))}</span><span class="chip" style="color:var(--accent);border-color:${ACCENT}55;background:${ACCENT}1a">${esc(dm((f[campo] as string)))}</span></div>`).join("")}</div>`
    : `<p class="muted" style="margin-top:10px">Ninguém neste mês.</p>`;
  return `<h3 class="sub2">🎂 Aniversário</h3>${lista(niver, "nascimento")}<h3 class="sub2" style="margin-top:26px">🏆 Aniversário de casa (admissão)</h3>${lista(admis, "admissao")}`;
}

/* ---------- totais e slides ---------- */
function totais(data: DadosApres, meses: string[]) {
  const d = carregarEstruturaComPagamentos(data.ano);
  const idx = idxMeses(meses, data.ano);
  const fat = idx.reduce((s, mi) => s + fatMes(d, mi), 0);
  const desp = idx.reduce((s, mi) => s + despMes(d, mi), 0);
  return { d, idx, fat, desp, resultado: fat - desp, margem: fat > 0 ? ((fat - desp) / fat) * 100 : 0 };
}

function slidesDe(data: DadosApres, meses: string[], secoes: Set<Secao>): { titulo: string; html: string }[] {
  const { d, idx, fat, desp, resultado, margem } = totais(data, meses);
  const serie = idx.map((mi) => ({ rotulo: MES[mi], fat: fatMes(d, mi), desp: despMes(d, mi) }));
  const out: { titulo: string; html: string }[] = [];

  if (secoes.has("faturamento")) {
    out.push({ titulo: "Faturamento", html: `<div class="grid g2" style="margin-top:30px">${bigCard("Faturamento total", brl(fat), "No período", "#10B981")}${bigCard("Média por mês", brl(idx.length ? fat / idx.length : 0))}</div><div class="card" style="margin-top:20px;padding:26px 28px">${svgBarras(serie.map((s) => ({ rotulo: s.rotulo, valor: s.fat })), "#10B981")}</div>` });
  }
  if (secoes.has("despesas")) {
    out.push({ titulo: "Despesas", html: `<div class="grid g2" style="margin-top:30px">${bigCard("Despesas totais", brl(desp), "No período", "#EF4444")}${bigCard("Média por mês", brl(idx.length ? desp / idx.length : 0))}</div><div class="card" style="margin-top:20px;padding:26px 28px">${svgBarras(serie.map((s) => ({ rotulo: s.rotulo, valor: s.desp })), "#EF4444")}</div>` });
  }
  if (secoes.has("resultado")) {
    out.push({ titulo: "Resultado final", html: `<div class="grid g2" style="margin-top:30px">${bigCard("Faturamento", brl(fat), "No período", "#10B981")}${bigCard("Despesas", brl(desp), "No período", "#EF4444")}${bigCard("Resultado (lucro)", brl(resultado), "Faturamento - Despesas", resultado >= 0 ? "#10B981" : "#EF4444")}${bigCard("Margem", pct(margem), "Resultado / faturamento")}</div><div class="card" style="margin-top:20px;padding:26px 28px">${svgBarras(serie.map((s) => ({ rotulo: s.rotulo, valor: s.fat - s.desp })), ACCENT)}</div>` });
  }
  if (secoes.has("fatCanal")) {
    out.push({ titulo: "Faturamento por canal", html: tabelaBreak(porCanal(d, idx), "Canal de venda", "#10B981") });
  }
  if (secoes.has("despGrupo")) {
    out.push({ titulo: "Despesas por grupos", html: tabelaBreak(porGrupo(d, idx), "Grupo de custo", "#EF4444") });
  }
  if (secoes.has("graficos")) {
    out.push({ titulo: "Gráficos", html: `<div class="card" style="margin-top:26px;padding:26px 28px">${svgDuplo(serie.map((s) => ({ rotulo: s.rotulo, a: s.fat, b: s.desp })), "#10B981", "#EF4444", "Faturamento", "Despesas")}</div>` });
  }
  if (secoes.has("equipe")) {
    out.push({ titulo: "Equipe", html: tabelaEquipe(data.funcs) });
  }
  if (secoes.has("aniversarios")) {
    out.push({ titulo: `Aniversariantes de ${MESES_PT[new Date().getMonth()]}`, html: blocoAniversarios(data.funcs) });
  }
  return out;
}

function periodoTxt(meses: string[], ano: number): string {
  const idx = idxMeses(meses, ano);
  return `${MES[idx[0]]} - ${MES[idx[idx.length - 1]]} de ${ano} (${idx.length} ${idx.length === 1 ? "mês" : "meses"})`;
}

function baseCss(): string {
  return `*{margin:0;padding:0;box-sizing:border-box}
  :root{--accent:${ACCENT};--bg:#0A0A0A;--card:#121212;--line:#222;--muted:#9aa0a6;--txt:#f4f5f7}
  html,body{background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-weight:800;letter-spacing:-.02em;line-height:1.08}
  .accent{color:var(--accent)}
  .logo{max-height:120px;max-width:60%;object-fit:contain;margin-bottom:8px}
  .logo-nome{font-size:clamp(34px,6vw,72px);font-weight:800;color:var(--accent);letter-spacing:-.03em}
  .eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.16em;font-size:13px}
  .muted{color:var(--muted)}
  .sub2{font-size:15px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
  .grid{display:grid;gap:18px}.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 24px}
  .card-label{color:var(--muted);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .card-valor{font-size:clamp(24px,3.2vw,40px);font-weight:800;margin-top:8px;letter-spacing:-.02em}
  .card-nota{color:var(--muted);font-size:13px;margin-top:6px}
  .chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
  .chart{width:100%;height:auto;display:block}
  line.grid{stroke:#1d1d1d;stroke-width:1}.axis-x{fill:#9aa0a6;font-size:15px;text-anchor:middle}.axis-y{fill:#9aa0a6;font-size:14px;text-anchor:end}
  .legend{display:flex;gap:24px;justify-content:center;margin-top:18px;color:var(--muted);font-weight:600;font-size:15px}.legend span{display:inline-flex;align-items:center;gap:8px}.legend i{width:14px;height:14px;border-radius:4px;display:inline-block}
  .dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:8px;vertical-align:middle}
  .tbl{width:100%;border-collapse:collapse;margin-top:18px;font-size:15px}.tbl th{color:var(--muted);font-size:12px;text-transform:uppercase;text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}.tbl td{padding:11px 12px;border-bottom:1px solid var(--line)}.tbl tfoot td{border-bottom:0}
  @media(max-width:760px){.g2,.g3{grid-template-columns:1fr!important}.grid{gap:12px}.card{padding:18px 18px}.tbl{font-size:13px}.tbl th,.tbl td{padding:8px 8px}}`;
}

/** Deck de slides navegável. */
export function gerarDeck(data: DadosApres, meses: string[], secoes: Set<Secao>): string {
  const { brand, ano } = data;
  const t = totais(data, meses);
  const ptxt = periodoTxt(meses, ano);
  const conteudo = slidesDe(data, meses, secoes);

  const slides: string[] = [];
  slides.push(`<section class="slide capa">${logoOuNome(brand)}<h1>Relatório de Resultados <span class="accent">${ano}</span></h1><p class="capa-sub">${esc(ptxt)}</p><p class="muted capa-data">Gerado em ${esc(dataBR(hoje()))} · ${esc(brand.nome)}</p></section>`);
  conteudo.forEach((s) => slides.push(`<section class="slide"><div class="slide-inner"><p class="eyebrow">Visão geral</p><h2>${esc(s.titulo)}</h2>${s.html}</div></section>`));
  slides.push(`<section class="slide capa encerra"><h1>Obrigado<span class="accent">.</span></h1><p class="capa-sub">${esc(brand.nome)}</p><div class="card" style="margin-top:24px;min-width:300px;text-align:center"><div class="card-label">Resultado do período</div><div class="card-valor" style="color:${t.resultado >= 0 ? "#10B981" : "#EF4444"}">${esc(brl(t.resultado))}</div><div class="card-nota">${esc(ptxt)}</div></div><button class="expbtn-big" onclick="exportarPDF()">⬇ Baixar em PDF</button></section>`);

  const total = slides.length;
  const css = `${baseCss()}
    html,body{height:100%;overflow:hidden;background:var(--bg)}
    #deck{position:fixed;inset:0;overflow:hidden;background:var(--bg)}
    .stage{position:absolute;top:50%;left:50%;--sw:1280px;--sh:720px;width:var(--sw);height:var(--sh);background:var(--bg);overflow:hidden;
      transform:translate(-50%,-50%) scale(1);transform-origin:center center}
    .slide{position:absolute;inset:0;width:var(--sw);height:var(--sh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:52px 78px;opacity:0;visibility:hidden;overflow:hidden;transition:opacity .35s ease;text-align:center}
    .stage .g2{grid-template-columns:repeat(2,1fr)!important}
    .stage .g3{grid-template-columns:repeat(3,1fr)!important}
    .slide.active{opacity:1;visibility:visible}
    .slide-inner{width:100%;max-width:1120px;text-align:left}
    .slide h2{font-size:46px;margin-top:6px}
    .capa h1{font-size:78px;margin-top:18px}.capa-sub{font-size:26px;color:var(--accent);font-weight:700;margin-top:18px}.capa-data{margin-top:14px;font-size:16px}.encerra h1{font-size:104px}
    .logo{max-height:150px}.logo-nome{font-size:66px}
    .card-valor{font-size:36px}.card{padding:22px 26px}.grid{gap:20px}
    .stage.portrait .slide{padding:50px 34px;overflow-y:auto;overflow-x:hidden}
    .stage.portrait .slide:not(.capa){justify-content:flex-start}
    .stage.portrait .g2,.stage.portrait .g3{grid-template-columns:1fr!important}
    .stage.portrait .slide-inner{max-width:none}
    .stage.portrait .slide h2{font-size:38px}
    .stage.portrait .capa h1{font-size:clamp(46px,11vw,62px)}
    .stage.portrait .capa-sub{font-size:22px}
    .stage.portrait .encerra h1{font-size:82px}
    .stage.portrait .card-valor{font-size:32px}
    .nav{position:fixed;left:0;right:0;bottom:18px;display:flex;align-items:center;justify-content:center;gap:18px;z-index:20}
    .nav button{background:var(--card);border:1px solid var(--line);color:var(--txt);width:48px;height:48px;border-radius:50%;font-size:20px;cursor:pointer;display:grid;place-items:center}
    .nav button:hover{background:#1d1d1d;border-color:var(--accent)}
    .counter{color:#bbb;font-weight:700;font-size:15px;min-width:62px;text-align:center;background:rgba(0,0,0,.45);padding:5px 8px;border-radius:8px}
    .toolbar{position:fixed;bottom:18px;right:18px;z-index:30;display:flex;align-items:center;gap:10px}
    .closebtn{background:var(--card);border:1px solid var(--line);color:var(--txt);padding:10px 16px;border-radius:99px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px}
    .closebtn:hover{border-color:var(--accent);color:var(--accent)}
    .expbtn-big{margin-top:26px;background:var(--accent);color:#0A0A0A;border:0;padding:14px 28px;border-radius:99px;font-size:18px;font-weight:800;cursor:pointer}
    .expbtn{background:var(--card);border:1px solid var(--line);color:var(--txt);padding:10px 16px;border-radius:99px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px}
    .expbtn:hover{border-color:var(--accent);color:var(--accent)}
    @media(max-width:760px){.toolbar{bottom:74px;right:12px;gap:8px}.expbtn,.closebtn{padding:9px 13px;font-size:13px}}
    @media print{@page{size:landscape;margin:0}html,body{height:auto;overflow:visible;background:#fff}#deck{position:static;overflow:visible}.stage{position:static;transform:none!important;width:100%;height:auto;box-shadow:none}.slide{position:static!important;visibility:visible!important;opacity:1!important;width:100%;height:auto;aspect-ratio:16/9;page-break-after:always;break-after:page}.nav,.toolbar,.closebtn,.expbtn,.expbtn-big{display:none!important}}`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Apresentação · ${esc(brand.nome)} · ${ano}</title><style>${css}</style></head><body>
<div class="toolbar"><button class="expbtn" onclick="exportarPDF()">⬇ Baixar PDF</button><button class="closebtn" onclick="fecharApres()">✕ Fechar</button></div>
<div id="deck"><div class="stage" id="stage">${slides.join("\n")}</div></div>
<div class="nav"><button id="prev">&#8249;</button><span class="counter"><span id="cur">1</span> / ${total}</span><button id="next">&#8250;</button></div>
<script>function fecharApres(){try{window.close()}catch(e){}setTimeout(function(){if(!window.closed){if(history.length>1){history.back()}else{document.documentElement.innerHTML='<div style=\\'display:grid;place-items:center;height:100vh;color:#888;font-family:sans-serif\\'>Pode fechar esta aba.</div>'}}},150)}
function exportarPDF(){var B=document.querySelectorAll('.expbtn,.expbtn-big');function T(t){for(var j=0;j<B.length;j++)B[j].textContent=t}T('Gerando PDF...');function L(u){return new Promise(function(r,e){var s=document.createElement('script');s.src=u;s.onload=r;s.onerror=e;document.head.appendChild(s)})}var P=Promise.resolve();if(!window.html2canvas)P=P.then(function(){return L('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')});if(!(window.jspdf&&window.jspdf.jsPDF))P=P.then(function(){return L('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')});P.then(function(){var sl=[].slice.call(document.querySelectorAll('.slide')),st=document.getElementById('stage');var pt=st.style.transform,ptop=st.style.top,pl=st.style.left,ai=0;for(var z=0;z<sl.length;z++){if(sl[z].classList.contains('active'))ai=z}st.classList.remove('portrait');st.style.setProperty('--sw','1280px');st.style.setProperty('--sh','720px');st.style.transform='none';st.style.top='0';st.style.left='0';var bigs=document.querySelectorAll('.expbtn-big');for(var q=0;q<bigs.length;q++)bigs[q].style.display='none';var bg=getComputedStyle(document.body).backgroundColor||'#0A0A0A';var pdf=new window.jspdf.jsPDF({orientation:'landscape',unit:'px',format:[1280,720]});var k=0;function done(){for(var z=0;z<sl.length;z++)sl[z].classList.toggle('active',z===ai);st.style.transform=pt;st.style.top=ptop;st.style.left=pl;for(var q=0;q<bigs.length;q++)bigs[q].style.display='';if(window.__fit){window.__fit()}pdf.save('apresentacao.pdf');for(var y=0;y<B.length;y++)B[y].textContent=B[y].className.indexOf('big')>-1?'⬇ Baixar em PDF':'⬇ Baixar PDF'}function nx(){if(k>=sl.length){done();return}for(var z=0;z<sl.length;z++)sl[z].classList.toggle('active',z===k);window.html2canvas(sl[k],{width:1280,height:720,scale:2,backgroundColor:bg,logging:false}).then(function(cv){var im=cv.toDataURL('image/jpeg',0.92);if(k>0)pdf.addPage([1280,720],'landscape');pdf.addImage(im,'JPEG',0,0,1280,720);k++;nx()}).catch(function(){k++;nx()})}nx()}).catch(function(){T('Falhou (precisa de internet)')})}
(function(){var s=[].slice.call(document.querySelectorAll('.slide')),t=s.length,i=0,c=document.getElementById('cur');var stage=document.getElementById('stage');function fit(){var p=window.innerWidth<window.innerHeight,sw,sh,k;if(p){sw=760;sh=Math.round(760*window.innerHeight/window.innerWidth);k=window.innerWidth/sw;stage.classList.add('portrait')}else{sw=1280;sh=720;k=Math.min(window.innerWidth/1280,window.innerHeight/720);stage.classList.remove('portrait')}stage.style.setProperty('--sw',sw+'px');stage.style.setProperty('--sh',sh+'px');stage.style.transform='translate(-50%,-50%) scale('+k+')'}window.__fit=fit;window.addEventListener('resize',fit);window.addEventListener('orientationchange',fit);fit();function show(n){i=Math.max(0,Math.min(n,t-1));s.forEach(function(x,k){x.classList.toggle('active',k===i)});c.textContent=i+1}function fs(){if(!document.fullscreenElement){(document.documentElement.requestFullscreen||function(){})()}else{(document.exitFullscreen||function(){})()}}document.getElementById('next').onclick=function(){show(i+1)};document.getElementById('prev').onclick=function(){show(i-1)};document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();show(i+1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();show(i-1)}else if(e.key==='Home'){show(0)}else if(e.key==='End'){show(t-1)}else if(e.key==='f'||e.key==='F'){fs()}});var sx=0;document.addEventListener('touchstart',function(e){sx=e.changedTouches[0].clientX},{passive:true});document.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45){show(dx<0?i+1:i-1)}},{passive:true});show(0)})();</script>
</body></html>`;
}

/** Relatório de uma página (rolável). */
export function gerarRelatorio(data: DadosApres, meses: string[], secoes: Set<Secao>): string {
  const { brand, ano } = data;
  const ptxt = periodoTxt(meses, ano);
  const conteudo = slidesDe(data, meses, secoes);
  const css = `${baseCss()}
    body{padding:48px max(24px,5vw);max-width:1200px;margin:0 auto}
    header.rel{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:34px;flex-wrap:wrap}
    header.rel .logo{max-height:64px;margin:0}header.rel .logo-nome{font-size:30px}header.rel h1{font-size:26px;margin-top:4px}header.rel .muted{font-size:13px;margin-top:4px}
    h3.sec{font-size:20px;margin:38px 0 16px}.card-valor{font-size:30px}
    footer.rel{margin-top:44px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted);font-size:13px;text-align:center}
    .closebtn{position:fixed;top:14px;right:14px;z-index:30;background:var(--card);border:1px solid var(--line);color:var(--txt);padding:10px 16px;border-radius:99px;font-size:14px;font-weight:700;cursor:pointer}
    .closebtn:hover{border-color:var(--accent);color:var(--accent)}
    .expbtn{position:fixed;top:60px;right:14px;z-index:30;background:var(--accent);color:#0A0A0A;border:0;padding:9px 16px;border-radius:99px;font-size:13px;font-weight:800;cursor:pointer}
    @media print{body{padding:0}.closebtn,.expbtn{display:none}}`;
  const body = conteudo.map((s) => `<h3 class="sec">${esc(s.titulo)}</h3>${s.html}`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Relatório · ${esc(brand.nome)} · ${ano}</title><style>${css}</style></head><body>
<button class="closebtn" onclick="(function(){try{window.close()}catch(e){}if(!window.closed&&history.length>1)history.back()})()">✕ Fechar</button>
<button class="expbtn" onclick="exportarPDF()">⬇ Baixar PDF</button>
<header class="rel"><div>${logoOuNome(brand)}<h1>Relatório de Resultados <span class="accent">${ano}</span></h1></div><div style="text-align:right"><div class="muted">${esc(ptxt)}</div><div class="muted">Gerado em ${esc(dataBR(hoje()))}</div></div></header>
${body}
<footer class="rel">${esc(brand.nome)} · ${esc(ptxt)}</footer>
<script>function exportarPDF(){var b=document.querySelector('.expbtn'),cb=document.querySelector('.closebtn');var old=b.textContent;b.textContent='Gerando...';function L(u){return new Promise(function(r,e){var s=document.createElement('script');s.src=u;s.onload=r;s.onerror=e;document.head.appendChild(s)})}var P=Promise.resolve();if(!window.html2canvas)P=P.then(function(){return L('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')});if(!(window.jspdf&&window.jspdf.jsPDF))P=P.then(function(){return L('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')});P.then(function(){b.style.display='none';cb.style.display='none';return window.html2canvas(document.body,{scale:2,backgroundColor:getComputedStyle(document.body).backgroundColor||'#0A0A0A'})}).then(function(cv){b.style.display='';cb.style.display='';var pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:'a4'});var pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();var iw=pw,ih=cv.height*pw/cv.width;var im=cv.toDataURL('image/jpeg',0.92);var pos=0,left=ih;pdf.addImage(im,'JPEG',0,0,iw,ih);left-=ph;while(left>1){pdf.addPage();pos-=ph;pdf.addImage(im,'JPEG',0,pos,iw,ih);left-=ph}pdf.save('relatorio.pdf');b.textContent=old}).catch(function(){b.style.display='';cb.style.display='';b.textContent='Falhou (precisa de internet)'}) }</script>
</body></html>`;
}

/** Abre o conteúdo numa nova aba (desktop e celular). Fallback: download se o pop-up for bloqueado. */
export function abrirHtml(html: string, nomeArquivo: string): void {
  const w = window.open("", "_blank");
  if (w) { w.document.open(); w.document.write(html); w.document.close(); return; }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
