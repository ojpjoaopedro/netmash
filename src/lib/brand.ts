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
