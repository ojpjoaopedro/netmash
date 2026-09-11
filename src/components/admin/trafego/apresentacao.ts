/**
 * Gera a "apresentação" (relatório) do tráfego do mês: um HTML próprio, com a
 * identidade do Minhas Métricas, que abre em nova aba e pode ser salvo em PDF
 * pela impressão do navegador. Montado no cliente a partir dos dados já carregados.
 */
import {
  somar, porMes, listaSemanas, mesLabel, agregarCriativosMes, cCpl,
  cpm, cpc, ctr, cpl, conv, brl, num, pct, type Resultado, type Criativo,
} from "@/lib/trafego";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function gerarApresentacao(rows: Resultado[], criativos: Criativo[], mes: string, imposto: string) {
  const doMes = rows.filter((r) => r.mes === mes);
  const cMes = criativos.filter((c) => c.mes === mes);
  const total = somar(doMes);
  const fator = 1 + (Number(String(imposto).replace(",", ".")) || 0) / 100;

  const hist = porMes(rows);
  const idx = hist.findIndex((h) => h.mes === mes);
  const atual = idx >= 0 ? hist[idx] : null;
  const ant = idx > 0 ? hist[idx - 1] : null;
  let analise = "";
  if (atual && ant && atual.cpl != null && ant.cpl != null) {
    const dc = ((atual.cpl - ant.cpl) / ant.cpl) * 100;
    const dl = ant.leads > 0 ? ((atual.leads - ant.leads) / ant.leads) * 100 : 0;
    analise = `Em relação a ${ant.label}, o custo por lead ${dc < 0 ? "caiu" : "subiu"} ${Math.abs(dc).toFixed(0)}% e os leads ${dl >= 0 ? "cresceram" : "caíram"} ${Math.abs(dl).toFixed(0)}%.`;
  }

  const semanas = listaSemanas(mes).map((s) => ({ s, a: somar(doMes.filter((r) => r.semana === s)) })).filter(({ a }) => a.investido > 0 || a.leads > 0 || a.impressoes > 0);

  const kpi = (rot: string, val: string, cor: string) => `<div class="kpi"><span class="dot" style="background:${cor}"></span><div class="rot">${rot}</div><div class="val">${val}</div></div>`;

  const etapa = (nome: string, larg: string, grad: string, badges: [string, string][]) =>
    `<div class="et"><div class="trap" style="width:${larg};background:${grad}">${nome}</div><div class="bd">${badges.map(([l, v]) => `<span><b>${v}</b>${l}</span>`).join("")}</div></div>`;

  const linhasSemana = semanas.map(({ s, a }) =>
    `<tr><td>Semana ${s}</td><td>${brl(a.investido, 0)}</td><td>${num(a.leads)}</td><td>${brl(cpl(a))}</td><td>${brl(cpc(a))}</td><td>${pct(ctr(a))}</td></tr>`).join("");

  const porCamp = (() => {
    const m = new Map<string, Resultado[]>();
    doMes.forEach((r) => { const k = r.campanha.trim().toLowerCase(); m.set(k, [...(m.get(k) || []), r]); });
    return [...m.values()].map((rs) => ({ nome: rs[0].campanha, a: somar(rs) })).sort((x, y) => y.a.leads - x.a.leads);
  })();
  const linhasCamp = porCamp.map(({ nome, a }) =>
    `<tr><td>${esc(nome)}</td><td>${brl(a.investido, 0)}</td><td>${num(a.leads)}</td><td>${brl(cpl(a))}</td><td>${brl(cpc(a))}</td><td>${pct(ctr(a))}</td></tr>`).join("");

  const topCriativos = agregarCriativosMes(cMes).slice(0, 6).map((c, i) => `
    <div class="cr">
      <div class="crm">${c.midia_url ? `<img src="${esc(c.midia_url)}" alt="">` : ""}<span class="rk">${i + 1}º</span></div>
      <div class="crd"><b>${esc(c.titulo || "Anúncio")}</b><div class="crs"><span>${num(c.leads)} leads</span><span>${brl(cCpl(c))}/lead</span></div></div>
    </div>`).join("");

  const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tráfego Pago · ${mesLabel(mes)} · Minhas Métricas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
body{background:#f4f6fb;color:#0f172a;padding:32px 20px}
.page{max-width:900px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px -30px rgba(0,0,0,.3)}
.hd{background:linear-gradient(135deg,#1AADE2,#0e7ba6);color:#fff;padding:34px 36px}
.hd .t{font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.9}
.hd h1{font-size:30px;font-weight:900;margin-top:6px}
.hd p{opacity:.9;margin-top:6px;font-size:14px}
.sec{padding:26px 36px;border-top:1px solid #eef1f6}
.sec h2{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:16px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.kpi{background:#f8fafc;border:1px solid #eef1f6;border-radius:14px;padding:16px}
.kpi .dot{width:10px;height:10px;border-radius:99px;display:block;margin-bottom:10px}
.kpi .rot{font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.kpi .val{font-size:24px;font-weight:900;margin-top:4px}
.et{display:flex;align-items:center;gap:18px;margin-bottom:12px}
.trap{min-width:150px;height:52px;border-radius:12px;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;clip-path:polygon(6% 0,94% 0,82% 100%,18% 100%)}
.bd{display:flex;gap:10px;flex-wrap:wrap}
.bd span{background:#f8fafc;border:1px solid #eef1f6;border-radius:10px;padding:6px 12px;font-size:12px;color:#64748b;display:flex;flex-direction:column}
.bd b{font-size:15px;color:#0f172a}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 12px}
th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8}
tbody tr{border-top:1px solid #eef1f6}
td:first-child{font-weight:700}
.an{background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:16px;font-size:15px;line-height:1.5}
.crs2{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.cr{border:1px solid #eef1f6;border-radius:12px;overflow:hidden;background:#fff}
.crm{position:relative;aspect-ratio:4/5;background:#0b1220}
.crm img{width:100%;height:100%;object-fit:contain}
.crm .rk{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:2px 8px}
.crd{padding:10px}.crd b{font-size:13px}.crs{display:flex;gap:10px;margin-top:4px;font-size:12px;color:#64748b}
.ft{padding:20px 36px;color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #eef1f6}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;max-width:100%}.noprint{display:none}}
.bar{position:fixed;top:16px;right:16px}
.bar button{cursor:pointer;background:#1AADE2;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:800;font-size:14px}
</style></head><body>
<div class="bar noprint"><button onclick="window.print()">Salvar em PDF</button></div>
<div class="page">
  <div class="hd"><div class="t">Relatório de Tráfego Pago</div><h1>${mesLabel(mes)}</h1><p>Minhas Métricas · gerado em ${new Date().toLocaleDateString("pt-BR")}</p></div>
  <div class="sec"><h2>Resumo do mês</h2><div class="kpis">
    ${kpi("Investido (mídia)", brl(total.investido, 0), "#10B981")}
    ${kpi("Leads", num(total.leads), "#8b5cf6")}
    ${kpi("Custo por lead", brl(cpl(total)), "#F59E0B")}
    ${kpi("Investido c/ imposto", brl(total.investido * fator, 0), "#EF4444")}
  </div></div>
  <div class="sec"><h2>Funil de marketing</h2>
    ${etapa("Conhecimento", "100%", "linear-gradient(90deg,#ec4899,#e11d48)", [["Impressões", num(total.impressoes)], ["CPM", brl(cpm(total))]])}
    ${etapa("Consideração", "82%", "linear-gradient(90deg,#d946ef,#9333ea)", [["Cliques", num(total.cliques)], ["CPC", brl(cpc(total))], ["CTR", pct(ctr(total))]])}
    ${etapa("Captação", "64%", "linear-gradient(90deg,#8b5cf6,#6366f1)", [["Leads", num(total.leads)], ["CPL", brl(cpl(total))], ["Conversão LP", pct(conv(total))]])}
  </div>
  ${analise ? `<div class="sec"><h2>Análise</h2><div class="an">${esc(analise)}</div></div>` : ""}
  ${linhasSemana ? `<div class="sec"><h2>Por semana</h2><table><thead><tr><th>Semana</th><th>Investido</th><th>Leads</th><th>CPL</th><th>CPC</th><th>CTR</th></tr></thead><tbody>${linhasSemana}</tbody></table></div>` : ""}
  ${linhasCamp ? `<div class="sec"><h2>Por campanha</h2><table><thead><tr><th>Campanha</th><th>Investido</th><th>Leads</th><th>CPL</th><th>CPC</th><th>CTR</th></tr></thead><tbody>${linhasCamp}</tbody></table></div>` : ""}
  ${topCriativos ? `<div class="sec"><h2>Melhores criativos</h2><div class="crs2">${topCriativos}</div></div>` : ""}
  <div class="ft">Minhas Métricas · relatório automático de tráfego pago</div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
