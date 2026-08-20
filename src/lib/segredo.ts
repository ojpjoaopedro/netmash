// Cifra/decifra textos curtos no servidor (AES-256-GCM).
//
// Uso: guardar a senha que o cliente escolheu na landing de assinatura até o
// pagamento ser confirmado. Só depois disso a conta é criada no Supabase e o
// campo é apagado. Nunca guardamos senha em texto puro.
//
// A chave vem de CHECKOUT_SECRET (ambiente) ou da tabela app_kv ('checkout_secret'),
// no mesmo padrão das chaves VAPID do push. Trocar a chave invalida as vendas
// que ainda estão pendentes (a conta delas não conseguirá ser criada).
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALGO = "aes-256-gcm";

/** Deriva 32 bytes a partir do segredo configurado (aceita frase de qualquer tamanho). */
function chave(segredo: string): Buffer {
  return crypto.createHash("sha256").update(segredo).digest();
}

/** Lê o segredo do ambiente ou do banco. Devolve "" quando não houver nenhum. */
export async function segredoCheckout(s?: SupabaseClient | null): Promise<string> {
  const doEnv = (process.env.CHECKOUT_SECRET || "").trim();
  if (doEnv) return doEnv;
  if (!s) return "";
  try {
    const { data } = await s.from("app_kv").select("valor").eq("chave", "checkout_secret").maybeSingle();
    return ((data as { valor?: string } | null)?.valor || "").trim();
  } catch { return ""; }
}

/** Cifra um texto. Formato: v1.iv.tag.dados (tudo em base64url). */
export function cifrar(texto: string, segredo: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv(ALGO, chave(segredo), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), dados.toString("base64url")].join(".");
}

/** Decifra o que veio de cifrar(). Devolve null se a chave mudou ou o dado está corrompido. */
export function decifrar(pacote: string, segredo: string): string | null {
  try {
    const [v, iv, tag, dados] = (pacote || "").split(".");
    if (v !== "v1" || !iv || !tag || !dados) return null;
    const d = crypto.createDecipheriv(ALGO, chave(segredo), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(dados, "base64url")), d.final()]).toString("utf8");
  } catch { return null; }
}
