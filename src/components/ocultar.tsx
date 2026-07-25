"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "me_ocultar_valores";

function ler(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Sincroniza a classe do body para o blur global dos valores. */
function aplicar(oc: boolean) {
  if (typeof document !== "undefined") document.body.classList.toggle("valores-ocultos", oc);
}

/** Hook do estado "ocultar valores" (compartilhado entre telas via evento + localStorage). */
export function useOcultar() {
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    const l = () => { const o = ler(); setOculto(o); aplicar(o); };
    l();
    window.addEventListener("me:ocultar", l);
    window.addEventListener("storage", l);
    return () => { window.removeEventListener("me:ocultar", l); window.removeEventListener("storage", l); };
  }, []);
  const toggle = () => {
    const n = !ler();
    try { localStorage.setItem(KEY, n ? "1" : "0"); } catch { /* ignore */ }
    aplicar(n);
    window.dispatchEvent(new Event("me:ocultar"));
  };
  return { oculto, toggle };
}

/** Botão "Ocultar valores / Mostrar valores". */
export default function BotaoOcultar() {
  const { oculto, toggle } = useOcultar();
  return (
    <button onClick={toggle} title={oculto ? "Mostrar valores" : "Ocultar valores"}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, padding: "7px 13px", borderRadius: 10, border: "1px solid var(--line-2)", background: "transparent", color: "var(--brand)" }}>
      {oculto ? <EyeOff size={15} /> : <Eye size={15} />} {oculto ? "Mostrar valores" : "Ocultar valores"}
    </button>
  );
}
