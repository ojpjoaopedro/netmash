"use client";
import { useEffect, useRef, useState } from "react";
import { Crop, Check, X } from "lucide-react";

/**
 * Tela de "lapidação" da logomarca: o usuário arrasta e redimensiona um retângulo
 * sobre a imagem escolhida e recorta exatamente o pedaço certo. Usado SÓ para a logo.
 */
type Rect = { x: number; y: number; w: number; h: number };
const MAXW = 520, MAXH = 300, MIN = 28, HANDLE = 14;

export default function CropLogo({ src, onConfirm, onCancel, quadrado = false, titulo = "Ajustar a logomarca" }: {
  src: string; onConfirm: (dataUrl: string) => void; onCancel: () => void; onRemover?: () => void;
  quadrado?: boolean; titulo?: string; dica?: string; textoRemover?: string;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [disp, setDisp] = useState<{ w: number; h: number } | null>(null); // tamanho exibido da imagem
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const drag = useRef<{ modo: string; px: number; py: number; base: Rect } | null>(null);

  // ao carregar a imagem, calcula o tamanho exibido (contain) e inicia o recorte na imagem toda
  const aoCarregar = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    const nW = im.naturalWidth || 1, nH = im.naturalHeight || 1;
    const escala = Math.min(MAXW / nW, MAXH / nH, 1);
    const w = Math.round(nW * escala), h = Math.round(nH * escala);
    setDisp({ w, h });
    if (quadrado) { const s = Math.min(w, h); setRect({ x: Math.round((w - s) / 2), y: Math.round((h - s) / 2), w: s, h: s }); }
    else setRect({ x: 0, y: 0, w, h });
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const iniciar = (modo: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { modo, px: e.clientX, py: e.clientY, base: { ...rect } };
  };
  const mover = (e: React.PointerEvent) => {
    if (!drag.current || !disp) return;
    const { modo, px, py, base } = drag.current;
    const dx = e.clientX - px, dy = e.clientY - py;
    let { x, y, w, h } = base;
    if (modo === "mover") {
      x = clamp(base.x + dx, 0, disp.w - base.w);
      y = clamp(base.y + dy, 0, disp.h - base.h);
    } else if (quadrado) {
      // cantos travados em quadrado (1:1): âncora no canto oposto
      let desejado: number, maxLado: number;
      if (modo === "se") { desejado = Math.max(base.w + dx, base.h + dy); maxLado = Math.min(disp.w - base.x, disp.h - base.y); const s = clamp(desejado, MIN, maxLado); w = h = s; }
      else if (modo === "nw") { desejado = Math.max(base.w - dx, base.h - dy); maxLado = Math.min(base.x + base.w, base.y + base.h); const s = clamp(desejado, MIN, maxLado); w = h = s; x = base.x + base.w - s; y = base.y + base.h - s; }
      else if (modo === "ne") { desejado = Math.max(base.w + dx, base.h - dy); maxLado = Math.min(disp.w - base.x, base.y + base.h); const s = clamp(desejado, MIN, maxLado); w = h = s; y = base.y + base.h - s; }
      else { /* sw */ desejado = Math.max(base.w - dx, base.h + dy); maxLado = Math.min(base.x + base.w, disp.h - base.y); const s = clamp(desejado, MIN, maxLado); w = h = s; x = base.x + base.w - s; }
    } else {
      // cantos livres: nw, ne, sw, se
      if (modo.includes("w")) { const nx = clamp(base.x + dx, 0, base.x + base.w - MIN); w = base.w + (base.x - nx); x = nx; }
      if (modo.includes("e")) { w = clamp(base.w + dx, MIN, disp.w - base.x); }
      if (modo.includes("n")) { const ny = clamp(base.y + dy, 0, base.y + base.h - MIN); h = base.h + (base.y - ny); y = ny; }
      if (modo.includes("s")) { h = clamp(base.h + dy, MIN, disp.h - base.y); }
    }
    setRect({ x, y, w, h });
  };
  const soltar = (e: React.PointerEvent) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); drag.current = null; };

  const confirmar = () => {
    const im = imgRef.current; if (!im || !disp) return;
    const escala = (im.naturalWidth || 1) / disp.w; // exibido -> natural
    const sw = Math.max(1, Math.round(rect.w * escala)), sh = Math.max(1, Math.round(rect.h * escala));
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = sh;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.drawImage(im, Math.round(rect.x * escala), Math.round(rect.y * escala), sw, sh, 0, 0, sw, sh);
    onConfirm(cv.toDataURL("image/png"));
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const cantos = [
    { modo: "nw", cx: rect.x, cy: rect.y, cur: "nwse-resize" },
    { modo: "ne", cx: rect.x + rect.w, cy: rect.y, cur: "nesw-resize" },
    { modo: "sw", cx: rect.x, cy: rect.y + rect.h, cur: "nesw-resize" },
    { modo: "se", cx: rect.x + rect.w, cy: rect.y + rect.h, cur: "nwse-resize" },
  ];

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(2px)", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: MAXW + 48, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Crop size={18} /></span>
          <b style={{ fontSize: 16 }}>{titulo}</b>
        </div>

        <div ref={boxRef} style={{ position: "relative", width: disp?.w, height: disp?.h, margin: "16px auto 4px", touchAction: "none", userSelect: "none", maxWidth: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="logo" onLoad={aoCarregar} draggable={false}
            style={{ display: "block", width: disp?.w, height: disp?.h, borderRadius: 8, pointerEvents: "none" }} />
          {disp && (
            <div onPointerDown={iniciar("mover")} onPointerMove={mover} onPointerUp={soltar}
              style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, cursor: "move",
                border: "2px solid var(--brand)", boxShadow: "0 0 0 9999px rgba(15,23,42,.5)", boxSizing: "border-box" }}>
              {cantos.map((c) => (
                <span key={c.modo} onPointerDown={iniciar(c.modo)} onPointerMove={mover} onPointerUp={soltar}
                  style={{ position: "absolute", left: c.cx - rect.x - HANDLE / 2, top: c.cy - rect.y - HANDLE / 2, width: HANDLE, height: HANDLE,
                    borderRadius: 4, background: "#fff", border: "2px solid var(--brand)", cursor: c.cur }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onCancel} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><X size={15} /> Cancelar</button>
          <button className="btn" onClick={confirmar} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} /> Usar recorte</button>
        </div>
      </div>
    </div>
  );
}
