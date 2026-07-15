'use client';

/**
 * Exercício do aluno — mora SÓ no navegador dele (localStorage).
 *
 * Decisão consciente: nada vai para o servidor. O aluno não faz cadastro, o Hub
 * não guarda dado de terceiro, e ninguém vê o exercício de ninguém. Quem quiser
 * levar o trabalho, baixa o PDF.
 *
 * Consequência: se o aluno limpar o navegador, perde. O aviso está na tela.
 */

import { useCallback, useEffect, useState } from 'react';

const CHAVE = 'treino-mba01';

export type Linha = { id: string; toBe: string; asIs: string };
export type Swot = { forcas: string[]; fraquezas: string[]; oportunidades: string[]; ameacas: string[] };
export type Motivadores = { buscar: string[]; preservar: string[] };

export type Treino = {
  nome: string;
  empresa: string;
  tobe: Linha[];
  swot: Swot;
  motivadores: Motivadores;
};

export const VAZIO: Treino = {
  nome: '',
  empresa: '',
  tobe: [],
  swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
  motivadores: { buscar: [], preservar: [] },
};

/** ids estáveis sem depender de libs */
export const novoId = () => `l${Date.now()}${Math.floor(Math.random() * 1000)}`;

function ler(): Treino {
  if (typeof window === 'undefined') return VAZIO;
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return VAZIO;
    const d = JSON.parse(cru) as Partial<Treino>;
    return {
      nome: d.nome ?? '',
      empresa: d.empresa ?? '',
      tobe: Array.isArray(d.tobe) ? d.tobe : [],
      swot: {
        forcas: d.swot?.forcas ?? [],
        fraquezas: d.swot?.fraquezas ?? [],
        oportunidades: d.swot?.oportunidades ?? [],
        ameacas: d.swot?.ameacas ?? [],
      },
      motivadores: {
        buscar: d.motivadores?.buscar ?? [],
        preservar: d.motivadores?.preservar ?? [],
      },
    };
  } catch {
    return VAZIO;
  }
}

/**
 * Estado do exercício + salvar explícito.
 * `carregado` evita piscar o formulário vazio antes de o localStorage responder.
 */
export function useTreino() {
  const [dados, setDados] = useState<Treino>(VAZIO);
  const [carregado, setCarregado] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);

  useEffect(() => {
    setDados(ler());
    setCarregado(true);
  }, []);

  const alterar = useCallback((mudanca: Partial<Treino>) => {
    setDados((d) => ({ ...d, ...mudanca }));
    setSujo(true);
  }, []);

  const salvar = useCallback(() => {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(dados));
      setSujo(false);
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch {
      return false;
    }
  }, [dados]);

  // rede de segurança: avisa se fechar a aba com coisa não salva
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sujo]);

  return { dados, alterar, salvar, carregado, sujo, salvoEm };
}
