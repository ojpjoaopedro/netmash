"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Converte a chave pública (base64url) para o formato que o navegador exige.
function b64ToUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Estado = "carregando" | "indisponivel" | "negado" | "desligado" | "ligado" | "processando";

// Botão (ou card) para o cliente ativar/desativar as notificações no celular.
// como="botao" (padrão): fica no sininho. como="card": card de destaque na Home,
// que só aparece quando ainda NÃO está ativado.
export default function AtivarNotificacoes({ como = "botao" }: { como?: "botao" | "card" }) {
  const [estado, setEstado] = useState<Estado>("carregando");

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") { setEstado("indisponivel"); return; }
      if (Notification.permission === "denied") { setEstado("negado"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? "ligado" : "desligado");
      } catch { setEstado("desligado"); }
    })();
  }, []);

  async function ativar() {
    setEstado("processando");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setEstado(perm === "denied" ? "negado" : "desligado"); return; }
      const r = await fetch("/api/push/vapid");
      const { publicKey } = await r.json();
      if (!publicKey) { alert("As notificações ainda não foram configuradas no servidor."); setEstado("desligado"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      const { data: sess } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token || ""}` }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      setEstado("ligado");
    } catch { setEstado("desligado"); }
  }

  async function desligar() {
    setEstado("processando");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    } catch { /* ignore */ }
    setEstado("desligado");
  }

  if (estado === "carregando" || estado === "indisponivel") return null;

  // ── modo CARD (Home): só aparece quando dá pra ativar (não mostra se já ligado) ──
  if (como === "card") {
    if (estado === "ligado" || estado === "negado") return null;
    const ocupado = estado === "processando";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--line-2)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 15%, transparent)", color: "var(--brand)" }}><Bell size={19} /></span>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
          <b style={{ fontSize: 14, display: "block" }}>Receba os avisos no seu aparelho</b>
        </div>
        <button onClick={ativar} disabled={ocupado} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--brand)", color: "var(--brand-ct,#fff)", border: 0, borderRadius: 99, padding: "9px 18px", fontSize: 13, fontWeight: 800, cursor: ocupado ? "default" : "pointer", fontFamily: "inherit", opacity: ocupado ? 0.7 : 1 }}>
          {ocupado ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Bell size={14} />} {ocupado ? "…" : "Ativar"}
        </button>
      </div>
    );
  }

  const base: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, border: "1px solid var(--line-2)" };

  if (estado === "negado") return (
    <div style={{ ...base, cursor: "default", color: "var(--muted)", flexDirection: "column", gap: 2, fontWeight: 600, fontSize: 11.5, lineHeight: 1.35, textAlign: "center" }}>
      <span>Notificações bloqueadas neste aparelho.</span>
      <span>Libere nas configurações do navegador.</span>
    </div>
  );
  if (estado === "processando") return <button disabled style={{ ...base, color: "var(--muted)", background: "var(--bg-2)" }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Um instante…</button>;
  if (estado === "ligado") return <button onClick={desligar} style={{ ...base, color: "var(--muted)", background: "transparent" }}><BellOff size={14} /> Desativar notificações no celular</button>;
  return <button onClick={ativar} style={{ ...base, color: "#fff", background: "var(--brand)", border: "1px solid var(--brand)" }}><Bell size={14} /> Ativar notificações no celular</button>;
}
