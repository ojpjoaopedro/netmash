"use client";
import { useEffect, useState, useCallback } from "react";

/**
 * Marca white-label + tema. Guardado no navegador (localStorage) para o MVP.
 * Depois pode migrar para a tabela `empresas` no Supabase (logo_url, cor, tema).
 */
export type Brand = {
  nome: string;
  logo: string | null; // data URL ou URL
  cor: string;         // accent (hex)
  saudacao: string;    // ex: "Time Dynamis" / nome do dono
};

const KEY = "fin_brand";
const KEY_THEME = "fin_theme";

const DEFAULT: Brand = { nome: "Minha Empresa", logo: null, cor: "#1AADE2", saudacao: "" };

function read(): Brand {
  if (typeof window === "undefined") return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULT; }
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
      if (next.cor) document.documentElement.style.setProperty("--brand", next.cor);
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

  // aplica cor custom no load
  useEffect(() => {
    if (brand.cor) document.documentElement.style.setProperty("--brand", brand.cor);
  }, [brand.cor]);

  return { brand, save, theme, toggleTheme };
}
