import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as chaves do Supabase já foram preenchidas no .env.local */
export const supabaseReady = Boolean(url && anonKey);

/**
 * Onde a sessão fica guardada depende da opção "Lembrar de mim" no login:
 * - marcada (me_lembrar != "0"): localStorage, a sessão sobrevive ao fechar o navegador.
 * - desmarcada (me_lembrar === "0"): sessionStorage, a sessão acaba quando fecha o navegador.
 * A senha em si NUNCA é guardada; o que persiste é o token de sessão do Supabase.
 */
const authStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    const lembrar = window.localStorage.getItem("me_lembrar") !== "0";
    const store = lembrar ? window.localStorage : window.sessionStorage;
    return store.getItem(key) ?? window.localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    const lembrar = window.localStorage.getItem("me_lembrar") !== "0";
    if (lembrar) { window.localStorage.setItem(key, value); window.sessionStorage.removeItem(key); }
    else { window.sessionStorage.setItem(key, value); window.localStorage.removeItem(key); }
  },
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

/**
 * Cliente do Supabase para o navegador.
 * Enquanto as chaves não estiverem configuradas, o app roda em modo
 * demonstração com dados de exemplo (ver src/lib/demo.ts).
 */
export const supabase = supabaseReady
  ? createClient(url as string, anonKey as string, {
      auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
