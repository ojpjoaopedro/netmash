"use client";
import { useEffect, useRef, useState } from "react";
import { Users, User, Phone, Mail, CreditCard, KeyRound, Cake, Briefcase, Trash2, Plus, Power } from "lucide-react";
import { Funcionario, Empresa, addFuncionario, updateFuncionario, delFuncionario } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { mascararTelefone, mascararCPF, cpfValido, emailValido, isoParaBR, mascararDataBR, validarDataBR } from "@/lib/format";
import BotaoRelatorioEquipe from "./RelatorioEquipe";

const VERMELHO = "#EF4444", VERDE = "#10B981", AMARELO = "#F59E0B";
const hojeISO = () => new Date().toISOString().slice(0, 10);
const brData = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}


/** Campo editável direto na tela: parece texto, salva ao sair do foco. */
function Campo({ valor, onSalvar, placeholder, tipo, style, onFocar, onDesfocar, formatar }: {
  valor: string | null | undefined; onSalvar: (v: string, el: HTMLElement) => void;
  placeholder?: string; tipo?: string; style?: React.CSSProperties;
  onFocar?: () => void; onDesfocar?: () => void; formatar?: (v: string) => string;
}) {
  const ehData = tipo === "date";
  const base = ehData ? isoParaBR(valor ?? "") : (valor ?? "");
  const [erroData, setErroData] = useState("");
  const input = (
    <input
      defaultValue={base}
      placeholder={ehData ? "dd/mm/aaaa" : placeholder}
      type={ehData ? "text" : (tipo || "text")}
      inputMode={ehData ? "numeric" : undefined}
      maxLength={ehData ? 10 : undefined}
      onInput={(e) => {
        if (ehData) { e.currentTarget.value = mascararDataBR(e.currentTarget.value); if (erroData) setErroData(""); }
        else if (formatar) e.currentTarget.value = formatar(e.currentTarget.value);
      }}
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; onFocar?.(); }}
      onBlur={(e) => {
        e.currentTarget.style.background = "transparent"; onDesfocar?.();
        if (ehData) {
          const { iso, erro } = validarDataBR(e.target.value);
          setErroData(erro);
          if (erro) return;                                  // inválida/futura: mostra recado, não salva
          if (iso !== (valor ?? "")) onSalvar(iso, e.currentTarget);
          return;
        }
        let v = e.target.value;
        if (formatar) { v = formatar(v); e.target.value = v; }
        if (v !== base) onSalvar(v, e.currentTarget);
      }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", transition: "background .12s", ...style }}
    />
  );
  if (!ehData) return input;
  return (
    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      {input}
      {erroData && <span style={{ color: "var(--red)", fontSize: 10.5, lineHeight: 1.3, marginTop: 2 }}>{erroData}</span>}
    </span>
  );
}

/** Campo do nome no card: quebra em até 2 linhas sem crescer o card. */
function CampoNome({ valor, onSalvar, placeholder, style, onFocar, onDesfocar }: {
  valor: string | null | undefined; onSalvar: (v: string, el: HTMLElement) => void;
  placeholder?: string; style?: React.CSSProperties; onFocar?: () => void; onDesfocar?: () => void;
}) {
  const base = valor ?? "";
  const ajustar = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 40)}px`; };
  return (
    <textarea
      defaultValue={base}
      placeholder={placeholder}
      rows={1}
      ref={(el) => { if (el) ajustar(el); }}
      onInput={(e) => ajustar(e.currentTarget)}
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; onFocar?.(); }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; onDesfocar?.(); if (e.target.value !== base) onSalvar(e.target.value.replace(/\n/g, " ").trim(), e.currentTarget); }}
      style={{ border: 0, outline: "none", background: "transparent", resize: "none", overflow: "hidden", padding: "2px 5px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", lineHeight: 1.2, transition: "background .12s", ...style }}
    />
  );
}

/** Linha com ícone + prefixo fixo + campo editável (telefone, CPF, Pix, datas…). */
function LinhaEdit({ icone, prefixo, prefixoClaro, valor, placeholder, tipo, onSalvar, onFocar, onDesfocar, formatar }: {
  icone: React.ReactNode; prefixo?: string; prefixoClaro?: boolean; valor: string | null | undefined;
  placeholder?: string; tipo?: string; onSalvar: (v: string, el: HTMLElement) => void;
  onFocar?: () => void; onDesfocar?: () => void; formatar?: (v: string) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", minWidth: 0 }}>
      <span style={{ flexShrink: 0, display: "grid", placeItems: "center", color: "var(--brand)" }}>{icone}</span>
      {prefixo && <span style={{ flexShrink: 0, color: prefixoClaro ? "var(--muted-2)" : undefined }}>{prefixo}</span>}
      <Campo valor={valor} placeholder={placeholder} tipo={tipo} formatar={formatar} onSalvar={onSalvar} onFocar={onFocar} onDesfocar={onDesfocar} style={{ fontSize: 12.5 }} />
    </div>
  );
}

/** Chave de opções (segmented) em tom neutro da marca. */
function Chave({ ops, valor, onChange }: { ops: { k: string; txt: string }[]; valor: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 99, padding: 2 }}>
      {ops.map((o) => {
        const on = valor === o.k;
        return (
          <button key={o.k} onClick={() => onChange(o.k)}
            style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0,
              background: on ? "color-mix(in srgb, var(--brand) 14%, transparent)" : "transparent", color: on ? "var(--brand)" : "var(--muted)", transition: ".15s" }}>
            {o.txt}
          </button>
        );
      })}
    </div>
  );
}

type DiretorRel = { nome: string; cargo?: string; area?: string; email?: string; telefone?: string; cpf?: string; pix?: string; nascimento?: string };

export default function Funcionarios({ funcs, reload, empresa = null, brand }: { funcs: Funcionario[]; reload: () => void; empresa?: Empresa | null; brand?: Brand }) {
  const [filtro, setFiltro] = useState<"ativos" | "desativados">("ativos");
  const [ordem, setOrdem] = useState<"cadastro" | "alfabetica">("alfabetica");
  const [modo, setModo] = useState<"card" | "lista">("card");

  // diretores (Meus Usuários) entram no relatório junto com a equipe
  const [diretores, setDiretores] = useState<DiretorRel[]>([]);
  useEffect(() => {
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

  // qual card está em edição (algum campo com foco) — libera a lixeira só nele
  const [focoId, setFocoId] = useState<string | null>(null);
  const focoT = useRef<number | undefined>(undefined);
  const aoFocar = (id: string) => { window.clearTimeout(focoT.current); setFocoId(id); };
  const aoDesfocar = () => { focoT.current = window.setTimeout(() => setFocoId(null), 200); };

  // cria um card em branco na hora, pronto para preencher direto na tela
  const [criando, setCriando] = useState(false);
  async function novoInline() {
    if (criando) return;                 // evita abrir vários com cliques repetidos
    setCriando(true);
    setFiltro("ativos");
    try {
      await addFuncionario({
        nome: "", cargo: null, departamento: null, salario: 0, beneficios: 0,
        admissao: null, ativo: true, contato: null, foto: null, email: null, cpf: null, pix: null, nascimento: null,
      });
      await reload();
    } finally { setCriando(false); }
  }

  // confirmação (amarela) de desativação, com a data escolhida
  const [aDesativar, setADesativar] = useState<{ f: Funcionario; data: string } | null>(null);
  // confirmação (verde) de reativação
  const [aAtivar, setAAtivar] = useState<Funcionario | null>(null);

  // confirmação de exclusão + barra "desfazer" — mesmo padrão de Finanças
  const [aExcluir, setAExcluir] = useState<{ nome: string; onOk: () => void } | null>(null);
  const [aviso, setAviso] = useState<{ titulo: string; texto: string } | null>(null);
  // Salva CPF/e-mail. Se estiver inválido: avisa em pop-up, NÃO salva e limpa o campo na tela.
  const salvarCpf = (id: string, v: string, el: HTMLElement) => {
    if (v.trim() && !cpfValido(v)) {
      setAviso({ titulo: "CPF inválido", texto: `O CPF "${v.trim()}" não é válido. Confira os números e digite novamente.` });
      (el as HTMLInputElement).value = ""; salvarCampo(id, { cpf: null }, el); return;
    }
    salvarCampo(id, { cpf: v.trim() || null }, el);
  };
  const salvarEmail = (id: string, v: string, el: HTMLElement) => {
    if (v.trim() && !emailValido(v)) {
      setAviso({ titulo: "E-mail inválido", texto: `O e-mail "${v.trim()}" não parece correto. Use o formato nome@empresa.com.` });
      (el as HTMLInputElement).value = ""; salvarCampo(id, { email: null }, el); return;
    }
    salvarCampo(id, { email: v.trim() || null }, el);
  };
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

  async function excluir(f: Funcionario) {
    await delFuncionario(f.id);
    reload();
    const { id: _id, empresa_id: _emp, ...copia } = f;
    void _id; void _emp;
    mostrarDesfazer(`"${f.nome}" excluído`, async () => { await addFuncionario(copia); reload(); });
  }

  // avisinho "Salvo" — aparece logo em frente ao texto que foi digitado
  const [flash, setFlash] = useState<{ top: number; left: number } | null>(null);
  const flashT = useRef<number | undefined>(undefined);
  function fimDoTexto(el: HTMLElement, r: DOMRect): number {
    // mede a largura do texto para o selinho colar logo depois do que foi escrito
    if (!(el instanceof HTMLInputElement) || el.type === "date") return r.right;
    const cs = getComputedStyle(el);
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");
    if (!ctx) return r.right;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const largura = ctx.measureText(el.value).width;
    const padEsq = parseFloat(cs.paddingLeft) || 0;
    return Math.min(r.left + padEsq + largura, r.right);
  }
  async function salvarCampo(id: string, patch: Partial<Funcionario>, el: HTMLElement) {
    await updateFuncionario(id, patch);
    reload();
    const r = el.getBoundingClientRect();
    setFlash({ top: r.top + r.height / 2, left: fimDoTexto(el, r) });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setFlash(null), 1500);
  }

  const filtrada = funcs.filter((f) => filtro === "ativos" ? f.ativo : !f.ativo);
  // ordem de cadastro = ordem original; alfabética = por nome (cadastros em branco sempre no fim)
  const lista = ordem === "cadastro"
    ? filtrada.slice().sort((a, b) => (!a.nome.trim() !== !b.nome.trim()) ? (a.nome.trim() ? -1 : 1) : 0)
    : filtrada.slice().sort((a, b) => {
        if (!a.nome.trim() !== !b.nome.trim()) return a.nome.trim() ? -1 : 1;
        return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
      });

  // chave liga/desliga: ativos em verde, desativados em vermelho (tom suave)
  const opc = (k: "ativos" | "desativados", txt: string) => {
    const cor = k === "ativos" ? VERDE : VERMELHO;
    const on = filtro === k;
    return (
      <button onClick={() => setFiltro(k)}
        style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: 0,
          background: on ? `${cor}22` : "transparent", color: on ? cor : "var(--muted)", transition: ".15s" }}>
        {txt}
      </button>
    );
  };

  return (
    <>
      {/* título da equipe + imprimir PDF */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><Users size={19} /></span>
          <h2 style={{ margin: 0, fontSize: 19 }}>Equipe</h2>
        </div>
        <BotaoRelatorioEquipe funcs={funcs} empresa={empresa}
          brand={brand ?? { nome: "Minha Empresa", logo: null, cor: "#1AADE2", saudacao: "", logoTamanho: 40 }}
          diretores={diretores} />
      </div>

      {/* filtros alinhados à esquerda: ordenação · visualização · situação */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Chave ops={[{ k: "cadastro", txt: "Cadastro" }, { k: "alfabetica", txt: "A–Z" }]} valor={ordem} onChange={(v) => setOrdem(v as "cadastro" | "alfabetica")} />
        <Chave ops={[{ k: "card", txt: "Card" }, { k: "lista", txt: "Lista" }]} valor={modo} onChange={(v) => setModo(v as "card" | "lista")} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 99, padding: 2 }}>
          {opc("ativos", "Ativos")}
          {opc("desativados", "Desativados")}
        </div>
      </div>

      <div className={modo === "lista" ? "grid" : "grid equipe-grid"} style={{ gap: 14, ...(modo === "lista" ? { gridTemplateColumns: "1fr" } : {}) }}>
          {lista.map((f) => {
            const pill = (mt: number) => (
              <button title={f.ativo ? "Clique para desativar" : "Clique para ativar"}
                onClick={() => f.ativo ? setADesativar({ f, data: hojeISO() }) : setAAtivar(f)}
                style={{ marginTop: mt, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", border: 0, fontFamily: "inherit", background: f.ativo ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", color: f.ativo ? VERDE : VERMELHO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", padding: "4px 10px", borderRadius: 99 }}>
                <Power size={11} /> {f.ativo ? "Ativo" : "Inativo"}
              </button>
            );
            const trash = (
              focoId === f.id && (
                <button title="Excluir" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir({ nome: f.nome, onOk: () => excluir(f) })}
                  style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(239,68,68,.10)", color: VERMELHO }}>
                  <Trash2 size={14} />
                </button>
              )
            );
            const avatar = (tam: number) => (
              <div style={{ width: tam, height: tam, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(148,163,184,.16)", color: "var(--muted)", fontWeight: 800, fontSize: tam * 0.34 }}>
                {iniciais(f.nome) || <Users size={tam * 0.38} />}
              </div>
            );

            // MODO LISTA: uma linha única com nome, telefone, CPF e cargo
            if (modo === "lista") {
              return (
                <div key={f.id} className="card equipe-card" style={{ padding: "8px 14px", position: "relative", opacity: f.ativo ? 1 : 0.72, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {trash}
                  {avatar(34)}
                  <div style={{ width: 230, minWidth: 170, flexShrink: 0 }}>
                    <Campo valor={f.nome} placeholder="Nome" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { nome: v.trim() || f.nome }, el)} style={{ fontSize: 14, fontWeight: 700 }} />
                  </div>
                  <div style={{ width: 150, minWidth: 120 }}><LinhaEdit icone={<Phone size={13} />} valor={f.contato} placeholder="Telefone" formatar={mascararTelefone} onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { contato: v.trim() || null }, el)} /></div>
                  <div style={{ width: 190, minWidth: 140 }}><LinhaEdit icone={<Mail size={13} />} valor={f.email} placeholder="E-mail" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarEmail(f.id, v, el)} /></div>
                  <div style={{ width: 185, minWidth: 140 }}><LinhaEdit icone={<CreditCard size={13} />} prefixo="CPF" valor={f.cpf} formatar={mascararCPF} onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCpf(f.id, v, el)} /></div>
                  <div style={{ flex: "1 1 130px", minWidth: 110 }}><LinhaEdit icone={<Briefcase size={13} />} valor={f.cargo} placeholder="Cargo" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { cargo: v.trim() || null }, el)} /></div>
                  <div style={{ marginLeft: "auto", paddingRight: focoId === f.id ? 30 : 0 }}>{pill(0)}</div>
                </div>
              );
            }

            // MODO CARD: cartão moderno — faixa em gradiente, avatar em destaque, dados centralizados
            return (
              <div key={f.id} className="card equipe-card" style={{ padding: 0, overflow: "hidden", borderRadius: 18, opacity: f.ativo ? 1 : 0.72, position: "relative", transition: "transform .18s, box-shadow .18s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 20px 42px -24px rgba(0,0,0,.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}>
                {/* faixa superior em gradiente da cor de destaque */}
                <div style={{ height: 64, background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))" }} />

                {/* lixeira: aparece ao passar o mouse no card ou ao focar um campo */}
                <button className="card-trash" title="Remover" onMouseDown={(e) => e.preventDefault()} onClick={() => setAExcluir({ nome: f.nome, onOk: () => excluir(f) })}
                  style={{ position: "absolute", top: 12, left: 12, width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: 0, background: "rgba(255,255,255,.92)", color: VERMELHO, boxShadow: "0 2px 6px -2px rgba(0,0,0,.3)" }}>
                  <Trash2 size={14} />
                </button>

                {/* status flutuante sobre a faixa */}
                <button onClick={() => f.ativo ? setADesativar({ f, data: hojeISO() }) : setAAtivar(f)} title={f.ativo ? "Clique para desativar" : "Clique para ativar"}
                  style={{ position: "absolute", top: 12, right: 12, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", border: 0, fontFamily: "inherit", background: "rgba(255,255,255,.92)", color: f.ativo ? VERDE : VERMELHO, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", padding: "4px 10px", borderRadius: 99, boxShadow: "0 2px 6px -2px rgba(0,0,0,.3)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.ativo ? VERDE : VERMELHO }} /> {f.ativo ? "Ativo" : "Inativo"}
                </button>

                {/* avatar sobreposto */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: -34 }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #000))", color: "var(--brand-ct,#fff)", fontWeight: 800, fontSize: 23, border: "3px solid var(--card)", boxShadow: "0 6px 16px -6px rgba(0,0,0,.45)" }}>
                    <User size={30} />
                  </div>
                </div>

                {/* nome + cargo centralizados */}
                <div style={{ padding: "8px 16px 0" }}>
                  <CampoNome valor={f.nome} placeholder="Nome" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { nome: v.trim() || f.nome }, el)} style={{ fontSize: 16, fontWeight: 800, textAlign: "center" }} />
                  <div style={{ marginTop: 2 }}>
                    <Campo valor={f.cargo} placeholder="Cargo" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { cargo: v.trim() || null }, el)} style={{ fontSize: 12.5, fontWeight: 600, textAlign: "center", color: "var(--muted)" }} />
                  </div>
                </div>

                {/* dados */}
                <div style={{ padding: "12px 16px 16px", marginTop: 10, display: "grid", gap: 10, borderTop: "1px solid var(--line)" }}>
                  <LinhaEdit icone={<Phone size={14} />} valor={f.contato} placeholder="Telefone" formatar={mascararTelefone} onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { contato: v.trim() || null }, el)} />
                  <LinhaEdit icone={<Mail size={14} />} valor={f.email} placeholder="E-mail" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarEmail(f.id, v, el)} />
                  <LinhaEdit icone={<CreditCard size={14} />} prefixo="CPF" prefixoClaro valor={f.cpf} formatar={mascararCPF} onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCpf(f.id, v, el)} />
                  <LinhaEdit icone={<KeyRound size={14} />} prefixo="Pix" prefixoClaro valor={f.pix} onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { pix: v.trim() || null }, el)} />
                  <LinhaEdit icone={<Cake size={14} />} prefixo="Nasc." valor={f.nascimento} tipo="date" onFocar={() => aoFocar(f.id)} onDesfocar={aoDesfocar} onSalvar={(v, el) => salvarCampo(f.id, { nascimento: v || null }, el)} />
                </div>

                {!f.ativo && f.desativado_em && (
                  <div style={{ margin: "0 16px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: AMARELO, background: "rgba(245,158,11,.12)", padding: "4px 10px", borderRadius: 8 }}>
                    Desativado em {brData(f.desativado_em)}
                  </div>
                )}
              </div>
            );
          })}

          {/* card final para cadastrar — cria um card em branco na hora (só nos ativos) */}
          {filtro === "ativos" && (
            <button onClick={novoInline} disabled={criando}
              style={modo === "lista"
                ? { minHeight: 50, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, cursor: criando ? "wait" : "pointer", opacity: criando ? .6 : 1, fontFamily: "inherit", borderRadius: 12, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".15s" }
                : { minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: criando ? "wait" : "pointer", opacity: criando ? .6 : 1, fontFamily: "inherit", borderRadius: 18, border: "2px dashed var(--line-2)", background: "transparent", color: "var(--muted)", transition: ".15s" }}
              onMouseEnter={(e) => { if (!criando) { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--muted)"; }}>
              {modo === "lista" ? (
                <><Plus size={16} /> <b style={{ fontSize: 13 }}>Cadastrar equipe</b></>
              ) : (
                <>
                  <span style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}><Plus size={22} /></span>
                  <b style={{ fontSize: 13.5 }}>Cadastrar equipe</b>
                </>
              )}
            </button>
          )}
        </div>

      {/* aviso: CPF ou e-mail inválido */}
      {aviso && (
        <div onClick={() => setAviso(null)}
          style={{ position: "fixed", inset: 0, zIndex: 85, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24, border: `1px solid ${VERMELHO}`, background: "linear-gradient(160deg, rgba(239,68,68,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(239,68,68,.16)", color: VERMELHO, flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>{aviso.titulo}</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{aviso.texto}</p>
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 18 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAviso(null)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de desativação — recado em amarelo, com a data escolhida */}
      {aDesativar && (
        <div onClick={() => setADesativar(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, padding: 24, border: `1px solid ${AMARELO}`, background: "linear-gradient(160deg, rgba(245,158,11,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.16)", color: AMARELO, flexShrink: 0, fontSize: 20 }}>⚠️</span>
              <div>
                <b style={{ fontSize: 15 }}>Desativar &ldquo;{aDesativar.f.nome || "colaborador"}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Confirme a data em que ele será desativado.</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="f">Data da desativação</label>
              <input type="date" value={aDesativar.data} onChange={(e) => setADesativar((a) => a ? { ...a, data: e.target.value } : a)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setADesativar(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: AMARELO, color: "#3b2e05" }}
                onClick={async () => { await updateFuncionario(aDesativar.f.id, { ativo: false, desativado_em: aDesativar.data }); setADesativar(null); reload(); }}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de reativação — em verde */}
      {aAtivar && (
        <div onClick={() => setAAtivar(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400, padding: 24, border: `1px solid ${VERDE}`, background: "linear-gradient(160deg, rgba(16,185,129,.10), var(--card) 60%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(16,185,129,.16)", color: VERDE, flexShrink: 0 }}><Power size={19} /></span>
              <div>
                <b style={{ fontSize: 15 }}>Reativar &ldquo;{aAtivar.nome || "colaborador"}&rdquo;?</b>
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Ele volta a aparecer como ativo na equipe.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAAtivar(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERDE }}
                onClick={async () => { await updateFuncionario(aAtivar.id, { ativo: true, desativado_em: null }); setAAtivar(null); reload(); }}>
                Reativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* selinho "Salvo" ao lado do campo editado */}
      {flash && (
        <div style={{ position: "fixed", top: flash.top, left: flash.left, transform: "translate(8px, -50%)", zIndex: 90, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 3, background: "#64748b", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 99, boxShadow: "0 3px 8px -3px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          ✓ Salvo
        </div>
      )}

      {/* barra "desfazer exclusão" com contagem regressiva — igual ao de Finanças */}
      {desfazer && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 85,
          display: "flex", alignItems: "center", gap: 14, background: "#1e293b", color: "#fff",
          padding: "10px 12px 10px 18px", borderRadius: 12, boxShadow: "0 14px 34px -10px rgba(0,0,0,.6)" }}>
          <span style={{ fontSize: 13 }}>{desfazer.texto}</span>
          <button onClick={() => { desfazer.onDesfazer(); fecharDesfazer(); }}
            style={{ background: "transparent", border: 0, color: "#38BDF8", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Desfazer exclusão
          </button>
          <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{segRestante}</span>
        </div>
      )}

      {/* confirmação de exclusão — mesma mensagem de Finanças */}
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
                <p className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>Você ainda pode desfazer por alguns segundos depois de excluir.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAExcluir(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", background: VERMELHO }} onClick={() => { aExcluir.onOk(); setAExcluir(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
