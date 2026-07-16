/**
 * Nome da empresa -> pedaço da URL. Fica fora do store e da API porque os dois
 * precisam gerar o mesmo link a partir do mesmo nome.
 */

/** "Padaria do João" -> "padaria-do-joao". Sem acento, sem espaço, sem surpresa na URL. */
export function paraSlug(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tira acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                        // o resto vira hífen
    .replace(/^-+|-+$/g, '')                            // sem hífen nas pontas
    .slice(0, 40);
}
