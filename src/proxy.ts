import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Separação de endereços:
 *  - www.minhasmetricas.com  -> site de vendas (raiz cai em /site, via app/page.tsx)
 *  - app.minhasmetricas.com  -> sistema; a raiz vai direto para a tela de login.
 *
 * Só intercepta a raiz ("/"), então não pesa em nenhuma outra rota.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (host.startsWith("app.")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
