"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Empresa, updateEmpresa } from "@/lib/db";
import { Brand } from "@/lib/brand";

function mascaraCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

/* Principais segmentos de mercado (setores da economia brasileira). O último
   é "Outro", que libera um campo livre para digitar. */
const SEGMENTOS = [
  "Comércio (varejo/atacado)", "Serviços", "Indústria", "Educação", "Saúde",
  "Agronegócio", "Tecnologia / TI", "Construção Civil", "Alimentação e Bebidas",
  "Beleza e Estética", "Turismo e Hotelaria", "Transporte e Logística",
  "Finanças e Seguros", "Imobiliário", "Marketing e Publicidade",
  "Moda e Vestuário", "Automotivo", "Energia", "Comunicação e Mídia",
  "Entretenimento e Eventos", "Consultoria", "Contabilidade", "Jurídico",
  "ONG / Terceiro Setor",
];

/* Dados fiscais/bancários extras da empresa. Ficam por empresa no navegador
   (não exigem coluna nova no banco). Chaveado pelo id da empresa. */
type DadosExtra = { ie: string; email: string; contato: string; endereco: string; banco: string };
const EXTRA_VAZIO: DadosExtra = { ie: "", email: "", contato: "", endereco: "", banco: "" };
function chaveExtra(id?: string | null) { return `me_empresa_extra:${id || "default"}`; }
function lerExtra(id?: string | null): DadosExtra {
  if (typeof window === "undefined") return EXTRA_VAZIO;
  try { return { ...EXTRA_VAZIO, ...JSON.parse(localStorage.getItem(chaveExtra(id)) || "{}") }; } catch { return EXTRA_VAZIO; }
}
function salvarExtra(id: string | null | undefined, d: DadosExtra) {
  if (typeof window !== "undefined") localStorage.setItem(chaveExtra(id), JSON.stringify(d));
}

export default function Config({ empresa, reload, brand, saveBrand }: {
  empresa: Empresa | null; reload: () => void;
  brand: Brand; saveBrand: (p: Partial<Brand>) => void;
}) {
  const [nome, setNome] = useState(empresa?.nome ?? brand.nome ?? "");
  const [segmento, setSegmento] = useState(empresa?.segmento ?? "");
  // "Outro" só liga quando a pessoa escolhe digitar. Segmento salvo que não
  // está na lista aparece como opção selecionada no próprio menu (abaixo).
  const [segOutro, setSegOutro] = useState(false);
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? "");
  const [cor, setCor] = useState(brand.cor ?? "#1AADE2");
  const [extra, setExtra] = useState<DadosExtra>(() => lerExtra(empresa?.id));
  const upExtra = (p: Partial<DadosExtra>) => setExtra((e) => ({ ...e, ...p }));

  // selinho "Salvo" ao lado do campo, mesmo padrão da Estrutura de Custos
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveBrand({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  }

  /** Persiste tudo e mostra o "Salvo" ao lado do campo que perdeu o foco. */
  async function salvarCampo(el: HTMLElement) {
    await updateEmpresa({
      nome: nome.trim() || "Minha Empresa",
      segmento: segmento.trim() || null,
      cnpj: cnpj.trim() || null,
      saldo_inicial: empresa?.saldo_inicial ?? 0,
    });
    saveBrand({ nome: nome.trim() || "Minha Empresa", cor });
    salvarExtra(empresa?.id, extra);
    reload();
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: r.right });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  }

  return (
    <>
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 90, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* dois lados: à esquerda os dados da empresa, à direita a identidade */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16, alignItems: "start" }}>
        {/* Dados da empresa — cada campo salva sozinho ao sair (auto-save) */}
        <div className="card">
          <h3>🏢 Dados da empresa</h3>
          {/* Nome, Segmento e CNPJ na mesma linha */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
            <div className="field"><label className="f">Nome da empresa</label><input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
            <div className="field">
              <label className="f">Segmento</label>
              {segOutro ? (
                <input autoFocus value={segmento} onChange={(e) => setSegmento(e.target.value)} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="Digite o segmento" />
              ) : (
                <select value={segmento} onChange={(e) => {
                  if (e.target.value === "__outro__") { setSegOutro(true); setSegmento(""); }
                  else setSegmento(e.target.value);
                }} onBlur={(e) => salvarCampo(e.currentTarget)}>
                  <option value="">Selecione…</option>
                  {segmento && !SEGMENTOS.includes(segmento) && <option value={segmento}>{segmento}</option>}
                  {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="__outro__">Outro (digitar)</option>
                </select>
              )}
            </div>
            <div className="field"><label className="f">CNPJ</label><input value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="00.000.000/0000-00" inputMode="numeric" /></div>
          </div>
          {/* E-mail (maior) primeiro, depois Contato e Inscrição Estadual */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14 }}>
            <div className="field"><label className="f">E-mail principal</label><input value={extra.email} onChange={(e) => upExtra({ email: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="contato@empresa.com" inputMode="email" /></div>
            <div className="field"><label className="f">Contato</label><input value={extra.contato} onChange={(e) => upExtra({ contato: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="(00) 00000-0000" inputMode="tel" /></div>
            <div className="field"><label className="f">Inscrição Estadual</label><input value={extra.ie} onChange={(e) => upExtra({ ie: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="Opcional" /></div>
          </div>
          <div className="row">
            <div className="field"><label className="f">Endereço</label><input value={extra.endereco} onChange={(e) => upExtra({ endereco: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="Rua, nº, bairro — Cidade/UF · CEP" /></div>
            <div className="field"><label className="f">Banco · Agência · Conta</label><input value={extra.banco} onChange={(e) => upExtra({ banco: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="Ex: Itaú · Ag. 0000 · Conta 00000-0" /></div>
          </div>
        </div>

        {/* Marca / identidade */}
        <div className="card">
          {/* área de logo clicável (dropzone) — clique nela para enviar/trocar */}
          <label title="Clique para enviar sua logomarca"
            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", minHeight: 96, marginTop: 12, borderRadius: 16, cursor: "pointer", textAlign: "center",
              border: "2px dashed var(--line-2)", background: "var(--bg-2)", padding: 14, transition: ".15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "color-mix(in srgb, var(--brand) 6%, var(--bg-2))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "var(--bg-2)"; }}>
            <input type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
            {brand.logo ? (
              <>
                {/* botão de remover dentro do próprio quadro do logo */}
                <button className="btn ghost sm" title="Remover logo"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveBrand({ logo: null }); }}
                  style={{ position: "absolute", top: 8, right: 8, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Trash2 size={13} /> Remover logo
                </button>
                <img src={brand.logo} alt="logo" style={{ maxWidth: "62%", maxHeight: 52, objectFit: "contain" }} />
                <span className="sub" style={{ fontWeight: 600 }}>Clique para trocar a logomarca</span>
              </>
            ) : (
              <>
                <span style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}>
                  <ImagePlus size={24} />
                </span>
                <b style={{ fontSize: 14 }}>Clique aqui para enviar sua logomarca</b>
              </>
            )}
          </label>

          {/* dica de tamanho ideal + fundo transparente */}
          <p className="sub" style={{ margin: "8px 0 0", fontSize: 12 }}>
            💡 Tamanho ideal: <b>240 × 80 px</b> · <b>PNG</b> ou <b>SVG</b> com <b>fundo transparente</b>
          </p>

          {brand.logo && (
            <div className="field" style={{ marginTop: 14 }}>
              <label className="f">Tamanho da logo na barra lateral ({brand.logoTamanho || 40}px)</label>
              <input type="range" min={24} max={110} value={brand.logoTamanho || 40} onChange={(e) => saveBrand({ logoTamanho: Number(e.target.value) })} style={{ padding: 0 }} />
            </div>
          )}

          {/* cor de destaque */}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="f">Cor de destaque</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} onBlur={(e) => salvarCampo(e.currentTarget)} style={{ width: 52, height: 40, padding: 4 }} />
              <input value={cor} onChange={(e) => setCor(e.target.value)} onBlur={(e) => salvarCampo(e.currentTarget)} style={{ flex: 1 }} />
              <span className="sub" style={{ fontSize: 12 }}>muda a cor de todo o painel</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
