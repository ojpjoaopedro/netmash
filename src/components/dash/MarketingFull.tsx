"use client";

import { useState } from "react";
import { LayoutGrid, MousePointerClick, Globe, Share2, Star } from "lucide-react";
import { SecHead, KpiRing, Icon, fmt, fmtCompact } from "./Kit";
import { DonutCategorias } from "@/components/Charts";
import { def, ytd, statusMeta, type Metrica } from "@/lib/indicadores";

// ------------------------------------------------------------
// Painéis de marketing — réplica do Hub Dynamis (tema escuro)
// ------------------------------------------------------------

type PainelId = "macro" | "trafego" | "site" | "redes" | "influencers";

type PainelDef = {
  id: PainelId;
  titulo: string;
  cor: string;
  Ico: typeof LayoutGrid;
  desc: string;
};

const PAINEIS: PainelDef[] = [
  { id: "macro", titulo: "Macro", cor: "#ff6b9d", Ico: LayoutGrid, desc: "Visão geral" },
  { id: "trafego", titulo: "Tráfego", cor: "#1AADE2", Ico: MousePointerClick, desc: "Aquisição paga" },
  { id: "site", titulo: "Site", cor: "#10B981", Ico: Globe, desc: "Conversão" },
  { id: "redes", titulo: "Redes sociais", cor: "#8b5cf6", Ico: Share2, desc: "Comunidade" },
  { id: "influencers", titulo: "Influencers", cor: "#F59E0B", Ico: Star, desc: "Parcerias" },
];

const ORIGEM_LEADS = [
  { categoria: "Tráfego pago", valor: 85 },
  { categoria: "Orgânico", valor: 5 },
  { categoria: "Indicação", valor: 5 },
  { categoria: "Redes sociais", valor: 3 },
  { categoria: "Influencers", valor: 2 },
];

// ---------- Card de resultado (número grande + ícone colorido) ----------
function ResultCard({ icon, label, valor, cor }: { icon: string; label: string; valor: string; cor: string }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        className="ico"
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          display: "grid",
          placeItems: "center",
          background: `linear-gradient(135deg, ${cor}, ${cor}aa)`,
        }}
      >
        <Icon name={icon} size={22} color="#fff" />
      </div>
      <div>
        <div className="lab" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--muted)" }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.6px", marginTop: 4 }}>{valor}</div>
      </div>
    </div>
  );
}

// ---------- Mini rótulo de bloco ----------
function BlocoTitulo({ children, cor = "var(--muted)" }: { children: React.ReactNode; cor?: string }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 800,
        letterSpacing: "1.4px",
        textTransform: "uppercase",
        color: cor,
        margin: "26px 0 12px",
      }}
    >
      {children}
    </div>
  );
}

// ---------- KpiRing a partir de uma métrica do catálogo ----------
function KpiFromKey({ metrs, mkey }: { metrs: Metrica[]; mkey: string }) {
  const d = def(mkey);
  if (!d) return null;
  const r = ytd(metrs, mkey);
  const status = statusMeta(r.pct, d.invert);
  return (
    <KpiRing
      icon={d.icon}
      label={d.label}
      valor={fmtCompact(r.value, d.unidade)}
      pct={r.pct}
      meta={fmtCompact(d.metaAno, d.unidade)}
      status={status}
      cor={d.cor}
    />
  );
}

export default function MarketingFull({ metrs }: { metrs: Metrica[] }) {
  const [painel, setPainel] = useState<PainelId>("macro");
  const ativo = PAINEIS.find((p) => p.id === painel) ?? PAINEIS[0];

  // agregados reutilizados
  const fat = ytd(metrs, "faturamento");
  const vendas = ytd(metrs, "vendas");
  const roi = ytd(metrs, "roi");
  const leads = ytd(metrs, "leads");
  const metaLeads = def("leads")?.metaAno ?? 0;

  return (
    <section>
      <SecHead
        icon="Megaphone"
        titulo="Painéis de marketing"
        sub="Visão de aquisição e canais"
        cor="#ff6b9d"
        ano={new Date().getFullYear()}
      />

      {/* ---------- Seletores de painel (tabs) ---------- */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {PAINEIS.map((p) => {
          const sel = p.id === painel;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPainel(p.id)}
              className="card"
              style={{
                position: "relative",
                cursor: "pointer",
                textAlign: "left",
                transition: ".2s",
                borderColor: sel ? p.cor : "var(--line)",
                boxShadow: sel ? `0 0 0 1px ${p.cor}` : undefined,
                background: sel ? `linear-gradient(180deg, ${p.cor}14, transparent)` : "var(--card)",
              }}
            >
              {sel && (
                <span
                  className="chip"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: `${p.cor}22`,
                    color: p.cor,
                  }}
                >
                  ATIVO
                </span>
              )}
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: `${p.cor}22`,
                  marginBottom: 10,
                }}
              >
                <p.Ico size={20} color={p.cor} />
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.titulo}</div>
              <div className="sub" style={{ marginTop: 2 }}>{p.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ---------- Conteúdo por painel ---------- */}
      {painel === "macro" && (
        <>
          <BlocoTitulo cor={ativo.cor}>Resultado</BlocoTitulo>
          <div className="grid three">
            <ResultCard icon="DollarSign" label="Receita (YTD)" valor={fmtCompact(fat.value, "BRL")} cor="#10B981" />
            <ResultCard icon="Users" label="Vendas (YTD)" valor={fmt(vendas.value, "count")} cor="#8b5cf6" />
            <ResultCard icon="TrendingUp" label="ROI" valor={fmt(roi.value, "%")} cor="#1AADE2" />
          </div>

          <BlocoTitulo cor={ativo.cor}>Origem dos leads</BlocoTitulo>
          <div className="card">
            <h3>Origem dos Leads — Distribuição por canal</h3>
            <DonutCategorias data={ORIGEM_LEADS} formato="pct" />
          </div>

          <BlocoTitulo cor={ativo.cor}>Aquisição</BlocoTitulo>
          <div className="grid four">
            <KpiFromKey metrs={metrs} mkey="leads" />
            <ResultCard icon="Target" label="Meta de leads" valor={fmt(metaLeads, "count")} cor="#ff6b9d" />
            <KpiFromKey metrs={metrs} mkey="cac" />
            <KpiFromKey metrs={metrs} mkey="investimento" />
          </div>
        </>
      )}

      {painel === "trafego" && (
        <>
          <BlocoTitulo cor={ativo.cor}>Tráfego pago</BlocoTitulo>
          <div className="grid three">
            <KpiFromKey metrs={metrs} mkey="trafego" />
            <KpiFromKey metrs={metrs} mkey="investimento" />
            <KpiFromKey metrs={metrs} mkey="cac" />
          </div>

          <BlocoTitulo cor={ativo.cor}>Origem dos leads</BlocoTitulo>
          <div className="card">
            <h3>Origem dos Leads — Distribuição por canal</h3>
            <DonutCategorias data={ORIGEM_LEADS} formato="pct" />
          </div>

          <BlocoTitulo cor={ativo.cor}>Resultado da mídia</BlocoTitulo>
          <div className="grid two">
            <KpiFromKey metrs={metrs} mkey="leads" />
            <ResultCard icon="TrendingUp" label="ROI" valor={fmt(roi.value, "%")} cor="#10B981" />
          </div>
        </>
      )}

      {painel === "site" && (
        <>
          <BlocoTitulo cor={ativo.cor}>Conversão do site</BlocoTitulo>
          <div className="grid three">
            <KpiFromKey metrs={metrs} mkey="trafego" />
            <KpiFromKey metrs={metrs} mkey="conversao" />
            <KpiFromKey metrs={metrs} mkey="leads" />
          </div>

          <BlocoTitulo cor={ativo.cor}>Funil resumido</BlocoTitulo>
          <div className="grid three">
            <ResultCard icon="Globe" label="Visitas (YTD)" valor={fmt(ytd(metrs, "trafego").value, "count")} cor="#1AADE2" />
            <ResultCard icon="Megaphone" label="Leads (YTD)" valor={fmt(leads.value, "count")} cor="#ff6b9d" />
            <ResultCard icon="Zap" label="Conversão" valor={fmt(ytd(metrs, "conversao").value, "%")} cor="#10B981" />
          </div>
        </>
      )}

      {painel === "redes" && (
        <>
          <BlocoTitulo cor={ativo.cor}>Comunidade</BlocoTitulo>
          <div className="grid two">
            <KpiFromKey metrs={metrs} mkey="seguidores" />
            <ResultCard
              icon="Share2"
              label="Novos seguidores (YTD)"
              valor={fmt(ytd(metrs, "seguidores").value, "count")}
              cor="#8b5cf6"
            />
          </div>

          <BlocoTitulo cor={ativo.cor}>Contribuição em leads</BlocoTitulo>
          <div className="card">
            <h3>Origem dos Leads — Distribuição por canal</h3>
            <DonutCategorias data={ORIGEM_LEADS} formato="pct" />
          </div>
        </>
      )}

      {painel === "influencers" && (
        <>
          <BlocoTitulo cor={ativo.cor}>Influencers</BlocoTitulo>
          <div className="card">
            <div className="empty">
              <div className="big">⭐</div>
              <b style={{ display: "block", fontSize: 16, color: "var(--txt)", marginBottom: 6 }}>
                Nenhum influenciador cadastrado
              </b>
              Cadastre seus influenciadores para acompanhar alcance, parcerias e conversões por aqui.
            </div>
          </div>
        </>
      )}
    </section>
  );
}
