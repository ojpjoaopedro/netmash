import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as chaves do Supabase já foram preenchidas no .env.local */
export const supabaseReady = Boolean(url && anonKey);

/**
 * Cliente do Supabase para o navegador.
 * Enquanto as chaves não estiverem configuradas, o app roda em modo
 * demonstração com dados de exemplo (ver src/lib/demo.ts).
 */
export const supabase = supabaseReady
  ? createClient(url as string, anonKey as string)
  : null;
