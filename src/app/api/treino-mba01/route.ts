/**
 * Cadastro do treino da aula de MBA. Rota PÚBLICA (o aluno não tem login).
 *
 * POST → { empresa } cria o registro e devolve { slug }, que vira o link
 *        /treino-mba01/<slug>.
 *
 * ⚠️ HOJE ESTA ROTA NÃO É CHAMADA. A tabela treino_mba01 não existe no Supabase,
 * então o exercício roda no localStorage e a tela avisa o aluno que nada é
 * salvo em servidor. Rode o supabase/treino-mba01.sql e ligue o store de volta
 * nesta rota para o exercício voltar a seguir a pessoa entre aparelhos.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { paraSlug } from "@/app/treino-mba01/slug";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Erro do banco em português, e o de verdade no log do servidor.
 *
 * "Tabela não existe" é o erro mais provável aqui até alguém rodar o
 * supabase/treino-mba01.sql — e é chato de descobrir se a tela só diz
 * "não deu para cadastrar". Então ele fala o próprio nome.
 */
export function explicar(error: { code?: string; message?: string }): string {
  console.error("[treino-mba01] erro do supabase:", error);
  const faltaTabela = error.code === "42P01" || error.code === "PGRST205" || /treino_mba01/.test(error.message ?? "");
  return faltaTabela
    ? "A tabela treino_mba01 ainda não existe no banco. Rode o supabase/treino-mba01.sql no Supabase."
    : "não deu para cadastrar";
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
      return NextResponse.json({ erro: explicar(error) }, { status: 500 });
    }
  }
  return NextResponse.json({ erro: "muitas empresas com esse nome — tente um nome mais específico" }, { status: 409 });
}
