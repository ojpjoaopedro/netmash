// Navegação interna do painel (usada pelo Guia de configuração para levar o
// usuário à aba certa). Guarda um "alvo" e avisa quem estiver ouvindo.

export type AlvoNav = { view: string; aba?: string; sub?: string; voltar?: AlvoNav };

let alvo: AlvoNav | null = null;
const subs = new Set<(a: AlvoNav) => void>();

/** Pede para navegar até uma tela/aba. */
export function navegar(a: AlvoNav) { alvo = a; subs.forEach((f) => f(a)); }

/** Lê e limpa o alvo pendente (consumido por quem acabou de montar). */
export function pegarAlvo(): AlvoNav | null { const a = alvo; alvo = null; return a; }

/** Ouve pedidos de navegação. Retorna a função para desinscrever. */
export function assinarNav(f: (a: AlvoNav) => void) { subs.add(f); return () => { subs.delete(f); }; }
