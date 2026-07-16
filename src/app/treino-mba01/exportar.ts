'use client';

/**
 * Exercício -> Excel, uma aba por pilar.
 *
 * A aba que interessa é a 4: o plano de ação achatado (objetivo → sub-objetivo →
 * iniciativa → ação, uma linha por ação). É com ela que a pessoa toca a empresa
 * depois da aula — filtra por responsável, ordena por entrega, marca status.
 */

import * as XLSX from 'xlsx';
import { buscarDoToBe, preservarDasForcas, eliminarDasFraquezas, type StatusAcao, type Treino } from './store';

const ROTULO: Record<StatusAcao, string> = {
  'a-iniciar': 'A iniciar',
  'em-andamento': 'Em andamento',
  'concluido': 'Concluído',
};

/** Listas de tamanhos diferentes lado a lado — o Excel precisa da matriz cheia. */
function colunas(cols: { titulo: string; itens: string[] }[]): string[][] {
  const altura = Math.max(0, ...cols.map((c) => c.itens.length));
  const linhas: string[][] = [cols.map((c) => c.titulo)];
  for (let i = 0; i < altura; i++) linhas.push(cols.map((c) => c.itens[i] ?? ''));
  return linhas;
}

/** O que a tela mostra em cada quadrante: o que desceu de outro pilar + o escrito à mão. */
const soTexto = (itens: { texto: string }[]) => itens.map((i) => i.texto);

export function nomeArquivo(empresa: string): string {
  const limpo = empresa.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return limpo || 'plano-comercial';
}

export function exportarExcel(d: Treino) {
  const wb = XLSX.utils.book_new();
  const add = (nome: string, aoa: string[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nome);

  add('Identificação', [
    ['Empresa', d.empresa],
    ['Nome', d.nome],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]);

  add('1. To be - As is', [
    ['Queremos ser', 'Somos hoje'],
    ...d.tobe.map((l) => [l.toBe, l.asIs]),
  ]);

  add('2. SWOT', colunas([
    { titulo: 'Forças', itens: d.swot.forcas },
    { titulo: 'Fraquezas', itens: d.swot.fraquezas },
    { titulo: 'Oportunidades', itens: d.swot.oportunidades },
    { titulo: 'Ameaças', itens: d.swot.ameacas },
  ]));

  add('3. Motivadores', colunas([
    { titulo: 'Buscar', itens: [...soTexto(buscarDoToBe(d.tobe)), ...d.motivadores.buscar] },
    { titulo: 'Preservar', itens: [...soTexto(preservarDasForcas(d.swot)), ...d.motivadores.preservar] },
    { titulo: 'Evitar', itens: d.motivadores.evitar },
    { titulo: 'Eliminar', itens: [...soTexto(eliminarDasFraquezas(d.swot)), ...d.motivadores.eliminar] },
  ]));

  const acoes: string[][] = [['Objetivo', 'Sub-objetivo', 'Iniciativa', 'Ação', 'Área', 'Responsável', 'Entrega', 'Status']];
  for (const o of d.mapa)
    for (const s of o.subObjetivos)
      for (const i of s.iniciativas)
        for (const a of i.acoes)
          acoes.push([o.texto, s.texto, i.texto, a.texto, a.area, a.responsavel, a.entrega, ROTULO[a.status] ?? a.status]);
  add('4. Plano de ação', acoes);

  XLSX.writeFile(wb, `plano-comercial-${nomeArquivo(d.empresa)}.xlsx`);
}
