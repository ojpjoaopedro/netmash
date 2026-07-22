'use client';

/**
 * Simulador de CRM — pipeline, forecast e cobertura. Página PÚBLICA (sem login).
 *
 * O aluno monta as etapas do funil, enche de leads fictícios, classifica cada um
 * (temperatura, tempo parado, nota) e pede o forecast. A conta aparece aberta,
 * lead a lead: o objetivo é ele entender de onde sai o número, não confiar nele.
 *
 * Sem banco: mora no navegador (localStorage). São dados de treino.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, X, Wand2, Calculator, Thermometer, Clock, Building2, Phone, Mail,
  User, Target, AlertTriangle, RotateCcw, Trophy, BarChart3, Sparkles,
} from 'lucide-react';
import {
  CHAVE, ETAPAS_SUGERIDAS, FAIXA_TEMPERATURA, LOTE, VAZIO, brParaIso, brl, calcular,
  estatisticas, gerarLeads, mascaraData, milhar, novoId, novoLeadManual, pct, soDigitos,
  type Estatisticas, type Etapa, type Lead, type Resultado, type Temperatura, type Treino,
} from './dados';

const COR_TEMP: Record<Temperatura, string> = { quente: '#EF4444', morno: '#F59E0B', frio: '#3B82F6' };
const ROTULO_TEMP: Record<Temperatura, string> = { quente: 'Quente', morno: 'Morno', frio: 'Frio' };
const AZUL = '#1AADE2';

export default function SimuladorPipeline() {
  const [d, setD] = useState<Treino>(VAZIO);
  const [carregado, setCarregado] = useState(false);
  // período abre no mês de julho — é quando a aula acontece
  const ano = new Date().getFullYear();
  const [deTxt, setDeTxt] = useState(`01/07/${ano}`);
  const [ateTxt, setAteTxt] = useState(`31/07/${ano}`);
  const de = brParaIso(deTxt);   // "" enquanto a data estiver incompleta = sem filtro
  const ate = brParaIso(ateTxt);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [verForecast, setVerForecast] = useState(false);
  const [verResultados, setVerResultados] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  // nenhuma exclusão acontece direto: toda lixeira passa por aqui primeiro
  const [aExcluir, setAExcluir] = useState<{ tipo: 'lead' | 'etapa'; id: string; nome: string } | null>(null);
  const [sobreEtapa, setSobreEtapa] = useState<string | null>(null);   // coluna sob o card arrastado

  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (cru) {
        const p = JSON.parse(cru) as Partial<Treino>;
        setD({
          etapas: Array.isArray(p.etapas) ? p.etapas : [],
          leads: Array.isArray(p.leads) ? p.leads : [],
          meta: typeof p.meta === 'number' ? p.meta : VAZIO.meta,
        });
      }
    } catch { /* storage bloqueado: começa vazio */ }
    setCarregado(true);
  }, []);

  // salva sozinho: é aula, ninguém quer perder o quadro por esquecer de clicar
  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* ignora */ }
  }, [d, carregado]);

  /* ── filtro de período: vale para o quadro E para o forecast ── */
  const leadsFiltrados = useMemo(
    () => d.leads.filter((l) => (!de || l.entrada >= de) && (!ate || l.entrada <= ate)),
    [d.leads, de, ate],
  );
  const resultado = useMemo(() => calcular(d.etapas, leadsFiltrados, d.meta), [d.etapas, leadsFiltrados, d.meta]);
  const aberto = d.leads.find((l) => l.id === abertoId) ?? null;

  /* ── edições ── */
  const setEtapas = (etapas: Etapa[]) => setD((x) => ({ ...x, etapas }));
  const addEtapa = () => setEtapas([...d.etapas, { id: novoId(), nome: `Etapa ${d.etapas.length + 1}` }]);
  const renomear = (id: string, nome: string) => setEtapas(d.etapas.map((e) => (e.id === id ? { ...e, nome } : e)));
  const removerEtapa = (id: string) =>
    setD((x) => ({ ...x, etapas: x.etapas.filter((e) => e.id !== id), leads: x.leads.filter((l) => l.etapa !== id) }));
  const editarLead = (id: string, patch: Partial<Lead>) =>
    setD((x) => ({ ...x, leads: x.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const removerLead = (id: string) => { setD((x) => ({ ...x, leads: x.leads.filter((l) => l.id !== id) })); setAbertoId(null); };

  /**
   * Soltou o card numa coluna: muda de etapa e zera o contador de dias parado —
   * o relógio é "parado NESTA etapa", então mover reinicia a contagem.
   */
  function soltarNaEtapa(etapaId: string, leadId: string) {
    if (leadId) editarLead(leadId, { etapa: etapaId, diasNaEtapa: 0 });
    setSobreEtapa(null);
  }

  function criarLead() {
    const primeira = d.etapas[0];
    if (!primeira) return;
    const novo = novoLeadManual(primeira.id, d.meta);
    setD((x) => ({ ...x, leads: [...x.leads, novo] }));
    setAbertoId(novo.id);   // abre já no detalhe para preencher
  }

  /** Confirma o que estiver na fila e limpa o pedido. */
  function confirmarExclusao() {
    if (!aExcluir) return;
    if (aExcluir.tipo === 'lead') removerLead(aExcluir.id);
    else removerEtapa(aExcluir.id);
    setAExcluir(null);
  }

  function comecar() {
    setEtapas(ETAPAS_SUGERIDAS.map((e) => ({ id: novoId(), nome: e.nome, ganho: e.ganho })));
  }
  function encherDeLeads() {
    // o ticket sai da meta (~5% dela), então os números do exercício sempre
    // conversam com o alvo que o próprio aluno definiu
    setD((x) => ({ ...x, leads: [...x.leads, ...gerarLeads(x.etapas, x.meta, LOTE)] }));
  }
  const apagarLeads = () => { setD((x) => ({ ...x, leads: [] })); setConfirmandoApagar(false); };
  // "do zero" é o funil, não a meta: quem já respondeu não responde de novo
  const apagarTudo = () => {
    setD((x) => ({ ...VAZIO, meta: x.meta, metaDefinida: x.metaDefinida }));
    setConfirmandoApagar(false);
  };

  if (!carregado) return <div className="min-h-screen bg-slate-50" />;

  /* ── 1º: montar o funil ── */
  if (d.etapas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center px-5 py-12">
        <div className="w-full max-w-[560px]">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Aula de MBA</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 mb-5">Simulador de Pipeline &amp; Forecast</h1>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            {/* uma linha só: o funil se lê da esquerda para a direita, como acontece */}
            <div className="flex flex-nowrap items-center gap-1.5 mb-6 overflow-x-auto">
              {ETAPAS_SUGERIDAS.map((e) => (
                <span key={e.nome}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                  style={e.ganho
                    ? { background: '#10B9811f', color: '#047857' }
                    : { background: '#f1f5f9', color: '#475569' }}>
                  {e.ganho && <Trophy className="w-3 h-3" />}{e.nome}
                </span>
              ))}
            </div>
            <button onClick={comecar}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-black text-white transition-all hover:brightness-110"
              style={{ background: AZUL }}>
              Começar com essas etapas
            </button>
            <button onClick={() => setEtapas([{ id: novoId(), nome: 'Etapa 1' }])}
              className="w-full mt-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
              Prefiro criar do zero
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
            Simulador de treino: os dados são fictícios.
          </p>
        </div>
      </div>
    );
  }

  /* ── 2º: a meta, que dá escala ao exercício (ticket, cobertura, velocímetro) ── */
  if (!d.metaDefinida) {
    return <PerguntaMeta valorInicial={d.meta} onConfirmar={(meta) => setD((x) => ({ ...x, meta, metaDefinida: true }))} />;
  }

  /* ── 3º: o quadro ── */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* topo */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[1500px] px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Aula de MBA · simulador</p>
            <h1 className="text-lg font-black tracking-tight text-slate-800">Pipeline &amp; Forecast</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              Meta
              <span className="flex items-center rounded-lg border border-slate-200 focus-within:border-slate-400 pl-2.5">
                <span className="text-[13px] text-slate-400">R$</span>
                <input
                  inputMode="numeric"
                  value={milhar(d.meta)}
                  onChange={(e) => setD((x) => ({ ...x, meta: soDigitos(e.target.value) }))}
                  className="w-[92px] px-1.5 py-1.5 rounded-r-lg text-[13px] font-bold text-slate-800 border-0 focus:outline-none"
                />
              </span>
            </label>
            {/* texto mascarado, não <input type="date">: aquele segue o idioma do
                navegador e apareceria mm/dd/aaaa no Chrome em inglês */}
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              De
              <input inputMode="numeric" placeholder="dd/mm/aaaa" value={deTxt} maxLength={10}
                onChange={(e) => setDeTxt(mascaraData(e.target.value))}
                className="w-[104px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:border-slate-400" />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              Até
              <input inputMode="numeric" placeholder="dd/mm/aaaa" value={ateTxt} maxLength={10}
                onChange={(e) => setAteTxt(mascaraData(e.target.value))}
                className="w-[104px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:border-slate-400" />
            </label>
            {(deTxt || ateTxt) && (
              <button onClick={() => { setDeTxt(''); setAteTxt(''); }} title="Ver todos os períodos"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button onClick={encherDeLeads} title={`Acrescenta ${LOTE} negócios fictícios por clique`}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3.5 py-2 transition-colors">
              <Wand2 className="w-4 h-4" /> + {LOTE} leads
            </button>
            <button onClick={() => setVerForecast(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white rounded-lg px-3.5 py-2 transition-all hover:brightness-110"
              style={{ background: AZUL }}>
              <Calculator className="w-4 h-4" /> Calcular forecast
            </button>
            <button onClick={() => setVerResultados(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white rounded-lg px-3.5 py-2 transition-all hover:brightness-110"
              style={{ background: '#10B981' }}>
              <BarChart3 className="w-4 h-4" /> Resultados
            </button>
            <button onClick={() => setConfirmandoApagar(true)} title="Apagar negócios ou recomeçar"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* resumo sempre à vista */}
        <div className="mx-auto max-w-[1500px] px-5 pb-3 flex gap-5 flex-wrap text-[12px]">
          <Resumo rotulo="Negócios" valor={String(leadsFiltrados.length)} />
          <Resumo rotulo="Realizado" valor={brl(resultado.realizado)} cor="#10B981" />
          <Resumo rotulo="Pipeline" valor={brl(resultado.pipeline)} />
          <Resumo rotulo="Forecast" valor={brl(resultado.forecast)} cor={AZUL} />
          <Resumo rotulo="Meta" valor={pct(resultado.atingimento)} cor={resultado.atingimento >= 1 ? '#10B981' : undefined} />
          {(de || ate) && <span className="text-slate-400 self-center">· período filtrado</span>}
        </div>
      </header>

      {/* colunas */}
      <main className="mx-auto max-w-[1500px] px-5 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {d.etapas.map((etapa) => {
            const daEtapa = leadsFiltrados.filter((l) => l.etapa === etapa.id);
            const soma = daEtapa.reduce((s, l) => s + l.valor, 0);
            return (
              <div key={etapa.id}
                onDragOver={(ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; setSobreEtapa(etapa.id); }}
                onDragLeave={() => setSobreEtapa((s) => (s === etapa.id ? null : s))}
                onDrop={(ev) => { ev.preventDefault(); soltarNaEtapa(etapa.id, ev.dataTransfer.getData('text/plain')); }}
                className="w-[280px] shrink-0 rounded-2xl p-3 border transition-all"
                style={sobreEtapa === etapa.id
                  ? { background: '#eff6ff', borderColor: AZUL, boxShadow: `0 0 0 3px ${AZUL}22` }
                  : etapa.ganho ? { background: '#f0fdf4', borderColor: '#86efac' } : { background: '#fff', borderColor: '#e2e8f0' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {etapa.ganho && <Trophy className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
                  <input value={etapa.nome} onChange={(e) => renomear(etapa.id, e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-1 rounded-md text-[13px] font-black bg-transparent focus:outline-none ${etapa.ganho ? 'text-emerald-800 hover:bg-emerald-100/60 focus:bg-emerald-100/60' : 'text-slate-800 hover:bg-slate-50 focus:bg-slate-50'}`} />
                  <button onClick={() => setAExcluir({ tipo: 'etapa', id: etapa.id, nome: etapa.nome })} title="Remover etapa"
                    className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className={`px-2 mb-3 text-[11px] font-bold ${etapa.ganho ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {etapa.ganho
                    ? `${daEtapa.length} venda${daEtapa.length === 1 ? '' : 's'} realizada${daEtapa.length === 1 ? '' : 's'} · ${brl(soma)}`
                    : `${daEtapa.length} negócio${daEtapa.length === 1 ? '' : 's'} · ${brl(soma)}`}
                </p>

                <div className="space-y-2">
                  {/* div, e não button: tem um botão de excluir dentro, e botão
                      dentro de botão é HTML inválido */}
                  {daEtapa.map((l) => (
                    <div key={l.id} role="button" tabIndex={0}
                      draggable
                      onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', l.id); ev.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => setSobreEtapa(null)}
                      onClick={() => setAbertoId(l.id)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') setAbertoId(l.id); }}
                      className="group w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 p-3 transition-colors cursor-grab active:cursor-grabbing">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 min-w-0 text-[13px] font-black text-slate-800 leading-tight">
                          {l.nome || <span className="text-slate-400 italic font-bold">sem nome</span>}
                        </p>
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: COR_TEMP[l.temperatura] }}
                          title={ROTULO_TEMP[l.temperatura]} />
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setAExcluir({ tipo: 'lead', id: l.id, nome: l.nome }); }}
                          title="Excluir negócio" aria-label="Excluir negócio"
                          className="shrink-0 -mt-0.5 -mr-1 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-70 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">{l.empresa}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[13px] font-black" style={{ color: AZUL }}>{brl(l.valor)}</span>
                        <span className="flex items-center gap-1 text-[10.5px] text-slate-400 font-bold">
                          <Clock className="w-3 h-3" /> {l.diasNaEtapa}d
                        </span>
                      </div>
                    </div>
                  ))}
                  {daEtapa.length === 0 && (
                    <p className="text-[11.5px] text-slate-300 italic text-center py-6">
                      {sobreEtapa === etapa.id ? 'solte aqui' : 'vazio'}
                    </p>
                  )}
                </div>

                {/* criar à mão só na primeira etapa: negócio novo entra pelo topo do funil */}
                {d.etapas[0]?.id === etapa.id && (
                  <button onClick={criarLead}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[12px] font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-white transition-colors">
                    <Plus className="w-3.5 h-3.5" /> novo negócio
                  </button>
                )}
              </div>
            );
          })}

          <button onClick={addEtapa}
            className="w-[200px] shrink-0 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 py-4 text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> etapa
          </button>
        </div>

        {d.leads.length === 0 && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
            <p className="text-[14px] text-slate-500 mb-3">
              Seu funil está montado. Agora encha de negócios para treinar — vêm {LOTE} por vez,
              clique quantas vezes quiser.
            </p>
            <button onClick={encherDeLeads}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition-all hover:brightness-110"
              style={{ background: AZUL }}>
              <Wand2 className="w-4 h-4" /> Preencher com {LOTE} leads de exemplo
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-8 leading-relaxed">
          Simulador de treino — dados fictícios, guardados só neste navegador.
        </p>
      </main>

      {aberto && (
        <PainelLead
          lead={aberto} etapas={d.etapas}
          onFechar={() => setAbertoId(null)}
          onEditar={(p) => editarLead(aberto.id, p)}
          onRemover={() => setAExcluir({ tipo: 'lead', id: aberto.id, nome: aberto.nome })}
        />
      )}
      {verForecast && <PainelForecast r={resultado} meta={d.meta} onFechar={() => setVerForecast(false)} />}
      {confirmandoApagar && (
        <PainelApagar
          negocios={d.leads.length} etapas={d.etapas.length}
          onSoLeads={apagarLeads} onTudo={apagarTudo} onCancelar={() => setConfirmandoApagar(false)}
        />
      )}
      {verResultados && (
        <PainelResultados
          r={resultado} e={estatisticas(d.etapas, leadsFiltrados, resultado)} meta={d.meta}
          onFechar={() => setVerResultados(false)}
        />
      )}
      {aExcluir && (
        <ConfirmarExclusao
          tipo={aExcluir.tipo} nome={aExcluir.nome}
          quantosLeads={aExcluir.tipo === 'etapa' ? d.leads.filter((l) => l.etapa === aExcluir.id).length : 0}
          onConfirmar={confirmarExclusao} onCancelar={() => setAExcluir(null)}
        />
      )}
    </div>
  );
}

/* ── peças ─────────────────────────────────────────────────────────────── */

/**
 * Velocímetro do atingimento (realizado ÷ meta).
 *
 * Semicírculo de 180°: o ponteiro sai da esquerda (0%) e vai até a direita
 * (100%). Acima de 100% ele para no fim — o desenho satura, mas o número em
 * baixo continua contando, senão o aluno que estourou a meta acharia que travou.
 */
function Velocimetro({ atingimento, realizado, meta }: { atingimento: number; realizado: number; meta: number }) {
  const p = Math.max(0, Math.min(1, atingimento));
  const ang = Math.PI * (1 - p);                    // 180° (0%) → 0° (100%)
  const px = 100 + 78 * Math.cos(ang);
  const py = 100 - 78 * Math.sin(ang);
  const nx = 100 + 62 * Math.cos(ang);
  const ny = 100 - 62 * Math.sin(ang);
  const cor = atingimento >= 1 ? '#10B981' : atingimento >= 0.7 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[240px]">
        {/* trilho */}
        <path d="M 22 100 A 78 78 0 0 1 178 100" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
        {/* preenchido */}
        {p > 0.001 && (
          <path d={`M 22 100 A 78 78 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`}
            fill="none" stroke={cor} strokeWidth="14" strokeLinecap="round" />
        )}
        {/* ponteiro */}
        <line x1="100" y1="100" x2={nx.toFixed(2)} y2={ny.toFixed(2)} stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="#334155" />
        <text x="22" y="116" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700">0%</text>
        <text x="178" y="116" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700">100%</text>
      </svg>
      <p className="text-3xl font-black -mt-3" style={{ color: cor }}>{pct(atingimento)}</p>
      <p className="text-[12px] text-slate-500 mt-0.5">
        <strong className="text-slate-700">{brl(realizado)}</strong> de {brl(meta)}
      </p>
    </div>
  );
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{rotulo}</span>
      <b className="text-[15px] font-black" style={{ color: cor ?? '#1e293b' }}>{valor}</b>
    </span>
  );
}

/**
 * A meta é a primeira pergunta da tela: é ela que dá escala a tudo — o ticket
 * dos negócios sai de uma fatia dela, e a cobertura e o velocímetro comparam
 * contra ela. Sem meta, os números do exercício não significam nada.
 */
function PerguntaMeta({ valorInicial, onConfirmar }: { valorInicial: number; onConfirmar: (meta: number) => void }) {
  const [meta, setMeta] = useState(valorInicial);
  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-5 py-12">
      <form onSubmit={(e) => { e.preventDefault(); if (meta > 0) onConfirmar(meta); }} className="w-full max-w-[460px]">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Aula de MBA</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-800 mb-5">Simulador de Pipeline &amp; Forecast</h1>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <span className="grid place-items-center w-11 h-11 rounded-xl mb-4 text-white" style={{ background: AZUL }}>
            <Target className="w-5 h-5" />
          </span>
          <p className="text-lg font-black text-slate-800 mb-1">Qual é a meta do mês?</p>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
            É a partir dela que tudo se mede: o tamanho dos negócios, a cobertura do funil
            e o quanto você já realizou.
          </p>

          <div className="flex items-center rounded-xl border-2 border-slate-200 focus-within:border-slate-400 px-4 py-1">
            <span className="text-lg font-bold text-slate-400">R$</span>
            <input autoFocus inputMode="numeric" value={milhar(meta)} onChange={(e) => setMeta(soDigitos(e.target.value))}
              className="w-full px-2 py-2.5 text-xl font-black text-slate-800 border-0 focus:outline-none" />
          </div>

          <button type="submit" disabled={meta <= 0}
            className="w-full mt-5 rounded-xl px-4 py-3.5 text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: AZUL }}>
            Continuar
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">Simulador de treino: os dados são fictícios.</p>
      </form>
    </div>
  );
}

/** Toda lixeira passa por aqui — exclusão não acontece com um clique só. */
function ConfirmarExclusao({ tipo, nome, quantosLeads, onConfirmar, onCancelar }: {
  tipo: 'lead' | 'etapa'; nome: string; quantosLeads: number;
  onConfirmar: () => void; onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5" onClick={onCancelar}>
      <div className="w-full max-w-[400px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0 bg-red-50 text-red-500">
            <Trash2 className="w-5 h-5" />
          </span>
          <p className="text-base font-black text-slate-800">
            Excluir {tipo === 'lead' ? 'este negócio' : 'esta etapa'}?
          </p>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          <strong className="text-slate-700">{nome || '(sem nome)'}</strong>
          {tipo === 'etapa' && quantosLeads > 0
            ? <> será removida com {quantosLeads} negócio{quantosLeads === 1 ? '' : 's'} dentro dela.</>
            : <> será removido do simulador.</>} Não dá para desfazer.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancelar}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-black text-white bg-red-600 hover:bg-red-700 transition-colors">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/** Apagar em dois níveis: recomeçar os negócios sem perder o funil já montado. */
function PainelApagar({ negocios, etapas, onSoLeads, onTudo, onCancelar }: {
  negocios: number; etapas: number;
  onSoLeads: () => void; onTudo: () => void; onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5" onClick={onCancelar}>
      <div className="w-full max-w-[440px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0 bg-amber-50 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="text-base font-black text-slate-800">O que você quer apagar?</p>
        </div>

        <div className="space-y-2.5">
          <button onClick={onSoLeads} disabled={negocios === 0}
            className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-4 py-3.5 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
            <p className="text-[14px] font-black text-slate-800">Só os negócios</p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Apaga os {negocios} negócio{negocios === 1 ? '' : 's'} e mantém as {etapas} etapas do funil.
            </p>
          </button>

          <button onClick={onTudo}
            className="w-full text-left rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 px-4 py-3.5 transition-colors">
            <p className="text-[14px] font-black text-red-700">Negócios e etapas</p>
            <p className="text-[12px] text-red-600/80 mt-0.5">Recomeça do zero: você monta o funil de novo.</p>
          </button>

          <button onClick={onCancelar}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Detalhe do negócio: é aqui que o aluno classifica o que o forecast vai usar. */
function PainelLead({ lead, etapas, onFechar, onEditar, onRemover }: {
  lead: Lead; etapas: Etapa[];
  onFechar: () => void; onEditar: (p: Partial<Lead>) => void; onRemover: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="w-full max-w-[520px] rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <input value={lead.nome} onChange={(e) => onEditar({ nome: e.target.value })} placeholder="Nome do contato"
              className="w-full text-lg font-black text-slate-800 leading-tight bg-transparent rounded-md px-1 -ml-1 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none placeholder:text-slate-300" />
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <input value={lead.empresa} onChange={(e) => onEditar({ empresa: e.target.value })} placeholder="Empresa"
                className="flex-1 min-w-0 text-[13px] text-slate-500 bg-transparent rounded-md px-1 -ml-1 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none placeholder:text-slate-300" />
            </div>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* contato */}
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <Editavel Icone={Phone} rotulo="Telefone" valor={lead.telefone} onChange={(v) => onEditar({ telefone: v })} />
            <Editavel Icone={Mail} rotulo="E-mail" valor={lead.email} onChange={(v) => onEditar({ email: v })} />
            <Editavel Icone={User} rotulo="Responsável" valor={lead.responsavel} onChange={(v) => onEditar({ responsavel: v })} />
            <Editavel Icone={Target} rotulo="Origem" valor={lead.origem} onChange={(v) => onEditar({ origem: v })} />
          </div>

          <Campo rotulo="Valor da negociação">
            <input type="number" value={lead.valor} onChange={(e) => onEditar({ valor: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] font-bold text-slate-800 focus:outline-none focus:border-slate-400" />
          </Campo>

          <Campo rotulo="Etapa do funil">
            <select value={lead.etapa} onChange={(e) => onEditar({ etapa: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-slate-400">
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Campo>

          <Campo rotulo="Temperatura" dica="O quanto este negócio está pronto para fechar.">
            {/* só o escolhido fica colorido; os outros apagam, para o estado ficar óbvio */}
            <div className="flex gap-2">
              {(['quente', 'morno', 'frio'] as Temperatura[]).map((t) => {
                const on = lead.temperatura === t;
                return (
                  <button key={t} onClick={() => onEditar({ temperatura: t })}
                    className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg border transition-all"
                    style={on
                      ? { color: '#fff', background: COR_TEMP[t], borderColor: COR_TEMP[t] }
                      : { color: '#94a3b8', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <span className="flex items-center gap-1.5 text-[12.5px] font-black">
                      <Thermometer className="w-3.5 h-3.5" /> {ROTULO_TEMP[t]}
                    </span>
                    <span className="text-[9.5px] font-bold leading-tight text-center"
                      style={{ color: on ? 'rgba(255,255,255,.85)' : '#cbd5e1' }}>
                      {FAIXA_TEMPERATURA[t]}
                    </span>
                  </button>
                );
              })}
            </div>
          </Campo>

          <Campo rotulo={`Dias parado nesta etapa: ${lead.diasNaEtapa}`} dica="Negócio parado esfria — acima de 15 dias começa a pesar contra.">
            <input type="range" min={0} max={90} value={lead.diasNaEtapa}
              onChange={(e) => onEditar({ diasNaEtapa: Number(e.target.value) })} className="w-full" />
          </Campo>

          <Campo rotulo={`Nota de quem atende: ${lead.notaVendedor}/10`} dica="A leitura qualitativa do vendedor sobre a chance real.">
            <input type="range" min={0} max={10} value={lead.notaVendedor}
              onChange={(e) => onEditar({ notaVendedor: Number(e.target.value) })} className="w-full" />
          </Campo>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">Entrou em {lead.entrada.split('-').reverse().join('/')}</span>
            <button onClick={onRemover} className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remover negócio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dado de contato editável — negócio criado à mão nasce em branco e é aqui que se preenche. */
function Editavel({ Icone, rotulo, valor, onChange }: {
  Icone: typeof Phone; rotulo: string; valor: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Icone className="w-3 h-3" /> {rotulo}</p>
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder="—"
        className="w-full text-slate-700 bg-transparent rounded-md px-1 -ml-1 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none placeholder:text-slate-300" />
    </div>
  );
}

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{rotulo}</p>
      {children}
      {dica && <p className="text-[11px] text-slate-400 italic mt-1.5">{dica}</p>}
    </div>
  );
}

/** O forecast com a conta aberta — o aluno precisa ver de onde saiu o número. */
function PainelForecast({ r, meta, onFechar }: { r: ReturnType<typeof calcular>; meta: number; onFechar: () => void }) {
  const ordenadas = [...r.linhas].sort((a, b) => b.ponderado - a.ponderado);
  const batida = r.faltante === 0;
  const saudavel = batida || r.cobertura >= 3;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="w-full max-w-[880px] rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Resultado</p>
            <p className="text-xl font-black text-slate-800">Forecast do seu pipeline</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* o velocímetro vive no painel Resultados; aqui o foco é a conta do forecast */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Bloco rotulo="Realizado" valor={brl(r.realizado)} sub="já fechado" cor="#10B981" />
            <Bloco rotulo="Pipeline aberto" valor={brl(r.pipeline)} sub="ainda em negociação" />
            <Bloco rotulo="Forecast ponderado" valor={brl(r.forecast)} sub="deve virar receita" cor={AZUL} destaque />
            <Bloco rotulo="Projeção do mês" valor={brl(r.projecao)} sub="realizado + forecast" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Bloco rotulo="Falta para a meta" valor={brl(r.faltante)} sub={r.faltante === 0 ? 'meta batida' : 'ainda a fechar'} />
            <Bloco rotulo="Chance média" valor={pct(r.chanceMedia)} sub="ponderada pelo valor" />
            <Bloco rotulo="Cobertura" valor={r.faltante > 0 ? `${r.cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x` : '—'}
              sub={r.faltante > 0 ? 'pipeline ÷ o que falta' : 'meta já batida'} />
          </div>

          <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
            style={saudavel ? { borderColor: '#10B98155', background: '#10B9810d' } : { borderColor: '#F59E0B55', background: '#F59E0B0d' }}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: saudavel ? '#10B981' : '#F59E0B' }} />
            <p className="text-[13px] text-slate-700 leading-relaxed">
              {batida
                ? <>Meta batida: <strong>{brl(r.realizado)}</strong> já fechados contra {brl(meta)}. O que segue aberto agora constrói o mês seguinte.</>
                : saudavel
                  ? <>Cobertura de <strong>{r.cobertura.toFixed(1)}x</strong> sobre o que falta: há pipeline suficiente. A regra de bolso pede pelo menos <strong>3x</strong> — abaixo disso, o mês depende de tudo dar certo.</>
                  : <>Cobertura de <strong>{r.cobertura.toFixed(1)}x</strong> sobre o que falta: <strong>abaixo de 3x</strong>. Com esse volume aberto, bater a meta exige que quase todo negócio feche — e isso não acontece. Falta pipeline, não esforço.</>}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-2">De onde sai o número</p>
            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">
              Cada negócio recebe uma chance a partir de quatro sinais: a <strong>etapa</strong> em que está,
              a <strong>temperatura</strong>, o <strong>tempo parado</strong> e a <strong>nota de quem atende</strong>.
              O forecast é a soma de (valor × chance) — não a soma do pipeline.
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Negócio', 'Etapa', 'Valor', 'Chance', 'Ponderado'].map((h, i) => (
                      <th key={h} className={`px-3 py-2 font-black uppercase tracking-wider text-[10px] ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map(({ lead, etapa, prob, ponderado }) => (
                    <tr key={lead.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <span className="font-bold text-slate-800">{lead.nome}</span>
                        <span className="text-slate-400"> · {lead.empresa}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{etapa}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{brl(lead.valor)}</td>
                      <td className="px-3 py-2 text-right font-bold" style={{ color: prob >= 0.5 ? '#10B981' : prob >= 0.25 ? '#F59E0B' : '#EF4444' }}>{pct(prob)}</td>
                      <td className="px-3 py-2 text-right font-black" style={{ color: AZUL }}>{brl(ponderado)}</td>
                    </tr>
                  ))}
                  {!ordenadas.length && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400 italic">Nenhum negócio no período escolhido.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Painel de Resultados: a leitura do funil inteiro, em números e desenho. */
function PainelResultados({ r, e, meta, onFechar }: {
  r: Resultado; e: Estatisticas; meta: number; onFechar: () => void;
}) {
  const maiorEtapa = Math.max(1, ...e.porEtapa.map((x) => x.valor));
  const totalTemp = Math.max(1, e.porTemperatura.reduce((s, x) => s + x.qtd, 0));
  const dias = (n: number) => `${Math.round(n)} dia${Math.round(n) === 1 ? '' : 's'}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="w-full max-w-[920px] rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Panorama</p>
            <p className="text-xl font-black text-slate-800">Resultados do pipeline</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* velocímetro + números-chave */}
          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6 items-center">
            <Velocimetro atingimento={r.atingimento} realizado={r.realizado} meta={meta} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <Mini rotulo="Leads no funil" valor={String(e.leadsAbertos)} sub="ainda abertos" />
              <Mini rotulo="Vendas" valor={String(e.vendas)} sub="negócios fechados" cor="#10B981" />
              <Mini rotulo="Pipeline total" valor={brl(r.pipeline)} sub="valor aberto" />
              <Mini rotulo="Ticket médio" valor={brl(e.ticketMedio)} sub="todos os negócios" />
              <Mini rotulo="Ticket das vendas" valor={brl(e.ticketMedioVenda)} sub="só o que fechou" cor="#10B981" />
              <Mini rotulo="Cobertura" valor={r.faltante > 0 ? `${r.cobertura.toFixed(1)}x` : '—'} sub="pipeline ÷ o que falta" cor={AZUL} />
              <Mini rotulo="Ciclo médio de vendas" valor={dias(e.cicloMedio)} sub="da entrada ao fechamento" />
              <Mini rotulo="Idade no funil" valor={dias(e.idadeMediaFunil)} sub="média dos abertos" />
              <Mini rotulo="Parado na etapa" valor={dias(e.paradoMedio)} sub="média dos abertos" cor={e.paradoMedio > 30 ? '#EF4444' : undefined} />
            </div>
          </div>

          {/* funil por etapa */}
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-3">Valor por etapa</p>
            <div className="space-y-2">
              {e.porEtapa.map((x) => (
                <div key={x.nome} className="flex items-center gap-3">
                  <span className="w-[110px] shrink-0 text-[12px] font-bold text-slate-600 truncate" title={x.nome}>{x.nome}</span>
                  <div className="flex-1 h-6 rounded-md bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-md transition-all"
                      style={{ width: `${Math.max(2, (x.valor / maiorEtapa) * 100)}%`, background: x.ganho ? '#10B981' : AZUL }} />
                  </div>
                  <span className="w-[92px] shrink-0 text-right text-[12px] font-black text-slate-700">{brl(x.valor)}</span>
                  <span className="w-[26px] shrink-0 text-right text-[11px] text-slate-400">{x.qtd}</span>
                </div>
              ))}
            </div>
          </div>

          {/* temperatura do que está aberto */}
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-3">Temperatura do pipeline aberto</p>
            <div className="flex h-8 rounded-lg overflow-hidden border border-slate-200">
              {e.porTemperatura.map((x) => (
                x.qtd > 0 && (
                  <div key={x.t} className="grid place-items-center text-[11px] font-black text-white transition-all"
                    style={{ width: `${(x.qtd / totalTemp) * 100}%`, background: COR_TEMP[x.t] }}
                    title={`${ROTULO_TEMP[x.t]}: ${x.qtd} negócio(s) · ${brl(x.valor)}`}>
                    {(x.qtd / totalTemp) > 0.12 && `${ROTULO_TEMP[x.t]} ${x.qtd}`}
                  </div>
                )
              ))}
              {totalTemp === 1 && e.porTemperatura.every((x) => x.qtd === 0) && (
                <div className="flex-1 grid place-items-center text-[11px] text-slate-400">nenhum negócio aberto</div>
              )}
            </div>
          </div>

          {/* insights */}
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-3">O que os dados estão dizendo</p>
            <div className="space-y-2">
              {e.insights.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AZUL }} />
                  <p className="text-[13px] text-slate-700 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-tight">{rotulo}</p>
      <p className="text-[17px] font-black mt-0.5" style={{ color: cor ?? '#1e293b' }}>{valor}</p>
      <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
    </div>
  );
}

function Bloco({ rotulo, valor, sub, cor, destaque }: { rotulo: string; valor: string; sub: string; cor?: string; destaque?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={destaque ? { borderColor: `${AZUL}55`, background: `${AZUL}0d` } : { borderColor: '#e2e8f0' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{rotulo}</p>
      <p className="text-xl font-black mt-1" style={{ color: cor ?? '#1e293b' }}>{valor}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
