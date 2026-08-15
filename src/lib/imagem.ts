"use client";

/**
 * Reduz e comprime uma imagem (data URL ou URL) para caber tranquilo no
 * banco/localStorage. Mantém a proporção, limita o maior lado a `maxDim`px e
 * exporta em WebP (mantém transparência e fica bem menor); se o navegador não
 * suportar WebP, cai para PNG. Se o resultado ficar maior que o original, mantém
 * o menor. Roda só no navegador.
 */
export async function reduzirImagem(src: string, maxDim = 256, quality = 0.82): Promise<string> {
  if (typeof window === "undefined" || !src) return src;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maior = Math.max(img.width, img.height) || 1;
        const escala = Math.min(1, maxDim / maior);
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(src); return; }
        ctx.drawImage(img, 0, 0, w, h);
        let out = "";
        try { out = canvas.toDataURL("image/webp", quality); } catch { out = ""; }
        if (!out || !out.startsWith("data:image/webp")) out = canvas.toDataURL("image/png");
        resolve(out && out.length < src.length ? out : (out || src));
      } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/**
 * Sobe a logo para o Storage (cofre de imagens) via /api/logo-upload e devolve a
 * URL pública. Se falhar (sem banco, offline, imagem inválida), devolve null para
 * o chamador cair no fallback de guardar a imagem embutida. Roda só no navegador.
 */
export async function enviarLogo(dataUrl: string, empresaId?: string | null): Promise<string | null> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:image/")) return null;
  try {
    const r = await fetch("/api/logo-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, empresaId: empresaId || undefined }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.url === "string" ? j.url : null;
  } catch { return null; }
}
