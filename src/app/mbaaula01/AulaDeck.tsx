'use client';

/**
 * Aula — Planejamento Comercial, Budget e Forecast (35 slides, ~2h).
 * Mesma estrutura de navegação do Pitch Deck de Captação (/pitch): shell fixo,
 * setas do teclado, dots de navegação, animação de transição.
 *
 * NÚMEROS: o caso "Empresa Alpha" é didático. Todas as premissas estão em ALPHA
 * e os cálculos derivam delas — não há número mágico solto nos slides.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X as XIcon, ChevronLeft, ChevronRight, Presentation,
  Target, Map, Users, RefreshCw, TrendingUp, DollarSign, Megaphone,
  Cpu, Plane, GraduationCap, Handshake, AlertTriangle, HelpCircle,
  Gauge as GaugeIcon, Clock, Layers, Database, Settings2, BarChart3, ShieldCheck, CheckCheck, LayoutGrid, Download, Home,
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

/**
 * Selo da Magna, no rodapé. Vai na capa e no primeiro slide de cada bloco.
 *
 * Fica DENTRO do slide (e não na moldura do deck) de propósito: o PDF é montado
 * a partir dos slides, então um selo na moldura não sairia no arquivo.
 *
 * O arquivo é JPEG de marca escura sobre fundo claro — deixar o fundo
 * transparente sumiria com ela no navy. Daí o selo claro e arredondado.
 */
function SeloMagna() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="absolute bottom-6 right-7 z-20"
    >
      <img src="/logos/magna.jpg" alt="Magna" className="h-10 w-auto rounded-md opacity-90" />
    </motion.div>
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

      <SeloMagna />
    </div>
  );
}

/** Carta virada: mostra a categoria e vira no clique, revelando os termos. */
function CartaGlossario({ grupo, delay }: { grupo: GrupoGlossario; delay: number }) {
  const [aberta, setAberta] = useState(false);
  const [captura, setCaptura] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const { cat, cor, icon: Icone, termos } = grupo;

  /**
   * No PDF a carta sai ABERTA e sem giro. O html2canvas não entende transform 3D:
   * ele desenha as duas faces e a de trás (rotateY 180°) aparece espelhada.
   * Dentro de #deck-capture, então, mostramos só a frente — mesma saída que o
   * /pitch usa nos cards dele.
   */
  useEffect(() => {
    if (raiz.current?.closest('#deck-capture')) setCaptura(true);
  }, []);

  // no PDF: nada de perspectiva, nada de flip, só a lista de termos
  if (captura) {
    return (
      <div ref={raiz} className="h-full min-h-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 h-full flex flex-col">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] pb-3 mb-3 border-b border-white/10" style={{ color: cor }}>
            {cat}
          </p>
          <ul className="space-y-3.5">
            {termos.map(([t, d]) => (
              <li key={t}>
                <p className="text-[14px] font-black leading-tight" style={{ color: cor }}>{t}</p>
                <p className="text-[12px] text-slate-400 leading-snug mt-1">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={raiz}
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

// 3 — A pergunta central
// A votação ao vivo (link do celular + painel de votos) foi removida a pedido
// do Diogo. A rota /votar-mba01 e a API continuam de pé, então dá para trazer
// o quiz de volta sem refazer nada.
function S02() {
  return (
    <Slide bg="dark">
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <motion.div initial={{ height: 0 }} animate={{ height: 56 }} transition={{ duration: 0.6 }} className="w-[3px] mb-7" style={{ background: `linear-gradient(180deg, ${BLUE}, transparent)` }} />
        <h1 className="text-2xl sm:text-[3.2rem] font-black leading-[1.15] tracking-tight">
          Sua empresa tem uma<br />meta de vendas.
        </h1>
        <h1 className="mt-6 max-w-[22ch] text-2xl sm:text-[3.2rem] font-black leading-[1.15] tracking-tight" style={{ color: BLUE }}>
          Mas existe um plano capaz de explicar como ela será atingida?
        </h1>
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

    </Slide>
  );
}

/* ═════════════════════ 6 — O ICEBERG ═════════════════════
 * Vem logo depois da reunião de resultados: todo mundo cobra a ponta, ninguém
 * olha a massa. Acima da linha d'água, o que a empresa mostra. Abaixo, tudo o
 * que esta aula ensina — e que é o que sustenta a ponta.
 *
 * Desenho em SVG puro (sem imagem): escala em qualquer projetor sem borrar.
 * Os rótulos vivem DENTRO do SVG para nunca desalinharem do desenho.
 */

/** Etiqueta arredondada desenhada no SVG. */
function ChipSVG({ x, y, texto, cor, delay, tamanho = 11 }: {
  x: number; y: number; texto: string; cor: string; delay: number; tamanho?: number;
}) {
  const w = texto.length * tamanho * 0.58 + 22;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: 'backOut' }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11}
        fill={`${cor}26`} stroke={`${cor}77`} strokeWidth={1} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={tamanho} fontWeight={800}
        fill={cor} letterSpacing={0.2}>{texto}</text>
    </motion.g>
  );
}

function SIceberg() {
  // o que a empresa mostra
  const acima = [
    { t: 'Faturamento alto', x: 205, y: 62 },
    { t: 'Metas batidas', x: 190, y: 104 },
    { t: 'Empresa crescendo', x: 215, y: 146 },
    { t: 'Resultado financeiro', x: 800, y: 62 },
    { t: 'Clientes satisfeitos', x: 812, y: 104 },
    { t: 'Time engajado', x: 790, y: 146 },
  ];
  // o que sustenta — é a ementa da aula
  const abaixo = [
    { t: 'Planejamento', x: 430, y: 258 },
    { t: 'Plano estratégico', x: 610, y: 258 },
    { t: 'Mapa de objetivos', x: 385, y: 300 },
    { t: 'Sub-objetivos', x: 570, y: 300 },
    { t: 'Iniciativas', x: 350, y: 342 },
    { t: 'Ações', x: 480, y: 342 },
    { t: 'Métricas', x: 610, y: 342 },
    { t: 'Indicadores', x: 370, y: 384 },
    { t: 'Monitoramento', x: 545, y: 384 },
    { t: 'Números', x: 675, y: 384 },
    { t: 'Fluxo de atividades', x: 400, y: 426 },
    { t: 'Budget', x: 580, y: 426 },
    { t: 'Forecast', x: 662, y: 426 },
    { t: 'Pipeline', x: 390, y: 468 },
    { t: 'Cadência', x: 500, y: 468 },
    { t: 'Dados', x: 610, y: 468 },
    { t: 'Processo', x: 440, y: 510 },
    { t: 'Disciplina', x: 570, y: 510 },
  ];
  const MAR = 200;

  return (
    <Slide bg="dark">
      <div className="shrink-0 mb-1">
        <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: BLUE }}>Todo mundo cobra a ponta</p>
      </div>

      <div className="flex-1 min-h-0">
        <svg viewBox="0 0 1000 620" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* o gelo é chapado, em facetas — os degradês saíram junto com o
                desenho antigo para o traço bater com public/iceberg.jpg */}
            <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1AADE2" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#04101F" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* ── água ── */}
          <rect x="0" y={MAR} width="1000" height={620 - MAR} fill="url(#agua)" />

          {/* ── avião cruzando o céu ── */}
          <motion.g
            initial={{ x: -120 }}
            animate={{ x: 1120 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear', delay: 1 }}
          >
            <path d="M0 30 L18 26 L26 18 L30 26 L46 24 L30 32 L26 42 L18 32 Z"
              fill="#8FA9BD" opacity="0.5" />
          </motion.g>

          {/* ── iceberg: massa submersa — facetas planas, no traço de public/iceberg.jpg ── */}
          <motion.g
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 1.1, ease: 'easeOut' }}
          >
            {/* silhueta */}
            <path d="M375 200 L262 296 L240 424 L338 548 L468 602 L566 566 L688 452 L756 320 L706 236 L625 200 Z" fill="#1D6FB8" />
            {/* faceta clara superior esquerda */}
            <path d="M375 200 L262 296 L448 372 L500 200 Z" fill="#3E9BDA" />
            {/* faceta média esquerda */}
            <path d="M262 296 L240 424 L338 548 L448 372 Z" fill="#2A80C6" />
            {/* faceta clara superior direita */}
            <path d="M500 200 L448 372 L688 452 L756 320 L706 236 L625 200 Z" fill="#2B7CBE" />
            {/* quilha central escura — dá a profundidade */}
            <path d="M448 372 L338 548 L468 602 L566 566 L688 452 Z" fill="#12508F" />
            <path d="M448 372 L468 602 L566 566 Z" fill="#0C3E74" />
          </motion.g>

          {/* ── iceberg: ponta acima da água ── */}
          <motion.g
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
          >
            {/* silhueta recortada: pico principal + ombro à esquerda */}
            <path d="M500 58 L546 118 L582 156 L625 200 L375 200 L402 162 L424 108 L458 138 Z" fill="#F4FBFE" />
            {/* face esquerda em sombra suave */}
            <path d="M424 108 L402 162 L375 200 L458 200 L458 138 Z" fill="#D3E9F6" />
            {/* face direita, mais escura — a luz vem da esquerda */}
            <path d="M500 58 L546 118 L582 156 L625 200 L500 200 Z" fill="#B7D9EE" />
            {/* facetinha do pico */}
            <path d="M500 58 L458 138 L500 200 Z" fill="#E8F5FC" />
          </motion.g>

          {/* ── linha do mar ── */}
          <motion.path
            d={`M0 ${MAR} Q 125 ${MAR - 5}, 250 ${MAR} T 500 ${MAR} T 750 ${MAR} T 1000 ${MAR}`}
            fill="none" stroke={BLUE} strokeWidth="2" strokeOpacity="0.8"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ delay: 0.15, duration: 1.1, ease: 'easeInOut' }}
          />
          <motion.text
            x="24" y={MAR - 10} fontSize="9" fontWeight={800} fill={BLUE} opacity="0.75" letterSpacing="2"
            initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 1.2 }}
          >
            NÍVEL DO MAR
          </motion.text>

          {/* ── navios ── */}
          {[{ x: 120, d: 0 }, { x: 880, d: 1.2 }].map((n) => (
            <motion.g key={n.x}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: n.d }}
            >
              <g transform={`translate(${n.x}, ${MAR - 13})`}>
                <path d="M-13 8 L13 8 L9 14 L-9 14 Z" fill="#94A3B8" />
                <rect x="-1" y="-8" width="1.6" height="16" fill="#94A3B8" />
                <path d="M1 -8 L10 5 L1 5 Z" fill="#CBD5E1" />
                <path d="M-1.5 -5 L-9 5 L-1.5 5 Z" fill="#E2E8F0" />
              </g>
            </motion.g>
          ))}

          {/* ── peixinhos ── */}
          {[
            { x: 120, y: 300, s: 1, dur: 22, delay: 0 },
            { x: 860, y: 250, s: -1, dur: 27, delay: 3 },
            { x: 150, y: 545, s: 1, dur: 31, delay: 6 },
            { x: 890, y: 470, s: -1, dur: 24, delay: 1.5 },
          ].map((p, i) => (
            <motion.g key={i}
              initial={{ x: p.s > 0 ? -60 : 60 }}
              animate={{ x: p.s > 0 ? 60 : -60 }}
              transition={{ duration: p.dur, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: p.delay }}
            >
              <g transform={`translate(${p.x}, ${p.y}) scale(${p.s}, 1)`} opacity="0.5">
                <ellipse cx="0" cy="0" rx="7" ry="3.6" fill="#7FD3F0" />
                <path d="M6 0 L12 -4 L12 4 Z" fill="#7FD3F0" />
                <circle cx="-3.5" cy="-1" r="0.9" fill="#04101F" />
              </g>
            </motion.g>
          ))}

          {/* ── o que aparece ── */}
          {acima.map((c, i) => (
            <ChipSVG key={c.t} x={c.x} y={c.y} texto={c.t} cor={GOLD} delay={1.1 + i * 0.1} />
          ))}

          {/* ── o que sustenta ── */}
          {abaixo.map((c, i) => (
            <ChipSVG key={c.t} x={c.x} y={c.y} texto={c.t} cor="#BFE9FA" delay={2 + i * 0.09} tamanho={10} />
          ))}
        </svg>
      </div>

    </Slide>
  );
}

// 7 — O sistema da receita (mapa da aula)
// Slide animado: cascata na entrada, pulso de fluxo contínuo descendo a cadeia,
// e hover que destaca o elo (os outros recuam) — reforça que é UM sistema, não 7 caixas.
//
// O mapa volta ao longo da aula como divisor de capítulo (ver S05Foco): mesma
// figura, com o próximo tema aceso e o resto recuado. A turma reencontra o
// mesmo desenho e sabe onde está.
const ETAPAS_MAPA = [
  { nome: 'ESTRATÉGIA', desc: 'A ambição' },
  { nome: 'META', desc: 'O número' },
  { nome: 'PLANEJAMENTO COMERCIAL', desc: 'A decomposição', destaque: true },
  { nome: 'BUDGET', desc: 'O financiamento', destaque: true },
  { nome: 'EXECUÇÃO + PIPELINE', desc: 'A realidade', destaque: true },
  { nome: 'FORECAST', desc: 'A antecipação', destaque: true },
  { nome: 'DECISÃO E AJUSTES', desc: 'A correção' },
];

/**
 * @param foco  nome da etapa a destacar como próximo tema. Sem foco, é o mapa
 *              de abertura (slide 7) e todos os elos ficam vivos.
 *              O valor especial 'REVOPS' não casa com elo nenhum de propósito:
 *              apaga os sete e acende a moldura, porque RevOps é o que envolve
 *              a cadeia, não mais um elo dela.
 */
// `selo` fica de fora por padrão: este mapa aparece 6 vezes, mas só a entrada do
// bloco de RevOps abre bloco — e só lá o selo faz sentido.
function MapaReceita({ foco, selo }: { foco?: string; selo?: boolean }) {
  const etapas = ETAPAS_MAPA;
  const [hover, setHover] = useState<number | null>(null);
  const ENTRADA = 0.15;   // início da cascata
  const PASSO = 0.13;     // intervalo entre elos
  const FIM = ENTRADA + etapas.length * PASSO; // quando a cascata termina
  const temFoco = Boolean(foco);
  const focoRevops = foco === 'REVOPS';

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
        {temFoco && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="text-[10px] font-black uppercase tracking-[0.25em] mt-3"
            style={{ color: GOLD }}
          >
            Próximo tema
          </motion.p>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="relative w-full max-w-[720px]">
          {/* No foco REVOPS a moldura é a protagonista: RevOps não é um elo da
              cadeia, é o que envolve todos. Por isso ela acende e a etiqueta
              aparece, enquanto os sete elos recuam juntos. */}
          {focoRevops && (
            <motion.span
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] rounded-full z-20"
              style={{ background: NAVY, color: GOLD }}
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: FIM, duration: 0.5, ease: 'backOut' }}
            >
              Revenue Operations
            </motion.span>
          )}
          <motion.div
            className="absolute -inset-x-3 -inset-y-4 sm:-inset-x-10 rounded-[28px] border-2 border-dashed pointer-events-none"
            style={{ borderColor: focoRevops ? GOLD : `${GOLD}55` }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={
              focoRevops
                ? { opacity: 1, scale: 1, boxShadow: [`0 0 0px ${GOLD}00`, `0 0 60px -5px ${GOLD}66`, `0 0 0px ${GOLD}00`] }
                : { opacity: [0, 1, 0.55, 1], scale: 1 }
            }
            transition={{
              boxShadow: { delay: FIM, duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
              opacity: focoRevops
                ? { delay: FIM, duration: 0.6 }
                : { delay: FIM, duration: 5, times: [0, 0.12, 0.56, 1], repeat: Infinity, ease: 'easeInOut' },
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
              const focado = temFoco && e.nome === foco;
              // com foco, o resto recua para o próximo tema saltar
              const apagado = temFoco && !focado;
              const cor = focado ? GOLD : e.destaque ? BLUE : '#E2E8F0';
              const ativo = hover === i;
              const outroAtivo = hover !== null && !ativo;
              return (
                <div key={e.nome} className="w-full flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{
                      opacity: outroAtivo ? 0.4 : apagado ? 0.28 : 1,
                      y: 0,
                      scale: ativo ? 1.045 : focado ? 1.06 : 1,
                      boxShadow: focado
                        ? [`0 0 0px ${GOLD}00`, `0 10px 40px -6px ${GOLD}77`, `0 0 0px ${GOLD}00`]
                        : ativo ? `0 8px 30px -6px ${cor}55` : '0 0 0px rgba(0,0,0,0)',
                    }}
                    transition={{
                      opacity: { delay: hover === null ? ENTRADA + i * PASSO : 0, duration: 0.35 },
                      y: { delay: ENTRADA + i * PASSO, duration: 0.4, ease: 'easeOut' },
                      scale: { type: 'spring', stiffness: 380, damping: 22, delay: focado ? FIM : 0 },
                      boxShadow: focado
                        ? { delay: FIM, duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.25 },
                    }}
                    onHoverStart={() => setHover(i)}
                    onHoverEnd={() => setHover(null)}
                    className="group relative z-10 w-full max-w-[420px] rounded-xl px-5 py-2.5 flex items-center justify-between border overflow-hidden cursor-default"
                    style={{
                      borderColor: focado ? GOLD : ativo ? cor : e.destaque ? `${BLUE}55` : 'rgba(255,255,255,0.10)',
                      background: focado
                        ? 'rgba(196,138,87,0.14)'
                        : e.destaque ? 'rgba(26,173,226,0.08)' : 'rgba(255,255,255,0.025)',
                      transition: 'border-color 0.25s',
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
      {selo && <SeloMagna />}
    </Slide>
  );
}

// 7 — o mapa de abertura: a cadeia inteira viva
function S05() {
  return <MapaReceita />;
}

/* ═════════════════ BLOCO 2 — PLANEJAMENTO COMERCIAL ═════════════════ */

// 8 — A estratégia (as 3 perguntas que a antecedem)
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
      <SeloMagna />
    </Slide>
  );
}

// 9 — Ferramentas da estratégia
// Cada card traz um mini-diagrama da ferramenta e amarra na pergunta que ela
// responde no slide 8 — as três não competem, elas cobrem perguntas diferentes.
/** Card de ferramenta: sobe no hover, e os outros recuam para dar foco. */
function CardFerramenta({ cor, atraso, ativo, outroAtivo, onHover, children }: {
  cor: string; atraso: number; ativo: boolean; outroAtivo: boolean;
  onHover: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: outroAtivo ? 0.45 : 1, y: ativo ? -8 : 0, scale: ativo ? 1.02 : 1 }}
      transition={{
        opacity: { delay: atraso, duration: 0.45 },
        y: { type: 'spring', stiffness: 320, damping: 22, delay: ativo ? 0 : atraso },
        scale: { type: 'spring', stiffness: 320, damping: 22 },
      }}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
      className="h-full cursor-default"
    >
      <div
        className="rounded-2xl border bg-white/[0.03] p-6 h-full lg:min-h-[240px] flex flex-col relative overflow-hidden"
        style={{
          borderColor: ativo ? cor : `${cor}2e`,
          boxShadow: ativo ? `0 18px 45px -12px ${cor}55` : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${cor}1f, transparent 65%)`, opacity: ativo ? 1 : 0 }}
        />
        <div className="relative flex flex-col flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

function S07() {
  const swot = [
    { letra: 'S', pt: 'Forças', cor: GREEN },
    { letra: 'W', pt: 'Fraquezas', cor: RED },
    { letra: 'O', pt: 'Oportunidades', cor: BLUE },
    { letra: 'T', pt: 'Ameaças', cor: AMBER },
  ];
  const motivadores = ['Rentabilidade', 'Market share', 'Sobrevivência', 'Captação', 'Sucessão'];
  const [hover, setHover] = useState<number | null>(null);
  const ver = (i: number) => (v: boolean) => setHover(v ? i : null);

  return (
    <Slide bg="dark">
      <Titulo>Ferramentas</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 content-center min-h-0">

        {/* ── 1. AS IS / TO BE — o "hoje" desbota e a luz viaja para o "amanhã" ── */}
        <CardFerramenta cor={BLUE} atraso={0.12} ativo={hover === 0} outroAtivo={hover !== null && hover !== 0} onHover={ver(0)}>
          <div className="flex items-center gap-2.5 mb-1">
            <motion.span animate={hover === 0 ? { rotate: [0, -8, 8, 0] } : {}} transition={{ duration: 0.5 }}>
              <Map className="w-4 h-4" style={{ color: BLUE }} />
            </motion.span>
            <p className="text-base font-black" style={{ color: BLUE }}>As is / To be</p>
          </div>
          <p className="text-[11px] text-slate-500 mb-5">A fotografia de hoje contra a de amanhã.</p>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full flex items-center gap-2 relative">
              {/* pulso que sai do hoje e chega no amanhã, em loop */}
              <motion.span
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full z-10 pointer-events-none"
                style={{ background: BLUE, boxShadow: `0 0 10px 3px ${BLUE}` }}
                animate={{ left: ['22%', '78%'], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.7, ease: 'easeInOut', times: [0, 0.15, 0.8, 1] }}
              />
              <motion.div
                className="flex-1 rounded-lg border px-3 py-4 text-center"
                style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
                animate={{ opacity: [1, 0.55, 1] }}
                transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">As is</p>
                <p className="text-sm font-black text-slate-300 mt-1">Hoje</p>
              </motion.div>
              <motion.span
                className="text-lg shrink-0"
                style={{ color: BLUE }}
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
              <motion.div
                className="flex-1 rounded-lg border px-3 py-4 text-center"
                style={{ borderColor: `${BLUE}55`, background: 'rgba(26,173,226,0.08)' }}
                animate={{ boxShadow: [`0 0 0px ${BLUE}00`, `0 0 22px -4px ${BLUE}88`, `0 0 0px ${BLUE}00`] }}
                transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: BLUE }}>To be</p>
                <p className="text-sm font-black mt-1" style={{ color: BLUE }}>Amanhã</p>
              </motion.div>
            </div>
          </div>
        </CardFerramenta>

        {/* ── 2. SWOT — os 4 quadrantes acendem em sequência, como quem varre a matriz ── */}
        <CardFerramenta cor={GREEN} atraso={0.26} ativo={hover === 1} outroAtivo={hover !== null && hover !== 1} onHover={ver(1)}>
          <div className="flex items-center gap-2.5 mb-1">
            <motion.span animate={hover === 1 ? { rotate: [0, 90] } : { rotate: 0 }} transition={{ duration: 0.5, ease: 'backOut' }}>
              <LayoutGrid className="w-4 h-4" style={{ color: GREEN }} />
            </motion.span>
            <p className="text-base font-black" style={{ color: GREEN }}>SWOT</p>
          </div>
          <p className="text-[11px] text-slate-500 mb-5">O que joga a favor e contra.</p>

          <div className="flex-1 flex items-center">
            <div className="w-full grid grid-cols-2 gap-1.5">
              {swot.map((q, i) => (
                <motion.div
                  key={q.letra}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    borderColor: [`${q.cor}33`, q.cor, `${q.cor}33`],
                    backgroundColor: [`${q.cor}0d`, `${q.cor}26`, `${q.cor}0d`],
                  }}
                  transition={{
                    opacity: { delay: 0.4 + i * 0.08 },
                    scale: { delay: 0.4 + i * 0.08, type: 'spring', stiffness: 380, damping: 20 },
                    borderColor: { delay: 1.2 + i * 0.6, duration: 2.4, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' },
                    backgroundColor: { delay: 1.2 + i * 0.6, duration: 2.4, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' },
                  }}
                  whileHover={{ scale: 1.06 }}
                  className="rounded-lg border px-2.5 py-3"
                >
                  <p className="text-lg font-black leading-none" style={{ color: q.cor }}>{q.letra}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">{q.pt}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </CardFerramenta>

        {/* ── 3. MOTIVADORES — o destaque circula pelos chips: "qual é o seu?" ── */}
        <CardFerramenta cor={GOLD} atraso={0.4} ativo={hover === 2} outroAtivo={hover !== null && hover !== 2} onHover={ver(2)}>
          <div className="flex items-center gap-2.5 mb-1">
            <motion.span animate={hover === 2 ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.5 }}>
              <Target className="w-4 h-4" style={{ color: GOLD }} />
            </motion.span>
            <p className="text-base font-black" style={{ color: GOLD }}>Motivadores estratégicos</p>
          </div>
          <p className="text-[11px] text-slate-500 mb-5">O porquê que vem antes do número.</p>

          <div className="flex-1 flex items-center">
            <div className="w-full flex flex-wrap gap-1.5">
              {motivadores.map((m, i) => (
                <motion.span
                  key={m}
                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: [1, 1.07, 1],
                    borderColor: [`${GOLD}44`, GOLD, `${GOLD}44`],
                    backgroundColor: ['rgba(196,138,87,0.08)', 'rgba(196,138,87,0.28)', 'rgba(196,138,87,0.08)'],
                  }}
                  transition={{
                    opacity: { delay: 0.55 + i * 0.07 },
                    y: { delay: 0.55 + i * 0.07, type: 'spring', stiffness: 380, damping: 20 },
                    // o destaque passa de chip em chip e recomeça
                    scale: { delay: 1.4 + i * 0.55, duration: 1.1, repeat: Infinity, repeatDelay: motivadores.length * 0.55 - 1.1, ease: 'easeInOut' },
                    borderColor: { delay: 1.4 + i * 0.55, duration: 1.1, repeat: Infinity, repeatDelay: motivadores.length * 0.55 - 1.1, ease: 'easeInOut' },
                    backgroundColor: { delay: 1.4 + i * 0.55, duration: 1.1, repeat: Infinity, repeatDelay: motivadores.length * 0.55 - 1.1, ease: 'easeInOut' },
                  }}
                  whileHover={{ scale: 1.12 }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-default"
                  style={{ color: '#E2E8F0' }}
                >
                  {m}
                </motion.span>
              ))}
            </div>
          </div>
        </CardFerramenta>
      </div>
    </Slide>
  );
}

/* ── Slides 9/10/11: cada ferramenta + o exercício que o aluno faz ────────
 * Os alunos abrem /treino-mba01 no celular e preenchem com a empresa DELES.
 * Os dados ficam no navegador do aluno (localStorage) — nada vai pro servidor.
 */

const LINK_TREINO = 'minhasmetricas.com/treino-mba01';

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
          <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: cor }}>Pilar {pilar} de 5</p>
          <p className="text-[15px] font-black text-slate-900 leading-tight">{titulo}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

/** Bloco de chamada com o link do exercício. */
function ChamadaTreino() {
  return (
    <div className="rounded-xl border px-5 py-4" style={{ borderColor: `${GOLD}44`, background: 'rgba(196,138,87,0.06)' }}>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5" style={{ color: GOLD }}>Agora é você</p>
      <p className="text-base font-black text-slate-100">
        minhasmetricas.com<span style={{ color: GOLD }}>/treino-mba01</span>
      </p>
    </div>
  );
}

// 10 — To be / As is (tela + exercício)
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
          <ChamadaTreino />
        </div>
      </div>
    </Slide>
  );
}

// 11 — SWOT (tela + exercício)
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
          <ChamadaTreino />
        </div>
      </div>
    </Slide>
  );
}

// 12 — Motivadores Estratégicos (tela + exercício)
function S08C() {
  const cols = [
    { t: 'BUSCAR', s: 'quero · não tenho', c: '#3B82F6', itens: ['MRR de R$ 30 mil', 'Marketing que gera demanda'] },
    { t: 'PRESERVAR', s: 'quero · tenho', c: GREEN, itens: ['Produto transformador', 'Comunidade engajada'] },
    { t: 'EVITAR', s: 'não quero · não tenho', c: AMBER, itens: ['Depender de um cliente só'] },
    { t: 'ELIMINAR', s: 'não quero · tenho', c: RED, itens: ['Venda só por indicação'] },
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: '#8B5CF6' }}>3</span> Motivadores estratégicos</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center min-h-0">
        <MockupTela cor="#8B5CF6" pilar={3} titulo="Motivadores Estratégicos">
          <div className="flex gap-1.5">
            <div className="flex flex-col justify-around shrink-0">
              {['QUERO', 'NÃO QUERO'].map((e) => (
                <span key={e} className="text-[6px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{e}</span>
              ))}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-1.5 mb-1">
                <p className="text-[6px] font-black uppercase tracking-wider text-slate-400 text-center">Não tenho</p>
                <p className="text-[6px] font-black uppercase tracking-wider text-slate-400 text-center">Tenho</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {cols.map((c, i) => (
                  <motion.div
                    key={c.t}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.12 }}
                    className="rounded-lg bg-white border border-slate-200 p-2.5"
                  >
                    <div className="text-center pb-1.5 mb-1.5 border-b border-slate-100">
                      <p className="text-[11px] font-black" style={{ color: c.c }}>{c.t}</p>
                      <p className="text-[6px] text-slate-400">{c.s}</p>
                    </div>
                    {c.itens.map((x) => (
                      <p key={x} className="text-[8px] text-slate-500 leading-snug py-0.5">• {x}</p>
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </MockupTela>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            A matriz cruza <strong className="text-slate-200">querer</strong> com{' '}
            <strong className="text-slate-200">ter</strong>. Ela se alimenta dos outros dois: o{' '}
            <strong style={{ color: GOLD }}>gap</strong> vira <strong style={{ color: BLUE }}>BUSCAR</strong>,
            as <strong style={{ color: GREEN }}>forças</strong> viram{' '}
            <strong style={{ color: GREEN }}>PRESERVAR</strong>, as{' '}
            <strong style={{ color: RED }}>fraquezas</strong> viram{' '}
            <strong style={{ color: RED }}>ELIMINAR</strong>.
          </p>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            A linha de baixo é a que ninguém preenche — e é a que evita desperdício.{' '}
            <strong style={{ color: RED }}>Eliminar</strong> dói: é admitir que algo que você construiu
            precisa morrer. <strong style={{ color: AMBER }}>Evitar</strong> é recusar hoje a oportunidade
            que ia te distrair depois.
          </p>
          <ChamadaTreino />
        </div>
      </div>
    </Slide>
  );
}

// 14 — De onde virá o crescimento? (4 motores)
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
    </Slide>
  );
}

// 15 — Mapa de Objetivos (tela + exercício) — mesmo formato dos slides 9/10/11
// A cascata de 4 níveis: a meta desce até virar tarefa com dono. É o mesmo
// movimento do funil reverso (slide 25), mas para iniciativas em vez de leads.
// Exemplo genérico de propósito: a Empresa Alpha só é apresentada no slide 23.
function SMapaObjetivos() {
  const cols = [
    { t: 'Objetivo', q: 'onde chegar', c: AMBER, itens: ['Faturar R$ 600 mil no ano'] },
    { t: 'Sub-objetivos', q: 'em que pedaços', c: '#3B82F6', itens: ['R$ 30 mil/mês até Q3', 'Escolas: R$ 12,5 mil/mês'] },
    { t: 'Iniciativas', q: 'o que fazer', c: GREEN, itens: ['Esteira de produtos', 'Recrutar closers'] },
    { t: 'Ações', q: 'quem e quando', c: '#8B5CF6', itens: ['Roadmap com tecnologia', 'Descritivo de cargo'] },
  ];
  return (
    <Slide bg="dark">
      <Titulo><span style={{ color: '#EC4899' }}>4</span> Mapa de objetivos</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center min-h-0">
        <MockupTela cor="#EC4899" pilar={4} titulo="Mapa de Objetivos">
          <div className="grid grid-cols-4 gap-1.5">
            {cols.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.16 }}
                className="rounded-lg bg-white border border-slate-200 p-2"
              >
                <div className="pb-1.5 mb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded flex items-center justify-center text-[6px] font-black shrink-0"
                      style={{ background: `${c.c}26`, color: c.c }}>{i + 1}</span>
                    <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: c.c }}>{c.t}</p>
                  </div>
                  <p className="text-[6px] text-slate-400 mt-0.5">{c.q}</p>
                </div>
                {c.itens.map((x) => (
                  <p key={x} className="text-[7px] text-slate-500 leading-snug py-0.5 border-l-2 pl-1 mb-1"
                    style={{ borderLeftColor: c.c }}>{x}</p>
                ))}
              </motion.div>
            ))}
          </div>
        </MockupTela>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            A cascata: o <strong style={{ color: AMBER }}>objetivo</strong> sai do gap do To be / As is,
            quebra em <strong style={{ color: BLUE }}>sub-objetivos</strong> que somados fecham a conta,
            cada um vira <strong style={{ color: GREEN }}>iniciativas</strong>, e cada iniciativa vira{' '}
            <strong style={{ color: '#8B5CF6' }}>ações</strong>.
          </p>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            O teste é a última coluna: se ela não tem <strong className="text-slate-200">dono e prazo</strong>,
            o plano ainda é um desejo. Meta que não desce até a agenda de alguém não acontece.
          </p>
          <ChamadaTreino />
        </div>
      </div>
    </Slide>
  );
}

/* ════════ 19 a 22 — TOP-DOWN E BOTTOM-UP, UM DE CADA VEZ ════════
 * Empresa BETA: exemplo separado da Alpha de propósito. A Alpha só entra no
 * slide 23 e atravessa a aula inteira; a Beta é pequena e descartável, existe
 * só para a turma ver as duas contas isoladas.
 *
 * Os slides 20 e 22 são a MESMA empresa vista dos dois lados — é isso que faz
 * o confronto funcionar: 8,4 mi pedidos contra 5,4 mi possíveis.
 */
const BETA = {
  receita: 6_000_000,        // faturamento de hoje, no ano
  crescimento: 0.4,          // o quanto o conselho quer crescer
  vendedores: 6,
  oppMesPorVendedor: 10,     // oportunidades que um vendedor toca por mês
  winRate: 0.25,
  ticket: 30_000,
};
const B_META = BETA.receita * (1 + BETA.crescimento);              // 8.400.000
const B_TRI = B_META / 4;                                          // 2.100.000
const B_VEND_TRI = B_TRI / BETA.vendedores;                        // 350.000
const B_VEND_MES = B_VEND_TRI / 3;                                 // 116.667
const B_VENDAS_EXIGIDAS = B_VEND_MES / BETA.ticket;                // 3,9 por mês
// o mesmo negócio, agora de baixo para cima
const B_OPP_MES = BETA.vendedores * BETA.oppMesPorVendedor;        // 60
const B_VENDAS_MES = B_OPP_MES * BETA.winRate;                     // 15
const B_RECEITA_MES = B_VENDAS_MES * BETA.ticket;                  // 450.000
const B_POSSIVEL = B_RECEITA_MES * 12;                             // 5.400.000
const B_GAP = B_META - B_POSSIVEL;                                 // 3.000.000
const B_VENDAS_REAIS = B_VENDAS_MES / BETA.vendedores;             // 2,5 por mês
const B_VENDEDORES_NEC = B_META / 12 / BETA.ticket / BETA.winRate / BETA.oppMesPorVendedor; // 9,3

const fmtMi = (n: number) => 'R$ ' + (n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
const um = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// 19 — O que é top-down
function STopDown() {
  const origens = [
    { t: 'A ambição do dono', d: '“quero dobrar em dois anos”' },
    { t: 'A exigência do investidor', d: 'o valuation combinado pede X' },
    { t: 'O mercado', d: 'a fatia que queremos tomar' },
    { t: 'O histórico + um %', d: '“ano passado 6, então 8,4”' },
  ];
  return (
    <Slide bg="dark">
      <Titulo sub="O número vem de cima">Top-down</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center min-h-0">
        <div className="flex flex-col items-center">
          {['CONSELHO / SÓCIOS', 'DIRETORIA', 'GESTOR COMERCIAL', 'VENDEDOR'].map((n, i) => (
            <div key={n} className="w-full flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.18, duration: 0.4 }}
                className="rounded-xl border px-5 py-3 text-center"
                style={{
                  borderColor: i === 0 ? BLUE : `${BLUE}33`,
                  background: `rgba(26,173,226,${0.14 - i * 0.03})`,
                  width: `${100 - i * 12}%`,
                }}
              >
                <p className="text-[12px] font-black tracking-wide" style={{ color: i === 0 ? BLUE : '#CBD5E1' }}>{n}</p>
              </motion.div>
              {i < 3 && (
                <motion.span className="text-[12px] py-1" style={{ color: BLUE }}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ delay: 1.1 + i * 0.25, duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                  ▼
                </motion.span>
              )}
            </div>
          ))}
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 mt-4">a meta desce pronta</p>
        </div>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            O número <strong className="text-slate-200">nasce no topo</strong> e desce. Primeiro se decide onde
            a empresa tem que chegar; só depois se pergunta como.
          </p>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2.5" style={{ color: GOLD }}>De onde sai esse número</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {origens.map((o, i) => (
                <motion.div key={o.t}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <Card className="px-3.5 py-2.5 h-full">
                    <p className="text-[12px] font-bold text-slate-100">{o.t}</p>
                    <p className="text-[10.5px] text-slate-500 italic mt-0.5">{o.d}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-l-[3px] px-5 py-3.5" style={{ borderColor: RED, background: 'rgba(239,68,68,0.06)' }}>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              Repare no que ele <strong style={{ color: RED }}>não pergunta</strong>: se a máquina que existe
              hoje aguenta entregar isso.
            </p>
          </div>
        </div>
      </div>
      <Mensagem>O top-down é uma <strong style={{ color: BLUE }}>decisão</strong>, não um cálculo.</Mensagem>
    </Slide>
  );
}

// 20 — Top-down na prática
function STopDownPratica() {
  const degraus = [
    { r: 'Faturamento de hoje', v: fmtMi(BETA.receita), c: '#94A3B8', conta: null as string | null },
    { r: 'O conselho quer crescer 40%', v: fmtMi(B_META), c: BLUE, conta: `${fmtMi(BETA.receita)} × 1,4` },
    { r: 'Por trimestre', v: fmtMi(B_TRI), c: BLUE, conta: `${fmtMi(B_META)} ÷ 4` },
    { r: 'Por vendedor, no trimestre', v: fmtK(B_VEND_TRI), c: BLUE, conta: `${fmtMi(B_TRI)} ÷ ${BETA.vendedores}` },
    { r: 'Por vendedor, no mês', v: fmtK(B_VEND_MES), c: GOLD, conta: `${fmtK(B_VEND_TRI)} ÷ 3` },
    { r: 'Vendas por vendedor, no mês', v: um(B_VENDAS_EXIGIDAS), c: GOLD, conta: `${fmtK(B_VEND_MES)} ÷ ${fmtK(BETA.ticket)}` },
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 flex items-center gap-3 mb-5">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: `${BLUE}1a`, color: BLUE }}>Top-down na prática</span>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">EMPRESA BETA</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 space-y-1.5">
        {degraus.map((d, i) => (
          <motion.div key={d.r}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.22, duration: 0.4 }}
            className="flex items-center gap-4 rounded-xl border px-5 py-2.5"
            style={{ borderColor: `${d.c}33`, background: `${d.c}0a` }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: `${d.c}26`, color: d.c }}>{i + 1}</span>
            <p className="text-[13px] text-slate-300 flex-1">{d.r}</p>
            {d.conta && <p className="text-[11px] font-mono text-slate-600 hidden sm:block">{d.conta}</p>}
            <p className="text-xl font-black w-[110px] text-right shrink-0" style={{ color: d.c }}>{d.v}</p>
          </motion.div>
        ))}
      </div>

      <Mensagem cor={GOLD}>
        Cada vendedor precisa fechar <strong style={{ color: GOLD }}>{um(B_VENDAS_EXIGIDAS)} vendas por mês</strong>.
        Ele consegue? O top-down <strong>não pergunta</strong>.
      </Mensagem>
    </Slide>
  );
}

// 21 — O que é bottom-up
function SBottomUp() {
  return (
    <Slide bg="dark">
      <Titulo sub="O número vem de baixo">Bottom-up</Titulo>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center min-h-0">
        <div className="flex flex-col-reverse items-center">
          {['O QUE A EMPRESA CONSEGUE', 'TIME COMERCIAL', 'CADA VENDEDOR', 'AS OPORTUNIDADES QUE ELE TOCA'].map((n, i) => (
            <div key={n} className="w-full flex flex-col-reverse items-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.18, duration: 0.4 }}
                className="rounded-xl border px-5 py-3 text-center"
                style={{
                  borderColor: i === 0 ? GOLD : `${GOLD}33`,
                  background: `rgba(196,138,87,${0.14 - i * 0.03})`,
                  width: `${100 - i * 12}%`,
                }}
              >
                <p className="text-[12px] font-black tracking-wide" style={{ color: i === 0 ? GOLD : '#CBD5E1' }}>{n}</p>
              </motion.div>
              {i < 3 && (
                <motion.span className="text-[12px] py-1" style={{ color: GOLD }}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ delay: 1.1 + i * 0.25, duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                  ▲
                </motion.span>
              )}
            </div>
          ))}
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 mt-4">a conta sobe da máquina</p>
        </div>

        <div className="space-y-5">
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Aqui ninguém decide o número: ele é <strong className="text-slate-200">o resultado de uma conta</strong>.
            Você mede o que a máquina produz e vê onde isso dá.
          </p>

          <div className="rounded-2xl border px-5 py-4" style={{ borderColor: `${GOLD}44`, background: 'rgba(196,138,87,0.06)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: GOLD }}>A conta</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-slate-200">
              <span>vendedores</span><span className="text-slate-600">×</span>
              <span>oportunidades/mês</span><span className="text-slate-600">×</span>
              <span>win rate</span><span className="text-slate-600">×</span>
              <span>ticket</span>
              <span className="text-slate-600">=</span>
              <span style={{ color: GOLD }}>receita possível</span>
            </div>
          </div>
        </div>
      </div>
      <Mensagem cor={GOLD}>O bottom-up é um <strong style={{ color: GOLD }}>cálculo</strong>, não uma decisão.</Mensagem>
    </Slide>
  );
}

// 22 — Bottom-up na prática + o confronto
function SBottomUpPratica() {
  const degraus = [
    { r: `${BETA.vendedores} vendedores × ${BETA.oppMesPorVendedor} oportunidades`, v: `${B_OPP_MES}/mês`, c: '#94A3B8' },
    { r: `× win rate de ${BETA.winRate * 100}%`, v: `${B_VENDAS_MES} vendas/mês`, c: GOLD },
    { r: `× ticket de ${fmtK(BETA.ticket)}`, v: fmtK(B_RECEITA_MES) + '/mês', c: GOLD },
    { r: '× 12 meses', v: fmtMi(B_POSSIVEL), c: GREEN },
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: `${GOLD}1a`, color: GOLD }}>Bottom-up na prática</span>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">EMPRESA BETA</h2>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-6 items-center min-h-0">
        <div className="space-y-1.5">
          {degraus.map((d, i) => (
            <motion.div key={d.r}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.24, duration: 0.4 }}
              className="flex items-center gap-3 rounded-xl border px-5 py-3"
              style={{ borderColor: `${d.c}33`, background: `${d.c}0a` }}
            >
              <p className="text-[13px] text-slate-300 flex-1">{d.r}</p>
              <p className="text-lg font-black shrink-0" style={{ color: d.c }}>{d.v}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <Card className="p-6" style={{ borderColor: `${RED}44` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: RED }}>O confronto</p>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-slate-400">O topo pediu</span>
                <span className="text-2xl font-black" style={{ color: BLUE }}>{fmtMi(B_META)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-slate-400">A máquina entrega</span>
                <span className="text-2xl font-black" style={{ color: GREEN }}>{fmtMi(B_POSSIVEL)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-3 border-t border-white/10">
                <span className="text-[12px] font-bold text-slate-200">Falta</span>
                <span className="text-3xl font-black" style={{ color: RED }}>{fmtMi(B_GAP)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-4 pt-3 border-t border-white/10">
              Por vendedor: o topo pede <strong style={{ color: BLUE }}>{um(B_VENDAS_EXIGIDAS)}</strong> vendas/mês.
              A máquina faz <strong style={{ color: GREEN }}>{um(B_VENDAS_REAIS)}</strong>.
            </p>
          </Card>
        </motion.div>
      </div>

      <Mensagem cor={GOLD}>
        Agora a conversa deixa de ser sobre esforço: ou o time vai para{' '}
        <strong style={{ color: GOLD }}>{um(B_VENDEDORES_NEC)} vendedores</strong> no lugar de {BETA.vendedores},
        ou sobe o win rate, ou sobe o ticket — ou a meta baixa.
      </Mensagem>
    </Slide>
  );
}

// 23 — O caso Empresa Alpha
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
    </Slide>
  );
}

// 18 — Começando pelo fim
/**
 * Selo do método. O funil reverso confunde: parece "de baixo pra cima" porque
 * termina em leads, mas é TOP-DOWN — parte da meta que veio de cima e desce até
 * a operação. Sem o selo, a turma sai da aula achando que fez bottom-up.
 */
function SeloMetodo({ metodo }: { metodo: 'top-down' | 'bottom-up' }) {
  const top = metodo === 'top-down';
  const cor = top ? BLUE : GOLD;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border"
      style={{ color: cor, borderColor: `${cor}55`, background: `${cor}14` }}
    >
      <motion.span
        animate={{ y: top ? [0, 2, 0] : [0, -2, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {top ? '▼' : '▲'}
      </motion.span>
      {metodo}
    </motion.span>
  );
}

function S10() {
  return (
    <Slide bg="dark">
      <div className="shrink-0 mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Começando pelo fim</h2>
        </div>
        <div className="text-right shrink-0">
          <SeloMetodo metodo="top-down" />
          <p className="text-[10px] text-slate-500 italic mt-2 max-w-[230px]">
            A meta veio de cima. Agora ela desce até virar operação.
          </p>
        </div>
      </div>
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
    </Slide>
  );
}

// 19 — O funil reverso
function S11() {
  const degraus = [
    { valor: fmtK(GAP) + ' de nova receita', conta: null as string | null, w: 100, cor: '#E2E8F0', num: `${fmtK(GAP_MES)}/mês` },
    { valor: `${CLIENTES} clientes`, conta: `R$ 240.000 ÷ R$ 500 = ${CLIENTES}`, w: 76, cor: BLUE, num: `≈ ${CLIENTES / MESES}/mês` },
    { valor: `${fmtNum(OPORTUNIDADES)} oportunidades`, conta: `${CLIENTES} ÷ 25% = ${fmtNum(OPORTUNIDADES)}`, w: 55, cor: GOLD, num: `≈ ${OPORTUNIDADES / MESES}/mês` },
    { valor: `${fmtNum(LEADS)} leads`, conta: `${fmtNum(OPORTUNIDADES)} ÷ 20% = ${fmtNum(LEADS)}`, w: 34, cor: AMBER, num: `≈ ${LEADS / MESES}/mês` },
  ];
  return (
    <Slide bg="dark">
      <div className="shrink-0 mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">O funil reverso</h2>
        </div>
        <div className="text-right shrink-0">
          <SeloMetodo metodo="top-down" />
          <p className="text-[10px] text-slate-500 italic mt-2 max-w-[250px]">
            Termina em leads, mas <strong className="text-slate-400">não é bottom-up</strong>: parte da meta
            e desce. A máquina não foi consultada.
          </p>
        </div>
      </div>
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
    </Slide>
  );
}

// 20 — Mas a realidade não é uma planilha
function S12() {
  const vars = [
    { v: 'Sazonalidade', d: '9.600 leads não caem 800 por mês.' },
    { v: 'Capacidade da equipe', d: '160 oportunidades/mês exigem quantos vendedores?' },
    { v: 'Ciclo de vendas', d: 'Lead de setembro não vira receita neste ano.' },
    { v: 'Variação do ticket', d: 'Desconto muda o número de clientes necessários.' },
    { v: 'Perdas no funil', d: '' },
    { v: 'Churn', d: 'Parte da venda nova só repõe o que saiu.' },
    { v: 'Mudanças de mercado', d: '' },
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {vars.map((x, i) => (
            <motion.div key={x.v} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.09 }}>
              <Card className="px-4 py-3 h-full">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: AMBER }} />
                  <p className="text-[13px] font-bold text-slate-100">{x.v}</p>
                </div>
                {x.d && <p className="text-[11px] text-slate-500 leading-relaxed">{x.d}</p>}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// 21 — Top-down × Bottom-up
function S13() {
  const cols = [
    { t: 'TOP-DOWN', cor: BLUE, itens: ['Parte da ambição', '“Queremos crescer 50%”', 'Visão estratégica', 'Pressiona crescimento'] },
    { t: 'BOTTOM-UP', cor: GOLD, itens: ['Parte da capacidade', '“Quanto conseguimos produzir?”', 'Visão operacional', 'Testa viabilidade'] },
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
        </Card>
      </div>
      <Mensagem>Um bom planejamento <strong style={{ color: BLUE }}>confronta a ambição com a capacidade</strong>.</Mensagem>
    </Slide>
  );
}

/* ═══════════════════════ BLOCO 3 — BUDGET ═══════════════════════ */

// 23 — Transição para budget
function S15() {
  return (
    <Slide bg="dark">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
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
      <SeloMagna />
    </Slide>
  );
}

// 24 — O que é budget?
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

// 25 — O que entra no budget comercial?
// Os itens não aparecem sozinhos: cada clique revela o próximo, para o professor
// falar de um por vez. Os invisíveis continuam ocupando o lugar deles (opacity),
// então a grade não pula quando aparecem.
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
  const total = cats.length + 1; // +1 = o card tracejado do fim
  const [revelados, setRevelados] = useState(0);
  const revelar = () => setRevelados((n) => Math.min(n + 1, total));
  const visivel = (i: number) => (i < revelados ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 });

  return (
    <Slide bg="dark">
      <Titulo sub="Composição">O que entra no budget comercial?</Titulo>
      <div onClick={revelar} className="flex-1 flex flex-col justify-center cursor-pointer">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cats.map((c, i) => (
            <motion.div key={c.c} initial={{ opacity: 0, scale: 0.94 }} animate={visivel(i)} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <Card className="p-4 h-full">
                <c.icon className="w-5 h-5 mb-2.5" style={{ color: c.cor }} />
                <p className="text-sm font-bold text-slate-100">{c.c}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.d}</p>
              </Card>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={visivel(cats.length)} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className="rounded-2xl border border-dashed flex items-center justify-center p-4 h-full" style={{ borderColor: `${GOLD}44` }}>
              <p className="text-[11px] text-center leading-relaxed" style={{ color: GOLD }}>
                Cortar 20% do budget =<br />reduzir X% da capacidade<br />de gerar receita.
              </p>
            </div>
          </motion.div>
        </div>

        {/* fica no lugar mesmo invisível, senão a grade se mexe ao sumir */}
        <p
          className="mt-7 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 transition-opacity duration-300"
          style={{ opacity: revelados === 0 ? 1 : 0 }}
        >
          clique para revelar
        </p>
      </div>
    </Slide>
  );
}

// 26 — Construindo o budget da Alpha
// O card da direita (o veredito do investimento) só aparece no clique: primeiro
// a turma olha o quanto custa, depois é que vem o "isso faz sentido?".
function S18() {
  const max = Math.max(...BUDGET.map((b) => b.valor));
  const [revelado, setRevelado] = useState(false);
  return (
    <Slide bg="dark">
      <Titulo sub="Estudo de caso · Empresa Alpha">Construindo o budget</Titulo>
      <div onClick={() => setRevelado(true)} className="flex-1 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 items-center min-h-0 cursor-pointer">
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

        <div className="relative h-full">
          {/* a dica ocupa o lugar do card enquanto ele não veio */}
          <p
            className="absolute inset-0 grid place-items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 transition-opacity duration-300"
            style={{ opacity: revelado ? 0 : 1 }}
          >
            clique para revelar
          </p>
          <motion.div
            className="h-full"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={revelado ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
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
          </motion.div>
        </div>
      </div>
    </Slide>
  );
}

// 27 — Três cenários
function S19() {
  const cenarios = [
    { nome: 'CONSERVADOR', receitaMes: 40_000, cor: '#94A3B8' },
    { nome: 'BASE', receitaMes: 50_000, cor: BLUE },
    { nome: 'AGRESSIVO', receitaMes: 60_000, cor: GOLD },
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
              </div>
            </motion.div>
          );
        })}
      </div>
    </Slide>
  );
}


/* ═══════════════ BLOCO 4 — FORECAST E PIPELINE ═══════════════ */


// 31 — O pipeline
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
        </div>
      </div>
    </Slide>
  );
}

// 32 — Pipeline não é forecast
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
      <Titulo>Pipeline não é forecast</Titulo>
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
    </Slide>
  );
}

// 33 — A fórmula do forecast ponderado
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
    </Slide>
  );
}

// 34 — Pipeline coverage
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

// 35 — Sinais de saúde do pipeline
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
    </Slide>
  );
}

// 36 — Forecast é ferramenta de decisão
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

// 37 — O problema dos silos
function S29() {
  const areas = [
    { a: 'MARKETING', m: 'MQLs', cor: BLUE },
    { a: 'VENDAS', m: 'Contratos', cor: GOLD },
    { a: 'CUSTOMER SUCCESS', m: 'Retenção', cor: GREEN },
    { a: 'FINANCEIRO', m: 'Receita', cor: AMBER },
  ];
  return (
    <Slide bg="dark">
      <Titulo>O problema dos silos</Titulo>
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
      </div>
    </Slide>
  );
}

// 38 — O que é Revenue Operations?
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
    </Slide>
  );
}

// 40 — O ciclo de gestão da receita
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
    </Slide>
  );
}

/* ═══════════════════ BLOCO 6 — FECHAMENTO ═══════════════════ */

// 41 — O desafio final
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
      <SeloMagna />
    </Slide>
  );
}

// 42 — A grande síntese
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
  { id: 's06-iceberg', titulo: 'O iceberg do resultado', bloco: 'O problema', node: <SIceberg /> },
  { id: 's07-sistema-receita', titulo: 'O sistema da receita', bloco: 'O problema', node: <S05 /> },
  { id: 's08-diagnostico', titulo: 'A estratégia', bloco: 'Planejamento', node: <S06 /> },
  { id: 's09-ferramentas', titulo: 'Ferramentas', bloco: 'Planejamento', node: <S07 /> },
  { id: 's10-tobe-asis', titulo: 'To be / As is', bloco: 'Planejamento', node: <S08A /> },
  { id: 's11-swot', titulo: 'SWOT', bloco: 'Planejamento', node: <S08B /> },
  { id: 's12-motivadores', titulo: 'Motivadores estratégicos', bloco: 'Planejamento', node: <S08C /> },
  { id: 's13-mapa-meta', titulo: 'O mapa · próximo: META', bloco: 'Planejamento', node: <MapaReceita foco="META" /> },
  { id: 's14-motores', titulo: 'Os 4 motores', bloco: 'Planejamento', node: <S08 /> },
  { id: 's15-mapa-objetivos', titulo: 'Mapa de objetivos', bloco: 'Planejamento', node: <SMapaObjetivos /> },
  { id: 's16-mapa-comercial', titulo: 'O mapa · próximo: PLANEJAMENTO COMERCIAL', bloco: 'Planejamento', node: <MapaReceita foco="PLANEJAMENTO COMERCIAL" /> },
  { id: 's17-realidade', titulo: 'A realidade', bloco: 'Planejamento', node: <S12 /> },
  { id: 's18-topdown-bottomup', titulo: 'Top-down × Bottom-up', bloco: 'Planejamento', node: <S13 /> },
  { id: 's19-topdown', titulo: 'O que é top-down', bloco: 'Planejamento', node: <STopDown /> },
  { id: 's20-topdown-pratica', titulo: 'Top-down na prática · Beta', bloco: 'Planejamento', node: <STopDownPratica /> },
  { id: 's21-bottomup', titulo: 'O que é bottom-up', bloco: 'Planejamento', node: <SBottomUp /> },
  { id: 's22-bottomup-pratica', titulo: 'Bottom-up na prática · Beta', bloco: 'Planejamento', node: <SBottomUpPratica /> },
  { id: 's23-alpha', titulo: 'Caso Empresa Alpha', bloco: 'Planejamento', node: <S09 /> },
  { id: 's24-comecando-pelo-fim', titulo: 'Começando pelo fim', bloco: 'Planejamento', node: <S10 /> },
  { id: 's25-funil-reverso', titulo: 'O funil reverso', bloco: 'Planejamento', node: <S11 /> },
  { id: 's26-mapa-budget', titulo: 'O mapa · próximo: BUDGET', bloco: 'Planejamento', node: <MapaReceita foco="BUDGET" /> },
  { id: 's27-transicao-budget', titulo: 'Quanto custa?', bloco: 'Budget', node: <S15 /> },
  { id: 's28-o-que-e-budget', titulo: 'O que é budget?', bloco: 'Budget', node: <S16 /> },
  { id: 's29-o-que-entra', titulo: 'O que entra no budget', bloco: 'Budget', node: <S17 /> },
  { id: 's30-budget-alpha', titulo: 'Budget da Alpha', bloco: 'Budget', node: <S18 /> },
  { id: 's31-cenarios', titulo: 'Três cenários', bloco: 'Budget', node: <S19 /> },
  { id: 's34-mapa-pipeline', titulo: 'O mapa · próximo: EXECUÇÃO + PIPELINE', bloco: 'Forecast', node: <MapaReceita foco="EXECUÇÃO + PIPELINE" selo /> },
  { id: 's35-pipeline', titulo: 'O pipeline', bloco: 'Forecast', node: <S23 /> },
  { id: 's36-pipeline-nao-e-forecast', titulo: 'Pipeline não é forecast', bloco: 'Forecast', node: <S24 /> },
  { id: 's37-mapa-forecast', titulo: 'O mapa · próximo: FORECAST', bloco: 'Forecast', node: <MapaReceita foco="FORECAST" /> },
  { id: 's38-formula-forecast', titulo: 'A fórmula do ponderado', bloco: 'Forecast', node: <S25 /> },
  { id: 's39-coverage', titulo: 'Pipeline coverage', bloco: 'Forecast', node: <S26 /> },
  { id: 's40-saude-pipeline', titulo: 'Saúde do pipeline', bloco: 'Forecast', node: <S27 /> },
  { id: 's41-forecast-decisao', titulo: 'Forecast é decisão', bloco: 'Forecast', node: <S28 /> },
  { id: 's42-mapa-revops', titulo: 'O mapa · próximo: REVENUE OPERATIONS', bloco: 'RevOps', node: <MapaReceita foco="REVOPS" selo /> },
  { id: 's43-silos', titulo: 'O problema dos silos', bloco: 'RevOps', node: <S29 /> },
  { id: 's44-revops', titulo: 'O que é RevOps?', bloco: 'RevOps', node: <S30 /> },
  { id: 's45-ciclo-gestao', titulo: 'O ciclo de gestão', bloco: 'RevOps', node: <S32 /> },
  { id: 's46-desafio-final', titulo: 'O desafio final', bloco: 'Fechamento', node: <S33 /> },
  { id: 's47-sintese', titulo: 'A grande síntese', bloco: 'Fechamento', node: <S34 /> },
];

export default function AulaDeck({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [imprimindo, setImprimindo] = useState(false);
  const [pct, setPct] = useState(0);

  const go = useCallback((to: number) => {
    setIdx((cur) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, to));
      setDir(next >= cur ? 1 : -1);
      return next;
    });
  }, []);

  /**
   * Gera e BAIXA o PDF direto, sem passar pela tela de imprimir — mesmo caminho
   * que o /pitch usa (jsPDF + html2canvas, ambos já no projeto).
   *
   * O deck só monta o slide atual, então montamos os 47 fora da tela
   * (#deck-capture, em left:-100000px), esperamos as animações e os CountUp
   * assentarem — começam em opacity 0 e fotografar antes sairia em branco —,
   * fotografamos cada página e montamos o PDF.
   */
  const baixarPdf = useCallback(async () => {
    if (imprimindo) return;
    setImprimindo(true);
    setPct(0);
    await new Promise((r) => setTimeout(r, 2200));
    try {
      const [{ default: html2canvas }, jspdf] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const JsPDF = jspdf.jsPDF;

      /**
       * O html2canvas só entende cor no formato antigo (rgb/rgba). O Tailwind v4
       * escreve transparência como `color-mix(in oklab, ...)` — é no que
       * `bg-white/5` e `border-white/10` viram —, e nisso ele engasga e derruba
       * o PDF inteiro. (No Hub não acontece: lá é Tailwind v3, que gera rgba.)
       *
       * Copiar o getComputedStyle não resolve: o navegador devolve a cor ainda
       * em oklab. Então pedimos para ele PINTAR a cor num canvas 1×1 e lemos o
       * pixel — o que volta é rgba() puro, que o html2canvas lê.
       */
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const paraRgba = (cor: string): string => {
        if (!cx || !cor) return cor;
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = '#000';
        cx.fillStyle = cor;              // se o navegador não entender, fica no #000
        cx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      };

      const container = document.getElementById('deck-capture');
      container?.querySelectorAll<HTMLElement>('*').forEach((el) => {
        const cs = getComputedStyle(el);
        el.style.color = paraRgba(cs.color);
        // lado a lado: o atalho borderColor não cobre bordas de cores diferentes
        el.style.borderTopColor = paraRgba(cs.borderTopColor);
        el.style.borderRightColor = paraRgba(cs.borderRightColor);
        el.style.borderBottomColor = paraRgba(cs.borderBottomColor);
        el.style.borderLeftColor = paraRgba(cs.borderLeftColor);
        const fundo = paraRgba(cs.backgroundColor);
        // fundo invisível continua invisível — pintar por cima taparia o slide
        if (!fundo.endsWith(', 0.000)')) el.style.backgroundColor = fundo;
      });
      const pages = Array.from(document.querySelectorAll('#deck-capture .deck-capture-page')) as HTMLElement[];
      const W = 1280, H = 720;
      const pdf = new JsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: NAVY, logging: false, width: W, height: H, windowWidth: W, windowHeight: H });
        const img = canvas.toDataURL('image/jpeg', 0.9);
        if (i > 0) pdf.addPage([W, H], 'landscape');
        pdf.addImage(img, 'JPEG', 0, 0, W, H);
        setPct(Math.round(((i + 1) / pages.length) * 100));
        await new Promise((r) => setTimeout(r, 0)); // devolve o fôlego pro navegador redesenhar o botão
      }
      pdf.save('Aula-Planejamento-Comercial-Budget-Forecast.pdf');
    } catch (e) {
      // sem isto o erro some e sobra só o alerta genérico — foi o que atrasou o
      // diagnóstico da primeira vez que o PDF quebrou
      console.error('[deck] falhou ao gerar o PDF:', e);
      alert('Não consegui gerar o PDF automaticamente. Tente de novo em alguns segundos.');
    } finally {
      setImprimindo(false);
      setPct(0);
    }
  }, [imprimindo]);

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

  // São 47 slides — 47 dots viram um risco só. Mostramos uma janela de 10 que
  // acompanha o slide atual, mantendo-o no meio sempre que dá (nas pontas a
  // janela encosta e para, senão sobrariam espaços vazios).
  const DOTS_VISIVEIS = 10;
  const dotIni = Math.max(0, Math.min(idx - Math.floor(DOTS_VISIVEIS / 2), SLIDES.length - DOTS_VISIVEIS));

  return (
    <div className="deck-dark deck-live fixed inset-0 z-[70] overflow-hidden flex flex-col" style={{ backgroundColor: NAVY }}>
      {/* Pilha de captura: os 47 slides montados em 1280×720, jogados para fora
          da tela. Não pode ser display:none nem visibility:hidden — o
          html2canvas precisa que eles estejam realmente renderizados.
          Só existe enquanto o PDF é gerado. */}
      {imprimindo && (
        <div id="deck-capture" className="deck-dark" aria-hidden
          style={{ position: 'fixed', left: '-100000px', top: 0, width: 1280, pointerEvents: 'none' }}>
          {SLIDES.map((s) => (
            <div key={s.id} className="deck-capture-page"
              style={{ width: 1280, height: 720, overflow: 'hidden', position: 'relative', backgroundColor: NAVY }}>
              {s.node}
            </div>
          ))}
        </div>
      )}

      {/* topo */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/10 shrink-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Presentation className="w-4 h-4" style={{ color: BLUE }} />
          Planejamento Comercial, Budget e Forecast
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-[11px] font-normal text-slate-500">{atual.bloco}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* volta para o slide 1 — some no próprio slide 1, onde não serve para nada */}
          <button
            onClick={() => go(0)}
            disabled={idx === 0}
            title="Voltar ao começo da aula"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5"
          >
            <Home className="w-4 h-4" /> Início
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors">
            <XIcon className="w-4 h-4" /> Fechar
          </button>
        </div>
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
        <div className="flex items-center gap-1.5">
          {SLIDES.slice(dotIni, dotIni + DOTS_VISIVEIS).map((s, k) => {
            const i = dotIni + k;
            return (
              <button key={s.id} onClick={() => go(i)} title={`${i + 1}. ${s.titulo}`} className={`h-2 rounded-full transition-all shrink-0 ${i === idx ? 'w-6' : 'w-2 hover:w-4 hover:brightness-200'}`} style={{ background: i === idx ? BLUE : 'rgba(255,255,255,0.2)' }} aria-label={`Slide ${i + 1}: ${s.titulo}`} />
            );
          })}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* no último slide o "Próximo" não serve mais — o lugar vira o PDF */}
          {idx === SLIDES.length - 1 ? (
            <button
              onClick={baixarPdf}
              disabled={imprimindo}
              className="relative flex items-center gap-1.5 overflow-hidden text-sm font-bold text-white rounded-lg px-3.5 py-2 transition-all hover:scale-[1.03] disabled:hover:scale-100"
              style={{ background: `linear-gradient(to bottom right, ${GOLD}, #8f5f38)` }}
            >
              {/* a barra enche conforme cada slide é fotografado */}
              {imprimindo && (
                <span aria-hidden className="absolute inset-y-0 left-0 transition-[width] duration-300"
                  style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.28)' }} />
              )}
              <span className="relative flex items-center gap-1.5">
                {imprimindo
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> {pct}% gerando…</>
                  : <><Download className="w-4 h-4" /> Baixar PDF</>}
              </span>
            </button>
          ) : (
            <button onClick={() => go(idx + 1)} className="flex items-center gap-1.5 text-sm font-bold text-white rounded-lg px-3.5 py-2 transition-all" style={{ background: `linear-gradient(to bottom right, ${BLUE}, #0c6e9e)` }}>
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
