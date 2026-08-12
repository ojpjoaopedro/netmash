"use client";
import { supabase, supabaseReady } from "@/lib/supabase";

/**
 * Resolve a empresa do USUÁRIO LOGADO (multi-empresa / white-label).
 *
 * Antes o sistema pegava "a primeira empresa do banco" (limit 1), o que só
 * funcionava com uma empresa. Agora cada usuário lê/grava os dados da própria
 * empresa:
 *   1) colaborador: perfis.empresa_id
 *   2) dono: empresas.dono_id = id do usuário logado
 *
 * O id é guardado em cache na sessão; troque de conta => limparCacheEmpresa().
 */
let _cache: string | null | undefined;

export async function empresaAtualId(): Promise<string | null> {
  if (_cache !== undefined) return _cache ?? null;
  if (!supabaseReady || !supabase) { _cache = null; return null; }
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { _cache = null; return null; }
    // 1) colaborador tem a empresa no perfil
    const { data: perfil } = await supabase.from("perfis").select("empresa_id").eq("id", uid).maybeSingle();
    if (perfil?.empresa_id) { _cache = perfil.empresa_id as string; return _cache; }
    // 2) dono é o responsável pela empresa
    const { data: emp } = await supabase.from("empresas").select("id").eq("dono_id", uid).order("criado_em", { ascending: true }).limit(1).maybeSingle();
    _cache = (emp?.id as string) ?? null;
    return _cache;
  } catch { _cache = null; return null; }
}

/** Zera o cache (chamar no login/logout, ao trocar de conta). */
export function limparCacheEmpresa() { _cache = undefined; }
