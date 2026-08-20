// Preços-base de reserva. A ordem de quem manda no preço é:
//   1. o produto cadastrado na Wiven (lido do link de checkout, ver lib/wiven-catalogo.ts)
//   2. o valor guardado no banco (config_app / planos_catalogo), editável no Admin
//   3. estes valores aqui, quando nada acima responde
// Manter aqui evita divergência entre cliente e servidor.
export const PRECO_SUPERADMIN = 79.9; // R$/mês por administrador principal (Super Admin)
export const PRECO_ACESSO = 39.9;     // R$/mês por acesso adicional
export const PRECO_ACESSO2 = 9.9;     // R$/mês por 2º acesso (login extra)
