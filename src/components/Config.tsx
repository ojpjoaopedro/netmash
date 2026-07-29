"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2, Hourglass, Lock } from "lucide-react";
import { Empresa, updateEmpresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { mascararTelefone, emailValido } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";


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
type DadosExtra = { ie: string; email: string; contato: string; endereco: string; banco: string;
  cep: string; rua: string; bairro: string; cidade: string; uf: string; numero: string; complemento: string };
const EXTRA_VAZIO: DadosExtra = { ie: "", email: "", contato: "", endereco: "", banco: "",
  cep: "", rua: "", bairro: "", cidade: "", uf: "", numero: "", complemento: "" };
const mascaraCep = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
/** Monta o endereço completo (usado nos relatórios) a partir dos campos separados. */
function comporEndereco(e: DadosExtra): string {
  const rn = [e.rua, e.numero].filter(Boolean).join(", ");
  const parte1 = [rn, e.complemento, e.bairro].filter(Boolean).join(", ");
  const cidUf = [e.cidade, e.uf].filter(Boolean).join("/");
  return [parte1, cidUf, e.cep].filter(Boolean).join(" · ");
}
function chaveExtra(id?: string | null) { return `me_empresa_extra:${id || "default"}`; }
function lerExtra(id?: string | null): DadosExtra {
  if (typeof window === "undefined") return EXTRA_VAZIO;
  try { return { ...EXTRA_VAZIO, ...JSON.parse(localStorage.getItem(chaveExtra(id)) || "{}") }; } catch { return EXTRA_VAZIO; }
}
function salvarExtra(id: string | null | undefined, d: DadosExtra) {
  if (typeof window !== "undefined") { const cru = JSON.stringify(d); localStorage.setItem(chaveExtra(id), cru); salvarEstadoRemoto(chaveExtra(id), cru); }
}

/** Posição para o selinho "Salvo" colar logo após o texto digitado. */
function fimDoTexto(el: HTMLElement, r: DOMRect): number {
  if (!(el instanceof HTMLInputElement) || el.type === "date" || el.type === "color") return r.right;
  const cs = getComputedStyle(el);
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  if (!ctx) return r.right;
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const largura = ctx.measureText(el.value).width;
  const padEsq = parseFloat(cs.paddingLeft) || 0;
  return Math.min(r.left + padEsq + largura, r.right);
}

export default function Config({ empresa, reload, brand, saveBrand, secao = "tudo" }: {
  empresa: Empresa | null; reload: () => void;
  brand: Brand; saveBrand: (p: Partial<Brand>) => void;
  secao?: "tudo" | "dados" | "identidade";
}) {
  const nome = empresa?.nome ?? brand.nome ?? "";
  const [segmento, setSegmento] = useState(empresa?.segmento ?? "");
  // "Outro" só liga quando a pessoa escolhe digitar. Segmento salvo que não
  // está na lista aparece como opção selecionada no próprio menu (abaixo).
  const [segOutro, setSegOutro] = useState(false);
  const cnpj = empresa?.cnpj ?? "";
  const [cor, setCor] = useState(brand.cor ?? "#1AADE2");
  const [extra, setExtra] = useState<DadosExtra>(() => lerExtra(empresa?.id));
  const [emailErro, setEmailErro] = useState("");
  const upExtra = (p: Partial<DadosExtra>) => setExtra((e) => ({ ...e, ...p }));
  // altera um campo do endereço e já recompõe o endereço completo (para os relatórios)
  const upEndereco = (p: Partial<DadosExtra>) => setExtra((e) => { const n = { ...e, ...p }; return { ...n, endereco: comporEndereco(n) }; });
  const [cepMsg, setCepMsg] = useState<{ tipo: "buscando" | "erro"; texto: string } | null>(null);

  /** Busca o CEP no ViaCEP e preenche rua, bairro, cidade e estado. */
  async function buscarCep(cepBruto: string) {
    const c = (cepBruto || "").replace(/\D/g, "");
    if (c.length !== 8) return;
    setCepMsg({ tipo: "buscando", texto: "Buscando endereço…" });
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const j = await r.json();
      if (j.erro) { setCepMsg({ tipo: "erro", texto: "CEP não encontrado. Confira o número." }); return; }
      setExtra((e) => {
        const n = { ...e, rua: j.logradouro || e.rua, bairro: j.bairro || e.bairro, cidade: j.localidade || e.cidade, uf: j.uf || e.uf };
        const comEndereco = { ...n, endereco: comporEndereco(n) };
        salvarExtra(empresa?.id, comEndereco); // já persiste o endereço preenchido
        return comEndereco;
      });
      setCepMsg(null);
    } catch {
      setCepMsg({ tipo: "erro", texto: "Não consegui buscar o CEP agora. Tente de novo." });
    }
  }

  // selinho "Salvo" ao lado do campo, mesmo padrão da Estrutura de Custos
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);

  // aplicar a cor: ampulheta por 5s e, ao sair, aplica em todo o painel
  const [aplicando, setAplicando] = useState(false);
  const corPendente = cor.trim().toLowerCase() !== (brand.cor || "").trim().toLowerCase();
  function aplicarCor() {
    setAplicando(true);
    window.setTimeout(() => { saveBrand({ cor }); setAplicando(false); }, 5000);
  }
  // aplica sozinho assim que a cor é escolhida (seletor fecha) ou ao sair do campo hex
  const aplicarCorAuto = () => { if (corPendente && !aplicando && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor.trim())) aplicarCor(); };

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
    saveBrand({ nome: nome.trim() || "Minha Empresa" });
    salvarExtra(empresa?.id, extra);
    reload();
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: fimDoTexto(el, r) });
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
      <div style={{ display: "grid", gridTemplateColumns: secao === "tudo" ? "1.15fr .85fr" : "1fr", gap: 16, alignItems: "start" }}>
        {/* Dados da empresa — cada campo salva sozinho ao sair (auto-save) */}
        {secao !== "identidade" && (
        <div className="card">
          <h3>🏢 Dados da empresa</h3>
          {/* Nome, Segmento e CNPJ na mesma linha */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
            <div className="field"><label className="f" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>Nome da empresa <Lock size={11} style={{ opacity: .6 }} /></label><input value={nome} readOnly title="Definido no cadastro, não editável" style={{ opacity: .8, cursor: "default" }} /></div>
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
            <div className="field"><label className="f" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>CNPJ <Lock size={11} style={{ opacity: .6 }} /></label><input value={cnpj} readOnly title="Definido no cadastro, não editável" style={{ opacity: .8, cursor: "default" }} inputMode="numeric" /></div>
          </div>
          {/* E-mail (maior) primeiro, depois Contato e Inscrição Estadual */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14 }}>
            <div className="field"><label className="f">E-mail principal</label>
              <input value={extra.email} onChange={(e) => { upExtra({ email: e.target.value }); if (emailErro) setEmailErro(""); }}
                onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v && !emailValido(v)) { setEmailErro("E-mail inválido. Use o formato nome@empresa.com."); upExtra({ email: "" }); e.currentTarget.value = ""; salvarCampo(e.currentTarget); return; } setEmailErro(""); salvarCampo(e.currentTarget); }} inputMode="email" />
              {emailErro && <span style={{ color: "var(--red)", fontSize: 11.5, marginTop: 4, display: "block" }}>{emailErro}</span>}
            </div>
            <div className="field"><label className="f">Contato</label><input value={extra.contato} onChange={(e) => upExtra({ contato: mascararTelefone(e.target.value) })} onBlur={(e) => salvarCampo(e.currentTarget)} inputMode="tel" /></div>
            <div className="field"><label className="f">Inscrição Estadual</label><input value={extra.ie} onChange={(e) => upExtra({ ie: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} placeholder="Opcional" /></div>
          </div>
          {/* Endereço: CEP primeiro (preenche rua, bairro, cidade e estado automaticamente) */}
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.6fr 0.7fr", gap: 14 }}>
            <div className="field">
              <label className="f">CEP</label>
              <input value={extra.cep}
                onChange={(e) => { const v = mascaraCep(e.target.value); upEndereco({ cep: v }); if (v.replace(/\D/g, "").length === 8) buscarCep(v); }}
                onBlur={(e) => { buscarCep(e.currentTarget.value); salvarCampo(e.currentTarget); }}
                inputMode="numeric" />
              {cepMsg && <span style={{ fontSize: 11.5, marginTop: 5, display: "inline-block", color: cepMsg.tipo === "erro" ? "var(--red)" : "var(--muted)" }}>{cepMsg.texto}</span>}
            </div>
            <div className="field"><label className="f">Rua</label><input value={extra.rua} onChange={(e) => upEndereco({ rua: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
            <div className="field"><label className="f">Número</label><input value={extra.numero} onChange={(e) => upEndereco({ numero: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.5fr", gap: 14 }}>
            <div className="field"><label className="f">Complemento</label><input value={extra.complemento} onChange={(e) => upEndereco({ complemento: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
            <div className="field"><label className="f">Bairro</label><input value={extra.bairro} onChange={(e) => upEndereco({ bairro: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
            <div className="field"><label className="f">Cidade</label><input value={extra.cidade} onChange={(e) => upEndereco({ cidade: e.target.value })} onBlur={(e) => salvarCampo(e.currentTarget)} /></div>
            <div className="field"><label className="f">Estado</label><input value={extra.uf} onChange={(e) => upEndereco({ uf: e.target.value.toUpperCase().slice(0, 2) })} onBlur={(e) => salvarCampo(e.currentTarget)} maxLength={2} /></div>
          </div>
        </div>
        )}

        {/* Marca / identidade */}
        {secao !== "dados" && (
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

          {/* dica de tamanho ideal + fundo branco */}
          <p className="sub" style={{ margin: "8px 0 0", fontSize: 12 }}>
            💡 Tamanho ideal: <b>240 × 80 px</b> · <b>PNG</b> ou <b>JPG</b>, de preferência com <b>fundo branco</b> (fica melhor nos documentos gerados, como PDFs)
          </p>

          {brand.logo && (
            <div className="field" style={{ marginTop: 14 }}>
              <label className="f">Tamanho da logo na barra lateral ({brand.logoTamanho || 40}px)</label>
              <input type="range" min={24} max={110} value={brand.logoTamanho || 40} onChange={(e) => saveBrand({ logoTamanho: Number(e.target.value) })} style={{ padding: 0, accentColor: "var(--brand)" }} />
            </div>
          )}

          {/* cor de destaque */}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="f">Cor de destaque</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} onBlur={aplicarCorAuto} style={{ width: 52, height: 40, padding: 4 }} />
              <input value={cor} onChange={(e) => setCor(e.target.value)} onBlur={aplicarCorAuto} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ flex: 1, minWidth: 140 }} />
            </div>
            <span className="sub" style={{ fontSize: 12 }}>escolha a cor e o painel é atualizado automaticamente</span>
          </div>
        </div>
        )}
      </div>

      {/* ampulheta: 5s aplicando a nova cor no painel */}
      {aplicando && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(3px)" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 14, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: "30px 40px", boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)" }}>
            <Hourglass size={40} color={cor} style={{ animation: "girar-ampulheta 2.5s ease-in-out infinite" }} />
            <b style={{ fontSize: 15 }}>Aplicando a nova cor…</b>
            <span className="sub" style={{ fontSize: 12.5 }}>Isso leva alguns segundos.</span>
          </div>
        </div>
      )}
    </>
  );
}
