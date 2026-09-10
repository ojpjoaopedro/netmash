/**
 * Configuração pública lida no servidor (páginas de venda). Hoje: ID do Pixel
 * da Meta, editável no /admin e guardado na tabelinha app_kv. Se o banco não
 * estiver configurado ou a chave não existir, cai no pixel padrão.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

// Pixel usado hoje (fallback se nada estiver salvo no banco).
export const PIXEL_PADRAO = "574774374290188";

/** Lê o ID do Pixel salvo no admin. Nunca lança: sempre devolve um ID válido. */
export async function getPixelId(): Promise<string> {
  if (!url || !serviceKey) return PIXEL_PADRAO;
  try {
    const s = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await s.from("app_kv").select("valor").eq("chave", "pixel_id").maybeSingle();
    const id = (data as { valor?: string } | null)?.valor?.trim();
    return id || PIXEL_PADRAO;
  } catch {
    return PIXEL_PADRAO;
  }
}
