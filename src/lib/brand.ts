"use client";
import { useEffect, useState, useCallback } from "react";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";

/**
 * Marca white-label + tema. Guardado no navegador (localStorage) para o MVP.
 * Depois pode migrar para a tabela `empresas` no Supabase (logo_url, cor, tema).
 */
export type Brand = {
  nome: string;
  logo: string | null;   // data URL ou URL
  cor: string;           // accent (hex)
  saudacao: string;      // ex: "Time Financeiro" / nome do dono
  logoTamanho: number;   // altura da logo na barra lateral (px)
};

const KEY = "fin_brand";
const KEY_THEME = "fin_theme";

const DEFAULT: Brand = { nome: "Minha Empresa", logo: null, cor: "#1AADE2", saudacao: "", logoTamanho: 40 };

function read(): Brand {
  if (typeof window === "undefined") return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULT; }
}

/** Clareia (pct>0) ou escurece (pct<0) um hex — gera os tons da marca. */
function tom(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const n = parseInt(h, 16);
  const alvo = pct < 0 ? 0 : 255, p = Math.abs(pct);
  const mix = (c: number) => Math.round((alvo - c) * p + c);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function rgbDe(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Aplica a cor da marca em todo o app (--brand e seus tons claro/escuro).
 *
 * Tratamento especial para os 2 extremos: preto puro some na barra lateral
 * (que é escura) e branco puro deixa o texto dos botões invisível (texto branco
 * em fundo branco). Nesses casos usamos uma paleta cinza legível e ajustamos a
 * cor do texto sobre a marca (--brand-ct).
 */
function aplicarCor(cor: string) {
  if (typeof document === "undefined" || !cor) return;
  const raiz = document.documentElement.style;
  const c = rgbDe(cor);
  const preto = !!c && c.r <= 20 && c.g <= 20 && c.b <= 20;
  const branco = !!c && c.r >= 235 && c.g >= 235 && c.b >= 235;

  let brand = cor, dark = tom(cor, -0.28), light = tom(cor, 0.32), ct = "#ffffff";
  if (preto) { brand = "#475569"; dark = "#334155"; light = "#64748b"; ct = "#ffffff"; }
  else if (branco) { brand = "#cbd5e1"; dark = "#94a3b8"; light = "#e2e8f0"; ct = "#0f172a"; }

  raiz.setProperty("--brand", brand);
  raiz.setProperty("--brand-dark", dark);
  raiz.setProperty("--brand-light", light);
  raiz.setProperty("--brand-ct", ct);
}

export function useBrand() {
  const [brand, setBrand] = useState<Brand>(DEFAULT);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const carregar = () => {
      setBrand(read());
      const t = (localStorage.getItem(KEY_THEME) as "dark" | "light") || "dark";
      setThemeState(t);
      document.body.classList.toggle("theme-light", t === "light");
    };
    carregar();
    // quando a marca/tema vier do banco (sync ao abrir o painel), recarrega
    window.addEventListener("me:brand", carregar);
    // aplica a marca DIRETO do banco (o logo é grande e pode não caber no localStorage;
    // por isso não dá para depender só do cache local ao dar F5).
    const aplicarRemoto = (e: Event) => {
      const d = (e as CustomEvent).detail as { brand?: string; theme?: string } | undefined;
      if (d?.brand) { try { const b: Brand = { ...DEFAULT, ...JSON.parse(d.brand) }; setBrand(b); aplicarCor(b.cor); } catch { /* ignore */ } }
      if (d?.theme === "light" || d?.theme === "dark") { setThemeState(d.theme); document.body.classList.toggle("theme-light", d.theme === "light"); }
    };
    window.addEventListener("me:brand-remoto", aplicarRemoto);
    return () => { window.removeEventListener("me:brand", carregar); window.removeEventListener("me:brand-remoto", aplicarRemoto); };
  }, []);

  const save = useCallback((patch: Partial<Brand>) => {
    setBrand((cur) => {
      const next = { ...cur, ...patch };
      const cru = JSON.stringify(next);
      localStorage.setItem(KEY, cru);
      salvarEstadoRemoto(KEY, cru);
      aplicarCor(next.cor);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(KEY_THEME, next);
      salvarEstadoRemoto(KEY_THEME, next);
      document.body.classList.toggle("theme-light", next === "light");
      return next;
    });
  }, []);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    localStorage.setItem(KEY_THEME, t);
    salvarEstadoRemoto(KEY_THEME, t);
    document.body.classList.toggle("theme-light", t === "light");
  }, []);

  // aplica cor custom no load
  useEffect(() => { aplicarCor(brand.cor); }, [brand.cor]);

  // aplica a marca/tema vindos DIRETO do banco (chamada direta, sem depender de evento nem do localStorage)
  const aplicarRemoto = useCallback((brandJson?: string | null, t?: string | null) => {
    if (brandJson) { try { const b: Brand = { ...DEFAULT, ...JSON.parse(brandJson) }; setBrand(b); aplicarCor(b.cor); } catch { /* ignore */ } }
    if (t === "light" || t === "dark") { setThemeState(t); document.body.classList.toggle("theme-light", t === "light"); }
  }, []);

  // aplica SÓ o logo/cor (vindos da tabela empresas — fonte confiável), preservando nome/saudação/tamanho
  const aplicarLogoCor = useCallback((logo?: string | null, cor?: string | null) => {
    setBrand((cur) => ({ ...cur, ...(logo !== undefined ? { logo } : {}), ...(cor ? { cor } : {}) }));
    if (cor) aplicarCor(cor);
  }, []);

  return { brand, save, theme, toggleTheme, setTheme, aplicarRemoto, aplicarLogoCor };
}
