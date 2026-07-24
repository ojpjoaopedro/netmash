"use client";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, Cake, Award, Share2, Copy, Check, Quote, Sparkles } from "lucide-react";
import { Lancamento, Cliente, Funcionario } from "@/lib/db";
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

  const texto = frase ? `"${frase.t.replace(/\.\s*$/, "")}"${frase.a ? ` — ${frase.a}` : ""}\n\n📊 Pulso do dia · Minhas Métricas` : "";

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
        <p style={{ lineHeight: 1.5, fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", fontStyle: "italic" }}>
          {frase ? (
            <>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#2563EB", verticalAlign: "-0.18em", marginRight: 2, lineHeight: 0 }}>“</span>
              {/* sem o ponto final: a frase respira melhor entre as aspas */}
              {frase.t.replace(/\.\s*$/, "")}
              <span style={{ fontSize: 30, fontWeight: 800, color: "#2563EB", verticalAlign: "-0.35em", marginLeft: 1, lineHeight: 0 }}>”</span>
            </>
          ) : "…"}
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

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesDe = (iso: string) => Number(iso.slice(5, 7)) - 1;   // 0-11
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Aniversários do mês corrente, montados a partir da Equipe cadastrada:
 * nascimento (nome + balãozinho com dia/mês, sem ano) e admissão (data + anos de casa).
 */
function Aniversarios({ funcs }: { funcs: Funcionario[] }) {
  const agora = new Date();
  const mes = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const niver = funcs.filter((f) => f.ativo && f.nascimento && mesDe(f.nascimento) === mes)
    .sort((a, b) => a.nascimento!.slice(8, 10).localeCompare(b.nascimento!.slice(8, 10)));
  const admis = funcs.filter((f) => f.ativo && f.admissao && mesDe(f.admissao) === mes)
    .sort((a, b) => a.admissao!.slice(8, 10).localeCompare(b.admissao!.slice(8, 10)));

  const anosDe = (iso: string) => {
    const n = anoAtual - Number(iso.slice(0, 4));
    return n <= 0 ? "entrou este ano" : `${n} ${n === 1 ? "ano" : "anos"} de casa`;
  };

  const vazio = niver.length === 0 && admis.length === 0;

  return (
    <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(150deg, rgba(37,99,235,.10), transparent)", border: "1px solid rgba(37,99,235,.18)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(37,99,235,.16)", color: "#2563EB", flexShrink: 0 }}><Cake size={15} /></span>
        <b style={{ ...CABECALHO, color: "#2563EB" }}>Aniversários de {MESES_PT[mes]}</b>
      </div>

      {vazio && <p className="sub" style={{ fontStyle: "italic" }}>Nenhum aniversariante neste mês.</p>}

      {niver.length > 0 && (
        <div style={{ marginBottom: admis.length > 0 ? 14 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
            <Cake size={13} /> Aniversário
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {niver.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome || "Sem nome"}</span>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#2563EB", background: "rgba(37,99,235,.12)", padding: "3px 10px", borderRadius: 99 }}>
                  🎈 {diaMes(f.nascimento!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {admis.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
            <Award size={13} /> Aniversário de admissão
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {admis.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome || "Sem nome"}</span>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#2563EB", background: "rgba(37,99,235,.12)", padding: "3px 10px", borderRadius: 99 }}>
                  {diaMes(f.admissao!)} · {anosDe(f.admissao!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumoHome({ lancs, clientes, funcs = [], saldoInicial, nome, ano }: { lancs: Lancamento[]; clientes: Cliente[]; funcs?: Funcionario[]; saldoInicial: number; nome: string; ano?: string }) {
  const anoRef = ano || String(new Date().getFullYear());
  const meses = Array.from({ length: 12 }, (_, i) => `${anoRef}-${String(i + 1).padStart(2, "0")}`);
  const r = resumo(lancs, meses, saldoInicial);
  const novos = clientes.filter((c) => (c.criado_em || "").slice(0, 4) === anoRef).length || clientes.length;

  // azul é a cor do app: os três KPIs usam degradês de azul, do claro ao profundo
  const KPIS = [
    { icon: <DollarSign size={19} />, g1: "#38BDF8", g2: "#0284C7", sombra: "rgba(56,189,248,.5)", val: fmt(r.faturamento, "BRL"), label: "Faturamento" },
    { icon: <TrendingUp size={19} />, g1: "#1AADE2", g2: "#0c6e9e", sombra: "rgba(26,173,226,.55)", val: String(novos), label: "Novos clientes" },
    { icon: <Wallet size={19} />, g1: "#2563EB", g2: "#1E3A8A", sombra: "rgba(37,99,235,.55)", val: fmt(r.saldo, "BRL"), label: "Saldo em caixa" },
  ];

  return (
    <div className="resumo-card card" style={{ position: "relative", overflow: "hidden", border: "1px solid rgba(26,173,226,.18)", background: "linear-gradient(160deg, rgba(26,173,226,.10), rgba(139,92,246,.05) 55%, transparent)" }}>
      {/* brilho decorativo no canto — dá profundidade sem pesar */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,173,226,.18), transparent 70%)", pointerEvents: "none" }} />

      {/* Saudação */}
      <div style={{ marginBottom: 18, position: "relative" }}>
        <div style={{ color: "rgba(122,208,234,.9)", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>{saudacao()}{nome ? `, ${nome}` : ""}</div>
        <div className="sub" style={{ textTransform: "capitalize", fontStyle: "italic", marginTop: 3 }}>{dataHoje()}</div>
      </div>

      {/* KPIs em degradê. No celular empilham em linha (ícone + valor lado a
          lado), senão o valor "R$ 279.784" quebra feio numa coluna estreita. */}
      <div className="kpi-grid">
        {KPIS.map((k, i) => (
          <div key={i} className="kpi-card" style={{ background: `linear-gradient(150deg, ${k.g1}, ${k.g2})`, boxShadow: `0 14px 30px -14px ${k.sombra}` }}>
            <div className="kpi-luz" />
            <span className="kpi-ico">{k.icon}</span>
            <div className="kpi-body">
              <b className="kpi-val">{k.val}</b>
              <small className="kpi-lbl">{k.label}</small>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--line), transparent)", margin: "20px 0", position: "relative" }} />
      {/* pulso e aniversários lado a lado; empilham no celular */}
      <div className="resumo-blocos">
        <PulsoDoDia />
        <Aniversarios funcs={funcs} />
      </div>
    </div>
  );
}
