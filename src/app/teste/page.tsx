"use client";
import { useEffect, useState } from "react";

/* ============================================================================
   Página de vendas — Minhas Métricas
   Identidade: navy profundo + gradiente ciano→verde (mesma da logo/ícone).
   Visual tech, animações de scroll, mockups do app em CSS.
   ============================================================================ */

const CSS = `
.lp{--navy:#070E1F;--navy2:#0B1A38;--card:#0E1B34;--ink:#EAF1FC;--muted:#93A6C7;--line:rgba(120,170,255,.14);
  --cyan:#22C7F5;--teal:#1AD1B0;--green:#5BE36B;--grad:linear-gradient(90deg,#22C7F5,#1AD1B0,#5BE36B);
  background:var(--navy);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  overflow-x:hidden;line-height:1.55;-webkit-font-smoothing:antialiased}
.lp *{box-sizing:border-box}
.lp a{color:inherit;text-decoration:none}
.lp .wrap{width:100%;max-width:1140px;margin:0 auto;padding:0 26px}
.lp .grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.lp .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--cyan);padding:7px 13px;border-radius:99px;
  background:rgba(34,199,245,.08);border:1px solid rgba(34,199,245,.22)}
.lp h2.sec{font-size:clamp(22px,3.6vw,33px);font-weight:800;letter-spacing:-.03em;line-height:1.14;margin:18px 0 14px;text-wrap:balance}
.lp p.lead{color:var(--muted);font-size:clamp(14px,1.9vw,15.5px);max-width:54ch;line-height:1.65}
.lp .eyebrow{font-size:11px}

/* fundo tech global */
.lp .bg{position:fixed;inset:0;z-index:0;pointer-events:none}
.lp .bg .grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(90,150,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(90,150,255,.05) 1px,transparent 1px);
  background-size:52px 52px;mask-image:radial-gradient(120% 80% at 50% 0%,#000 30%,transparent 78%)}
.lp .bg .glow{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5}
.lp .bg .g1{top:-160px;right:-120px;width:520px;height:520px;background:radial-gradient(circle,#1670c8,transparent 62%)}
.lp .bg .g2{top:640px;left:-180px;width:520px;height:520px;background:radial-gradient(circle,#12a67e,transparent 62%);opacity:.35}
.lp .content{position:relative;z-index:1}

/* NAV */
.lp nav{position:sticky;top:0;z-index:40;backdrop-filter:blur(12px);background:rgba(7,14,31,.72);border-bottom:1px solid var(--line)}
.lp .navrow{display:flex;align-items:center;justify-content:space-between;height:56px;width:100%;padding:0 22px;gap:12px}
.lp nav img{height:30px;width:auto;max-width:none;flex:0 0 auto;object-fit:contain;display:block}
.lp nav .links{display:flex;align-items:center;gap:8px}
.lp .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:800;cursor:pointer;
  border:0;border-radius:99px;transition:transform .15s ease,box-shadow .15s ease,background .15s ease;white-space:nowrap;text-align:center}
.lp .btn:active{transform:scale(.97)}
.lp .btn.g{background:var(--grad);color:#05121f;padding:12px 22px;font-size:15px;box-shadow:0 12px 30px -10px rgba(34,199,245,.5)}
.lp .btn.g:hover{box-shadow:0 16px 40px -10px rgba(34,199,245,.7)}
.lp .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);padding:11px 20px;font-size:14.5px}
.lp .btn.ghost:hover{background:rgba(120,170,255,.08)}
.lp .btn.sm{padding:7px 13px;font-size:12px}
.lp .navrow .links{gap:8px}
.lp .btn.lg{padding:16px 30px;font-size:16.5px}
.lp .nav-link{color:var(--muted);font-size:14.5px;font-weight:600;padding:8px 12px;border-radius:10px}
.lp .nav-link:hover{color:var(--ink)}
@media(max-width:760px){.lp .nav-only-desk{display:none}}

/* HERO */
.lp .hero{padding:104px 0 76px;display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center}
@media(max-width:940px){.lp .hero{grid-template-columns:1fr;gap:52px;padding:64px 0 28px}}
.lp .hero h1{font-size:clamp(29px,5vw,48px);font-weight:850;letter-spacing:-.035em;line-height:1.06;margin:22px 0 20px;text-wrap:balance}
.lp .hero .sub{color:var(--muted);font-size:clamp(14.5px,2vw,16.5px);max-width:50ch;line-height:1.65}
.lp .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.lp .microcopy{margin-top:14px;color:var(--muted);font-size:13px;display:flex;align-items:center;gap:8px}
.lp .dotgreen{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}

/* phone mock */
.lp .phone{position:relative;justify-self:center;width:290px;height:588px;border-radius:44px;padding:11px;
  background:linear-gradient(160deg,#182a4d,#0a1428 60%,#0a1428);border:1px solid rgba(120,170,255,.22);
  box-shadow:0 40px 90px -30px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.14);animation:bob 6s ease-in-out infinite}
.lp .phone .scr{width:100%;height:100%;border-radius:34px;overflow:hidden;background:#F3F5FA;position:relative}
.lp .float{position:absolute;z-index:2;border-radius:16px;padding:12px 14px;background:rgba(14,27,52,.9);border:1px solid var(--line);
  backdrop-filter:blur(8px);box-shadow:0 20px 50px -18px rgba(0,0,0,.7)}
.lp .float.f1{top:56px;left:-42px;animation:bob 5s ease-in-out infinite}
.lp .float.f2{bottom:70px;right:-36px;animation:bob 5.6s ease-in-out .4s infinite}
.lp .float .fl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:800}
.lp .float .fv{font-size:19px;font-weight:800}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}

/* mini app (dentro do phone) */
.lp .app{font-size:11px;color:#0e1830;height:100%;display:flex;flex-direction:column}
.lp .app .top{display:flex;align-items:center;justify-content:space-between;padding:13px 13px 8px;background:#fff}
.lp .app .top .bars{display:flex;flex-direction:column;gap:3px}
.lp .app .top .bars i{width:17px;height:2px;background:var(--cyan);border-radius:2px}
.lp .app .quote{margin:8px 12px;padding:12px;border-radius:14px;background:#fff;border:1px solid #e6ebf5;box-shadow:0 8px 20px -16px rgba(0,0,0,.4)}
.lp .app .quote p{margin:0;font-style:italic;font-weight:700;font-size:11px;color:#0e1830}
.lp .app .share{margin-top:9px;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;color:#fff;
  background:linear-gradient(45deg,#f09433,#dc2743,#bc1888);border-radius:99px;padding:7px 12px}
.lp .app .blue{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:0 12px 10px}
.lp .app .bcard{min-height:62px;border-radius:13px;padding:9px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;
  background:linear-gradient(155deg,#22a7ea,#0E2E5C);box-shadow:0 10px 20px -14px rgba(20,60,140,.9)}
.lp .app .bcard .ci{width:26px;height:26px;border-radius:9px;background:rgba(255,255,255,.22)}
.lp .app .bcard b{font-size:9.5px;font-weight:800}
.lp .app .gray{flex:1;background:#eef2f8;border-radius:18px 18px 0 0;padding:12px;margin-top:2px}
.lp .app .wgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}
.lp .app .wcard{background:#fff;border:1px solid #e6ebf5;border-radius:13px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:6px}
.lp .app .wcard .wi{width:30px;height:30px;border-radius:10px;background:linear-gradient(150deg,rgba(34,199,245,.28),rgba(34,199,245,.1));border:1px solid rgba(34,199,245,.3)}
.lp .app .wcard span{font-size:8.5px;font-weight:800;color:#334}
.lp .app .panel{margin-top:10px;background:#fff;border:1px solid #e6ebf5;border-radius:14px;padding:11px}
.lp .app .panel b{font-size:11px}
.lp .spark{margin-top:8px;height:52px;width:100%}

/* faixa de logos/prova */
.lp .proof{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0;margin-top:26px;background:rgba(11,26,56,.35)}
.lp .proof .in{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px 26px}
.lp .chip{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--muted)}
.lp .chip b{color:var(--ink)}

/* seções */
.lp section{padding:112px 0}
@media(max-width:760px){.lp section{padding:74px 0}}
.lp .center{text-align:center;display:flex;flex-direction:column;align-items:center}

/* dores */
.lp .pains{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:64px}
@media(max-width:820px){.lp .pains{grid-template-columns:1fr}}
.lp .pain{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:28px 24px}
.lp .ic-tile{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;color:var(--cyan);
  background:linear-gradient(150deg,rgba(34,199,245,.24),rgba(34,199,245,.06));border:1px solid rgba(34,199,245,.30);
  box-shadow:0 12px 24px -12px rgba(34,199,245,.55),inset 0 1px 0 rgba(255,255,255,.12)}
.lp .pain b{display:block;margin:16px 0 8px;font-size:17px}
.lp .pain p{margin:0;color:var(--muted);font-size:14.5px}
.lp .chip svg{color:var(--cyan)}

/* features */
.lp .feat{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center;margin-top:96px}
.lp .feat.rev{grid-template-columns:.95fr 1.05fr}
.lp .feat.rev .txt{order:2}
@media(max-width:900px){.lp .feat,.lp .feat.rev{grid-template-columns:1fr;gap:24px}.lp .feat.rev .txt{order:0}}
.lp .feat .txt h3{font-size:clamp(19px,2.6vw,25px);font-weight:800;letter-spacing:-.02em;margin:16px 0 12px}
.lp .feat .txt p{color:var(--muted);font-size:14.5px;line-height:1.65}
.lp .ticks{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:11px}
.lp .ticks li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--ink)}
.lp .ticks svg{flex-shrink:0;margin-top:2px}
.lp .glass{background:linear-gradient(160deg,rgba(20,36,68,.7),rgba(10,20,40,.55));border:1px solid var(--line);border-radius:22px;padding:20px;
  box-shadow:0 30px 70px -34px rgba(0,0,0,.8);position:relative;overflow:hidden}
.lp .glass::before{content:"";position:absolute;left:0;right:0;top:0;height:80px;background:radial-gradient(160px 60px at 50% -10%,rgba(34,199,245,.22),transparent 70%);pointer-events:none}

/* mock: browser dashboard */
.lp .win{border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#0c1730}
.lp .win .bar{display:flex;align-items:center;gap:6px;padding:10px 12px;background:#0a1327;border-bottom:1px solid var(--line)}
.lp .win .bar i{width:9px;height:9px;border-radius:50%;background:#26406e}
.lp .win .body{padding:14px;display:grid;gap:12px}
.lp .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.lp .kpi{background:#0f1c38;border:1px solid var(--line);border-radius:12px;padding:12px}
.lp .kpi .l{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:800}
.lp .kpi .v{font-size:18px;font-weight:800;margin-top:4px}
.lp .barsrow{display:flex;align-items:flex-end;gap:8px;height:96px;padding:6px 2px 0}
.lp .barsrow .b{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#22C7F5,#1670c8);opacity:.9}

/* números */
.lp .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:8px}
@media(max-width:760px){.lp .stats{grid-template-columns:1fr 1fr}}
.lp .stat{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px 14px}
.lp .stat .n{font-size:clamp(22px,3.4vw,30px);font-weight:850;letter-spacing:-.02em}
.lp .stat .c{color:var(--muted);font-size:12.5px;margin-top:5px}

/* pricing */
.lp .toggle{display:inline-flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:99px;padding:5px;margin-top:18px}
.lp .toggle button{border:0;background:transparent;color:var(--muted);font-family:inherit;font-weight:800;font-size:13.5px;padding:9px 18px;border-radius:99px;cursor:pointer}
.lp .toggle button.on{background:var(--grad);color:#05121f}
.lp .save{font-size:12px;font-weight:800;color:var(--green)}
.lp .plans{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:58px;align-items:stretch;max-width:800px;margin-inline:auto}
@media(max-width:760px){.lp .plans{grid-template-columns:1fr;max-width:420px}}
.lp .plan{position:relative;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px 22px;display:flex;flex-direction:column}
.lp .plan.pop{border-color:rgba(34,199,245,.55);box-shadow:0 30px 70px -30px rgba(34,199,245,.35);background:linear-gradient(180deg,rgba(20,40,74,.7),var(--card))}
.lp .plan .badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--grad);color:#05121f;font-size:11px;font-weight:800;padding:5px 14px;border-radius:99px;letter-spacing:.04em}
.lp .plan .pn{font-size:14px;font-weight:800;letter-spacing:.02em}
.lp .plan .pd{color:var(--muted);font-size:13px;margin-top:4px;min-height:34px}
.lp .plan .price{display:flex;align-items:flex-end;gap:6px;margin:14px 0 2px}
.lp .plan .price .cur{font-size:16px;font-weight:800;color:var(--muted);margin-bottom:6px}
.lp .plan .price .amt{font-size:34px;font-weight:850;letter-spacing:-.03em;line-height:1}
.lp .plan .price .per{color:var(--muted);font-size:13px;margin-bottom:6px}
.lp .plan .eq{color:var(--muted);font-size:12.5px;min-height:18px}
.lp .plan ul{list-style:none;padding:0;margin:18px 0 22px;display:grid;gap:10px}
.lp .plan li{display:flex;gap:9px;font-size:14px;color:var(--ink)}
.lp .plan li svg{flex-shrink:0;margin-top:2px}
.lp .plan .btn{margin-top:auto;width:100%}

/* depoimentos */
.lp .quotes{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:64px}
@media(max-width:900px){.lp .quotes{grid-template-columns:1fr}}
.lp .q{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px}
.lp .q p{margin:0 0 18px;font-size:13.5px;line-height:1.7;color:#cdd9ef}
.lp .q .who{display:flex;align-items:center;gap:11px}
.lp .q .av{width:38px;height:38px;border-radius:50%;background:var(--grad);display:grid;place-items:center;font-weight:800;color:#05121f;font-size:14px}
.lp .q .who b{font-size:13.5px;display:block}
.lp .q .who span{font-size:12px;color:var(--muted)}
.lp .stars{color:#FFC53D;font-size:13px;letter-spacing:2px;margin-bottom:10px}

/* faq */
.lp .faq{max-width:800px;margin:58px auto 0;display:grid;gap:13px}
.lp .fitem{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.lp .fq{width:100%;text-align:left;background:transparent;border:0;color:var(--ink);font-family:inherit;font-weight:700;font-size:14.5px;
  padding:18px 20px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:14px}
.lp .fq .pm{transition:transform .25s ease;color:var(--cyan);font-size:20px;flex-shrink:0}
.lp .fitem.open .pm{transform:rotate(45deg)}
.lp .fa{max-height:0;overflow:hidden;transition:max-height .3s ease}
.lp .fitem.open .fa{max-height:240px}
.lp .fa p{margin:0;padding:0 20px 19px;color:var(--muted);font-size:13.5px;line-height:1.65}

/* cta final */
.lp .final{margin:10px 0 0}
.lp .final .box{position:relative;overflow:hidden;border-radius:26px;padding:52px 28px;text-align:center;
  background:linear-gradient(150deg,#0d2a56,#0a1730);border:1px solid rgba(34,199,245,.3)}
.lp .final .box::after{content:"";position:absolute;inset:0;background:radial-gradient(500px 200px at 50% -20%,rgba(34,199,245,.28),transparent 70%);pointer-events:none}

/* footer */
.lp footer{border-top:1px solid var(--line);padding:34px 0;margin-top:60px;color:var(--muted);font-size:13px}
.lp footer .row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:center}
.lp footer img{height:28px;width:auto;flex:0 0 auto;object-fit:contain;opacity:.9}

/* ===== ENTRADA (reveal + stagger) ===== */
.lp .rv{opacity:0;transform:translateY(28px) scale(.985);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}
.lp .rv.rv-in{opacity:1;transform:none}
.lp .pains .rv:nth-child(2),.lp .quotes .rv:nth-child(2),.lp .plans .rv:nth-child(2){transition-delay:.12s}
.lp .pains .rv:nth-child(3),.lp .quotes .rv:nth-child(3){transition-delay:.24s}
.lp .stats .rv:nth-child(2){transition-delay:.08s}.lp .stats .rv:nth-child(3){transition-delay:.16s}.lp .stats .rv:nth-child(4){transition-delay:.24s}
.lp .hero > div:first-child > *{opacity:0;animation:heroIn .8s cubic-bezier(.2,.7,.2,1) forwards}
.lp .hero > div:first-child > *:nth-child(1){animation-delay:.05s}
.lp .hero > div:first-child > *:nth-child(2){animation-delay:.16s}
.lp .hero > div:first-child > *:nth-child(3){animation-delay:.27s}
.lp .hero > div:first-child > *:nth-child(4){animation-delay:.38s}
.lp .hero > div:first-child > *:nth-child(5){animation-delay:.49s}
@keyframes heroIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* ===== LOOPS ===== */
.lp .spark .ln{stroke-dasharray:600;stroke-dashoffset:600;animation:draw 2.4s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.lp .spark circle{transform-origin:center;animation:pulseDot 2s ease-in-out infinite}
@keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.35}}
.lp .btn.pulse{animation:ctaPulse 2.8s ease-in-out infinite}
@keyframes ctaPulse{0%,100%{box-shadow:0 12px 30px -10px rgba(34,199,245,.5)}50%{box-shadow:0 14px 46px -6px rgba(34,199,245,.9)}}
.lp .plan.pop{animation:popGlow 3.4s ease-in-out infinite}
@keyframes popGlow{0%,100%{box-shadow:0 30px 70px -30px rgba(34,199,245,.3)}50%{box-shadow:0 34px 84px -26px rgba(34,199,245,.55)}}
.lp .hero h1 .grad{background-size:220% auto;animation:shimmer 7s linear infinite}
@keyframes shimmer{to{background-position:220% center}}
.lp .dotgreen{animation:dotPulse 1.9s ease-in-out infinite}
@keyframes dotPulse{0%,100%{box-shadow:0 0 10px var(--green);opacity:1}50%{box-shadow:0 0 18px var(--green);opacity:.6}}
.lp .bg .g1{animation:drift1 22s ease-in-out infinite}
.lp .bg .g2{animation:drift2 26s ease-in-out infinite}
@keyframes drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,30px)}}
@keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}
.lp .eyebrow{transition:border-color .3s}
.lp .plan{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.lp .plan:hover{transform:translateY(-5px);border-color:rgba(34,199,245,.45)}
.lp .pain,.lp .q{transition:transform .18s ease,border-color .18s ease}
.lp .pain:hover,.lp .q:hover{transform:translateY(-4px);border-color:rgba(34,199,245,.3)}

@media(prefers-reduced-motion:reduce){
  .lp .rv{opacity:1;transform:none;transition:none}
  .lp .hero > div:first-child > *{opacity:1;animation:none}
  .lp .phone,.lp .float,.lp .btn.pulse,.lp .plan.pop,.lp .hero h1 .grad,.lp .dotgreen,.lp .bg .g1,.lp .bg .g2,.lp .spark circle{animation:none}
  .lp .spark .ln{stroke-dasharray:none!important;stroke-dashoffset:0!important}
}
`;

function Ico({ n, size = 22 }: { n: string; size?: number }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (n) {
    case "chart": return <svg {...c}><path d="M3 3v18h18" /><path d="M7 14l3.5-4 3 2.6L21 6" /></svg>;
    case "doc": return <svg {...c}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8M8 17h6" /></svg>;
    case "calendar": return <svg {...c}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>;
    case "table": return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></svg>;
    case "eyeoff": return <svg {...c}><path d="M2 12s3.6-6.2 10-6.2S22 12 22 12s-3.6 6.2-10 6.2S2 12 2 12z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></svg>;
    case "clock": return <svg {...c}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.4 2" /></svg>;
    case "phone": return <svg {...c}><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M11 18.5h2" /></svg>;
    case "shield": return <svg {...c}><path d="M12 2.5l7.5 3.2v5.8c0 5-3.2 8.2-7.5 11-4.3-2.8-7.5-6-7.5-11V5.7z" /><path d="M9 12l2 2 4-4.5" /></svg>;
    case "zap": return <svg {...c}><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg>;
    case "spark": return <svg {...c}><path d="M12 3l1.7 4.6L18 9l-4.3 1.6L12 15l-1.7-4.4L6 9l4.3-1.4z" /><path d="M18.5 14.5l.8 2.3L21.5 18l-2.2.8-.8 2.2-.8-2.2L15.5 18l2.2-1.2z" /></svg>;
    case "users": return <svg {...c}><circle cx="9" cy="8" r="3.3" /><path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6S15 16.6 15 20" /><path d="M16 5.5a3 3 0 0 1 0 5.7M21.2 20c0-2.5-1.2-4.3-3-5.2" /></svg>;
    case "brazil": return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9z" /></svg>;
    case "layers": return <svg {...c}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>;
    default: return null;
  }
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="rgba(34,199,245,.14)" />
      <path d="M7 12.5l3.2 3.2L17 8.8" stroke="#1AD1B0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spark() {
  return (
    <svg className="spark" viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="240" y2="0">
          <stop offset="0" stopColor="#22C7F5" /><stop offset="0.6" stopColor="#1AD1B0" /><stop offset="1" stopColor="#5BE36B" />
        </linearGradient>
        <linearGradient id="spa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22C7F5" stopOpacity="0.25" /><stop offset="1" stopColor="#22C7F5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M4 46 L44 40 L84 43 L124 30 L164 33 L204 15 L236 10 L236 60 L4 60 Z" fill="url(#spa)" />
      <path className="ln" d="M4 46 L44 40 L84 43 L124 30 L164 33 L204 15 L236 10" fill="none" stroke="url(#sp)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="236" cy="10" r="3.4" fill="#EAFBF0" />
    </svg>
  );
}

const FEATURES = [
  {
    tag: "Finanças & DRE", h: "Seu resultado real, sem planilha",
    p: "Monte a estrutura de receitas e custos uma vez e o painel calcula tudo: lucro, margem e EBITDA. Gere o DRE (reduzido ou completo) pronto para imprimir ou salvar em PDF.",
    ticks: ["DRE automático em PDF", "Lucro, margem e EBITDA", "Custos fixos e variáveis organizados"],
    mock: "dre", ico: "doc",
  },
  {
    tag: "Calendário financeiro", h: "Todo dinheiro que entra e sai, por data",
    p: "Lance contas a pagar e a receber pelo calendário, com recorrências e baixa dos pagamentos. Veja o que está previsto, pago, a pagar e vencido de um jeito visual.",
    ticks: ["Contas a pagar e a receber", "Recorrências e provisionamento", "Situação das cobranças (hoje, mês, ano ou período)"],
    mock: "cal", ico: "calendar",
  },
  {
    tag: "Dashboard & relatórios", h: "Decisões com clareza, na palma da mão",
    p: "Faturamento x despesas mês a mês, composição por canal e por custo, e relatórios prontos (Receita x Custos, Gráficos e Relatório da equipe). No celular e no computador.",
    ticks: ["Gráficos de evolução e composição", "Relatórios prontos para PDF", "Assistente com IA para ler seus números"],
    mock: "dash", ico: "chart",
  },
];

function MockDRE() {
  const linhas = [
    ["Receita Operacional Bruta", "R$ 298.590", true],
    ["Comercial (B2C)", "R$ 200.740", false],
    ["Escolas (B2B)", "R$ 71.120", false],
    ["(-) Custos e Despesas", "R$ 278.156", true],
    ["(=) Resultado do período", "+ R$ 20.433", true],
    ["EBITDA", "R$ 33.477", false],
  ];
  return (
    <div className="glass">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontSize: 14 }}>Demonstração de Resultado (DRE)</b>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#1AD1B0", background: "rgba(26,209,176,.12)", padding: "4px 10px", borderRadius: 99 }}>PDF</span>
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {linhas.map(([a, b, forte], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 11px", borderRadius: 9,
            background: forte ? "rgba(120,170,255,.07)" : "transparent", fontWeight: forte ? 800 : 500,
            color: String(a).includes("Resultado") ? "#5BE36B" : "var(--ink)" }}>
            <span style={{ color: forte ? "var(--ink)" : "var(--muted)" }}>{a}</span><span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCal() {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const marc: Record<number, string> = { 5: "g", 10: "r", 12: "g", 18: "r", 23: "g", 27: "r" };
  return (
    <div className="glass">
      <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 12, color: "var(--muted)" }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#5BE36B", marginRight: 6 }} />Faturamento</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#F43F5E", marginRight: 6 }} />Despesas</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
        {dias.map((d) => (
          <div key={d} style={{ aspectRatio: "1", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11,
            background: marc[d] ? (marc[d] === "g" ? "rgba(91,227,107,.16)" : "rgba(244,63,94,.16)") : "rgba(120,170,255,.05)",
            border: `1px solid ${marc[d] ? (marc[d] === "g" ? "rgba(91,227,107,.4)" : "rgba(244,63,94,.4)") : "var(--line)"}`,
            color: "var(--ink)", fontWeight: marc[d] ? 800 : 500 }}>{d}</div>
        ))}
      </div>
    </div>
  );
}

function MockDash() {
  return (
    <div className="win">
      <div className="bar"><i /><i /><i /><span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>painel · minhas métricas</span></div>
      <div className="body">
        <div className="kpis">
          <div className="kpi"><div className="l">Faturamento</div><div className="v" style={{ color: "#5BE36B" }}>R$ 298k</div></div>
          <div className="kpi"><div className="l">Despesas</div><div className="v" style={{ color: "#F43F5E" }}>R$ 278k</div></div>
          <div className="kpi"><div className="l">Resultado</div><div className="v grad">+R$ 20k</div></div>
        </div>
        <div style={{ background: "#0f1c38", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>FATURAMENTO MÊS A MÊS</div>
          <div className="barsrow">
            {[40, 48, 39, 43, 56, 71, 62, 58, 66, 74, 80, 88].map((h, i) => <div key={i} className="b" style={{ height: `${h}%` }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  ["Preciso colocar cartão para testar?", "Você começa com um teste grátis para explorar tudo. É simples ativar e você só continua se gostar."],
  ["Funciona no celular e no computador?", "Sim. O Minhas Métricas foi feito para os dois: um app leve no celular e o painel completo no computador, com os mesmos dados sincronizados."],
  ["Preciso entender de finanças ou de contabilidade?", "Não. Você preenche suas receitas e custos em linguagem do dia a dia e o painel monta o DRE, os gráficos e os indicadores automaticamente."],
  ["Posso cancelar quando quiser?", "Pode. Sem fidelidade e sem multa. Você cancela quando quiser, direto no painel."],
  ["Meus dados ficam seguros?", "Sim. Cada empresa tem seu acesso e seus dados isolados, com login próprio e permissões por usuário."],
  ["Consigo colocar minha equipe?", "Sim. Você cadastra sua equipe, define permissões e, nos planos com mais usuários, dá acesso a administradores adicionais."],
  ["O DRE sai pronto para o contador?", "Sim. Você gera o DRE (reduzido ou completo) e salva em PDF para enviar ao contador ou aos sócios em segundos."],
];

export default function LP() {
  const [anual, setAnual] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  useEffect(() => {
    document.title = "Minhas Métricas — o financeiro da sua empresa, simples e no controle";
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    document.querySelectorAll(".lp .rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const planos = [
    {
      nome: "Essencial", desc: "Tudo para colocar o financeiro da sua empresa no controle.",
      mensal: "79,90", anualMes: "66,58", anualTotal: "799", pop: true,
      itens: ["Painel financeiro completo", "DRE automático em PDF", "Calendário de contas a pagar/receber", "Dashboard e gráficos", "Situação das cobranças", "Assistente com IA", "1 usuário"],
      cta: "Começar grátis",
    },
    {
      nome: "Escala", desc: "Vários CNPJs, franquias, redes e contadores.",
      mensal: null, anualMes: null, anualTotal: null, pop: false,
      itens: ["Vários CNPJs / carteira de clientes", "White-label com sua marca", "Usuários ilimitados", "Onboarding dedicado", "Gestor de conta"],
      cta: "Falar com o time",
    },
  ];

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bg"><div className="grid" /><div className="glow g1" /><div className="glow g2" /></div>

      <div className="content">
        {/* NAV */}
        <nav>
          <div className="navrow">
            <img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" />
            <div className="links">
              <a className="btn ghost sm nav-only-desk" href="/login">Entrar</a>
              <a className="btn g sm" href="/login">Testar grátis</a>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="wrap hero">
          <div>
            <span className="eyebrow">● Financeiro inteligente para o seu negócio</span>
            <h1>O financeiro da sua empresa, <span className="grad">simples e no controle</span>.</h1>
            <p className="sub">Chega de planilha bagunçada. Transforme suas receitas e custos em DRE, gráficos e decisões, no celular e no computador. <b style={{ color: "var(--ink)" }}>Enquanto você cuida do seu negócio, nós cuidamos dos números.</b></p>
            <div className="cta-row">
              <a className="btn g lg pulse" href="/login">Comece grátis</a>
            </div>
            <div className="microcopy"><span className="dotgreen" /> Sem fidelidade · cancele quando quiser</div>
          </div>

          <div className="phone">
            <div className="float f1"><div className="fl">Resultado do mês</div><div className="fv grad">+ R$ 20.433</div></div>
            <div className="float f2"><div className="fl">Margem</div><div className="fv" style={{ color: "#5BE36B" }}>6,8%</div></div>
            <div className="scr">
              <div className="app">
                <div className="top"><div className="bars"><i /><i /><i /></div><div style={{ display: "flex", gap: 7, color: "#22C7F5" }}><Ico n="chart" size={15} /><Ico n="users" size={15} /></div></div>
                <div className="quote">
                  <p>“Caixa não é lucro. Confira os dois antes de comemorar.”</p>
                  <span className="share">Compartilhar</span>
                </div>
                <div className="blue">
                  {["Dashboard", "Calendário", "Relatório"].map((t) => (
                    <div key={t} className="bcard"><div className="ci" /><b>{t}</b></div>
                  ))}
                </div>
                <div className="gray">
                  <div className="wgrid">
                    {["Finanças", "Plano", "Clientes", "IA", "Config", "Equipe"].map((t) => (
                      <div key={t} className="wcard"><div className="wi" /><span>{t}</span></div>
                    ))}
                  </div>
                  <div className="panel">
                    <b>Situação das cobranças</b>
                    <Spark />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PROVA */}
        <div className="proof rv">
          <div className="wrap in">
            <span className="chip"><Ico n="brazil" size={17} /> <b>Feito no Brasil</b> para pequenos negócios</span>
            <span className="chip"><Ico n="phone" size={17} /> <b>App</b> + painel web</span>
            <span className="chip"><Ico n="shield" size={17} /> <b>Dados isolados</b> por empresa</span>
            <span className="chip"><Ico n="zap" size={17} /> <b>DRE</b> em segundos</span>
          </div>
        </div>

        {/* DORES */}
        <section className="wrap">
          <div className="center rv">
            <span className="eyebrow">O problema</span>
            <h2 className="sec">Você trabalha muito, mas não sabe se está lucrando?</h2>
            <p className="lead">A maioria dos donos de negócio decide no escuro: olha o saldo da conta e acha que é lucro. O Minhas Métricas mostra a verdade dos números.</p>
          </div>
          <div className="pains">
            {[
              ["table", "Planilhas que ninguém entende", "Fórmulas quebradas, versões diferentes e horas perdidas para fechar o mês."],
              ["eyeoff", "Decisão no escuro", "Sem DRE e sem margem, você não sabe qual produto dá lucro e qual dá prejuízo."],
              ["clock", "Contas que vencem sem aviso", "Sem calendário, o dinheiro entra e sai sem previsão e a conta aperta."],
            ].map(([ic, t, p], i) => (
              <div key={i} className="pain rv"><div className="ic-tile"><Ico n={ic} /></div><b>{t}</b><p>{p}</p></div>
            ))}
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="wrap">
          <div className="center rv">
            <span className="eyebrow">Como funciona</span>
            <h2 className="sec">Tudo que você precisa, num painel só</h2>
            <p className="lead">Do lançamento diário ao relatório para o contador. Simples de usar, poderoso no resultado.</p>
          </div>

          {FEATURES.map((f, i) => (
            <div key={i} className={`feat rv ${i % 2 ? "rev" : ""}`}>
              <div className="txt">
                <div className="ic-tile" style={{ marginBottom: 16 }}><Ico n={f.ico} /></div>
                <span className="eyebrow">{f.tag}</span>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
                <ul className="ticks">{f.ticks.map((t, j) => <li key={j}><Check /> {t}</li>)}</ul>
              </div>
              <div>{f.mock === "dre" ? <MockDRE /> : f.mock === "cal" ? <MockCal /> : <MockDash />}</div>
            </div>
          ))}
        </section>

        {/* NÚMEROS */}
        <section className="wrap">
          <div className="stats">
            {[["Grátis", "para testar sem compromisso"], ["2 em 1", "celular + computador"], ["1 clique", "para gerar o DRE em PDF"], ["100%", "no seu controle"]].map(([n, c], i) => (
              <div key={i} className="stat rv"><div className="n grad">{n}</div><div className="c">{c}</div></div>
            ))}
          </div>
        </section>

        {/* PREÇOS */}
        <section id="precos" className="wrap">
          <div className="center rv">
            <span className="eyebrow">Planos</span>
            <h2 className="sec">Escolha seu plano e comece com um teste grátis</h2>
            <p className="lead">Sem fidelidade. Faça upgrade, downgrade ou cancele quando quiser.</p>
            <div className="toggle">
              <button className={!anual ? "on" : ""} onClick={() => setAnual(false)}>Mensal</button>
              <button className={anual ? "on" : ""} onClick={() => setAnual(true)}>Anual <span className="save">· 2 meses grátis</span></button>
            </div>
          </div>

          <div className="plans">
            {planos.map((p) => (
              <div key={p.nome} className={`plan rv ${p.pop ? "pop" : ""}`}>
                {p.pop && <div className="badge">MAIS POPULAR</div>}
                <div className="pn grad">{p.nome}</div>
                <div className="pd">{p.desc}</div>
                {p.mensal ? (
                  <>
                    <div className="price">
                      <span className="cur">R$</span>
                      <span className="amt">{anual ? p.anualMes : p.mensal}</span>
                      <span className="per">/mês</span>
                    </div>
                    <div className="eq">{anual ? `Cobrado R$ ${p.anualTotal}/ano` : "Cobrança mensal"}</div>
                  </>
                ) : (
                  <><div className="price"><span className="amt" style={{ fontSize: 30 }}>Sob medida</span></div><div className="eq">Para franquias, redes e contadores</div></>
                )}
                <ul>{p.itens.map((it, j) => <li key={j}><Check /> {it}</li>)}</ul>
                <a className={`btn ${p.pop ? "g" : "ghost"} lg`} href="/login">{p.cta}</a>
              </div>
            ))}
          </div>
          <p className="center" style={{ color: "var(--muted)", fontSize: 13, marginTop: 18 }}>Precisa de mais usuários ou módulos avulsos? Dá para adicionar a qualquer momento.</p>
        </section>

        {/* DEPOIMENTOS */}
        <section className="wrap">
          <div className="center rv">
            <span className="eyebrow">Quem usa, recomenda</span>
            <h2 className="sec">Do caos da planilha ao controle total</h2>
          </div>
          <div className="quotes">
            {[
              ["Pela primeira vez sei exatamente quanto sobra no fim do mês. O DRE em PDF salvou minhas reuniões com o contador.", "Ana", "Dona de restaurante", "AN"],
              ["Montei a estrutura uma vez e agora é só lançar. Descobri um custo que estava comendo meu lucro.", "Bruno", "Loja de materiais", "BR"],
              ["No celular consigo acompanhar tudo entre um cliente e outro. Simples e direto ao ponto.", "Carla", "Clínica de estética", "CA"],
            ].map(([txt, nome, papel, ini], i) => (
              <div key={i} className="q rv">
                <div className="stars">★★★★★</div>
                <p>“{txt}”</p>
                <div className="who"><div className="av">{ini}</div><div><b>{nome}</b><span>{papel}</span></div></div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="wrap">
          <div className="center rv">
            <span className="eyebrow">Dúvidas frequentes</span>
            <h2 className="sec">Tudo que você quer saber</h2>
          </div>
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <div key={i} className={`fitem rv ${faq === i ? "open" : ""}`}>
                <button className="fq" onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>
                  {q}<span className="pm">+</span>
                </button>
                <div className="fa"><p>{a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="wrap final">
          <div className="box rv">
            <h2 className="sec" style={{ position: "relative" }}>Comece hoje. Veja seus números com clareza <span className="grad">em minutos</span>.</h2>
            <p className="lead" style={{ margin: "0 auto 26px", position: "relative" }}>Teste grátis, sem fidelidade. Enquanto você cuida do seu negócio, nós cuidamos dos números.</p>
            <a className="btn g lg pulse" href="/login" style={{ position: "relative" }}>Comece grátis</a>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="wrap row">
            <img src="/logos/fundo%20transparente.png" alt="Minhas Métricas" />
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <a href="#recursos">Recursos</a><a href="#precos">Preços</a><a href="#faq">Dúvidas</a><a href="/login">Entrar</a><a href="/privacidade">Privacidade</a>
            </div>
            <div>© {2026} Minhas Métricas · netmash</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
