/**
 * Cadastro do treino da aula de MBA. Rota PÚBLICA (o aluno não tem login).
 *
 * POST → { empresa } cria o registro e devolve { slug }, que vira o link
 *        /treino-mba01/<slug>.
 *
 * Só o nome da empresa é pedido: é uma aula, não um cadastro. Nome de pessoa,
 * e-mail e o resto do exercício entram depois, já dentro do link.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** "Padaria do João" -> "padaria-do-joao". Sem acento, sem espaço, sem surpresa na URL. */
export function paraSlug(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // tira acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")                        // o resto vira hífen
    .replace(/^-+|-+$/g, "")                            // sem hífen nas pontas
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ erro: "supabase não configurado" }, { status: 500 });

  let empresa: unknown;
  try {
    ({ empresa } = await request.json());
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (typeof empresa !== "string" || !empresa.trim()) {
    return NextResponse.json({ erro: "informe o nome da empresa" }, { status: 400 });
  }

  const nome = empresa.trim().slice(0, 80);
  const base = paraSlug(nome);
  if (!base) return NextResponse.json({ erro: "esse nome não gera um link válido" }, { status: 400 });

  // Duas empresas podem se chamar igual. A primeira fica com o slug limpo; as
  // outras ganham sufixo. Tentamos inserir de fato — checar antes teria corrida.
  for (let n = 1; n <= 30; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { error } = await s.from("treino_mba01").insert({ slug, empresa: nome, dados: {} });
    if (!error) return NextResponse.json({ slug });
    if (error.code !== "23505") {  // 23505 = slug já existe; qualquer outro erro é real
      return NextResponse.json({ erro: "não deu para cadastrar" }, { status: 500 });
    }
  }
  return NextResponse.json({ erro: "muitas empresas com esse nome — tente um nome mais específico" }, { status: 409 });
}
