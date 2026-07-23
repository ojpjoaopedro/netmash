"use client";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, ClipboardList, Cake, Share2, Copy, Check } from "lucide-react";
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
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <ClipboardList size={16} color="var(--accent)" /><b style={CABECALHO}>Pulso do dia</b>
      </div>
      {/* null no 1º render evita divergência de hidratação: a data é lida só no cliente */}
      <p style={{ lineHeight: 1.6, fontSize: 15, fontStyle: "italic" }}>{frase ? `“${frase.t}”` : "…"}</p>
      {frase?.a && <div className="sub" style={{ fontWeight: 600, marginTop: 4 }}>— {frase.a}</div>}
      {frase && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn sm" onClick={whatsapp}><Share2 size={14} /> Compartilhar no WhatsApp</button>
          <button className="btn ghost sm" onClick={copiar}>{copiado ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}</button>
        </div>
      )}
    </div>
  );
}

/** Aniversários do mês — mostra o que estiver salvo (sem botão de editar). */
function Aniversarios() {
  const [txt, setTxt] = useState("");
  useEffect(() => { if (typeof window !== "undefined") setTxt(localStorage.getItem("me_aniversarios") || ""); }, []);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Cake size={16} color="#EC4899" /><b style={CABECALHO}>Aniversários do mês</b>
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

  const KPIS = [
    { icon: <DollarSign size={17} />, cor: "#10B981", val: fmt(r.faturamento, "BRL"), label: "Faturamento", destaque: false },
    { icon: <TrendingUp size={17} />, cor: "#8b5cf6", val: String(novos), label: "Novos clientes", destaque: false },
    { icon: <Wallet size={17} />, cor: "#1AADE2", val: fmt(r.saldo, "BRL"), label: "Saldo em caixa", destaque: true },
  ];

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Saudação */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "rgba(122,208,234,.85)", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize", fontStyle: "italic", marginTop: 3 }}>{dataHoje()}</div>
      </div>

      {/* 3 KPIs do mesmo tamanho (3º destacado) */}
      {/* minmax(0,1fr) é essencial: com "1fr" as colunas não encolhem e o 3º card vaza */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {KPIS.map((k, i) => (
          <div key={i} style={{
            padding: 13, borderRadius: 16, minHeight: 116, minWidth: 0, display: "flex", flexDirection: "column", gap: 8,
            border: k.destaque ? "0" : "1px solid var(--line)",
            background: k.destaque ? "linear-gradient(150deg, #1AADE2, #0c6e9e)" : "rgba(255,255,255,.025)",
            boxShadow: k.destaque ? "0 12px 28px -12px rgba(26,173,226,.6)" : "none",
            color: k.destaque ? "#fff" : "var(--txt)",
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: k.destaque ? "rgba(255,255,255,.2)" : k.cor + "22", color: k.destaque ? "#fff" : k.cor, flexShrink: 0 }}>{k.icon}</span>
            <b style={{ fontSize: "clamp(13px, 3.7vw, 18px)", letterSpacing: "-.02em", lineHeight: 1.15, marginTop: "auto", minWidth: 0, overflowWrap: "anywhere" }}>{k.val}</b>
            <small style={{ textTransform: "uppercase", letterSpacing: ".04em", fontSize: 9, fontWeight: 700, lineHeight: 1.3, color: k.destaque ? "rgba(255,255,255,.9)" : "var(--muted)" }}>{k.label}</small>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
      {/* pulso e aniversários lado a lado; empilham no celular */}
      <div className="resumo-blocos" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
        <PulsoDoDia />
        <Aniversarios />
      </div>
      <style>{`@media (max-width: 640px){ .resumo-blocos{ grid-template-columns: 1fr !important; gap: 18px !important; } }`}</style>
    </div>
  );
}
