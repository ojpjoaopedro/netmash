"use client";

import { useState } from "react";
import { SecHead } from "./Kit";
import { resumo, serieFluxo } from "@/lib/calc";
import { CATALOGO, ytd, def, statusMeta, type Metrica, type Categoria } from "@/lib/indicadores";
import { brl, brlCompact, pct, ultimosMeses, rotuloMes, hoje, dataBR } from "@/lib/format";
import type { Lancamento, Funcionario } from "@/lib/db";

type Brand = { nome: string; logo: string | null };

type Props = {
  metrs: Metrica[];
  lancs: Lancamento[];
  funcs: Funcionario[];
  saldoInicial: number;
  brand: Brand;
};

const ACCENT = "#1AADE2";

/** Escapa &, <, > para não quebrar o HTML gerado com texto livre (nome da empresa etc). */
function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Slug simples para nome de arquivo. */
function slug(s: string): string {
  return (s || "empresa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "empresa";
}

/** Cor de status (mesma régua do KpiRing). */
function corStatus(status: "ok" | "warn" | "bad"): string {
  return status === "ok" ? "#10B981" : status === "warn" ? "#F59E0B" : "#EF4444";
}

function fmtUnidade(value: number, unidade: string): string {
  if (unidade === "BRL") return brl(value);
  if (unidade === "%") return pct(value);
  if (unidade === "score") return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// ============================================================
// Blocos de HTML (puro, sem JSX) reutilizados por deck e relatório
// ============================================================

function logoOuNome(brand: Brand): string {
  if (brand.logo) {
    return `<img class="logo" src="${brand.logo}" alt="${esc(brand.nome)}" />`;
  }
  return `<div class="logo-nome">${esc(brand.nome)}</div>`;
}

/** Card de número grande (label + valor + nota opcional). */
function bigCard(label: string, valor: string, nota?: string, cor?: string): string {
  return `
    <div class="card">
      <div class="card-label">${esc(label)}</div>
      <div class="card-valor"${cor ? ` style="color:${cor}"` : ""}>${esc(valor)}</div>
      ${nota ? `<div class="card-nota">${esc(nota)}</div>` : ""}
    </div>`;
}

/** Linha de indicador (valor + % da meta + status colorido). */
function kpiCard(key: string, metrs: Metrica[]): string {
  const d = def(key);
  if (!d) return "";
  const { value, pct: p } = ytd(metrs, key);
  const status = statusMeta(p, d.invert);
  const cor = corStatus(status);
  const txt = status === "ok" ? "No ritmo" : status === "warn" ? "Atenção" : "Abaixo";
  const barra = Math.max(0, Math.min(p, 100));
  return `
    <div class="card kpi">
      <div class="card-label">${esc(d.label)}</div>
      <div class="card-valor">${esc(fmtUnidade(value, d.unidade))}</div>
      <div class="kpi-bar"><i style="width:${barra}%;background:${cor}"></i></div>
      <div class="kpi-foot">
        <span class="chip" style="color:${cor};border-color:${cor}55;background:${cor}1a">${txt}</span>
        <span class="kpi-meta">${p}% da meta</span>
      </div>
    </div>`;
}

/** Gráfico de barras SVG inline: entradas x saídas por mês. */
function svgFluxo(lancs: Lancamento[], n: number, saldoInicial: number): string {
  const serie = serieFluxo(lancs, n, saldoInicial);
  const W = 1000;
  const H = 420;
  const padL = 70;
  const padR = 24;
  const padT = 24;
  const padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(1, ...serie.map((p) => Math.max(p.entradas, p.saidas)));
  const slot = plotW / serie.length;
  const barW = Math.min(48, (slot - 16) / 2);
  const gap = 6;

  let bars = "";
  let labels = "";
  serie.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const hE = (p.entradas / max) * plotH;
    const hS = (p.saidas / max) * plotH;
    const xE = cx - barW - gap / 2;
    const xS = cx + gap / 2;
    const yE = padT + plotH - hE;
    const yS = padT + plotH - hS;
    bars += `
      <rect x="${xE.toFixed(1)}" y="${yE.toFixed(1)}" width="${barW.toFixed(1)}" height="${hE.toFixed(1)}" rx="4" fill="#10B981"></rect>
      <rect x="${xS.toFixed(1)}" y="${yS.toFixed(1)}" width="${barW.toFixed(1)}" height="${hS.toFixed(1)}" rx="4" fill="#EF4444"></rect>`;
    labels += `<text x="${cx.toFixed(1)}" y="${(H - padB + 24).toFixed(1)}" class="axis-x">${esc(rotuloMes(p.mes))}</text>`;
  });

  // linhas de grade + eixo Y
  let grid = "";
  const steps = 4;
  for (let g = 0; g <= steps; g++) {
    const val = (max / steps) * g;
    const y = padT + plotH - (val / max) * plotH;
    grid += `
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${(W - padR).toFixed(1)}" y2="${y.toFixed(1)}" class="grid"></line>
      <text x="${(padL - 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="axis-y">${esc(brlCompact(val))}</text>`;
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">
      ${grid}
      ${bars}
      ${labels}
    </svg>
    <div class="legend">
      <span><i style="background:#10B981"></i> Entradas</span>
      <span><i style="background:#EF4444"></i> Saídas</span>
    </div>`;
}

/** Slide / seção "por área": indicadores de uma categoria. */
function blocoArea(cat: Categoria, metrs: Metrica[]): string {
  const itens = CATALOGO.filter((d) => d.categoria === cat);
  return itens.map((d) => kpiCard(d.key, metrs)).join("");
}

const TITULO_AREA: Record<Categoria, string> = {
  financeiro: "Financeiro",
  cliente: "Clientes",
  comercial: "Comercial",
  marketing: "Marketing",
};

// ============================================================
// CSS comum (deck + relatório partilham a identidade visual)
// ============================================================
function baseCss(): string {
  return `
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--accent:${ACCENT};--bg:#0A0A0A;--card:#121212;--line:#222;--muted:#9aa0a6;--txt:#f4f5f7}
  html,body{background:var(--bg);color:var(--txt);
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  h1,h2,h3{font-weight:800;letter-spacing:-.02em;line-height:1.08}
  .accent{color:var(--accent)}
  .logo{max-height:120px;max-width:60%;object-fit:contain;margin-bottom:8px}
  .logo-nome{font-size:clamp(34px,6vw,72px);font-weight:800;color:var(--accent);letter-spacing:-.03em}
  .eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.16em;font-size:13px}
  .muted{color:var(--muted)}
  .grid{display:grid;gap:18px}
  .g2{grid-template-columns:repeat(2,1fr)}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g5{grid-template-columns:repeat(5,1fr)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 24px}
  .card-label{color:var(--muted);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .card-valor{font-size:clamp(24px,3.2vw,40px);font-weight:800;margin-top:8px;letter-spacing:-.02em}
  .card-nota{color:var(--muted);font-size:13px;margin-top:6px}
  .kpi-bar{height:7px;border-radius:99px;background:#1f1f1f;margin:14px 0 10px;overflow:hidden}
  .kpi-bar i{display:block;height:100%;border-radius:99px}
  .kpi-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
  .kpi-meta{color:var(--muted);font-size:13px;font-weight:600}
  .chart{width:100%;height:auto;display:block}
  .grid line.grid,.grid-line{stroke:#1d1d1d;stroke-width:1}
  line.grid{stroke:#1d1d1d;stroke-width:1}
  .axis-x{fill:#9aa0a6;font-size:15px;text-anchor:middle}
  .axis-y{fill:#9aa0a6;font-size:14px;text-anchor:end}
  .legend{display:flex;gap:24px;justify-content:center;margin-top:18px;color:var(--muted);font-weight:600;font-size:15px}
  .legend span{display:inline-flex;align-items:center;gap:8px}
  .legend i{width:14px;height:14px;border-radius:4px;display:inline-block}`;
}

// ============================================================
// DECK (slides) — HTML autossuficiente
// ============================================================
function gerarDeck(props: Props, n: number): string {
  const { metrs, lancs, funcs, saldoInicial, brand } = props;
  const meses = ultimosMeses(n);
  const r = resumo(lancs, meses, saldoInicial);
  const ano = new Date().getFullYear();
  const periodoTxt = `${rotuloMes(meses[0])} – ${rotuloMes(meses[meses.length - 1])} (${n} meses)`;
  const folha = funcs.filter((f) => f.ativo).length;

  const slides: string[] = [];

  // 1. Capa
  slides.push(`
    <section class="slide capa">
      ${logoOuNome(brand)}
      <h1>Relatório de Resultados <span class="accent">${ano}</span></h1>
      <p class="capa-sub">${esc(periodoTxt)}</p>
      <p class="muted capa-data">Gerado em ${esc(dataBR(hoje()))} · ${esc(brand.nome)}${folha ? ` · ${folha} colaboradores` : ""}</p>
    </section>`);

  // 2. Resumo financeiro
  slides.push(`
    <section class="slide">
      <div class="slide-inner">
        <p class="eyebrow">Visão geral</p>
        <h2>Resumo financeiro</h2>
        <div class="grid g3" style="margin-top:34px">
          ${bigCard("Saldo em caixa", brl(r.saldo), "Disponível hoje", r.saldo >= 0 ? "#10B981" : "#EF4444")}
          ${bigCard("Faturamento", brl(r.faturamento), "No período")}
          ${bigCard("Despesas", brl(r.despesas), "No período", "#EF4444")}
          ${bigCard("Lucro", brl(r.lucro), "No período", r.lucro >= 0 ? "#10B981" : "#EF4444")}
          ${bigCard("Margem", pct(r.margem), "Lucro / faturamento")}
          ${bigCard("A receber / a pagar", `${brlCompact(r.aReceber)} / ${brlCompact(r.aPagar)}`, "Em aberto")}
        </div>
      </div>
    </section>`);

  // 3. Fluxo de caixa
  slides.push(`
    <section class="slide">
      <div class="slide-inner">
        <p class="eyebrow">Movimentação</p>
        <h2>Fluxo de caixa</h2>
        <div class="card" style="margin-top:30px;padding:28px 30px">
          ${svgFluxo(lancs, n, saldoInicial)}
        </div>
      </div>
    </section>`);

  // 4. Indicadores-chave
  const chaves = ["faturamento", "lucro", "margem", "clientes_ativos", "nps", "leads", "conversao"];
  slides.push(`
    <section class="slide">
      <div class="slide-inner">
        <p class="eyebrow">Desempenho vs meta anual</p>
        <h2>Indicadores-chave</h2>
        <div class="grid g3" style="margin-top:34px">
          ${chaves.map((k) => kpiCard(k, metrs)).join("")}
        </div>
      </div>
    </section>`);

  // 5. Por área
  (["cliente", "comercial", "marketing"] as Categoria[]).forEach((cat) => {
    slides.push(`
      <section class="slide">
        <div class="slide-inner">
          <p class="eyebrow">Por área</p>
          <h2>${esc(TITULO_AREA[cat])}</h2>
          <div class="grid g3" style="margin-top:34px">
            ${blocoArea(cat, metrs)}
          </div>
        </div>
      </section>`);
  });

  // 6. Encerramento
  slides.push(`
    <section class="slide capa encerra">
      <h1>Obrigado<span class="accent">.</span></h1>
      <p class="capa-sub">${esc(brand.nome)}</p>
      <div class="card" style="margin-top:24px;min-width:300px;text-align:center">
        <div class="card-label">Lucro do período</div>
        <div class="card-valor" style="color:${r.lucro >= 0 ? "#10B981" : "#EF4444"}">${esc(brl(r.lucro))}</div>
        <div class="card-nota">${esc(periodoTxt)}</div>
      </div>
    </section>`);

  const total = slides.length;
  const titulo = `Apresentação · ${esc(brand.nome)} · ${ano}`;

  const deckCss = `
    ${baseCss()}
    html,body{height:100%;overflow:hidden}
    #deck{height:100vh;width:100vw;position:relative}
    .slide{position:absolute;inset:0;height:100vh;width:100vw;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:6vh 7vw;opacity:0;visibility:hidden;
      transition:opacity .35s ease;text-align:center}
    .slide.active{opacity:1;visibility:visible}
    .slide-inner{width:100%;max-width:1180px;text-align:left}
    .slide h2{font-size:clamp(30px,4.4vw,52px);margin-top:6px}
    .capa h1{font-size:clamp(38px,7vw,86px);margin-top:18px}
    .capa-sub{font-size:clamp(18px,2.4vw,28px);color:var(--accent);font-weight:700;margin-top:18px}
    .capa-data{margin-top:14px;font-size:15px}
    .encerra h1{font-size:clamp(48px,9vw,110px)}
    .nav{position:fixed;left:0;right:0;bottom:22px;display:flex;align-items:center;justify-content:center;
      gap:18px;z-index:20}
    .nav button{background:var(--card);border:1px solid var(--line);color:var(--txt);width:46px;height:46px;
      border-radius:50%;font-size:20px;cursor:pointer;display:grid;place-items:center;transition:.2s}
    .nav button:hover{background:#1d1d1d;border-color:var(--accent)}
    .counter{color:var(--muted);font-weight:700;font-size:15px;min-width:64px;text-align:center}
    .hint{position:fixed;top:18px;right:22px;color:var(--muted);font-size:12px;z-index:20;
      background:var(--card);border:1px solid var(--line);padding:6px 12px;border-radius:99px}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${titulo}</title>
<style>${deckCss}</style>
</head>
<body>
<div class="hint">← → navegar · F tela cheia</div>
<div id="deck">
${slides.join("\n")}
</div>
<div class="nav">
  <button id="prev" aria-label="Anterior">&#8249;</button>
  <span class="counter"><span id="cur">1</span> / ${total}</span>
  <button id="next" aria-label="Próximo">&#8250;</button>
</div>
<script>
(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var total = slides.length;
  var i = 0;
  var cur = document.getElementById('cur');
  function show(n){
    i = Math.max(0, Math.min(n, total - 1));
    slides.forEach(function(s, idx){ s.classList.toggle('active', idx === i); });
    cur.textContent = (i + 1);
  }
  function next(){ show(i + 1); }
  function prev(){ show(i - 1); }
  function fullscreen(){
    if (!document.fullscreenElement) { (document.documentElement.requestFullscreen||function(){})(); }
    else { (document.exitFullscreen||function(){})(); }
  }
  document.getElementById('next').addEventListener('click', next);
  document.getElementById('prev').addEventListener('click', prev);
  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { show(0); }
    else if (e.key === 'End') { show(total - 1); }
    else if (e.key === 'f' || e.key === 'F') { fullscreen(); }
  });
  show(0);
})();
</script>
</body>
</html>`;
}

// ============================================================
// RELATÓRIO de 1 página — mesma identidade, rolável
// ============================================================
function gerarRelatorio(props: Props, n: number): string {
  const { metrs, lancs, saldoInicial, brand } = props;
  const meses = ultimosMeses(n);
  const r = resumo(lancs, meses, saldoInicial);
  const ano = new Date().getFullYear();
  const periodoTxt = `${rotuloMes(meses[0])} – ${rotuloMes(meses[meses.length - 1])} (${n} meses)`;

  const chaves = ["faturamento", "lucro", "margem", "clientes_ativos", "nps", "leads", "conversao"];

  const areas = (["cliente", "comercial", "marketing"] as Categoria[]).map((cat) => `
    <h3 class="sec">${esc(TITULO_AREA[cat])}</h3>
    <div class="grid g3">${blocoArea(cat, metrs)}</div>`).join("");

  const relCss = `
    ${baseCss()}
    body{padding:48px max(24px,5vw);max-width:1200px;margin:0 auto}
    header.rel{display:flex;align-items:center;justify-content:space-between;gap:24px;
      border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:34px;flex-wrap:wrap}
    header.rel .logo{max-height:64px;margin:0}
    header.rel .logo-nome{font-size:30px}
    header.rel h1{font-size:26px;margin-top:4px}
    header.rel .muted{font-size:13px;margin-top:4px}
    h3.sec{font-size:20px;margin:38px 0 16px;padding-top:6px}
    .grid{margin-bottom:6px}
    .card-valor{font-size:30px}
    footer.rel{margin-top:44px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted);font-size:13px;text-align:center}
    @media print{body{padding:0}}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Relatório · ${esc(brand.nome)} · ${ano}</title>
<style>${relCss}</style>
</head>
<body>
<header class="rel">
  <div>${logoOuNome(brand)}<h1>Relatório de Resultados <span class="accent">${ano}</span></h1></div>
  <div style="text-align:right">
    <div class="muted">${esc(periodoTxt)}</div>
    <div class="muted">Gerado em ${esc(dataBR(hoje()))}</div>
  </div>
</header>

<h3 class="sec" style="margin-top:0">Resumo financeiro</h3>
<div class="grid g3">
  ${bigCard("Saldo em caixa", brl(r.saldo), "Disponível hoje", r.saldo >= 0 ? "#10B981" : "#EF4444")}
  ${bigCard("Faturamento", brl(r.faturamento), "No período")}
  ${bigCard("Despesas", brl(r.despesas), "No período", "#EF4444")}
  ${bigCard("Lucro", brl(r.lucro), "No período", r.lucro >= 0 ? "#10B981" : "#EF4444")}
  ${bigCard("Margem", pct(r.margem), "Lucro / faturamento")}
  ${bigCard("A receber / a pagar", `${brlCompact(r.aReceber)} / ${brlCompact(r.aPagar)}`, "Em aberto")}
</div>

<h3 class="sec">Fluxo de caixa</h3>
<div class="card" style="padding:28px 30px">${svgFluxo(lancs, n, saldoInicial)}</div>

<h3 class="sec">Indicadores-chave</h3>
<div class="grid g3">${chaves.map((k) => kpiCard(k, metrs)).join("")}</div>

${areas}

<footer class="rel">${esc(brand.nome)} · Relatório gerado em ${esc(dataBR(hoje()))} · ${esc(periodoTxt)}</footer>
</body>
</html>`;
}

// ============================================================
// Download
// ============================================================
function baixar(html: string, nomeArquivo: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// Componente
// ============================================================
export default function GerarApresentacao({ metrs, lancs, funcs, saldoInicial, brand }: Props) {
  const [meses, setMeses] = useState<3 | 6 | 12>(6);

  const props: Props = { metrs, lancs, funcs, saldoInicial, brand };
  const base = slug(brand.nome);
  // capa, resumo, fluxo, indicadores, 3 áreas, encerramento = 8 slides
  const totalSlides = 8;

  function onDeck() {
    baixar(gerarDeck(props, meses), `apresentacao-${base}.html`);
  }
  function onRelatorio() {
    baixar(gerarRelatorio(props, meses), `relatorio-${base}.html`);
  }

  return (
    <div>
      <SecHead
        icon="Sparkles"
        titulo="Gerar apresentação"
        sub="Crie um deck HTML dos seus números para apresentar e compartilhar"
        cor="#8b5cf6"
        right={
          <div className="period">
            {([3, 6, 12] as const).map((n) => (
              <button
                key={n}
                className={meses === n ? "active" : ""}
                onClick={() => setMeses(n)}
              >
                {n} meses
              </button>
            ))}
          </div>
        }
      />

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>🎬 Apresentação (deck HTML)</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Um deck de slides autossuficiente: capa, resumo financeiro, fluxo de caixa,
            indicadores-chave e desempenho por área. Abre em qualquer navegador, navega com
            as setas ← → e apresenta em tela cheia (tecla F).
          </p>
          <p className="sub" style={{ marginTop: 10 }}>
            {totalSlides} slides serão gerados · período de {meses} meses
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={onDeck}>
            🎬 Gerar apresentação (HTML)
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>📄 Relatório de 1 página</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Mesma identidade visual, mas em uma única página rolável — ideal para enviar por
            e-mail, imprimir ou salvar em PDF pelo navegador.
          </p>
          <p className="sub" style={{ marginTop: 10 }}>
            Todas as seções em um arquivo · período de {meses} meses
          </p>
          <button className="btn ghost" style={{ marginTop: 14 }} onClick={onRelatorio}>
            📄 Relatório de 1 página (HTML)
          </button>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 14 }}>
        Os arquivos gerados são offline e autossuficientes (nenhuma dependência externa) — basta
        abrir o <code>.html</code> baixado.
      </p>
    </div>
  );
}
