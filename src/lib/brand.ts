"use client";
import { useEffect, useState, useCallback } from "react";

/**
 * Marca white-label + tema. Guardado no navegador (localStorage) para o MVP.
 * Depois pode migrar para a tabela `empresas` no Supabase (logo_url, cor, tema).
 */
export type Brand = {
  nome: string;
  logo: string | null;   // data URL ou URL
  cor: string;           // accent (hex)
  saudacao: string;      // ex: "Time Dynamis" / nome do dono
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

/** Aplica a cor da marca em todo o app (--brand e seus tons claro/escuro). */
function aplicarCor(cor: string) {
  if (typeof document === "undefined" || !cor) return;
  const raiz = document.documentElement.style;
  raiz.setProperty("--brand", cor);
  raiz.setProperty("--brand-dark", tom(cor, -0.28));
  raiz.setProperty("--brand-light", tom(cor, 0.32));
}

export function useBrand() {
  const [brand, setBrand] = useState<Brand>(DEFAULT);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setBrand(read());
    const t = (localStorage.getItem(KEY_THEME) as "dark" | "light") || "dark";
    setThemeState(t);
    document.body.classList.toggle("theme-light", t === "light");
  }, []);

  const save = useCallback((patch: Partial<Brand>) => {
    setBrand((cur) => {
      const next = { ...cur, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      aplicarCor(next.cor);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(KEY_THEME, next);
      document.body.classList.toggle("theme-light", next === "light");
      return next;
    });
  }, []);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    localStorage.setItem(KEY_THEME, t);
    document.body.classList.toggle("theme-light", t === "light");
  }, []);

  // aplica cor custom no load
  useEffect(() => { aplicarCor(brand.cor); }, [brand.cor]);

  return { brand, save, theme, toggleTheme, setTheme };
}
