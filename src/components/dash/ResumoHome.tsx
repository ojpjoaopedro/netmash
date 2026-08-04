"use client";
import { useEffect, useState } from "react";
import { Cake, Award, Instagram, Quote } from "lucide-react";
import { Funcionario } from "@/lib/db";

/** Caminho arredondado (retângulo com cantos) para o canvas do story. */
function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Quebra o texto em linhas que cabem na largura dada. */
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, maxLargura: number): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > maxLargura && atual) { linhas.push(atual); atual = p; }
    else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const CABECALHO = { fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)" } as const;

/**
 * Frases do "Pulso do dia". Troca a cada 3 dias (índice = dias÷3 % total), então
 * a mesma frase fica três dias no ar e só repete depois de passar por todas.
 * Cada uma é compartilhável — é a antiga "frase da semana", agora aqui dentro.
 */
export const FRASES_PULSO: { t: string; a: string }[] = [
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

/** Frase do dia (gira a cada 3 dias). Só no cliente (usa a data de hoje). */
export function fraseDoDia(): { t: string; a: string } {
  const dia = Math.floor(new Date().setHours(0, 0, 0, 0) / 86_400_000);
  return FRASES_PULSO[Math.floor(dia / 3) % FRASES_PULSO.length];
}

/**
 * Pulso do dia — a frase compartilhável, girando a cada 3 dias. Junta o que
 * antes era "Pulso do dia" e "Frase da semana" num bloco só, com copiar e
 * compartilhar no WhatsApp.
 */
function PulsoDoDia() {
  const [frase, setFrase] = useState<{ t: string; a: string } | null>(null);

  useEffect(() => {
    const dia = Math.floor(new Date().setHours(0, 0, 0, 0) / 86_400_000);
    setFrase(FRASES_PULSO[Math.floor(dia / 3) % FRASES_PULSO.length]);
  }, []);

  const texto = frase ? `"${frase.t.replace(/\.\s*$/, "")}"${frase.a ? ` — ${frase.a}` : ""}\n\n📊 Pulso do dia · Minhas Métricas` : "";

  /** Gera a imagem no tamanho de story (1080x1920) e compartilha (ou baixa). */
  async function instagram() {
    if (!frase) return;
    const w = 1080, h = 1920;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"); if (!ctx) return;

    // fundo preto
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, w, h);

    // retângulo central com sombra
    const cx = 90, cw = w - 180, cy = 430, ch = 1060, raio = 44;
    ctx.save();
    ctx.shadowColor = "rgba(239,68,68,.45)"; ctx.shadowBlur = 90; ctx.shadowOffsetY = 34;
    retanguloArredondado(ctx, cx, cy, cw, ch, raio);
    ctx.fillStyle = "#0a0a0a"; ctx.fill();
    ctx.restore();
    retanguloArredondado(ctx, cx, cy, cw, ch, raio);
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(239,68,68,.55)"; ctx.stroke();

    const padX = cx + 80;
    // aspa vermelha
    ctx.fillStyle = "#EF4444"; ctx.font = "900 170px Georgia, serif";
    ctx.fillText("“", padX - 8, cy + 210);

    // frase em branco (fonte reduz se tiver muitas linhas)
    const fraseTxt = `${frase.t.replace(/\.\s*$/, "")}”`;
    let fonte = 68;
    let linhas: string[] = [];
    do {
      ctx.font = `800 ${fonte}px Arial, sans-serif`;
      linhas = quebrarLinhas(ctx, fraseTxt, cw - 160);
      if (linhas.length * (fonte + 20) <= ch - 460) break;
      fonte -= 4;
    } while (fonte > 40);

    ctx.fillStyle = "#ffffff";
    let ty = cy + 320;
    const lh = fonte + 20;
    for (const l of linhas) { ctx.fillText(l, padX, ty); ty += lh; }

    // autor
    if (frase.a) { ctx.fillStyle = "#EF4444"; ctx.font = "700 38px Arial, sans-serif"; ctx.fillText(`— ${frase.a}`, padX, ty + 30); }

    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "pulso-do-dia.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: texto }); return; } catch { /* segue pro download */ }
      }
      // fallback (desktop): baixa a imagem e abre o Instagram
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "pulso-do-dia.png"; a.click(); URL.revokeObjectURL(url);
      window.open("https://www.instagram.com/", "_blank", "noopener");
    }, "image/png");
  }

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 14, padding: "12px 14px",
      background: "linear-gradient(145deg, rgba(56,189,248,.14), rgba(37,99,235,.06) 60%, transparent)",
      border: "1px solid color-mix(in srgb, var(--brand) 22%, transparent)",
      boxShadow: "0 10px 30px -18px rgba(37,99,235,.5)",
    }}>
      {/* aspas gigantes ao fundo, marca d'água da citação */}
      <Quote size={80} style={{ position: "absolute", right: -10, top: -16, opacity: .08, color: "var(--brand)", transform: "scaleX(-1)", pointerEvents: "none" }} />
      {/* filete de destaque à esquerda */}
      <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 3, background: "var(--brand)" }} />

      <div style={{ position: "relative" }}>
        {/* null no 1º render evita divergência de hidratação: a data é lida só no cliente */}
        <p style={{ lineHeight: 1.45, fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", fontStyle: "italic" }}>
          {frase ? (
            <>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", verticalAlign: "-0.18em", marginRight: 2, lineHeight: 0 }}>“</span>
              {/* sem o ponto final: a frase respira melhor entre as aspas */}
              {frase.t.replace(/\.\s*$/, "")}
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", verticalAlign: "-0.35em", marginLeft: 1, lineHeight: 0 }}>”</span>
            </>
          ) : "…"}
        </p>
        {frase?.a && (
          <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 16, height: 2, background: "var(--brand)", borderRadius: 2, opacity: .6 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", letterSpacing: ".02em" }}>{frase.a}</span>
          </div>
        )}

        {frase && (
          <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={instagram}><Instagram size={14} /> Compartilhar no Instagram</button>
          </div>
        )}
      </div>
    </div>
  );
}

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesDe = (iso: string) => Number(iso.slice(5, 7)) - 1;   // 0-11
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// só nome + 1 sobrenome (ex.: "Robert Augusto Magalhães" -> "Robert Augusto")
const nomeCurto = (n?: string) => { const p = (n || "").trim().split(/\s+/).filter(Boolean); return p.length ? p.slice(0, 2).join(" ") : "Sem nome"; };

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
    <div style={{ borderRadius: 14, padding: 12, background: "linear-gradient(150deg, rgba(37,99,235,.10), transparent)", border: "1px solid color-mix(in srgb, var(--brand) 18%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Cake size={13} /></span>
        <b style={{ ...CABECALHO, color: "var(--brand)", fontSize: 11 }}>Aniversários de {MESES_PT[mes]}</b>
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
                <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCurto(f.nome)}</span>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 10px", borderRadius: 99 }}>
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
                <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCurto(f.nome)}</span>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, transparent)", padding: "3px 10px", borderRadius: 99 }}>
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

export default function ResumoHome({ funcs = [] }: { funcs?: Funcionario[]; nome?: string }) {
  return (
    <div className="resumo-card card" style={{ position: "relative", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--brand) 18%, transparent)", background: "linear-gradient(160deg, rgba(26,173,226,.10), rgba(139,92,246,.05) 55%, transparent)" }}>
      {/* brilho decorativo no canto — dá profundidade sem pesar */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,173,226,.18), transparent 70%)", pointerEvents: "none" }} />

      {/* pulso e aniversários lado a lado; empilham no celular */}
      <div className="resumo-blocos">
        <PulsoDoDia />
        <Aniversarios funcs={funcs} />
      </div>
    </div>
  );
}
