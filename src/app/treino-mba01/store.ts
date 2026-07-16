'use client';

/**
 * Exercício do aluno — mora no navegador dele (localStorage), uma chave por
 * empresa: `treino-mba01:<slug>`.
 *
 * Chegou a ser escrito para o banco, mas a tabela não existe no Supabase e a
 * aula não pode depender disso. Então o simulador funciona sozinho e a tela
 * avisa, na cara, que o jeito de levar o trabalho embora é o PDF.
 *
 * Consequência aceita: limpar o navegador ou trocar de aparelho perde o que foi
 * preenchido. As rotas /api/treino-mba01 e o supabase/treino-mba01.sql seguem no
 * projeto, prontos, para quando alguém criar a tabela.
 */

import { useCallback, useEffect, useState } from 'react';

const CHAVE = (slug: string) => `treino-mba01:${slug}`;

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

/**
 * Item que desceu de outro exercício. Leva junto o índice de onde ele mora na
 * origem — é isso que deixa editar o item na matriz e a mudança voltar para o
 * exercício de origem, em vez de virar uma cópia solta.
 */
export type Derivado = { texto: string; i: number };

/** Ignora as linhas em branco, mas preserva o índice real de cada uma. */
const naoVazios = (lista: string[]): Derivado[] =>
  lista.map((texto, i) => ({ texto, i })).filter((d) => d.texto.trim());

/** O que o "queremos ser" manda para o BUSCAR. */
export const buscarDoToBe = (tobe: Linha[]): Derivado[] =>
  tobe.map((l, i) => ({ texto: l.toBe, i })).filter((d) => d.texto.trim());

/**
 * A SWOT desce sozinha para a matriz pela mesma lógica do BUSCAR: força é o que
 * eu quero e JÁ tenho; fraqueza é o que eu tenho e NÃO quero.
 */
export const preservarDasForcas = (swot: Swot): Derivado[] => naoVazios(swot.forcas);
export const eliminarDasFraquezas = (swot: Swot): Derivado[] => naoVazios(swot.fraquezas);

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

/**
 * O que vem do banco é jsonb — pode ter sido gravado por uma versão anterior da
 * tela. Cada campo tem um padrão, então dado antigo/incompleto abre em vez de
 * quebrar o exercício do aluno no meio da aula.
 */
function normalizar(d: Partial<Treino> | null | undefined): Treino {
  if (!d || typeof d !== 'object') return VAZIO;
  {
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
  }
}

/**
 * Estado do exercício de UMA empresa + salvar explícito.
 * `carregado` evita piscar o formulário vazio antes de o localStorage responder.
 */
export function useTreino(slug: string) {
  const [dados, setDados] = useState<Treino>(VAZIO);
  const [carregado, setCarregado] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cru = window.localStorage.getItem(CHAVE(slug));
      setDados(cru ? normalizar(JSON.parse(cru)) : { ...VAZIO, empresa: nomeDoSlug(slug) });
    } catch {
      setDados({ ...VAZIO, empresa: nomeDoSlug(slug) });
    }
    setCarregado(true);
  }, [slug]);

  const alterar = useCallback((mudanca: Partial<Treino>) => {
    setDados((d) => ({ ...d, ...mudanca }));
    setSujo(true);
  }, []);

  const salvar = useCallback(async () => {
    setSalvando(true);
    try {
      window.localStorage.setItem(CHAVE(slug), JSON.stringify(dados));
      setSujo(false);
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch {
      return false;   // aba anônima com storage bloqueado cai aqui
    } finally {
      setSalvando(false);
    }
  }, [dados, slug]);

  // rede de segurança: avisa se fechar a aba com coisa não salva
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sujo]);

  return { dados, alterar, salvar, carregado, sujo, salvando, salvoEm, slug };
}

/** Abriu o link direto, sem passar pelo cadastro: "padaria-do-joao" -> "Padaria Do Joao". */
function nomeDoSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
