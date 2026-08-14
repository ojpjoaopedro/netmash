"use client";
import { useEffect, useState } from "react";
import { UserPlus, Wallet, Zap, Share2, Send, X, ChevronDown, Lock } from "lucide-react";
import { navegar } from "@/lib/nav";

const APP = "Métricas";
const LINHA = (Icon: typeof UserPlus, txt: string) => ({ Icon, txt });
const BENEFICIOS = [
  LINHA(UserPlus, "A cada empresa que você indicar, ganha 50% de desconto por 2 meses."),
  LINHA(Wallet, "Sem tabela de valores e sem limite de indicações."),
  LINHA(Zap, "O desconto entra direto nas suas próximas mensalidades."),
];

function indicar() {
  const msg = `Conheça o ${APP}, a gestão financeira da sua empresa num app só. Crie a conta da sua empresa pela minha indicação!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

export default function MeusBeneficios() {
  const [faq, setFaq] = useState(true);
  const [reg, setReg] = useState(false);
  const [sugestao, setSugestao] = useState("");
  const [enviado, setEnviado] = useState(false);

  // benefícios ficam bloqueados até concluir o Guia de configuração (premiação)
  const [liberado, setLiberado] = useState(true);
  useEffect(() => {
    const ver = () => setLiberado(localStorage.getItem("me_guia_concluido") === "1");
    ver();
    window.addEventListener("me:guia-concluido", ver);
    window.addEventListener("storage", ver);
    return () => { window.removeEventListener("me:guia-concluido", ver); window.removeEventListener("storage", ver); };
  }, []);

  if (!liberado) {
    return (
      <div className="card" style={{ position: "relative", padding: 34, textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => navegar({ view: "dashboard" })} title="Voltar" style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--bg-2)", border: "1px solid var(--line-2)", cursor: "pointer", color: "var(--muted)" }}><X size={17} /></button>
        <span style={{ width: 60, height: 60, borderRadius: 18, display: "grid", placeItems: "center", margin: "0 auto 16px", background: "var(--bg-2)", color: "var(--muted)" }}><Lock size={28} /></span>
        <b style={{ fontSize: 18 }}>Seus benefícios estão quase liberados</b>
        <p className="sub" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
          Complete o <b>Guia de configuração</b> (canto inferior direito da tela) para desbloquear os seus benefícios. 🎁
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* banner indique e ganhe */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "30px 32px", color: "#fff", background: "linear-gradient(120deg, var(--brand-dark), var(--brand))" }}>
        <div style={{ position: "absolute", right: -60, top: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <b style={{ fontSize: 21, lineHeight: 1.3, letterSpacing: "-.01em" }}>Indique empresas e ganhe 50% de desconto por 2 meses a cada indicação</b>
          <div style={{ display: "grid", gap: 10, margin: "18px 0 22px" }}>
            {BENEFICIOS.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "rgba(255,255,255,.92)" }}>
                <b.Icon size={17} style={{ flexShrink: 0, opacity: .9 }} /> {b.txt}
              </div>
            ))}
          </div>
          <button onClick={indicar} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, padding: "11px 22px", borderRadius: 99, border: 0, background: "#fff", color: "var(--brand-dark)" }}>
            <Share2 size={16} /> Indicar amigo empreendedor
          </button>
        </div>
      </div>

      {/* principais dúvidas */}
      <div className="card" style={{ padding: 22 }}>
        <b style={{ fontSize: 17 }}>Principais dúvidas</b>
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)" }}>
          <button onClick={() => setFaq((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", background: "transparent", border: 0, fontFamily: "inherit", padding: "14px 0", fontSize: 14.5, fontWeight: 700, color: "var(--txt)" }}>
            Programa de Indicação
            <ChevronDown size={18} style={{ transition: ".2s", transform: faq ? "rotate(180deg)" : "none", color: "var(--muted)" }} />
          </button>
          {faq && (
            <div style={{ paddingBottom: 8, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
              <p>A cada empresa que você indicar, você ganha <b>50% de desconto por 2 meses</b> na sua mensalidade. Sem tabela de valores e sem limite de indicações: quanto mais indicar, mais desconto acumula.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, margin: "14px 0" }}>
                <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "14px 16px" }}>
                  <b style={{ color: "var(--txt)" }}>Você (indicador)</b>
                  <div style={{ marginTop: 6 }}><b style={{ color: "var(--txt)" }}>50% de desconto</b> por <b style={{ color: "var(--txt)" }}>2 meses</b></div>
                  <div>a cada empresa que indicar</div>
                </div>
              </div>
              <p>A indicação é considerada válida assim que a empresa indicada tiver a conta aprovada e fizer o primeiro uso de um produto. O desconto é aplicado nas suas <b>2 mensalidades seguintes</b> e não pode ser convertido em dinheiro nem transferido.</p>
              <button onClick={() => setReg(true)} style={{ marginTop: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, color: "var(--brand)", textDecoration: "underline" }}>Ler o regulamento completo</button>
            </div>
          )}
        </div>
      </div>

      {/* formulário de sugestões */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }} className="benef-sug">
          <div>
            <b style={{ fontSize: 16 }}>Formulário de sugestões</b>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.6 }}>Sua opinião ajuda a melhorar o {APP}. Tem uma ideia, sentiu falta de alguma funcionalidade ou quer sugerir uma melhoria? Conte pra gente.</p>
          </div>
          <div>
            <label className="f" style={{ display: "block", marginBottom: 6 }}>Nos conte como podemos melhorar para você</label>
            <textarea value={sugestao} onChange={(e) => { setSugestao(e.target.value); setEnviado(false); }} placeholder="Descreva aqui suas sugestões." rows={4}
              style={{ width: "100%", resize: "vertical", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--txt)", fontFamily: "inherit", fontSize: 13.5 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <button className="btn" onClick={() => { if (sugestao.trim()) { setEnviado(true); setSugestao(""); } }} disabled={!sugestao.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Send size={15} /> Enviar sugestões
              </button>
              {enviado && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#10B981" }}>Sugestão enviada. Obrigado!</span>}
            </div>
          </div>
        </div>
      </div>

      {/* modal do regulamento */}
      {reg && (
        <div onClick={() => setReg(false)} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 640, padding: 26, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <b style={{ fontSize: 18 }}>Regulamento · Programa de Indicação</b>
              <button onClick={() => setReg(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--txt-2)", display: "grid", gap: 10 }}>
              <b>1. Definições</b>
              <p><b>Indicador:</b> cliente que indica uma empresa para criar uma conta na plataforma e recebe o benefício. <b>Indicado:</b> empresa que recebeu o convite. <b>Desconto promocional:</b> abatimento de 50% na mensalidade do indicador, por 2 meses, concedido após o cumprimento dos critérios; não pode ser convertido em dinheiro nem transferido.</p>
              <b>2. Como indicar uma empresa</b>
              <p>Acesse a área de Benefícios e envie o convite por e-mail ou pelas redes sociais (WhatsApp e link de indicação).</p>
              <b>3. Regras e funcionamento</b>
              <p>O <b>indicador</b> recebe <b>50% de desconto por 2 meses</b> a cada indicação válida. Para a indicação ser válida, a empresa indicada deve: (a) criar a conta pelo link enviado; (b) ter a conta aprovada; (c) usar um dos produtos da plataforma. O desconto é aplicado nas <b>2 mensalidades seguintes</b> à validação. Não há limite de empresas indicadas: cada indicação válida gera um novo período de 2 meses com 50% de desconto.</p>
              <b>4. Disposições gerais</b>
              <p>O Programa de Indicação pode ser alterado ou encerrado a qualquer momento. Ao participar, o cliente declara ter lido e aceito integralmente este regulamento.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button className="btn" onClick={() => setReg(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
