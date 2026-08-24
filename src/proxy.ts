import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Separação de endereços:
 *  - www.minhasmetricas.com  -> site de vendas (raiz cai em /site, via app/page.tsx)
 *  - app.minhasmetricas.com  -> sistema; a raiz vai direto para a tela de login.
 *
 * Além disso, o /login antigo (no www/apex de produção) é redirecionado para o
 * endereço oficial app.minhasmetricas.com/login, preservando a query string
 * (ex.: ?cadastro=1&codigo=...). Não mexemos em /senha (para não quebrar links
 * de recuperação já enviados, cujo token vem no fragmento da URL) nem nas
 * páginas por empresa (/<slug>/login).
 */
const APP_HOST = "app.minhasmetricas.com";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // app.minhasmetricas.com: a raiz vai direto para o login.
  if (host.startsWith("app.")) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // www/apex de produção: manda o /login antigo para o endereço oficial (app).
  if ((host === "www.minhasmetricas.com" || host === "minhasmetricas.com") && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = APP_HOST;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
