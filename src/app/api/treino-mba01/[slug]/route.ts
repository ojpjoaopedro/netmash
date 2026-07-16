/**
 * Dados do treino de UMA empresa. Rota PÚBLICA (o aluno não tem login).
 *
 * GET → { empresa, dados }
 * PUT → { dados } grava o exercício inteiro
 *
 * Quem tem o link mexe no exercício — é o mesmo contrato de um link de planilha
 * compartilhada. Não guardamos nada sensível aqui: é o exercício de uma aula.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { explicar } from "../route";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  const { slug } = await ctx.params;
  const { data, error } = await s
    .from("treino_mba01")
    .select("empresa, dados")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ erro: explicar(error) }, { status: 500 });
  if (!data) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  const { slug } = await ctx.params;

  let dados: unknown;
  try {
    ({ dados } = await request.json());
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (!dados || typeof dados !== "object") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  // update (e não upsert): link inexistente tem que falhar, não criar empresa
  // do nada por causa de um erro de digitação na URL.
  const { data, error } = await s
    .from("treino_mba01")
    .update({ dados, atualizado_em: new Date().toISOString() })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) return NextResponse.json({ erro: explicar(error) }, { status: 500 });
  if (!data) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
