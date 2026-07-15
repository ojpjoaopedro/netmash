'use client';

/**
 * Pilar 3 — Motivadores Estratégicos. Página PÚBLICA (sem login).
 *
 * BUSCAR  = o que quero ser e NÃO tenho hoje  (vem do "to be" que ainda é gap)
 * PRESERVAR = o que quero ser e JÁ tenho      (vem das forças da SWOT)
 */

import Link from 'next/link';
import { Rocket, GitCompareArrows } from 'lucide-react';
import { Topo, FaixaPilar, ListaEditavel, AvisoLocal } from '../Chrome';
import { useTreino, buscarDoToBe } from '../store';
import '../print.css';

const ROXO = '#8B5CF6';
const AZUL = '#3B82F6';
const VERDE = '#10B981';
const AMBAR = '#F59E0B';
const VERMELHO = '#EF4444';

export default function MotivadoresPage() {
  const t = useTreino();
  const { dados, alterar } = t;

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;

  // matriz 2×2: linha de cima = quero · linha de baixo = não quero
  //             coluna esquerda = não tenho · coluna direita = tenho
  // BUSCAR não é digitado aqui: espelha o "queremos ser" do primeiro exercício
  const buscar = buscarDoToBe(dados.tobe);

  const quadrantes = [
    {
      chave: 'preservar' as const,
      titulo: 'PRESERVAR',
      sub: 'O que quero ser e já tenho',
      cor: VERDE,
      placeholder: 'Ex: Comunidade engajada',
    },
    {
      chave: 'evitar' as const,
      titulo: 'EVITAR',
      sub: 'Não sou e não quero ser',
      cor: AMBAR,
      placeholder: 'Ex: Depender de um cliente só',
    },
    {
      chave: 'eliminar' as const,
      titulo: 'ELIMINAR',
      sub: 'Tenho hoje mas não quero',
      cor: VERMELHO,
      placeholder: 'Ex: Venda por indicação apenas',
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

              {/* ── BUSCAR: espelha o "queremos ser". Não se digita aqui ── */}
              <div className="print-bloco rounded-2xl bg-white border border-slate-200 p-6">
                <div className="text-center pb-4 mb-5 border-b border-slate-100">
                  <p className="text-2xl font-black tracking-tight" style={{ color: AZUL }}>BUSCAR</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">O que quero ser e não tenho hoje</p>
                </div>

                {/* o que veio do primeiro exercício — só de leitura, edita-se lá */}
                {buscar.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {buscar.map((item, i) => (
                      <div key={i} className="flex items-center gap-2" title="veio do To be / As is">
                        <GitCompareArrows className="w-3 h-3 shrink-0" style={{ color: AZUL }} />
                        <p className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-700 print:border-0 print:bg-transparent print:px-0">
                          {item}
                        </p>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400 italic pl-5 print:hidden">
                      ↑ vem do{' '}
                      <Link href="/treino-mba01" className="font-bold hover:underline" style={{ color: AZUL }}>
                        “Queremos ser”
                      </Link>
                      {' '}— para editar, é lá
                    </p>
                  </div>
                )}

                {/* e o que o aluno quiser acrescentar aqui */}
                <ListaEditavel
                  itens={dados.motivadores.buscar}
                  onChange={(novos) => alterar({ motivadores: { ...dados.motivadores, buscar: novos } })}
                  placeholder="Ex: Empresa com MRR de R$ 30 mil"
                  cor={AZUL}
                />

                {buscar.length === 0 && dados.motivadores.buscar.length === 0 && (
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-2 print:hidden">
                    O <Link href="/treino-mba01" className="font-bold hover:underline" style={{ color: AZUL }}>To be / As is</Link>{' '}
                    preenche isto sozinho — ou escreva aqui o que quiser acrescentar.
                  </p>
                )}
              </div>

              {/* ── os outros três, digitados aqui ── */}
              {quadrantes.map((c) => (
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
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> a matriz cruza{' '}
            <strong>querer</strong> com <strong>ter</strong>. O{' '}
            <strong style={{ color: AZUL }}>BUSCAR</strong> já chega com o “queremos ser” do To be / As is —
            o que você quer e não tem é, por definição, o seu gap — e você acrescenta o que mais quiser. Nos
            outros três: as{' '}
            <strong style={{ color: VERDE }}>forças</strong> da SWOT viram{' '}
            <strong style={{ color: VERDE }}>PRESERVAR</strong>, e as{' '}
            <strong style={{ color: VERMELHO }}>fraquezas</strong> viram{' '}
            <strong style={{ color: VERMELHO }}>ELIMINAR</strong>.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-2.5">
            A linha de baixo é a que ninguém preenche — e é a que evita desperdício.{' '}
            <strong style={{ color: VERMELHO }}>ELIMINAR</strong> dói, porque é admitir que algo que você
            construiu precisa morrer. <strong style={{ color: AMBAR }}>EVITAR</strong> é decidir hoje a
            oportunidade que você vai recusar depois — sem isso, toda oportunidade parece boa.
          </p>
        </div>

        <AvisoLocal />
      </main>
    </div>
  );
}
