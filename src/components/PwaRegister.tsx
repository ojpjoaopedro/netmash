"use client";
import { useEffect } from "react";

// Registra o service worker (/sw.js) uma vez, no carregamento. É o que habilita
// instalar como app e receber notificações push. Falha silenciosa se o
// navegador não suportar (ex: iOS antigo) — não quebra nada.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("/sw.js").catch(() => { /* ignora */ });
    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);
  return null;
}
