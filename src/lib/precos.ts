// Fonte única dos preços-base (fallback). Os valores REAIS ficam no banco
// (config_app) e são editáveis no Admin; estes são só o padrão quando o banco
// ainda não respondeu. Manter aqui evita divergência entre cliente e servidor.
export const PRECO_SUPERADMIN = 79.9; // R$/mês por administrador principal (Super Admin)
export const PRECO_ACESSO = 39.9;     // R$/mês por acesso adicional
export const PRECO_ACESSO2 = 9.9;     // R$/mês por 2º acesso (login extra)
