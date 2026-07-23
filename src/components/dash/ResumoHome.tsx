"use client";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, Cake, Share2, Copy, Check, Quote, Sparkles } from "lucide-react";
import { Lancamento, Cliente } from "@/lib/db";
import { resumo } from "@/lib/calc";
import { fmt } from "./Kit";

function saudacao() { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }
function dataHoje() {
  try { return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

const CABECALHO = { fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)" } as const;

/**
 * Frases do "Pulso do dia". Troca a cada 3 dias (índice = dias÷3 % total), então
 * a mesma frase fica três dias no ar e só repete depois de passar por todas.
 * Cada uma é compartilhável — é a antiga "frase da semana", agora aqui dentro.
 */
const FRASES_PULSO: { t: string; a: string }[] = [
  { t: "Número que você não acompanha é decisão que alguém toma no seu lugar.", a: "" },
  { t: "Caixa não é lucro. Confira os dois antes de comemorar.", a: "" },
  { t: "O que cresce sem margem só adia o problema.", a: "" },
  { t: "Meta sem plano é só um desejo com prazo.", a: "" },
  { t: "O que não é medido não pode ser melhorado.", a: "Peter Drucker" },
  { t: "Preço é o que você paga. Valor é o que você leva.", a: "Warren Buffett" },
  { t: "Lucro é opinião, caixa é fato.", a: "" },
  { t: "Não é quanto você fatura, é quanto você guarda.", a: "" },
  { t: "Quem controla os custos, controla o destino da empresa.", a: "" },
  { t: "Antes de vender mais, descubra por que o dinheiro está saindo.", a: "" },
  { t: "Faturamento enche o ego; margem paga a conta.", a: "" },
  { t: "Um mês bom não paga um trimestre ruim. Olhe a tendência.", a: "" },
  { t: "Fluxo de caixa é o oxigênio do negócio.", a: "" },
  { t: "A margem revela a verdade que o faturamento disfarça.", a: "" },
  { t: "Todo indicador conta uma história. Pergunte qual.", a: "" },
  { t: "O tempo entre a venda e o caixa é onde a empresa quebra.", a: "" },
  { t: "Reserva não é dinheiro parado. É sono tranquilo.", a: "" },
  { t: "Se você não sabe quanto custa conquistar um cliente, não sabe se pode crescer.", a: "" },
  { t: "Dados vencem opiniões.", a: "" },
  { t: "Reduzir despesa é lucro na hora. Aumentar receita é aposta.", a: "" },
  { t: "Foque no indicador que, ao melhorar, arruma vários de uma vez.", a: "" },
  { t: "Visão sem execução é só sonho.", a: "Thomas Edison" },
  { t: "O cliente antigo é o mais barato de crescer e o mais fácil de esquecer.", a: "" },
  { t: "Meta boa cabe numa frase e assusta um pouquinho.", a: "" },
];

/**
 * Pulso do dia — a frase compartilhável, girando a cada 3 dias. Junta o que
 * antes era "Pulso do dia" e "Frase da semana" num bloco só, com copiar e
 * compartilhar no WhatsApp.
 */
function PulsoDoDia() {
  const [frase, setFrase] = useState<{ t: string; a: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const dia = Math.floor(new Date().setHours(0, 0, 0, 0) / 86_400_000);
    setFrase(FRASES_PULSO[Math.floor(dia / 3) % FRASES_PULSO.length]);
  }, []);

  const texto = frase ? `"${frase.t}"${frase.a ? ` — ${frase.a}` : ""}\n\n📊 Pulso do dia · Minhas Métricas` : "";

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* ignore */ }
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 18, padding: "18px 20px",
      background: "linear-gradient(145deg, rgba(56,189,248,.14), rgba(37,99,235,.06) 60%, transparent)",
      border: "1px solid rgba(56,189,248,.22)",
      boxShadow: "0 10px 30px -18px rgba(37,99,235,.5)",
    }}>
      {/* aspas gigantes ao fundo, marca d'água da citação */}
      <Quote size={110} style={{ position: "absolute", right: -14, top: -22, opacity: .08, color: "#2563EB", transform: "scaleX(-1)", pointerEvents: "none" }} />
      {/* filete de destaque à esquerda */}
      <span style={{ position: "absolute", left: 0, top: 16, bottom: 16, width: 3, borderRadius: 3, background: "linear-gradient(#38BDF8, #2563EB)" }} />

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "linear-gradient(150deg, #38BDF8, #2563EB)", color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px -4px rgba(37,99,235,.6)" }}><Sparkles size={15} /></span>
          <b style={{ ...CABECALHO, color: "#2563EB" }}>Pulso do dia</b>
        </div>

        {/* null no 1º render evita divergência de hidratação: a data é lida só no cliente */}
        <p style={{ lineHeight: 1.5, fontSize: 19, fontWeight: 700, letterSpacing: "-.01em", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
          {frase ? `“${frase.t}”` : "…"}
        </p>
        {frase?.a && (
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 18, height: 2, background: "#2563EB", borderRadius: 2, opacity: .6 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", letterSpacing: ".02em" }}>{frase.a}</span>
          </div>
        )}

        {frase && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={whatsapp}><Share2 size={14} /> Compartilhar no WhatsApp</button>
            <button className="btn ghost sm" onClick={copiar}>{copiado ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Aniversários do mês — mostra o que estiver salvo (sem botão de editar). */
function Aniversarios() {
  const [txt, setTxt] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem("me_aniversarios") || ""); }, []);
  return (
    <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(150deg, rgba(37,99,235,.10), transparent)", border: "1px solid rgba(37,99,235,.18)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(37,99,235,.16)", color: "#2563EB", flexShrink: 0 }}><Cake size={15} /></span>
        <b style={{ ...CABECALHO, color: "#2563EB" }}>Aniversários do mês</b>
      </div>
      {txt ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14 }}>{txt}</p>
        : <p className="sub" style={{ fontStyle: "italic" }}>Nenhum aniversariante cadastrado.</p>}
    </div>
  );
}

export default function ResumoHome({ lancs, clientes, saldoInicial, nome }: { lancs: Lancamento[]; clientes: Cliente[]; saldoInicial: number; nome: string }) {
  const ano = String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const r = resumo(lancs, meses, saldoInicial);
  const novos = clientes.filter((c) => (c.criado_em || "").slice(0, 4) === ano).length || clientes.length;

  // azul é a cor do app: os três KPIs usam degradês de azul, do claro ao profundo
  const KPIS = [
    { icon: <DollarSign size={19} />, g1: "#38BDF8", g2: "#0284C7", sombra: "rgba(56,189,248,.5)", val: fmt(r.faturamento, "BRL"), label: "Faturamento" },
    { icon: <TrendingUp size={19} />, g1: "#1AADE2", g2: "#0c6e9e", sombra: "rgba(26,173,226,.55)", val: String(novos), label: "Novos clientes" },
    { icon: <Wallet size={19} />, g1: "#2563EB", g2: "#1E3A8A", sombra: "rgba(37,99,235,.55)", val: fmt(r.saldo, "BRL"), label: "Saldo em caixa" },
  ];

  return (
    <div className="card" style={{ padding: 22, position: "relative", overflow: "hidden", border: "1px solid rgba(26,173,226,.18)", background: "linear-gradient(160deg, rgba(26,173,226,.10), rgba(139,92,246,.05) 55%, transparent)" }}>
      {/* brilho decorativo no canto — dá profundidade sem pesar */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,173,226,.18), transparent 70%)", pointerEvents: "none" }} />

      {/* Saudação */}
      <div style={{ marginBottom: 18, position: "relative" }}>
        <div style={{ color: "rgba(122,208,234,.9)", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize", fontStyle: "italic", marginTop: 3 }}>{dataHoje()}</div>
      </div>

      {/* 3 KPIs em degradê, todos com o mesmo peso visual */}
      {/* minmax(0,1fr) é essencial: com "1fr" as colunas não encolhem e o 3º card vaza */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, position: "relative" }}>
        {KPIS.map((k, i) => (
          <div key={i} style={{
            padding: 15, borderRadius: 18, minHeight: 124, minWidth: 0, display: "flex", flexDirection: "column", gap: 8,
            background: `linear-gradient(150deg, ${k.g1}, ${k.g2})`,
            boxShadow: `0 14px 30px -14px ${k.sombra}`,
            color: "#fff", position: "relative", overflow: "hidden",
          }}>
            {/* leve textura de luz no topo do card */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,.18), transparent 45%)", pointerEvents: "none" }} />
            <span style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(255,255,255,.22)", color: "#fff", flexShrink: 0, position: "relative" }}>{k.icon}</span>
            <b style={{ fontSize: "clamp(14px, 3.9vw, 20px)", letterSpacing: "-.02em", lineHeight: 1.15, marginTop: "auto", minWidth: 0, overflowWrap: "anywhere", position: "relative" }}>{k.val}</b>
            <small style={{ textTransform: "uppercase", letterSpacing: ".05em", fontSize: 9.5, fontWeight: 800, lineHeight: 1.3, color: "rgba(255,255,255,.92)", position: "relative" }}>{k.label}</small>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--line), transparent)", margin: "20px 0", position: "relative" }} />
      {/* pulso e aniversários lado a lado; empilham no celular */}
      <div className="resumo-blocos" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start", position: "relative" }}>
        <PulsoDoDia />
        <Aniversarios />
      </div>
      <style>{`@media (max-width: 640px){ .resumo-blocos{ grid-template-columns: 1fr !important; gap: 18px !important; } }`}</style>
    </div>
  );
}
