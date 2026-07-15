/**
 * Placar do quiz da aula de MBA.
 *
 * GET  → { sim, nao, total }
 * POST → { acao: 'zerar' } limpa a votação para a próxima turma
 *
 * ⚠️ DIFERENÇA EM RELAÇÃO AO HUB: lá esta rota exigia login, então o aluno não
 * conseguia ver o placar antes de o professor revelar. Aqui o deck é público
 * (decisão do Diogo), então esta rota também é. Um aluno curioso que abrir
 * /mbaaula01 e clicar em "revelar" vê o resultado antes da hora.
 * Se isso incomodar, o caminho é exigir sessão Supabase aqui e no botão revelar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const QUIZ_ID = "meta_tem_plano";

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  const { data, error } = await s
    .from("quiz_mba01")
    .select("sim, nao")
    .eq("id", QUIZ_ID)
    .maybeSingle();

  if (error) return NextResponse.json({ erro: "falha ao ler o placar" }, { status: 500 });

  const sim = data?.sim ?? 0;
  const nao = data?.nao ?? 0;
  return NextResponse.json({ sim, nao, total: sim + nao });
}

export async function POST(request: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  let acao: unknown;
  try {
    ({ acao } = await request.json());
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (acao !== "zerar") {
    return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
  }

  const { error } = await s
    .from("quiz_mba01")
    .upsert({ id: QUIZ_ID, sim: 0, nao: 0, atualizado_em: new Date().toISOString() });

  if (error) return NextResponse.json({ erro: "não deu para zerar" }, { status: 500 });

  return NextResponse.json({ sim: 0, nao: 0, total: 0 });
}
