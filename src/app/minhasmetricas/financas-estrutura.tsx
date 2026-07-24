"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Layers, Wallet, ChevronDown, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";

/**
 * Estrutura de Receitas e Custos — réplica da tela do Hub.
 *
 * Só as FOLHAS são editáveis (cada canal de receita e cada item de custo). Os
 * grupos, os blocos, a coluna "Total" e o resultado são somatórios calculados —
 * mexer numa folha reflete pra cima na hora. Tudo mora no navegador.
 */

const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CHAVE = "me_financas_estrutura";

// completa o array de valores até 12 meses (o que não veio nos dados é 0)
const v12 = (a: number[]): number[] => Array.from({ length: 12 }, (_, i) => a[i] ?? 0);

type Item = { nome: string; cor?: string; v: number[] };
// `financeiro` marca empréstimo/juros — o que o EBITDA soma de volta ao lucro
type Grupo = { nome: string; cor: string; itens: Item[]; financeiro?: boolean };
type Bloco = { nome: string; grupos: Grupo[] };
type Dados = { receitas: Item[]; custos: Bloco[] };

const AZUL = "#1AADE2", VERDE = "#10B981", ROXO = "#8b5cf6", LARANJA = "#F59E0B", ROSA = "#EC4899", VERMELHO = "#EF4444";

/* ── valores exatos transcritos dos relatórios ────────────────────────────── */
const PADRAO: Dados = {
  receitas: [
    { nome: "Comercial (B2C)", cor: AZUL, v: v12([36137, 29131, 22552.72, 25459, 35298, 51365, 797]) },
    { nome: "Escolas (B2B)", cor: VERDE, v: v12([0, 14396, 13916, 14266, 14266, 14276]) },
    { nome: "Renovações", cor: ROXO, v: v12([3012, 2246, 2395, 2794, 4998, 4194]) },
    { nome: "Vendas de produtos", cor: LARANJA, v: v12([900, 2297.41, 466.69, 570, 1676.71, 1180]) },
  ],
  custos: [
    {
      nome: "Custos Fixos",
      grupos: [
        {
          nome: "Salários – Comercial", cor: AZUL, itens: [
            { nome: "Yuri Carvalho (Diretor)", v: v12([5000, 5000, 4000, 4000, 4000, 4000]) },
            { nome: "Matheus", v: v12([0, 0, 2844.32, 2844.32, 2844.32, 2844.32]) },
            { nome: "Ana Paula", v: v12([1520, 1499.93, 1499.93, 1499.43, 1499.43, 1499.43]) },
            { nome: "Victor", v: v12([0, 1000, 1000]) },
          ],
        },
        {
          nome: "Salários – Operação", cor: ROXO, itens: [
            { nome: "Ana Gabrielly", v: v12([1520, 1200, 1110, 1110, 1110, 1110]) },
            { nome: "Bruno Cavalli (Diretor)", v: v12([2000, 2000, 4000, 4000, 4000, 4000]) },
            { nome: "Fabiola Martins", v: v12([0, 0, 0, 0, 1000, 1000]) },
            { nome: "João Pedro", v: v12([2000, 2000, 2000, 2000, 2000, 2000]) },
            { nome: "Juan Carlo", v: v12([0, 0, 2000, 3000]) },
            { nome: "Luiz Fernando (Diretor)", v: v12([0, 0, 0, 0, 2000, 3000]) },
            { nome: "Paulo Jesus", v: v12([0, 0, 0, 0, 600, 600]) },
            { nome: "Vitoria", v: v12([1520, 1510, 1404.15, 1499.43, 1499.43, 1499.43]) },
            { nome: "Willyam Silva", v: v12([0, 1000, 1000, 1000, 1000, 1000]) },
          ],
        },
        {
          nome: "Comissão", cor: LARANJA, itens: [
            { nome: "Time comercial", v: v12([6030, 5194, 2000, 500, 4200, 7600]) },
          ],
        },
        {
          nome: "Impostos / Férias / 13ª / Resc.", cor: ROXO, itens: [
            { nome: "13º", v: v12([0, 0, 0, 0, 0, 833.33]) },
            { nome: "Férias", v: v12([0, 0, 0, 0, 0, 1159.75]) },
            { nome: "Rescisão / Admissão", v: v12([90]) },
            { nome: "FGTS", v: v12([131.56, 222.64, 385.57, 507.12, 507, 582.02]) },
            { nome: "DARF", v: v12([113.85, 231.33, 361.46, 481.10, 480, 500]) },
          ],
        },
        {
          nome: "Operacional", cor: LARANJA, itens: [
            { nome: "Coworking", v: v12([190, 190, 190, 190, 190, 190]) },
            { nome: "Aluguel", v: v12([2168.80, 2168.80, 2393.49, 2393.49, 2393.49, 2393.49]) },
            { nome: "Internet", v: v12([99.90, 99.90, 99.90, 99.90, 99.90, 99.90]) },
            { nome: "Equatorial Sala 01", v: v12([43.28, 39.87, 46.11, 52.23, 52.42, 148.64]) },
            { nome: "Equatorial Sala 02", v: v12([201.18, 40.14, 71.35, 155.41, 201.21, 187.81]) },
            { nome: "Contabilidade", v: v12([619.51, 619.51, 619.51, 619.51, 619.51, 619.51]) },
            { nome: "Adobe (MKT)", v: v12([86.58, 80, 94, 94, 94, 80]) },
            { nome: "Assina Mais (COMERC)", v: v12([32, 32, 32, 32]) },
            { nome: "Chat GPT (COMERC)", v: v12([110.47, 107.65, 107.65, 115, 115, 115]) },
            { nome: "Claro (COMERC)", v: v12([68, 0, 0, 60, 0, 60]) },
            { nome: "Cursor IA", v: v12([112.55, 108.86, 108.86, 115]) },
            { nome: "Claude IA", v: v12([0, 0, 592.06, 1184.12, 1184.12, 597]) },
            { nome: "Manus IA", v: v12([0, 0, 108, 0, 115]) },
            { nome: "Eleven Labs (MKT)", v: v12([26, 26.59]) },
            { nome: "Google Suite (MKT)", v: v12([98, 98, 98, 98, 98, 100.37]) },
            { nome: "GPT Maker (COMERC)", v: v12([97]) },
            { nome: "Hospedagem (MKT)", v: v12([58.66, 58.57, 58.57, 58.57, 58.57, 58.57]) },
            { nome: "Hostinger", v: v12([0, 0, 0, 0, 0, 395.88]) },
            { nome: "Kommo CRM (COMERC)", v: v12([805.58]) },
            { nome: "Vimeo", v: v12([150, 150, 150, 150, 150, 150]) },
            { nome: "WhatsApp Business (COMERC)", v: v12([118.96, 0, 120.06, 107.81, 107.10, 60]) },
            { nome: "Z-API (COMERC)", v: v12([99.90, 99.99, 99.99, 99.99, 99.90, 99.99]) },
          ],
        },
      ],
    },
    {
      nome: "Custos Variáveis",
      grupos: [
        {
          nome: "Marketing e Publicidade", cor: ROSA, itens: [
            { nome: "Tráfego Pago B2C", v: v12([2054, 2080.90, 3973.09, 4300.57, 5372.18, 5051.03]) },
            { nome: "Influenciadora VIVIANE", v: v12([0, 0, 0, 1000, 1000, 1000]) },
            { nome: "Rebranding", v: v12([1662.50, 1662.50]) },
          ],
        },
        {
          nome: "Taxas e Antecipações", cor: ROSA, itens: [
            { nome: "Taxa de cartão", v: v12([1286.17, 1235.34, 1165, 1299.87, 1677.37, 394.05]) },
            { nome: "Comissão Juan", v: v12([230.60, 309.66, 216, 309, 551.55, 160.86]) },
            { nome: "Taxa de Antecipação", v: v12([1525.36, 3697.49, 2796.32, 3072.18, 3733.66, 1012.19]) },
            { nome: "Demais Taxas", v: v12([32.79, 19.86, 32.79, 34.77, 62.63, 87.50]) },
          ],
        },
        {
          nome: "Terceirizados", cor: VERDE, itens: [
            { nome: "Representante Comercial", v: v12([0, 2083.80, 1973.40, 2056.20, 2056, 2056]) },
            { nome: "Correios", v: v12([290, 191.10, 598, 595, 800, 349]) },
            { nome: "Hubix", v: v12([2000, 2000, 2000, 2000, 0, 2000]) },
            { nome: "Hubix Perfil", v: v12([360, 360, 360, 360]) },
            { nome: "Registro de marca", v: v12([0, 860]) },
            { nome: "Limpeza da sala", v: v12([0, 0, 0, 0, 140]) },
            { nome: "IEL Estágio", v: v12([0, 0, 117, 117, 117, 117]) },
            { nome: "Solides (Ponto Digital)", v: v12([10.92, 11.16]) },
            { nome: "Cartório (Instituto)", v: v12([0, 0, 0, 465]) },
            { nome: "ACATE", v: v12([0, 0, 0, 0, 397]) },
            { nome: "Abertura CNPJ Instituto", v: v12([0, 0, 0, 350]) },
            { nome: "Tx de Licença de localização", v: v12([0, 0, 0, 0, 0, 342.91]) },
            { nome: "Plano Adapta ITAU", v: v12([0, 0, 0, 0, 0, 169.49]) },
            { nome: "Lanches e cafés", v: v12([158.09, 125, 250, 250, 192, 170]) },
            { nome: "Manutenção", v: v12([350, 0, 620, 412, 400, 650]) },
            { nome: "Troféus e Medalhas / Pulseiras", v: v12([0, 0, 1725, 0, 241]) },
            { nome: "Caixa para envio", v: v12([0, 69.97, 0, 69.97, 0, 85]) },
            { nome: "Perfume para envio", v: v12([0, 26.90]) },
            { nome: "Cordão", v: v12([0, 87.41]) },
            { nome: "Porta Crachá", v: v12([0, 43.97]) },
            { nome: "Plástico Bolha", v: v12([0, 23.10]) },
            { nome: "Microfone Hollyland", v: v12([0, 668]) },
            { nome: "Material Didático", v: v12([0, 2616]) },
          ],
        },
        {
          nome: "Pagamento de Empréstimo", cor: LARANJA, financeiro: true, itens: [
            { nome: "Capital de giro (Pronampe)", v: v12([285.54, 299, 308.65, 296.96, 310, 342.44]) },
            { nome: "IOF", v: v12([0, 0, 0, 0, 0, 30.08]) },
          ],
        },
        {
          nome: "Impostos e Juros", cor: ROXO, financeiro: true, itens: [
            { nome: "DAS - ISS", v: v12([2092.81, 1518.10, 2150, 1383.33, 2255, 1771.71]) },
          ],
        },
      ],
    },
  ],
};

/* Resultado e EBITDA exatos dos relatórios (mensal, Jan–Jun). */
const RESULTADO = v12([2598.44, 2639.30, -7549.82, -3349.28, 2358.67, 16385.14]);
const EBITDA = v12([4976.79, 4456.40, -5091.17, -1668.99, 4923.67, 18529.37]);

/* ── helpers de número em pt-BR ───────────────────────────────────────────── */
const fmt = (n: number) => (Math.abs(n) < 0.005 ? "–" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtR = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// "1.234,56" -> 1234.56
const parseBR = (s: string) => { const n = parseFloat(s.replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };

// soma por mês de uma lista de itens (grupo/bloco)
const somaPorMes = (itens: { v: number[] }[]) => Array.from({ length: 12 }, (_, m) => itens.reduce((s, it) => s + it.v[m], 0));

export default function EstruturaFinancas() {
  const [d, setD] = useState<Dados>(PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set()); // meses exibidos (vazio só antes de carregar)
  const [abertos, setAbertos] = useState<Set<string>>(new Set()); // grupos expandidos
  const [blocosFechados, setBlocosFechados] = useState<Set<number>>(new Set()); // blocos recolhidos
  const toggleBloco = (bi: number) => setBlocosFechados((p) => { const n = new Set(p); if (n.has(bi)) n.delete(bi); else n.add(bi); return n; });
  const [aExcluir, setAExcluir] = useState<{ nome: string; onOk: () => void } | null>(null);
  const pedirExcluir = (nome: string, onOk: () => void) => setAExcluir({ nome, onOk });

  // "desfazer exclusão" com contagem regressiva de 10s visível na tela
  const [desfazer, setDesfazer] = useState<{ texto: string; onDesfazer: () => void } | null>(null);
  const [segRestante, setSegRestante] = useState(0);
  const desfazerI = useRef<number | undefined>(undefined);
  const fecharDesfazer = () => { window.clearInterval(desfazerI.current); setDesfazer(null); };
  const mostrarDesfazer = (texto: string, onDesfazer: () => void) => {
    setDesfazer({ texto, onDesfazer });
    setSegRestante(10);
    window.clearInterval(desfazerI.current);
    desfazerI.current = window.setInterval(() => {
      setSegRestante((s) => { if (s <= 1) { window.clearInterval(desfazerI.current); setDesfazer(null); return 0; } return s - 1; });
    }, 1000);
  };

  // avisinho "Salvo" que aparece ao lado do campo editado e some em 1,5s
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);
  const salvo = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: r.right });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  };

  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (cru) setD(JSON.parse(cru));
    } catch { /* começa no padrão */ }
    // padrão: Jan até o mês corrente (data lida só no cliente, evita hidratação)
    const atual = new Date().getMonth();
    setSel(new Set(Array.from({ length: atual + 1 }, (_, i) => i)));
    setCarregado(true);
  }, []);
  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* ignora */ }
  }, [d, carregado]);

  // colunas visíveis = meses selecionados (em ordem); sem seleção, mostra todos
  const mesesVis = useMemo(() => (sel.size ? [...sel].sort((a, b) => a - b) : MES.map((_, i) => i)), [sel]);
  const totalDe = (v: number[]) => mesesVis.reduce((s, m) => s + v[m], 0);
  const toggleMes = (m: number) => setSel((p) => { const n = new Set(p); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  const toggleGrupo = (id: string) => setAbertos((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // as três tabelas rolam juntas na horizontal, senão Jan sai do lugar ao arrastar
  const scrolls = useRef<(HTMLDivElement | null)[]>([]);
  const sincronizar = (de: number) => {
    const sl = scrolls.current[de]?.scrollLeft ?? 0;
    scrolls.current.forEach((el, i) => { if (i !== de && el && el.scrollLeft !== sl) el.scrollLeft = sl; });
  };

  /* edição de folhas e nomes (imutável) */
  function editarReceita(ri: number, m: number, valor: number) {
    setD((x) => { const r = structuredClone(x); r.receitas[ri].v[m] = valor; return r; });
  }
  function editarCusto(bi: number, gi: number, ii: number, m: number, valor: number) {
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens[ii].v[m] = valor; return r; });
  }
  function nomeReceita(ri: number, nome: string) {
    setD((x) => { const r = structuredClone(x); r.receitas[ri].nome = nome; return r; });
  }
  function nomeItem(bi: number, gi: number, ii: number, nome: string) {
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens[ii].nome = nome; return r; });
  }
  const CINZA = "#94a3b8";
  function addReceita() {
    setD((x) => { const r = structuredClone(x); r.receitas.push({ nome: "", cor: CINZA, v: v12([]) }); return r; });
  }
  function removerReceita(ri: number) {
    const removido = structuredClone(d.receitas[ri]);
    setD((x) => { const r = structuredClone(x); r.receitas.splice(ri, 1); return r; });
    mostrarDesfazer(`"${removido.nome || "canal"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.receitas.splice(ri, 0, removido); return r; }));
  }
  function addItem(bi: number, gi: number) {
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.push({ nome: "", v: v12([]) }); return r; });
  }
  function removerItem(bi: number, gi: number, ii: number) {
    const removido = structuredClone(d.custos[bi].grupos[gi].itens[ii]);
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.splice(ii, 1); return r; });
    mostrarDesfazer(`"${removido.nome || "item"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].itens.splice(ii, 0, removido); return r; }));
  }
  const CORES_GRUPO = [AZUL, ROXO, LARANJA, ROSA, VERDE];
  function nomeGrupo(bi: number, gi: number, nome: string) {
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos[gi].nome = nome; return r; });
  }
  function addGrupo(bi: number) {
    setD((x) => { const r = structuredClone(x); const g = r.custos[bi].grupos; g.push({ nome: "", cor: CORES_GRUPO[g.length % CORES_GRUPO.length], itens: [] }); return r; });
    // já deixa o grupo novo aberto para cadastrar itens
    setAbertos((p) => new Set(p).add(`${bi}-${d.custos[bi].grupos.length}`));
  }
  function removerGrupo(bi: number, gi: number) {
    const removido = structuredClone(d.custos[bi].grupos[gi]);
    setD((x) => { const r = structuredClone(x); r.custos[bi].grupos.splice(gi, 1); return r; });
    mostrarDesfazer(`Grupo "${removido.nome || "grupo"}" excluído`, () =>
      setD((x) => { const r = structuredClone(x); r.custos[bi].grupos.splice(gi, 0, removido); return r; }));
  }

  /* somatórios */
  const recTotais = useMemo(() => somaPorMes(d.receitas), [d]);
  const blocosMes = useMemo(() => d.custos.map((b) => somaPorMes(b.grupos.flatMap((g) => g.itens))), [d]);
  const custosTotais = useMemo(() => Array.from({ length: 12 }, (_, m) => blocosMes.reduce((s, b) => s + b[m], 0)), [blocosMes]);
  // financeiro (empréstimo + impostos/juros) para o EBITDA
  // Resultado e EBITDA vêm exatos dos relatórios (o Hub não os deriva dos totais
  // exibidos — Receitas − Custos daria outro número). A margem é derivada deles.
  const resultadoMes = RESULTADO;
  const ebitdaMes = EBITDA;

  if (!carregado) return null;

  // larguras FIXAS iguais nas três tabelas: é isso que alinha Jan..Dez de ponta
  // a ponta entre Receitas, Custos e Resultado
  const W_ROT = 224, W_MES = 100, W_TOT = 112;
  const larguraMin = W_ROT + mesesVis.length * W_MES + W_TOT;
  const cols = { W_ROT, W_MES, W_TOT, meses: mesesVis };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* seletor de meses — compacto, cinza moderno, alinhado à esquerda */}
      <div className="card" style={{ padding: 10, display: "flex", justifyContent: "flex-start", flexWrap: "wrap", gap: 5 }}>
        {MES.map((m, i) => {
          const on = sel.has(i);
          return (
            <button key={m} onClick={() => toggleMes(i)} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              border: on ? "1px solid transparent" : "1px solid var(--line-2)",
              background: on ? "#475569" : "transparent",
              color: on ? "#fff" : "var(--muted)", transition: ".12s",
            }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>{m}</button>
          );
        })}
      </div>

      {/* COMPOSIÇÃO DAS RECEITAS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Receitas totais" valor={fmtR(totalDe(recTotais))} cor={VERDE} />
        </div>
        <div ref={(el) => { scrolls.current[0] = el; }} onScroll={() => sincronizar(0)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<TrendingUp size={16} />} titulo="Composição das Receitas" cor={VERDE} meses={mesesVis} />
            <tbody>
              {d.receitas.map((r, ri) => (
                <tr key={ri} style={{ borderTop: "1px solid var(--line)" }}>
                  <NomeCel cor={r.cor} valor={r.nome} placeholder="Novo canal" reservaChevron onSalvo={salvo} onChange={(nv) => nomeReceita(ri, nv)} onRemover={() => pedirExcluir(r.nome || "este canal de venda", () => removerReceita(ri))} />
                  {mesesVis.map((m) => (
                    <Celula key={m} valor={r.v[m]} onSalvo={salvo} onChange={(nv) => editarReceita(ri, m, nv)} />
                  ))}
                  <Total>{fmt(totalDe(r.v))}</Total>
                </tr>
              ))}
              <AddSubtil span={mesesVis.length + 2} texto="cadastrar canal de venda" onClick={addReceita} />
              <tr style={{ borderTop: "2px solid var(--line-2)", background: "var(--card-2)" }}>
                <td style={{ ...tdRot, fontWeight: 800, background: "var(--card-2)" }}>Receitas totais</td>
                {mesesVis.map((m) => <td key={m} style={{ ...tdNum, fontWeight: 800 }}>{fmt(recTotais[m])}</td>)}
                <td style={{ ...tdNum, fontWeight: 800, color: VERDE }}>{fmt(totalDe(recTotais))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALHAMENTO DOS CUSTOS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Custos totais" valor={fmtR(totalDe(custosTotais))} cor={VERMELHO} />
        </div>
        <div ref={(el) => { scrolls.current[1] = el; }} onScroll={() => sincronizar(1)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<Layers size={16} />} titulo="Detalhamento dos Custos" cor={VERMELHO} meses={mesesVis} />
            <tbody>
              {d.custos.map((b, bi) => {
                const blocoAberto = !blocosFechados.has(bi);
                return (
                <FragBloco key={bi}>
                  {/* linha do bloco — chevron recolhe todos os grupos abaixo */}
                  <tr style={{ background: "var(--card-2)", borderTop: "2px solid var(--line-2)" }}>
                    <td style={{ ...tdRot, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", fontSize: 11.5, background: "var(--card-2)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <Chevron aberto={blocoAberto} onClick={() => toggleBloco(bi)} />
                        {b.nome}
                      </span>
                    </td>
                    {mesesVis.map((m) => <td key={m} onClick={() => toggleBloco(bi)} style={{ ...tdNum, fontWeight: 800, cursor: "pointer" }}>{fmt(blocosMes[bi][m])}</td>)}
                    <td onClick={() => toggleBloco(bi)} style={{ ...tdNum, fontWeight: 800, cursor: "pointer" }}>{fmt(totalDe(blocosMes[bi]))}</td>
                  </tr>
                  {blocoAberto && b.grupos.map((g, gi) => {
                    const id = `${bi}-${gi}`;
                    const gm = somaPorMes(g.itens);
                    const aberto = abertos.has(id);
                    return (
                      <FragBloco key={gi}>
                        {/* grupo: clicar expande; só depois aparece o lápis para editar/excluir */}
                        <tr style={{ borderTop: "1px solid var(--line)" }}>
                          <GrupoCel cor={g.cor} valor={g.nome} aberto={aberto} onToggle={() => toggleGrupo(id)} onSalvo={salvo}
                            onChange={(nv) => nomeGrupo(bi, gi, nv)}
                            onRemover={() => pedirExcluir(g.nome || "este grupo", () => removerGrupo(bi, gi))} />
                          {mesesVis.map((m) => <td key={m} onClick={() => toggleGrupo(id)} style={{ ...tdNum, fontWeight: 500, cursor: "pointer" }}>{fmt(gm[m])}</td>)}
                          <td onClick={() => toggleGrupo(id)} style={{ ...tdNum, fontWeight: 700, cursor: "pointer" }}>{fmt(totalDe(gm))}</td>
                        </tr>
                        {/* itens (folhas editáveis: nome e valores) */}
                        {aberto && g.itens.map((it, ii) => (
                          <tr key={ii} style={{ borderTop: "1px solid var(--line)" }}>
                            <NomeCel valor={it.nome} placeholder="Novo item" italico indent={30} onSalvo={salvo} onChange={(nv) => nomeItem(bi, gi, ii, nv)} onRemover={() => pedirExcluir(it.nome || "este item", () => removerItem(bi, gi, ii))} />
                            {mesesVis.map((m) => <Celula key={m} valor={it.v[m]} italico onSalvo={salvo} onChange={(nv) => editarCusto(bi, gi, ii, m, nv)} />)}
                            <td style={{ ...tdNum, fontStyle: "italic", color: "var(--muted)" }}>{fmt(totalDe(it.v))}</td>
                          </tr>
                        ))}
                        {aberto && <AddSubtil span={mesesVis.length + 2} texto={`cadastrar item em "${g.nome || "grupo"}"`} onClick={() => addItem(bi, gi)} indent={30} />}
                      </FragBloco>
                    );
                  })}
                  {/* adicionar grupo: sutil, pois é um nível de somatório */}
                  {blocoAberto && <AddSubtil span={mesesVis.length + 2} texto="adicionar grupo" onClick={() => addGrupo(bi)} />}
                </FragBloco>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--line-2)", background: "var(--card-2)" }}>
                <td style={{ ...tdRot, fontWeight: 800, textTransform: "uppercase", background: "var(--card-2)" }}>Custos totais</td>
                {mesesVis.map((m) => <td key={m} style={{ ...tdNum, fontWeight: 800 }}>{fmt(custosTotais[m])}</td>)}
                <td style={{ ...tdNum, fontWeight: 800, color: VERMELHO }}>{fmt(totalDe(custosTotais))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RESULTADO · EBITDA · MARGEM */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px" }}>
          <BadgeTotal badge="Resultado do período" valor={`${totalDe(resultadoMes) >= 0 ? "+" : ""}${fmtR(totalDe(resultadoMes))}`} cor={ROXO} />
        </div>
        <div ref={(el) => { scrolls.current[2] = el; }} onScroll={() => sincronizar(2)} style={{ overflowX: "auto" }}>
          <table style={{ width: larguraMin, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <Colgroup c={cols} />
            <THead icone={<Wallet size={16} />} titulo="Resultado · EBITDA · Margem" cor={ROXO} meses={mesesVis} />
            <tbody>
              <LinhaResultado nome="Resultado (Lucro)" v={resultadoMes} total={totalDe(resultadoMes)} meses={mesesVis} moeda />
              <LinhaResultado nome="EBITDA" v={ebitdaMes} total={totalDe(ebitdaMes)} meses={mesesVis} moeda />
              <LinhaMargem resultado={resultadoMes} receita={recTotais} totalRes={totalDe(resultadoMes)} totalRec={totalDe(recTotais)} meses={mesesVis} />
            </tbody>
          </table>
        </div>
      </div>

      {/* avisinho "Salvo" ao lado do campo, some em 1,5s — cinza neutro e discreto */}
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 90, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* barra "desfazer exclusão" — com contagem regressiva visível de 7s */}
      {desfazer && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 85,
          display: "flex", alignItems: "center", gap: 14, background: "#1e293b", color: "#fff",
          padding: "10px 12px 10px 18px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)" }}>
          <span style={{ fontSize: 13 }}>{desfazer.texto}</span>
          <button onClick={() => { desfazer.onDesfazer(); fecharDesfazer(); }}
            style={{ background: "transparent", border: 0, color: "#38BDF8", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Desfazer exclusão
          </button>
          {/* contador regressivo até 0 */}
          <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{segRestante}</span>
        </div>
      )}

      {/* confirmação de exclusão — apagar é definitivo */}
      {aExcluir && (
        <div onClick={() => setAExcluir(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.14)", color: VERMELHO, flexShrink: 0 }}>
                <Trash2 size={19} />
              </span>
              <div>
                <b style={{ fontSize: 15 }}>Excluir &ldquo;{aExcluir.nome}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Esta ação é <strong>definitiva</strong> e não pode ser desfeita.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAExcluir(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} onClick={() => { aExcluir.onOk(); setAExcluir(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── peças ─────────────────────────────────────────────────────────────── */
type Cols = { W_ROT: number; W_MES: number; W_TOT: number; meses: number[] };
const tdRot: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", position: "sticky", left: 0, background: "var(--card)", zIndex: 1 };
const tdNum: React.CSSProperties = { padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

/** Larguras fixas das colunas — o mesmo colgroup em todas as tabelas alinha Jan..Dez. */
function Colgroup({ c }: { c: Cols }) {
  return (
    <colgroup>
      <col style={{ width: c.W_ROT }} />
      {c.meses.map((m) => <col key={m} style={{ width: c.W_MES }} />)}
      <col style={{ width: c.W_TOT }} />
    </colgroup>
  );
}

/** Badge do total, alinhado à esquerda acima da tabela. */
function BadgeTotal({ badge, valor, cor }: { badge: string; valor: string; cor: string }) {
  return (
    <div style={{ display: "inline-block", textAlign: "left", background: cor + "14", border: `1px solid ${cor}44`, borderRadius: 12, padding: "8px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: cor }}>{badge}</div>
      <b style={{ fontSize: 18 }}>{valor}</b>
    </div>
  );
}

/** Cabeçalho da tabela: o ícone + título do bloco vivem na 1ª célula desta linha. */
function THead({ icone, titulo, cor, meses }: { icone: React.ReactNode; titulo: string; cor: string; meses: number[] }) {
  const th: React.CSSProperties = { padding: "9px 10px", textAlign: "right", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", whiteSpace: "nowrap" };
  return (
    <thead>
      <tr style={{ background: "var(--card-2)" }}>
        <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: "var(--card-2)", padding: "8px 12px", whiteSpace: "normal" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: cor + "22", color: cor, flexShrink: 0 }}>{icone}</span>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: "none", letterSpacing: 0, color: "var(--txt)", lineHeight: 1.15 }}>{titulo}</span>
          </span>
        </th>
        {meses.map((m) => <th key={m} style={th}>{MES[m]}</th>)}
        <th style={th}>Total</th>
      </tr>
    </thead>
  );
}

/**
 * Rótulo com nome EDITÁVEL (canal de receita ou item de custo). A lixeira só
 * aparece quando o campo está em edição (foco), e apagar passa por confirmação.
 * `reservaChevron` guarda o espaço da setinha para as bolinhas ficarem alinhadas
 * com as dos grupos (que têm o chevron de expandir).
 */
function NomeCel({ cor, valor, placeholder, onChange, onRemover, italico, indent, reservaChevron, onSalvo, lider, peso }: {
  cor?: string; valor: string; placeholder: string; onChange: (v: string) => void; onRemover?: () => void; italico?: boolean; indent?: number; reservaChevron?: boolean; onSalvo?: (el: HTMLElement) => void; lider?: React.ReactNode; peso?: number;
}) {
  const [focado, setFocado] = useState(false);
  const inicial = useRef("");
  return (
    <td style={{ ...tdRot, fontWeight: italico ? 400 : (peso ?? 500), fontStyle: italico ? "italic" : undefined, color: italico ? "var(--muted)" : undefined, paddingLeft: indent }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
        {lider}
        {reservaChevron && !lider && <span style={{ width: 13, flexShrink: 0 }} />}
        {cor && <span style={{ width: 7, height: 7, borderRadius: 99, background: cor, flexShrink: 0 }} />}
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, minWidth: 40, background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "3px 5px", font: "inherit", fontStyle: italico ? "italic" : undefined, color: "inherit", outline: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          onFocus={(e) => { setFocado(true); inicial.current = valor; e.currentTarget.style.borderColor = "var(--line-2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; if (valor !== inicial.current) onSalvo?.(e.currentTarget); setTimeout(() => setFocado(false), 150); }} />
        {onRemover && focado && (
          <button onMouseDown={(e) => e.preventDefault()} onClick={onRemover} title="Excluir" aria-label="Excluir"
            style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--red)", cursor: "pointer", padding: 2, borderRadius: 5, lineHeight: 0 }}>
            <Trash2 size={13} />
          </button>
        )}
      </span>
    </td>
  );
}

/**
 * Rótulo do GRUPO: mais restrito que o item. Clicar expande/recolhe. Só quando
 * está aberto surge um lápis quase transparente; clicando nele é que o nome vira
 * editável (e aparece a lixeira). Fora disso, o nome é só texto clicável.
 */
function GrupoCel({ cor, valor, aberto, onToggle, onChange, onSalvo, onRemover }: {
  cor: string; valor: string; aberto: boolean; onToggle: () => void; onChange: (v: string) => void; onSalvo?: (el: HTMLElement) => void; onRemover?: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const inicial = useRef("");
  return (
    <td style={{ ...tdRot, fontWeight: 600 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
        <Chevron aberto={aberto} onClick={onToggle} />
        <span style={{ width: 7, height: 7, borderRadius: 99, background: cor, flexShrink: 0 }} />
        {editando ? (
          <>
            <input autoFocus value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Nome do grupo"
              style={{ flex: 1, minWidth: 40, background: "transparent", border: "1px solid var(--line-2)", borderRadius: 6, padding: "3px 5px", font: "inherit", fontWeight: 600, color: "inherit", outline: "none" }}
              onBlur={(e) => { if (valor !== inicial.current) onSalvo?.(e.currentTarget); setEditando(false); }} />
            {onRemover && (
              // lixeira encostada à direita, longe de onde estava o lápis, para não apagar por engano num clique repetido
              <button onMouseDown={(e) => e.preventDefault()} onClick={onRemover} title="Excluir grupo" aria-label="Excluir grupo"
                style={{ flexShrink: 0, marginLeft: 6, background: "rgba(239,68,68,.1)", border: 0, color: "var(--red)", cursor: "pointer", padding: 4, borderRadius: 7, lineHeight: 0 }}>
                <Trash2 size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            {/* nome + lápis logo ao lado; o resto da linha é área de clique para expandir */}
            <span onClick={onToggle} style={{ cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
              {valor || <span style={{ color: "var(--muted)", fontWeight: 400 }}>Novo grupo</span>}
            </span>
            {aberto && (
              <button onClick={() => { inicial.current = valor; setEditando(true); }} title="Editar grupo" aria-label="Editar grupo"
                style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 2, lineHeight: 0, opacity: .3, transition: ".15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = ".3")}>
                <Pencil size={12} />
              </button>
            )}
            <span onClick={onToggle} style={{ flex: 1, alignSelf: "stretch", cursor: "pointer" }} />
          </>
        )}
      </span>
    </td>
  );
}

/** Setinha de expandir/recolher o grupo (não dispara a edição do nome). */
function Chevron({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={aberto ? "Recolher" : "Expandir"}
      style={{ flexShrink: 0, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 0, display: "grid", placeItems: "center" }}>
      {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
    </button>
  );
}

/** Adicionar sutil (grupo, item ou canal de venda) — mesmo padrão em toda a tela. */
function AddSubtil({ span, texto, onClick, indent }: { span: number; texto: string; onClick: () => void; indent?: number }) {
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td colSpan={span} style={{ padding: "5px 12px", paddingLeft: indent ?? 12 }}>
        <button onClick={onClick}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: 0, color: "var(--muted)", borderRadius: 6, padding: "3px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: .7, transition: ".15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--brand)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = ".7"; e.currentTarget.style.color = "var(--muted)"; }}>
          <Plus size={12} /> {texto}
        </button>
      </td>
    </tr>
  );
}

/** Célula editável de valor. Mostra "–" no zero e vira input ao focar. */
function Celula({ valor, onChange, italico, onSalvo }: { valor: number; onChange: (v: number) => void; italico?: boolean; onSalvo?: (el: HTMLElement) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  const editando = txt !== null;
  return (
    <td style={{ ...tdNum, fontStyle: italico ? "italic" : undefined, color: italico ? "var(--muted)" : undefined, padding: "6px 4px" }}>
      <input
        value={editando ? txt! : (Math.abs(valor) < 0.005 ? "" : fmt(valor))}
        placeholder="–"
        onFocus={(e) => { setTxt(Math.abs(valor) < 0.005 ? "" : fmt(valor)); e.currentTarget.style.borderColor = "var(--line-2)"; }}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => {
          if (editando) { const nv = parseBR(txt!); if (nv !== valor) { onChange(nv); onSalvo?.(e.currentTarget); } }
          setTxt(null); e.currentTarget.style.borderColor = "transparent";
        }}
        inputMode="decimal"
        style={{
          width: "100%", boxSizing: "border-box", textAlign: "right", background: "transparent", border: "1px solid transparent", borderRadius: 7,
          padding: "4px 5px", font: "inherit", fontStyle: italico ? "italic" : undefined, color: "inherit", outline: "none",
          fontVariantNumeric: "tabular-nums",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
        onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
      />
    </td>
  );
}

function Total({ children }: { children: React.ReactNode }) {
  return <td style={{ ...tdNum, fontWeight: 700 }}>{children}</td>;
}

// só para agrupar linhas sem quebrar a tabela
function FragBloco({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function LinhaResultado({ nome, v, total, meses, moeda }: { nome: string; v: number[]; total: number; meses: number[]; moeda?: boolean }) {
  const cor = (n: number) => (n >= 0 ? VERDE : VERMELHO);
  const f = (n: number) => (moeda ? `${n >= 0 ? "" : "-"}R$ ${Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fmt(n));
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ ...tdRot, fontWeight: 700 }}>{nome}</td>
      {meses.map((m) => <td key={m} style={{ ...tdNum, fontWeight: 700, color: Math.abs(v[m]) > 0.005 ? cor(v[m]) : "var(--muted)" }}>{Math.abs(v[m]) < 0.005 ? "–" : f(v[m])}</td>)}
      <td style={{ ...tdNum, fontWeight: 800, color: cor(total) }}>{f(total)}</td>
    </tr>
  );
}

function LinhaMargem({ resultado, receita, totalRes, totalRec, meses }: { resultado: number[]; receita: number[]; totalRes: number; totalRec: number; meses: number[] }) {
  const pct = (r: number, rec: number) => (rec > 0 ? (r / rec) * 100 : 0);
  const cor = (n: number) => (n >= 0 ? VERDE : VERMELHO);
  const totalPct = pct(totalRes, totalRec);
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ ...tdRot, fontWeight: 700 }}>Margem líquida</td>
      {meses.map((m) => {
        const p = pct(resultado[m], receita[m]);
        const vazio = Math.abs(receita[m]) < 0.005;
        return <td key={m} style={{ ...tdNum, fontWeight: 700, color: vazio ? "var(--muted)" : cor(p) }}>{vazio ? "–" : `${Math.round(p)}%`}</td>;
      })}
      <td style={{ ...tdNum, fontWeight: 800, color: cor(totalPct) }}>{`${totalPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}</td>
    </tr>
  );
}
