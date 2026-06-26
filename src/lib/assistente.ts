// Assistente local "converse com seus números" — responde por regras, sem IA paga.
import { Lancamento, Cliente, Funcionario } from "./db";
import { Metrica } from "./indicadores";
import { resumo, saldoCaixa, despesasPorCategoria, projecaoCaixa, custoFolha, serieFluxo } from "./calc";
import { brl, pct, rotuloMes, diasAte, mesDe, ultimosMeses } from "./format";

export type Tom = "good" | "warn" | "bad" | "info";
export type Bloco =
  | { tipo: "p"; texto: string; tom?: Tom }
  | { tipo: "kpi"; label: string; valor: string; tom?: Tom }
  | { tipo: "lista"; itens: { nome: string; valor: string; tom?: Tom }[] }
  | { tipo: "acao"; texto: string };
export type Resposta = { titulo: string; blocos: Bloco[] };
export type Ctx = { metrs: Metrica[]; lancs: Lancamento[]; clientes: Cliente[]; funcs: Funcionario[]; saldoInicial: number };
export type Pergunta = { id: string; chip: string; palavras: string[]; responder: (c: Ctx) => Resposta };

const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

// ---------- Respostas ----------
function rCaixa({ lancs, saldoInicial }: Ctx): Resposta {
  const saldo = saldoCaixa(lancs, saldoInicial);
  const proj = projecaoCaixa(lancs, saldoInicial, 6);
  const menor = proj.length ? Math.min(...proj.map((p) => p.saldo)) : saldo;
  const neg = proj.find((p) => p.saldo < 0);
  const blocos: Bloco[] = [
    { tipo: "kpi", label: "Saldo em caixa hoje", valor: brl(saldo), tom: saldo >= 0 ? "good" : "bad" },
  ];
  if (proj.length) {
    blocos.push({ tipo: "p", texto: `Pela projeção dos próximos 6 meses, o menor saldo chega a ${brl(menor)}.`, tom: menor >= 0 ? "info" : "bad" });
    if (neg) {
      blocos.push({ tipo: "acao", texto: `Atenção: no ritmo atual o caixa fica negativo em ${rotuloMes(neg.mes)}. Antecipe recebimentos ou segure despesas não essenciais.` });
    } else {
      blocos.push({ tipo: "p", texto: "Seu caixa se mantém positivo no período projetado. 👍", tom: "good" });
    }
  }
  return { titulo: "Como está seu caixa", blocos };
}

function rGastos({ lancs }: Ctx): Resposta {
  const meses = ultimosMeses(3);
  const cats = despesasPorCategoria(lancs, meses);
  const total = cats.reduce((a, c) => a + c.valor, 0);
  if (!total) return { titulo: "Onde você está gastando", blocos: [{ tipo: "p", texto: "Ainda não há despesas lançadas nos últimos 3 meses. Cadastre seus custos para eu te mostrar pra onde o dinheiro vai." }] };
  const top = cats.slice(0, 5);
  return {
    titulo: "Onde você está gastando (últimos 3 meses)",
    blocos: [
      { tipo: "p", texto: `Você gastou ${brl(total)} no total (média de ${brl(total / 3)}/mês).` },
      { tipo: "lista", itens: top.map((c) => ({ nome: c.categoria, valor: `${brl(c.valor)} · ${pct((c.valor / total) * 100)}` })) },
      { tipo: "acao", texto: `Seu maior gasto é "${top[0].categoria}" (${pct((top[0].valor / total) * 100)} do total). Vale revisar se dá pra reduzir ou renegociar.` },
    ],
  };
}

function rReceber({ lancs }: Ctx): Resposta {
  const abertas = lancs.filter((l) => l.tipo === "receita" && !l.pago);
  const total = abertas.reduce((a, l) => a + l.valor, 0);
  const vencidas = abertas.filter((l) => (diasAte(l.vencimento) ?? 1) < 0);
  const prox = abertas.filter((l) => { const d = diasAte(l.vencimento); return d !== null && d >= 0 && d <= 7; });
  const blocos: Bloco[] = [{ tipo: "kpi", label: "Total a receber em aberto", valor: brl(total), tom: "info" }];
  if (vencidas.length) blocos.push({ tipo: "acao", texto: `${vencidas.length} recebimento(s) atrasado(s), somando ${brl(vencidas.reduce((a, l) => a + l.valor, 0))}. Cobre esses clientes primeiro.` });
  if (prox.length) blocos.push({ tipo: "p", texto: `${prox.length} recebimento(s) entram em até 7 dias (${brl(prox.reduce((a, l) => a + l.valor, 0))}).`, tom: "good" });
  if (!total) blocos.push({ tipo: "p", texto: "Não há recebimentos em aberto registrados." });
  return { titulo: "Quanto você tem a receber", blocos };
}

function rPagar({ lancs }: Ctx): Resposta {
  const abertas = lancs.filter((l) => l.tipo === "despesa" && !l.pago);
  const total = abertas.reduce((a, l) => a + l.valor, 0);
  const vencidas = abertas.filter((l) => (diasAte(l.vencimento) ?? 1) < 0);
  const prox = abertas.filter((l) => { const d = diasAte(l.vencimento); return d !== null && d >= 0 && d <= 7; });
  const blocos: Bloco[] = [{ tipo: "kpi", label: "Total a pagar em aberto", valor: brl(total), tom: total > 0 ? "warn" : "good" }];
  if (vencidas.length) blocos.push({ tipo: "acao", texto: `${vencidas.length} conta(s) vencida(s) (${brl(vencidas.reduce((a, l) => a + l.valor, 0))}). Regularize para evitar juros e multa.` });
  if (prox.length) blocos.push({ tipo: "p", texto: `${prox.length} conta(s) vencem em até 7 dias (${brl(prox.reduce((a, l) => a + l.valor, 0))}).`, tom: "warn" });
  if (!total) blocos.push({ tipo: "p", texto: "Nenhuma conta a pagar em aberto. 👍", tom: "good" });
  return { titulo: "Quanto você tem a pagar", blocos };
}

function rLucro({ lancs, saldoInicial }: Ctx): Resposta {
  const meses = ultimosMeses(3);
  const r = resumo(lancs, meses, saldoInicial);
  const serie = serieFluxo(lancs, 3, saldoInicial);
  const ult = serie[serie.length - 1], pen = serie[serie.length - 2];
  const lucroMes = ult ? ult.entradas - ult.saidas : 0;
  const lucroPen = pen ? pen.entradas - pen.saidas : 0;
  const blocos: Bloco[] = [
    { tipo: "kpi", label: "Lucro (últimos 3 meses)", valor: brl(r.lucro), tom: r.lucro >= 0 ? "good" : "bad" },
    { tipo: "kpi", label: "Margem", valor: pct(r.margem), tom: r.margem >= 35 ? "good" : r.margem >= 20 ? "warn" : "bad" },
    { tipo: "p", texto: `Faturou ${brl(r.faturamento)} e gastou ${brl(r.despesas)} no período.` },
  ];
  if (pen) blocos.push({ tipo: "p", texto: `No último mês o resultado foi ${brl(lucroMes)} — ${lucroMes >= lucroPen ? "melhor" : "pior"} que o mês anterior (${brl(lucroPen)}).`, tom: lucroMes >= lucroPen ? "good" : "warn" });
  if (r.margem < 20) blocos.push({ tipo: "acao", texto: "Margem abaixo de 20%. Reveja preços ou corte custos para sobrar mais no fim do mês." });
  return { titulo: "Você está tendo lucro?", blocos };
}

function ultimaCompra(cli: Cliente, lancs: Lancamento[]): string | null {
  const dele = lancs.filter((l) => l.tipo === "receita" && (l.cliente_id === cli.id || (l.contato && l.contato === cli.nome)));
  if (!dele.length) return null;
  return dele.map((l) => l.data_competencia).sort().reverse()[0];
}

function rClientes({ clientes, lancs }: Ctx): Resposta {
  const mesAtual = ultimosMeses(1)[0];
  const novos = clientes.filter((c) => mesDe(c.criado_em) === mesAtual).length;
  const sumidos = clientes
    .map((c) => ({ c, u: ultimaCompra(c, lancs) }))
    .filter((x) => x.u && (diasAte(x.u) ?? 0) < -45);
  const blocos: Bloco[] = [
    { tipo: "kpi", label: "Clientes cadastrados", valor: num(clientes.length), tom: "info" },
  ];
  if (novos) blocos.push({ tipo: "p", texto: `${novos} cliente(s) novo(s) este mês. 🎉`, tom: "good" });
  if (sumidos.length) {
    blocos.push({ tipo: "p", texto: `${sumidos.length} cliente(s) sem comprar há mais de 45 dias:`, tom: "warn" });
    blocos.push({ tipo: "lista", itens: sumidos.slice(0, 6).map((x) => ({ nome: x.c.nome, valor: `última compra ${rotuloMes(mesDe(x.u as string))}`, tom: "warn" as Tom })) });
    blocos.push({ tipo: "acao", texto: "Faça um contato de reativação com esses clientes — uma mensagem ou oferta costuma trazer parte deles de volta." });
  } else if (clientes.length) {
    blocos.push({ tipo: "p", texto: "Nenhum cliente sumido no radar. 👍", tom: "good" });
  }
  if (!clientes.length) blocos.push({ tipo: "p", texto: "Você ainda não cadastrou clientes. Cadastre em 'Clientes & Vendas' para acompanhar quem compra e quem sumiu." });
  return { titulo: "Como estão seus clientes", blocos };
}

function rFolha({ funcs, lancs, saldoInicial }: Ctx): Resposta {
  const cf = custoFolha(funcs);
  const r = resumo(lancs, ultimosMeses(3), saldoInicial);
  const fatMes = r.faturamento / 3;
  const peso = fatMes > 0 ? (cf.total / fatMes) * 100 : 0;
  const blocos: Bloco[] = [
    { tipo: "kpi", label: "Custo mensal da equipe", valor: brl(cf.total), tom: "info" },
    { tipo: "p", texto: `${cf.ativos} pessoa(s) ativa(s) — ${brl(cf.salarios)} de salários + ${brl(cf.total - cf.salarios)} de benefícios.` },
  ];
  if (fatMes > 0) {
    blocos.push({ tipo: "p", texto: `A folha representa ${pct(peso)} do seu faturamento médio mensal.`, tom: peso <= 30 ? "good" : peso <= 45 ? "warn" : "bad" });
    if (peso > 45) blocos.push({ tipo: "acao", texto: "A folha está pesada (acima de 45% do faturamento). Avalie produtividade por pessoa antes de contratar mais." });
  }
  if (!cf.ativos) blocos.push({ tipo: "p", texto: "Nenhum colaborador cadastrado em 'Equipe'." });
  return { titulo: "Quanto custa sua equipe", blocos };
}

// Plano da semana — junta o que é mais urgente.
function rPlano(c: Ctx): Resposta {
  const { lancs, saldoInicial } = c;
  const acoes: string[] = [];
  const vencPagar = lancs.filter((l) => l.tipo === "despesa" && !l.pago && (diasAte(l.vencimento) ?? 1) < 0);
  const vencReceber = lancs.filter((l) => l.tipo === "receita" && !l.pago && (diasAte(l.vencimento) ?? 1) < 0);
  const proxPagar = lancs.filter((l) => { const d = diasAte(l.vencimento); return l.tipo === "despesa" && !l.pago && d !== null && d >= 0 && d <= 7; });
  if (vencPagar.length) acoes.push(`Pagar/renegociar ${vencPagar.length} conta(s) vencida(s) (${brl(vencPagar.reduce((a, l) => a + l.valor, 0))}).`);
  if (vencReceber.length) acoes.push(`Cobrar ${vencReceber.length} recebimento(s) atrasado(s) (${brl(vencReceber.reduce((a, l) => a + l.valor, 0))}).`);
  if (proxPagar.length) acoes.push(`Separar caixa para ${proxPagar.length} conta(s) que vencem nesta semana (${brl(proxPagar.reduce((a, l) => a + l.valor, 0))}).`);
  const proj = projecaoCaixa(lancs, saldoInicial, 6);
  const neg = proj.find((p) => p.saldo < 0);
  if (neg) acoes.push(`Planejar o caixa: a projeção fica negativa em ${rotuloMes(neg.mes)}.`);
  const r = resumo(lancs, ultimosMeses(3), saldoInicial);
  if (r.margem < 20 && r.faturamento > 0) acoes.push("Revisar preços/custos: a margem está abaixo de 20%.");
  const sumidos = c.clientes.map((x) => ({ x, u: ultimaCompra(x, lancs) })).filter((y) => y.u && (diasAte(y.u) ?? 0) < -45);
  if (sumidos.length) acoes.push(`Reativar ${sumidos.length} cliente(s) que sumiram (sem comprar há +45 dias).`);

  const blocos: Bloco[] = acoes.length
    ? acoes.map((t) => ({ tipo: "acao", texto: t } as Bloco))
    : [{ tipo: "p", texto: "Está tudo em dia por aqui — nenhuma pendência urgente. 🎉 Continue lançando seus dados para manter o acompanhamento.", tom: "good" }];
  return { titulo: "O que fazer esta semana", blocos };
}

export const PERGUNTAS: Pergunta[] = [
  { id: "plano", chip: "O que fazer esta semana?", palavras: ["fazer", "semana", "plano", "prioridade", "urgente", "agora"], responder: rPlano },
  { id: "caixa", chip: "Como está meu caixa?", palavras: ["caixa", "saldo", "dinheiro", "sobra", "conta"], responder: rCaixa },
  { id: "lucro", chip: "Estou tendo lucro?", palavras: ["lucro", "margem", "lucrando", "ganhando", "resultado"], responder: rLucro },
  { id: "gastos", chip: "Onde gasto mais?", palavras: ["gasto", "gastando", "despesa", "custo", "caro", "gastos"], responder: rGastos },
  { id: "receber", chip: "Quanto tenho a receber?", palavras: ["receber", "receb", "cobrar", "clientes devem", "entrar"], responder: rReceber },
  { id: "pagar", chip: "Quanto tenho a pagar?", palavras: ["pagar", "devo", "boleto", "vencer", "vencida", "vencido"], responder: rPagar },
  { id: "clientes", chip: "Como estão meus clientes?", palavras: ["cliente", "clientes", "sumido", "sumiram", "churn", "reativar"], responder: rClientes },
  { id: "folha", chip: "Quanto custa minha equipe?", palavras: ["folha", "equipe", "funcionario", "funcionário", "salario", "salário", "colaborador"], responder: rFolha },
];

/** Casa o texto livre do usuário com a pergunta mais provável (sem IA). */
export function responder(texto: string, ctx: Ctx): Resposta {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let melhor: Pergunta | null = null, melhorScore = 0;
  for (const p of PERGUNTAS) {
    let s = 0;
    for (const w of p.palavras) if (t.includes(w.normalize("NFD").replace(/[̀-ͯ]/g, ""))) s++;
    if (s > melhorScore) { melhorScore = s; melhor = p; }
  }
  if (melhor && melhorScore > 0) return melhor.responder(ctx);
  return {
    titulo: "Posso te ajudar com isto",
    blocos: [
      { tipo: "p", texto: "Não entendi bem a pergunta, mas consigo responder sobre:" },
      { tipo: "lista", itens: PERGUNTAS.map((p) => ({ nome: p.chip, valor: "" })) },
      { tipo: "p", texto: "Toque em uma das sugestões abaixo. 👇", tom: "info" },
    ],
  };
}
