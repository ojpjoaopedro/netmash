'use client';

/**
 * Pilar 4 — Mapa de Objetivos. Página PÚBLICA (sem login).
 *
 * Árvore de 4 níveis: OBJETIVO → SUB-OBJETIVOS → INICIATIVAS → AÇÕES.
 * Cada nível pendura no de cima, então o aluno não consegue escrever uma ação
 * solta: ela nasce dentro de uma iniciativa, que nasce dentro de um sub-objetivo.
 */

import { useParams } from 'next/navigation';
import { Network, Plus, Trash2 } from 'lucide-react';
import {Topo, FaixaPilar, AvisoLocal, LinkNaoEncontrado } from '../../Chrome';
import {
  useTreino, novoObjetivo, novoSubObjetivo, novaIniciativa, novaAcao, AREAS,
  type Objetivo, type SubObjetivo, type Iniciativa, type Acao,
} from '../../store';
import '../../print.css';

const ROSA = '#EC4899';
const DOURADO = '#F59E0B';
const AZUL = '#3B82F6';
const VERDE = '#10B981';
const VIOLETA = '#8B5CF6';

/* ── campo de texto de um nó da árvore ───────────────────────────────────── */
function Campo({ valor, onChange, onRemover, placeholder, cor, forte = false }: {
  valor: string; onChange: (v: string) => void; onRemover: () => void;
  placeholder: string; cor: string; forte?: boolean;
}) {
  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 print:break-inside-avoid"
      style={{ borderLeft: `3px solid ${cor}` }}>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`w-full resize-none bg-transparent text-[12px] leading-snug text-slate-800 placeholder:text-slate-400 placeholder:italic focus:outline-none print:hidden ${forte ? 'font-bold' : ''}`}
      />
      {/* No PDF o textarea sai cortado: ele tem 2 linhas fixas e o resto fica
          num scroll que a impressão não mostra. Este parágrafo só existe no
          papel e carrega o texto inteiro. */}
      <p className={`hidden print:block text-[12px] leading-snug text-slate-800 whitespace-pre-wrap ${forte ? 'font-bold' : ''}`}>
        {valor}
      </p>
      <button
        onClick={onRemover}
        className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all print:hidden"
        aria-label="remover"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ── ação: o único nível com área, dono e prazo ──────────────────────────── */
function CampoAcao({ acao, onChange, onRemover }: {
  acao: Acao; onChange: (a: Acao) => void; onRemover: () => void;
}) {
  const semArea = !acao.area;
  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 print:break-inside-avoid"
      style={{ borderLeft: `3px solid ${VIOLETA}` }}>
      <textarea
        value={acao.texto}
        onChange={(e) => onChange({ ...acao, texto: e.target.value })}
        placeholder="Ex: Criar descritivo de cargo e abrir a vaga"
        rows={2}
        className="w-full resize-none bg-transparent text-[12px] leading-snug text-slate-800 placeholder:text-slate-400 placeholder:italic focus:outline-none print:hidden"
      />
      <p className="hidden print:block text-[12px] leading-snug text-slate-800 whitespace-pre-wrap">{acao.texto}</p>

      <button
        onClick={onRemover}
        className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all print:hidden"
        aria-label="remover ação"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* área · responsável · entrega */}
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100">
        <select
          value={acao.area}
          onChange={(e) => onChange({ ...acao, area: e.target.value })}
          title={semArea ? 'escolha a área para esta ação aparecer nas Iniciativas do Ano' : 'área'}
          className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 focus:outline-none cursor-pointer border"
          style={semArea
            ? { color: '#94A3B8', borderColor: '#E2E8F0', background: '#F8FAFC' }
            : { color: VIOLETA, borderColor: `${VIOLETA}44`, background: `${VIOLETA}0d` }}
        >
          <option value="">sem área</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <input
          value={acao.responsavel}
          onChange={(e) => onChange({ ...acao, responsavel: e.target.value })}
          placeholder="responsável"
          className="w-[92px] text-[10px] text-slate-600 placeholder:text-slate-400 placeholder:italic bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-400 print:border-0"
        />
        <input
          type="date"
          value={acao.entrega}
          onChange={(e) => onChange({ ...acao, entrega: e.target.value })}
          title="data de entrega"
          className="text-[10px] text-slate-600 bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-400 print:border-0"
        />
      </div>
    </div>
  );
}

/* ── botão "+ adicionar" ─────────────────────────────────────────────────── */
function BotaoAdd({ onClick, texto, cor, cheio = false }: {
  onClick: () => void; texto: string; cor: string; cheio?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-colors print:hidden ${cheio ? 'w-full border border-dashed' : 'hover:bg-slate-100'}`}
      style={cheio ? { color: cor, borderColor: `${cor}55`, background: `${cor}08` } : { color: cor }}
    >
      <Plus className="w-3 h-3" /> {texto}
    </button>
  );
}

export default function MapaObjetivosPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTreino(slug);
  const { dados, alterar } = t;

  if (!t.carregado) return <div className="min-h-screen bg-slate-50" />;
  if (t.naoEncontrado) return <LinkNaoEncontrado />;

  /* ── edições na árvore: sempre devolvem um mapa novo ── */
  const setMapa = (m: Objetivo[]) => alterar({ mapa: m });
  const mapObj = (oi: number, f: (o: Objetivo) => Objetivo) =>
    setMapa(dados.mapa.map((o, i) => (i === oi ? f(o) : o)));
  const mapSub = (oi: number, si: number, f: (s: SubObjetivo) => SubObjetivo) =>
    mapObj(oi, (o) => ({ ...o, subObjetivos: o.subObjetivos.map((s, i) => (i === si ? f(s) : s)) }));
  const mapIni = (oi: number, si: number, ii: number, f: (x: Iniciativa) => Iniciativa) =>
    mapSub(oi, si, (s) => ({ ...s, iniciativas: s.iniciativas.map((x, i) => (i === ii ? f(x) : x)) }));

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <Topo {...t} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 print:py-2">
        <FaixaPilar
          n={4}
          titulo="Mapa de Objetivos"
          desc="Objetivo, sub-objetivos, iniciativas e ações."
          icon={Network}
          cor={ROSA}
        />

        {/* cabeçalho das colunas */}
        <div className="hidden lg:flex gap-3 px-4 mb-2">
          <p className="w-[190px] shrink-0 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: DOURADO }}>Objetivo</p>
          <p className="w-[190px] shrink-0 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: AZUL }}>Sub-objetivos</p>
          <p className="flex-1 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: VERDE }}>Iniciativas</p>
          <p className="flex-1 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: VIOLETA }}>Ações</p>
        </div>

        {/* Sem print-bloco (break-inside: avoid) no bloco do objetivo: com vários
            sub-objetivos ele fica mais alto que uma folha, e o "não quebrar"
            empurrava o bloco inteiro para a página seguinte — era isso que
            deixava a primeira página do PDF em branco. Quem não quebra agora é
            cada campo, que é pequeno e cabe sempre. */}
        <div className="space-y-4">
          {dados.mapa.map((obj, oi) => (
            <div key={obj.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col lg:flex-row gap-3">

                {/* ── nível 1: objetivo ── */}
                <div className="w-full lg:w-[190px] shrink-0 flex flex-col gap-2">
                  <Campo
                    valor={obj.texto}
                    onChange={(v) => mapObj(oi, (o) => ({ ...o, texto: v }))}
                    onRemover={() => setMapa(dados.mapa.filter((_, i) => i !== oi))}
                    placeholder="Ex: Faturar R$ 600 mil no ano"
                    cor={DOURADO}
                    forte
                  />
                </div>

                {/* ── níveis 2, 3 e 4 ── */}
                <div className="flex-1 space-y-3 min-w-0">
                  {obj.subObjetivos.map((sub, si) => (
                    <div key={sub.id} className="flex flex-col lg:flex-row gap-3">

                      {/* nível 2: sub-objetivo */}
                      <div className="w-full lg:w-[190px] shrink-0">
                        <Campo
                          valor={sub.texto}
                          onChange={(v) => mapSub(oi, si, (s) => ({ ...s, texto: v }))}
                          onRemover={() => mapObj(oi, (o) => ({ ...o, subObjetivos: o.subObjetivos.filter((_, i) => i !== si) }))}
                          placeholder="Ex: R$ 30 mil/mês até Q3"
                          cor={AZUL}
                        />
                      </div>

                      {/* níveis 3 e 4 */}
                      <div className="flex-1 space-y-2 min-w-0">
                        {sub.iniciativas.map((ini, ii) => (
                          <div key={ini.id} className="flex flex-col lg:flex-row gap-3">

                            {/* nível 3: iniciativa */}
                            <div className="flex-1 min-w-0">
                              <Campo
                                valor={ini.texto}
                                onChange={(v) => mapIni(oi, si, ii, (x) => ({ ...x, texto: v }))}
                                onRemover={() => mapSub(oi, si, (s) => ({ ...s, iniciativas: s.iniciativas.filter((_, i) => i !== ii) }))}
                                placeholder="Ex: Recrutar e treinar closers"
                                cor={VERDE}
                              />
                            </div>

                            {/* nível 4: ações da iniciativa */}
                            <div className="flex-1 space-y-1.5 min-w-0">
                              {ini.acoes.map((a, ai) => (
                                <CampoAcao
                                  key={a.id}
                                  acao={a}
                                  onChange={(nova) => mapIni(oi, si, ii, (x) => ({
                                    ...x, acoes: x.acoes.map((y, i) => (i === ai ? nova : y)),
                                  }))}
                                  onRemover={() => mapIni(oi, si, ii, (x) => ({
                                    ...x, acoes: x.acoes.filter((_, i) => i !== ai),
                                  }))}
                                />
                              ))}
                              <BotaoAdd
                                onClick={() => mapIni(oi, si, ii, (x) => ({ ...x, acoes: [...x.acoes, novaAcao()] }))}
                                texto="ação"
                                cor={VIOLETA}
                              />
                            </div>
                          </div>
                        ))}
                        <BotaoAdd
                          onClick={() => mapSub(oi, si, (s) => ({ ...s, iniciativas: [...s.iniciativas, novaIniciativa()] }))}
                          texto="Iniciativa"
                          cor={VERDE}
                          cheio
                        />
                      </div>
                    </div>
                  ))}

                  <BotaoAdd
                    onClick={() => mapObj(oi, (o) => ({ ...o, subObjetivos: [...o.subObjetivos, novoSubObjetivo()] }))}
                    texto="Adicionar sub-objetivo"
                    cor={AZUL}
                    cheio
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {dados.mapa.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center print:hidden">
            <p className="text-sm text-slate-400">Comece criando o seu primeiro objetivo.</p>
          </div>
        )}

        <div className="mt-4">
          <BotaoAdd onClick={() => setMapa([...dados.mapa, novoObjetivo()])} texto="Adicionar objetivo" cor={ROSA} cheio />
        </div>

        <div className="mt-8 rounded-xl bg-white border border-slate-200 px-5 py-4 print:hidden">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Como preencher:</strong> comece pelo{' '}
            <strong style={{ color: DOURADO }}>objetivo</strong> — que sai do gap do seu To be / As is. Quebre em{' '}
            <strong style={{ color: AZUL }}>sub-objetivos</strong> que somados fecham a conta. Cada um ganha{' '}
            <strong style={{ color: VERDE }}>iniciativas</strong>, e cada iniciativa vira{' '}
            <strong style={{ color: VIOLETA }}>ações</strong> com nome e data.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-2.5">
            Repare que tudo pendura em algo: não existe ação solta. Se você não consegue dizer a que
            iniciativa uma ação serve, ela provavelmente não deveria estar no plano. E o teste final é a
            última coluna: sem <strong>dono e prazo</strong>, o plano ainda é um desejo.
          </p>
        </div>

        <AvisoLocal slug={t.slug} />
      </main>
    </div>
  );
}
