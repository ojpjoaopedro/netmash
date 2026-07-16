'use client';

/**
 * Pilar 2 — SWOT. Página PÚBLICA (sem login): é o exercício do aluno.
 */

import { useParams } from 'next/navigation';
import { LayoutGrid, Zap, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';
import { Topo, FaixaPilar, ListaEditavel, AvisoLocal } from '../../Chrome';
import { useTreino, type Swot } from '../../store';
import '../../print.css';

const AZUL = '#3B82F6';

const QUADRANTES: {
  chave: keyof Swot; letra: string; rotulo: string; origem: string;
  placeholder: string; cor: string; icon: React.ComponentType<{ className?: string }>;
}[] = [
  { chave: 'forcas', letra: 'S', rotulo: 'Forças', origem: 'dentro', placeholder: 'Ex: Produto transformador', cor: '#10B981', icon: Zap },
  { chave: 'fraquezas', letra: 'W', rotulo: 'Fraquezas', origem: 'dentro', placeholder: 'Ex: Comercial inexperiente', cor: '#EF4444', icon: AlertTriangle },
  { chave: 'oportunidades', letra: 'O', rotulo: 'Oportunidades', origem: 'fora', placeholder: 'Ex: Mercado B2B em expansão', cor: '#3B82F6', icon: TrendingUp },
  { chave: 'ameacas', letra: 'T', rotulo: 'Ameaças', origem: 'fora', placeholder: 'Ex: Concorrente com mais capital', cor: '#F59E0B', icon: ShieldAlert },
];

export default function SwotPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTreino(slug);
  const { dados, alterar } = t;

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <Topo {...t} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 print:py-2">
        <FaixaPilar
          n={2}
          titulo="SWOT"
          desc="Forças, fraquezas, oportunidades e ameaças da sua empresa."
          icon={LayoutGrid}
          cor={AZUL}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {QUADRANTES.map((q) => (
            <div key={q.chave} className="print-bloco rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: q.cor }}>
                  <q.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black" style={{ color: q.cor }}>
                    <span className="text-base">{q.letra}</span> · {q.rotulo}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {q.origem === 'dentro' ? 'vem de dentro — você controla' : 'vem de fora — só dá pra se preparar'}
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                  {dados.swot[q.chave].length}
                </span>
              </div>

              <ListaEditavel
                itens={dados.swot[q.chave]}
                onChange={(novos) => alterar({ swot: { ...dados.swot, [q.chave]: novos } })}
                placeholder={q.placeholder}
                cor={q.cor}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> as duas de cima
            (<strong style={{ color: '#10B981' }}>forças</strong> e <strong style={{ color: '#EF4444' }}>fraquezas</strong>)
            são sobre a <strong>sua empresa</strong> — você controla. As duas de baixo
            (<strong style={{ color: '#3B82F6' }}>oportunidades</strong> e <strong style={{ color: '#F59E0B' }}>ameaças</strong>)
            são sobre o <strong>mercado</strong> — você só pode se preparar. Se você escreveu uma
            fraqueza na linha das ameaças, provavelmente está terceirizando culpa.
          </p>
        </div>

        <AvisoLocal />
      </main>
    </div>
  );
}
