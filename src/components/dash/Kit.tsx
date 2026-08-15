"use client";
import {
  DollarSign, Activity, TrendingDown, TrendingUp, Wallet, Percent, BarChart3,
  Users, Smile, UserMinus, ShoppingCart, Share2, UserPlus, Zap, Award, Target,
  Calendar, Megaphone, Globe, Sparkles, Scale, PiggyBank, ShieldCheck, Building2, HeartPulse, Link2, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  DollarSign, Activity, TrendingDown, TrendingUp, Wallet, Percent, BarChart3,
  Users, Smile, UserMinus, ShoppingCart, Share2, UserPlus, Zap, Award, Target,
  Calendar, Megaphone, Globe, Sparkles, Scale, PiggyBank, ShieldCheck, Building2, HeartPulse, Link2,
};

export function Icon({ name, ...p }: { name: string; size?: number; color?: string; className?: string }) {
  const C = ICONS[name] || BarChart3;
  return <C size={p.size ?? 20} color={p.color} className={p.className} />;
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
