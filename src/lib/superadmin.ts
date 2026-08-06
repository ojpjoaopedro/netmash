// Lista central de super admins da plataforma (quem enxerga tudo / mantém a
// marca Minhas Métricas). Antes o e-mail ficava chumbado e repetido em várias
// rotas de API e no painel; agora fica num lugar só.
//
// Padrão embutido + extras por variável de ambiente:
//   • Server (rotas /api): SUPER_ADMINS="a@x.com,b@y.com"
//   • Client (painel):     NEXT_PUBLIC_SUPER_ADMINS="a@x.com,b@y.com"
// Sem env, mantém o comportamento atual (só minhasmetricas@gmail.com).

const PADRAO = ["minhasmetricas@gmail.com"];

function extras(): string[] {
  const server = process.env.SUPER_ADMINS || "";
  const client = process.env.NEXT_PUBLIC_SUPER_ADMINS || "";
  return `${server},${client}`
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const SUPERADMINS: string[] = [...new Set([...PADRAO, ...extras()])];

/** Diz se um e-mail é super admin da plataforma. */
export function ehSuperadmin(email?: string | null): boolean {
  return !!email && SUPERADMINS.includes(email.toLowerCase());
}
