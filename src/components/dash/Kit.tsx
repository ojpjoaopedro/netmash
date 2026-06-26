"use client";
import { motion } from "framer-motion";
import {
  DollarSign, Activity, TrendingDown, TrendingUp, Wallet, Percent, BarChart3,
  Users, Smile, UserMinus, ShoppingCart, Share2, UserPlus, Zap, Award, Target,
  Calendar, Megaphone, Globe, Sparkles, Scale, PiggyBank, ChevronRight, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  DollarSign, Activity, TrendingDown, TrendingUp, Wallet, Percent, BarChart3,
  Users, Smile, UserMinus, ShoppingCart, Share2, UserPlus, Zap, Award, Target,
  Calendar, Megaphone, Globe, Sparkles, Scale, PiggyBank,
};

export function Icon({ name, ...p }: { name: string; size?: number; color?: string; className?: string }) {
  const C = ICONS[name] || BarChart3;
  return <C size={p.size ?? 20} color={p.color} className={p.className} />;
}

// ---------- formatadores ----------
const fBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function fmt(value: number, unidade: string): string {
  if (unidade === "BRL") return fBRL.format(value);
  if (unidade === "%") return `${fDec.format(value)}%`;
  if (unidade === "score") return fDec.format(value);
  return fNum.format(value);
}
export function fmtCompact(value: number, unidade: string): string {
  if (unidade !== "BRL") return fmt(value, unidade);
  const a = Math.abs(value);
  if (a >= 1_000_000) return `R$ ${fDec.format(value / 1_000_000)} mi`;
  if (a >= 1_000) return `R$ ${fDec.format(value / 1_000)} mil`;
  return fBRL.format(value);
}

// ---------- Cabeçalho de seção (ícone badge gradiente + título + subtítulo) ----------
export function SecHead({ icon, titulo, sub, cor = "#1AADE2", ano, right }: {
  icon: string; titulo: React.ReactNode; sub?: string; cor?: string; ano?: string | number; right?: React.ReactNode;
}) {
  return (
    <div className="sechead">
      <div className="badge" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}99)` }}>
        <Icon name={icon} size={26} color="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <h2>{titulo} {ano && <span className="yearchip">{ano}</span>}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ---------- Mini KPI (hero) ----------
export function MiniKpi({ icon, valor, label, cor = "#1AADE2" }: { icon: string; valor: string; label: string; cor?: string }) {
  return (
    <div className="kmini">
      <div className="ic"><Icon name={icon} size={20} color={cor} /></div>
      <div className="v">{valor}</div>
      <div className="l">{label}</div>
    </div>
  );
}

// ---------- Anel de progresso (% da meta) ----------
export function Ring({ pct, cor, size = 64 }: { pct: number; cor: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={`${fill * c} ${c}`} />
      <text x={size / 2} y={size / 2} dominantBaseline="central" textAnchor="middle"
        transform={`rotate(90 ${size / 2} ${size / 2})`} fontSize="15" fontWeight="800" fill="var(--txt)">
        {pct}%
      </text>
    </svg>
  );
}

// ---------- KPI card com anel + meta + barra ----------
const STATUS_TXT = { ok: "No ritmo", warn: "Atenção", bad: "Abaixo" } as const;
export function KpiRing({ icon, label, valor, pct, meta, status, cor = "#1AADE2", delay = 0 }: {
  icon: string; label: string; valor: string; pct: number; meta: string;
  status: "ok" | "warn" | "bad"; cor?: string; delay?: number;
}) {
  const sc = status === "ok" ? "#10B981" : status === "warn" ? "#F59E0B" : "#EF4444";
  return (
    <motion.div className="kpiring" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}>
      <div className="top">
        <div style={{ flex: 1 }}>
          <div className="ico" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}aa)`, marginBottom: 12 }}>
            <Icon name={icon} size={22} color="#fff" />
          </div>
          <div className="lab">{label}</div>
          <div className="val">{valor}</div>
        </div>
        <Ring pct={pct} cor={sc} />
      </div>
      <div className="progress"><i style={{ width: `${Math.min(pct, 100)}%`, background: sc }} /></div>
      <div className="foot">
        <span className={`statuschip ${status}`}>{STATUS_TXT[status]}</span>
        <span className="meta">Meta: {meta}</span>
      </div>
    </motion.div>
  );
}

// ---------- Card de trimestre ----------
const QCOLORS = ["#10B981", "#1AADE2", "#8b5cf6", "#F59E0B"];
export function QuarterCard({ n, titulo, periodo, valor, extra, soon, onClick }: {
  n: number; titulo: string; periodo: string; valor?: string; extra?: React.ReactNode; soon?: boolean; onClick?: () => void;
}) {
  return (
    <div className={`qcard ${soon ? "soon" : ""}`} onClick={soon ? undefined : onClick}>
      <div className="qn" style={{ background: QCOLORS[n - 1] }}>{n}º</div>
      <div className="qt">{titulo}</div>
      <div className="qsub">{periodo}</div>
      {soon ? <div className="qsub" style={{ marginTop: 14 }}>Em breve</div> : (
        <>
          <div className="qv">{valor}</div>
          <div className="qx">{extra} <ChevronRight size={14} /></div>
        </>
      )}
    </div>
  );
}

// ---------- Card de mês ----------
export function MonthCard({ nome, icon, cor, valor, extra, soon, active, onClick }: {
  nome: string; icon: string; cor: string; valor?: string; extra?: React.ReactNode; soon?: boolean; active?: boolean; onClick?: () => void;
}) {
  return (
    <div className={`mcard ${soon ? "soon" : ""}`} onClick={soon ? undefined : onClick}
      style={active ? { borderColor: cor, boxShadow: `0 0 0 1px ${cor}` } : undefined}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <b style={{ fontSize: 14 }}>{nome}</b>
        <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: `${cor}22` }}>
          <Icon name={icon} size={15} color={cor} />
        </span>
      </div>
      {soon ? <div className="qsub" style={{ marginTop: 12 }}>Em breve</div> : (
        <>
          <div className="qv" style={{ fontSize: 20 }}>{valor}</div>
          <div className="qx" style={{ fontSize: 12 }}>{extra}</div>
        </>
      )}
    </div>
  );
}

// ---------- Card de análise ----------
export function AnalysisCard({ icon, titulo, sub, cor, onClick }: {
  icon: string; titulo: string; sub: string; cor: string; onClick?: () => void;
}) {
  return (
    <div className="acard" onClick={onClick}>
      <div className="ai" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}aa)` }}>
        <Icon name={icon} size={22} color="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <b>{titulo}</b>
        <div className="as">{sub}</div>
      </div>
      <ChevronRight size={18} color="var(--muted)" />
    </div>
  );
}
