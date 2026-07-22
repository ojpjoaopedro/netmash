'use client';

/**
 * Simulador de CRM da aula — pipeline, forecast e cobertura.
 *
 * Tudo mora no navegador do aluno (localStorage). Não há banco: são dados
 * fictícios, feitos para treinar o raciocínio, não para guardar cliente real.
 */

export type Temperatura = 'quente' | 'morno' | 'frio';

export type Lead = {
  id: string;
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  valor: number;
  origem: string;
  responsavel: string;
  entrada: string;        // AAAA-MM-DD — quando entrou no funil
  etapa: string;          // id da etapa onde está
  temperatura: Temperatura;
  diasNaEtapa: number;
  notaVendedor: number;   // 0 a 10 — a leitura de quem atende (qualitativo)
  extras?: Record<string, string>;   // campos criados pelo aluno, por id do campo
};

/** `ganho` marca a etapa de fechamento: o que chega lá virou venda realizada. */
export type Etapa = { id: string; nome: string; ganho?: boolean };

/**
 * Campo criado pelo aluno dentro de um card. A definição é do QUADRO, não do
 * card: criou em um, aparece em todos — como acontece num CRM de verdade.
 */
export type CampoExtra = { id: string; nome: string };

/**
 * `identificado` e `metaDefinida` guardam as duas perguntas de abertura: quem
 * está treinando e qual é o alvo. Elas aparecem uma única vez, nesta ordem.
 */
export type Treino = {
  etapas: Etapa[]; leads: Lead[]; meta: number;
  empresa?: string;
  responsavel?: string;
  identificado?: boolean;
  metaDefinida?: boolean;
  campos?: CampoExtra[];
  revops?: RevOps;
};

export const CHAVE = 'treino-pipeline';

export const novoId = () => `x${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Sugestão de partida — o aluno renomeia, apaga e acrescenta o que quiser. */
export const ETAPAS_SUGERIDAS: { nome: string; ganho?: boolean }[] = [
  { nome: 'Lead' }, { nome: 'Diagnóstico' }, { nome: 'Proposta' },
  { nome: 'Negociação' }, { nome: 'Fechamento', ganho: true },
];

export const VAZIO: Treino = { etapas: [], leads: [], meta: 30000 };

/* ══════════════ datas e dinheiro em português ══════════════ */

/** "2026-07-01" → "01/07/2026" */
export const isoParaBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** "01/07/2026" → "2026-07-01". Devolve "" enquanto a data não estiver completa. */
export function brParaIso(br: string): string {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/**
 * Máscara dd/mm/aaaa enquanto digita.
 *
 * Os campos de data são texto, e não <input type="date">: o formato daquele
 * input segue o idioma do navegador — no Chrome em inglês ele mostra mm/dd/aaaa
 * e não há como forçar pelo código. Com texto mascarado, é sempre pt-BR.
 */
export function mascaraData(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/** 30000 → "30.000" */
export const milhar = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/** "R$ 30.000" → 30000 */
export const soDigitos = (s: string) => Number(s.replace(/\D/g, '')) || 0;

/* ══════════════ gerador de leads fictícios ══════════════ */

const NOMES = ['Ana Prado', 'Bruno Salles', 'Carla Menezes', 'Diego Fontes', 'Elisa Rocha', 'Fábio Nunes',
  'Gabriela Lima', 'Henrique Dias', 'Isabela Cruz', 'João Beltrão', 'Karina Alves', 'Lucas Amaral',
  'Marina Teixeira', 'Nelson Barros', 'Olívia Castro', 'Paulo Rezende', 'Renata Vieira', 'Sérgio Pinto',
  'Tatiana Moraes', 'Vitor Camargo'];

const EMPRESAS = ['Aurora Alimentos', 'Bracco Log', 'Cedro Contábil', 'Delta Odonto', 'Evolve Fitness',
  'Fortale Engenharia', 'Grão Nobre Café', 'Horizonte Seguros', 'Ícaro Tecnologia', 'Juntos Educação',
  'Kaeru Sushi', 'Lumen Clínicas', 'Módulo Móveis', 'Nortec Indústria', 'Oficina do Som',
  'Prisma Arquitetura', 'Quadra Esportes', 'Raiz Agro', 'Sirius Pet', 'Trilha Turismo'];

const ORIGENS = ['Indicação', 'Site', 'Tráfego pago', 'Prospecção ativa', 'Evento', 'Instagram'];
const RESPONSAVEIS = ['Você', 'Marcos (SDR)', 'Paula (closer)', 'Rafa (closer)'];
const TEMPERATURAS: Temperatura[] = ['quente', 'morno', 'frio'];

const sorteia = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const entre = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Sorteio triangular: a maioria cai perto da moda, os extremos são raros.
 * A média de um triangular é (min + moda + max) / 3 — com (8, 12, 40) dá 20,
 * que é o ticket médio pedido, sem que todo negócio valha a mesma coisa.
 */
function triangular(min: number, moda: number, max: number): number {
  const u = Math.random();
  const c = (moda - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (moda - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - moda));
}

/** Ticket do negócio a partir da meta: ~20% dela, variando de 8% a 40%. */
export function ticketDaMeta(meta: number): number {
  const pct = triangular(8, 12, 40) / 100;
  return Math.max(100, Math.round((meta * pct) / 100) * 100);
}

/**
 * Data de entrada dentro do mês corrente (dia 1 até hoje).
 *
 * É de propósito: o filtro de período já abre no mês, então todo lead gerado
 * aparece na hora. Espalhar por 90 dias faria metade nascer escondida atrás do
 * filtro — o aluno clicaria em "+5" e veria 2, achando que quebrou.
 */
function dataNoMes(): string {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), entre(1, hoje.getDate()));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Quantos negócios cada clique em "preencher" acrescenta. */
export const LOTE = 5;

/**
 * Leads espalhados pelas etapas. O funil afunila de propósito: as primeiras
 * etapas recebem mais gente que as últimas, como num pipeline de verdade.
 *
 * Vem de 5 em 5 (e não de uma vez): o aluno enche o funil no ritmo dele e vê o
 * forecast se mexer a cada lote.
 */
export function gerarLeads(etapas: Etapa[], meta: number, quantidade = LOTE): Lead[] {
  if (!etapas.length) return [];
  const usados = new Set<string>();
  const leads: Lead[] = [];

  for (let i = 0; i < quantidade; i++) {
    // peso decrescente: quanto mais adiante a etapa, menos leads caem nela
    const pesos = etapas.map((_, k) => etapas.length - k);
    const total = pesos.reduce((a, b) => a + b, 0);
    let sorte = Math.random() * total;
    let idx = 0;
    for (let k = 0; k < pesos.length; k++) { sorte -= pesos[k]; if (sorte <= 0) { idx = k; break; } }

    // nome e empresa não repetem enquanto houver combinação livre
    let nome = sorteia(NOMES), empresa = sorteia(EMPRESAS), tentativas = 0;
    while (usados.has(nome + empresa) && tentativas++ < 40) { nome = sorteia(NOMES); empresa = sorteia(EMPRESAS); }
    usados.add(nome + empresa);

    leads.push({
      id: novoId(),
      nome,
      empresa,
      telefone: `(${entre(11, 89)}) 9${entre(1000, 9999)}-${entre(1000, 9999)}`,
      email: `${nome.split(' ')[0].toLowerCase()}@${empresa.split(' ')[0].toLowerCase()}.com.br`,
      // na 1ª etapa é lead cru: ainda não tem valor de negociação
      valor: idx === 0 ? 0 : ticketDaMeta(meta),
      origem: sorteia(ORIGENS),
      responsavel: sorteia(RESPONSAVEIS),
      entrada: dataNoMes(),
      etapa: etapas[idx].id,
      temperatura: sorteia(TEMPERATURAS),
      // quanto mais adiante no funil, mais tempo o lead costuma ter de estrada
      diasNaEtapa: entre(1, 12 + idx * 14),
      notaVendedor: entre(3, 9),
    });
  }
  return leads;
}

/** Negócio criado à mão pelo aluno: entra em branco, para ele preencher. */
export function novoLeadManual(etapaId: string): Lead {
  const hoje = new Date();
  return {
    id: novoId(),
    nome: '', empresa: '', telefone: '', email: '',
    valor: 0,   // lead cru: o valor aparece quando ele for qualificado
    origem: 'Prospecção ativa',
    responsavel: 'Você',
    entrada: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`,
    etapa: etapaId,
    temperatura: 'morno',
    diasNaEtapa: 0,
    notaVendedor: 5,
  };
}

/* ══════════════ a matemática do forecast ══════════════ */

/**
 * A TEMPERATURA é a âncora da chance — é ela que carrega a faixa que o aluno
 * aprende na aula. Etapa, tempo parado e nota só ajustam em volta dela.
 *
 * Antes a temperatura era um multiplicador sobre a etapa, e um lead "quente"
 * podia aparecer com 7% de chance — o rótulo dizia uma coisa e a conta, outra.
 */
export const BASE_TEMPERATURA: Record<Temperatura, number> = { quente: 0.85, morno: 0.5, frio: 0.18 };

/** O texto da faixa, mostrado no próprio botão de temperatura. */
export const FAIXA_TEMPERATURA: Record<Temperatura, string> = {
  quente: 'acima de 80% de fechamento',
  morno: 'média de 50% de fechamento',
  frio: 'até 20% de chance de fechamento',
};

/** A etapa ajusta ±10%: no começo do funil segura, perto do fim empurra. */
export function fatorEtapa(indice: number, total: number): number {
  if (total <= 1) return 1;
  return 0.9 + (indice / (total - 1)) * 0.2;
}

/** Lead parado apodrece: até 15 dias não pesa; depois cai até a metade. */
export function fatorTempo(dias: number): number {
  if (dias <= 15) return 1;
  return Math.max(0.5, 1 - (dias - 15) / 60);
}

/** A nota de quem atende (0–10) move a chance em ±15%. */
export function fatorNota(nota: number): number {
  return 0.85 + (Math.min(10, Math.max(0, nota)) / 10) * 0.3;
}

/** Chance final de fechar, entre 2% e 92% — nunca 0, nunca certeza. */
export function probabilidade(lead: Lead, indiceEtapa: number, totalEtapas: number): number {
  const p = BASE_TEMPERATURA[lead.temperatura]
    * fatorEtapa(indiceEtapa, totalEtapas)
    * fatorTempo(lead.diasNaEtapa)
    * fatorNota(lead.notaVendedor);
  return Math.min(0.92, Math.max(0.02, p));
}

export type LinhaForecast = { lead: Lead; etapa: string; prob: number; ponderado: number };

export type Resultado = {
  linhas: LinhaForecast[];   // só os negócios ABERTOS
  realizado: number;         // o que já fechou (etapa de ganho)
  pipeline: number;          // soma do que está aberto
  forecast: number;          // soma de (valor × chance) dos abertos
  projecao: number;          // realizado + forecast — onde o mês deve terminar
  faltante: number;          // quanto ainda falta para a meta
  cobertura: number;         // pipeline ÷ o que falta
  chanceMedia: number;       // média ponderada pelo valor
  atingimento: number;       // realizado ÷ meta — é o ponteiro do velocímetro
};

/**
 * Separa o que já fechou do que ainda está aberto.
 *
 * A chance de cada aberto é medida entre as etapas ABERTAS (a de fechamento fica
 * fora da conta): senão a última etapa antes do ganho nunca alcançaria a base
 * cheia, e um negócio em "Negociação" pareceria mais frouxo do que é.
 */
export function calcular(etapas: Etapa[], leads: Lead[], meta: number): Resultado {
  const abertas = etapas.filter((e) => !e.ganho);
  const idsGanho = new Set(etapas.filter((e) => e.ganho).map((e) => e.id));

  const realizado = leads.filter((l) => idsGanho.has(l.etapa)).reduce((s, l) => s + l.valor, 0);

  // valor 0 = lead cru da 1ª etapa: ainda não é oportunidade, fica fora do
  // pipeline e do forecast. Lead não é negócio — é a distinção que a aula faz.
  const linhas = leads
    .filter((l) => !idsGanho.has(l.etapa) && l.valor > 0)
    .map((lead) => {
      const i = Math.max(0, abertas.findIndex((e) => e.id === lead.etapa));
      const prob = probabilidade(lead, i, abertas.length);
      return { lead, etapa: abertas[i]?.nome ?? '—', prob, ponderado: lead.valor * prob };
    });

  const pipeline = linhas.reduce((s, l) => s + l.lead.valor, 0);
  const forecast = linhas.reduce((s, l) => s + l.ponderado, 0);
  const faltante = Math.max(0, meta - realizado);

  return {
    linhas,
    realizado,
    pipeline,
    forecast,
    projecao: realizado + forecast,
    faltante,
    cobertura: faltante > 0 ? pipeline / faltante : 0,
    chanceMedia: pipeline > 0 ? forecast / pipeline : 0,
    atingimento: meta > 0 ? realizado / meta : 0,
  };
}

/* ══════════════ painel de resultados ══════════════ */

export type Estatisticas = {
  leadsAbertos: number;
  vendas: number;              // negócios que chegaram ao fechamento
  ticketMedio: number;         // média de todos os negócios do período
  ticketMedioVenda: number;    // média só das vendas fechadas
  cicloMedio: number;          // dias da entrada até fechar (média das vendas)
  idadeMediaFunil: number;     // dias de estrada dos que seguem abertos
  paradoMedio: number;         // dias parados na etapa atual (abertos)
  porEtapa: { nome: string; qtd: number; valor: number; ganho: boolean }[];
  porTemperatura: { t: Temperatura; qtd: number; valor: number }[];
  insights: string[];
};

/** Dias entre a entrada do negócio e hoje. */
function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(`${iso}T12:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

const media = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

export function estatisticas(etapas: Etapa[], leads: Lead[], r: Resultado): Estatisticas {
  const idsGanho = new Set(etapas.filter((e) => e.ganho).map((e) => e.id));
  const fechados = leads.filter((l) => idsGanho.has(l.etapa));
  const abertos = leads.filter((l) => !idsGanho.has(l.etapa));

  const porEtapa = etapas.map((e) => {
    const ls = leads.filter((l) => l.etapa === e.id);
    return { nome: e.nome, qtd: ls.length, valor: ls.reduce((s, l) => s + l.valor, 0), ganho: !!e.ganho };
  });

  const porTemperatura = (['quente', 'morno', 'frio'] as Temperatura[]).map((t) => {
    const ls = abertos.filter((l) => l.temperatura === t);
    return { t, qtd: ls.length, valor: ls.reduce((s, l) => s + l.valor, 0) };
  });

  /* ── insights: o que o aluno deveria estar vendo e costuma passar batido ── */
  const insights: string[] = [];
  const travados = abertos.filter((l) => l.diasNaEtapa > 30);
  const frios = porTemperatura.find((x) => x.t === 'frio');
  const maior = [...abertos].sort((a, b) => b.valor - a.valor)[0];
  const gargalo = [...porEtapa].filter((e) => !e.ganho).sort((a, b) => b.qtd - a.qtd)[0];

  if (!leads.length) insights.push('Ainda não há negócios no período escolhido.');
  if (r.faltante === 0 && leads.length) insights.push(`Meta batida: ${brl(r.realizado)} fechados.`);
  else if (r.cobertura > 0 && r.cobertura < 3) {
    insights.push(`Cobertura de ${r.cobertura.toFixed(1)}x sobre o que falta — abaixo de 3x. Falta pipeline, não esforço.`);
  }
  if (travados.length) {
    insights.push(`${travados.length} negócio(s) parado(s) há mais de 30 dias, somando ${brl(travados.reduce((s, l) => s + l.valor, 0))}. Negócio parado infla o forecast.`);
  }
  if (frios && r.pipeline > 0 && frios.valor / r.pipeline > 0.4) {
    insights.push(`${Math.round((frios.valor / r.pipeline) * 100)}% do pipeline aberto está frio — o volume engana se a temperatura não acompanha.`);
  }
  if (maior && r.pipeline > 0 && maior.valor / r.pipeline > 0.3) {
    insights.push(`${maior.nome} (${brl(maior.valor)}) sozinho é ${Math.round((maior.valor / r.pipeline) * 100)}% do pipeline. Se cair, o mês cai junto.`);
  }
  if (gargalo && gargalo.qtd > 0 && abertos.length >= 4 && gargalo.qtd / abertos.length > 0.4) {
    insights.push(`A etapa "${gargalo.nome}" concentra ${gargalo.qtd} dos ${abertos.length} negócios abertos — provável gargalo.`);
  }
  if (!insights.length) insights.push('Pipeline equilibrado: nada gritando por atenção neste período.');

  return {
    leadsAbertos: abertos.length,
    vendas: fechados.length,
    ticketMedio: media(leads.map((l) => l.valor)),
    ticketMedioVenda: media(fechados.map((l) => l.valor)),
    cicloMedio: media(fechados.map((l) => diasDesde(l.entrada))),
    idadeMediaFunil: media(abertos.map((l) => diasDesde(l.entrada))),
    paradoMedio: media(abertos.map((l) => l.diasNaEtapa)),
    porEtapa,
    porTemperatura,
    insights,
  };
}

/* ══════════════ revenue operations ══════════════ */

export type AreaCusto = 'marketing' | 'comercial' | 'cs' | 'financeiro' | 'outros';

export const AREAS: AreaCusto[] = ['marketing', 'comercial', 'cs', 'financeiro', 'outros'];

/**
 * O rótulo diz o que entra no campo antes de dizer de quem é o custo: sem isso
 * o aluno lança só o salário e o CAC sai barato demais.
 */
export const ROTULO_AREA: Record<AreaCusto, string> = {
  marketing: 'Salários + ferramentas · Marketing',
  comercial: 'Salários + ferramentas · Comercial',
  cs: 'Salários + ferramentas · CS / pós-venda',
  financeiro: 'Salários + ferramentas · Financeiro',
  outros: 'Outros',
};

/**
 * Os números que só o aluno sabe. Nada aqui é calculado a partir do quadro: é
 * de propósito. A tela só roda depois que ele assume um CAC e um custo por
 * lead — sem isso, qualquer projeção seria chute embrulhado em gráfico.
 */
export type RevOps = {
  publicidade: number;                    // mídia paga no mês
  areas: Record<AreaCusto, number>;       // custo mensal de cada área
  equipe: number;                         // pessoas vendendo
  conversao: number;                      // % de leads que viram venda
  cac: number;                            // custo de aquisição por cliente
  custoLead: number;                      // quanto custa gerar um lead
  custoVendedor: number;                  // custo mensal de uma pessoa no comercial
};

export const REVOPS_VAZIO: RevOps = {
  publicidade: 0,
  areas: { marketing: 0, comercial: 0, cs: 0, financeiro: 0, outros: 0 },
  equipe: 0, conversao: 0, cac: 0, custoLead: 0, custoVendedor: 0,
};

/** O que o próprio quadro já entrega para a conta. */
export type BaseRevOps = {
  leads: number;         // negócios no período
  vendas: number;        // os que chegaram ao fechamento
  ticketVenda: number;   // ticket médio do que fechou
  receita: number;       // realizado
  pipeline: number;
  forecast: number;
};

export type ContaRevOps = {
  pronto: boolean;
  faltando: string[];
  custoAreas: number;
  custoTotal: number;         // áreas + mídia
  custoSobreReceita: number;
  cacReal: number;            // custo total ÷ vendas do quadro
  custoLeadReal: number;      // mídia ÷ leads do quadro
  conversaoReal: number;      // vendas ÷ leads do quadro (0 a 1)
  margemVenda: number;        // ticket − CAC informado
  retornoPorReal: number;     // receita ÷ custo total
  vendasPorPessoa: number;
  receitaPorPessoa: number;
};

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export function contaRevOps(rev: RevOps, base: BaseRevOps): ContaRevOps {
  const faltando: string[] = [];
  if (rev.publicidade <= 0) faltando.push('valor atual de publicidade');
  if (rev.equipe <= 0) faltando.push('quantidade de pessoas na equipe');
  if (rev.conversao <= 0) faltando.push('taxa de conversão');
  if (rev.cac <= 0) faltando.push('CAC');
  if (rev.custoLead <= 0) faltando.push('custo por lead');

  const custoAreas = AREAS.reduce((s, a) => s + (rev.areas[a] || 0), 0);
  const custoTotal = custoAreas + rev.publicidade;

  return {
    pronto: faltando.length === 0,
    faltando,
    custoAreas,
    custoTotal,
    custoSobreReceita: div(custoTotal, base.receita),
    cacReal: div(custoTotal, base.vendas),
    custoLeadReal: div(rev.publicidade, base.leads),
    conversaoReal: div(base.vendas, base.leads),
    margemVenda: base.ticketVenda - rev.cac,
    retornoPorReal: div(base.receita, custoTotal),
    vendasPorPessoa: div(base.vendas, rev.equipe),
    receitaPorPessoa: div(base.receita, rev.equipe),
  };
}

export type SimMidia = {
  extra: number;
  leadsNovos: number;
  vendasNovas: number;
  receitaNova: number;
  resultado: number;    // receita nova − o que foi investido
  retorno: number;      // quantos reais voltam por real investido
  cacDoIncremento: number;
};

/** Mais mídia: o dinheiro vira lead, o lead vira venda pela taxa informada. */
export function simularMidia(rev: RevOps, base: BaseRevOps, extra: number): SimMidia {
  const leadsNovos = div(extra, rev.custoLead);
  const vendasNovas = leadsNovos * (rev.conversao / 100);
  const receitaNova = vendasNovas * base.ticketVenda;
  return {
    extra,
    leadsNovos,
    vendasNovas,
    receitaNova,
    resultado: receitaNova - extra,
    retorno: div(receitaNova, extra),
    cacDoIncremento: div(extra, vendasNovas),
  };
}

export type SimEquipe = {
  novos: number;
  vendasNovas: number;
  receitaNova: number;
  custoEquipe: number;
  leadsNecessarios: number;
  midiaNecessaria: number;   // para alimentar quem entrou
  custoTotalDaJogada: number;
  resultado: number;
};

/**
 * Mais gente vendendo. O detalhe que quase todo mundo esquece: vendedor novo
 * precisa de lead novo. A conta soma o custo da mídia que sustenta a produção
 * dele, senão a contratação parece barata e não é.
 */
export function simularEquipe(rev: RevOps, base: BaseRevOps, novos: number, conta: ContaRevOps): SimEquipe {
  const vendasNovas = conta.vendasPorPessoa * novos;
  const receitaNova = vendasNovas * base.ticketVenda;
  const custoEquipe = rev.custoVendedor * novos;
  const leadsNecessarios = div(vendasNovas, rev.conversao / 100);
  const midiaNecessaria = leadsNecessarios * rev.custoLead;
  const custoTotalDaJogada = custoEquipe + midiaNecessaria;
  return {
    novos, vendasNovas, receitaNova, custoEquipe,
    leadsNecessarios, midiaNecessaria, custoTotalDaJogada,
    resultado: receitaNova - custoTotalDaJogada,
  };
}

/** A leitura em texto: o que os números acima estão dizendo na prática. */
export function insightsRevOps(rev: RevOps, base: BaseRevOps, c: ContaRevOps, midia: SimMidia, equipe: SimEquipe): string[] {
  const t: string[] = [];

  if (c.margemVenda <= 0) {
    t.push(`Cada venda entra ${brl(base.ticketVenda)} e custa ${brl(rev.cac)} para ser conquistada: você paga para vender. Antes de investir mais, o ticket precisa subir ou o CAC precisa cair.`);
  } else {
    t.push(`Sobra ${brl(c.margemVenda)} por venda depois do CAC (${Math.round((c.margemVenda / base.ticketVenda) * 100)}% do ticket). É essa sobra que banca todo o resto da operação.`);
  }

  if (base.vendas > 0 && c.cacReal > 0) {
    const dif = c.cacReal - rev.cac;
    if (Math.abs(dif) > rev.cac * 0.2) {
      t.push(dif > 0
        ? `Você trabalha com CAC de ${brl(rev.cac)}, mas dividindo TODO o custo da operação (${brl(c.custoTotal)}) pelas ${base.vendas} vendas do período dá ${brl(c.cacReal)}. O CAC real é ${brl(dif)} maior — a conta que você usa só enxerga a mídia.`
        : `O custo por venda incluindo a operação inteira (${brl(c.cacReal)}) está abaixo do CAC que você assume (${brl(rev.cac)}). Ou o período foi bom, ou o CAC informado está conservador.`);
    }
  }

  if (base.leads > 0) {
    const dif = c.conversaoReal * 100 - rev.conversao;
    if (Math.abs(dif) >= 3) {
      t.push(dif > 0
        ? `O quadro converteu ${pctFino(c.conversaoReal)} dos negócios, acima dos ${rev.conversao}% que você usa na conta. Se a taxa real se sustentar, toda projeção aqui está subestimada.`
        : `O quadro converteu ${pctFino(c.conversaoReal)}, abaixo dos ${rev.conversao}% que você usa na conta. Projetar com a taxa otimista é o jeito mais comum de furar meta.`);
    }
  }

  if (midia.extra > 0) {
    t.push(midia.retorno >= 1
      ? `Mais ${brl(midia.extra)} em mídia devolvem ${brl(midia.receitaNova)} (${midia.retorno.toFixed(1)}x). Enquanto o retorno passar de 1x e a equipe der conta do volume, este é o caminho mais rápido de crescer.`
      : `Mais ${brl(midia.extra)} em mídia devolvem só ${brl(midia.receitaNova)} (${midia.retorno.toFixed(1)}x): você perderia ${brl(Math.abs(midia.resultado))}. Com esse custo por lead e essa conversão, aumentar verba não resolve.`);
  }

  if (equipe.novos > 0) {
    t.push(equipe.resultado >= 0
      ? `Cada pessoa a mais produz ${equipe.vendasNovas.toFixed(1)} venda(s) no ritmo atual — mas precisa de ${Math.ceil(equipe.leadsNecessarios)} lead(s), o que pede ${brl(equipe.midiaNecessaria)} de mídia além do salário. Contando os dois, sobram ${brl(equipe.resultado)}.`
      : `Contratar ${equipe.novos} pessoa(s) custa ${brl(equipe.custoTotalDaJogada)} entre time e mídia para gerar ${brl(equipe.receitaNova)}: fecha ${brl(Math.abs(equipe.resultado))} no vermelho. Contratar antes de resolver a geração de leads é dar ao vendedor um funil vazio.`);
  }

  if (c.custoSobreReceita > 0) {
    t.push(`A operação inteira custa ${pct(c.custoSobreReceita)} da receita realizada, e cada real investido devolve ${c.retornoPorReal.toFixed(2)}.`);
  }

  if (base.vendas === 0) t.push('Ainda não há venda fechada no período: as projeções usam o ticket do que já fechou e vão ficar em zero até a primeira venda entrar.');

  return t;
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

/**
 * Porcentagem com uma casa quando ela é pequena. Taxa de conversão costuma
 * viver abaixo de 10%: arredondar 1,3% para "1%" apaga justamente a diferença
 * que muda a projeção.
 */
export const pctFino = (v: number) =>
  `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: v < 0.1 ? 1 : 0 })}%`;
