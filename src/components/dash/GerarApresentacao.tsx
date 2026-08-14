"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { SecHead } from "./Kit";
import { gerarDeck, gerarRelatorio, abrirHtml, slug, SECOES, type Secao, type DadosApres } from "@/lib/apresentacao";
import { ultimosMeses, mesesEntre, rotuloMes } from "@/lib/format";
import type { Funcionario } from "@/lib/db";

type Props = {
  funcs: Funcionario[];
  brand: { nome: string; logo: string | null };
  ano: number;
};

export default function GerarApresentacao(props: Props) {
  const [periodo, setPeriodo] = useState<3 | 6 | 12>(6);
  const [modo, setModo] = useState<"preset" | "custom">("preset");
  const [de, setDe] = useState<string>(ultimosMeses(6)[0]);
  const [ate, setAte] = useState<string>(ultimosMeses(1)[0]);
  const [secoes, setSecoes] = useState<Record<Secao, boolean>>({
    faturamento: true, despesas: true, resultado: true, fatCanal: true, despGrupo: true, graficos: true, equipe: true, aniversarios: true,
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
        sub=""
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
      <div className="card" style={{ marginTop: 31 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>O que mostrar na apresentação</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
          {SECOES.map((s) => {
            const on = secoes[s.key];
            return (
              <button key={s.key} onClick={() => toggle(s.key)}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%", transition: ".15s",
                  border: on ? "1.5px solid var(--brand)" : "1.5px solid var(--line-2)", background: on ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "var(--bg-2)" }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", transition: ".15s",
                  background: on ? "var(--brand)" : "transparent", border: on ? "1.5px solid var(--brand)" : "1.5px solid var(--line-2)", color: "var(--brand-ct,#fff)" }}>
                  {on && <Check size={14} strokeWidth={3.5} />}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: on ? "var(--brand)" : "var(--txt)" }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 35 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>🎬 Apresentação em slides</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Abre numa nova aba como uma apresentação de slides.
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={onDeck} disabled={!valido}>🎬 Abrir apresentação</button>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>📄 Relatório de uma página</h3>
          <p className="sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Abre tudo em uma página só.
          </p>
          <button className="btn ghost" style={{ marginTop: 14 }} onClick={onRelatorio} disabled={!valido}>📄 Abrir relatório</button>
        </div>
      </div>
    </div>
  );
}
