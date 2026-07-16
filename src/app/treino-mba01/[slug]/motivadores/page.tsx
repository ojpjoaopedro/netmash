'use client';

/**
 * Pilar 3 — Motivadores Estratégicos. Página PÚBLICA (sem login).
 *
 * A matriz não é digitada do zero: três dos quatro quadrantes descem sozinhos
 * dos exercícios anteriores, porque já foram respondidos lá.
 *
 * BUSCAR    = quero · não tenho  ← o "queremos ser" do To be / As is (é o gap)
 * PRESERVAR = quero · tenho      ← as forças da SWOT
 * ELIMINAR  = não quero · tenho  ← as fraquezas da SWOT
 * EVITAR    = não quero · não tenho — só existe aqui.
 *
 * O que vem de fora é editável aqui, mas a edição escreve DE VOLTA na origem —
 * assim o mesmo fato nunca fica com dois textos diferentes. O aluno também pode
 * acrescentar itens próprios em qualquer quadrante.
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Rocket, GitCompareArrows, LayoutGrid } from 'lucide-react';
import { Topo, FaixaPilar, ListaEditavel, AvisoLocal } from '../../Chrome';
import { useTreino, buscarDoToBe, preservarDasForcas, eliminarDasFraquezas, type Motivadores, type Derivado } from '../../store';
import '../../print.css';

const ROXO = '#8B5CF6';
const AZUL = '#3B82F6';
const VERDE = '#10B981';
const AMBAR = '#F59E0B';
const VERMELHO = '#EF4444';

type Origem = { href: string; rotulo: string; Icone: typeof GitCompareArrows; dica: string };
type Quadrante = {
  chave: keyof Motivadores;
  titulo: string;
  sub: string;
  cor: string;
  placeholder: string;
  derivados: Derivado[];
  origem: Origem | null;
  /** Editar o item derivado escreve de volta na origem — não vira cópia solta. */
  editarNaOrigem: ((i: number, valor: string) => void) | null;
};

export default function MotivadoresPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTreino(slug);
  const { dados, alterar } = t;

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;

  // editar o derivado escreve na origem: o mesmo fato continua com um dono só
  const editarToBe = (i: number, v: string) =>
    alterar({ tobe: dados.tobe.map((l, j) => (j === i ? { ...l, toBe: v } : l)) });
  const editarSwot = (campo: 'forcas' | 'fraquezas') => (i: number, v: string) =>
    alterar({ swot: { ...dados.swot, [campo]: dados.swot[campo].map((s, j) => (j === i ? v : s)) } });

  // matriz 2×2: linha de cima = quero · linha de baixo = não quero
  //             coluna esquerda = não tenho · coluna direita = tenho
  const quadrantes: Quadrante[] = [
    {
      chave: 'buscar',
      titulo: 'BUSCAR',
      sub: 'O que quero ser e não tenho hoje',
      cor: AZUL,
      placeholder: 'Ex: Empresa com MRR de R$ 30 mil',
      derivados: buscarDoToBe(dados.tobe),
      origem: { href: '/treino-mba01', rotulo: '“Queremos ser”', Icone: GitCompareArrows, dica: 'veio do To be / As is' },
      editarNaOrigem: editarToBe,
    },
    {
      chave: 'preservar',
      titulo: 'PRESERVAR',
      sub: 'O que quero ser e já tenho',
      cor: VERDE,
      placeholder: 'Ex: Comunidade engajada',
      derivados: preservarDasForcas(dados.swot),
      origem: { href: '/treino-mba01/swot', rotulo: 'Forças', Icone: LayoutGrid, dica: 'veio das forças da SWOT' },
      editarNaOrigem: editarSwot('forcas'),
    },
    {
      chave: 'evitar',
      titulo: 'EVITAR',
      sub: 'Não sou e não quero ser',
      cor: AMBAR,
      placeholder: 'Ex: Depender de um cliente só',
      derivados: [],
      origem: null,
      editarNaOrigem: null,
    },
    {
      chave: 'eliminar',
      titulo: 'ELIMINAR',
      sub: 'Tenho hoje mas não quero',
      cor: VERMELHO,
      placeholder: 'Ex: Venda por indicação apenas',
      derivados: eliminarDasFraquezas(dados.swot),
      origem: { href: '/treino-mba01/swot', rotulo: 'Fraquezas', Icone: LayoutGrid, dica: 'veio das fraquezas da SWOT' },
      editarNaOrigem: editarSwot('fraquezas'),
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

        {/* eixos + matriz */}
        <div className="flex gap-3">
          <div className="hidden sm:flex flex-col justify-around shrink-0 w-5">
            {['QUERO', 'NÃO QUERO'].map((eixo) => (
              <span
                key={eixo}
                className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {eixo}
              </span>
            ))}
          </div>

          <div className="flex-1">
            <div className="hidden sm:grid grid-cols-2 gap-4 mb-2 px-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Não tenho</p>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Tenho</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quadrantes.map((c) => {
                const origem = c.origem;
                return (
                  <div key={c.chave} className="print-bloco rounded-2xl bg-white border border-slate-200 p-6">
                    <div className="text-center pb-4 mb-5 border-b border-slate-100">
                      <p className="text-2xl font-black tracking-tight" style={{ color: c.cor }}>{c.titulo}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
                    </div>

                    {/* o que desceu do exercício anterior — editável, escrevendo de volta lá */}
                    {origem && c.derivados.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {c.derivados.map((d) => (
                          <div key={d.i} className="flex items-center gap-2" title={origem.dica}>
                            <origem.Icone className="w-3 h-3 shrink-0" style={{ color: c.cor }} />
                            <input
                              value={d.texto}
                              onChange={(e) => c.editarNaOrigem?.(d.i, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:bg-white focus:border-slate-400 print:border-0 print:bg-transparent print:px-0"
                            />
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-400 italic pl-5 print:hidden">
                          ↑ vem de{' '}
                          <Link href={origem.href} className="font-bold hover:underline" style={{ color: c.cor }}>
                            {origem.rotulo}
                          </Link>
                          {' '}— editar aqui muda lá também
                        </p>
                      </div>
                    )}

                    {/* e o que o aluno quiser acrescentar aqui */}
                    <ListaEditavel
                      itens={dados.motivadores[c.chave]}
                      onChange={(novos) => alterar({ motivadores: { ...dados.motivadores, [c.chave]: novos } })}
                      placeholder={c.placeholder}
                      cor={c.cor}
                    />

                    {origem && c.derivados.length === 0 && dados.motivadores[c.chave].length === 0 && (
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-2 print:hidden">
                        O{' '}
                        <Link href={origem.href} className="font-bold hover:underline" style={{ color: c.cor }}>
                          {origem.rotulo}
                        </Link>{' '}
                        preenche isto sozinho — ou escreva aqui o que quiser acrescentar.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> a matriz cruza{' '}
            <strong>querer</strong> com <strong>ter</strong> — e quase tudo já foi respondido antes. O{' '}
            <strong style={{ color: AZUL }}>BUSCAR</strong> chega com o “queremos ser” do To be / As is (o
            que você quer e não tem é, por definição, o seu gap), as{' '}
            <strong style={{ color: VERDE }}>forças</strong> da SWOT chegam em{' '}
            <strong style={{ color: VERDE }}>PRESERVAR</strong>, e as{' '}
            <strong style={{ color: VERMELHO }}>fraquezas</strong> chegam em{' '}
            <strong style={{ color: VERMELHO }}>ELIMINAR</strong>. Você só acrescenta o que faltar.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-2.5">
            A linha de baixo é a que ninguém preenche — e é a que evita desperdício.{' '}
            <strong style={{ color: VERMELHO }}>ELIMINAR</strong> dói, porque é admitir que algo que você
            construiu precisa morrer. <strong style={{ color: AMBAR }}>EVITAR</strong> é decidir hoje a
            oportunidade que você vai recusar depois — sem isso, toda oportunidade parece boa. É o único
            quadrante que só existe aqui.
          </p>
        </div>

        <AvisoLocal />
      </main>
    </div>
  );
}
