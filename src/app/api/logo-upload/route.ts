import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Recebe a logo (data URL base64) e sobe para o bucket "logos" do Storage,
 * devolvendo a URL pública. Usa a chave de serviço (só no servidor).
 * O bucket é criado por migrations/supabase-storage-logos.sql.
 */
export async function POST(req: NextRequest) {
  if (!url || !serviceKey) return NextResponse.json({ error: "indisponível" }, { status: 500 });

  let body: { dataUrl?: string; empresaId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "json inválido" }, { status: 400 }); }

  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.dataUrl || "");
  if (!m) return NextResponse.json({ error: "imagem inválida" }, { status: 400 });

  const mime = m[1];
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/svg+xml" ? "svg" : "webp";
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length > 3_000_000) return NextResponse.json({ error: "imagem muito grande" }, { status: 413 });

  const empresaId = (body.empresaId || "").replace(/[^a-zA-Z0-9-]/g, "");
  // empresa existente: caminho estável (sobrescreve a logo antiga). Nova empresa (sem id): nome único.
  const path = empresaId ? `${empresaId}/logo.${ext}` : `novas/${randomUUID()}.${ext}`;

  const s = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await s.storage.from("logos").upload(path, buffer, { contentType: mime, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = s.storage.from("logos").getPublicUrl(path);
  // ?t=... força o navegador a recarregar quando a logo é trocada no mesmo caminho.
  return NextResponse.json({ url: `${data.publicUrl}?t=${Date.now()}` });
}
