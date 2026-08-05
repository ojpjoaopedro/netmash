"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, Sparkles, PartyPopper, X } from "lucide-react";
import { Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { navegar, AlvoNav } from "@/lib/nav";
import { somLigado } from "@/lib/ui-sound";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";

const KEY_MIN = "me_guia_min";
const KEY_OK = "me_guia_concluido";
const KEY_PARABENS = "me_guia_parabens_visto";   // o recado "Parabéns" aparece só 1 vez

function lerJSON<T = unknown>(k: string): T | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
}

/** Som curto de "parabéns" (arpejo alegre) via WebAudio, sem precisar de arquivo. */
function tocarParabens() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "triangle"; o.frequency.value = f;
      const t0 = ac.currentTime + i * 0.11;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + 0.6);
    });
    window.setTimeout(() => { try { ac.close(); } catch { /* ignore */ } }, 1800);
  } catch { /* ignore */ }
}

/** Chuva de confete por ~4,5s (canvas em tela cheia, some sozinho). */
function Confete() {
  useEffect(() => {
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;z-index:200;pointer-events:none";
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const cores = ["#1AADE2", "#10B981", "#F59E0B", "#EF4444", "#8b5cf6", "#EC4899"];
    const ps = Array.from({ length: 170 }, () => ({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.6,
      w: 6 + Math.random() * 8, h: 9 + Math.random() * 10,
      vy: 2 + Math.random() * 4, vx: -1.6 + Math.random() * 3.2,
      rot: Math.random() * Math.PI, vr: -0.2 + Math.random() * 0.4,
      cor: cores[Math.floor(Math.random() * cores.length)],
    }));
    let raf = 0; const inicio = performance.now();
    const passo = (t: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr; p.vy += 0.03;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.cor; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (t - inicio < 4500) raf = requestAnimationFrame(passo); else cv.remove();
    };
    raf = requestAnimationFrame(passo);
    const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); cv.remove(); };
  }, []);
  return null;
}

type Item = { key: string; label: string; curto: string; feito: boolean; nav: AlvoNav };

export default function GuiaConfiguracao({ empresa, brand, funcsCount }: { empresa: Empresa | null; brand: Brand; funcsCount: number }) {
  const [tick, setTick] = useState(0);                 // força reavaliação periódica
  const [min, setMin] = useState(false);
  const [montado, setMontado] = useState(false);
  const [arrastoY, setArrastoY] = useState(0);         // deslocamento ao arrastar pra baixo
  const arr = useRef({ y0: 0, on: false });
  const [fechado, setFechado] = useState(false);       // fechado nesta sessão (volta ao reabrir a tela)

  useEffect(() => {
    setMin(localStorage.getItem(KEY_MIN) === "1");
    setMontado(true);
    const bump = () => setTick((t) => t + 1);
    const id = window.setInterval(bump, 1500);
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    window.addEventListener("me:diretores", bump);
    window.addEventListener("me:estrutura", bump);
    window.addEventListener("me:termos", bump);
    return () => { window.clearInterval(id); window.removeEventListener("focus", bump); window.removeEventListener("storage", bump); window.removeEventListener("me:diretores", bump); window.removeEventListener("me:estrutura", bump); window.removeEventListener("me:termos", bump); };
  }, []);

  // ── avaliação das etapas (relê o localStorage a cada tick) ──────────────────
  void tick;
  const dir = lerJSON<{ sup?: Record<string, string> }>("me_diretores");
  const sup = dir?.sup || {};
  const superOK = ["nome", "area", "telefone", "cpf", "nascimento"].every((k) => String(sup[k] || "").trim());

  const extra = lerJSON<Record<string, string>>(`me_empresa_extra:${empresa?.id || "default"}`) || {};
  const nomeEmpresaOK = !!empresa?.nome && !["Minha Empresa", "Minha Empresa (demonstração)"].includes(empresa.nome);
  const empresaOK = nomeEmpresaOK && !!empresa?.segmento && !!empresa?.cnpj
    && ["email", "contato", "rua", "bairro", "cidade", "uf"].every((k) => String(extra[k] || "").trim());

  const logoOK = !!brand?.logo;
  const equipeOK = (funcsCount || 0) >= 1;
  const termosOK = lerJSON<boolean>("me_termos_aceite") === true;

  const itens: Item[] = [
    { key: "super", label: "Preencher dados do SuperAdmin", curto: "Dados do administrador", feito: superOK, nav: { view: "config", aba: "usuarios" } },
    { key: "empresa", label: "Preencher dados da empresa", curto: "Dados da empresa", feito: empresaOK, nav: { view: "config", aba: "dados" } },
    { key: "logo", label: "Cadastrar a logomarca", curto: "Cadastrar a logomarca", feito: logoOK, nav: { view: "config", aba: "personalizacao" } },
    { key: "equipe", label: "Cadastrar 1 membro da equipe", curto: "Cadastrar a equipe", feito: equipeOK, nav: { view: "config", aba: "equipe" } },
    { key: "termos", label: "Aceitar os termos de uso", curto: "Aceitar os termos de uso", feito: termosOK, nav: { view: "config", aba: "termos" } },
  ];
  const feitos = itens.filter((i) => i.feito).length;
  const total = itens.length;
  const pct = Math.round((feitos / total) * 100);
  const tudoOK = feitos === total;

  // mantém o flag de conclusão em sincronia com o estado real
  // (se o usuário apagar um dado, o guia volta e os benefícios travam de novo)
  useEffect(() => {
    if (!montado) return;
    const atual = localStorage.getItem(KEY_OK) === "1";
    if (atual !== tudoOK) {
      try { const cru = tudoOK ? "1" : "0"; localStorage.setItem(KEY_OK, cru); salvarEstadoRemoto(KEY_OK, cru); window.dispatchEvent(new Event("me:guia-concluido")); } catch { /* ignore */ }
    }
  }, [tudoOK, montado]);

  // comemora só na virada de incompleto -> completo (não repete a cada render)
  const [confetti, setConfetti] = useState(false);
  const [recado, setRecado] = useState(false);
  const anteriorOK = useRef<boolean | null>(null);
  useEffect(() => {
    if (!montado) return;
    if (anteriorOK.current === null) { anteriorOK.current = tudoOK; return; }  // 1ª leitura não comemora
    // comemora só na virada incompleto -> completo E só se ainda não tiver comemorado nenhuma vez
    if (tudoOK && !anteriorOK.current && localStorage.getItem(KEY_PARABENS) !== "1") {
      setConfetti(true); setRecado(true);
      try { localStorage.setItem(KEY_PARABENS, "1"); salvarEstadoRemoto(KEY_PARABENS, "1"); } catch { /* ignore */ }
      if (somLigado()) tocarParabens();
      window.setTimeout(() => setConfetti(false), 4500);   // confete some sozinho; o recado só sai no X
    }
    anteriorOK.current = tudoOK;
  }, [tudoOK, montado]);

  if (!montado) return null;

  const trocarMin = (v: boolean) => { setMin(v); try { const cru = v ? "1" : "0"; localStorage.setItem(KEY_MIN, cru); salvarEstadoRemoto(KEY_MIN, cru); } catch { /* ignore */ } };
  const ir = (a: AlvoNav) => navegar(a);

  const guia = tudoOK ? null : (min ? (
    <button className="guia-min" onClick={() => trocarMin(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--txt)", boxShadow: "0 12px 30px -10px rgba(0,0,0,.4)" }}>
      <Sparkles size={16} style={{ color: "var(--brand)" }} /> Guia de configuração
      <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 14%, transparent)", padding: "2px 8px", borderRadius: 99 }}>{feitos}/{total}</span>
    </button>
  ) : (
    <div className="guia-card" style={{ transform: arrastoY ? `translateY(${arrastoY}px)` : undefined, opacity: 1 - Math.min(0.55, arrastoY / 260), transition: arr.current.on ? "none" : "transform .22s ease, opacity .22s ease" }}>
      {/* puxador: arraste pra baixo pra guardar o guia */}
      <div title="Arraste para guardar"
        onPointerDown={(e) => { arr.current = { y0: e.clientY, on: true }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (arr.current.on) setArrastoY(Math.max(0, e.clientY - arr.current.y0)); }}
        onPointerUp={(e) => { arr.current.on = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ } if (arrastoY > 60) setFechado(true); setArrastoY(0); }}
        style={{ touchAction: "none", cursor: "grab", padding: "8px 0 2px", display: "grid", placeItems: "center" }}>
        <span style={{ width: 38, height: 4, borderRadius: 99, background: "var(--line-2)" }} />
      </div>
      <div style={{ padding: "4px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <b style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}><Sparkles size={15} style={{ color: "var(--brand)" }} /> Guia de configuração</b>
          <button onClick={() => setFechado(true)} title="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 8 }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", borderRadius: 99, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>{feitos}/{total}</span>
        </div>
      </div>
      <div style={{ margin: "0 10px 10px", padding: 5, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
        {itens.map((it) => (
          <button key={it.key} onClick={() => ir(it.nav)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: "transparent", border: 0, borderRadius: 9, padding: "8px 7px", transition: ".12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            {it.feito
              ? <CheckCircle2 size={18} style={{ color: "var(--brand)", flexShrink: 0 }} />
              : <Circle size={18} style={{ color: "var(--muted-2)", flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: it.feito ? "var(--muted)" : "var(--txt)", textDecoration: it.feito ? "line-through" : "none" }}>{it.label}</span>
            {!it.feito && <ChevronRight size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>
  ));

  return (
    <>
      {confetti && <Confete />}
      {recado && (
        <div style={{ position: "fixed", left: "50%", top: 90, transform: "translateX(-50%)", zIndex: 201, maxWidth: "calc(100vw - 32px)",
          display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px 16px 22px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--line-2)", boxShadow: "0 20px 50px -12px rgba(0,0,0,.5)" }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(150deg,var(--brand),var(--brand-dark))", color: "#fff" }}><PartyPopper size={22} /></span>
          <div style={{ maxWidth: 380 }}>
            <b style={{ fontSize: 15.5 }}>Parabéns! Configuração concluída 🎉</b>
            <p className="sub" style={{ margin: "3px 0 0", fontSize: 12.5 }}>Seus benefícios foram liberados como recompensa. Confira em Configurações › Meus Benefícios.</p>
          </div>
          <button onClick={() => { setRecado(false); try { localStorage.setItem("me_destacar_benef", "1"); window.dispatchEvent(new Event("me:destacar-beneficios")); } catch { /* ignore */ } }} title="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, flexShrink: 0 }}><X size={17} /></button>
        </div>
      )}
      {!fechado && guia}
    </>
  );
}
