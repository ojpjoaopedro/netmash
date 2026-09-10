"use client";
/**
 * Análise de Tráfego Pago (admin/superadmin), espelhando o Hub da Dynamis.
 * Abas: Funil (mês + semanas), Gestão à Vista (galeria de criativos, Etapa 2),
 * Resultados (tabela por semana/campanha), Análise (mês a mês). Dados no Supabase
 * (tabela trafego_resultados via /api/marketing/trafego), com Puxar da Meta por
 * semana. Configurações (pixel, token/conta da Meta, meta de CPL, imposto) em app_kv.
 */
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Settings2, Download, RefreshCw, Save, Check, Image as ImageIcon } from "lucide-react";
import { authHeaders, CARD, INP } from "./trafego/shared";
import { MESES, mesLabel, type Resultado } from "@/lib/trafego";
import Funil from "./trafego/Funil";
import Resultados from "./trafego/Resultados";
import Analise from "./trafego/Analise";

type Config = { metaAdAccount: string; metaToken: string; metaCpl: string; imposto: string; pixelId: string; metasLeads: Record<string, number> };
type Aba = "funil" | "gestao" | "resultados" | "analise";
const ABAS: { k: Aba; label: string }[] = [
  { k: "funil", label: "Funil" }, { k: "gestao", label: "Gestão à Vista" },
  { k: "resultados", label: "Resultados" }, { k: "analise", label: "Análise" },
];
const cfgVazia: Config = { metaAdAccount: "", metaToken: "", metaCpl: "", imposto: "13.83", pixelId: "", metasLeads: {} };

export default function AnaliseTrafego() {
  const [rows, setRows] = useState<Resultado[]>([]);
  const [config, setConfig] = useState<Config>(cfgVazia);
  const [aba, setAba] = useState<Aba>("funil");
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [ano, setAno] = useState(hoje.getFullYear() < 2026 ? 2026 : hoje.getFullYear());
  const [carregando, setCarregando] = useState(true);
  const [puxando, setPuxando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [abrirConfig, setAbrirConfig] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; txt: string } | null>(null);
  const flash = (tipo: "ok" | "erro", txt: string) => { setMsg({ tipo, txt }); setTimeout(() => setMsg(null), 5000); };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { headers: await authHeaders() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao carregar.");
      setRows(j.rows || []);
      setConfig({ ...cfgVazia, ...j.config });
    } catch (e) { flash("erro", (e as Error).message); } finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const puxarMeta = async () => {
    setPuxando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "sync-meta", mes, mesInteiro: true }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao puxar da Meta.");
      await carregar();
      flash("ok", `${mesLabel(mes)}: ${j.campanhas} campanhas em ${j.semanas} semanas.${j.avisos?.length ? " Avisos: " + j.avisos.join(" · ") : ""}`);
    } catch (e) { flash("erro", (e as Error).message); } finally { setPuxando(false); }
  };

  const salvarConfig = async () => {
    setSalvando(true);
    try {
      const r = await fetch("/api/marketing/trafego", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "salvar-config", config }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao salvar.");
      flash("ok", "Configurações salvas.");
    } catch (e) { flash("erro", (e as Error).message); } finally { setSalvando(false); }
  };
  const setC = (k: keyof Config, v: string) => setConfig((c) => ({ ...c, [k]: v }));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1AADE2,#0e7ba6)", color: "#fff", flexShrink: 0 }}><Megaphone size={22} /></span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tráfego Pago</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "2px 0 0" }}>Funil, resultados por semana e análise mês a mês.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={puxarMeta} disabled={puxando} style={{ cursor: "pointer", border: "1px solid #1877F2", borderRadius: 10, padding: "9px 16px", fontWeight: 700, color: "#fff", background: "#1877F2", display: "inline-flex", alignItems: "center", gap: 7 }}>{puxando ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}{puxando ? "Puxando..." : "Puxar da Meta"}</button>
          <button onClick={() => setAbrirConfig((v) => !v)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--txt)", borderRadius: 10, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}><Settings2 size={15} /> Configurações</button>
        </div>
      </div>

      {/* Seletor de mês */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[2026, 2027].map((y) => (
          <button key={y} onClick={() => { setAno(y); setMes(`${y}-${mes.slice(5)}`); }} style={{ cursor: "pointer", border: 0, borderRadius: 8, padding: "6px 13px", fontSize: 13, fontWeight: 800, background: ano === y ? "#1AADE2" : "var(--bg-2)", color: ano === y ? "#fff" : "var(--muted)" }}>{y}</button>
        ))}
        <span style={{ width: 1, height: 20, background: "var(--line)" }} />
        {MESES.map((m, i) => {
          const chave = `${ano}-${String(i + 1).padStart(2, "0")}`;
          return <button key={m} onClick={() => setMes(chave)} style={{ cursor: "pointer", border: 0, borderRadius: 8, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, background: mes === chave ? "#1AADE2" : "var(--bg-2)", color: mes === chave ? "#fff" : "var(--muted)" }}>{m}</button>;
        })}
      </div>

      {msg && <div style={{ background: "var(--bg-2)", border: `1px solid ${msg.tipo === "ok" ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.4)"}`, borderRadius: 12, padding: 14, color: msg.tipo === "ok" ? "#10B981" : "#EF4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Check size={16} />{msg.txt}</div>}

      {/* Configurações */}
      {abrirConfig && (
        <div style={{ ...CARD, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Settings2 size={16} color="#1AADE2" /><b style={{ fontSize: 15 }}>Configurações</b></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label><div style={cfgLbl}>ID do Pixel da Meta</div><input value={config.pixelId} onChange={(e) => setC("pixelId", e.target.value)} placeholder="Ex.: 574774374290188" style={INP} /></label>
            <label><div style={cfgLbl}>ID da conta de anúncios</div><input value={config.metaAdAccount} onChange={(e) => setC("metaAdAccount", e.target.value)} placeholder="Ex.: 1234567890" style={INP} /></label>
            <label><div style={cfgLbl}>Meta de CPL (R$)</div><input value={config.metaCpl} onChange={(e) => setC("metaCpl", e.target.value)} placeholder="Ex.: 5,00" style={INP} /></label>
            <label><div style={cfgLbl}>Imposto sobre o tráfego (%)</div><input value={config.imposto} onChange={(e) => setC("imposto", e.target.value)} placeholder="13,83" style={INP} /></label>
          </div>
          <label><div style={cfgLbl}>Token de acesso da Meta (Graph API)</div><input value={config.metaToken} onChange={(e) => setC("metaToken", e.target.value)} placeholder="Cole o token da conta de anúncios (fica só no servidor)" style={INP} type="password" /></label>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Token e conta são usados só pelo servidor pra puxar da Meta. O ID do Pixel carrega automaticamente nas páginas de venda (site, /app, /vendas, /assinar, /obrigado).</p>
          <div><button onClick={salvarConfig} disabled={salvando} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "11px 22px", fontWeight: 700, color: "#fff", background: "#1AADE2", display: "inline-flex", alignItems: "center", gap: 8 }}><Save size={16} />{salvando ? "Salvando..." : "Salvar configurações"}</button></div>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
        {ABAS.map((a) => (
          <button key={a.k} onClick={() => setAba(a.k)} style={{ cursor: "pointer", background: "transparent", border: 0, borderBottom: `2px solid ${aba === a.k ? "#1AADE2" : "transparent"}`, color: aba === a.k ? "var(--txt)" : "var(--muted)", fontWeight: 700, fontSize: 14, padding: "10px 16px", marginBottom: -1 }}>{a.label}</button>
        ))}
      </div>

      {carregando ? (
        <div style={{ ...CARD, textAlign: "center", padding: 40, color: "var(--muted)" }}>Carregando...</div>
      ) : (
        <>
          {aba === "funil" && <Funil rows={rows} mes={mes} />}
          {aba === "resultados" && <Resultados rows={rows} mes={mes} metasLeads={config.metasLeads} reload={carregar} />}
          {aba === "analise" && <Analise rows={rows} imposto={config.imposto} metaCpl={config.metaCpl} mesAtual={mes} />}
          {aba === "gestao" && (
            <div style={{ ...CARD, textAlign: "center", padding: 48, color: "var(--muted)" }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, display: "inline-grid", placeItems: "center", background: "var(--bg-2)", color: "#1AADE2", marginBottom: 14 }}><ImageIcon size={26} /></span>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--txt)" }}>Galeria de criativos</div>
              <p style={{ fontSize: 14, maxWidth: 460, margin: "8px auto 0" }}>Cada anúncio como um card com imagem/vídeo, a copy e o resultado, com ranking do mês. Estou construindo essa parte (Etapa 2).</p>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}
const cfgLbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 5 };
