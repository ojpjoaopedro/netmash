"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, Minus, Sparkles } from "lucide-react";
import { Empresa } from "@/lib/db";
import { Brand } from "@/lib/brand";
import { navegar, AlvoNav } from "@/lib/nav";

const KEY_MIN = "me_guia_min";
const KEY_OK = "me_guia_concluido";

function lerJSON<T = unknown>(k: string): T | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
}

type Item = { key: string; label: string; feito: boolean; nav: AlvoNav };

export default function GuiaConfiguracao({ empresa, brand, funcsCount }: { empresa: Empresa | null; brand: Brand; funcsCount: number }) {
  const [tick, setTick] = useState(0);                 // força reavaliação periódica
  const [min, setMin] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMin(localStorage.getItem(KEY_MIN) === "1");
    setMontado(true);
    const bump = () => setTick((t) => t + 1);
    const id = window.setInterval(bump, 1500);
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    window.addEventListener("me:diretores", bump);
    window.addEventListener("me:estrutura", bump);
    return () => { window.clearInterval(id); window.removeEventListener("focus", bump); window.removeEventListener("storage", bump); window.removeEventListener("me:diretores", bump); window.removeEventListener("me:estrutura", bump); };
  }, []);

  // ── avaliação das etapas (relê o localStorage a cada tick) ──────────────────
  void tick;
  const dir = lerJSON<{ sup?: Record<string, string> }>("me_diretores");
  const sup = dir?.sup || {};
  const superOK = ["nome", "area", "telefone", "cpf", "pix", "nascimento"].every((k) => String(sup[k] || "").trim());

  const extra = lerJSON<Record<string, string>>(`me_empresa_extra:${empresa?.id || "default"}`) || {};
  const nomeEmpresaOK = !!empresa?.nome && !["Minha Empresa", "Minha Empresa (demonstração)"].includes(empresa.nome);
  const empresaOK = nomeEmpresaOK && !!empresa?.segmento && !!empresa?.cnpj
    && ["email", "contato", "rua", "bairro", "cidade", "uf"].every((k) => String(extra[k] || "").trim());

  const logoOK = !!brand?.logo;
  const equipeOK = (funcsCount || 0) >= 1;
  const cal = lerJSON<unknown[]>("me_calendario_pagamentos");
  const calOK = Array.isArray(cal) && cal.length >= 1;

  const itens: Item[] = [
    { key: "super", label: "Preencher dados do SuperAdmin", feito: superOK, nav: { view: "config", aba: "usuarios" } },
    { key: "empresa", label: "Preencher dados da empresa", feito: empresaOK, nav: { view: "config", aba: "dados" } },
    { key: "logo", label: "Cadastrar a logomarca", feito: logoOK, nav: { view: "config", aba: "personalizacao" } },
    { key: "equipe", label: "Cadastrar 1 membro da equipe", feito: equipeOK, nav: { view: "config", aba: "equipe" } },
    { key: "calendario", label: "Cadastrar 1 despesa no calendário", feito: calOK, nav: { view: "financas", aba: "calendario", sub: "pagamentos" } },
  ];
  const feitos = itens.filter((i) => i.feito).length;
  const total = itens.length;
  const pct = Math.round((feitos / total) * 100);
  const tudoOK = feitos === total;

  // grava a conclusão para o guia não voltar depois
  useEffect(() => { if (tudoOK) { try { localStorage.setItem(KEY_OK, "1"); } catch { /* ignore */ } } }, [tudoOK]);

  if (!montado) return null;
  if (tudoOK || localStorage.getItem(KEY_OK) === "1") return null;

  const trocarMin = (v: boolean) => { setMin(v); try { localStorage.setItem(KEY_MIN, v ? "1" : "0"); } catch { /* ignore */ } };
  const ir = (a: AlvoNav) => navegar(a);

  // pílula minimizada
  if (min) {
    return (
      <button onClick={() => trocarMin(false)}
        style={{ position: "fixed", right: 20, bottom: 20, zIndex: 80, display: "inline-flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--txt)", boxShadow: "0 12px 30px -10px rgba(0,0,0,.4)" }}>
        <Sparkles size={16} style={{ color: "var(--brand)" }} /> Guia de configuração
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 14%, transparent)", padding: "2px 8px", borderRadius: 99 }}>{feitos}/{total}</span>
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 80, width: 288, maxWidth: "calc(100vw - 40px)", borderRadius: 16, overflow: "hidden", background: "var(--card)", border: "2px solid var(--line-2)", boxShadow: "0 20px 50px -12px rgba(0,0,0,.5)" }}>
      {/* cabeçalho */}
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <b style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}><Sparkles size={15} style={{ color: "var(--brand)" }} /> Guia de configuração</b>
          <button onClick={() => trocarMin(true)} title="Minimizar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 8 }}><Minus size={15} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", borderRadius: 99, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>{feitos}/{total}</span>
        </div>
      </div>

      {/* lista de etapas dentro de uma caixa cinza (estilo print) */}
      <div style={{ margin: "0 10px 10px", padding: 5, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
        {itens.map((it) => (
          <button key={it.key} onClick={() => ir(it.nav)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: "transparent", border: 0, borderRadius: 9, padding: "8px 7px", transition: ".12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            {it.feito
              ? <CheckCircle2 size={18} style={{ color: "var(--brand)", flexShrink: 0 }} />
              : <Circle size={18} style={{ color: "var(--muted-2)", flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: it.feito ? "var(--muted)" : "var(--txt)", textDecoration: it.feito ? "line-through" : "none" }}>{it.label}</span>
            {!it.feito && <ChevronRight size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
