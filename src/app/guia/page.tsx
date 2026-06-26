import type { Metadata } from "next";
import {
  LayoutDashboard, ListChecks, Receipt, CalendarClock, Contact, TrendingUp,
  Sparkles, Users, Upload, FileText, Building2, ShieldCheck, Smartphone, Monitor, Check, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Seja bem-vindo — Como usar o Minha Empresa",
  description: "Aprenda a usar o app: dashboards, lançamentos, clientes, projeção de caixa, assistente e mais. No celular e no computador.",
};

const APP_URL = "/login";

const PASSOS = [
  { n: "1", t: "Configure sua empresa", d: "Em Empresa, coloque o nome e a sua logo. O app fica com a sua identidade." },
  { n: "2", t: "Lance ou importe seus dados", d: "Registre o que entra e o que sai (ou suba sua planilha). Os gráficos se montam sozinhos." },
  { n: "3", t: "Acompanhe e decida", d: "Veja lucro, caixa e clientes todo dia, e use o Assistente pra saber o que priorizar." },
];

const SECOES = [
  { Icon: LayoutDashboard, cor: "#1AADE2", t: "Dashboard", oque: "Sua visão geral: faturamento, lucro, caixa e clientes num lugar só.", como: "É a primeira tela. O 'Pulso do dia' mostra o que merece atenção agora." },
  { Icon: ListChecks, cor: "#10B981", t: "Lançamentos", oque: "Onde você registra cada receita e despesa do dia a dia.", como: "Toque em 'Adicionar lançamento', informe valor, data e categoria. Pronto — entra nos gráficos." },
  { Icon: Receipt, cor: "#F59E0B", t: "Custos & Despesas", oque: "Seus custos fixos e despesas recorrentes (aluguel, folha, fornecedores).", como: "Cadastre uma vez e gere as despesas do mês com um clique." },
  { Icon: CalendarClock, cor: "#8b5cf6", t: "Contas a pagar/receber", oque: "Tudo que vence: o que você tem a pagar e a receber.", como: "Marque como pago quando entrar/sair do caixa. O app avisa o que está vencendo." },
  { Icon: Contact, cor: "#1AADE2", t: "Clientes & Vendas", oque: "Cadastre clientes, registre vendas e veja quem comprou.", como: "Ao registrar uma venda, ela alimenta o financeiro e o comercial automaticamente." },
  { Icon: TrendingUp, cor: "#10B981", t: "Projeção de caixa", oque: "Mostra para onde seu caixa vai nos próximos 6 meses.", como: "Aparece no Dashboard. Te avisa antes de o caixa ficar negativo." },
  { Icon: Sparkles, cor: "#F59E0B", t: "Assistente", oque: "Converse com seus números: pergunte e tenha a resposta na hora.", como: "Toque em sugestões como 'Como está meu caixa?' ou 'O que fazer essa semana?'." },
  { Icon: Users, cor: "#8b5cf6", t: "Equipe & folha", oque: "Controle de funcionários, salários e benefícios.", como: "Cadastre sua equipe e veja quanto a folha pesa no faturamento." },
  { Icon: Upload, cor: "#1AADE2", t: "Importar planilha", oque: "Já tem dados numa planilha? Suba e comece com tudo preenchido.", como: "Em Importar, selecione o arquivo e confirme as colunas." },
  { Icon: FileText, cor: "#ff6b9d", t: "Relatórios & Apresentação", oque: "Gere um relatório ou uma apresentação profissional da empresa.", como: "Toque em 'Apresentar' ou 'Relatórios / PDF' e baixe em PDF." },
  { Icon: Building2, cor: "#10B981", t: "Empresa (sua marca)", oque: "Coloque nome, logo e o tamanho dela — o app fica com a sua cara.", como: "Em Empresa, faça o upload da logo e ajuste o que quiser." },
  { Icon: ShieldCheck, cor: "#8b5cf6", t: "Equipe & Acessos", oque: "Dê acesso à sua equipe, com permissão por área.", como: "Em Acessos, convide um colaborador e escolha o que ele pode ver." },
];

export default function Guia() {
  return (
    <main className="gu">
      <style>{CSS}</style>

      <header className="gu-nav">
        <div className="gu-wrap gu-navin">
          <div className="gu-logo">Minha Empresa</div>
          <a href={APP_URL} className="gu-cta sm">Entrar no painel</a>
        </div>
      </header>

      <section className="gu-hero">
        <div className="gu-wrap">
          <span className="gu-eyebrow">Seja bem-vindo 👋</span>
          <h1>Vamos te mostrar <span className="gu-acc">como usar o app.</span></h1>
          <p className="gu-lead">Em poucos minutos você organiza as finanças da sua empresa. Aqui embaixo, o que cada parte faz e como usar.</p>
          <div className="gu-badges">
            <span><Smartphone size={16} /> Funciona no celular</span>
            <span><Monitor size={16} /> e no computador</span>
            <span><Check size={16} /> Seus dados são só seus</span>
          </div>
        </div>
      </section>

      <section className="gu-sec">
        <div className="gu-wrap">
          <h2>Comece em 3 passos</h2>
          <div className="gu-passos">
            {PASSOS.map((p) => (
              <div key={p.n} className="gu-passo">
                <span className="gu-pn">{p.n}</span>
                <b>{p.t}</b>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gu-sec alt">
        <div className="gu-wrap">
          <h2>Conheça cada parte do app</h2>
          <p className="gu-subt">Toque em cada uma no menu lateral (no computador) ou no menu ☰ (no celular).</p>
          <div className="gu-cards">
            {SECOES.map((s) => (
              <div key={s.t} className="gu-card">
                <span className="gu-ico" style={{ background: `${s.cor}22`, color: s.cor }}><s.Icon size={22} /></span>
                <b>{s.t}</b>
                <p className="gu-oque">{s.oque}</p>
                <p className="gu-como"><b>Como usar:</b> {s.como}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gu-sec">
        <div className="gu-wrap gu-device">
          <div>
            <h2>No celular <span className="gu-acc">ou no computador</span></h2>
            <p className="gu-lead">É o mesmo app nos dois. No computador, o menu fica à esquerda. No celular, toque no menu ☰ no topo, e as métricas principais ficam na barra de baixo. Tudo sincroniza sozinho.</p>
            <ul className="gu-list">
              <li><Check size={17} /> Lance pelo celular no balcão, confira o relatório no PC</li>
              <li><Check size={17} /> Seus dados ficam salvos e protegidos por login</li>
              <li><Check size={17} /> Dê acesso à sua equipe com permissões</li>
            </ul>
          </div>
          <div className="gu-mock">
            <div className="gu-mockbar"><i></i><i></i><i></i></div>
            <div className="gu-mockbody">
              <div className="gu-mockhi"><div><small>Bom dia</small><b>Visão geral</b></div><span className="gu-pill">Lucro ↑</span></div>
              <div className="gu-mockk"><div className="gu-k"><small>Faturamento</small><b>R$ 48,2 mil</b></div><div className="gu-k"><small>Lucro</small><b className="gu-g">R$ 12,7 mil</b></div></div>
              <div className="gu-chart">{[42, 58, 50, 66, 61, 78].map((h, i) => <span key={i} style={{ height: `${h}%` }}></span>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="gu-sec alt">
        <div className="gu-wrap">
          <h2>📲 Coloque o app na tela do seu celular</h2>
          <p className="gu-subt">Vira um ícone e abre em tela cheia, igual a um aplicativo de loja. Leva 10 segundos.</p>
          <div className="gu-pwa">
            <div className="gu-pwacard">
              <b> iPhone (Safari)</b>
              <ol>
                <li>Abra <b>netmash.vercel.app</b> no <b>Safari</b>.</li>
                <li>Toque no botão <b>Compartilhar</b> (o quadradinho com uma seta pra cima ⬆️, embaixo).</li>
                <li>Role e toque em <b>“Adicionar à Tela de Início”</b>.</li>
                <li>Toque em <b>Adicionar</b>. Pronto — o ícone aparece na tela. ✅</li>
              </ol>
            </div>
            <div className="gu-pwacard">
              <b>🤖 Android (Chrome)</b>
              <ol>
                <li>Abra <b>netmash.vercel.app</b> no <b>Chrome</b>.</li>
                <li>Toque no menu <b>⋮</b> (três pontinhos, canto superior direito).</li>
                <li>Toque em <b>“Adicionar à tela inicial”</b> ou <b>“Instalar app”</b>.</li>
                <li>Confirme em <b>Adicionar / Instalar</b>. Pronto! ✅</li>
              </ol>
            </div>
          </div>
          <p className="gu-subt" style={{ marginTop: 18 }}>Depois é só abrir pelo ícone — entra direto, sem digitar o endereço.</p>
        </div>
      </section>

      <section className="gu-final">
        <div className="gu-wrap">
          <h2>Pronto pra começar?</h2>
          <p>Entre no seu painel e configure sua empresa. Em poucos minutos você já vê o resultado do seu negócio.</p>
          <a href={APP_URL} className="gu-cta big">Entrar no painel <ArrowRight size={18} /></a>
        </div>
      </section>

      <footer className="gu-foot"><div className="gu-wrap">Minha Empresa · Guia de uso</div></footer>
    </main>
  );
}

const CSS = `
.gu{--bg:#0A0A0A;--card:#121212;--line:#222;--muted:#9aa0a6;--txt:#f4f5f7;--acc:#1AADE2;--green:#10B981;
  background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.gu a{color:inherit;text-decoration:none}
.gu h1,.gu h2{font-weight:800;letter-spacing:-.02em;line-height:1.1}
.gu .gu-acc{color:var(--acc)}
.gu-wrap{width:100%;max-width:1100px;margin:0 auto;padding:0 22px}
.gu-eyebrow{color:var(--acc);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:13px;display:block}
.gu-cta{display:inline-flex;align-items:center;gap:8px;background:var(--acc);color:#06222e;font-weight:800;border-radius:99px;padding:11px 20px;font-size:15px;transition:.15s}
.gu-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}
.gu-cta.sm{padding:8px 16px;font-size:14px}
.gu-cta.big{padding:15px 28px;font-size:16.5px}

.gu-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.gu-navin{display:flex;align-items:center;justify-content:space-between;height:62px}
.gu-logo{font-weight:800;font-size:21px;color:var(--acc);letter-spacing:-.02em}

.gu-hero{padding:64px 0 40px;background:radial-gradient(800px 380px at 80% -10%,rgba(26,173,226,.14),transparent)}
.gu-hero h1{font-size:clamp(32px,5vw,52px);margin:14px 0 16px}
.gu-lead{color:var(--muted);font-size:18px;line-height:1.6;max-width:620px}
.gu-badges{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px;color:var(--muted);font-weight:600;font-size:14px}
.gu-badges span{display:inline-flex;align-items:center;gap:7px}
.gu-badges svg{color:var(--green)}

.gu-sec{padding:54px 0}
.gu-sec.alt{background:#0d0d0d;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.gu-sec h2{font-size:clamp(24px,3.4vw,34px)}
.gu-subt{color:var(--muted);margin-top:8px;font-size:15px}

.gu-passos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.gu-passo{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px}
.gu-pn{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#06222e;font-weight:800;font-size:18px;margin-bottom:14px}
.gu-passo b{font-size:17px;display:block;margin-bottom:6px}
.gu-passo p{color:var(--muted);line-height:1.55;font-size:14.5px}

.gu-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px}
.gu-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
.gu-card:hover{border-color:rgba(26,173,226,.4)}
.gu-ico{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;margin-bottom:14px}
.gu-card b{font-size:16.5px;display:block;margin-bottom:8px}
.gu-oque{color:#cfd3d8;line-height:1.5;font-size:14px}
.gu-como{color:var(--muted);line-height:1.5;font-size:13.5px;margin-top:10px}
.gu-como b{display:inline;color:var(--acc);font-size:13.5px}

.gu-device{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
.gu-list{list-style:none;margin:22px 0 0;display:grid;gap:12px}
.gu-list li{display:flex;align-items:flex-start;gap:10px;font-size:15px;color:#cfd3d8}
.gu-list svg{color:var(--green);flex-shrink:0;margin-top:2px}
.gu-mock{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(0,0,0,.8)}
.gu-mockbar{display:flex;gap:7px;padding:13px 16px;border-bottom:1px solid var(--line)}
.gu-mockbar i{width:11px;height:11px;border-radius:50%;background:#333}
.gu-mockbody{padding:20px}
.gu-mockhi{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.gu-mockhi small{color:var(--muted);font-size:12px;display:block}.gu-mockhi b{font-size:17px}
.gu-pill{background:rgba(16,185,129,.15);color:var(--green);font-weight:700;font-size:12px;padding:5px 11px;border-radius:99px}
.gu-mockk{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.gu-k{background:#0f0f0f;border:1px solid var(--line);border-radius:12px;padding:12px}
.gu-k small{color:var(--muted);font-size:11px;display:block;margin-bottom:5px}.gu-k b{font-size:16px}.gu-k b.gu-g{color:var(--green)}
.gu-chart{display:flex;align-items:flex-end;gap:10px;height:110px;padding:14px;background:#0f0f0f;border:1px solid var(--line);border-radius:12px}
.gu-chart span{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--acc),rgba(26,173,226,.25))}

.gu-final{padding:64px 0;text-align:center;background:radial-gradient(600px 280px at 50% 120%,rgba(26,173,226,.16),transparent)}
.gu-final h2{font-size:clamp(26px,4vw,38px)}
.gu-final p{color:var(--muted);font-size:17px;max-width:520px;margin:14px auto 26px;line-height:1.6}
.gu-foot{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:13.5px;text-align:center}

.gu-pwa{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
.gu-pwacard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px}
.gu-pwacard b{color:var(--txt)}
.gu-pwacard>b{font-size:17px;display:block;margin-bottom:14px}
.gu-pwacard ol{margin:0;padding-left:22px;display:grid;gap:11px}
.gu-pwacard li{color:#cfd3d8;line-height:1.5;font-size:14.5px}
.gu-pwacard li b{color:var(--acc);font-weight:700}
@media(max-width:820px){
  .gu-passos,.gu-cards,.gu-pwa{grid-template-columns:1fr}
  .gu-device{grid-template-columns:1fr;gap:30px}
}
`;
