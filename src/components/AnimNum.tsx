"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * Conta de um valor ao outro ao longo de `ms` (padrão 4s), com desaceleração suave.
 * Se `enabled` for falso (ex.: usuário está digitando na própria célula), aplica o
 * valor na hora, sem animar. Só anima a partir da 1ª mudança (não anima na montagem).
 */
export function useCountUp(value: number, ms = 2000, enabled = true) {
  const [disp, setDisp] = useState(value);
  const dispRef = useRef(value);
  const montado = useRef(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const alvo = value;
    // primeira montagem, animação desligada, ou diferença desprezível: sem animar
    if (!montado.current || !enabled || Math.abs(alvo - dispRef.current) < 0.005) {
      montado.current = true;
      dispRef.current = alvo;
      setDisp(alvo);
      return;
    }
    const de = dispRef.current;
    const start = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - start) / ms);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const atual = de + (alvo - de) * e;
      dispRef.current = atual;
      setDisp(atual);
      if (t < 1) raf.current = requestAnimationFrame(passo);
      else { dispRef.current = alvo; setDisp(alvo); }
    };
    raf.current = requestAnimationFrame(passo);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms, enabled]);

  return disp;
}

/** Número que anima (conta) quando muda e dá um leve destaque verde que some. */
export function AnimNum({ value, fmt, prefix = "", ms = 2000, enabled = true, className, style }: {
  value: number; fmt: (n: number) => string; prefix?: string; ms?: number; enabled?: boolean;
  className?: string; style?: React.CSSProperties;
}) {
  const disp = useCountUp(value, ms, enabled);
  const [flashId, setFlashId] = useState(0);
  const prev = useRef(value);
  const montado = useRef(false);

  useEffect(() => {
    if (montado.current && enabled && Math.abs(value - prev.current) >= 0.005) {
      setFlashId((n) => n + 1);
    }
    montado.current = true;
    prev.current = value;
  }, [value, enabled]);

  return (
    <span className={className} style={style}>
      <span key={flashId} className={flashId ? "num-flash" : undefined} style={{ borderRadius: 5 }}>{prefix}{fmt(disp)}</span>
    </span>
  );
}
