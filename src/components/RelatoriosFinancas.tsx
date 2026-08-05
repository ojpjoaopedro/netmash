"use client";
import { useState } from "react";
import { FileText, BarChart3, LineChart, FileSpreadsheet } from "lucide-react";
import { Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import BotaoGerarDRE from "./GerarDRE";
import AnaliseResultados from "./AnaliseResultados";
import GraficosFinancas from "./GraficosFinancas";
import SeletorAno from "./SeletorAno";
import { baixarPlanilhaCompleta } from "./Importar";

/** Uma linha da lista de relatórios (ícone + título + descrição + info + estrela). */
function Item({ Icon, titulo, descricao, onClick }: { Icon: typeof FileText; titulo: string; descricao: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", borderTop: "1px solid var(--line)", cursor: "pointer" }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--muted)" }}><Icon size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14.5 }}>{titulo}</b>
        <p className="sub" style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>{descricao}</p>
      </div>
    </div>
  );
}

export default function RelatoriosFinancas({ empresa, brand, ano, setAno }: { empresa: Empresa | null; brand: Brand; ano: number; setAno?: (a: number) => void }) {
  const [view, setView] = useState<"lista" | "analise" | "graficos">("lista");

  if (view === "analise") return <AnaliseResultados onVoltar={() => setView("lista")} ano={ano} />;
  if (view === "graficos") return <GraficosFinancas onVoltar={() => setView("lista")} ano={ano} />;

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 17 }}>Análise financeira</b>
          <p className="sub" style={{ margin: "8px 0 6px", lineHeight: 1.6 }}>Acompanhe várias informações financeiras em um só lugar para decidir com mais clareza.</p>
        </div>
        {setAno && <SeletorAno ano={ano} setAno={setAno} />}
      </div>

      <Item Icon={LineChart} titulo="Gráficos" descricao="Gráficos financeiros detalhados por categoria e por vencimento." onClick={() => setView("graficos")} />

      {/* Gerar DRE — abre a pré-visualização do DRE */}
      <BotaoGerarDRE ano={ano} empresa={empresa} brand={brand}
        trigger={(abrir) => <Item Icon={FileText} titulo="Gerar DRE" descricao="Demonstração do Resultado do Exercício (reduzida ou completa), pronta para imprimir ou salvar em PDF." onClick={abrir} />} />

      <Item Icon={BarChart3} titulo="Análise Receita x Custos" descricao="Composição do faturamento e dos custos no período, com lucro, margem e EBITDA." onClick={() => setView("analise")} />

      {/* Exportar a planilha completa (mesma do Importar), pronta para editar no Excel */}
      <Item Icon={FileSpreadsheet} titulo="Exportar planilha completa" descricao="Baixa a Estrutura de Receitas e Custos em Excel (.xlsx), já preenchida, pronta para editar e subir de volta." onClick={() => baixarPlanilhaCompleta(empresa, brand)} />
    </div>
  );
}
