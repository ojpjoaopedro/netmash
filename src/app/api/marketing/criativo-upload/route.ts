import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Sobe a imagem de um criativo (data URL base64) para o bucket "criativos" e
 * devolve a URL pública. Só super admin. Bucket criado por
 * migrations/supabase-trafego-criativos.sql.
 */
export async function POST(req: NextRequest) {
  if (!url || !serviceKey) return NextResponse.json({ error: "indisponível" }, { status: 500 });
  const s = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await s.auth.getUser(token) : { data: { user: null } };
  const email = u?.user?.email?.toLowerCase();
  if (!email || !SUPERS.includes(email)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  let body: { dataUrl?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "json inválido" }, { status: 400 }); }
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.dataUrl || "");
  if (!m) return NextResponse.json({ error: "imagem inválida" }, { status: 400 });

  const mime = m[1];
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "img";
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length > 6_000_000) return NextResponse.json({ error: "imagem muito grande (máx 6MB)" }, { status: 413 });

  const path = `${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const { error } = await s.storage.from("criativos").upload(path, buffer, { contentType: mime, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = s.storage.from("criativos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
