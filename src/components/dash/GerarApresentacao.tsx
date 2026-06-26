"use client";
import { useState } from "react";
import { SecHead } from "./Kit";
import { gerarDeck, gerarRelatorio, abrirHtml, slug, SECOES, type Secao, type DadosApres } from "@/lib/apresentacao";
import { ultimosMeses, mesesEntre, rotuloMes } from "@/lib/format";
import type { Metrica } from "@/lib/indicadores";
import type { Lancamento, Funcionario } from "@/lib/db";

type Props = {
  metrs: Metrica[];
  lancs: Lancamento[];
  funcs: Funcionario[];
  saldoInicial: number;
  brand: { nome: string; logo: string | null };
};

export default function GerarApresentacao(props: Props) {
  const [periodo, setPeriodo] = useState<3 | 6 | 12>(6);
  const [modo, setModo] = useState<"preset" | "custom">("preset");
  const [de, setDe] = useState<string>(ultimosMeses(6)[0]);
  const [ate, setAte] = useState<string>(ultimosMeses(1)[0]);
  const [secoes, setSecoes] = useState<Record<Secao, boolean>>({
    financeiro: true, comercial: true, marketing: true, cliente: true, colaboradores: true,
  });

  const mesesLista = modo === "custom" ? mesesEntre(de, ate) : ultimosMeses(periodo);
  const secoesSet = new Set<Secao>((Object.keys(secoes) as Secao[]).filter((k) => secoes[k]));
  const valido = mesesLista.length > 0 && secoesSet.size > 0;
  const data: DadosApres = props;
  const base = slug(props.brand.nome);

  function toggle(k: Secao) { setSecoes((s) => ({ ...s, [k]: !s[k] })); }
  function onDeck() { if (valido) abrirHtml(gerarDeck(data, mesesLista, secoesSet), `apresentacao-${base}.html`); }
  function onRelatorio() { if (valido) abrirHtml(gerarRelatorio(data, mesesLista, secoesSet), `relatorio-${base}.html`); }

  return (
    <div>
      <SecHead
        icon="Sparkles"
        titulo="Gerar apresentação"
        sub="Monte uma apresentação dos seus números para mostrar e compartilhar"
        cor="#8b5cf6"
        right={
          <div className="period" style={{ flexWrap: "wrap" }}>
            {([3, 6, 12] as const).map((n) => (
              <button key={n} className={modo === "preset" && periodo === n ? "active" : ""} onClick={() => { setModo("preset"); setPeriodo(n); }}>{n} meses</button>
            ))}
            <button className={modo === "custom" ? "active" : ""} onClick={() => setModo("custom")}>📅 Escolher data</button>
          </div>
        }
      />

      {modo === "custom" && (
        <div className="card" style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ margin: 0 }}><label className="f">De</label><input type="month" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div className="field" style={{ margin: 0 }}><label className="f">Até</label><input type="month" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <span className="sub">{mesesLista.length > 0 ? `${mesesLista.length} ${mesesLista.length === 1 ? "mês" : "meses"} (${rotuloMes(mesesLista[0])} – ${rotuloMes(mesesLista[mesesLista.length - 1])})` : "Escolha um intervalo válido"}</span>
        </div>
      )}

      {/* O que incluir */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>O que mostrar na apresentação</h3>
        <p className="sub" style={{ marginBottom: 12 }}>Marque as áreas que você quer apresentar.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SECOES.map((s) => (
            <button key={s.key} onClick={() => toggle(s.key)}
              className={`chip ${secoes[s.key] ? "cyan" : "muted"}`}
              style={{ cursor: "pointer", border: secoes[s.key] ? "1px solid var(--brand)" : "1px solid var(--line)", padding: "8px 14px", fontSize: 13.5 }}>
              {secoes[s.key] ? "✓ " : ""}{s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>🎬 Apresentação em slides</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Abre numa nova aba como uma apresentação de slides — passe com as setas (ou deslizando no celular) e mostre em tela cheia (tecla F).
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={onDeck} disabled={!valido}>🎬 Abrir apresentação</button>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>📄 Relatório de uma página</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Abre tudo em uma página só — fácil de mostrar, mandar para alguém ou salvar/imprimir pelo navegador.
          </p>
          <button className="btn ghost" style={{ marginTop: 14 }} onClick={onRelatorio} disabled={!valido}>📄 Abrir relatório</button>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 14 }}>Ao clicar, abre numa nova aba — funciona no computador e no celular.</p>
    </div>
  );
}
