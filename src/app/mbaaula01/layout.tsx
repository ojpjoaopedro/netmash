/**
 * A aula veio do Hub: é tema claro e se estiliza só com Tailwind.
 * A classe `mba-scope` desliga o design system escuro deste app aqui dentro
 * (ver a regra dos inputs em globals.css), pra tela ficar igual à do Hub.
 */
export default function MbaAulaLayout({ children }: { children: React.ReactNode }) {
  return <div className="mba-scope">{children}</div>;
}
