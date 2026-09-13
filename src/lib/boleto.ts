/**
 * Leitura de boleto: aceita a linha digitável (47 díg. banco, 48 díg. concessionária)
 * e também o código de barras cru de 44 díg. (o que a câmera lê). Extrai valor e
 * vencimento, sem UI nem rede. A "regra do fator de vencimento" teve virada de ciclo
 * em 2025, então o vencimento é uma estimativa: a tela sempre deixa conferir/editar.
 */
export type BoletoInfo = {
  valido: boolean;
  tipo: "banco" | "arrecadacao" | null;
  valor: number | null;        // em reais
  vencimento: string | null;   // 'YYYY-MM-DD'
  linha: string;               // só dígitos
};

const DIA = 86400000;
const inval = (linha: string): BoletoInfo => ({ valido: false, tipo: null, valor: null, vencimento: null, linha });
const reais = (centavos: number) => (centavos > 0 ? centavos / 100 : null);

/** Vencimento a partir do "fator de vencimento" (base 07/10/1997), tratando a virada de ciclo. */
function dataDoFator(fator: number): string | null {
  if (!fator || fator <= 0) return null;
  const base = Date.UTC(1997, 9, 7);
  const c1 = base + fator * DIA;        // ciclo antigo
  const c2 = c1 + 9999 * DIA;           // ciclo novo (pós fev/2025)
  const agora = Date.now();
  const escolha = Math.abs(c1 - agora) <= Math.abs(c2 - agora) ? c1 : c2;
  return new Date(escolha).toISOString().slice(0, 10);
}

export function parseLinhaDigitavel(entrada: string): BoletoInfo {
  const d = (entrada || "").replace(/\D/g, "");

  // Linha digitável de banco (47): campo 5 (últimos 14) = fator(4) + valor(10 centavos)
  if (d.length === 47) {
    return { valido: true, tipo: "banco", linha: d, valor: reais(parseInt(d.slice(37, 47), 10)), vencimento: dataDoFator(parseInt(d.slice(33, 37), 10)) };
  }
  // Linha digitável de concessionária (48, começa com 8): valor nas posições 4..15
  if (d.length === 48) {
    return { valido: true, tipo: "arrecadacao", linha: d, valor: reais(parseInt(d.slice(4, 15), 10)), vencimento: null };
  }
  // Código de barras cru (44) — o que a câmera lê
  if (d.length === 44) {
    if (d[0] === "8") {
      return { valido: true, tipo: "arrecadacao", linha: d, valor: reais(parseInt(d.slice(4, 15), 10)), vencimento: null };
    }
    // banco: [4]=DV, [5-8]=fator, [9-18]=valor
    return { valido: true, tipo: "banco", linha: d, valor: reais(parseInt(d.slice(9, 19), 10)), vencimento: dataDoFator(parseInt(d.slice(5, 9), 10)) };
  }
  return inval(d);
}
