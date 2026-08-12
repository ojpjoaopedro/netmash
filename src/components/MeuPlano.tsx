"use client";
import { useEffect, useState } from "react";
import { Crown, Check, ArrowUpRight, Compass, Wallet, Shield, Lock, Package } from "lucide-react";
import BotaoOcultar from "./ocultar";
import { supabase, supabaseReady } from "@/lib/supabase";
import { PRECO_SUPERADMIN, PRECO_ACESSO } from "@/lib/precos";

// Super Admin é o plano base (fixo, sempre ativo). Os demais módulos vêm do
// catálogo do Admin (tabela planos_catalogo), com imagem, nome e preço.
const TEL = "5562994797664";   // WhatsApp do Minhas Métricas
const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Modulo = { chave: string; nome: string; descricao: string | null; preco: number; imagem: string | null; link_pagamento?: string | null; selo?: string | null };

// Catálogo de reserva, caso a tabela ainda não responda.
const CATALOGO_PADRAO: Modulo[] = [
  { chave: "folha", nome: "Folha de pagamento", descricao: "Salários, benefícios e encargos da equipe em um só lugar.", preco: 39.9, imagem: null },
  { chave: "acesso2", nome: "2º acesso", descricao: "Mais um login de administrador para a sua equipe.", preco: 9.9, imagem: null },
  { chave: "planejamento", nome: "Planejamento estratégico", descricao: "Defina metas e pilares e acompanhe o plano da sua empresa.", preco: 29.9, imagem: null },
];

// Ícone de reserva por módulo (usado quando não há imagem cadastrada).
function IconeModulo({ chave }: { chave: string }) {
  if (chave === "folha") return <Wallet size={23} />;
  if (chave === "acesso2") return <Shield size={23} />;
  if (chave === "planejamento") return <Compass size={23} />;
  return <Package size={23} />;
}

function ativarModulo(m: Modulo) {
  // Se o produto tem link de pagamento (checkout), vai direto pra ele.
  if (m.link_pagamento && m.link_pagamento.trim()) {
    window.open(m.link_pagamento.trim(), "_blank", "noopener");
    return;
  }
  // Sem link cadastrado: cai no WhatsApp como antes.
  const msg = `Olá! Quero ativar o módulo de ${m.nome} (${fmt(m.preco)}/mês) no Minhas Métricas.`;
  window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

export default function MeuPlano({ empresa }: { empresa?: { planos?: Record<string, boolean> | null } | null }) {
  const [admins, setAdmins] = useState(0);
  const [catalogo, setCatalogo] = useState<Modulo[]>(CATALOGO_PADRAO);

  useEffect(() => {
    const ler = () => {
      try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); setAdmins((s?.admins || []).length); } catch { /* ignore */ }
    };
    ler();
    window.addEventListener("me:diretores", ler);
    return () => window.removeEventListener("me:diretores", ler);
  }, []);

  useEffect(() => {
    if (!supabaseReady || !supabase) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase!.from("planos_catalogo").select("chave,nome,descricao,preco,imagem,link_pagamento,selo").order("ordem", { ascending: true });
      if (vivo && data && data.length) setCatalogo(data as Modulo[]);
    })();
    return () => { vivo = false; };
  }, []);

  const total = PRECO_SUPERADMIN + admins * PRECO_ACESSO;
  const ativo = (chave: string) => Boolean(empresa?.planos?.[chave]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><BotaoOcultar /></div>
      {/* plano atual */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "26px 28px", color: "#fff", background: "linear-gradient(120deg, var(--brand-dark), var(--brand))" }}>
        <div style={{ position: "absolute", right: -50, top: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(255,255,255,.18)", padding: "4px 12px", borderRadius: 99 }}>
            <Check size={13} /> Plano ativo
          </span>
          <div style={{ marginTop: 12, fontSize: 15, opacity: .92 }}>Seu plano atual</div>
          <b style={{ fontSize: 22, letterSpacing: "-.01em" }}>1 Super Admin{admins > 0 ? ` + ${admins} ${admins === 1 ? "Acesso" : "Acessos"}` : ""}</b>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
            <b className="oc-num" style={{ fontSize: 30, letterSpacing: "-.02em" }}>{fmt(total)}</b>
            <span style={{ opacity: .9 }}>/ mês</span>
          </div>
        </div>
      </div>

      {/* valores */}
      <div className="card" style={{ padding: 22 }}>
        <b style={{ fontSize: 16 }}>Valores</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--bg-2)", borderRadius: 14, padding: "16px 18px" }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(245,158,11,.16)", color: "#F59E0B", flexShrink: 0 }}><Crown size={22} /></span>
            <div>
              <div className="sub" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Super Admin</div>
              <b className="oc-num" style={{ fontSize: 20 }}>{fmt(PRECO_SUPERADMIN)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
            </div>
            <span style={{ marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#10B981", background: "rgba(16,185,129,.14)", padding: "6px 12px", borderRadius: 99 }}>
              <Check size={13} /> Ativado
            </span>
          </div>
        </div>
      </div>

      {/* módulos adicionais (vêm do catálogo do Admin) */}
      {catalogo.map((m) => {
        const on = ativo(m.chave);
        return (
          <div key={m.chave} className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                {m.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imagem} alt={m.nome} style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "1px solid var(--line-2)" }} />
                ) : (
                  <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", flexShrink: 0 }}><IconeModulo chave={m.chave} /></span>
                )}
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 16, display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    {m.nome} {!on && <Lock size={14} style={{ color: "var(--muted)" }} />}
                    {!on && m.selo && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".02em", color: "#10B981", background: "rgba(16,185,129,.14)", padding: "3px 9px", borderRadius: 99 }}>{m.selo}</span>}
                  </b>
                  {m.descricao && <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>{m.descricao}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <b className="oc-num" style={{ fontSize: 22 }}>{fmt(m.preco)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
                <div style={{ marginTop: 8 }}>
                  {on ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#10B981", background: "rgba(16,185,129,.14)", padding: "8px 14px", borderRadius: 99 }}>
                      <Check size={13} /> Ativado
                    </span>
                  ) : (
                    <button className="btn" onClick={() => ativarModulo(m)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", fontSize: 14 }}>
                      <ArrowUpRight size={16} /> Ativar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
