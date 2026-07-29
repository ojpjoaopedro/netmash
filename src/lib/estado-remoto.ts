"use client";
import { supabase, supabaseReady } from "@/lib/supabase";
import { empresaAtualId } from "@/lib/empresa-atual";

/**
 * Espelhamento genérico do painel no banco (tabela painel_estado).
 *
 * O localStorage continua sendo o "cache" que as telas leem de forma síncrona;
 * o banco é a fonte da verdade. Sempre que uma informação é salva no navegador,
 * também é gravada no banco (fire-and-forget). Ao abrir o painel, puxamos tudo
 * do banco para o navegador (e, na 1ª vez, subimos o que já existia localmente).
 *
 * O valor guardado é a MESMA string que ficava no localStorage — assim vale para
 * qualquer chave (listas em JSON, "1"/"0", data-URL de imagem etc.).
 */

// empresa do usuário logado (resolvida em @/lib/empresa-atual).
const empresaId = empresaAtualId;

// mapa chave -> evento a disparar quando o valor vier do banco (para as telas
// já montadas recarregarem sozinhas).
const EVENTO_DA_CHAVE: Record<string, string> = {
  me_calendario_pagamentos: "me:pagamentos",
  me_calendario_recebimentos: "me:recebimentos",
  me_diretores: "me:diretores",
  me_termos_aceite: "me:termos",
  me_guia_concluido: "me:guia-concluido",
  me_ocultar_valores: "me:ocultar",
  fin_brand: "me:brand",
  fin_theme: "me:brand",
};

/** Grava (ou atualiza) uma chave no banco. Recebe a string crua do localStorage. */
export function salvarEstadoRemoto(chave: string, valorCru: string) {
  void (async () => {
    if (!supabaseReady || !supabase) return;
    const eid = await empresaId(); if (!eid) return;
    try {
      await supabase.from("painel_estado").upsert(
        { empresa_id: eid, chave, dados: valorCru, updated_at: new Date().toISOString() },
        { onConflict: "empresa_id,chave" },
      );
    } catch { /* ignore */ }
  })();
}

/** Remove uma chave do banco (quando o usuário apaga algo). */
export function apagarEstadoRemoto(chave: string) {
  void (async () => {
    if (!supabaseReady || !supabase) return;
    const eid = await empresaId(); if (!eid) return;
    try { await supabase.from("painel_estado").delete().eq("empresa_id", eid).eq("chave", chave); } catch { /* ignore */ }
  })();
}

/**
 * Salva no navegador E no banco de uma vez. É o substituto do localStorage.setItem
 * para tudo o que precisa ficar guardado de verdade.
 */
export function lsSalvar(chave: string, valorCru: string) {
  if (typeof window !== "undefined") { try { localStorage.setItem(chave, valorCru); } catch { /* ignore */ } }
  salvarEstadoRemoto(chave, valorCru);
}

/** Apaga no navegador E no banco. */
export function lsApagar(chave: string) {
  if (typeof window !== "undefined") { try { localStorage.removeItem(chave); } catch { /* ignore */ } }
  apagarEstadoRemoto(chave);
}

/**
 * Puxa as chaves informadas do banco para o navegador. Se o banco não tiver a
 * chave mas o navegador tiver, sobe o que já existe (migração automática, 1x).
 * Retorna true se algo veio do banco (para as telas recarregarem).
 */
export async function sincronizarEstado(chaves: string[]): Promise<boolean> {
  if (!supabaseReady || !supabase || typeof window === "undefined") return false;
  const eid = await empresaId(); if (!eid) return false;
  let veioAlgo = false;
  try {
    const { data } = await supabase.from("painel_estado").select("chave,dados").eq("empresa_id", eid);
    const noBanco = new Map<string, unknown>((data || []).map((r: { chave: string; dados: unknown }) => [r.chave, r.dados]));
    const eventos = new Set<string>();
    for (const chave of chaves) {
      if (noBanco.has(chave)) {
        const v = noBanco.get(chave);
        const cru = typeof v === "string" ? v : JSON.stringify(v);
        try { localStorage.setItem(chave, cru); } catch { /* ignore */ }
        veioAlgo = true;
        if (EVENTO_DA_CHAVE[chave]) eventos.add(EVENTO_DA_CHAVE[chave]);
      } else {
        const local = localStorage.getItem(chave);
        if (local != null) salvarEstadoRemoto(chave, local);   // 1ª vez: sobe o que já existia
      }
    }
    // avisa as telas já montadas para recarregarem do cache atualizado
    for (const ev of eventos) window.dispatchEvent(new Event(ev));
  } catch { /* ignore */ }
  return veioAlgo;
}
