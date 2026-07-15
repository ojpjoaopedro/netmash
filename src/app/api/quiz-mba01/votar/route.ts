/**
 * Rota PÚBLICA (sem login) — recebe o voto do aluno na aula de MBA.
 *
 * Só aceita POST e só sabe incrementar. Não devolve o placar: quem vota não
 * pode ver o resultado, senão o último a votar segue a maioria. O placar sai
 * pela rota /api/quiz-mba01.
 *
 * A soma é feita pelo RPC votar_mba01 (ver supabase/quiz-mba01.sql), que
 * incrementa dentro do banco. Ler-somar-gravar aqui perderia votos quando a
 * turma inteira votasse ao mesmo tempo.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export const QUIZ_ID = "meta_tem_plano";

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  let voto: unknown;
  try {
    ({ voto } = await request.json());
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (voto !== "sim" && voto !== "nao") {
    return NextResponse.json({ erro: 'voto deve ser "sim" ou "nao"' }, { status: 400 });
  }

  const { error } = await s.rpc("votar_mba01", { p_id: QUIZ_ID, p_voto: voto });
  if (error) return NextResponse.json({ erro: "não deu para registrar" }, { status: 500 });

  // devolve só a confirmação — nunca o placar
  return NextResponse.json({ ok: true });
}
