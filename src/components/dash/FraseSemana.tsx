"use client";
import { useState } from "react";
import { Quote, Share2, Copy, Check } from "lucide-react";

/** Frase da semana — gira toda semana e pode ser compartilhada. */
const FRASES: { t: string; a: string }[] = [
  { t: "O que não é medido não pode ser melhorado.", a: "Peter Drucker" },
  { t: "Preço é o que você paga. Valor é o que você leva.", a: "Warren Buffett" },
  { t: "Lucro é opinião, caixa é fato.", a: "" },
  { t: "Não é quanto você fatura, é quanto você guarda.", a: "" },
  { t: "Quem controla os custos, controla o destino da empresa.", a: "" },
  { t: "Dados vencem opiniões.", a: "" },
  { t: "Fluxo de caixa é o oxigênio do negócio.", a: "" },
  { t: "A margem revela a verdade que o faturamento disfarça.", a: "" },
  { t: "Separe o dinheiro da empresa do seu bolso.", a: "" },
  { t: "Quem não planeja o futuro vive o improviso do presente.", a: "" },
  { t: "Grandes resultados vêm de pequenos hábitos diários.", a: "" },
  { t: "Feito é melhor que perfeito.", a: "" },
  { t: "Foque no que traz dinheiro para dentro.", a: "" },
  { t: "Conheça seus números antes que eles te surpreendam.", a: "" },
  { t: "Corte o que não gera retorno, reinvista no que funciona.", a: "" },
  { t: "Constância vence intensidade.", a: "" },
  { t: "Disciplina financeira hoje é liberdade amanhã.", a: "" },
  { t: "Toda boa decisão começa com um bom dado.", a: "" },
  { t: "Contas em dia, cabeça tranquila.", a: "" },
  { t: "Visão sem execução é só sonho.", a: "Thomas Edison" },
  { t: "Cuide dos centavos que os reais cuidam de si mesmos.", a: "Provérbio" },
  { t: "Meça, ajuste, repita.", a: "" },
  { t: "A clareza dos números traz paz para a gestão.", a: "" },
  { t: "O sucesso adora preparação.", a: "" },
  { t: "Empreender é resolver problemas que valem a pena.", a: "" },
  { t: "Quem enxerga o número, decide melhor.", a: "" },
];

/** Número da semana ISO no ano (1 a 53). */
function semanaDoAno(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const inicioAno = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
}

export default function FraseSemana() {
  const frase = FRASES[semanaDoAno() % FRASES.length];
  const [copiado, setCopiado] = useState(false);
  const texto = `"${frase.t}"${frase.a ? ` — ${frase.a}` : ""}\n\n📊 Frase da semana · Minhas Métricas`;

  async function compartilhar() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ text: texto }); } catch { /* cancelado */ }
    } else {
      try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* ignore */ }
    }
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  return (
    <div className="card" style={{ marginBottom: 16, position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(26,173,226,.12), rgba(139,92,246,.06))", border: "1px solid rgba(26,173,226,.25)" }}>
      <Quote size={64} style={{ position: "absolute", right: -6, top: -10, opacity: .08, color: "var(--brand)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--brand)" }}>Frase da semana</div>
        <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.45, margin: "10px 0 4px", letterSpacing: "-.01em" }}>“{frase.t}”</p>
        {frase.a && <div className="sub" style={{ fontWeight: 600 }}>— {frase.a}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn sm" onClick={whatsapp}><Share2 size={14} /> Compartilhar no WhatsApp</button>
          <button className="btn ghost sm" onClick={compartilhar}>{copiado ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}</button>
        </div>
      </div>
    </div>
  );
}
