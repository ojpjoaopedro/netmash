import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
// Um ou mais códigos válidos (separados por vírgula). Ex.: CODIGO_ACESSO="MINHA2026,VIP10"
const CODES = (process.env.CODIGO_ACESSO || "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!CODES.length) return NextResponse.json({ error: "Nenhum código de acesso configurado no servidor." }, { status: 500 });

  const { nome, empresa, email, senha, codigo } = (await req.json()) as
    { nome?: string; empresa?: string; email?: string; senha?: string; codigo?: string };

  if (!email || !senha || senha.length < 6) return NextResponse.json({ error: "Informe e-mail e senha (mín. 6 caracteres)." }, { status: 400 });
  if (!codigo || !CODES.includes(codigo.trim().toLowerCase())) return NextResponse.json({ error: "Código de acesso inválido. Confira o código que você recebeu na compra." }, { status: 403 });

  const { data, error } = await s.auth.admin.createUser({
    email: email.trim().toLowerCase(), password: senha, email_confirm: true,
    user_metadata: { nome: nome || email, empresa: empresa || nome || "" },
  });
  if (error || !data?.user) {
    const msg = /already.*registered|exists/i.test(error?.message || "") ? "Este e-mail já tem conta. Faça login." : (error?.message || "Não consegui criar a conta.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  // O gatilho handle_new_user já cria empresa + perfil (dono).
  return NextResponse.json({ ok: true });
}
