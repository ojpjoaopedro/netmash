// Preços-base de reserva. A ordem de quem manda no preço é:
//   1. a oferta cadastrada na Cakto (lida do link de checkout, ver lib/cakto-catalogo.ts)
//   2. o valor guardado no banco (config_app / planos_catalogo), editável no Admin
//   3. estes valores aqui, quando nada acima responde
// Manter aqui evita divergência entre cliente e servidor.
export const PRECO_SUPERADMIN = 49.9; // R$/mês por administrador principal (Super Admin)
export const PRECO_ACESSO = 39.9;     // R$/mês por acesso adicional
