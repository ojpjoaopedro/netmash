// Feature flags por empresa: o que cada plano contratado libera no painel.
//
// A fonte é a coluna `empresas.planos` (jsonb), do tipo { "folha": true,
// "acesso2": true }. Ela é ligada de dois jeitos:
//   • sozinha, quando o webhook da Wiven confirma a compra (lib/vendas.ts)
//   • à mão, pelos toggles da aba Empresas do Admin
//
// Este arquivo é a fonte única de "quem pode o quê". Vale para os dois lados:
// a tela usa para mostrar/esconder, e a rota de API usa para recusar. Sem
// dependência de React nem de banco, para poder ser importado dos dois.

export type PlanosEmpresa = Record<string, boolean | number> | null | undefined;

export type Feature = {
  chave: string;
  nome: string;
  descricao: string;
  /** "tela" = libera uma área do painel. "limite" = aumenta uma quantidade. */
  tipo: "tela" | "limite";
};

export const FEATURES: Feature[] = [
  { chave: "folha",        nome: "Folha de pagamento",       descricao: "Salários, benefícios e encargos da equipe em um só lugar.", tipo: "tela" },
  { chave: "acesso2",      nome: "2º acesso",                descricao: "Mais um login de administrador para a sua equipe.",         tipo: "limite" },
  { chave: "planejamento", nome: "Planejamento estratégico", descricao: "Metas, pilares e o rumo da empresa.",                       tipo: "tela" },
];

/** Quantos acessos de administrador já vêm no plano base (o dono). */
export const ACESSOS_DO_PLANO_BASE = 1;

/**
 * Quantidade contratada de um item. O jsonb aceita tanto `true` (uma unidade,
 * que é como os toggles do Admin gravam) quanto um número, para o dia em que a
 * empresa comprar o mesmo item mais de uma vez.
 */
export function quantidadeDoPlano(planos: PlanosEmpresa, chave: string): number {
  const v = planos?.[chave];
  if (typeof v === "number") return Math.max(0, Math.floor(v));
  return v ? 1 : 0;
}

/** A empresa tem este item liberado? */
export function temPlano(planos: PlanosEmpresa, chave: string): boolean {
  return quantidadeDoPlano(planos, chave) > 0;
}

/** Quantos logins de administrador a empresa pode ter no total (incluindo o dono). */
export function limiteDeAcessos(planos: PlanosEmpresa): number {
  return ACESSOS_DO_PLANO_BASE + quantidadeDoPlano(planos, "acesso2");
}

/**
 * Ainda cabe mais um acesso? `usados` conta todo mundo que hoje entra no
 * painel: o dono mais os administradores já criados.
 */
export function podeAdicionarAcesso(planos: PlanosEmpresa, usados: number): boolean {
  return usados < limiteDeAcessos(planos);
}

/** Texto pronto para quando o limite estoura (usado na tela e na API). */
export function motivoLimiteAcessos(planos: PlanosEmpresa): string {
  const limite = limiteDeAcessos(planos);
  return limite <= ACESSOS_DO_PLANO_BASE
    ? "Seu plano tem só o acesso principal. Ative o 2º acesso para incluir mais uma pessoa no painel."
    : `Seu plano permite ${limite} acessos e eles já estão em uso. Ative mais um 2º acesso para incluir outra pessoa.`;
}
