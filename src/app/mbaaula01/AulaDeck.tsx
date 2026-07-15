'use client';

/**
 * Aula — Planejamento Comercial, Budget e Forecast (35 slides, ~2h).
 * Mesma estrutura de navegação do Pitch Deck de Captação (/pitch): shell fixo,
 * setas do teclado, dots de navegação, animação de transição.
 *
 * NÚMEROS: o caso "Empresa Alpha" é didático. Todas as premissas estão em ALPHA
 * e os cálculos derivam delas — não há número mágico solto nos slides.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X as XIcon, ChevronLeft, ChevronRight, Presentation,
  Target, Map, Users, RefreshCw, TrendingUp, DollarSign, Megaphone,
  Cpu, Plane, GraduationCap, Handshake, AlertTriangle, HelpCircle,
  Gauge as GaugeIcon, Clock, Layers, Database, Settings2, BarChart3, ShieldCheck, CheckCheck, LayoutGrid,
} from 'lucide-react';

/* ── Paleta (design system Dynamis) ──────────────────────────────────────── */
const NAVY = '#0A1A2E';
const BLUE = '#1AADE2';
const GOLD = '#C48A57';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';

/* ── Caso Empresa Alpha — premissas didáticas ─────────────────────────────
 * Empresa pequena: fatura R$ 30 mil/mês e quer chegar a R$ 50 mil/mês.
 * Tudo abaixo deriva dessas cinco premissas — não há número solto nos slides.
 */
const ALPHA = {
  receitaAtualMes: 30_000,
  metaMes: 50_000,
  ticket: 500,
  winRate: 0.25,
  leadParaOportunidade: 0.2,
};
const MESES = 12;
const RECEITA_ATUAL = ALPHA.receitaAtualMes * MESES;               // 360.000/ano
const META = ALPHA.metaMes * MESES;                                // 600.000/ano
const GAP_MES = ALPHA.metaMes - ALPHA.receitaAtualMes;             // 20.000/mês
const GAP = GAP_MES * MESES;                                       // 240.000/ano
const CLIENTES = GAP / ALPHA.ticket;                               // 480
const OPORTUNIDADES = CLIENTES / ALPHA.winRate;                    // 1.920
const LEADS = OPORTUNIDADES / ALPHA.leadParaOportunidade;          // 9.600
const PIPELINE_NECESSARIO = GAP / ALPHA.winRate;                   // 960.000

const BUDGET = [
  { item: 'Marketing e mídia', valor: 48_000, icon: Megaphone, nota: 'R$ 4 mil/mês' },
  { item: 'Equipe comercial', valor: 60_000, icon: Users, nota: '1 vendedor + 1 SDR' },
  { item: 'Comissões', valor: 12_000, icon: DollarSign, nota: '5% da nova receita' },
  { item: 'Tecnologia (CRM)', valor: 6_000, icon: Cpu, nota: 'R$ 500/mês' },
  { item: 'Eventos', valor: 6_000, icon: Plane, nota: 'feiras locais' },
];
const BUDGET_TOTAL = BUDGET.reduce((s, b) => s + b.valor, 0);      // 132.000
const CAC = BUDGET_TOTAL / CLIENTES;                               // 275

const fmtK = (n: number) => 'R$ ' + Math.round(n / 1000) + ' mil';
const fmtBRL = (n: number) => 'R$ ' + n.toLocaleString('pt-BR');
const fmtMes = (n: number) => fmtK(n) + '/mês';
const fmtNum = (n: number) => n.toLocaleString('pt-BR');

/* ── Helpers visuais ─────────────────────────────────────────────────────── */
function Slide({ bg = 'dark', children }: { bg?: 'dark' | 'light'; children: React.ReactNode }) {
  const cls = bg === 'light' ? 'bg-[#F7FAFC] text-slate-900' : 'text-white';
  return (
    <div className={`relative h-full w-full overflow-hidden ${cls}`} style={bg === 'dark' ? { backgroundColor: NAVY } : undefined}>
      {bg === 'dark' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_15%,rgba(26,173,226,0.10),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(196,138,87,0.07),transparent_45%)]" />
      )}
      <div className="relative z-10 h-full w-full px-6 sm:px-10 py-7 sm:py-9 flex flex-col">
        <div className="mx-auto w-full max-w-[1180px] flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}

function Titulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="shrink-0 mb-6">
      {sub && <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: BLUE }}>{sub}</p>}
      <h2 className="text-2xl sm:text-4xl font-black tracking-tight">{children}</h2>
    </div>
  );
}

function TituloCentral({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-7 shrink-0">
      {sub && <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: BLUE }}>{sub}</p>}
      <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight" style={{ textShadow: '0 2px 30px rgba(26,173,226,0.35)' }}>{children}</h2>
      <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 64, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }} className="mx-auto mt-3 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${BLUE}, ${GOLD})` }} />
    </div>
  );
}

/** Faixa de rodapé com a mensagem-chave do slide. */
function Mensagem({ children, cor = BLUE }: { children: React.ReactNode; cor?: string }) {
  return (
    <div className="shrink-0 mt-6 rounded-xl border-l-[3px] bg-white/[0.03] px-5 py-3.5" style={{ borderColor: cor }}>
      <p className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">{children}</p>
    </div>
  );
}

/** Etiqueta de premissa — deixa explícito o que é hipótese didática. */
function Premissa({ children }: { children: React.ReactNode }) {
  return (
    <p className="shrink-0 mt-4 text-[11px] leading-relaxed text-slate-500 italic">
      <span className="not-italic font-bold uppercase tracking-wider" style={{ color: GOLD }}>Premissa · </span>
      {children}
    </p>
  );
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${className}`} style={style}>{children}</div>;
}

/** Número que "conta" até o valor ao abrir o slide. */
function CountUp({ value, format, duration = 1.1 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setDisplay(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(Math.round(display))}</>;
}

/** Seta vertical do fluxo. */
function Seta({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-0.5 shrink-0">
      <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.25)' }} />
      <span className="text-[10px]" style={{ color: BLUE }}>▼</span>
      {label && <span className="text-[9px] text-slate-500 mt-0.5">{label}</span>}
    </div>
  );
}

/* ════════════════════════ BLOCO 1 — O PROBLEMA ════════════════════════ */

// 1 — Capa
function S01() {
  const jornada = ['Estratégia', 'Execução', 'Receita', 'Previsibilidade'];
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-8" style={{ backgroundColor: '#031426' }}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(26,173,226,0.14),transparent_55%)]" />
      <div className="relative z-10 w-full max-w-[980px]">
        <p className="text-[11px] font-black uppercase tracking-[0.45em] mb-6" style={{ color: GOLD }}>MBA · Educação Executiva</p>
        <h1 className="text-3xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white">
          PLANEJAMENTO COMERCIAL,<br />BUDGET E <span style={{ color: BLUE }}>FORECAST</span>
        </h1>
        <p className="mt-6 text-lg sm:text-2xl font-light text-slate-300">
          Como transformar metas em uma operação de receita previsível
        </p>

        <div className="mt-14 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          {jornada.map((j, i) => (
            <motion.div
              key={j}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.18, duration: 0.5 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <span
                className="px-4 py-2 rounded-full text-[11px] sm:text-sm font-bold border"
                style={{
                  borderColor: i === 3 ? BLUE : 'rgba(255,255,255,0.14)',
                  color: i === 3 ? BLUE : '#CBD5E1',
                  background: i === 3 ? 'rgba(26,173,226,0.10)' : 'rgba(255,255,255,0.02)',
                }}
              >
                {j}
              </span>
              {i < 3 && <span className="text-slate-600">→</span>}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Carta virada: mostra a categoria e vira no clique, revelando os termos. */
function CartaGlossario({ grupo, delay }: { grupo: GrupoGlossario; delay: number }) {
  const [aberta, setAberta] = useState(false);
  const { cat, cor, icon: Icone, termos } = grupo;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="h-full min-h-0"
      style={{ perspective: 1400 }}
    >
      <motion.div
        onClick={() => setAberta((v) => !v)}
        animate={{ rotateY: aberta ? 180 : 0 }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
        whileHover={{ scale: aberta ? 1 : 1.03 }}
        className="relative w-full h-full cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── VERSO: carta virada para baixo ── */}
        <div
          className="absolute inset-0 rounded-2xl border flex flex-col items-center justify-center gap-3 px-4 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            borderColor: `${cor}33`,
            background: `linear-gradient(160deg, ${cor}14, rgba(255,255,255,0.02) 60%)`,
          }}
        >
          {/* brilho de fundo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 40%, ${cor}1f, transparent 65%)` }}
          />
          <div
            className="relative w-12 h-12 rounded-xl border flex items-center justify-center"
            style={{ borderColor: `${cor}44`, background: `${cor}1a` }}
          >
            <Icone className="w-5 h-5" style={{ color: cor }} />
          </div>
          <p className="relative text-[13px] font-black uppercase tracking-[0.12em] text-center leading-tight text-slate-100">
            {cat}
          </p>
          <p className="relative flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] italic" style={{ color: cor }}>
            <motion.span
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
            >
              ●
            </motion.span>
            Clique para revelar
          </p>
        </div>

        {/* ── FRENTE: os termos ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 flex flex-col overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.15em] pb-3 mb-3 border-b border-white/10 shrink-0" style={{ color: cor }}>
            {cat}
          </p>
          <ul className="space-y-3.5 overflow-y-auto">
            {termos.map(([t, d]) => (
              <li key={t}>
                <p className="text-[14px] font-black leading-tight" style={{ color: cor }}>{t}</p>
                <p className="text-[12px] text-slate-400 leading-snug mt-1">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

type GrupoGlossario = {
  cat: string;
  cor: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  termos: string[][];
};

// 2 — Glossário (cartas viradas: o professor revela a categoria quando chegar nela)
function SGlossario() {
  const grupos: GrupoGlossario[] = [
    {
      cat: 'Planejamento',
      cor: BLUE,
      icon: Map,
      termos: [
        ['Budget', 'Orçamento. Quanto dinheiro banca o plano.'],
        ['Forecast', 'Previsão. O que provavelmente vai acontecer.'],
        ['Gap', 'A distância entre onde estou e a meta.'],
        ['Top-down', 'Planejar de cima pra baixo: parte da ambição.'],
        ['Bottom-up', 'Planejar de baixo pra cima: parte da capacidade.'],
        ['Funil reverso', 'Calcular de trás pra frente: receita → clientes → leads.'],
        ['Playbook', 'O manual da venda: o passo a passo que o time segue em cada etapa.'],
      ],
    },
    {
      cat: 'Funil',
      cor: GOLD,
      icon: Layers,
      termos: [
        ['MQL', 'Marketing Qualified Lead: lead que o marketing julga pronto.'],
        ['Oportunidade (deal)', 'Negócio real em andamento, com valor e data.'],
        ['Pipeline', 'O conjunto de oportunidades em aberto. O “funil”.'],
        ['Pipeline coverage', 'Quantas vezes o pipeline cobre a meta (3x, 4x…).'],
        ['Ciclo de vendas', 'Tempo do primeiro contato até o fechamento.'],
        ['Aging', 'Há quanto tempo a oportunidade está parada na etapa.'],
      ],
    },
    {
      cat: 'Eficiência e economia',
      cor: GREEN,
      icon: GaugeIcon,
      termos: [
        ['Win rate', 'Taxa de fechamento: % das oportunidades que viram venda.'],
        ['Payback', 'Tempo até recuperar o dinheiro investido.'],
        ['Churn', '% de clientes que cancelam ou param de comprar.'],
        ['Margem', 'O que sobra da receita depois dos custos. Receita ≠ lucro.'],
      ],
    },
    {
      cat: 'Crescimento',
      cor: AMBER,
      icon: TrendingUp,
      termos: [
        ['Upsell', 'Vender um plano maior para quem já é cliente.'],
        ['Cross-sell', 'Vender um produto diferente para quem já é cliente.'],
        ['RevOps', 'Revenue Operations: integra as áreas em torno da receita.'],
      ],
    },
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-1.5" style={{ color: GOLD }}>Antes de começar</p>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Glossário</h2>
      </div>

      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
        {grupos.map((g, gi) => (
          <CartaGlossario key={g.cat} grupo={g} delay={0.1 + gi * 0.12} />
        ))}
      </div>
    </Slide>
  );
}

// 3 — A pergunta central (QUIZ ao vivo)
// A turma vota em /votar-mba01 pelo celular. Esta tela só conta os votos;
// o resultado fica escondido até o professor clicar em "revelar" — assim
// quem vota por último não é influenciado pela maioria.
function S02() {
  const [placar, setPlacar] = useState<{ sim: number; nao: number; total: number } | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [zerando, setZerando] = useState(false);

  // busca o placar a cada 2s enquanto o slide está aberto
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const r = await fetch('/api/quiz-mba01', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (vivo) setPlacar(d);
      } catch { /* rede caiu: mantém o último placar na tela */ }
    };
    buscar();
    const t = setInterval(buscar, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const zerar = async () => {
    setZerando(true);
    try {
      const r = await fetch('/api/quiz-mba01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'zerar' }),
      });
      if (r.ok) { setPlacar(await r.json()); setRevelado(false); }
    } catch { /* ignora */ }
    setZerando(false);
  };

  const total = placar?.total ?? 0;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <Slide bg="dark">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center min-h-0">
        {/* ── a pergunta ── */}
        <div>
          <motion.div initial={{ height: 0 }} animate={{ height: 56 }} transition={{ duration: 0.6 }} className="w-[3px] mb-7" style={{ background: `linear-gradient(180deg, ${BLUE}, transparent)` }} />
          <h1 className="text-2xl sm:text-[2.7rem] font-black leading-[1.15] tracking-tight">
            Sua empresa tem uma<br />meta de vendas.
          </h1>
          <h1 className="mt-5 text-2xl sm:text-[2.7rem] font-black leading-[1.15] tracking-tight" style={{ color: BLUE }}>
            Mas existe um plano capaz de explicar como ela será atingida?
          </h1>

          <div className="mt-8 inline-flex flex-col gap-1.5 rounded-xl border px-5 py-3.5" style={{ borderColor: `${GOLD}44`, background: 'rgba(196,138,87,0.06)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Vote pelo celular</p>
            <p className="text-lg font-black text-slate-100">hub.dynamisfamily.com.br<span style={{ color: GOLD }}>/votar-mba01</span></p>
          </div>
        </div>

        {/* ── o painel de votos ── */}
        <Card className="p-7 flex flex-col justify-center min-h-[340px]">
          {/* contador — sempre visível */}
          <div className="text-center">
            <motion.p
              key={total}
              initial={{ scale: 1.25, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="text-6xl font-black tabular-nums"
              style={{ color: BLUE, textShadow: '0 0 50px rgba(26,173,226,0.35)' }}
            >
              {total}
            </motion.p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">
              {total === 1 ? 'voto recebido' : 'votos recebidos'}
            </p>
            {placar === null && <p className="text-[10px] text-slate-600 mt-2">conectando…</p>}
          </div>

          {/* resultado — só depois de revelar */}
          <AnimatePresence mode="wait">
            {!revelado ? (
              <motion.div key="fechado" exit={{ opacity: 0 }} className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: BLUE }}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">Resultado escondido — a turma ainda está votando.</p>
                <button
                  onClick={() => setRevelado(true)}
                  disabled={total === 0}
                  className="mt-1 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.03] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(to bottom right, ${BLUE}, #0c6e9e)` }}
                >
                  Revelar resultado
                </button>
              </motion.div>
            ) : (
              <motion.div key="aberto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mt-8 space-y-4">
                {([['sim', 'Sim', BLUE], ['nao', 'Não', GOLD]] as const).map(([chave, rotulo, cor]) => {
                  const n = placar?.[chave] ?? 0;
                  return (
                    <div key={chave}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-sm font-black uppercase tracking-widest" style={{ color: cor }}>{rotulo}</span>
                        <span className="text-sm text-slate-400 tabular-nums">
                          <strong className="text-xl font-black" style={{ color: cor }}>{pct(n)}%</strong>
                          <span className="text-[11px] text-slate-600 ml-2">({n})</span>
                        </span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden bg-white/[0.05]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${cor}, ${cor}88)` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct(n)}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => setRevelado(false)}
                  className="w-full text-[10px] uppercase tracking-widest text-slate-600 hover:text-slate-400 pt-2 transition-colors"
                >
                  esconder de novo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={zerar}
            disabled={zerando}
            className="mt-6 pt-4 border-t border-white/10 text-[10px] uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40"
          >
            {zerando ? 'zerando…' : 'zerar votação'}
          </button>
        </Card>
      </div>
    </Slide>
  );
}

// 4 — Meta não é plano
// Quebra-cabeça: à esquerda os 6 encaixes VAZIOS (a meta não responde nada);
// à direita as mesmas 6 peças chegando espalhadas e encaixando uma a uma.
// Os dois lados têm 6 slots — é o mesmo quebra-cabeça, um montado e outro não.
function S03() {
  const perguntas = ['De onde virá a receita?', 'Quantos clientes?', 'Quantas oportunidades?', 'Quantos leads?', 'Quanto investimento?', 'Em quanto tempo?'];
  // posições de "peça espalhada" antes de encaixar — variadas, mas determinísticas
  const espalhadas = [
    { x: -70, y: -34, rot: -14 }, { x: 82, y: -18, rot: 11 }, { x: -58, y: 26, rot: 9 },
    { x: 74, y: 34, rot: -8 }, { x: -80, y: 12, rot: 13 }, { x: 62, y: -30, rot: -11 },
  ];
  const INICIO = 0.5; // deixa a turma ler a meta antes das peças começarem a encaixar

  return (
    <Slide bg="dark">
      <TituloCentral>Meta não é plano</TituloCentral>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">
        {/* ── META ── */}
        <Card className="p-7 flex flex-col justify-center items-center text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-5">Meta</p>
          <p className="text-2xl sm:text-3xl font-black leading-snug" style={{ color: GOLD }}>
            “Precisamos faturar<br />R$ 50 mil por mês.”
          </p>
        </Card>

        {/* ── PLANO: as peças encaixando ── */}
        <Card className="p-7 flex flex-col justify-center" style={{ borderColor: 'rgba(26,173,226,0.35)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-5" style={{ color: BLUE }}>Plano</p>
          <ul className="space-y-3">
            {perguntas.map((p, i) => (
              <motion.li
                key={p}
                initial={{
                  opacity: 0,
                  x: espalhadas[i].x,
                  y: espalhadas[i].y,
                  rotate: espalhadas[i].rot,
                  scale: 0.82,
                }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                transition={{
                  delay: INICIO + i * 0.26,
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,   // sub-amortecido: dá o "toc" do encaixe
                  mass: 0.7,
                }}
                whileHover={{ x: 5, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                className="group relative flex items-center gap-3 rounded-lg border px-3 py-2 text-[15px] text-slate-200 cursor-default"
                style={{ borderColor: `${BLUE}2e`, background: `${BLUE}0d` }}
              >
                {/* pino macho: encaixa no slot vazio do lado esquerdo */}
                <span
                  className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border"
                  style={{ background: '#0d2233', borderColor: `${BLUE}55` }}
                />
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors"
                  style={{ background: 'rgba(26,173,226,0.15)', color: BLUE }}
                >
                  {i + 1}
                </span>
                <span className="group-hover:text-white transition-colors">{p}</span>
              </motion.li>
            ))}
          </ul>
        </Card>
      </div>
      <Mensagem>Uma meta diz <strong>onde</strong> queremos chegar. Um plano explica <strong style={{ color: BLUE }}>como</strong>.</Mensagem>
    </Slide>
  );
}

// 5 — O problema da imprevisibilidade (mockup de grupo de WhatsApp)
// As cores são as do WhatsApp de verdade — a piada só funciona se a turma
// reconhecer a tela antes de ler o texto.
const ZAP = {
  fundo: '#0B141A',      // fundo do chat
  barra: '#202C33',      // header
  recebida: '#202C33',   // balão de quem manda
  enviada: '#005C4B',    // balão verde (você)
  texto: '#E9EDEF',
  apagado: '#8696A0',    // horário, subtítulo
  tique: '#53BDEB',      // check azul
};

function S04() {
  const msgs = [
    { area: 'Marketing', fala: 'Geramos muitos leads esse mês! 🚀', cor: BLUE, hora: '09:03', minha: false },
    { area: 'Vendas', fala: 'Os leads não são bons.', cor: GOLD, hora: '09:04', minha: false },
    { area: 'Financeiro', fala: 'Gente, a receita não veio.', cor: AMBER, hora: '09:06', minha: false },
    { area: 'Diretoria', fala: 'Por que o forecast estava errado?', cor: RED, hora: '09:11', minha: true },
  ];
  const PASSO = 0.75; // ritmo de conversa: dá tempo de ler cada mensagem

  return (
    <Slide bg="dark">
      <Titulo sub="Primeira segunda-feira do mês">A reunião de resultados</Titulo>

      <div className="flex-1 flex items-center justify-center min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[620px] rounded-2xl overflow-hidden border border-black/40"
          style={{ boxShadow: '0 30px 70px -20px rgba(0,0,0,0.75)' }}
        >
          {/* ── header do grupo ── */}
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: ZAP.barra }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#6A7175' }}>
              <Users className="w-5 h-5" style={{ color: '#CFD5D9' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-tight" style={{ color: ZAP.texto }}>Resultados · Fechamento do mês</p>
              <p className="text-[11px] truncate" style={{ color: ZAP.apagado }}>Marketing, Vendas, Financeiro, Diretoria</p>
            </div>
          </div>

          {/* ── chat ── */}
          <div className="relative px-4 py-4 space-y-2" style={{ background: ZAP.fundo, minHeight: 330 }}>
            {/* textura sutil do papel de parede do zap */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px)', backgroundSize: '38px 38px' }}
            />

            <motion.div
              className="relative flex justify-center pb-1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            >
              <span className="px-3 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider" style={{ background: ZAP.barra, color: ZAP.apagado }}>
                Hoje
              </span>
            </motion.div>

            {msgs.map((m, i) => (
              <motion.div
                key={m.area}
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.6 + i * PASSO, type: 'spring', stiffness: 320, damping: 24 }}
                className={`relative flex ${m.minha ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="relative max-w-[78%] rounded-lg px-3 pt-1.5 pb-1"
                  style={{ background: m.minha ? ZAP.enviada : ZAP.recebida }}
                >
                  {/* rabinho do balão */}
                  <span
                    className="absolute top-0 w-0 h-0"
                    style={
                      m.minha
                        ? { right: -7, borderTop: `8px solid ${ZAP.enviada}`, borderRight: '8px solid transparent' }
                        : { left: -7, borderTop: `8px solid ${ZAP.recebida}`, borderLeft: '8px solid transparent' }
                    }
                  />
                  {!m.minha && (
                    <p className="text-[12px] font-semibold leading-tight mb-0.5" style={{ color: m.cor }}>{m.area}</p>
                  )}
                  <div className="flex items-end gap-2">
                    <p className="text-[15px] leading-snug" style={{ color: ZAP.texto }}>{m.fala}</p>
                    <span className="flex items-center gap-0.5 shrink-0 translate-y-0.5">
                      <span className="text-[10px]" style={{ color: m.minha ? 'rgba(233,237,239,0.6)' : ZAP.apagado }}>{m.hora}</span>
                      {m.minha && <CheckCheck className="w-3.5 h-3.5" style={{ color: ZAP.tique }} />}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* ninguém responde a pergunta da diretoria: o balão de "digitando"
                que nunca vira mensagem é a piada do slide */}
            <motion.div
              className="relative flex justify-start pt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + msgs.length * PASSO + 0.8 }}
            >
              <div className="rounded-lg px-3.5 py-2.5 flex items-center gap-1.5" style={{ background: ZAP.recebida }}>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: ZAP.apagado }}
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.18, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <Mensagem cor={RED}>
        Empresas não sofrem apenas por falta de vendas.<br />Sofrem por <strong style={{ color: RED }}>falta de previsibilidade</strong>.
      </Mensagem>
    </Slide>
  );
}

// 6 — O sistema da receita (mapa da aula)
// Slide animado: cascata na entrada, pulso de fluxo contínuo descendo a cadeia,
// e hover que destaca o elo (os outros recuam) — reforça que é UM sistema, não 7 caixas.
function S05() {
  const etapas = [
    { nome: 'ESTRATÉGIA', desc: 'A ambição' },
    { nome: 'META', desc: 'O número' },
    { nome: 'PLANEJAMENTO COMERCIAL', desc: 'A decomposição', destaque: true },
    { nome: 'BUDGET', desc: 'O financiamento', destaque: true },
    { nome: 'EXECUÇÃO + PIPELINE', desc: 'A realidade', destaque: true },
    { nome: 'FORECAST', desc: 'A antecipação', destaque: true },
    { nome: 'DECISÃO E AJUSTES', desc: 'A correção' },
  ];
  const [hover, setHover] = useState<number | null>(null);
  const ENTRADA = 0.15;   // início da cascata
  const PASSO = 0.13;     // intervalo entre elos
  const FIM = ENTRADA + etapas.length * PASSO; // quando a cascata termina

  return (
    <Slide bg="dark">
      {/* só o rótulo — o título grande saiu */}
      <div className="text-center mb-7 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: BLUE }}>O mapa da aula</p>
        <motion.div
          initial={{ width: 0, opacity: 0 }} animate={{ width: 64, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="mx-auto mt-3 h-[3px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${BLUE}, ${GOLD})` }}
        />
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="relative w-full max-w-[720px]">
          {/* moldura RevOps — entra por último e "respira" devagar */}
          <motion.div
            className="absolute -inset-x-3 -inset-y-4 sm:-inset-x-10 rounded-[28px] border-2 border-dashed pointer-events-none"
            style={{ borderColor: `${GOLD}55` }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: [0, 1, 0.55, 1], scale: 1 }}
            transition={{
              opacity: { delay: FIM, duration: 5, times: [0, 0.12, 0.56, 1], repeat: Infinity, ease: 'easeInOut' },
              scale: { delay: FIM, duration: 0.6, ease: 'easeOut' },
            }}
          />
          <div className="relative flex flex-col items-center py-3">
            {/* pulso de fluxo: desce a cadeia em loop. Fica atrás dos cards (z-0),
                então aparece forte nas frestas — lê como o sinal passando de elo em elo. */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 z-0 w-[6px] h-[6px] rounded-full pointer-events-none"
              style={{ background: BLUE, boxShadow: `0 0 12px 3px ${BLUE}` }}
              initial={{ top: '0%', opacity: 0 }}
              animate={{ top: ['1%', '99%'], opacity: [0, 1, 1, 0] }}
              transition={{
                delay: FIM + 0.4,
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: 'easeInOut',
                opacity: { times: [0, 0.08, 0.88, 1], duration: 2.8, repeat: Infinity, repeatDelay: 0.8, delay: FIM + 0.4 },
              }}
            />

            {etapas.map((e, i) => {
              const cor = e.destaque ? BLUE : '#E2E8F0';
              const ativo = hover === i;
              const outroAtivo = hover !== null && !ativo;
              return (
                <div key={e.nome} className="w-full flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{
                      opacity: outroAtivo ? 0.4 : 1,
                      y: 0,
                      scale: ativo ? 1.045 : 1,
                    }}
                    transition={{
                      opacity: { delay: hover === null ? ENTRADA + i * PASSO : 0, duration: 0.35 },
                      y: { delay: ENTRADA + i * PASSO, duration: 0.4, ease: 'easeOut' },
                      scale: { type: 'spring', stiffness: 380, damping: 22 },
                    }}
                    onHoverStart={() => setHover(i)}
                    onHoverEnd={() => setHover(null)}
                    className="group relative z-10 w-full max-w-[420px] rounded-xl px-5 py-2.5 flex items-center justify-between border overflow-hidden cursor-default"
                    style={{
                      borderColor: ativo ? cor : e.destaque ? `${BLUE}55` : 'rgba(255,255,255,0.10)',
                      background: e.destaque ? 'rgba(26,173,226,0.08)' : 'rgba(255,255,255,0.025)',
                      boxShadow: ativo ? `0 8px 30px -6px ${cor}55` : 'none',
                      transition: 'border-color 0.25s, box-shadow 0.25s',
                    }}
                  >
                    {/* varredura de luz da esquerda no hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `linear-gradient(90deg, ${cor}22, transparent 65%)` }}
                    />
                    {/* barra de acento que cresce a partir do centro */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center pointer-events-none"
                      style={{ background: cor }}
                    />
                    <span className="relative text-[13px] font-black tracking-wide transition-colors duration-200" style={{ color: cor }}>
                      {e.nome}
                    </span>
                    <span className="relative text-[10px] text-slate-500 translate-x-1.5 opacity-70 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-slate-300 transition-all duration-300">
                      {e.desc}
                    </span>
                  </motion.div>

                  {i < etapas.length - 1 && (
                    <div className="flex flex-col items-center py-0.5 shrink-0 relative z-10">
                      <motion.div
                        className="w-px"
                        style={{ background: 'rgba(255,255,255,0.25)' }}
                        initial={{ height: 0 }}
                        animate={{ height: 12 }}
                        transition={{ delay: ENTRADA + i * PASSO + 0.2, duration: 0.2 }}
                      />
                      <motion.span
                        className="text-[10px]"
                        style={{ color: BLUE }}
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: ENTRADA + i * PASSO + 0.3, duration: 0.25 }}
                      >
                        ▼
                      </motion.span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ═════════════════ BLOCO 2 — PLANEJAMENTO COMERCIAL ═════════════════ */

// 7 — A estratégia (as 3 perguntas que a antecedem)
// "Quais recursos?" saiu de propósito: recurso não é estratégia, é budget —
// e budget é o bloco 3. Aqui a aula ainda está decidindo PARA ONDE ir.
function S06() {
  const qs = [
    { n: '01', q: 'Onde estamos?' },
    { n: '02', q: 'Onde queremos chegar?' },
    { n: '03', q: 'O que precisa acontecer?' },
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: BLUE }}>1</span> A estratégia</Titulo>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 content-center">
        {qs.map((x, i) => (
          <motion.div
            key={x.n}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12 + i * 0.14, duration: 0.45, ease: 'easeOut' }}
            className="h-full"
          >
            <Card className="p-7 h-full sm:min-h-[220px] flex flex-col">
              <p className="text-4xl font-black mb-4" style={{ color: i === 0 ? BLUE : 'rgba(255,255,255,0.16)' }}>{x.n}</p>
              <p className="text-xl font-bold text-slate-100 leading-snug">{x.q}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      <Mensagem>Planejamento não começa na meta. Começa na <strong style={{ color: BLUE }}>realidade</strong>.</Mensagem>
    </Slide>
  );
}

// 8 — Ferramentas da estratégia
// Cada card traz um mini-diagrama da ferramenta e amarra na pergunta que ela
// responde no slide 7 — as três não competem, elas cobrem perguntas diferentes.
function S07() {
  const swot = [
    { letra: 'S', pt: 'Forças', cor: GREEN },
    { letra: 'W', pt: 'Fraquezas', cor: RED },
    { letra: 'O', pt: 'Oportunidades', cor: BLUE },
    { letra: 'T', pt: 'Ameaças', cor: AMBER },
  ];
  const motivadores = ['Rentabilidade', 'Market share', 'Sobrevivência', 'Captação', 'Sucessão'];

  return (
    <Slide bg="dark">
      <Titulo>Ferramentas</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 content-center min-h-0">

        {/* ── 1. AS IS / TO BE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45 }} className="h-full">
          <Card className="p-6 h-full lg:min-h-[240px] flex flex-col" style={{ borderColor: `${BLUE}2e` }}>
            <div className="flex items-center gap-2.5 mb-1">
              <Map className="w-4 h-4" style={{ color: BLUE }} />
              <p className="text-base font-black" style={{ color: BLUE }}>As is / To be</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">A fotografia de hoje contra a de amanhã.</p>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 rounded-lg border px-3 py-4 text-center" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">As is</p>
                  <p className="text-sm font-black text-slate-300 mt-1">Hoje</p>
                </div>
                <motion.span
                  className="text-lg shrink-0"
                  style={{ color: BLUE }}
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  →
                </motion.span>
                <div className="flex-1 rounded-lg border px-3 py-4 text-center" style={{ borderColor: `${BLUE}55`, background: 'rgba(26,173,226,0.08)' }}>
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: BLUE }}>To be</p>
                  <p className="text-sm font-black mt-1" style={{ color: BLUE }}>Amanhã</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── 2. SWOT ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.45 }} className="h-full">
          <Card className="p-6 h-full lg:min-h-[240px] flex flex-col" style={{ borderColor: `${GREEN}2e` }}>
            <div className="flex items-center gap-2.5 mb-1">
              <LayoutGrid className="w-4 h-4" style={{ color: GREEN }} />
              <p className="text-base font-black" style={{ color: GREEN }}>SWOT</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">O que joga a favor e contra.</p>

            <div className="flex-1 flex items-center">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-1.5">
                  {swot.map((q, i) => (
                    <motion.div
                      key={q.letra}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="rounded-lg border px-2.5 py-3"
                      style={{ borderColor: `${q.cor}33`, background: `${q.cor}0d` }}
                    >
                      <p className="text-lg font-black leading-none" style={{ color: q.cor }}>{q.letra}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">{q.pt}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── 3. MOTIVADORES ESTRATÉGICOS ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.45 }} className="h-full">
          <Card className="p-6 h-full lg:min-h-[240px] flex flex-col" style={{ borderColor: `${GOLD}2e` }}>
            <div className="flex items-center gap-2.5 mb-1">
              <Target className="w-4 h-4" style={{ color: GOLD }} />
              <p className="text-base font-black" style={{ color: GOLD }}>Motivadores estratégicos</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-5">O porquê que vem antes do número.</p>

            <div className="flex-1 flex items-center">
              <div className="w-full flex flex-wrap gap-1.5">
                {motivadores.map((m, i) => (
                  <motion.span
                    key={m}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 + i * 0.07 }}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
                    style={{ borderColor: `${GOLD}44`, color: '#E2E8F0', background: 'rgba(196,138,87,0.08)' }}
                  >
                    {m}
                  </motion.span>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </Slide>
  );
}

/* ── Slides 9/10/11: cada ferramenta + o exercício que o aluno faz ────────
 * Os alunos abrem /treino-mba01 no celular e preenchem com a empresa DELES.
 * Os dados ficam no navegador do aluno (localStorage) — nada vai pro servidor.
 */

const LINK_TREINO = 'hub.dynamisfamily.com.br/treino-mba01';

/** Moldura clara imitando a tela do exercício, para projetar. */
function MockupTela({ cor, pilar, titulo, children }: {
  cor: string; pilar: number; titulo: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden bg-[#F1F5F9] border border-black/20"
      style={{ boxShadow: '0 30px 70px -20px rgba(0,0,0,0.65)' }}
    >
      {/* barra do navegador */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#E2E8F0] border-b border-black/10">
        <span className="flex gap-1.5">
          {['#EF4444', '#F59E0B', '#10B981'].map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="flex-1 mx-2 px-2.5 py-1 rounded-md bg-white text-[9px] text-slate-500 truncate">
          {LINK_TREINO}
        </span>
      </div>
      {/* faixa do pilar */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: `${cor}14` }}>
        <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: cor }} />
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: cor }}>Pilar {pilar} de 3</p>
          <p className="text-[15px] font-black text-slate-900 leading-tight">{titulo}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

/** Bloco de chamada com o link do exercício. */
function ChamadaTreino({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border px-5 py-4" style={{ borderColor: `${GOLD}44`, background: 'rgba(196,138,87,0.06)' }}>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5" style={{ color: GOLD }}>Agora é você</p>
      <p className="text-[13px] text-slate-300 leading-relaxed mb-3">{texto}</p>
      <p className="text-base font-black text-slate-100">
        hub.dynamisfamily.com.br<span style={{ color: GOLD }}>/treino-mba01</span>
      </p>
    </div>
  );
}

// 9 — To be / As is (tela + exercício)
function S08A() {
  const linhas = [
    ['Marketing que gera demanda constante', 'Baixa demanda, poucos canais e caros'],
    ['Empresa com MRR de R$ 30 mil', 'MRR de R$ 5 mil por mês'],
    ['Receita vinda de vários produtos', 'Dependendo de um produto só'],
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: GREEN }}>1</span> To be / As is</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center min-h-0">
        <MockupTela cor={GREEN} pilar={1} titulo="To be / As is">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-1.5 px-1">
            <p className="text-[7px] font-black uppercase tracking-[0.15em]" style={{ color: GREEN }}>Queremos ser</p>
            <span className="w-3" />
            <p className="text-[7px] font-black uppercase tracking-[0.15em]" style={{ color: AMBER }}>Somos hoje</p>
          </div>
          <div className="space-y-1.5">
            {linhas.map(([tobe, asis], i) => (
              <motion.div
                key={tobe}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.15 }}
                className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center"
              >
                <div className="rounded-md bg-white border border-slate-200 border-l-[3px] px-2.5 py-2" style={{ borderLeftColor: GREEN }}>
                  <p className="text-[10px] text-slate-700 leading-snug">{tobe}</p>
                </div>
                <span className="text-slate-300 text-[10px]">→</span>
                <div className="rounded-md bg-white border border-slate-200 border-l-[3px] px-2.5 py-2" style={{ borderLeftColor: AMBER }}>
                  <p className="text-[10px] text-slate-700 leading-snug">{asis}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </MockupTela>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Escreva primeiro o <strong style={{ color: GREEN }}>queremos ser</strong>, sem se prender ao que é
            possível hoje. Só depois o <strong style={{ color: AMBER }}>somos hoje</strong> — com honestidade.
          </p>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            A distância entre as duas colunas é o <strong style={{ color: GOLD }}>gap</strong>. É ele que vira
            meta, e é a meta que o resto da aula vai decompor.
          </p>
          <ChamadaTreino texto="Abra no celular, coloque seu nome e a sua empresa, e preencha o To be / As is do seu negócio. No fim você baixa em PDF." />
        </div>
      </div>
    </Slide>
  );
}

// 10 — SWOT (tela + exercício)
function S08B() {
  const quad = [
    { l: 'S', r: 'Forças', c: GREEN, ex: ['Produto transformador', 'Comunidade engajada'] },
    { l: 'W', r: 'Fraquezas', c: RED, ex: ['Comercial inexperiente', 'Marketing fraco'] },
    { l: 'O', r: 'Oportunidades', c: BLUE, ex: ['Mercado B2B crescendo'] },
    { l: 'T', r: 'Ameaças', c: AMBER, ex: ['Concorrente capitalizado'] },
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: BLUE }}>2</span> SWOT</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center min-h-0">
        <MockupTela cor="#3B82F6" pilar={2} titulo="SWOT">
          <div className="grid grid-cols-2 gap-2">
            {quad.map((q, i) => (
              <motion.div
                key={q.l}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.12 }}
                className="rounded-lg bg-white border border-slate-200 p-2.5"
              >
                <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white" style={{ background: q.c }}>{q.l}</span>
                  <p className="text-[10px] font-black" style={{ color: q.c }}>{q.r}</p>
                </div>
                {q.ex.map((e) => (
                  <p key={e} className="text-[9px] text-slate-500 leading-snug py-0.5">• {e}</p>
                ))}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[7px] uppercase tracking-widest text-slate-400">↑ dentro</span>
            <span className="text-[7px] uppercase tracking-widest text-slate-400">fora ↓</span>
          </div>
        </MockupTela>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            As duas de cima são sobre a <strong className="text-slate-200">sua empresa</strong> — você controla.
            As duas de baixo são sobre o <strong className="text-slate-200">mercado</strong> — só dá pra se preparar.
          </p>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Teste de honestidade: se você escreveu uma fraqueza na linha das{' '}
            <strong style={{ color: AMBER }}>ameaças</strong>, está terceirizando culpa.
          </p>
          <ChamadaTreino texto="Mesma página, aba SWOT. Preencha os quatro quadrantes da sua empresa — comece pelas fraquezas, é onde a turma trava." />
        </div>
      </div>
    </Slide>
  );
}

// 11 — Motivadores Estratégicos (tela + exercício)
function S08C() {
  const cols = [
    { t: 'BUSCAR', s: 'quero ser e não tenho', c: '#3B82F6', itens: ['MRR de R$ 30 mil', 'Marketing que gera demanda', 'Novos líderes seniores'] },
    { t: 'PRESERVAR', s: 'quero ser e já tenho', c: GREEN, itens: ['Produto transformador', 'Comunidade engajada', 'Time engajado'] },
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: '#8B5CF6' }}>3</span> Motivadores estratégicos</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center min-h-0">
        <MockupTela cor="#8B5CF6" pilar={3} titulo="Motivadores Estratégicos">
          <div className="grid grid-cols-2 gap-2.5">
            {cols.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.15 }}
                className="rounded-lg bg-white border border-slate-200 p-3"
              >
                <div className="text-center pb-2 mb-2 border-b border-slate-100">
                  <p className="text-[13px] font-black" style={{ color: c.c }}>{c.t}</p>
                  <p className="text-[7px] text-slate-400">{c.s}</p>
                </div>
                {c.itens.map((x) => (
                  <p key={x} className="text-[9px] text-slate-500 leading-snug py-0.5">• {x}</p>
                ))}
              </motion.div>
            ))}
          </div>
        </MockupTela>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Este exercício se alimenta dos outros dois: o que ficou no{' '}
            <strong style={{ color: GOLD }}>gap</strong> vira <strong style={{ color: BLUE }}>BUSCAR</strong>.
            O que apareceu nas <strong style={{ color: GREEN }}>forças</strong> vira{' '}
            <strong style={{ color: GREEN }}>PRESERVAR</strong>.
          </p>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Empresa que só busca quebra o que já funcionava. Empresa que só preserva não cresce.
          </p>
          <ChamadaTreino texto="Terceira aba. Feche o exercício, salve e baixe o PDF — é o esqueleto do plano comercial da sua empresa." />
        </div>
      </div>
    </Slide>
  );
}

// 12 — De onde virá o crescimento? (4 motores)
function S08() {
  const motores = [
    { n: '01', nome: 'AQUISIÇÃO', sub: 'Novos clientes', desc: 'O motor mais caro e mais lento.', icon: Target, cor: BLUE },
    { n: '02', nome: 'RETENÇÃO', sub: 'Redução de churn', desc: 'Receita que você já tem e está perdendo.', icon: ShieldCheck, cor: GREEN },
    { n: '03', nome: 'EXPANSÃO', sub: 'Upsell e cross-sell', desc: 'Custo de aquisição próximo de zero.', icon: TrendingUp, cor: GOLD },
    { n: '04', nome: 'MONETIZAÇÃO', sub: 'Preço e ticket médio', desc: 'O mais rápido — e o mais sensível.', icon: DollarSign, cor: AMBER },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="Onde queremos chegar?">De onde virá o crescimento?</TituloCentral>
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3.5 content-center">
        {motores.map((m, i) => (
          <motion.div key={m.n} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.13 }} className="h-full">
            <div className="h-full rounded-2xl border p-5 flex flex-col" style={{ borderColor: `${m.cor}33`, background: `${m.cor}0a` }}>
              <m.icon className="w-6 h-6 mb-3" style={{ color: m.cor }} />
              <p className="text-[10px] font-black tracking-widest" style={{ color: `${m.cor}99` }}>{m.n}</p>
              <p className="text-lg font-black mt-0.5" style={{ color: m.cor }}>{m.nome}</p>
              <p className="text-xs font-semibold text-slate-300 mt-1">{m.sub}</p>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <Mensagem>Crescer não significa necessariamente apenas <strong>vender para mais clientes</strong>.</Mensagem>
    </Slide>
  );
}

// 13 — O caso Empresa Alpha
function S09() {
  const dados = [
    { label: 'Receita atual', valor: 'R$ 30 mil/mês', sub: fmtK(RECEITA_ATUAL) + '/ano', cor: '#E2E8F0' },
    { label: 'Meta', valor: 'R$ 50 mil/mês', sub: fmtK(META) + '/ano', cor: BLUE },
    { label: 'Gap', valor: 'R$ 20 mil/mês', sub: fmtK(GAP) + '/ano', cor: GOLD },
    { label: 'Ticket médio', valor: 'R$ 500', sub: 'por cliente', cor: '#E2E8F0' },
    { label: 'Taxa de fechamento', valor: '25%', sub: 'win rate', cor: '#E2E8F0' },
    { label: 'Lead → Oportunidade', valor: '20%', sub: 'qualificação', cor: '#E2E8F0' },
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 flex items-center gap-3 mb-6">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: `${GOLD}1a`, color: GOLD }}>Estudo de caso</span>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight">EMPRESA ALPHA</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3.5 content-center">
        {dados.map((d, i) => (
          <motion.div key={d.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.09 }}>
            <Card className="px-5 py-5 h-full">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{d.label}</p>
              <p className="text-2xl sm:text-3xl font-black mt-2" style={{ color: d.cor }}>{d.valor}</p>
              <p className="text-[10px] text-slate-600 mt-1">{d.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      <Mensagem cor={GOLD}>Como transformar um gap de <strong style={{ color: GOLD }}>R$ 20 mil por mês</strong> em um plano comercial?</Mensagem>
      <Premissa>
        Ticket médio, win rate e conversão lead→oportunidade são premissas didáticas simplificadas e
        constantes. Na prática variam por segmento, canal e vendedor.
      </Premissa>
    </Slide>
  );
}

// 14 — Começando pelo fim
function S10() {
  return (
    <Slide bg="dark">
      <Titulo sub="Primeira transformação">Começando pelo fim</Titulo>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center gap-5 sm:gap-9 flex-wrap justify-center">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Meta incremental (ano)</p>
            <p className="text-3xl sm:text-5xl font-black text-slate-100">R$ 240.000</p>
          </div>
          <span className="text-3xl sm:text-4xl font-thin text-slate-600">÷</span>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Ticket médio</p>
            <p className="text-3xl sm:text-5xl font-black text-slate-100">R$ 500</p>
          </div>
          <span className="text-3xl sm:text-4xl font-thin" style={{ color: BLUE }}>=</span>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, duration: 0.5, ease: 'backOut' }} className="mt-10 text-center">
          <p className="text-[7rem] sm:text-[10rem] font-black leading-none" style={{ color: BLUE, textShadow: '0 0 70px rgba(26,173,226,0.35)' }}>
            <CountUp value={CLIENTES} format={(n) => String(n)} duration={1.4} />
          </p>
          <p className="text-lg sm:text-2xl font-black uppercase tracking-[0.3em] mt-1" style={{ color: GOLD }}>Novos clientes</p>
          <p className="text-sm text-slate-500 mt-2">≈ {CLIENTES / MESES} novos clientes por mês</p>
        </motion.div>
      </div>
      <Mensagem>A primeira transformação do planejamento é converter <strong>receita</strong> em <strong style={{ color: BLUE }}>clientes</strong>.</Mensagem>
      <Premissa>
        Assumimos que todo o gap vem de <strong>aquisição</strong>, com ticket estável. Se parte vier de
        expansão ou de preço, o número de clientes necessários cai.
      </Premissa>
    </Slide>
  );
}

// 15 — O funil reverso
function S11() {
  const degraus = [
    { valor: fmtK(GAP) + ' de nova receita', conta: null as string | null, w: 100, cor: '#E2E8F0', num: `${fmtK(GAP_MES)}/mês` },
    { valor: `${CLIENTES} clientes`, conta: `R$ 240.000 ÷ R$ 500 = ${CLIENTES}`, w: 76, cor: BLUE, num: `≈ ${CLIENTES / MESES}/mês` },
    { valor: `${fmtNum(OPORTUNIDADES)} oportunidades`, conta: `${CLIENTES} ÷ 25% = ${fmtNum(OPORTUNIDADES)}`, w: 55, cor: GOLD, num: `≈ ${OPORTUNIDADES / MESES}/mês` },
    { valor: `${fmtNum(LEADS)} leads`, conta: `${fmtNum(OPORTUNIDADES)} ÷ 20% = ${fmtNum(LEADS)}`, w: 34, cor: AMBER, num: `≈ ${LEADS / MESES}/mês` },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="O slide mais importante do bloco">O funil reverso</Titulo>
      <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-0">
        {degraus.map((d, i) => (
          <div key={d.valor} className="w-full flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.2 + i * 0.3, duration: 0.5 }}
              className="rounded-xl border px-6 py-3 flex items-center justify-between gap-6"
              style={{ width: `${d.w}%`, minWidth: 280, borderColor: `${d.cor}44`, background: `${d.cor}0d` }}
            >
              <p className="text-xl sm:text-3xl font-black whitespace-nowrap" style={{ color: d.cor }}>{d.valor}</p>
              <div className="text-right shrink-0">
                {d.conta && <p className="text-[11px] font-mono text-slate-400">{d.conta}</p>}
                {d.num && <p className="text-[10px] text-slate-600">{d.num}</p>}
              </div>
            </motion.div>
            {i < degraus.length - 1 && <Seta />}
          </div>
        ))}
      </div>
      <Mensagem>Toda meta de receita esconde uma <strong style={{ color: BLUE }}>meta operacional</strong>.</Mensagem>
      <Premissa>
        Ticket R$ 500 · Win rate 25% · Lead→Oportunidade 20%, constantes ao longo do ano. Modelo
        didático: conversões reais variam por canal, segmento e vendedor.
      </Premissa>
    </Slide>
  );
}

// 16 — Mas a realidade não é uma planilha
function S12() {
  const vars = [
    { v: 'Sazonalidade', d: '9.600 leads não caem 800 por mês.' },
    { v: 'Capacidade da equipe', d: '160 oportunidades/mês exigem quantos vendedores?' },
    { v: 'Ciclo de vendas', d: 'Lead de setembro não vira receita neste ano.' },
    { v: 'Variação do ticket', d: 'Desconto muda o número de clientes necessários.' },
    { v: 'Perdas no funil', d: 'A taxa média esconde os meses ruins.' },
    { v: 'Churn', d: 'Parte da venda nova só repõe o que saiu.' },
    { v: 'Mudanças de mercado', d: 'A premissa envelhece sozinha.' },
  ];
  return (
    <Slide bg="dark">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-7 items-center min-h-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>Confronto</p>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight">
            O plano é perfeito.<br />
            <span className="text-slate-500">A planilha aceita<br />qualquer número.</span>
          </h2>
          <div className="mt-7 rounded-xl border-l-[3px] px-5 py-4" style={{ borderColor: RED, background: 'rgba(239,68,68,0.06)' }}>
            <p className="text-base font-semibold text-slate-100 leading-snug">
              O cálculo cria uma <strong style={{ color: BLUE }}>hipótese</strong>.<br />
              A execução <strong style={{ color: RED }}>testa</strong> essa hipótese.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {vars.map((x, i) => (
            <motion.div key={x.v} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.09 }}>
              <Card className="px-4 py-3 h-full">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: AMBER }} />
                  <p className="text-[13px] font-bold text-slate-100">{x.v}</p>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{x.d}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// 17 — Top-down × Bottom-up
function S13() {
  const cols = [
    { t: 'TOP-DOWN', cor: BLUE, itens: ['Parte da ambição', '“Queremos crescer 50%”', 'Visão estratégica', 'Pressiona crescimento'], risco: 'Risco: meta sem lastro que o time descarta no primeiro mês.' },
    { t: 'BOTTOM-UP', cor: GOLD, itens: ['Parte da capacidade', '“Quanto conseguimos produzir?”', 'Visão operacional', 'Testa viabilidade'], risco: 'Risco: o time se protege e você planeja a mediocridade.' },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="Como validar a meta">Top-down × Bottom-up</TituloCentral>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center min-h-0">
        <Card className="p-6 h-full flex flex-col" style={{ borderColor: `${cols[0].cor}33` }}>
          <p className="text-xl font-black mb-4" style={{ color: cols[0].cor }}>{cols[0].t}</p>
          <ul className="space-y-2.5 flex-1">
            {cols[0].itens.map((x) => <li key={x} className="text-[15px] text-slate-200 flex gap-2"><span className="text-slate-600">↓</span>{x}</li>)}
          </ul>
          <p className="text-[11px] text-slate-500 italic mt-4 pt-3 border-t border-white/10">{cols[0].risco}</p>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2 px-2">
          <div className="hidden lg:block w-px flex-1 bg-white/10" />
          <span className="text-2xl font-thin text-slate-600">×</span>
          <div className="hidden lg:block w-px flex-1 bg-white/10" />
        </div>

        <Card className="p-6 h-full flex flex-col" style={{ borderColor: `${cols[1].cor}33` }}>
          <p className="text-xl font-black mb-4" style={{ color: cols[1].cor }}>{cols[1].t}</p>
          <ul className="space-y-2.5 flex-1">
            {cols[1].itens.map((x) => <li key={x} className="text-[15px] text-slate-200 flex gap-2"><span className="text-slate-600">↑</span>{x}</li>)}
          </ul>
          <p className="text-[11px] text-slate-500 italic mt-4 pt-3 border-t border-white/10">{cols[1].risco}</p>
        </Card>
      </div>
      <Mensagem>Um bom planejamento <strong style={{ color: BLUE }}>confronta a ambição com a capacidade</strong> — e a diferença entre as duas é a pergunta mais útil do processo.</Mensagem>
    </Slide>
  );
}

// 18 — O plano comercial (5 pilares)
function S14() {
  const pilares = [
    { n: '1', t: 'META', q: 'Quanto queremos gerar?', icon: Target },
    { n: '2', t: 'MERCADO', q: 'Para quem venderemos?', icon: Map },
    { n: '3', t: 'MÁQUINA COMERCIAL', q: 'Como venderemos?', icon: Settings2 },
    { n: '4', t: 'RECURSOS', q: 'O que será necessário?', icon: DollarSign },
    { n: '5', t: 'INDICADORES', q: 'Como saberemos se está funcionando?', icon: BarChart3 },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="Fechando o bloco 2">O plano comercial</TituloCentral>
      <div className="flex-1 flex items-center min-h-0">
        <div className="w-full grid grid-cols-1 sm:grid-cols-5 gap-3">
          {pilares.map((p, i) => (
            <motion.div key={p.n} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12 }} className="h-full">
              <div className="h-full sm:min-h-[300px] rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: 'rgba(26,173,226,0.12)' }}>
                  <p.icon className="w-4.5 h-4.5" style={{ color: BLUE }} />
                </div>
                <p className="text-[10px] font-black" style={{ color: `${GOLD}` }}>{p.n}</p>
                <p className="text-base font-black text-slate-100 leading-tight mt-1">{p.t}</p>
                <p className="text-[12px] text-slate-500 mt-3 leading-relaxed">{p.q}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <Mensagem cor={GOLD}>Se um dos cinco pilares está vazio, o plano <strong>não é executável</strong> — repare no pilar 4.</Mensagem>
    </Slide>
  );
}

/* ═══════════════════════ BLOCO 3 — BUDGET ═══════════════════════ */

// 19 — Transição para budget
function S15() {
  return (
    <Slide bg="dark">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-8" style={{ color: GOLD }}>Bloco 3</p>
        <h1 className="text-2xl sm:text-4xl font-bold leading-snug text-slate-200 max-w-[820px]">
          Quanto <span style={{ color: BLUE }}>custa executar</span> a estratégia que acabamos de desenhar?
        </h1>
        <motion.p
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: 'backOut' }}
          className="mt-12 text-[5rem] sm:text-[8rem] font-black leading-none tracking-tight"
          style={{ color: BLUE, textShadow: '0 0 80px rgba(26,173,226,0.35)' }}
        >
          BUDGET
        </motion.p>
      </div>
    </Slide>
  );
}

// 20 — O que é budget?
function S16() {
  const fluxo = [
    { t: 'ESTRATÉGIA', v: '“Gerar R$ 240 mil no ano”', cor: '#94A3B8' },
    { t: 'PLANO', v: '“Conquistar 480 clientes”', cor: '#CBD5E1' },
    { t: 'OPERAÇÃO', v: '“Gerar 9.600 leads”', cor: GOLD },
    { t: 'BUDGET', v: '“Quais recursos financiarão essa máquina?”', cor: BLUE },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="Definição">O que é budget?</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 items-center min-h-0">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black leading-tight">
            Budget é a <span style={{ color: BLUE }}>tradução financeira</span> da estratégia.
          </h2>
          <p className="mt-6 text-[15px] text-slate-400 leading-relaxed">
            Se a estratégia mudou e o budget não mudou, um dos dois é ficção.
          </p>
          <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">
            Ler o budget de trás para frente revela a <strong className="text-slate-200">estratégia real</strong> da
            empresa — o discurso pode dizer outra coisa.
          </p>
        </div>
        <div className="flex flex-col items-stretch">
          {fluxo.map((f, i) => (
            <div key={f.t} className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.2 }}
                className="rounded-xl border px-5 py-3.5"
                style={{ borderColor: i === 3 ? `${BLUE}55` : 'rgba(255,255,255,0.10)', background: i === 3 ? 'rgba(26,173,226,0.08)' : 'rgba(255,255,255,0.025)' }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: f.cor }}>{f.t}</p>
                <p className="text-[15px] font-semibold text-slate-100 mt-1">{f.v}</p>
              </motion.div>
              {i < fluxo.length - 1 && <Seta />}
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// 21 — O que entra no budget comercial?
function S17() {
  const cats = [
    { c: 'Pessoas', d: 'Salários, encargos, hiring, ramp-up', icon: Users, cor: BLUE },
    { c: 'Marketing e mídia', d: 'O combustível dos 9.600 leads', icon: Megaphone, cor: GOLD },
    { c: 'Comissões', d: 'Variável — cresce com a receita', icon: DollarSign, cor: GREEN },
    { c: 'Tecnologia', d: 'CRM, automação, dados, enablement', icon: Cpu, cor: BLUE },
    { c: 'Viagens e eventos', d: 'Canal de aquisição em venda complexa', icon: Plane, cor: GOLD },
    { c: 'Treinamento', d: 'Alavanca direta de win rate', icon: GraduationCap, cor: GREEN },
    { c: 'Parceiros e canais', d: 'Receita indireta', icon: Handshake, cor: AMBER },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="Composição">O que entra no budget comercial?</Titulo>
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 content-center">
        {cats.map((c, i) => (
          <motion.div key={c.c} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 + i * 0.08 }}>
            <Card className="p-4 h-full">
              <c.icon className="w-5 h-5 mb-2.5" style={{ color: c.cor }} />
              <p className="text-sm font-bold text-slate-100">{c.c}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.d}</p>
            </Card>
          </motion.div>
        ))}
        <div className="rounded-2xl border border-dashed flex items-center justify-center p-4" style={{ borderColor: `${GOLD}44` }}>
          <p className="text-[11px] text-center leading-relaxed" style={{ color: GOLD }}>
            Cortar 20% do budget =<br />reduzir X% da capacidade<br />de gerar receita.
          </p>
        </div>
      </div>
      <Mensagem>Não orçamos apenas despesas. Orçamos <strong style={{ color: BLUE }}>capacidades</strong>.</Mensagem>
    </Slide>
  );
}

// 22 — Construindo o budget da Alpha
function S18() {
  const max = Math.max(...BUDGET.map((b) => b.valor));
  return (
    <Slide bg="dark">
      <Titulo sub="Estudo de caso · Empresa Alpha">Construindo o budget</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 items-center min-h-0">
        <div className="space-y-2.5">
          {BUDGET.map((b, i) => (
            <motion.div key={b.item} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.11 }} className="flex items-center gap-3">
              <b.icon className="w-4 h-4 shrink-0 text-slate-500" />
              <div className="w-[170px] shrink-0">
                <p className="text-[13px] text-slate-300 leading-tight">{b.item}</p>
                <p className="text-[10px] text-slate-600">{b.nota}</p>
              </div>
              <div className="flex-1 h-7 rounded-md overflow-hidden bg-white/[0.04]">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${(b.valor / max) * 100}%` }}
                  transition={{ delay: 0.25 + i * 0.11, duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-md" style={{ background: `linear-gradient(90deg, ${BLUE}, #0c6e9e)` }}
                />
              </div>
              <p className="text-sm font-black w-[90px] text-right shrink-0" style={{ color: BLUE }}>{fmtK(b.valor)}</p>
            </motion.div>
          ))}
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-white/10">
            <p className="text-sm font-black text-slate-100 w-[190px] shrink-0 pl-7">TOTAL (ano)</p>
            <div className="flex-1" />
            <p className="text-2xl font-black w-[110px] text-right shrink-0" style={{ color: GOLD }}>{fmtK(BUDGET_TOTAL)}</p>
          </div>
        </div>

        <Card className="p-6 h-full flex flex-col justify-center gap-5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Investimento</p>
            <p className="text-3xl font-black" style={{ color: BLUE }}>{fmtK(BUDGET_TOTAL)}</p>
            <p className="text-[10px] text-slate-600">R$ 11 mil/mês</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nova receita esperada</p>
            <p className="text-3xl font-black" style={{ color: GREEN }}>{fmtK(GAP)}</p>
            <p className="text-[10px] text-slate-600">R$ 20 mil/mês</p>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-lg font-black leading-snug" style={{ color: GOLD }}>Esse investimento faz sentido?</p>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {fmtK(GAP)} é <strong className="text-slate-300">receita</strong>, não lucro.<br />
              CAC = {fmtK(BUDGET_TOTAL)} ÷ {CLIENTES} = <strong style={{ color: AMBER }}>{fmtBRL(CAC)}/cliente</strong>.<br />
              Com ticket de <strong className="text-slate-300">R$ 500</strong>, o CAC come{' '}
              <strong style={{ color: RED }}>55% da primeira venda</strong>.
            </p>
          </div>
        </Card>
      </div>
      <Premissa>
        Valores didáticos simplificados. Margem, LTV e recorrência <strong>não foram informados</strong> — e sem
        eles não é possível concluir se o investimento é bom. Se a margem for 30%, cada venda deixa R$ 150 e o
        CAC de R$ 275 nunca se paga na primeira compra.
      </Premissa>
    </Slide>
  );
}

// 23 — Três cenários
function S19() {
  const cenarios = [
    { nome: 'CONSERVADOR', receitaMes: 40_000, cor: '#94A3B8', pergunta: 'A que ponto ainda estou de pé?' },
    { nome: 'BASE', receitaMes: 50_000, cor: BLUE, pergunta: 'A hipótese central. Vai para o board.' },
    { nome: 'AGRESSIVO', receitaMes: 60_000, cor: GOLD, pergunta: 'O que preciso ter pronto ANTES?' },
  ];
  const linha = (rMes: number) => {
    const gap = (rMes - ALPHA.receitaAtualMes) * MESES;
    const cli = gap / ALPHA.ticket;
    const opp = cli / ALPHA.winRate;
    const lds = opp / ALPHA.leadParaOportunidade;
    return { gap, cli, opp, lds };
  };
  return (
    <Slide bg="dark">
      <TituloCentral sub="Empresa Alpha">Três cenários</TituloCentral>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center min-h-0">
        {cenarios.map((c, i) => {
          const d = linha(c.receitaMes);
          const destaque = c.nome === 'BASE';
          return (
            <motion.div key={c.nome} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.15 }} className="h-full">
              <div className="h-full rounded-2xl border p-5 flex flex-col" style={{ borderColor: destaque ? `${BLUE}66` : 'rgba(255,255,255,0.10)', background: destaque ? 'rgba(26,173,226,0.07)' : 'rgba(255,255,255,0.025)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: c.cor }}>{c.nome}</p>
                <p className="text-3xl font-black mt-1.5" style={{ color: c.cor }}>{fmtMes(c.receitaMes)}</p>
                <p className="text-[10px] text-slate-600">{fmtK(c.receitaMes * MESES)}/ano</p>
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5 text-[12px]">
                  <div className="flex justify-between"><span className="text-slate-500">Gap (ano)</span><span className="text-slate-200 font-bold">{fmtK(d.gap)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Clientes</span><span className="text-slate-200 font-bold">{fmtNum(d.cli)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Oportunidades</span><span className="text-slate-200 font-bold">{fmtNum(d.opp)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Leads</span><span className="text-slate-200 font-bold">{fmtNum(d.lds)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Budget</span><span className="font-bold" style={{ color: GOLD }}>{i === 1 ? fmtK(BUDGET_TOTAL) : '↕ recalcular'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Equipe</span><span className="font-bold" style={{ color: GOLD }}>{i === 0 ? '↓' : i === 1 ? '=' : '↑'}</span></div>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-4 pt-3 border-t border-white/10 leading-relaxed">{c.pergunta}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <Mensagem>Planejamento não é adivinhar um único futuro. É <strong style={{ color: BLUE }}>preparar-se para futuros possíveis</strong> — e definir os gatilhos antes do pânico.</Mensagem>
    </Slide>
  );
}

// 24 — Budget não é sentença
function S20() {
  return (
    <Slide bg="dark">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-[900px] grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <Card className="p-7 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">Budget</p>
            <p className="text-2xl font-black text-slate-100">O que planejamos</p>
            <p className="text-[11px] text-slate-600 mt-2">Novembro do ano passado</p>
          </Card>
          <p className="text-sm font-black uppercase tracking-widest text-slate-600 text-center py-2">versus</p>
          <Card className="p-7 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">Realidade</p>
            <p className="text-2xl font-black text-slate-100">O que está acontecendo</p>
            <p className="text-[11px] text-slate-600 mt-2">Agora</p>
          </Card>
        </div>

        <div className="flex flex-col items-center mt-2">
          <span className="text-[10px]" style={{ color: BLUE }}>▼</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 my-1">Entre os dois</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, ease: 'backOut' }}
          className="rounded-2xl border px-14 py-6 text-center"
          style={{ borderColor: `${BLUE}66`, background: 'rgba(26,173,226,0.08)' }}
        >
          <p className="text-4xl sm:text-6xl font-black tracking-tight" style={{ color: BLUE, textShadow: '0 0 60px rgba(26,173,226,0.35)' }}>FORECAST</p>
        </motion.div>
      </div>
      <Mensagem>Budget é uma <strong>foto</strong> tirada em novembro. A empresa é um <strong style={{ color: BLUE }}>filme</strong>.</Mensagem>
    </Slide>
  );
}

/* ═══════════════ BLOCO 4 — FORECAST E PIPELINE ═══════════════ */

// 25 — Budget × Forecast × Actual
function S21() {
  const cols = [
    { t: 'BUDGET', q: 'O que planejamos?', cor: '#94A3B8', freq: 'Feito 1x por ano', olhar: 'Olha para frente', nat: 'Compromisso' },
    { t: 'FORECAST', q: 'O que provavelmente acontecerá?', cor: BLUE, freq: 'Refeito toda semana/mês', olhar: 'Olha para frente', nat: 'Estimativa' },
    { t: 'ACTUAL', q: 'O que realmente aconteceu?', cor: GREEN, freq: 'Fechamento do período', olhar: 'Olha para trás', nat: 'Fato' },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="Bloco 4 · Forecast e pipeline">Três palavras que vivem confundidas</TituloCentral>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center min-h-0">
        {cols.map((c, i) => (
          <motion.div key={c.t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.15 }} className="h-full">
            <div className="h-full rounded-2xl border p-6 flex flex-col" style={{ borderColor: `${c.cor}33`, background: `${c.cor}0a` }}>
              <p className="text-2xl font-black" style={{ color: c.cor }}>{c.t}</p>
              <p className="text-[15px] font-semibold text-slate-200 mt-2 leading-snug">{c.q}</p>
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-[11px] text-slate-500">
                <p className="flex items-center gap-2"><RefreshCw className="w-3 h-3" /> {c.freq}</p>
                <p className="flex items-center gap-2"><Clock className="w-3 h-3" /> {c.olhar}</p>
                <p className="flex items-center gap-2"><Layers className="w-3 h-3" /> {c.nat}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <Mensagem>O budget <strong>define</strong> a expectativa. O forecast <strong style={{ color: BLUE }}>atualiza</strong> a expectativa. O actual <strong style={{ color: GREEN }}>valida</strong> os dois.</Mensagem>
    </Slide>
  );
}

// 26 — Planejamento sem atualização vira ficção
function S22() {
  const linha = [
    { mes: 'JANEIRO', ev: 'Budget aprovado: R$ 50 mil/mês', cor: BLUE },
    { mes: 'MARÇO', ev: 'O mercado mudou', cor: '#94A3B8' },
    { mes: 'JUNHO', ev: 'A conversão caiu', cor: AMBER },
    { mes: 'AGOSTO', ev: 'Grandes contratos atrasaram', cor: RED },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="O ano de uma empresa qualquer">Planejamento sem atualização vira ficção</Titulo>
      <div className="flex-1 flex items-center min-h-0">
        <div className="w-full relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#1AADE2] via-[#F59E0B] to-[#EF4444]" />
          {linha.map((l, i) => (
            <motion.div key={l.mes} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.22 }} className="relative pb-6 last:pb-0">
              <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: l.cor, background: NAVY }} />
              <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: l.cor }}>{l.mes}</p>
              <p className="text-xl font-bold text-slate-100 mt-0.5">{l.ev}</p>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-2 rounded-xl border-l-[3px] px-5 py-3.5" style={{ borderColor: RED, background: 'rgba(239,68,68,0.06)' }}>
            <p className="text-base font-semibold text-slate-100">
              Em agosto, continuar repetindo que a meta é R$ 50 mil/mês ajuda a tomar <strong style={{ color: RED }}>alguma decisão</strong>?
            </p>
          </motion.div>
        </div>
      </div>
      <Mensagem>O plano precisa ser <strong>estável</strong> o suficiente para orientar e <strong style={{ color: BLUE }}>flexível</strong> o suficiente para reagir.</Mensagem>
    </Slide>
  );
}

// 27 — O pipeline
function S23() {
  const etapas = [
    { e: 'Lead', w: 100 }, { e: 'Qualificado', w: 84 }, { e: 'Diagnóstico', w: 68 },
    { e: 'Proposta', w: 52 }, { e: 'Negociação', w: 36 }, { e: 'Fechado', w: 22 },
  ];
  return (
    <Slide bg="dark">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center min-h-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: BLUE }}>Execução</p>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight">O pipeline</h2>
          <p className="mt-6 text-[15px] text-slate-400 leading-relaxed">
            Cada etapa deve representar uma mudança de estado verificável do <strong className="text-slate-200">cliente</strong> —
            não uma tarefa do vendedor.
          </p>
          <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">
            “Proposta enviada” é atividade. “Proposta em análise pelo decisor” é estado.
          </p>
          <div className="mt-7 rounded-xl border-l-[3px] px-5 py-4" style={{ borderColor: BLUE, background: 'rgba(26,173,226,0.06)' }}>
            <p className="text-base font-semibold text-slate-100 leading-snug">
              Pipeline não é uma lista de negócios.<br />
              É a representação das <strong style={{ color: BLUE }}>possibilidades futuras de receita</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {etapas.map((x, i) => (
            <motion.div
              key={x.e}
              initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.15 + i * 0.13 }}
              className="rounded-lg py-3 flex items-center justify-center border"
              style={{
                width: `${x.w}%`, minWidth: 150,
                borderColor: i === 5 ? `${GREEN}55` : 'rgba(26,173,226,0.28)',
                background: i === 5 ? 'rgba(16,185,129,0.10)' : `rgba(26,173,226,${0.04 + i * 0.015})`,
              }}
            >
              <span className="text-sm font-bold" style={{ color: i === 5 ? GREEN : '#E2E8F0' }}>{x.e}</span>
            </motion.div>
          ))}
          <p className="text-[10px] text-slate-600 italic mt-3 text-center">
            Exemplo de venda consultiva B2B. As etapas variam conforme o modelo de negócio.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 28 — Pipeline não é forecast
function S24() {
  const deals = [
    { c: 'Cliente A', valor: 5_000, prob: 0.8 },
    { c: 'Cliente B', valor: 10_000, prob: 0.5 },
    { c: 'Cliente C', valor: 15_000, prob: 0.2 },
  ];
  const totalPipe = deals.reduce((s, d) => s + d.valor, 0);
  const totalFcst = deals.reduce((s, d) => s + d.valor * d.prob, 0);
  return (
    <Slide bg="dark">
      <Titulo sub="A distinção mais importante do bloco">Pipeline não é forecast</Titulo>
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-2.5 bg-white/[0.04] text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Oportunidade</span><span className="text-right">Valor</span><span className="text-right">Probabilidade</span><span className="text-right">Valor ponderado</span>
          </div>
          {deals.map((d, i) => (
            <motion.div key={d.c} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.18 }} className="grid grid-cols-4 px-5 py-3.5 border-t border-white/[0.06] items-center">
              <span className="text-[15px] font-semibold text-slate-200">{d.c}</span>
              <span className="text-[15px] text-right text-slate-300">{fmtK(d.valor)}</span>
              <span className="text-[15px] text-right font-bold" style={{ color: d.prob >= 0.5 ? GREEN : AMBER }}>{d.prob * 100}%</span>
              <span className="text-[15px] text-right font-black" style={{ color: BLUE }}>{fmtK(d.valor * d.prob)}</span>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <Card className="px-6 py-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline total</p>
            <p className="text-4xl font-black mt-1.5 text-slate-200">{fmtK(totalPipe)}</p>
            <p className="text-[10px] text-slate-600 mt-1">potencial</p>
          </Card>
          <Card className="px-6 py-5 text-center" style={{ borderColor: `${BLUE}55`, background: 'rgba(26,173,226,0.07)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: BLUE }}>Forecast ponderado</p>
            <p className="text-4xl font-black mt-1.5" style={{ color: BLUE }}>{fmtK(totalFcst)}</p>
            <p className="text-[10px] text-slate-600 mt-1">provável</p>
          </Card>
        </div>
      </div>
      <Mensagem cor={GOLD}>Quanto você <strong style={{ color: GOLD }}>realmente</strong> espera vender: R$ 30 mil ou R$ 12 mil?</Mensagem>
      <Premissa>
        São contratos/pacotes maiores que o ticket médio de R$ 500 — a Alpha vende para grupos e empresas
        também. Nenhum deles fechará por R$ 12 mil: cada um fecha 100% ou 0%. O ponderado é uma média de
        portfólio, só faz sentido com volume. Com 3 negócios é quase inútil; com os 1.920 do ano, é razoável.
      </Premissa>
    </Slide>
  );
}

// 29 — A fórmula do forecast ponderado
function S25() {
  const origens = [
    { t: 'Arbitrária', d: 'Alguém definiu quando configurou o CRM, há três anos.', v: 'A mais comum. A pior.', cor: RED },
    { t: 'Histórica', d: 'Dos deals que chegaram nesta etapa nos últimos 12 meses, quantos fecharam?', v: 'Defensável.', cor: GREEN },
    { t: 'Julgamento do vendedor', d: 'O que o vendedor acha que vai acontecer.', v: 'Bom sinal qualitativo. Péssimo número.', cor: AMBER },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="Modelo didático">A fórmula do forecast ponderado</Titulo>
      <div className="shrink-0 rounded-2xl border px-6 py-5 mb-5" style={{ borderColor: `${BLUE}44`, background: 'rgba(26,173,226,0.06)' }}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
          <span className="text-lg sm:text-2xl font-black text-slate-100">VALOR DA OPORTUNIDADE</span>
          <span className="text-xl font-thin text-slate-500">×</span>
          <span className="text-lg sm:text-2xl font-black text-slate-100">PROBABILIDADE DE FECHAMENTO</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 mt-3 pt-3 border-t border-white/10 text-center">
          <span className="text-base font-mono text-slate-400">R$ 10.000 × 50% =</span>
          <span className="text-2xl font-black" style={{ color: BLUE }}>R$ 5.000</span>
          <span className="text-[11px] text-slate-600 w-full mt-1.5">Forecast = soma de todos os valores ponderados</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-base font-black" style={{ color: GOLD }}>Quem definiu que uma oportunidade nessa etapa tem 50% de chance de fechar?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {origens.map((o, i) => (
            <motion.div key={o.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.14 }}>
              <Card className="p-4 h-full" style={{ borderColor: `${o.cor}33` }}>
                <p className="text-sm font-black" style={{ color: o.cor }}>{o.t}</p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{o.d}</p>
                <p className="text-[11px] font-bold mt-2.5 pt-2.5 border-t border-white/10" style={{ color: o.cor }}>{o.v}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      <Premissa>
        Probabilidade de etapa não é verdade absoluta — é hipótese a ser calibrada contra o actual.
        Empresas maduras combinam ponderado + julgamento do gestor + modelo histórico, e investigam onde divergem.
      </Premissa>
    </Slide>
  );
}

// 30 — Pipeline coverage
function S26() {
  return (
    <Slide bg="dark">
      <Titulo sub="Você tem munição suficiente?">Pipeline coverage</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-center min-h-0">
        <div className="space-y-3">
          <Card className="px-5 py-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Meta do trimestre</span>
            <span className="text-2xl font-black text-slate-200">R$ 100 mil</span>
          </Card>
          <Card className="px-5 py-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline</span>
            <span className="text-2xl font-black text-slate-200">R$ 300 mil</span>
          </Card>
          <Card className="px-5 py-4 flex items-center justify-between" style={{ borderColor: `${AMBER}44`, background: 'rgba(245,158,11,0.06)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: AMBER }}>Coverage</span>
            <span className="text-3xl font-black" style={{ color: AMBER }}>3x</span>
          </Card>
          <div className="rounded-xl border border-dashed px-5 py-4 text-center" style={{ borderColor: `${GOLD}44` }}>
            <p className="text-lg font-black" style={{ color: GOLD }}>Isso é suficiente?</p>
            <p className="text-[12px] text-slate-400 mt-1">Depende da sua taxa histórica de conversão.</p>
          </div>
        </div>

        <div>
          <Card className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Se o win rate é 25%</p>
            <div className="space-y-2.5 font-mono text-[15px]">
              <p className="text-slate-300">R$ 100 mil ÷ 25% = <strong style={{ color: BLUE }}>R$ 400 mil</strong></p>
              <p className="text-[11px] text-slate-600 font-sans">de pipeline necessário</p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Coverage necessário</p>
                <p className="text-4xl font-black" style={{ color: BLUE }}>4x</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Situação real</p>
                <p className="text-xl font-black" style={{ color: RED }}>Faltam R$ 100 mil</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 mt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5">A regra</p>
            <p className="text-lg font-black mb-3" style={{ color: GOLD }}>Coverage necessário = 1 ÷ win rate</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['25%', '4x'], ['33%', '3x'], ['50%', '2x']].map(([wr, cv]) => (
                <div key={wr} className="rounded-lg bg-white/[0.04] py-2">
                  <p className="text-[10px] text-slate-500">win {wr}</p>
                  <p className="text-base font-black text-slate-200">{cv}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Mensagem>A cobertura ideal depende da <strong style={{ color: BLUE }}>eficiência da máquina comercial</strong> — na Alpha, {fmtK(GAP)} ÷ 25% = <strong style={{ color: GOLD }}>{fmtK(PIPELINE_NECESSARIO)} de pipeline no ano</strong>.</Mensagem>
    </Slide>
  );
}

// 31 — Sinais de saúde do pipeline
function S27() {
  const kpis = [
    { l: 'Pipeline total', v: fmtK(PIPELINE_NECESSARIO), s: 'volume absoluto', c: '#94A3B8' },
    { l: 'Pipeline coverage', v: '4,0x', s: 'volume vs. meta', c: BLUE },
    { l: 'Win rate', v: '25%', s: 'eficiência', c: GREEN },
    { l: 'Ticket médio', v: 'R$ 500', s: 'valor por venda', c: BLUE },
    { l: 'Ciclo de vendas', v: '? dias', s: 'velocidade', c: '#64748B' },
    { l: 'Aging', v: '? dias parado', s: 'deal morto infla o forecast', c: AMBER },
    { l: 'Conversão por estágio', v: 'onde vaza', s: 'o mais acionável', c: GREEN },
    { l: 'Velocidade do pipeline', v: 'R$/dia', s: '(opp × ticket × win) ÷ ciclo', c: GOLD },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="Gerenciar por dado, não por opinião">Os sinais de saúde do pipeline</Titulo>
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 content-center">
        {kpis.map((k, i) => (
          <motion.div key={k.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.07 }}>
            <Card className="px-4 py-4 h-full">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{k.l}</p>
              <p className="text-xl font-black mt-1.5" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[10px] text-slate-600 mt-1 leading-snug">{k.s}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      <Mensagem>Não basta saber <strong>quanto existe</strong> no pipeline. Precisamos saber a <strong style={{ color: BLUE }}>qualidade</strong> desse pipeline.</Mensagem>
    </Slide>
  );
}

// 32 — Forecast é ferramenta de decisão
function S28() {
  const sits = [
    { t: 'ACIMA DA META', cor: GREEN, icon: TrendingUp, qs: ['Acelerar?', 'Investir?', 'Antecipar capacidade?', 'Ou o forecast está inflado?'] },
    { t: 'NA META', cor: BLUE, icon: Target, qs: ['Como proteger a execução?', 'Quais 3 deals derrubam o trimestre se caírem?', 'O que os blinda?'] },
    { t: 'ABAIXO DA META', cor: RED, icon: AlertTriangle, qs: ['O que corrigir AGORA?', 'Dá tempo, dado o ciclo?', 'Acelerar pipeline, ticket ou custo?'] },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="Para que serve, afinal">Forecast é ferramenta de decisão</TituloCentral>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center min-h-0">
        {sits.map((s, i) => (
          <motion.div key={s.t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.15 }} className="h-full">
            <div className="h-full rounded-2xl border p-5 flex flex-col" style={{ borderColor: `${s.cor}33`, background: `${s.cor}0a` }}>
              <s.icon className="w-6 h-6 mb-3" style={{ color: s.cor }} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Forecast</p>
              <p className="text-lg font-black" style={{ color: s.cor }}>{s.t}</p>
              <ul className="mt-4 pt-4 border-t border-white/10 space-y-2 flex-1">
                {s.qs.map((q) => (
                  <li key={q} className="text-[12px] text-slate-300 flex gap-2 leading-relaxed"><span style={{ color: s.cor }}>·</span>{q}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
      <Mensagem cor={GOLD}>
        O valor do forecast não está em acertar o futuro perfeitamente.<br />
        Está em <strong style={{ color: GOLD }}>permitir decisões antes que seja tarde</strong>.
      </Mensagem>
    </Slide>
  );
}

/* ═══════════════ BLOCO 5 — REVENUE OPERATIONS ═══════════════ */

// 33 — O problema dos silos
function S29() {
  const areas = [
    { a: 'MARKETING', m: 'MQLs', cor: BLUE },
    { a: 'VENDAS', m: 'Contratos', cor: GOLD },
    { a: 'CUSTOMER SUCCESS', m: 'Retenção', cor: GREEN },
    { a: 'FINANCEIRO', m: 'Receita', cor: AMBER },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="Bloco 5 · Revenue Operations">O problema dos silos</Titulo>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-6">
          {areas.map((x, i) => (
            <motion.div key={x.a} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.13 }}>
              <div className="rounded-2xl border-2 border-dashed p-6 text-center" style={{ borderColor: `${x.cor}44`, background: `${x.cor}08` }}>
                <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: x.cor }}>{x.a}</p>
                <p className="text-2xl font-black text-slate-100 mt-3">{x.m}</p>
                <p className="text-[10px] text-slate-600 mt-3">sistema próprio · métrica própria</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-[11px] text-slate-600 italic mt-6">
          Quatro caixas. Nenhuma linha ligando uma à outra. Não é falta de boa vontade — é arquitetura.
        </motion.p>
      </div>
      <Mensagem cor={RED}>
        Todos trabalham pela receita. Mas frequentemente trabalham com <strong style={{ color: RED }}>versões diferentes da realidade</strong>.
      </Mensagem>
    </Slide>
  );
}

// 34 — O que é Revenue Operations?
function S30() {
  const orbita = [
    { a: 'Marketing', cor: BLUE }, { a: 'Vendas', cor: GOLD },
    { a: 'Customer Success', cor: GREEN }, { a: 'Financeiro', cor: AMBER },
  ];
  const base = [
    { b: 'Dados', d: 'uma fonte da verdade', icon: Database },
    { b: 'Processos', d: 'definições comuns', icon: Settings2 },
    { b: 'Tecnologia', d: 'sistemas integrados', icon: Cpu },
    { b: 'Métricas', d: 'indicadores compartilhados', icon: BarChart3 },
    { b: 'Governança', d: 'cadência e dono da decisão', icon: ShieldCheck },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral>O que é Revenue Operations?</TituloCentral>
      <div className="flex-1 flex flex-col justify-center gap-5 min-h-0">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {orbita.slice(0, 2).map((o) => (
            <span key={o.a} className="px-4 py-2 rounded-full text-[12px] font-bold border" style={{ borderColor: `${o.cor}44`, color: o.cor, background: `${o.cor}0d` }}>{o.a}</span>
          ))}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, ease: 'backOut' }}
            className="mx-2 px-10 py-5 rounded-2xl border-2 text-center"
            style={{ borderColor: BLUE, background: 'rgba(26,173,226,0.10)' }}
          >
            <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: BLUE, textShadow: '0 0 45px rgba(26,173,226,0.4)' }}>RECEITA</p>
          </motion.div>
          {orbita.slice(2).map((o) => (
            <span key={o.a} className="px-4 py-2 rounded-full text-[12px] font-bold border" style={{ borderColor: `${o.cor}44`, color: o.cor, background: `${o.cor}0d` }}>{o.a}</span>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {base.map((b, i) => (
            <motion.div key={b.b} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.09 }}>
              <Card className="px-3 py-3.5 h-full text-center">
                <b.icon className="w-4 h-4 mx-auto mb-2" style={{ color: GOLD }} />
                <p className="text-[12px] font-bold text-slate-100">{b.b}</p>
                <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">{b.d}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border-l-[3px] px-5 py-4" style={{ borderColor: BLUE, background: 'rgba(26,173,226,0.06)' }}>
          <p className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
            RevOps integra <strong style={{ color: BLUE }}>pessoas, processos, dados e tecnologia</strong> para aumentar a
            eficiência e a previsibilidade da receita.
          </p>
        </div>
      </div>
      <Premissa>
        RevOps pode ser um time — mas antes disso é um <strong>modelo operacional</strong> e uma filosofia de gestão
        integrada. Não é CRM, não é software, não é só um departamento novo no organograma.
      </Premissa>
    </Slide>
  );
}

// 35 — A jornada da receita
function S31() {
  const jornada = [
    { e: 'AQUISIÇÃO', cor: BLUE }, { e: 'CONVERSÃO', cor: BLUE },
    { e: 'FECHAMENTO', cor: GOLD }, { e: 'RETENÇÃO', cor: GREEN }, { e: 'EXPANSÃO', cor: GREEN },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral>A jornada da receita</TituloCentral>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="w-full flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
          {jornada.map((j, i) => (
            <motion.div key={j.e} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.16 }} className="flex items-center gap-1.5 sm:gap-3">
              <div className="px-4 sm:px-6 py-4 rounded-xl border text-center" style={{ borderColor: `${j.cor}44`, background: `${j.cor}0d` }}>
                <p className="text-[11px] sm:text-sm font-black tracking-wide" style={{ color: j.cor }}>{j.e}</p>
              </div>
              {i < jornada.length - 1 && <span className="text-slate-600 text-sm">→</span>}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 w-full max-w-[720px]">
          <div className="rounded-xl border border-dashed px-6 py-4 text-center" style={{ borderColor: `${GOLD}44` }}>
            <p className="text-[12px] leading-relaxed text-slate-400">
              A assinatura do contrato é o <strong className="text-slate-200">meio</strong> da jornada, não o fim.
              Retenção e expansão são os motores 2 e 3 do slide 12 — agora como etapas operacionais.
            </p>
          </div>
        </motion.div>
      </div>
      <Mensagem>Uma jornada. Uma base de dados. <strong style={{ color: BLUE }}>Uma visão da receita.</strong></Mensagem>
    </Slide>
  );
}

// 36 — O ciclo de gestão da receita
function S32() {
  const etapas = [
    { e: 'PLANEJAR', d: 'diagnóstico + meta + funil reverso', cor: BLUE },
    { e: 'ORÇAR', d: 'budget', cor: BLUE },
    { e: 'EXECUTAR', d: 'pipeline', cor: GOLD },
    { e: 'MEDIR', d: 'actual + indicadores', cor: GOLD },
    { e: 'PREVER', d: 'forecast', cor: GREEN },
    { e: 'AJUSTAR', d: 'decisão', cor: GREEN },
  ];
  return (
    <Slide bg="dark">
      <TituloCentral sub="O framework que resume a aula">O ciclo de gestão da receita</TituloCentral>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="relative w-full max-w-[820px]">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {etapas.map((x, i) => (
              <motion.div key={x.e} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 + i * 0.13 }} className="h-full">
                <div className="h-full rounded-xl border p-4 text-center flex flex-col justify-center" style={{ borderColor: `${x.cor}40`, background: `${x.cor}0d` }}>
                  <p className="text-[9px] font-black" style={{ color: `${x.cor}88` }}>{String(i + 1).padStart(2, '0')}</p>
                  <p className="text-[13px] font-black mt-1" style={{ color: x.cor }}>{x.e}</p>
                  <p className="text-[9px] text-slate-600 mt-1.5 leading-snug">{x.d}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}66)` }} />
            <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              <RefreshCw className="w-3.5 h-3.5" /> e volta ao início
            </span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${GOLD}66, transparent)` }} />
          </motion.div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[['Semanal', 'pipeline'], ['Mensal', 'forecast'], ['Trimestral', 'budget'], ['Anual', 'plano']].map(([f, o]) => (
              <div key={f} className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-2.5">
                <p className="text-[11px] font-black text-slate-200">{f}</p>
                <p className="text-[9px] text-slate-600">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Mensagem>Previsibilidade não é um número. É um <strong style={{ color: BLUE }}>processo contínuo de gestão</strong>.</Mensagem>
    </Slide>
  );
}

/* ═══════════════════ BLOCO 6 — FECHAMENTO ═══════════════════ */

// 37 — O desafio final
function S33() {
  const perguntas = [
    'Quantos clientes precisa conquistar?',
    'Quantas oportunidades precisa gerar?',
    'Quantos leads serão necessários?',
    'Qual pipeline será necessário?',
    'Qual investimento será necessário?',
    'Como acompanhará o resultado?',
    'Quando deverá revisar o forecast?',
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 flex items-center gap-3 mb-5">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: `${GOLD}1a`, color: GOLD }}>Desafio final</span>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">EMPRESA ALPHA</h2>
      </div>

      <div className="shrink-0 flex items-center justify-center gap-6 sm:gap-10 mb-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Hoje</p>
          <p className="text-3xl sm:text-4xl font-black text-slate-300">R$ 30 mil/mês</p>
        </div>
        <span className="text-2xl" style={{ color: BLUE }}>→</span>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: BLUE }}>Meta</p>
          <p className="text-3xl sm:text-4xl font-black" style={{ color: BLUE }}>R$ 50 mil/mês</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-center min-h-0">
        {perguntas.map((p, i) => (
          <motion.div key={p} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.09 }}>
            <Card className="px-4 py-3.5 h-full flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'rgba(26,173,226,0.15)', color: BLUE }}>{i + 1}</span>
              <p className="text-[14px] text-slate-200">{p}</p>
            </Card>
          </motion.div>
        ))}
        <div className="rounded-2xl border border-dashed flex items-center justify-center px-4 py-3.5" style={{ borderColor: `${GOLD}44` }}>
          <p className="text-[12px] text-center leading-relaxed" style={{ color: GOLD }}>
            5 a 7 minutos em grupos.<br />Usem só o que viram hoje.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 38 — A grande síntese
function S34() {
  const cadeia = [
    { e: 'META', d: 'a ambição vira número' },
    { e: 'PLANO', d: 'o número vira operação' },
    { e: 'BUDGET', d: 'a operação vira recurso' },
    { e: 'PIPELINE', d: 'o recurso vira execução' },
    { e: 'FORECAST', d: 'a execução vira previsão' },
    { e: 'DECISÃO', d: 'a previsão vira ação' },
  ];
  return (
    <Slide bg="dark">
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="relative w-full max-w-[760px]">
          <div className="absolute -inset-x-3 -inset-y-4 sm:-inset-x-8 rounded-[28px] border-2 border-dashed pointer-events-none" style={{ borderColor: `${GOLD}55` }} />
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] rounded-full z-10" style={{ background: NAVY, color: GOLD }}>
            Revenue Operations
          </span>
          <div className="relative flex flex-col items-center py-3">
            {cadeia.map((c, i) => (
              <div key={c.e} className="w-full flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.14 }}
                  className="w-full max-w-[440px] rounded-xl px-6 py-3 flex items-center justify-between border"
                  style={{ borderColor: `${BLUE}44`, background: `rgba(26,173,226,${0.04 + i * 0.012})` }}
                >
                  <span className="text-lg font-black tracking-wide" style={{ color: BLUE }}>{c.e}</span>
                  <span className="text-[10px] text-slate-500">{c.d}</span>
                </motion.div>
                {i < cadeia.length - 1 && <Seta />}
              </div>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }} className="mt-9 text-center max-w-[780px]">
          <p className="text-lg sm:text-2xl font-bold leading-snug text-slate-100">
            Empresas previsíveis não são aquelas que <span className="text-slate-500">acertam o futuro</span>.
          </p>
          <p className="text-lg sm:text-2xl font-bold leading-snug mt-2" style={{ color: BLUE }}>
            São aquelas que percebem as mudanças cedo o suficiente para agir.
          </p>
        </motion.div>
      </div>
    </Slide>
  );
}

/* ════════════════════════ SHELL ════════════════════════ */

const SLIDES = [
  { id: 's01-capa', titulo: 'Capa', bloco: 'O problema', node: <S01 /> },
  { id: 's02-glossario', titulo: 'Glossário', bloco: 'O problema', node: <SGlossario /> },
  { id: 's03-pergunta', titulo: 'A pergunta central', bloco: 'O problema', node: <S02 /> },
  { id: 's04-meta-nao-e-plano', titulo: 'Meta não é plano', bloco: 'O problema', node: <S03 /> },
  { id: 's05-imprevisibilidade', titulo: 'A imprevisibilidade', bloco: 'O problema', node: <S04 /> },
  { id: 's06-sistema-receita', titulo: 'O sistema da receita', bloco: 'O problema', node: <S05 /> },
  { id: 's07-diagnostico', titulo: 'A estratégia', bloco: 'Planejamento', node: <S06 /> },
  { id: 's08-ferramentas', titulo: 'Ferramentas', bloco: 'Planejamento', node: <S07 /> },
  { id: 's09-tobe-asis', titulo: 'To be / As is', bloco: 'Planejamento', node: <S08A /> },
  { id: 's10-swot', titulo: 'SWOT', bloco: 'Planejamento', node: <S08B /> },
  { id: 's11-motivadores', titulo: 'Motivadores estratégicos', bloco: 'Planejamento', node: <S08C /> },
  { id: 's12-motores', titulo: 'Os 4 motores', bloco: 'Planejamento', node: <S08 /> },
  { id: 's13-alpha', titulo: 'Caso Empresa Alpha', bloco: 'Planejamento', node: <S09 /> },
  { id: 's14-comecando-pelo-fim', titulo: 'Começando pelo fim', bloco: 'Planejamento', node: <S10 /> },
  { id: 's15-funil-reverso', titulo: 'O funil reverso', bloco: 'Planejamento', node: <S11 /> },
  { id: 's16-realidade', titulo: 'A realidade', bloco: 'Planejamento', node: <S12 /> },
  { id: 's17-topdown-bottomup', titulo: 'Top-down × Bottom-up', bloco: 'Planejamento', node: <S13 /> },
  { id: 's18-plano-comercial', titulo: 'O plano comercial', bloco: 'Planejamento', node: <S14 /> },
  { id: 's19-transicao-budget', titulo: 'Quanto custa?', bloco: 'Budget', node: <S15 /> },
  { id: 's20-o-que-e-budget', titulo: 'O que é budget?', bloco: 'Budget', node: <S16 /> },
  { id: 's21-o-que-entra', titulo: 'O que entra no budget', bloco: 'Budget', node: <S17 /> },
  { id: 's22-budget-alpha', titulo: 'Budget da Alpha', bloco: 'Budget', node: <S18 /> },
  { id: 's23-cenarios', titulo: 'Três cenários', bloco: 'Budget', node: <S19 /> },
  { id: 's24-budget-nao-e-sentenca', titulo: 'Budget não é sentença', bloco: 'Budget', node: <S20 /> },
  { id: 's25-budget-forecast-actual', titulo: 'Budget × Forecast × Actual', bloco: 'Forecast', node: <S21 /> },
  { id: 's26-plano-desatualizado', titulo: 'Sem atualização vira ficção', bloco: 'Forecast', node: <S22 /> },
  { id: 's27-pipeline', titulo: 'O pipeline', bloco: 'Forecast', node: <S23 /> },
  { id: 's28-pipeline-nao-e-forecast', titulo: 'Pipeline não é forecast', bloco: 'Forecast', node: <S24 /> },
  { id: 's29-formula-forecast', titulo: 'A fórmula do ponderado', bloco: 'Forecast', node: <S25 /> },
  { id: 's30-coverage', titulo: 'Pipeline coverage', bloco: 'Forecast', node: <S26 /> },
  { id: 's31-saude-pipeline', titulo: 'Saúde do pipeline', bloco: 'Forecast', node: <S27 /> },
  { id: 's32-forecast-decisao', titulo: 'Forecast é decisão', bloco: 'Forecast', node: <S28 /> },
  { id: 's33-silos', titulo: 'O problema dos silos', bloco: 'RevOps', node: <S29 /> },
  { id: 's34-revops', titulo: 'O que é RevOps?', bloco: 'RevOps', node: <S30 /> },
  { id: 's35-jornada-receita', titulo: 'A jornada da receita', bloco: 'RevOps', node: <S31 /> },
  { id: 's36-ciclo-gestao', titulo: 'O ciclo de gestão', bloco: 'RevOps', node: <S32 /> },
  { id: 's37-desafio-final', titulo: 'O desafio final', bloco: 'Fechamento', node: <S33 /> },
  { id: 's38-sintese', titulo: 'A grande síntese', bloco: 'Fechamento', node: <S34 /> },
];

export default function AulaDeck({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const go = useCallback((to: number) => {
    setIdx((cur) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, to));
      setDir(next >= cur ? 1 : -1);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, go, onClose]);

  const atual = SLIDES[idx];

  return (
    <div className="deck-dark fixed inset-0 z-[70] overflow-hidden flex flex-col" style={{ backgroundColor: NAVY }}>
      {/* topo */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/10 shrink-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Presentation className="w-4 h-4" style={{ color: BLUE }} />
          Planejamento Comercial, Budget e Forecast
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-[11px] font-normal text-slate-500">{atual.bloco}</span>
        </span>
        <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors">
          <XIcon className="w-4 h-4" /> Fechar
        </button>
      </div>

      {/* slide */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={atual.id} custom={dir}
            initial={{ opacity: 0, x: dir * 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {atual.node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* navegação */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-3 border-t border-white/10 shrink-0">
        <button onClick={() => go(idx - 1)} disabled={idx === 0} className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} title={`${i + 1}. ${s.titulo}`} className={`h-2 rounded-full transition-all shrink-0 ${i === idx ? 'w-6' : 'w-2'}`} style={{ background: i === idx ? BLUE : 'rgba(255,255,255,0.2)' }} aria-label={`Slide ${i + 1}: ${s.titulo}`} />
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">{idx + 1}/{SLIDES.length}</span>
          <button onClick={() => go(idx + 1)} disabled={idx === SLIDES.length - 1} className="flex items-center gap-1.5 text-sm font-bold text-white rounded-lg px-3.5 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: `linear-gradient(to bottom right, ${BLUE}, #0c6e9e)` }}>
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
