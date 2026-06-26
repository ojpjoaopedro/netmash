import type { Metadata } from "next";
import {
  LineChart, Wallet, Sparkles, Users, Megaphone, Contact, FileText, ShieldCheck,
  Upload, Check, ArrowRight, TrendingUp, Clock, Smartphone,
} from "lucide-react";

/* ============================================================
   TROQUE AQUI (sem mexer no resto do código):
   ============================================================ */
const MARCA = "Sua Marca";                 // nome que aparece na página
const PRECO = "97";                         // valor mensal, só o número (R$)
const PRECO_ANUAL = "970";                  // valor à vista no plano anual (2 meses grátis)
const CHECKOUT_URL = "#";                   // cole o link do produto na Kiwify
const ENTRAR_URL = "/login";               // login do app
/* ============================================================ */

export const metadata: Metadata = {
  title: `${MARCA} — O painel financeiro que mostra o lucro real da sua empresa`,
  description:
    "Dashboards, fluxo de caixa, projeção, clientes e equipe num só lugar. Pare de adivinhar pelo extrato do banco e saiba exatamente quanto sua empresa lucra.",
};

const FEATURES = [
  { Icon: LineChart, t: "Dashboard de verdade", d: "Faturamento, lucro, margem e clientes — tudo num painel que se monta sozinho conforme você lança os dados." },
  { Icon: Wallet, t: "Fluxo de caixa & DRE", d: "Veja entradas, saídas e resultado do mês. Saiba se está sobrando ou faltando, sem planilha." },
  { Icon: TrendingUp, t: "Projeção de caixa", d: "Antecipe os próximos 6 meses e receba alerta antes do caixa ficar no vermelho." },
  { Icon: Sparkles, t: "Assistente inteligente", d: "Pergunte 'como está meu caixa?' e tenha a resposta na hora, com o que fazer essa semana." },
  { Icon: Contact, t: "Clientes & vendas", d: "Cadastre clientes, registre vendas e descubra quem sumiu para reativar." },
  { Icon: Megaphone, t: "Marketing & comercial", d: "Leads, conversão, ROI e ticket médio — acompanhe o que traz dinheiro pra dentro." },
  { Icon: Users, t: "Equipe & folha", d: "Controle salários, benefícios e quanto a folha pesa no seu faturamento." },
  { Icon: FileText, t: "Apresentações e PDF", d: "Gere uma apresentação ou relatório profissional da empresa em um clique." },
  { Icon: Upload, t: "Importe sua planilha", d: "Já tem dados? Suba sua planilha e comece com tudo preenchido." },
];

const PLANO = [
  "Todos os painéis (Finanças, Clientes, Comercial, Marketing)",
  "Projeção de caixa e assistente inteligente",
  "Clientes, vendas, custos e contas a pagar/receber",
  "Controle de equipe e folha de pagamento",
  "Apresentações e relatórios em PDF",
  "Sua logo e identidade (white-label)",
  "Acesso para a sua equipe, com permissões",
  "Atualizações e suporte incluídos",
];

const PASSOS = [
  { n: "1", t: "Crie sua conta", d: "Assine e entre. Coloque o nome e a logo da sua empresa." },
  { n: "2", t: "Lance ou importe", d: "Adicione seus números ou suba sua planilha — os gráficos se montam sozinhos." },
  { n: "3", t: "Decida com clareza", d: "Acompanhe lucro, caixa e clientes todo dia e saiba o próximo passo." },
];

const FAQ = [
  { q: "Preciso entender de finanças ou planilha?", a: "Não. Você lança o que entra e o que sai (ou importa sua planilha) e a plataforma monta os gráficos, o lucro e a projeção automaticamente." },
  { q: "Serve pro meu tipo de negócio?", a: "Sim. Funciona para comércio, serviços, prestadores e pequenas empresas em geral — tudo é editável e se adapta ao seu segmento." },
  { q: "Meus dados ficam seguros?", a: "Cada empresa tem seu espaço isolado. Seus dados são só seus e ficam protegidos por login." },
  { q: "Posso usar no celular?", a: "Sim, funciona no celular e no computador. Você acompanha de qualquer lugar." },
  { q: "Tem fidelidade?", a: "Não. É assinatura mensal e você cancela quando quiser, direto pelo painel." },
];

export default function Vendas() {
  return (
    <main className="lp">
      <style>{CSS}</style>

      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-wrap lp-navin">
          <div className="lp-logo">{MARCA}</div>
          <nav className="lp-navlinks">
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href={ENTRAR_URL} className="lp-ghost">Entrar</a>
            <a href={CHECKOUT_URL} className="lp-cta sm">Assinar</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-wrap lp-herogrid">
          <div>
            <span className="lp-eyebrow">Gestão financeira para empresários</span>
            <h1>Saiba <span className="lp-acc">quanto sua empresa lucra</span> — sem planilha e sem achismo.</h1>
            <p className="lp-lead">
              Um painel só seu com faturamento, fluxo de caixa, projeção, clientes e equipe.
              Pare de decidir pelo saldo do banco e comece a enxergar o resultado real do seu negócio.
            </p>
            <div className="lp-herocta">
              <a href={CHECKOUT_URL} className="lp-cta big">Começar agora <ArrowRight size={18} /></a>
              <a href="#recursos" className="lp-ghost big">Ver recursos</a>
            </div>
            <div className="lp-trust">
              <span><Check size={15} /> Cancele quando quiser</span>
              <span><Check size={15} /> Garantia de 7 dias</span>
              <span><Smartphone size={15} /> No celular e no PC</span>
            </div>
          </div>

          {/* MOCKUP */}
          <div className="lp-mock">
            <div className="lp-mockbar"><i></i><i></i><i></i></div>
            <div className="lp-mockbody">
              <div className="lp-mockhi">
                <div><small>Bom dia, João</small><b>Visão geral da empresa</b></div>
                <div className="lp-pill">Lucro ↑ 18%</div>
              </div>
              <div className="lp-mockkpis">
                <div className="lp-k"><small>Faturamento</small><b>R$ 48,2 mil</b><i className="up"></i></div>
                <div className="lp-k"><small>Lucro</small><b className="g">R$ 12,7 mil</b><i className="up"></i></div>
                <div className="lp-k"><small>Caixa</small><b>R$ 31,4 mil</b><i></i></div>
              </div>
              <div className="lp-mockchart">
                {[42, 58, 50, 66, 61, 78].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }}></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOR */}
      <section className="lp-pain">
        <div className="lp-wrap">
          <h2>Trabalha muito, mas <span className="lp-acc">não sabe quanto sobra?</span></h2>
          <div className="lp-paingrid">
            <div className="lp-paincard"><Clock size={22} /><p>Perde horas em planilhas que ninguém entende e que quebram toda hora.</p></div>
            <div className="lp-paincard"><Wallet size={22} /><p>Olha o saldo do banco e acha que é lucro — até a conta chegar.</p></div>
            <div className="lp-paincard"><TrendingUp size={22} /><p>Não sabe se o mês que vem fecha no azul ou no vermelho.</p></div>
          </div>
          <p className="lp-painline">É exatamente isso que o <b>{MARCA}</b> resolve.</p>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="lp-sec">
        <div className="lp-wrap">
          <span className="lp-eyebrow center">Tudo num lugar só</span>
          <h2 className="center">O que você tem por dentro</h2>
          <div className="lp-feats">
            {FEATURES.map((f) => (
              <div key={f.t} className="lp-feat">
                <span className="lp-featico"><f.Icon size={20} /></span>
                <b>{f.t}</b>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="lp-sec alt">
        <div className="lp-wrap">
          <span className="lp-eyebrow center">Simples assim</span>
          <h2 className="center">Como funciona</h2>
          <div className="lp-passos">
            {PASSOS.map((p) => (
              <div key={p.n} className="lp-passo">
                <span className="lp-passon">{p.n}</span>
                <b>{p.t}</b>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="lp-sec">
        <div className="lp-wrap lp-precowrap">
          <span className="lp-eyebrow center">Plano único, sem complicação</span>
          <h2 className="center">Comece hoje a enxergar seu lucro</h2>
          <div className="lp-plano">
            <div className="lp-planohead">
              <span className="lp-planotag">Assinatura mensal</span>
              <div className="lp-preco"><small>R$</small><b>{PRECO}</b><span>/mês</span></div>
              <p className="lp-planoanual">ou R$ {PRECO_ANUAL} no plano anual — <b>2 meses grátis</b></p>
            </div>
            <ul className="lp-planolist">
              {PLANO.map((item) => (
                <li key={item}><Check size={17} /> {item}</li>
              ))}
            </ul>
            <a href={CHECKOUT_URL} className="lp-cta big full">Assinar agora <ArrowRight size={18} /></a>
            <p className="lp-planofoot"><ShieldCheck size={15} /> Garantia de 7 dias — não gostou, devolvemos. Cancele quando quiser.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec alt">
        <div className="lp-wrap lp-faqwrap">
          <h2 className="center">Perguntas frequentes</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <div key={f.q} className="lp-faqi">
                <b>{f.q}</b>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-final">
        <div className="lp-wrap">
          <h2>Pare de adivinhar. <span className="lp-acc">Comece a decidir com números.</span></h2>
          <p>Leva poucos minutos para configurar e já no primeiro dia você enxerga o resultado da sua empresa.</p>
          <a href={CHECKOUT_URL} className="lp-cta big">Quero começar agora <ArrowRight size={18} /></a>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-footin">
          <span className="lp-logo sm">{MARCA}</span>
          <span>© {MARCA} · Gestão financeira para o seu negócio</span>
          <a href={ENTRAR_URL}>Entrar</a>
        </div>
      </footer>
    </main>
  );
}

const CSS = `
.lp{--bg:#0A0A0A;--card:#121212;--line:#222;--muted:#9aa0a6;--txt:#f4f5f7;--acc:#1AADE2;--green:#10B981;
  background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.lp a{color:inherit;text-decoration:none}
.lp h1,.lp h2{font-weight:800;letter-spacing:-.02em;line-height:1.08}
.lp .lp-acc{color:var(--acc)}
.lp-wrap{width:100%;max-width:1140px;margin:0 auto;padding:0 22px}
.lp-eyebrow{color:var(--acc);font-weight:700;text-transform:uppercase;letter-spacing:.16em;font-size:12.5px;display:block}
.lp-eyebrow.center,.center{text-align:center}
.lp-cta{display:inline-flex;align-items:center;gap:8px;background:var(--acc);color:#06222e;font-weight:800;border-radius:99px;padding:11px 20px;font-size:15px;transition:.15s;border:0;cursor:pointer}
.lp-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}
.lp-cta.sm{padding:8px 16px;font-size:14px}
.lp-cta.big{padding:15px 28px;font-size:16.5px}
.lp-cta.full{width:100%;justify-content:center}
.lp-ghost{display:inline-flex;align-items:center;gap:8px;color:var(--txt);font-weight:700;border:1px solid var(--line);border-radius:99px;padding:10px 18px;font-size:15px}
.lp-ghost:hover{border-color:var(--acc);color:var(--acc)}
.lp-ghost.big{padding:14px 24px;font-size:16px}

/* NAV */
.lp-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.lp-navin{display:flex;align-items:center;justify-content:space-between;height:64px}
.lp-logo{font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--acc)}
.lp-logo.sm{font-size:18px}
.lp-navlinks{display:flex;align-items:center;gap:18px}
.lp-navlinks a:not(.lp-cta):not(.lp-ghost){color:var(--muted);font-weight:600;font-size:14.5px}
.lp-navlinks a:not(.lp-cta):not(.lp-ghost):hover{color:var(--txt)}

/* HERO */
.lp-hero{padding:72px 0 64px;border-bottom:1px solid var(--line);background:radial-gradient(900px 420px at 78% -8%,rgba(26,173,226,.14),transparent)}
.lp-herogrid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
.lp-hero h1{font-size:clamp(34px,5vw,56px);margin:14px 0 18px}
.lp-lead{color:var(--muted);font-size:18px;line-height:1.6;max-width:560px}
.lp-herocta{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0 18px}
.lp-trust{display:flex;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:13.5px;font-weight:600}
.lp-trust span{display:inline-flex;align-items:center;gap:6px}
.lp-trust svg{color:var(--green)}

/* MOCKUP */
.lp-mock{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(0,0,0,.8)}
.lp-mockbar{display:flex;gap:7px;padding:13px 16px;border-bottom:1px solid var(--line)}
.lp-mockbar i{width:11px;height:11px;border-radius:50%;background:#333}
.lp-mockbody{padding:20px}
.lp-mockhi{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.lp-mockhi small{color:var(--muted);font-size:12px;display:block}
.lp-mockhi b{font-size:18px}
.lp-pill{background:rgba(16,185,129,.15);color:var(--green);font-weight:700;font-size:12.5px;padding:5px 11px;border-radius:99px;white-space:nowrap}
.lp-mockkpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.lp-k{background:#0f0f0f;border:1px solid var(--line);border-radius:12px;padding:12px}
.lp-k small{color:var(--muted);font-size:11px;display:block;margin-bottom:5px}
.lp-k b{font-size:16px}.lp-k b.g{color:var(--green)}
.lp-k i{display:block;height:4px;border-radius:99px;background:#262626;margin-top:9px}
.lp-k i.up{background:linear-gradient(90deg,var(--acc),var(--green))}
.lp-mockchart{display:flex;align-items:flex-end;gap:10px;height:120px;padding:14px;background:#0f0f0f;border:1px solid var(--line);border-radius:12px}
.lp-mockchart span{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--acc),rgba(26,173,226,.25))}

/* DOR */
.lp-pain{padding:64px 0}
.lp-pain h2{font-size:clamp(26px,3.6vw,38px);text-align:center;max-width:760px;margin:0 auto 30px}
.lp-paingrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.lp-paincard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
.lp-paincard svg{color:var(--acc);margin-bottom:10px}
.lp-paincard p{color:var(--muted);line-height:1.55;font-size:15px}
.lp-painline{text-align:center;font-size:18px;margin-top:28px;color:var(--txt)}

/* SECTIONS */
.lp-sec{padding:72px 0}
.lp-sec.alt{background:#0d0d0d;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.lp-sec h2{font-size:clamp(26px,3.6vw,40px);margin:10px 0 0}
.center h2,h2.center{text-align:center}
.lp-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:38px}
.lp-feat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px}
.lp-feat:hover{border-color:rgba(26,173,226,.4)}
.lp-featico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(26,173,226,.14);color:var(--acc);margin-bottom:14px}
.lp-feat b{font-size:16.5px;display:block;margin-bottom:6px}
.lp-feat p{color:var(--muted);line-height:1.55;font-size:14.5px}

/* PASSOS */
.lp-passos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:40px}
.lp-passo{text-align:center;padding:10px}
.lp-passon{width:46px;height:46px;border-radius:50%;display:inline-grid;place-items:center;background:var(--acc);color:#06222e;font-weight:800;font-size:20px;margin-bottom:14px}
.lp-passo b{font-size:18px;display:block;margin-bottom:6px}
.lp-passo p{color:var(--muted);line-height:1.55;max-width:300px;margin:0 auto;font-size:15px}

/* PLANO */
.lp-precowrap{max-width:560px}
.lp-plano{background:var(--card);border:1px solid rgba(26,173,226,.35);border-radius:22px;padding:34px;margin-top:34px;box-shadow:0 30px 80px -40px rgba(26,173,226,.5)}
.lp-planohead{text-align:center;border-bottom:1px solid var(--line);padding-bottom:22px;margin-bottom:22px}
.lp-planotag{display:inline-block;background:rgba(26,173,226,.14);color:var(--acc);font-weight:700;font-size:13px;padding:5px 13px;border-radius:99px;margin-bottom:14px}
.lp-preco{display:flex;align-items:baseline;justify-content:center;gap:4px}
.lp-preco small{font-size:22px;font-weight:700;color:var(--muted)}
.lp-preco b{font-size:62px;font-weight:800;letter-spacing:-.03em;line-height:1}
.lp-preco span{font-size:18px;color:var(--muted);font-weight:600}
.lp-planoanual{color:var(--muted);font-size:14px;margin-top:10px}
.lp-planolist{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:12px}
.lp-planolist li{display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.45}
.lp-planolist svg{color:var(--green);flex-shrink:0;margin-top:2px}
.lp-planofoot{display:flex;align-items:center;justify-content:center;gap:7px;color:var(--muted);font-size:13px;margin-top:16px;text-align:center}
.lp-planofoot svg{color:var(--green);flex-shrink:0}

/* FAQ */
.lp-faqwrap{max-width:780px}
.lp-faq{margin-top:34px;display:grid;gap:14px}
.lp-faqi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.lp-faqi b{font-size:16px;display:block;margin-bottom:8px}
.lp-faqi p{color:var(--muted);line-height:1.6;font-size:14.5px}

/* FINAL */
.lp-final{padding:84px 0;text-align:center;background:radial-gradient(700px 320px at 50% 120%,rgba(26,173,226,.16),transparent)}
.lp-final h2{font-size:clamp(28px,4vw,44px);max-width:780px;margin:0 auto 16px}
.lp-final p{color:var(--muted);font-size:18px;max-width:560px;margin:0 auto 28px;line-height:1.6}

/* FOOTER */
.lp-foot{border-top:1px solid var(--line);padding:26px 0}
.lp-footin{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:13.5px}
.lp-footin a:hover{color:var(--acc)}

@media(max-width:860px){
  .lp-herogrid{grid-template-columns:1fr;gap:34px}
  .lp-feats,.lp-paingrid,.lp-passos,.lp-mockkpis{grid-template-columns:1fr}
  .lp-mockkpis{grid-template-columns:repeat(3,1fr)}
  .lp-navlinks a[href="#recursos"],.lp-navlinks a[href="#planos"]{display:none}
  .lp-hero{padding:48px 0 44px}
  .lp-sec,.lp-pain{padding:52px 0}
}
`;
