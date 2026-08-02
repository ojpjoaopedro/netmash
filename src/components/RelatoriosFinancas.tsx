"use client";
import { useEffect, useState } from "react";
import { FileText, BarChart3, LineChart, Users } from "lucide-react";
import { Empresa, Funcionario, getFuncionarios } from "@/lib/db";
import { Brand } from "@/lib/brand";
import BotaoGerarDRE from "./GerarDRE";
import BotaoRelatorioEquipe from "./RelatorioEquipe";
import AnaliseResultados from "./AnaliseResultados";
import GraficosFinancas from "./GraficosFinancas";

type DiretorRel = { nome: string; cargo?: string; area?: string; email?: string; telefone?: string; cpf?: string; pix?: string; nascimento?: string };

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

export default function RelatoriosFinancas({ empresa, brand, ano }: { empresa: Empresa | null; brand: Brand; ano: number }) {
  const [view, setView] = useState<"lista" | "analise" | "graficos">("lista");
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [diretores, setDiretores] = useState<DiretorRel[]>([]);

  useEffect(() => {
    getFuncionarios().then(setFuncs).catch(() => {});
    const ler = () => {
      try {
        const s = JSON.parse(localStorage.getItem("me_diretores") || "null");
        const lista = s?.sup ? [s.sup, ...(s.admins || [])] : [];
        setDiretores(lista.filter((d: { nome?: string }) => (d.nome || "").trim()).map((d: DiretorRel) => ({
          nome: d.nome, cargo: "Diretor", area: d.area, email: d.email, telefone: d.telefone, cpf: d.cpf, pix: d.pix, nascimento: d.nascimento,
        })));
      } catch { /* ignore */ }
    };
    ler();
    window.addEventListener("me:diretores", ler);
    return () => window.removeEventListener("me:diretores", ler);
  }, []);

  if (view === "analise") return <AnaliseResultados onVoltar={() => setView("lista")} ano={ano} />;
  if (view === "graficos") return <GraficosFinancas onVoltar={() => setView("lista")} ano={ano} />;

  return (
    <div className="card" style={{ padding: 22 }}>
      <b style={{ fontSize: 17 }}>Análise financeira</b>
      <p className="sub" style={{ margin: "8px 0 6px", lineHeight: 1.6 }}>Acompanhe várias informações financeiras em um só lugar para decidir com mais clareza.</p>

      {/* Gerar DRE — abre a pré-visualização do DRE */}
      <BotaoGerarDRE ano={ano} empresa={empresa} brand={brand}
        trigger={(abrir) => <Item Icon={FileText} titulo="Gerar DRE" descricao="Demonstração do Resultado do Exercício (reduzida ou completa), pronta para imprimir ou salvar em PDF." onClick={abrir} />} />

      <Item Icon={BarChart3} titulo="Análise Receita x Custos" descricao="Composição do faturamento e dos custos no período, com lucro, margem e EBITDA." onClick={() => setView("analise")} />

      <Item Icon={LineChart} titulo="Gráficos" descricao="Gráficos financeiros detalhados por categoria e por vencimento." onClick={() => setView("graficos")} />

      {/* Relatório da equipe — lista de diretores + integrantes, pronta para PDF */}
      <BotaoRelatorioEquipe funcs={funcs} empresa={empresa} brand={brand} diretores={diretores}
        trigger={(abrir) => <Item Icon={Users} titulo="Relatório da equipe" descricao="Lista completa da equipe (diretores e integrantes) com dados de contato, pronta para imprimir ou salvar em PDF." onClick={abrir} />} />
    </div>
  );
}
