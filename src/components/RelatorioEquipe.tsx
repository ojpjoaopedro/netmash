"use client";
import { useState } from "react";
import { Printer, X } from "lucide-react";
import { Funcionario, Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";

const brData = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const ouTraco = (v?: string | null) => (v && v.trim() ? v : "—");

function lerExtra(id?: string | null): { ie?: string; email?: string; contato?: string; endereco?: string } {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(`me_empresa_extra:${id || "default"}`) || "{}"); } catch { return {}; }
}

/** Modal de pré-visualização do Relatório da Equipe, pronto para imprimir/salvar em PDF. */
function Relatorio({ funcs, empresa, brand, onFechar }: { funcs: Funcionario[]; empresa: Empresa | null; brand: Brand; onFechar: () => void }) {
  const extra = lerExtra(empresa?.id);
  const nomeEmpresa = brand?.nome && brand.nome !== "Minha Empresa" ? brand.nome
    : (empresa?.nome && empresa.nome !== "Minha Empresa (demonstração)" ? empresa.nome : "Minha Empresa");
  const lista = funcs.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const dataImp = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 9, letterSpacing: ".04em", textTransform: "uppercase", color: "#334155", borderBottom: "1.5px solid #cbd5e1" };
  const td: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "#1e293b", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,.6)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column" }}>
      {/* barra superior branca (não sai na impressão) */}
      <div className="no-print" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", background: "#fff", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}><Printer size={16} /> Relatório da Equipe</b>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={15} /> Imprimir / Salvar PDF</button>
          <button onClick={onFechar} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 10, background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }}><X size={15} /> Fechar</button>
        </div>
      </div>

      {/* área rolável com a "folha" */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 12px", display: "flex", justifyContent: "center" }}>
        <div className="relatorio-print" style={{ width: "100%", maxWidth: 900, minHeight: "82vh", display: "flex", flexDirection: "column", background: "#fff", color: "#0f172a", borderRadius: 8, padding: 40, boxShadow: "0 20px 60px -20px rgba(0,0,0,.5)" }}>
          {/* cabeçalho: logo/nome à esquerda, dados à direita */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, borderBottom: "4px solid #0f172a", paddingBottom: 16 }}>
            <div style={{ minWidth: 0 }}>
              {brand?.logo
                ? <img src={brand.logo} alt={nomeEmpresa} style={{ maxHeight: 54, maxWidth: 240, objectFit: "contain" }} />
                : <b style={{ fontSize: 24, letterSpacing: "-.5px" }}>{nomeEmpresa}</b>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <b style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: ".02em" }}>{nomeEmpresa}</b>
              <div style={{ fontSize: 11, color: "#475569" }}>CNPJ {empresa?.cnpj || "00.000.000/0000-00"}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{extra.endereco || "xxxxxxxxxx/xx"}</div>
            </div>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px", margin: "22px 0 14px" }}>RELATÓRIO DA EQUIPE</h1>

          {/* caixa de dados da empresa — mantém sempre os rótulos, mesmo em branco */}
          <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: "12px 14px", fontSize: 12, lineHeight: 1.9, color: "#334155" }}>
            <div><b>Empresa:</b> {nomeEmpresa}  ·  <b>CNPJ:</b> {empresa?.cnpj || "00.000.000/0000-00"}  ·  <b>IE:</b> {extra.ie || ""}</div>
            <div><b>E-mail:</b> {extra.email || ""}  ·  <b>Telefone:</b> {extra.contato || "00 0000-0000"}</div>
            <div><b>Endereço:</b> {extra.endereco || "xxxxxxxxxx/xx"}</div>
          </div>

          {/* lista de todos os integrantes, numerada em duas colunas */}
          <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a", margin: "24px 0 12px" }}>Todos os integrantes</h2>
          {lista.length === 0
            ? <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>Nenhum integrante cadastrado.</p>
            : <div style={{ columnCount: 2, columnGap: 40, fontSize: 12.5, lineHeight: 2 }}>
                {lista.map((f, i) => (
                  <div key={f.id} style={{ display: "flex", gap: 6, breakInside: "avoid" }}>
                    <span style={{ color: "#64748b", minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
                    <span>{f.nome || "Sem nome"}</span>
                  </div>
                ))}
              </div>}

          {/* tabela de detalhamento */}
          <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a", margin: "28px 0 12px" }}>Detalhamento — {lista.length} {lista.length === 1 ? "integrante" : "integrantes"}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 26 }}>#</th>
                <th style={th}>Nome</th><th style={th}>Cargo</th><th style={th}>Área</th><th style={th}>E-mail</th>
                <th style={th}>Telefone</th><th style={th}>CPF</th><th style={th}>Pix</th><th style={th}>Nasc.</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f, i) => (
                <tr key={f.id}>
                  <td style={{ ...td, color: "#64748b" }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{f.nome || "Sem nome"}</td>
                  <td style={td}>{ouTraco(f.cargo)}</td>
                  <td style={td}>{ouTraco(f.departamento)}</td>
                  <td style={td}>{ouTraco(f.email)}</td>
                  <td style={td}>{ouTraco(f.contato)}</td>
                  <td style={td}>{ouTraco(f.cpf)}</td>
                  <td style={td}>{ouTraco(f.pix)}</td>
                  <td style={td}>{brData(f.nascimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* rodapé: data da impressão + número da página (o número se repete a cada página no PDF) */}
          <div className="relatorio-rodape">
            <span>Documento gerado pelo Hub Dynamis em {dataImp}.</span>
            <span className="relatorio-pag" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botão azul "Imprimir PDF" + a pré-visualização do relatório. */
export default function BotaoRelatorioEquipe({ funcs, empresa, brand }: { funcs: Funcionario[]; empresa: Empresa | null; brand: Brand }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button className="btn" onClick={() => setAberto(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Printer size={15} /> Imprimir PDF
      </button>
      {aberto && <Relatorio funcs={funcs} empresa={empresa} brand={brand} onFechar={() => setAberto(false)} />}
    </>
  );
}
