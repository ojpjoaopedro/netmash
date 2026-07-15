'use client';

/**
 * Pilar 3 — Motivadores Estratégicos. Página PÚBLICA (sem login).
 *
 * BUSCAR  = o que quero ser e NÃO tenho hoje  (vem do "to be" que ainda é gap)
 * PRESERVAR = o que quero ser e JÁ tenho      (vem das forças da SWOT)
 */

import { Rocket } from 'lucide-react';
import { Topo, FaixaPilar, ListaEditavel, AvisoLocal } from '../Chrome';
import { useTreino } from '../store';
import '../print.css';

const ROXO = '#8B5CF6';
const AZUL = '#3B82F6';
const VERDE = '#10B981';

export default function MotivadoresPage() {
  const t = useTreino();
  const { dados, alterar } = t;

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;

  const colunas = [
    {
      chave: 'buscar' as const,
      titulo: 'BUSCAR',
      sub: 'O que quero ser e não tenho hoje',
      cor: AZUL,
      placeholder: 'Ex: Empresa com MRR de R$ 30 mil',
    },
    {
      chave: 'preservar' as const,
      titulo: 'PRESERVAR',
      sub: 'O que quero ser e já tenho',
      cor: VERDE,
      placeholder: 'Ex: Comunidade engajada',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <Topo {...t} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 print:py-2">
        <FaixaPilar
          n={3}
          titulo="Motivadores Estratégicos"
          desc="O que cruza as suas forças com as suas oportunidades."
          icon={Rocket}
          cor={ROXO}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {colunas.map((c) => (
            <div key={c.chave} className="print-bloco rounded-2xl bg-white border border-slate-200 p-6">
              <div className="text-center pb-4 mb-5 border-b border-slate-100">
                <p className="text-2xl font-black tracking-tight" style={{ color: c.cor }}>{c.titulo}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
              </div>
              <ListaEditavel
                itens={dados.motivadores[c.chave]}
                onChange={(novos) => alterar({ motivadores: { ...dados.motivadores, [c.chave]: novos } })}
                placeholder={c.placeholder}
                cor={c.cor}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> volte nos dois exercícios anteriores.
            O que ficou no <strong style={{ color: AZUL }}>gap</strong> do To be / As is vira{' '}
            <strong style={{ color: AZUL }}>BUSCAR</strong>. O que apareceu nas{' '}
            <strong style={{ color: VERDE }}>forças</strong> da SWOT vira{' '}
            <strong style={{ color: VERDE }}>PRESERVAR</strong>. Empresa que só busca, quebra o que já
            funcionava. Empresa que só preserva, não cresce.
          </p>
        </div>

        <AvisoLocal />
      </main>
    </div>
  );
}
