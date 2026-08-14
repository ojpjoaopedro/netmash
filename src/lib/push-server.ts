// Utilidades de servidor para Web Push. Só é importado por rotas de API (nodejs).
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

/** Cliente Supabase com service key (ignora RLS). Null se faltar env. */
export function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type Vapid = { publicKey: string; privateKey: string; subject: string };

/** Lê as chaves VAPID: env primeiro; se não houver, do banco (app_kv). */
export async function getVapid(s: SupabaseClient): Promise<Vapid | null> {
  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  let privateKey = process.env.VAPID_PRIVATE_KEY || "";
  let subject = process.env.VAPID_SUBJECT || "";
  if (!publicKey || !privateKey) {
    const { data } = await s.from("app_kv").select("chave,valor").in("chave", ["vapid_public", "vapid_private", "vapid_subject"]);
    const m = new Map(((data as { chave: string; valor: string | null }[] | null) ?? []).map((r) => [r.chave, r.valor]));
    publicKey = publicKey || m.get("vapid_public") || "";
    privateKey = privateKey || m.get("vapid_private") || "";
    subject = subject || m.get("vapid_subject") || "";
  }
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: subject || "mailto:contato@minhasmetricas.com" };
}

/** Configura o web-push com as chaves e devolve a instância pronta. */
export function comVapid(v: Vapid) {
  webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
  return webpush;
}

/** Envia uma notificação para uma inscrição. Retorna false se a inscrição
 *  estiver morta (410/404) para o chamador poder removê-la do banco. */
export async function enviarPush(
  wp: typeof webpush,
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<{ ok: boolean; morta: boolean }> {
  try {
    await wp.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, morta: false };
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return { ok: false, morta: code === 404 || code === 410 };
  }
}
