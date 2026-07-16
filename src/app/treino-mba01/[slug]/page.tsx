'use client';

/**
 * Pilar 1 — To be / As is. Página PÚBLICA (sem login): é o exercício do aluno.
 * Precisa estar em PUBLIC_PATHS no middleware.ts.
 */

import { useParams } from 'next/navigation';
import { GitCompareArrows, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Topo, FaixaPilar, AvisoLocal } from '../Chrome';
import { useTreino, novoId, type Linha } from '../store';
import '../print.css';

const VERDE = '#10B981';
const AMBAR = '#F59E0B';

export default function ToBeAsIs() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTreino(slug);
  const { dados, alterar } = t;

  const editar = (id: string, campo: keyof Omit<Linha, 'id'>, valor: string) =>
    alterar({ tobe: dados.tobe.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)) });
  const remover = (id: string) => alterar({ tobe: dados.tobe.filter((l) => l.id !== id) });
  const adicionar = () => alterar({ tobe: [...dados.tobe, { id: novoId(), toBe: '', asIs: '' }] });

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <Topo {...t} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 print:py-2">
        <FaixaPilar
          n={1}
          titulo="To be / As is"
          desc="Onde estamos hoje × onde queremos chegar."
          icon={GitCompareArrows}
          cor={VERDE}
        />

        {/* rótulos das colunas */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-3 px-1 mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: VERDE }}>Queremos ser</p>
          <span className="w-5" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: AMBAR }}>Somos hoje</p>
        </div>

        <div className="space-y-2.5">
          {dados.tobe.map((l) => (
            <div key={l.id} className="group grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
              <div className="rounded-xl border-l-4 bg-white border border-slate-200 p-3" style={{ borderLeftColor: VERDE }}>
                <textarea
                  value={l.toBe}
                  onChange={(e) => editar(l.id, 'toBe', e.target.value)}
                  placeholder="Ex: Empresa com MRR de R$ 30 mil"
                  rows={2}
                  className="w-full resize-none text-[14px] text-slate-800 placeholder:text-slate-400 placeholder:italic focus:outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-slate-300 rotate-90 sm:rotate-0" />
              </div>

              <div className="relative rounded-xl border-l-4 bg-white border border-slate-200 p-3" style={{ borderLeftColor: AMBAR }}>
                <textarea
                  value={l.asIs}
                  onChange={(e) => editar(l.id, 'asIs', e.target.value)}
                  placeholder="Ex: MRR de R$ 5 mil por mês"
                  rows={2}
                  className="w-full resize-none text-[14px] text-slate-800 placeholder:text-slate-400 placeholder:italic focus:outline-none bg-transparent"
                />
                <button
                  onClick={() => remover(l.id)}
                  className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 shadow-sm transition-all print:hidden"
                  aria-label="remover linha"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {dados.tobe.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center print:hidden">
            <p className="text-sm text-slate-400">Comece adicionando o primeiro bloco.</p>
          </div>
        )}

        <button
          onClick={adicionar}
          className="mt-4 flex items-center gap-2 text-[12px] font-bold px-4 py-2.5 rounded-xl border-2 border-dashed transition-colors hover:bg-white print:hidden"
          style={{ color: VERDE, borderColor: `${VERDE}55` }}
        >
          <Plus className="w-4 h-4" /> adicionar bloco
        </button>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> escreva primeiro o{' '}
            <strong style={{ color: VERDE }}>queremos ser</strong> — sem se prender ao que é possível hoje.
            Só depois preencha o <strong style={{ color: AMBAR }}>somos hoje</strong>, com honestidade.
            A distância entre os dois é o <strong>gap</strong> que o seu plano comercial vai ter que fechar.
          </p>
        </div>

        <AvisoLocal />
      </main>
    </div>
  );
}
