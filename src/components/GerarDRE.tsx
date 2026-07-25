"use client";
import { useState, Fragment } from "react";
import { Printer, X, FileText } from "lucide-react";
import { Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { MES, Dados, Grupo, carregarEstrutura, resultadoDe, ebitdaDe } from "@/app/minhasmetricas/financas-estrutura";

const MESES_EXT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function lerExtra(id?: string | null): { ie?: string; email?: string; contato?: string; endereco?: string } {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(`me_empresa_extra:${id || "default"}`) || "{}"); } catch { return {}; }
}

// número em pt-BR; negativos entre parênteses; ~0 vira travessão de vazio
function num(n: number): string {
  if (Math.abs(n) < 0.005) return "–";
  const s = Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
}
const somaMes = (linhas: { v: number[] }[], m: number) => linhas.reduce((s, l) => s + (l.v[m] || 0), 0);
const totalV = (v: number[]) => v.reduce((s, x) => s + x, 0);
const somaGrupos = (grupos: Grupo[], m: number) => grupos.reduce((s, g) => s + somaMes(g.itens, m), 0);

function DRE({ data, ano, empresa, brand, onFechar }: { data: Dados; ano: number; empresa: Empresa | null; brand: Brand; onFechar: () => void }) {
  const [modo, setModo] = useState<"reduzida" | "completa">("reduzida");
  const extra = lerExtra(empresa?.id);
  const nomeEmpresa = brand?.nome && brand.nome !== "Minha Empresa" ? brand.nome
    : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");

  const grupos = data.custos.flatMap((b) => b.grupos);
  const receitaMes = (m: number) => somaMes(data.receitas, m);
  const custoMes = (m: number) => somaGrupos(grupos, m);
  const RESULTADO = resultadoDe(data);
  const EBITDA = ebitdaDe(data);
  const margem = (m: number) => { const r = receitaMes(m); return r ? RESULTADO[m] / r : 0; };

  const th: React.CSSProperties = { padding: "5px 6px", fontSize: 8.5, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: "#334155", borderBottom: "1.5px solid #cbd5e1", textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "4px 6px", fontSize: 9, color: "#1e293b", borderBottom: "1px solid #eef2f7", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  const tdRot: React.CSSProperties = { ...td, textAlign: "left" };

  // uma linha da tabela: rótulo + 12 meses + total
  const Linha = ({ rotulo, vals, tipo = "item", indent = 0 }: { rotulo: string; vals: number[]; tipo?: "sec" | "grupo" | "item" | "res"; indent?: number }) => {
    const fundo = tipo === "sec" ? "#eef2ff" : tipo === "res" ? "#f8fafc" : undefined;
    const peso = tipo === "sec" || tipo === "res" ? 800 : tipo === "grupo" ? 700 : 500;
    const cor = tipo === "item" ? "#475569" : "#0f172a";
    return (
      <tr style={{ background: fundo }}>
        <td style={{ ...tdRot, fontWeight: peso, color: cor, paddingLeft: 8 + indent, fontStyle: tipo === "item" ? "normal" : "normal" }}>{rotulo}</td>
        {vals.map((v, m) => <td key={m} style={{ ...td, fontWeight: peso, color: cor }}>{num(v)}</td>)}
        <td style={{ ...td, fontWeight: 800, color: cor, borderLeft: "1px solid #e2e8f0" }}>{num(totalV(vals))}</td>
      </tr>
    );
  };

  return (
    <div className="relatorio-modal" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,.6)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column" }}>
      {/* barra superior branca */}
      <div className="no-print" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", background: "#fff", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}><FileText size={16} /> Demonstração de Resultados (DRE)</b>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 99, padding: 2 }}>
            {(["reduzida", "completa"] as const).map((k) => (
              <button key={k} onClick={() => setModo(k)}
                style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0, textTransform: "capitalize", background: modo === k ? "#1AADE2" : "transparent", color: modo === k ? "#fff" : "#64748b" }}>{k}</button>
            ))}
          </div>
          <button className="btn" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={15} /> Imprimir / Salvar PDF</button>
          <button onClick={onFechar} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 10, background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }}><X size={15} /> Fechar</button>
        </div>
      </div>

      {/* folha */}
      <div className="relatorio-scroll" style={{ flex: 1, overflow: "auto", padding: "20px 12px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <div className="relatorio-print" style={{ width: "100%", maxWidth: 1000, background: "#fff", color: "#0f172a", borderRadius: 8, padding: 36, boxShadow: "0 20px 60px -20px rgba(0,0,0,.5)" }}>
          {/* cabeçalho da empresa (dinâmico) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, borderBottom: "4px solid #0f172a", paddingBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              {brand?.logo
                ? <img src={brand.logo} alt={nomeEmpresa} style={{ maxHeight: 54, maxWidth: 240, objectFit: "contain" }} />
                : <b style={{ fontSize: 24, letterSpacing: "-.5px" }}>{nomeEmpresa}</b>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
              <b style={{ fontSize: 13, color: "#0f172a", textTransform: "uppercase" }}>{nomeEmpresa}</b>
              <div>CNPJ {empresa?.cnpj || "00.000.000/0000-00"}{extra.ie ? `  ·  Inscrição Estadual ${extra.ie}` : ""}</div>
              <div>{extra.endereco || "xxxxxxxxxx/xx"}</div>
              {extra.email && <div>{extra.email}</div>}
            </div>
          </div>

          <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.3px", margin: "20px 0 4px" }}>DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</h1>
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>Período de referência: Janeiro a Dezembro de {ano} · Versão {modo === "reduzida" ? "resumida" : "detalhada"} · Valores em Reais (R$)</p>

          {/* tabela */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Descrição da conta</th>
                  {MES.map((m) => <th key={m} style={th}>{m}</th>)}
                  <th style={{ ...th, borderLeft: "1px solid #e2e8f0" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {/* RECEITA */}
                <Linha tipo="sec" rotulo="Receita Operacional Bruta" vals={MES.map((_, m) => receitaMes(m))} />
                {data.receitas.map((r) => <Linha key={r.nome} tipo="item" indent={12} rotulo={r.nome} vals={r.v} />)}

                {/* CUSTOS */}
                <Linha tipo="sec" rotulo="(–) Custos e Despesas Operacionais" vals={MES.map((_, m) => custoMes(m))} />
                {grupos.map((g) => (
                  <Fragment key={g.nome}>
                    <Linha tipo="grupo" indent={12} rotulo={g.nome} vals={MES.map((_, m) => somaMes(g.itens, m))} />
                    {modo === "completa" && g.itens.map((it) => <Linha key={g.nome + it.nome} tipo="item" indent={28} rotulo={it.nome} vals={it.v} />)}
                  </Fragment>
                ))}

                {/* RESULTADO */}
                <Linha tipo="res" rotulo="(=) Resultado Líquido do Período" vals={RESULTADO} />
                <Linha tipo="grupo" rotulo="EBITDA" vals={EBITDA} />
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ ...tdRot, fontWeight: 800 }}>Margem Líquida</td>
                  {MES.map((_, m) => <td key={m} style={{ ...td, fontWeight: 700 }}>{receitaMes(m) ? `${Math.round(margem(m) * 100)}%` : "–"}</td>)}
                  <td style={{ ...td, fontWeight: 800, borderLeft: "1px solid #e2e8f0" }}>{totalV(MES.map((_, m) => receitaMes(m))) ? `${Math.round(totalV(RESULTADO) / totalV(MES.map((_, m) => receitaMes(m))) * 100)}%` : "–"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* nota explicativa do EBITDA */}
          <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.6, margin: "14px 0 0" }}>
            <b>EBITDA</b> = lucro antes de juros, impostos, depreciação e amortização. É o resultado do período somando de volta os custos financeiros (empréstimos e juros), para mostrar quanto a operação gera antes desses efeitos. <b>Margem líquida</b> = resultado ÷ receita bruta.
          </p>

          {/* recado do final + assinaturas */}
          <p style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.6, margin: "10px 0 30px" }}>
            Demonstrativo gerado eletronicamente pelo Minhas Métricas em {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}. Documento de caráter gerencial, elaborado a partir dos registros internos de faturamento e custos da empresa, referente ao período de Janeiro a Dezembro de {ano}. Valores expressos em Reais (R$); valores negativos entre parênteses.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 40, marginTop: 40 }}>
            <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #94a3b8", paddingTop: 6, fontSize: 11, color: "#475569" }}>Responsável Financeiro</div>
            <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #94a3b8", paddingTop: 6, fontSize: 11, color: "#475569" }}>Diretoria — {nomeEmpresa}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botão "Gerar DRE" + a pré-visualização (reduzida/completa). Aceita um gatilho custom. */
export default function BotaoGerarDRE({ ano, empresa, brand, trigger }: { ano?: number; empresa: Empresa | null; brand: Brand; trigger?: (abrir: () => void) => React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const abrir = () => { setDados(carregarEstrutura()); setAberto(true); };
  return (
    <>
      {trigger ? trigger(abrir) : (
        <button className="btn ghost" onClick={abrir} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FileText size={15} /> Gerar DRE
        </button>
      )}
      {aberto && dados && <DRE data={dados} ano={ano || new Date().getFullYear()} empresa={empresa} brand={brand} onFechar={() => setAberto(false)} />}
    </>
  );
}
