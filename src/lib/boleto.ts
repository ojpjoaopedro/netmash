/**
 * Leitor de boleto. Aceita:
 *  - linha digitável de banco (47 díg) ou concessionária (48), e o código de barras
 *    cru de 44 díg (o que a câmera lê da faixa): extrai valor, vencimento e o banco.
 *  - QR code do boleto quando é um Pix (BR Code / EMV): extrai o beneficiário (quem
 *    recebe), o valor e a cidade.
 * O beneficiário NÃO está no código de barras (só no QR/Pix). Dados oficiais completos
 * (CNPJ, multa, juros, desconto) exigiriam API paga de consulta. Sem UI nem rede.
 */
export type BoletoInfo = {
  valido: boolean;
  tipo: "banco" | "arrecadacao" | "pix" | null;
  valor: number | null;         // em reais
  vencimento: string | null;    // 'YYYY-MM-DD'
  banco: string | null;         // nome do banco (pelo código)
  beneficiario: string | null;  // quem recebe (só vem do QR/Pix)
  linha: string;                // conteúdo cru (dígitos da linha, ou o texto do Pix)
};

const DIA = 86400000;

// Bancos mais comuns (código de compensação → nome).
const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil", "033": "Santander", "104": "Caixa", "237": "Bradesco",
  "341": "Itaú", "260": "Nubank", "077": "Inter", "336": "C6 Bank", "212": "Banco Original",
  "756": "Sicoob", "748": "Sicredi", "422": "Safra", "070": "BRB", "735": "Neon",
  "323": "Mercado Pago", "290": "PagBank", "380": "PicPay", "655": "Votorantim", "745": "Citi",
};
const nomeBanco = (cod: string) => BANCOS[cod] || null;
const inval = (linha: string): BoletoInfo => ({ valido: false, tipo: null, valor: null, vencimento: null, banco: null, beneficiario: null, linha });
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

/** Parser de EMV / BR Code (o "Pix Copia e Cola" do QR). TLV: id(2)+len(2)+valor. */
function parsePix(txt: string): BoletoInfo {
  const campos: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= txt.length) {
    const id = txt.slice(i, i + 2);
    const len = parseInt(txt.slice(i + 2, i + 4), 10);
    if (isNaN(len)) break;
    campos[id] = txt.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  const valorStr = campos["54"];
  const valor = valorStr ? Number(valorStr) || null : null;
  const beneficiario = (campos["59"] || "").trim() || null;
  return { valido: true, tipo: "pix", valor, vencimento: null, banco: null, beneficiario, linha: txt.trim() };
}

export function parseLinhaDigitavel(entrada: string): BoletoInfo {
  const bruto = (entrada || "").trim();
  // QR/Pix (BR Code): começa com "0002..." e/ou tem o domínio do Pix.
  if (/br\.gov\.bcb\.pix/i.test(bruto) || /^0002\d{2}/.test(bruto)) return parsePix(bruto);

  const d = bruto.replace(/\D/g, "");
  // Linha digitável de banco (47): campo 5 (últimos 14) = fator(4) + valor(10 centavos)
  if (d.length === 47) {
    return { valido: true, tipo: "banco", linha: d, banco: nomeBanco(d.slice(0, 3)), beneficiario: null, valor: reais(parseInt(d.slice(37, 47), 10)), vencimento: dataDoFator(parseInt(d.slice(33, 37), 10)) };
  }
  // Linha digitável de concessionária (48, começa com 8): valor nas posições 4..15
  if (d.length === 48) {
    return { valido: true, tipo: "arrecadacao", linha: d, banco: null, beneficiario: null, valor: reais(parseInt(d.slice(4, 15), 10)), vencimento: null };
  }
  // Código de barras cru (44) — o que a câmera lê da faixa
  if (d.length === 44) {
    if (d[0] === "8") return { valido: true, tipo: "arrecadacao", linha: d, banco: null, beneficiario: null, valor: reais(parseInt(d.slice(4, 15), 10)), vencimento: null };
    return { valido: true, tipo: "banco", linha: d, banco: nomeBanco(d.slice(0, 3)), beneficiario: null, valor: reais(parseInt(d.slice(9, 19), 10)), vencimento: dataDoFator(parseInt(d.slice(5, 9), 10)) };
  }
  return inval(d);
}
