// Catálogo dos tipos de notificação que aparecem na tela do CLIENTE.
// O Super Admin liga/desliga cada um na seção "Notificações" do Admin; o
// resultado fica em notificacoes_config (banco) e o painel do cliente lê para
// decidir o que mostrar no sininho. Fonte única usada pelos dois lados.
export type TipoNotificacao = {
  chave: string;
  titulo: string;      // nome curto (aparece no Admin)
  descricao: string;   // o que dispara / o que o cliente vê
  defaultOn: boolean;  // ligado por padrão quando ainda não há config salva
};

export const NOTIFICACOES: TipoNotificacao[] = [
  { chave: "aniversarios",    titulo: "Aniversariantes do dia", descricao: "Avisa sobre os aniversários da equipe no dia (hoje).", defaultOn: true },
  { chave: "contas_vencer",   titulo: "Contas a vencer",        descricao: "Avisa quando há contas a pagar ou receber vencendo hoje.", defaultOn: true },
  { chave: "contas_vencidas", titulo: "Contas vencidas",        descricao: "Avisa quando há contas em atraso (a partir de 1 dia após o vencimento, não pagas).", defaultOn: true },
  { chave: "onboarding",      titulo: "Configuração incompleta", descricao: "Lembra o cliente de terminar o cadastro inicial (dados, logomarca e equipe).", defaultOn: true },
];

// Mapa chave -> padrão (usado quando o banco ainda não tem a linha).
export const NOTIF_PADRAO: Record<string, boolean> = Object.fromEntries(
  NOTIFICACOES.map((n) => [n.chave, n.defaultOn]),
);
