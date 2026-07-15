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
/**
 * Matriz 2×2: quero/não quero × tenho/não tenho.
 *
 * O BUSCAR tem duas origens: o "queremos ser" do To be / As is entra sozinho
 * (o que eu quero e não tenho É o gap), e `buscar` guarda o que o aluno
 * acrescentar à mão aqui — coisas que ele quer e que não estavam no primeiro
 * exercício. Fonte única para o que veio de lá; liberdade para o resto.
 */
export type Motivadores = {
  buscar: string[];     // quero · não tenho — acrescentados à mão
  preservar: string[];  // quero  · tenho
  evitar: string[];     // não quero · não tenho
  eliminar: string[];   // não quero · tenho
};

/** O que o "queremos ser" manda para o BUSCAR, ignorando as linhas em branco. */
export const buscarDoToBe = (tobe: Linha[]): string[] =>
  tobe.map((l) => l.toBe.trim()).filter(Boolean);

/**
 * A SWOT desce sozinha para a matriz pela mesma lógica do BUSCAR: força é o que
 * eu quero e JÁ tenho; fraqueza é o que eu tenho e NÃO quero. Redigitar aqui só
 * criaria duas verdades para o mesmo fato.
 */
export const preservarDasForcas = (swot: Swot): string[] =>
  swot.forcas.map((s) => s.trim()).filter(Boolean);

export const eliminarDasFraquezas = (swot: Swot): string[] =>
  swot.fraquezas.map((s) => s.trim()).filter(Boolean);

/**
 * Cascata de 4 níveis: a meta descendo até virar tarefa com dono.
 * É uma árvore, não quatro listas soltas — cada ação pertence a uma iniciativa,
 * que pertence a um sub-objetivo, que pertence a um objetivo. É essa amarração
 * que impede o aluno de escrever ações que não servem a nada.
 */
export type StatusAcao = 'a-iniciar' | 'em-andamento' | 'concluido';

/**
 * A ação é a única coisa que tem dono, área e prazo — porque é a única que
 * alguém de fato executa. É daqui que a aba "Iniciativas do Ano" se alimenta:
 * marcou a área na ação, ela aparece lá. Fonte única, sem digitar duas vezes.
 */
export type Acao = {
  id: string;
  texto: string;
  area: string;
  responsavel: string;
  entrega: string;      // ISO yyyy-mm-dd, como o <input type="date"> devolve
  status: StatusAcao;
};
export type Iniciativa = { id: string; texto: string; acoes: Acao[] };
export type SubObjetivo = { id: string; texto: string; iniciativas: Iniciativa[] };
export type Objetivo = { id: string; texto: string; subObjetivos: SubObjetivo[] };
export type MapaObjetivos = Objetivo[];

/** As áreas disponíveis — usadas no mapa e na aba de iniciativas. */
export const AREAS = ['Comercial', 'Marketing', 'Customer Success', 'Financeiro', 'RH / Gestão', 'Tecnologia'] as const;

export type Treino = {
  nome: string;
  empresa: string;
  tobe: Linha[];
  swot: Swot;
  motivadores: Motivadores;
  mapa: MapaObjetivos;
};

export const VAZIO: Treino = {
  nome: '',
  empresa: '',
  tobe: [],
  swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
  motivadores: { buscar: [], preservar: [], evitar: [], eliminar: [] },
  mapa: [],
};

/* ── construtores dos níveis da árvore ────────────────────────────────────── */
export const novaAcao = (): Acao => ({ id: novoId(), texto: '', area: '', responsavel: '', entrega: '', status: 'a-iniciar' });
export const novaIniciativa = (): Iniciativa => ({ id: novoId(), texto: '', acoes: [novaAcao()] });
export const novoSubObjetivo = (): SubObjetivo => ({ id: novoId(), texto: '', iniciativas: [novaIniciativa()] });
export const novoObjetivo = (): Objetivo => ({ id: novoId(), texto: '', subObjetivos: [novoSubObjetivo()] });

/** Toda ação da árvore, achatada, com o contexto de onde ela veio. */
export type AcaoNaArvore = Acao & { iniciativa: string; objetivo: string };
export function todasAsAcoes(mapa: MapaObjetivos): AcaoNaArvore[] {
  return mapa.flatMap((o) =>
    o.subObjetivos.flatMap((s) =>
      s.iniciativas.flatMap((i) =>
        i.acoes.map((a) => ({ ...a, iniciativa: i.texto, objetivo: o.texto })),
      ),
    ),
  );
}

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
      // os ?? [] também servem de compatibilidade: quem salvou antes de evitar/
      // eliminar existirem não perde o que já tinha preenchido
      motivadores: {
        buscar: d.motivadores?.buscar ?? [],
        preservar: d.motivadores?.preservar ?? [],
        evitar: d.motivadores?.evitar ?? [],
        eliminar: d.motivadores?.eliminar ?? [],
      },
      // o mapa já foi 4 listas soltas antes de virar árvore; quem salvou naquele
      // formato cai aqui e começa vazio em vez de quebrar a tela
      mapa: Array.isArray(d.mapa) ? d.mapa : [],
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
