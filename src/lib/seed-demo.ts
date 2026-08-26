/**
 * Preenche a empresa (conta Minhas Métricas) com dados de demonstração coerentes
 * de 2026, de Janeiro a Agosto: canais de receita, custos (incluindo CMV) e equipe.
 * Serve para gravar a tela na VSL. Só é chamado pelo botão do superadmin.
 *
 * Simula uma marca D2C (produtos), com receita crescente e margem realista.
 */
import type { Dados } from "@/app/minhasmetricas/financas-estrutura";
import { salvarEstrutura } from "@/app/minhasmetricas/financas-estrutura";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";
import { getFuncionarios, addFuncionario, delFuncionario } from "@/lib/db";

const N = 8;                                   // Jan..Ago
const pad12 = (a: number[]) => [...a.slice(0, N), ...Array(12 - Math.min(a.length, N)).fill(0)];
const fill = (n: number) => Array(N).fill(n);

// ── Canais de receita (Jan..Ago) ──────────────────────────────────────────────
const CANAIS = [
  { nome: "Site próprio (e-commerce)", cor: "#8b5cf6", v: [77000, 83000, 98000, 93000, 107000, 115000, 126000, 141000] },
  { nome: "Marketplaces (ML / Shopee)", cor: "#f59e0b", v: [50000, 54000, 61000, 66000, 62000, 70000, 75000, 83000] },
  { nome: "Loja física", cor: "#1AADE2", v: [42000, 40000, 43000, 46000, 45000, 48000, 50000, 53000] },
  { nome: "Atacado / B2B", cor: "#10B981", v: [29000, 0, 38000, 19000, 45000, 24000, 35000, 48000] },
  { nome: "Instagram / Direct", cor: "#ec4899", v: [11000, 14000, 18000, 19000, 22000, 26000, 29000, 34000] },
];

function estruturaDemo(): Dados {
  const tot = Array.from({ length: N }, (_, m) => CANAIS.reduce((s, c) => s + c.v[m], 0));
  const pct = (p: number) => tot.map((x) => Math.round(x * p));

  return {
    receitas: CANAIS.map((c) => ({ nome: c.nome, cor: c.cor, v: pad12(c.v) })),
    custos: [
      {
        nome: "Custos Fixos",
        grupos: [
          { nome: "Salários", cor: "#1AADE2", itens: [
            { nome: "Salários Líquidos", v: pad12([20800, 20800, 21200, 21200, 21800, 21800, 22400, 22800]) },
            { nome: "FGTS", v: pad12([2110, 2110, 2150, 2150, 2210, 2210, 2270, 2310]) },
            { nome: "DARF", v: pad12([1900, 1900, 1940, 1940, 1990, 1990, 2050, 2090]) },
            { nome: "Provisão 13º e férias", v: pad12([3700, 3700, 3760, 3760, 3860, 3860, 3960, 4030]) },
            { nome: "Provisão Rescisão", v: pad12([900, 900, 915, 915, 940, 940, 965, 985]) },
            { nome: "Comissão", v: pad12(pct(0.025)) },
            { nome: "Pro-Labore", v: pad12(fill(8000)) },
            { nome: "Plano de Saúde", v: pad12(fill(1800)) },
            { nome: "Contribuição Sindical", v: pad12(fill(0)) },
            { nome: "Vale transporte e alimentação", v: pad12(fill(2500)) },
          ] },
          { nome: "Operacional", cor: "#10B981", itens: [
            { nome: "Aluguel", v: pad12(fill(5200)) },
            { nome: "Internet", v: pad12(fill(320)) },
            { nome: "Conta de Energia", v: pad12([1600, 1500, 1350, 1250, 1200, 1300, 1500, 1750]) },
            { nome: "Conta de Água", v: pad12(fill(240)) },
            { nome: "Contabilidade", v: pad12(fill(1400)) },
            { nome: "Conta de Telefone", v: pad12(fill(280)) },
            { nome: "Google Workspace", v: pad12(fill(240)) },
            { nome: "Hospedagem (MKT)", v: pad12(fill(380)) },
            { nome: "Ferramenta de CRM", v: pad12(fill(520)) },
            { nome: "WhatsApp Business", v: pad12(fill(160)) },
            { nome: "ChatGPT Pago", v: pad12(fill(120)) },
          ] },
        ],
      },
      {
        nome: "Custos Variáveis",
        grupos: [
          { nome: "Mercadoria", cor: "#10B981", itens: [
            { nome: "Custo dos produtos (CMV)", v: pad12(pct(0.42)) },
          ] },
          { nome: "Marketing e Publicidade", cor: "#ec4899", itens: [
            { nome: "Campanha MetaAds", v: pad12(pct(0.08)) },
            { nome: "Rebranding", v: pad12([0, 0, 12000, 0, 0, 0, 0, 0]) },
          ] },
          { nome: "Taxas e Antecipações", cor: "#ec4899", itens: [
            { nome: "Taxa de cartão", v: pad12(pct(0.021)) },
            { nome: "Demais Taxas", v: pad12([380, 360, 420, 410, 450, 470, 510, 560]) },
          ] },
          { nome: "Terceirizados", cor: "#10B981", itens: [
            { nome: "Correios", v: pad12(pct(0.018)) },
            { nome: "Registro de marca", v: pad12([0, 0, 0, 1200, 0, 0, 0, 0]) },
            { nome: "Ponto Eletrônico", v: pad12(fill(180)) },
            { nome: "Cartório", v: pad12([0, 0, 0, 0, 0, 240, 0, 0]) },
            { nome: "Lanches e cafés", v: pad12([340, 360, 400, 410, 440, 460, 490, 530]) },
            { nome: "Manutenção", v: pad12([0, 0, 780, 0, 0, 560, 0, 890]) },
          ] },
          { nome: "Pagamento de Empréstimo", cor: "#f59e0b", financeiro: true, itens: [
            { nome: "Capital de giro", v: pad12(fill(4200)) },
            { nome: "IOF", v: pad12(fill(110)) },
          ] },
          { nome: "Impostos e Juros", cor: "#8b5cf6", financeiro: true, itens: [
            { nome: "DAS - ISS", v: pad12(pct(0.06)) },
          ] },
        ],
      },
    ],
  };
}

// ── Equipe (funcionários + salários) ──────────────────────────────────────────
const EQUIPE: { nome: string; cargo: string; salario: number }[] = [
  { nome: "Ana Beatriz Ramos", cargo: "Gerente de operações", salario: 6500 },
  { nome: "Pedro Henrique Rocha", cargo: "Desenvolvedor / E-commerce", salario: 5200 },
  { nome: "Marina Souza Alves", cargo: "Marketing", salario: 3800 },
  { nome: "Fernanda Oliveira Melo", cargo: "Financeiro", salario: 3400 },
  { nome: "Rafael Nunes Pereira", cargo: "Logística / Estoque", salario: 2600 },
  { nome: "Juliana Castro Dias", cargo: "Atendimento / CS", salario: 2500 },
  { nome: "Carlos Eduardo Lima", cargo: "Vendas / Loja", salario: 2400 },
];

/** Preenche estrutura 2026 + equipe. Recria a lista de funcionários do zero. */
export async function preencherDemonstracao(): Promise<void> {
  const d = estruturaDemo();
  salvarEstrutura(2026, d);
  try { salvarEstadoRemoto("me_financas_estrutura:2026", JSON.stringify(d)); } catch { /* ignore */ }

  try {
    const atuais = await getFuncionarios();
    for (const f of atuais) await delFuncionario(f.id);
  } catch { /* ignore */ }
  for (const e of EQUIPE) {
    await addFuncionario({ nome: e.nome, cargo: e.cargo, departamento: null, salario: e.salario, beneficios: 0, ativo: true, contato: null });
  }
}
