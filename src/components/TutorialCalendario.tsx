"use client";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, TrendingDown, TrendingUp, Repeat, BarChart3, PlayCircle, MousePointerClick, ArrowDown } from "lucide-react";

/**
 * Tutorial do calendário (modal em passos). Explica: cadastro de despesa,
 * cadastro de receita, recorrência, como os dados aparecem na dashboard/gráficos/painel
 * e uma tela final para o vídeo (ainda não gravado).
 *
 * Para ligar o vídeo depois: cole a URL (YouTube/Vimeo/embed) em VIDEO_URL.
 */
const VIDEO_URL = ""; // ex.: "https://www.youtube.com/embed/XXXXXXXX"

const VERDE = "#10B981";
const VERMELHO = "#EF4444";

/** mini calendário (ilustração) — desenha "Agosto" e destaca o dia que se clica */
function MiniCal({ destaque, cor }: { destaque: number; cor: string }) {
  const SEM = ["D", "S", "T", "Q", "Q", "S", "S"];
  const offset = 6; // agosto começa no sábado
  const total = 31;
  return (
    <div style={{ width: 236, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 18px -12px rgba(0,0,0,.4)" }}>
      <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, marginBottom: 7,
        background: "linear-gradient(90deg, var(--brand), var(--brand-light))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>Agosto</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {SEM.map((s, i) => <div key={i} style={{ textAlign: "center", fontSize: 8.5, fontWeight: 800, color: i === 0 ? "#F43F5E" : "var(--muted-2)" }}>{s}</div>)}
        {Array.from({ length: offset }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const on = d === destaque;
          return (
            <span key={d} style={{ position: "relative", height: 21, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 10.5,
              fontWeight: on ? 800 : 500, background: on ? cor : "transparent", color: on ? "#fff" : "var(--muted)",
              boxShadow: on ? `0 3px 9px -3px ${cor}` : undefined }}>
              {d}
              {on && <MousePointerClick size={13} style={{ position: "absolute", right: -5, bottom: -5, color: cor, background: "var(--card)", borderRadius: 99, padding: 1 }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
/** pilha de valor (ilustração) */
function ValorTag({ cor, texto, valor }: { cor: string; texto: string; valor: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10,
      background: `color-mix(in srgb, ${cor} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${cor} 34%, transparent)` }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: cor }} />
      <b style={{ fontSize: 12.5 }}>{texto}</b>
      <b style={{ fontSize: 13, color: cor, marginLeft: 2 }}>{valor}</b>
    </span>
  );
}

export default function TutorialCalendario({ onFim }: { onFim: () => void }) {
  const [step, setStep] = useState(0);

  const passos: { cor: string; Icon: typeof TrendingDown; titulo: string; desc: React.ReactNode; visual: React.ReactNode }[] = [
    {
      cor: VERMELHO, Icon: TrendingDown, titulo: "Cadastrar uma despesa",
      desc: <>No calendário, <b>clique no dia</b> em que a conta vence e escolha <b>Despesa</b>. Informe o <b>valor</b> e a <b>categoria</b> (aluguel, fornecedor, salário…). Pronto, a saída está registrada naquele dia.</>,
      visual: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
          <MiniCal destaque={5} cor={VERMELHO} />
          <ArrowDown size={18} style={{ color: VERMELHO }} />
          <ValorTag cor={VERMELHO} texto="Despesa" valor="− R$ 250" />
        </div>
      ),
    },
    {
      cor: VERDE, Icon: TrendingUp, titulo: "Cadastrar uma receita",
      desc: <>Do mesmo jeito: <b>clique no dia</b> em que o dinheiro entra e escolha <b>Receita</b>. Informe o <b>valor</b> e de onde veio. Assim você acompanha entradas e saídas no mesmo lugar.</>,
      visual: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
          <MiniCal destaque={10} cor={VERDE} />
          <ArrowDown size={18} style={{ color: VERDE }} />
          <ValorTag cor={VERDE} texto="Receita" valor="+ R$ 900" />
        </div>
      ),
    },
    {
      cor: "#8b5cf6", Icon: Repeat, titulo: "Contas que se repetem",
      desc: <>Tem conta que cai <b>todo mês</b> (aluguel, mensalidade, salários)? Marque como <b>recorrente</b> e ela se lança <b>automaticamente</b> nos próximos meses. Você cadastra uma vez só.</>,
      visual: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <ValorTag cor="#8b5cf6" texto="Aluguel · mensal" valor="− R$ 1.500" />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["Ago", "Set", "Out", "Nov"].map((mes, i) => (
              <span key={mes} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 700,
                background: "color-mix(in srgb, #8b5cf6 12%, transparent)", color: "#8b5cf6", opacity: 1 - i * 0.16 }}>
                <Repeat size={11} /> {mes}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      cor: "var(--brand)", Icon: BarChart3, titulo: "Tudo vira gráfico sozinho",
      desc: <>O que você lança no calendário aparece <b>automaticamente</b> na <b>Dashboard</b>, nos <b>gráficos</b> e no <b>Painel</b>. Você não digita nada duas vezes: lançou, já entra no resultado, no fluxo de caixa e na projeção.</>,
      visual: (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: "center", height: 92, padding: "0 6px" }}>
          {[38, 60, 46, 78, 64, 90].map((h, i) => (
            <span key={i} style={{ width: 22, height: h, borderRadius: "6px 6px 3px 3px",
              background: i % 2 === 0 ? "linear-gradient(180deg, var(--brand), var(--brand-dark))" : "linear-gradient(180deg, #34d399, #10B981)" }} />
          ))}
        </div>
      ),
    },
    {
      cor: "var(--brand)", Icon: PlayCircle, titulo: "Veja na prática",
      desc: <>Assista ao passo a passo em vídeo e comece a preencher em minutos.</>,
      visual: (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden",
          background: "linear-gradient(150deg, #0A1730, #0E2E5C)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center" }}>
          {VIDEO_URL ? (
            <iframe src={VIDEO_URL} title="Tutorial em vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
          ) : (
            <div style={{ textAlign: "center", color: "#cfe3ff" }}>
              <PlayCircle size={46} style={{ opacity: .9 }} />
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, opacity: .85 }}>Vídeo em breve</div>
            </div>
          )}
        </div>
      ),
    },
  ];

  const cur = passos[step];
  const ultimo = step === passos.length - 1;
  const Icon = cur.Icon;

  return (
    <div onClick={onFim} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,.62)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 16, overflow: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 480, padding: 0, overflow: "hidden", boxShadow: "0 30px 70px -18px rgba(0,0,0,.6)" }}>
        {/* faixa colorida do passo */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${cur.cor}, color-mix(in srgb, ${cur.cor} 30%, transparent))` }} />
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", flexShrink: 0,
              background: `color-mix(in srgb, ${cur.cor} 15%, transparent)`, color: cur.cor }}><Icon size={23} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>Como usar o calendário</div>
              <b style={{ fontSize: 17 }}>{cur.titulo}</b>
            </div>
            <button onClick={onFim} title="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}><X size={19} /></button>
          </div>

          {/* ilustração */}
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 16px", marginBottom: 16, display: "grid", placeItems: "center", minHeight: 120 }}>
            {cur.visual}
          </div>

          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--txt)" }}>{cur.desc}</p>

          {/* progresso (bolinhas) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", margin: "18px 0 16px" }}>
            {passos.map((_, i) => (
              <span key={i} onClick={() => setStep(i)} style={{ cursor: "pointer", height: 7, borderRadius: 99, transition: ".2s",
                width: i === step ? 22 : 7, background: i === step ? cur.cor : "var(--line-2)" }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step > 0
              ? <button className="btn ghost sm" onClick={() => setStep((s) => s - 1)}><ChevronLeft size={15} /> Anterior</button>
              : <span />}
            <div style={{ flex: 1 }} />
            {ultimo
              ? <button className="btn sm" onClick={onFim}>Concluir <Check size={15} /></button>
              : <button className="btn sm" onClick={() => setStep((s) => s + 1)}>Próximo <ChevronRight size={15} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
