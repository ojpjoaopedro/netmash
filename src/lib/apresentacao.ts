import { resumo, serieFluxoMeses, custoFolha } from "./calc";
import { CATALOGO, ytd, def, statusMeta, type Metrica, type Categoria } from "./indicadores";
import { brl, brlCompact, pct, rotuloMes, hoje, dataBR } from "./format";
import type { Lancamento, Funcionario } from "./db";

const ACCENT = "#1AADE2";

export type Secao = "financeiro" | "cliente" | "comercial" | "marketing" | "colaboradores";
export const SECOES: { key: Secao; label: string }[] = [
  { key: "financeiro", label: "Finanças" },
  { key: "comercial", label: "Comercial" },
  { key: "marketing", label: "Marketing" },
  { key: "cliente", label: "Saúde do Cliente" },
  { key: "colaboradores", label: "Colaboradores" },
];

export type DadosApres = {
  metrs: Metrica[];
  lancs: Lancamento[];
  funcs: Funcionario[];
  saldoInicial: number;
  brand: { nome: string; logo: string | null };
};

function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function slug(s: string): string {
  return (s || "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa";
}
function corStatus(s: "ok" | "warn" | "bad"): string {
  return s === "ok" ? "#10B981" : s === "warn" ? "#F59E0B" : "#EF4444";
}
function fmtUnidade(v: number, u: string): string {
  if (u === "BRL") return brl(v);
  if (u === "%") return pct(v);
  if (u === "score") return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function logoOuNome(b: DadosApres["brand"]): string {
  return b.logo ? `<img class="logo" src="${b.logo}" alt="${esc(b.nome)}" />` : `<div class="logo-nome">${esc(b.nome)}</div>`;
}
function bigCard(label: string, valor: string, nota?: string, cor?: string): string {
  return `<div class="card"><div class="card-label">${esc(label)}</div><div class="card-valor"${cor ? ` style="color:${cor}"` : ""}>${esc(valor)}</div>${nota ? `<div class="card-nota">${esc(nota)}</div>` : ""}</div>`;
}
function kpiCard(key: string, metrs: Metrica[]): string {
  const d = def(key); if (!d) return "";
  const { value, pct: p } = ytd(metrs, key);
  const status = statusMeta(p, d.invert);
  const cor = corStatus(status);
  const txt = status === "ok" ? "No ritmo" : status === "warn" ? "Atenção" : "Abaixo";
  const barra = Math.max(0, Math.min(p, 100));
  return `<div class="card kpi"><div class="card-label">${esc(d.label)}</div><div class="card-valor">${esc(fmtUnidade(value, d.unidade))}</div><div class="kpi-bar"><i style="width:${barra}%;background:${cor}"></i></div><div class="kpi-foot"><span class="chip" style="color:${cor};border-color:${cor}55;background:${cor}1a">${txt}</span><span class="kpi-meta">${p}% da meta</span></div></div>`;
}
function blocoArea(cat: Categoria, metrs: Metrica[]): string {
  return CATALOGO.filter((d) => d.categoria === cat).map((d) => kpiCard(d.key, metrs)).join("");
}
function svgFluxo(lancs: Lancamento[], meses: string[], saldoInicial: number): string {
  const serie = serieFluxoMeses(lancs, meses, saldoInicial);
  const W = 1000, H = 420, padL = 70, padR = 24, padT = 24, padB = 56;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...serie.map((p) => Math.max(p.entradas, p.saidas)));
  const slot = plotW / Math.max(1, serie.length);
  const barW = Math.min(48, (slot - 16) / 2), gap = 6;
  let bars = "", labels = "";
  serie.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const hE = (p.entradas / max) * plotH, hS = (p.saidas / max) * plotH;
    bars += `<rect x="${(cx - barW - gap / 2).toFixed(1)}" y="${(padT + plotH - hE).toFixed(1)}" width="${barW.toFixed(1)}" height="${hE.toFixed(1)}" rx="4" fill="#10B981"></rect><rect x="${(cx + gap / 2).toFixed(1)}" y="${(padT + plotH - hS).toFixed(1)}" width="${barW.toFixed(1)}" height="${hS.toFixed(1)}" rx="4" fill="#EF4444"></rect>`;
    labels += `<text x="${cx.toFixed(1)}" y="${(H - padB + 24).toFixed(1)}" class="axis-x">${esc(rotuloMes(p.mes))}</text>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const val = (max / 4) * g, y = padT + plotH - (val / max) * plotH;
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(W - padR).toFixed(1)}" y2="${y.toFixed(1)}" class="grid"></line><text x="${(padL - 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="axis-y">${esc(brlCompact(val))}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">${grid}${bars}${labels}</svg><div class="legend"><span><i style="background:#10B981"></i> Entradas</span><span><i style="background:#EF4444"></i> Saídas</span></div>`;
}
function tabelaColaboradores(funcs: Funcionario[]): string {
  const f = custoFolha(funcs);
  const ativos = funcs.filter((x) => x.ativo);
  const linhas = ativos.length
    ? ativos.map((c) => `<tr><td>${esc(c.nome)}</td><td>${esc(c.cargo || "—")}</td><td style="text-align:right">${esc(brl(c.salario))}</td><td style="text-align:right">${esc(brl(c.salario + c.beneficios))}</td></tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Nenhum colaborador cadastrado.</td></tr>`;
  return `<div class="grid g3" style="margin-top:24px">${bigCard("Colaboradores ativos", String(f.ativos))}${bigCard("Salários / mês", brl(f.salarios))}${bigCard("Custo total folha", brl(f.total), "com benefícios", "#F59E0B")}</div>
    <table class="tbl"><thead><tr><th>Nome</th><th>Cargo</th><th style="text-align:right">Salário</th><th style="text-align:right">Custo total</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

const TITULO_AREA: Record<Categoria, string> = { financeiro: "Financeiro", cliente: "Saúde do Cliente", comercial: "Comercial", marketing: "Marketing" };

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
  .grid{display:grid;gap:18px}.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 24px}
  .card-label{color:var(--muted);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .card-valor{font-size:clamp(24px,3.2vw,40px);font-weight:800;margin-top:8px;letter-spacing:-.02em}
  .card-nota{color:var(--muted);font-size:13px;margin-top:6px}
  .kpi-bar{height:7px;border-radius:99px;background:#1f1f1f;margin:14px 0 10px;overflow:hidden}.kpi-bar i{display:block;height:100%;border-radius:99px}
  .kpi-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
  .kpi-meta{color:var(--muted);font-size:13px;font-weight:600}
  .chart{width:100%;height:auto;display:block}
  line.grid{stroke:#1d1d1d;stroke-width:1}.axis-x{fill:#9aa0a6;font-size:15px;text-anchor:middle}.axis-y{fill:#9aa0a6;font-size:14px;text-anchor:end}
  .legend{display:flex;gap:24px;justify-content:center;margin-top:18px;color:var(--muted);font-weight:600;font-size:15px}.legend span{display:inline-flex;align-items:center;gap:8px}.legend i{width:14px;height:14px;border-radius:4px;display:inline-block}
  .tbl{width:100%;border-collapse:collapse;margin-top:18px;font-size:15px}.tbl th{color:var(--muted);font-size:12px;text-transform:uppercase;text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}.tbl td{padding:11px 12px;border-bottom:1px solid var(--line)}
  @media(max-width:760px){.g2,.g3{grid-template-columns:1fr!important}.grid{gap:12px}.card{padding:18px 18px}.tbl{font-size:13px}.tbl th,.tbl td{padding:8px 8px}}`;
}

function slidesDe(data: DadosApres, meses: string[], secoes: Set<Secao>): { titulo: string; html: string }[] {
  const { metrs, lancs, funcs, saldoInicial } = data;
  const r = resumo(lancs, meses, saldoInicial);
  const out: { titulo: string; html: string }[] = [];
  if (secoes.has("financeiro")) {
    out.push({ titulo: "Resumo financeiro", html: `<div class="grid g3" style="margin-top:34px">${bigCard("Saldo em caixa", brl(r.saldo), "Disponível hoje", r.saldo >= 0 ? "#10B981" : "#EF4444")}${bigCard("Faturamento", brl(r.faturamento), "No período")}${bigCard("Despesas", brl(r.despesas), "No período", "#EF4444")}${bigCard("Lucro", brl(r.lucro), "No período", r.lucro >= 0 ? "#10B981" : "#EF4444")}${bigCard("Margem", pct(r.margem), "Lucro / faturamento")}${bigCard("A receber / a pagar", `${brlCompact(r.aReceber)} / ${brlCompact(r.aPagar)}`, "Em aberto")}</div>` });
    out.push({ titulo: "Fluxo de caixa", html: `<div class="card" style="margin-top:30px;padding:28px 30px">${svgFluxo(lancs, meses, saldoInicial)}</div>` });
    out.push({ titulo: "Indicadores financeiros", html: `<div class="grid g3" style="margin-top:34px">${blocoArea("financeiro", metrs)}</div>` });
  }
  (["cliente", "comercial", "marketing"] as Categoria[]).forEach((cat) => {
    if (secoes.has(cat)) out.push({ titulo: TITULO_AREA[cat], html: `<div class="grid g3" style="margin-top:34px">${blocoArea(cat, metrs)}</div>` });
  });
  if (secoes.has("colaboradores")) out.push({ titulo: "Colaboradores", html: tabelaColaboradores(funcs) });
  return out;
}

function periodoTxt(meses: string[]): string {
  return `${rotuloMes(meses[0])} – ${rotuloMes(meses[meses.length - 1])} (${meses.length} ${meses.length === 1 ? "mês" : "meses"})`;
}

/** Deck de slides navegável. */
export function gerarDeck(data: DadosApres, meses: string[], secoes: Set<Secao>): string {
  const { lancs, saldoInicial, brand } = data;
  const ano = new Date().getFullYear();
  const r = resumo(lancs, meses, saldoInicial);
  const ptxt = periodoTxt(meses);
  const conteudo = slidesDe(data, meses, secoes);

  const slides: string[] = [];
  slides.push(`<section class="slide capa">${logoOuNome(brand)}<h1>Relatório de Resultados <span class="accent">${ano}</span></h1><p class="capa-sub">${esc(ptxt)}</p><p class="muted capa-data">Gerado em ${esc(dataBR(hoje()))} · ${esc(brand.nome)}</p></section>`);
  conteudo.forEach((s) => slides.push(`<section class="slide"><div class="slide-inner"><p class="eyebrow">Visão geral</p><h2>${esc(s.titulo)}</h2>${s.html}</div></section>`));
  slides.push(`<section class="slide capa encerra"><h1>Obrigado<span class="accent">.</span></h1><p class="capa-sub">${esc(brand.nome)}</p><div class="card" style="margin-top:24px;min-width:300px;text-align:center"><div class="card-label">Lucro do período</div><div class="card-valor" style="color:${r.lucro >= 0 ? "#10B981" : "#EF4444"}">${esc(brl(r.lucro))}</div><div class="card-nota">${esc(ptxt)}</div></div><button class="expbtn-big" onclick="exportarPDF()">⬇ Baixar em PDF</button></section>`);

  const total = slides.length;
  const css = `${baseCss()}
    html,body{height:100%;overflow:hidden;background:var(--bg)}
    #deck{position:fixed;inset:0;overflow:hidden;background:var(--bg)}
    /* Palco 16:9 (1280x720) escalado para caber em qualquer tela */
    .stage{position:absolute;top:50%;left:50%;--sw:1280px;--sh:720px;width:var(--sw);height:var(--sh);background:var(--bg);overflow:hidden;
      transform:translate(-50%,-50%) scale(1);transform-origin:center center}
    .slide{position:absolute;inset:0;width:var(--sw);height:var(--sh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:52px 78px;opacity:0;visibility:hidden;overflow:hidden;transition:opacity .35s ease;text-align:center}
    /* colunas fixas dentro do palco (não colapsar no viewport mobile) */
    .stage .g2{grid-template-columns:repeat(2,1fr)!important}
    .stage .g3{grid-template-columns:repeat(3,1fr)!important}
    .slide.active{opacity:1;visibility:visible}
    .slide-inner{width:100%;max-width:1120px;text-align:left}
    .slide h2{font-size:46px;margin-top:6px}
    .capa h1{font-size:78px;margin-top:18px}.capa-sub{font-size:26px;color:var(--accent);font-weight:700;margin-top:18px}.capa-data{margin-top:14px;font-size:16px}.encerra h1{font-size:104px}
    .logo{max-height:150px}.logo-nome{font-size:66px}
    .card-valor{font-size:36px}.card{padding:22px 26px}.grid{gap:20px}
    /* CELULAR: abre na vertical (retrato) — conteúdo empilhado e rolável, sem faixa horizontal */
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
  const { brand } = data;
  const ano = new Date().getFullYear();
  const ptxt = periodoTxt(meses);
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
