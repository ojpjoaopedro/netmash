"use client";
import { useState } from "react";
import { Empresa, updateEmpresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { SecHead } from "./dash/Kit";

function mascaraCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

export default function Config({ empresa, reload, brand, saveBrand }: {
  empresa: Empresa | null; reload: () => void;
  brand: Brand; saveBrand: (p: Partial<Brand>) => void;
}) {
  const [nome, setNome] = useState(empresa?.nome ?? brand.nome ?? "");
  const [segmento, setSegmento] = useState(empresa?.segmento ?? "");
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? "");
  const [saldo, setSaldo] = useState(empresa ? String(empresa.saldo_inicial) : "0");
  const [saudacao, setSaudacao] = useState(brand.saudacao ?? "");
  const [cor, setCor] = useState(brand.cor ?? "#1AADE2");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveBrand({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function salvar() {
    setSalvando(true);
    await updateEmpresa({
      nome: nome.trim() || "Minha Empresa",
      segmento: segmento.trim() || null,
      cnpj: cnpj.trim() || null,
      saldo_inicial: Number(String(saldo).replace(/\./g, "").replace(",", ".")) || 0,
    });
    saveBrand({ nome: nome.trim() || "Minha Empresa", saudacao: saudacao.trim(), cor });
    setSalvando(false);
    setMsg("✅ Dados salvos!");
    reload();
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <>
      <SecHead icon="Building2" titulo="Empresa" sub="Identidade da marca e dados gerais" cor="#1AADE2" />
      {msg && <div className="ok">{msg}</div>}

      <div className="grid two">
        {/* Marca / white-label */}
        <div className="card">
          <h3>🎨 Identidade (white-label)</h3>
          <p className="sub" style={{ marginBottom: 14 }}>O logo aparece na barra lateral. Use PNG/SVG com fundo transparente.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 120, height: 56, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", overflow: "hidden" }}>
              {brand.logo ? <img src={brand.logo} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span className="sub">Sem logo</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="btn sm" style={{ cursor: "pointer" }}>
                Enviar logo
                <input type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
              </label>
              {brand.logo && <button className="btn ghost sm" onClick={() => saveBrand({ logo: null })}>Remover</button>}
            </div>
          </div>
          {brand.logo && (
            <div className="field">
              <label className="f">Tamanho da logo ({brand.logoTamanho || 40}px)</label>
              <input type="range" min={24} max={110} value={brand.logoTamanho || 40} onChange={(e) => saveBrand({ logoTamanho: Number(e.target.value) })} style={{ padding: 0 }} />
              <p className="sub" style={{ marginTop: 4 }}>Arraste para aumentar ou diminuir a logo na barra lateral (atualiza na hora).</p>
            </div>
          )}
          <div className="field">
            <label className="f">Cor de destaque (accent)</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} style={{ width: 52, height: 40, padding: 4 }} />
              <input value={cor} onChange={(e) => setCor(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field">
            <label className="f">Saudação no Dashboard</label>
            <input value={saudacao} onChange={(e) => setSaudacao(e.target.value)} placeholder="Ex: Time Vendas / João" />
          </div>
        </div>

        {/* Dados da empresa */}
        <div className="card">
          <h3>🏢 Dados da empresa</h3>
          <div className="field"><label className="f">Nome da empresa</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="row">
            <div className="field"><label className="f">Segmento</label><input value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex: Comércio" /></div>
            <div className="field"><label className="f">CNPJ</label><input value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" /></div>
          </div>
          <div className="field">
            <label className="f">Saldo inicial em caixa (R$)</label>
            <input value={saldo} onChange={(e) => setSaldo(e.target.value)} inputMode="decimal" />
            <p className="sub" style={{ marginTop: 6 }}>Base para o saldo atual (quanto havia antes de começar a registrar).</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar tudo"}</button>
      </div>
    </>
  );
}
