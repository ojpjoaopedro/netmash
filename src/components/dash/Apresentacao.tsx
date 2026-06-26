"use client";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Metrica } from "@/lib/indicadores";
import type { Lancamento } from "@/lib/db";
import { ytd, statusMeta, def, serieMes } from "@/lib/indicadores";
import { resumo } from "@/lib/calc";
import { brlCompact, ultimosMeses, dataBR, hoje } from "@/lib/format";
import { KpiRing, Icon, fmt, fmtCompact } from "./Kit";
import { MiniLineCard } from "../Charts";

type Brand = { nome: string; logo: string | null };

export default function Apresentacao({
  metrs,
  lancs,
  saldoInicial,
  brand,
  onClose,
}: {
  metrs: Metrica[];
  lancs: Lancamento[];
  saldoInicial: number;
  brand: Brand;
  onClose: () => void;
}) {
  const ano = new Date().getFullYear();

  // ---------- helper: monta props de um KpiRing a partir do catálogo + YTD ----------
  function kpi(key: string, delay = 0) {
    const d = def(key);
    const { value, meta, pct } = ytd(metrs, key);
    const status = statusMeta(pct, d?.invert);
    return {
      key,
      icon: d?.icon ?? "BarChart3",
      label: d?.label ?? key,
      valor: fmt(value, d?.unidade ?? "count"),
      pct,
      meta: fmtCompact(meta, d?.unidade ?? "count"),
      status,
      cor: d?.cor ?? "var(--brand)",
      delay,
    };
  }

  function KpiGrid({ keys }: { keys: string[] }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: 18,
          width: "min(1100px, 92vw)",
          margin: "0 auto",
        }}
      >
        {keys.map((k, i) => {
          const p = kpi(k, i * 0.06);
          return (
            <KpiRing
              key={k}
              icon={p.icon}
              label={p.label}
              valor={p.valor}
              pct={p.pct}
              meta={p.meta}
              status={p.status}
              cor={p.cor}
              delay={p.delay}
            />
          );
        })}
      </div>
    );
  }

  function HeroNumero({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
          {titulo}
        </div>
        <div style={{ fontSize: "clamp(44px, 8vw, 88px)", fontWeight: 900, color: cor, lineHeight: 1.05, marginTop: 6 }}>
          {valor}
        </div>
      </div>
    );
  }

  // ---------- valores agregados ----------
  const r = resumo(lancs, ultimosMeses(12), saldoInicial);
  const fatYTD = ytd(metrs, "faturamento");
  const serieFat = serieMes(metrs, "faturamento").map((s) => ({ period: s.period, value: s.value }));

  // ---------- slides ----------
  const slides: { id: string; node: React.ReactNode }[] = [
    // 1. CAPA
    {
      id: "capa",
      node: (
        <div style={{ textAlign: "center", display: "grid", gap: 22, placeItems: "center" }}>
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt={brand.nome} style={{ height: 96, maxWidth: "70vw", objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: "clamp(40px, 9vw, 84px)", fontWeight: 900, color: "var(--brand)", lineHeight: 1 }}>
              {brand.nome}
            </div>
          )}
          <div
            style={{
              width: 64,
              height: 4,
              borderRadius: 4,
              background: "var(--brand)",
            }}
          />
          <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900 }}>
            Relatório de Resultados {ano}
          </h1>
          {brand.logo && (
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--txt)" }}>{brand.nome}</div>
          )}
          <div style={{ color: "var(--muted)", fontSize: 16 }}>{dataBR(hoje())}</div>
        </div>
      ),
    },
    // 2. VISÃO GERAL
    {
      id: "visao",
      node: (
        <div style={{ display: "grid", gap: 32, width: "100%" }}>
          <SlideTitle icon="Sparkles" titulo="Visão geral" sub={`Indicadores-chave do acumulado de ${ano}`} />
          <KpiGrid keys={["faturamento", "lucro", "margem", "clientes_ativos", "nps", "leads"]} />
        </div>
      ),
    },
    // 3. FINANÇAS
    {
      id: "financas",
      node: (
        <div style={{ display: "grid", gap: 28, width: "100%" }}>
          <SlideTitle icon="DollarSign" titulo="Finanças" sub={`Receita e resultado em ${ano}`} cor="#10B981" />
          <HeroNumero titulo="Faturamento (YTD)" valor={brlCompact(fatYTD.value)} cor="#10B981" />
          <div style={{ width: "min(560px, 92vw)", margin: "0 auto" }}>
            <MiniLineCard titulo="Faturamento mês a mês" unidade="BRL" serie={serieFat} cor="#10B981" />
          </div>
          <KpiGrid keys={["lucro", "margem"]} />
        </div>
      ),
    },
    // 4. SAÚDE DO CLIENTE
    {
      id: "cliente",
      node: (
        <div style={{ display: "grid", gap: 32, width: "100%" }}>
          <SlideTitle icon="Smile" titulo="Saúde do cliente" sub="Retenção, satisfação e expansão" cor="#8b5cf6" />
          <KpiGrid keys={["clientes_ativos", "nps", "churn", "cross_sell"]} />
        </div>
      ),
    },
    // 5. COMERCIAL
    {
      id: "comercial",
      node: (
        <div style={{ display: "grid", gap: 32, width: "100%" }}>
          <SlideTitle icon="Award" titulo="Comercial" sub="Aquisição e eficiência de vendas" cor="#1AADE2" />
          <KpiGrid keys={["novos_clientes", "vendas", "conversao", "ticket_medio"]} />
        </div>
      ),
    },
    // 6. MARKETING
    {
      id: "marketing",
      node: (
        <div style={{ display: "grid", gap: 32, width: "100%" }}>
          <SlideTitle icon="Megaphone" titulo="Marketing" sub="Geração de demanda e retorno" cor="#ff6b9d" />
          <KpiGrid keys={["leads", "roi", "cac", "trafego"]} />
        </div>
      ),
    },
    // 7. ENCERRAMENTO
    {
      id: "fim",
      node: (
        <div style={{ textAlign: "center", display: "grid", gap: 24, placeItems: "center" }}>
          <Icon name="Sparkles" size={56} color="var(--brand)" />
          <h1 style={{ margin: 0, fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 900 }}>Obrigado</h1>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--brand)" }}>{brand.nome}</div>
          <p style={{ maxWidth: 620, fontSize: 18, color: "var(--muted)", lineHeight: 1.5 }}>
            No acumulado do período, a empresa registrou um lucro de{" "}
            <b style={{ color: r.lucro >= 0 ? "#10B981" : "#EF4444" }}>{brlCompact(r.lucro)}</b>{" "}
            sobre um faturamento de <b style={{ color: "var(--txt)" }}>{brlCompact(r.faturamento)}</b>{" "}
            (margem de {r.margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%).
          </p>
        </div>
      ),
    },
  ];

  const total = slides.length;
  const [i, setI] = useState(0);

  const prox = useCallback(() => setI((v) => Math.min(v + 1, total - 1)), [total]);
  const ant = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  // ---------- teclado ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") prox();
      else if (e.key === "ArrowLeft") ant();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prox, ant]);

  const NAV_BTN: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "var(--card)",
    border: "1px solid var(--line)",
    color: "var(--txt)",
    fontSize: 30,
    cursor: "pointer",
    zIndex: 62,
    lineHeight: 1,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--bg)",
        color: "var(--txt)",
        overflow: "hidden",
      }}
    >
      {/* Sair */}
      <button
        onClick={onClose}
        className="btn ghost"
        style={{ position: "fixed", top: 20, right: 20, zIndex: 62 }}
      >
        ✕ Sair
      </button>

      {/* Anterior */}
      <button
        aria-label="Slide anterior"
        onClick={ant}
        disabled={i === 0}
        style={{ ...NAV_BTN, left: 20, opacity: i === 0 ? 0.35 : 1 }}
      >
        ‹
      </button>

      {/* Próximo */}
      <button
        aria-label="Próximo slide"
        onClick={prox}
        disabled={i === total - 1}
        style={{ ...NAV_BTN, right: 20, opacity: i === total - 1 ? 0.35 : 1 }}
      >
        ›
      </button>

      {/* Palco do slide */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: "72px clamp(72px, 9vw, 140px)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slides[i].id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ width: "100%", display: "grid", placeItems: "center" }}
          >
            {slides[i].node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Contador */}
      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 62,
          fontSize: 15,
          fontWeight: 700,
          color: "var(--muted)",
          letterSpacing: ".5px",
        }}
      >
        {i + 1} / {total}
      </div>
    </div>
  );
}

// ---------- Título grande de slide ----------
function SlideTitle({
  icon,
  titulo,
  sub,
  cor = "var(--brand)",
}: {
  icon: string;
  titulo: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 10, placeItems: "center" }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: `linear-gradient(135deg, ${cor}, ${cor}99)`,
        }}
      >
        <Icon name={icon} size={30} color="#fff" />
      </div>
      <h2 style={{ margin: 0, fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 900 }}>{titulo}</h2>
      {sub && <p style={{ margin: 0, color: "var(--muted)", fontSize: 17 }}>{sub}</p>}
    </div>
  );
}
