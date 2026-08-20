// Preços dos produtos direto da Wiven.
//
// A API pública da Wiven é só de gateway (transações, assinaturas, checkout):
// não existe rota para listar produtos ou ofertas (products/offers/plans
// respondem 404, enquanto rotas reais respondem 401). O que dá para ler é a
// própria página pública do checkout do produto, que traz o produto e as
// ofertas no HTML. É de lá que tiramos o preço, usando o link de pagamento já
// cadastrado no Admin.
//
// Como é leitura de página (e não de uma API estável), tudo aqui falha em
// silêncio: sem resposta, o preço do banco continua valendo.

export type OfertaWiven = {
  produtoId: string | null;
  produtoNome: string | null;
  oferta: string | null;         // código da oferta (?offer= do link)
  preco: number;                 // valor da mensalidade
  primeiraCobranca: number | null;  // valor da 1ª cobrança, quando é promocional
  periodicidade: string | null;  // MONTHS, YEARS, ...
  assinatura: boolean;
  moeda: string;
};

const TTL = 10 * 60 * 1000;   // 10 minutos: preço não muda toda hora
const cache = new Map<string, { quando: number; oferta: OfertaWiven | null }>();

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** Junta o payload que o Next da Wiven espalha em vários self.__next_f.push(). */
function payloadDaPagina(html: string): string {
  let buf = "";
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try { buf += JSON.parse(m[1]) as string; } catch { /* pedaço quebrado, segue */ }
  }
  return buf || html;
}

function num(txt: string, campo: string): number | null {
  const m = new RegExp(`"${campo}":\\s*(-?[0-9]+(?:\\.[0-9]+)?)`).exec(txt);
  return m ? Number(m[1]) : null;
}

function txt(texto: string, campo: string): string | null {
  const m = new RegExp(`"${campo}":\\s*"([^"]*)"`).exec(texto);
  return m ? m[1] : null;
}

/**
 * Lê o produto/oferta de um link de checkout da Wiven, por exemplo
 * https://checkout.wiven.com.br/checkout/<id>?offer=<codigo>
 */
export async function lerOfertaDoLink(link: string): Promise<OfertaWiven | null> {
  const url = (link || "").trim();
  if (!/^https?:\/\//i.test(url) || !/wiven\.com\.br/i.test(url)) return null;

  const agora = Date.now();
  const guardado = cache.get(url);
  if (guardado && agora - guardado.quando < TTL) return guardado.oferta;

  let oferta: OfertaWiven | null = null;
  try {
    const codigo = new URL(url).searchParams.get("offer");
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, cache: "no-store" });
    if (res.ok) {
      const dados = payloadDaPagina(await res.text());

      // Bloco da oferta pedida no link (é ela que define o preço cobrado).
      let janela = "";
      if (codigo) {
        const i = dados.indexOf(`"code":"${codigo}"`);
        if (i >= 0) janela = dados.slice(Math.max(0, i - 500), i + 600);
      }
      // Bloco do produto (usado quando o link não tem oferta).
      const p = dados.indexOf('"product":{');
      const produto = p >= 0 ? dados.slice(p, p + 900) : "";

      const preco = (janela ? num(janela, "price") : null) ?? num(produto, "price");
      if (preco !== null && preco > 0) {
        const primeira = janela ? num(janela, "subscriptionFirstChargePrice") : null;
        oferta = {
          produtoId: txt(produto, "id"),
          produtoNome: txt(produto, "name"),
          oferta: codigo,
          preco,
          primeiraCobranca: primeira !== null && primeira > 0 && primeira !== preco ? primeira : null,
          periodicidade: janela ? txt(janela, "subscriptionPeriodicityType") : null,
          assinatura: txt(produto, "type") === "signature",
          moeda: (janela ? txt(janela, "currency") : null) || "BRL",
        };
      }
    }
  } catch { /* rede fora do ar: fica com o preço do banco */ }

  cache.set(url, { quando: agora, oferta });
  return oferta;
}
