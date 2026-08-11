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
 * Puxa as chaves informadas do banco para o navegador. Se o banco não tiver a
 * chave mas o navegador tiver, sobe o que já existe (migração automática, 1x).
 * Retorna os valores que vieram do banco (útil para itens grandes, como a foto,
 * que podem não caber no localStorage).
 */
export async function sincronizarEstado(chaves: string[]): Promise<Record<string, string>> {
  const valores: Record<string, string> = {};
  if (!supabaseReady || !supabase || typeof window === "undefined") return valores;
  const eid = await empresaId(); if (!eid) return valores;
  try {
    const { data } = await supabase.from("painel_estado").select("chave,dados").eq("empresa_id", eid);
    const noBanco = new Map<string, unknown>((data || []).map((r: { chave: string; dados: unknown }) => [r.chave, r.dados]));
    const eventos = new Set<string>();
    for (const chave of chaves) {
      if (noBanco.has(chave)) {
        const v = noBanco.get(chave);
        const cru = typeof v === "string" ? v : JSON.stringify(v);
        valores[chave] = cru;
        try { localStorage.setItem(chave, cru); } catch { /* imagem grande: fica só no banco */ }
        if (EVENTO_DA_CHAVE[chave]) eventos.add(EVENTO_DA_CHAVE[chave]);
      } else {
        const local = localStorage.getItem(chave);
        if (local != null) salvarEstadoRemoto(chave, local);   // 1ª vez: sobe o que já existia
      }
    }
    // avisa as telas já montadas para recarregarem do cache atualizado
    for (const ev of eventos) window.dispatchEvent(new Event(ev));
  } catch { /* ignore */ }
  return valores;
}

/**
 * Puxa do banco TODAS as chaves da empresa que começam com um prefixo (ex: "me_folha_").
 * Serve para grupos de chaves DINÂMICAS (uma por mês/benefício), que não cabem numa
 * lista fixa. Escreve cada uma no localStorage e retorna as chaves carregadas.
 */
export async function sincronizarPorPrefixo(prefixo: string): Promise<string[]> {
  const carregadas: string[] = [];
  if (!supabaseReady || !supabase || typeof window === "undefined") return carregadas;
  const eid = await empresaId(); if (!eid) return carregadas;
  try {
    const { data } = await supabase.from("painel_estado").select("chave,dados").eq("empresa_id", eid).like("chave", `${prefixo}%`);
    for (const r of (data || []) as { chave: string; dados: unknown }[]) {
      const cru = typeof r.dados === "string" ? r.dados : JSON.stringify(r.dados);
      try { localStorage.setItem(r.chave, cru); carregadas.push(r.chave); } catch { /* item grande: fica só no banco */ }
    }
  } catch { /* ignore */ }
  return carregadas;
}

// Prefixos das chaves que são POR EMPRESA (não podem vazar de uma conta pra outra
// no mesmo navegador). Ao trocar de conta, limpamos tudo isso e recarregamos do banco.
const PREFIXOS_CONTA = [
  "me_financas_estrutura", "me_calendario_", "me_diretores", "me_func_extra",
  "me_empresa_extra", "fin_brand", "fin_theme", "me_foto_perfil", "me_termos_aceite",
  "me_ocultar_valores", "me_guia_", "me_tour_", "me_bemvindo_", "me_som", "me_destacar_benef",
  "me_folha_", "me_tut_financas",
];

/** Apaga do navegador todos os dados que são por empresa (usado ao trocar de conta). */
export function limparDadosLocaisDaConta() {
  if (typeof window === "undefined") return;
  try {
    const remover: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && PREFIXOS_CONTA.some((p) => k.startsWith(p))) remover.push(k);
    }
    remover.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
