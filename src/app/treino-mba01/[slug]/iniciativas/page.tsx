'use client';

/**
 * Pilar 5 — Iniciativas do Ano. Página PÚBLICA (sem login).
 *
 * ⚠️ Esta tela NÃO tem conteúdo próprio: ela LÊ as ações do Mapa de Objetivos.
 * O aluno marca a área lá, e a ação aparece aqui. Fonte única — ninguém digita
 * a mesma coisa duas vezes, e as duas telas nunca divergem.
 *
 * Os cards no topo contam sozinhos. É o que revela a área sobrecarregada e a
 * área vazia — coisa que a lista solta esconde.
 *
 * Sem bloco "como preencher": a explicação vem no slide da apresentação.
 */

import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  ListChecks, ShoppingCart, HeartHandshake, DollarSign, Megaphone, Briefcase, Cpu,
  CheckCircle2, Clock, CalendarPlus, ArrowRight, User, CalendarDays, Network,
} from 'lucide-react';
import Link from 'next/link';
import {Topo, FaixaPilar, AvisoLocal, LinkNaoEncontrado } from '../../Chrome';
import { useTreino, todasAsAcoes, AREAS, type StatusAcao, type Objetivo } from '../../store';
import '../../print.css';

const CIANO = '#0EA5E9';

const ICONE_AREA: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'Comercial': ShoppingCart,
  'Marketing': Megaphone,
  'Customer Success': HeartHandshake,
  'Financeiro': DollarSign,
  'RH / Gestão': Briefcase,
  'Tecnologia': Cpu,
};

const STATUS: { chave: StatusAcao; rotulo: string; cor: string; bg: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { chave: 'a-iniciar', rotulo: 'A iniciar', cor: '#3B82F6', bg: '#EFF6FF', icon: CalendarPlus },
  { chave: 'em-andamento', rotulo: 'Em andamento', cor: '#D97706', bg: '#FFFBEB', icon: Clock },
  { chave: 'concluido', rotulo: 'Concluído', cor: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
];
const infoStatus = (s: StatusAcao) => STATUS.find((x) => x.chave === s) ?? STATUS[0];
const proximoStatus = (s: StatusAcao): StatusAcao =>
  s === 'a-iniciar' ? 'em-andamento' : s === 'em-andamento' ? 'concluido' : 'a-iniciar';

const fmtData = (iso: string) =>
  iso ? iso.split('-').reverse().join('/') : '';

export default function IniciativasAnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTreino(slug);
  const { dados, alterar } = t;
  const [filtro, setFiltro] = useState<string | null>(null);

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;
  if (t.naoEncontrado) return <LinkNaoEncontrado />;

  const acoes = todasAsAcoes(dados.mapa);
  const comArea = acoes.filter((a) => a.area);
  const semArea = acoes.filter((a) => !a.area).length;

  const daArea = (area: string) => comArea.filter((a) => a.area === area);
  const lista = filtro ? daArea(filtro) : comArea;

  /** o status vive na árvore do mapa: mudar aqui reescreve lá */
  const mudarStatus = (idAcao: string, novo: StatusAcao) => {
    const mapa: Objetivo[] = dados.mapa.map((o) => ({
      ...o,
      subObjetivos: o.subObjetivos.map((s) => ({
        ...s,
        iniciativas: s.iniciativas.map((i) => ({
          ...i,
          acoes: i.acoes.map((a) => (a.id === idAcao ? { ...a, status: novo } : a)),
        })),
      })),
    }));
    alterar({ mapa });
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <Topo {...t} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 print:py-2">
        <FaixaPilar
          n={5}
          titulo="Iniciativas do Ano"
          desc="As ações do seu mapa, agrupadas por área."
          icon={ListChecks}
          cor={CIANO}
        />

        {/* ── cards por área: contam sozinhos ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {AREAS.map((nome) => {
            const Icone = ICONE_AREA[nome] ?? ListChecks;
            const total = daArea(nome).length;
            const ok = daArea(nome).filter((a) => a.status === 'concluido').length;
            const pct = total === 0 ? 0 : Math.round((ok / total) * 100);
            const ativo = filtro === nome;
            return (
              <button
                key={nome}
                onClick={() => setFiltro(ativo ? null : nome)}
                className="print-bloco text-left rounded-2xl border p-4 transition-all hover:shadow-md"
                style={ativo
                  ? { background: CIANO, borderColor: CIANO, boxShadow: `0 10px 30px -8px ${CIANO}88` }
                  : { background: '#fff', borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: ativo ? 'rgba(255,255,255,0.25)' : `${CIANO}14` }}>
                    <Icone className="w-3.5 h-3.5" style={{ color: ativo ? '#fff' : CIANO }} />
                  </span>
                  <p className="text-[11px] font-bold leading-tight" style={{ color: ativo ? '#fff' : '#334155' }}>{nome}</p>
                </div>

                <p className="text-2xl font-black" style={{ color: ativo ? '#fff' : '#0F172A' }}>
                  {ok}<span className="text-sm font-bold" style={{ color: ativo ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>/{total}</span>
                </p>

                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: ativo ? 'rgba(255,255,255,0.25)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: ativo ? '#fff' : CIANO }} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-1.5"
                  style={{ color: ativo ? 'rgba(255,255,255,0.85)' : '#94A3B8' }}>
                  {pct}% concluído
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 mt-3 print:hidden">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
            <ArrowRight className="w-3 h-3" /> Clique no departamento e filtre as ações
          </p>
          {semArea > 0 && (
            <Link href="/treino-mba01/mapa-objetivos"
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition-colors">
              {semArea} {semArea === 1 ? 'ação sem área' : 'ações sem área'} — definir no mapa →
            </Link>
          )}
        </div>

        {/* ── lista ── */}
        <div className="print-bloco rounded-2xl bg-white border border-slate-200 p-5 mt-5">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-800">{filtro ?? 'Todas as áreas'}</h2>
            <span className="text-[12px] text-slate-400">({lista.length})</span>
            {filtro && (
              <button onClick={() => setFiltro(null)}
                className="ml-auto text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors print:hidden">
                limpar filtro
              </button>
            )}
          </div>

          {lista.length === 0 ? (
            <div className="py-8 text-center print:hidden">
              <Network className="w-7 h-7 mx-auto text-slate-300 mb-3" />
              <p className="text-[12px] text-slate-400">
                {filtro
                  ? 'Nenhuma ação desta área ainda.'
                  : 'Esta tela se alimenta do Mapa de Objetivos.'}
              </p>
              <Link href="/treino-mba01/mapa-objetivos"
                className="inline-block mt-2 text-[12px] font-bold" style={{ color: CIANO }}>
                Abrir o Mapa de Objetivos →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {lista.map((a) => {
                const s = infoStatus(a.status);
                return (
                  <div key={a.id} className="print-bloco rounded-lg border border-slate-200 pl-3 pr-2 py-2.5 flex items-start gap-2"
                    style={{ borderLeft: `3px solid ${CIANO}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] italic leading-snug text-slate-700">{a.texto || <span className="text-slate-300">sem descrição</span>}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: CIANO }}>{a.area}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {a.responsavel && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <User className="w-2.5 h-2.5" /> {a.responsavel}
                          </span>
                        )}
                        {a.entrega && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <CalendarDays className="w-2.5 h-2.5" /> {fmtData(a.entrega)}
                          </span>
                        )}
                        {!a.responsavel && !a.entrega && (
                          <span className="text-[10px] text-amber-600 italic print:hidden">sem dono nem prazo</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => mudarStatus(a.id, proximoStatus(a.status))}
                      title="clique para mudar o status"
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-transform hover:scale-105"
                      style={{ background: s.bg, color: s.cor }}
                    >
                      <s.icon className="w-3 h-3" /> {s.rotulo}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AvisoLocal slug={t.slug} />
      </main>
    </div>
  );
}
