import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Minhas Métricas",
  description: "Como o Minhas Métricas trata seus dados, conforme a LGPD.",
};

const SECOES: { t: string; p: string[] }[] = [
  {
    t: "1. Quem somos",
    p: ["O Minhas Métricas é um painel de gestão financeira e de indicadores para empresas. Esta política explica quais dados coletamos, como usamos e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018)."],
  },
  {
    t: "2. Dados que coletamos",
    p: [
      "Dados de cadastro: nome, e-mail e senha (armazenada de forma criptografada).",
      "Dados da empresa: nome, segmento, CNPJ e informações que você optar por cadastrar.",
      "Dados operacionais: lançamentos financeiros, custos, clientes, indicadores e metas que você registra no app.",
    ],
  },
  {
    t: "3. Como usamos os dados",
    p: ["Usamos seus dados exclusivamente para o funcionamento do painel: montar seus gráficos, relatórios, indicadores e alertas. Não usamos seus dados para outros fins sem o seu consentimento."],
  },
  {
    t: "4. Compartilhamento",
    p: ["Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing. Cada empresa acessa somente os próprios dados, com acesso protegido por login."],
  },
  {
    t: "5. Armazenamento e segurança",
    p: ["Seus dados ficam armazenados em servidores com medidas de segurança e acesso restrito. As senhas são guardadas de forma criptografada."],
  },
  {
    t: "6. Seus direitos",
    p: ["Você pode, a qualquer momento, acessar, corrigir ou solicitar a exclusão dos seus dados, além de revogar o consentimento. Para isso, entre em contato pelo e-mail de suporte."],
  },
  {
    t: "7. Consentimento",
    p: ["Ao aceitar esta política e utilizar o app, você consente com o tratamento dos seus dados nos termos aqui descritos."],
  },
];

export default function Privacidade() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F3F5F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>
        <a href="/site" style={{ color: "#22B8F0", fontSize: 14, fontWeight: 600 }}>← Voltar</a>
        <h1 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, letterSpacing: "-.02em", margin: "18px 0 6px" }}>Política de Privacidade</h1>
        <p style={{ color: "rgba(226,232,240,.6)", fontSize: 14 }}>Última atualização: julho de 2026 · LGPD (Lei nº 13.709/2018)</p>
        <div style={{ marginTop: 32, display: "grid", gap: 26 }}>
          {SECOES.map((s, i) => (
            <section key={i}>
              <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px" }}>{s.t}</h2>
              {s.p.map((par, k) => (
                <p key={k} style={{ color: "rgba(226,232,240,.72)", fontSize: 15.5, lineHeight: 1.65, margin: "0 0 8px" }}>{par}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
