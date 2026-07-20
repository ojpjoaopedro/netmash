"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { registrarConsentimentoLgpd } from "@/lib/db";

/**
 * Consentimento LGPD — aparece uma vez para quem entra na plataforma.
 * Guarda a aceitação por usuário (data/hora) no navegador. Enquanto não
 * aceitar, o app fica bloqueado por baixo do modal.
 */
export default function LgpdConsent({ userKey, onSair }: { userKey: string; onSair?: () => void }) {
  const chave = `me_lgpd:${userKey || "anon"}`;
  const [aberto, setAberto] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(chave)) setAberto(true);
  }, [chave]);

  function aceitar() {
    if (!ok) return;
    localStorage.setItem(chave, new Date().toISOString());
    registrarConsentimentoLgpd().catch(() => { /* best-effort */ });
    setAberto(false);
  }

  if (!aberto) return null;

  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="modal" style={{ maxWidth: 540 }} role="dialog" aria-modal="true">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.15)", color: "var(--brand)" }}><ShieldCheck size={22} /></span>
          <h2 style={{ margin: 0 }}>Proteção de dados (LGPD)</h2>
        </div>
        <p className="sub" style={{ lineHeight: 1.6, marginTop: 6 }}>
          Antes de continuar, precisamos do seu consentimento. Ao usar o app, você concorda que seus dados
          (cadastro, lançamentos financeiros e indicadores) sejam tratados <b>exclusivamente para o funcionamento do painel</b>,
          conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
        </p>
        <ul style={{ margin: "12px 0", paddingLeft: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {[
            "Seus dados servem apenas a você e à sua empresa.",
            "Não vendemos nem compartilhamos seus dados com terceiros.",
            "Você pode solicitar a exclusão dos seus dados a qualquer momento.",
          ].map((t, i) => (
            <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--txt-2)" }}>
              <Check size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} /> {t}
            </li>
          ))}
        </ul>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13.5, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--card-2)" }}>
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "var(--brand)" }} />
          <span>Li e aceito a <a href="/privacidade" target="_blank" rel="noopener" style={{ color: "var(--brand)", textDecoration: "underline" }}>Política de Privacidade</a> e o tratamento dos meus dados conforme a LGPD.</span>
        </label>
        <div className="row" style={{ marginTop: 16, justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn ghost sm" type="button" onClick={() => onSair?.()}>Recusar e sair</button>
          <button className="btn" type="button" onClick={aceitar} disabled={!ok}>Aceitar e continuar</button>
        </div>
      </div>
    </div>
  );
}
