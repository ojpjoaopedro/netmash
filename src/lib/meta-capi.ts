/**
 * Conversions API da Meta (Facebook): envia o evento de compra (Purchase) pelo
 * servidor quando o pagamento é confirmado na Cakto. É mais confiável que o pixel
 * do navegador (dispara mesmo se o cliente fechar a aba) e usa o mesmo token/pixel
 * configurados no /admin (app_kv: pixel_id, meta_access_token).
 * Best-effort: nunca derruba o webhook se a Meta falhar.
 */
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Dispara Purchase pela Conversions API. Silencioso: só loga em caso de erro. */
export async function enviarPurchaseCapi(
  s: SupabaseClient,
  dados: { valor: number; email?: string | null; telefone?: string | null; eventId: string },
): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const { data } = await s.from("app_kv").select("chave,valor").in("chave", ["pixel_id", "meta_access_token", "trafego_capi_purchase"]);
    const m = new Map((data ?? []).map((r: { chave: string; valor: string | null }) => [r.chave, r.valor]));
    // Desligado por padrão: só dispara se o admin ligar explicitamente. Evita
    // contar em dobro quando o Purchase já é disparado pelo pixel (ex.: Cakto).
    if ((m.get("trafego_capi_purchase") || "").trim() !== "on") return { ok: false, motivo: "capi purchase desligado" };
    const pixel = (m.get("pixel_id") || "").trim();
    const token = (m.get("meta_access_token") || "").trim();
    if (!pixel || !token) return { ok: false, motivo: "sem pixel/token configurado" };

    const userData: Record<string, string[]> = {};
    const email = (dados.email || "").trim().toLowerCase();
    if (email) userData.em = [sha256(email)];
    const fone = (dados.telefone || "").replace(/\D/g, "");
    if (fone) userData.ph = [sha256(fone)];

    const body = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: dados.eventId,   // mesmo id dedupa se o navegador também mandar
        user_data: userData,
        custom_data: { value: Math.round((dados.valor || 0) * 100) / 100, currency: "BRL" },
      }],
    };
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return { ok: false, motivo: j?.error?.message || `HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}
