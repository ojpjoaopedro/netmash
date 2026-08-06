"use client";
import { useEffect, useState } from "react";
import { Crown, Shield, Check, ArrowUpRight, Compass, UserPlus, Wallet } from "lucide-react";
import BotaoOcultar from "./ocultar";

// Valores oficiais do modelo de assinatura (mesmos do painel Super Admin)
const PRECO_SUPERADMIN = 79.9; // por administrador principal da empresa
const PRECO_ACESSO = 39.9;     // por acesso adicional (admin)
const PRECO_PLANEJAMENTO = 29.9; // módulo Planejamento estratégico
const PRECO_CLIENTES = 39.9;     // módulo Cadastro de clientes
const PRECO_FOLHA = 19.9;        // módulo Folha salarial
const TEL = "5562994797664";   // WhatsApp do Minhas Métricas
const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function upgrade() {
  const msg = "Olá! Quero fazer o upgrade do meu plano no Minhas Métricas e adicionar mais acessos (admins).";
  window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}
function ativarPlanejamento() {
  const msg = "Olá! Quero ativar o módulo de Planejamento estratégico (R$ 29,90/mês) no Minhas Métricas.";
  window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}
function ativarClientes() {
  const msg = "Olá! Quero ativar o módulo de Cadastro de clientes (R$ 39,90/mês) no Minhas Métricas.";
  window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}
function ativarFolha() {
  const msg = "Olá! Quero ativar o módulo de Folha salarial (R$ 19,90/mês) no Minhas Métricas.";
  window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

export default function MeuPlano() {
  const [admins, setAdmins] = useState(0);
  useEffect(() => {
    const ler = () => {
      try { const s = JSON.parse(localStorage.getItem("me_diretores") || "null"); setAdmins((s?.admins || []).length); } catch { /* ignore */ }
    };
    ler();
    window.addEventListener("me:diretores", ler);
    return () => window.removeEventListener("me:diretores", ler);
  }, []);

  const total = PRECO_SUPERADMIN + admins * PRECO_ACESSO;

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
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--bg-2)", borderRadius: 14, padding: "16px 18px" }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(26,173,226,.16)", color: "var(--brand)", flexShrink: 0 }}><Shield size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="sub" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Acesso (Admin)</div>
              <b className="oc-num" style={{ fontSize: 20 }}>{fmt(PRECO_ACESSO)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
            </div>
            <button className="btn" onClick={upgrade} style={{ marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", fontSize: 14 }}>
              <ArrowUpRight size={16} /> Ativar
            </button>
          </div>
        </div>
      </div>

      {/* módulo adicional: Planejamento estratégico */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Compass size={23} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>Planejamento estratégico</b>
              <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>Defina metas e pilares e acompanhe o plano da sua empresa.</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <b className="oc-num" style={{ fontSize: 22 }}>{fmt(PRECO_PLANEJAMENTO)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={ativarPlanejamento} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", fontSize: 14 }}>
                <ArrowUpRight size={16} /> Ativar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* módulo adicional: Cadastro de clientes */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", flexShrink: 0 }}><UserPlus size={23} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>Cadastro de clientes</b>
              <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>Cadastre e organize seus clientes em um só lugar.</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <b className="oc-num" style={{ fontSize: 22 }}>{fmt(PRECO_CLIENTES)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={ativarClientes} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", fontSize: 14 }}>
                <ArrowUpRight size={16} /> Ativar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* módulo adicional: Folha salarial */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Wallet size={23} /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>Folha salarial</b>
              <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>Salários, benefícios e encargos da equipe em um só lugar.</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <b className="oc-num" style={{ fontSize: 22 }}>{fmt(PRECO_FOLHA)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / mês</span></b>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={ativarFolha} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", fontSize: 14 }}>
                <ArrowUpRight size={16} /> Ativar
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
