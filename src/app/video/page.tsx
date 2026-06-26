"use client";
import { useEffect, useRef } from "react";

export default function VideoPage() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const k = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
      stage.style.transform = `scale(${k})`;
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("orientationchange", fit); };
  }, []);

  const reiniciar = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.querySelectorAll<HTMLElement>(".v-scene,.v-prog,.v-chart span,.v-blob").forEach((n) => {
      n.style.animation = "none"; void n.offsetHeight; n.style.animation = "";
    });
  };

  return (
    <div className="vid">
      <style>{CSS}</style>
      <div className="v-ctrls"><button onClick={reiniciar}>↻ Reiniciar</button></div>
      <div className="v-wrap">
        <div className="v-stage" ref={stageRef}>
          <div className="v-blob" />

          <div className="v-scene vs1">
            <h2>Você trabalha muito<br /><span className="va">e não sabe quanto sobra?</span></h2>
          </div>

          <div className="v-scene vs2">
            <h2>Planilha <span className="vr">não resolve.</span></h2>
            <div className="v-err">#REF!  =SOMA(??)  😵</div>
          </div>

          <div className="v-scene vs3">
            <div className="v-brandrow"><span className="v-brand">Minha Empresa</span><span className="v-tag">APP</span></div>
            <h2 style={{ fontSize: 78 }}>Conheça o app</h2>
            <div className="v-sub" style={{ marginBottom: 46 }}>A gestão da sua empresa, simples.</div>
            <div className="v-phone"><div className="v-notch" /><div className="v-scr">
              <div className="v-hi"><small>Bom dia, João</small><b>Visão geral</b></div>
              <div className="v-k"><small>Faturamento</small><b>R$ 48,2 mil</b></div>
              <div className="v-chart"><span /><span /><span /><span /><span /><span /></div>
            </div></div>
          </div>

          <div className="v-scene vs4">
            <h2 style={{ fontSize: 74 }}>Lucro, caixa e projeção <span className="va">na hora.</span></h2>
            <div className="v-phone" style={{ marginTop: 50 }}><div className="v-notch" /><div className="v-scr">
              <div className="v-k"><small>Lucro do mês</small><b className="vg">R$ 12,7 mil</b></div>
              <div className="v-k"><small>Caixa hoje</small><b>R$ 31,4 mil</b></div>
              <div className="v-k"><small>Projeção (6 meses)</small><b className="va">positiva ✓</b></div>
            </div></div>
          </div>

          <div className="v-scene vs5">
            <h2>Tudo no seu <span className="va">celular.</span> 📱</h2>
            <div className="v-sub">Dashboard, clientes, equipe e um assistente que te diz o que fazer.</div>
          </div>

          <div className="v-scene vs6">
            <div className="v-brandrow"><span className="v-brand">Minha Empresa</span><span className="v-tag">APP</span></div>
            <h2 style={{ fontSize: 86 }}>Comece <span className="va">agora.</span></h2>
            <div className="v-cta" style={{ marginTop: 50 }}>Saiba mais →</div>
            <div className="v-ghost">📱 acesso imediato ao app</div>
          </div>

          <div className="v-prog" />
        </div>
      </div>
    </div>
  );
}

const CSS = `
.vid{position:fixed;inset:0;background:#000;overflow:hidden;font-family:Inter,Arial,sans-serif;z-index:9999;-webkit-font-smoothing:antialiased}
.vid *{margin:0;padding:0;box-sizing:border-box}
.v-wrap{position:absolute;inset:0;display:grid;place-items:center;background:#000}
.v-stage{position:relative;width:1080px;height:1920px;background:radial-gradient(1000px 700px at 80% -8%,rgba(26,173,226,.22),transparent),#0A0A0A;color:#f4f5f7;overflow:hidden;transform-origin:center center}
.v-blob{position:absolute;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(26,173,226,.20),transparent 65%);left:-200px;bottom:-200px;animation:vdrift 22s ease-in-out infinite}
@keyframes vdrift{0%,100%{transform:translate(0,0)}50%{transform:translate(120px,-120px)}}
.v-scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 90px;opacity:0;animation-duration:22s;animation-timing-function:ease;animation-iteration-count:infinite}
.v-brandrow{display:flex;align-items:center;gap:18px;justify-content:center;margin-bottom:30px}
.v-brand{font-weight:900;color:#1AADE2;font-size:42px;letter-spacing:-.02em}
.v-tag{background:rgba(26,173,226,.18);color:#1AADE2;font-weight:800;padding:9px 20px;border-radius:99px;letter-spacing:.16em;font-size:26px}
.vid h2{font-weight:900;letter-spacing:-.03em;line-height:1.06;font-size:96px}
.v-sub{color:#cfd3d8;font-weight:500;font-size:42px;margin-top:34px;line-height:1.4}
.va{color:#1AADE2}.vg{color:#10B981}.vr{color:#EF4444}
.v-cta{display:inline-flex;align-items:center;gap:16px;background:#1AADE2;color:#06222e;font-weight:900;border-radius:99px;font-size:52px;padding:34px 64px;box-shadow:0 24px 60px -16px rgba(26,173,226,.6)}
.v-ghost{color:#cfd3d8;font-weight:700;font-size:36px;margin-top:34px}
.v-err{font-family:monospace;font-weight:800;color:#EF4444;font-size:48px;margin-top:30px;letter-spacing:.04em}
.v-phone{width:560px;height:1060px;border-radius:62px;background:#000;border:14px solid #1c1c1c;box-shadow:0 40px 90px -30px rgba(0,0,0,.8);padding:26px;overflow:hidden;position:relative}
.v-notch{width:150px;height:30px;background:#1c1c1c;border-radius:0 0 20px 20px;position:absolute;top:0;left:50%;transform:translateX(-50%)}
.v-scr{height:100%;background:#0A0A0A;border-radius:42px;padding:40px 30px;overflow:hidden;display:flex;flex-direction:column;gap:22px}
.v-hi{text-align:left}.v-hi small{color:#9aa0a6;font-size:26px;display:block}.v-hi b{font-size:38px;font-weight:800}
.v-k{background:#121212;border:1px solid #222;border-radius:20px;padding:24px;text-align:left}
.v-k small{color:#9aa0a6;font-size:26px;display:block;margin-bottom:8px}.v-k b{font-size:48px;font-weight:800}
.v-chart{display:flex;align-items:flex-end;gap:16px;height:230px;padding:24px;background:#121212;border:1px solid #222;border-radius:20px;margin-top:auto}
.v-chart span{flex:1;border-radius:9px 9px 0 0;background:linear-gradient(180deg,#1AADE2,rgba(26,173,226,.25));transform-origin:bottom;animation:vbars 22s ease infinite}
@keyframes vbars{0%,24%{transform:scaleY(.15)}30%,100%{transform:scaleY(1)}}
.vs1{animation-name:vs1}.vs2{animation-name:vs2}.vs3{animation-name:vs3}.vs4{animation-name:vs4}.vs5{animation-name:vs5}.vs6{animation-name:vs6}
@keyframes vs1{0%{opacity:0;transform:translateY(28px)}3%{opacity:1;transform:none}11%{opacity:1;transform:none}14%{opacity:0;transform:translateY(-28px)}100%{opacity:0}}
@keyframes vs2{0%,13%{opacity:0;transform:translateY(28px)}16%{opacity:1;transform:none}22%{opacity:1}25%{opacity:0;transform:translateY(-28px)}100%{opacity:0}}
@keyframes vs3{0%,24%{opacity:0;transform:scale(.94)}28%{opacity:1;transform:none}38%{opacity:1}41%{opacity:0}100%{opacity:0}}
@keyframes vs4{0%,40%{opacity:0;transform:translateY(28px)}44%{opacity:1;transform:none}60%{opacity:1}63%{opacity:0;transform:translateY(-22px)}100%{opacity:0}}
@keyframes vs5{0%,62%{opacity:0;transform:scale(.94)}66%{opacity:1;transform:none}74%{opacity:1}77%{opacity:0}100%{opacity:0}}
@keyframes vs6{0%,76%{opacity:0;transform:translateY(28px)}81%{opacity:1;transform:none}100%{opacity:1;transform:none}}
.v-prog{position:absolute;left:0;bottom:0;height:10px;background:#1AADE2;width:0;animation:vprog 22s linear infinite}
@keyframes vprog{0%{width:0}100%{width:100%}}
.v-ctrls{position:fixed;top:12px;left:12px;z-index:10000;display:flex;gap:8px}
.v-ctrls button{background:#141414;border:1px solid #333;color:#fff;padding:9px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.v-ctrls button:hover{border-color:#1AADE2}
`;
