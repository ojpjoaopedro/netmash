"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet, Info, Printer, User } from "lucide-react";
import { Empresa, Funcionario, getFuncionarios, updateFuncionario } from "@/lib/db";
import { brl } from "@/lib/format";
import { salvarEstadoRemoto } from "@/lib/estado-remoto";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Converte "1.234,56" / "1234.56" / "1234,56" em número. */
function parseNum(v: string): number {
  const s = (v || "").replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(s) || 0;
}
const num2 = (n: number) => (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** INSS progressivo (tabela 2025), com teto na última faixa. */
function calcINSS(bruto: number): number {
  const faixas: [number, number][] = [[1518, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]];
  let ant = 0, inss = 0;
  for (const [teto, aliq] of faixas) {
    if (bruto > ant) { inss += (Math.min(bruto, teto) - ant) * aliq; ant = teto; } else break;
  }
  return round2(inss);
}
/** IRRF mensal (tabela progressiva) sobre a base = bruto − INSS. */
function calcIRRF(bruto: number, inss: number): number {
  const base = bruto - inss;
  const t: [number, number, number][] = [
    [2259.20, 0, 0], [2826.65, 0.075, 169.44], [3751.05, 0.15, 381.44], [4664.68, 0.225, 662.77], [Infinity, 0.275, 896.00],
  ];
  for (const [teto, aliq, ded] of t) if (base <= teto) return Math.max(0, round2(base * aliq - ded));
  return 0;
}

type Config = { vtPct: number; fgtsPct: number };
const CONFIG_PADRAO: Config = { vtPct: 6, fgtsPct: 8 };
const chaveCfg = (id?: string | null) => `me_folha_config:${id || "default"}`;
function lerCfg(id?: string | null): Config {
  if (typeof window === "undefined") return { ...CONFIG_PADRAO };
  try { return { ...CONFIG_PADRAO, ...JSON.parse(localStorage.getItem(chaveCfg(id)) || "{}") }; } catch { return { ...CONFIG_PADRAO }; }
}
function salvarCfg(id: string | null | undefined, c: Config) {
  if (typeof window === "undefined") return;
  const cru = JSON.stringify(c); localStorage.setItem(chaveCfg(id), cru); salvarEstadoRemoto(chaveCfg(id), cru);
}

/** Campo de dinheiro editável no nosso padrão: clica, digita e salva ao sair. */
function CampoMoeda({ valor, onSalvar, alinhar = "right" }: { valor: number; onSalvar: (n: number) => void; alinhar?: "left" | "right" }) {
  return (
    <input defaultValue={valor ? num2(valor) : ""} placeholder="0,00" inputMode="decimal"
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.select(); }}
      onBlur={(e) => {
        e.currentTarget.style.background = "transparent";
        const n = round2(parseNum(e.target.value));
        e.target.value = n ? num2(n) : "";
        if (n !== valor) onSalvar(n);
      }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", textAlign: alinhar, transition: "background .12s" }} />
  );
}
/** Campo de texto editável (departamento). */
function CampoTexto({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => void }) {
  return (
    <input defaultValue={valor} placeholder="—"
      onFocus={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
      onBlur={(e) => { e.currentTarget.style.background = "transparent"; const v = e.target.value.trim(); if (v !== valor) onSalvar(v); }}
      style={{ border: 0, outline: "none", background: "transparent", padding: "3px 6px", borderRadius: 6, width: "100%", minWidth: 0, font: "inherit", color: "inherit", transition: "background .12s" }} />
  );
}

export default function FolhaPagamento({ empresa = null }: { empresa?: Empresa | null }) {
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [cfg, setCfg] = useState<Config>(() => lerCfg(empresa?.id));
  const [carregado, setCarregado] = useState(false);
  const carregar = () => getFuncionarios().then((f) => { setFuncs(f); setCarregado(true); }).catch(() => setCarregado(true));
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { setCfg(lerCfg(empresa?.id)); }, [empresa?.id]);

  const upCfg = (p: Partial<Config>) => setCfg((c) => { const n = { ...c, ...p }; salvarCfg(empresa?.id, n); return n; });

  async function salvarSalario(id: string, salario: number) { await updateFuncionario(id, { salario }); carregar(); }
  async function salvarDepto(id: string, departamento: string) { await updateFuncionario(id, { departamento: departamento || null }); carregar(); }

  const ativos = funcs.filter((f) => f.ativo);
  const linhas = useMemo(() => ativos.map((f) => {
    const bruto = f.salario || 0;
    const vt = round2(bruto * (cfg.vtPct / 100));
    const inss = calcINSS(bruto);
    const irrf = calcIRRF(bruto, inss);
    const totalDesc = round2(vt + inss + irrf);
    const liquido = round2(bruto - totalDesc);
    const provisao = round2(bruto / 12 + (bruto + bruto / 3) / 12); // 13º + férias (1/3)
    const fgts = round2(bruto * (cfg.fgtsPct / 100));
    return { f, bruto, vt, inss, irrf, totalDesc, liquido, provisao, fgts };
  }), [ativos, cfg]);

  const tot = linhas.reduce((a, l) => ({
    bruto: a.bruto + l.bruto, vt: a.vt + l.vt, inss: a.inss + l.inss, irrf: a.irrf + l.irrf,
    totalDesc: a.totalDesc + l.totalDesc, liquido: a.liquido + l.liquido, provisao: a.provisao + l.provisao, fgts: a.fgts + l.fgts,
  }), { bruto: 0, vt: 0, inss: 0, irrf: 0, totalDesc: 0, liquido: 0, provisao: 0, fgts: 0 });

  const custoTotal = round2(tot.bruto + tot.provisao + tot.fgts);
  const iniciais = (n: string) => n.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  const areaRef = useRef<HTMLDivElement>(null);
  const imprimir = () => window.print();

  return (
    <div>
      {/* cabeçalho + config */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--brand)18", color: "var(--brand)" }}><Wallet size={19} /></span>
          <h2 style={{ margin: 0, fontSize: 19 }}>Folha de pagamento</h2>
        </div>
        <button className="btn ghost sm no-print" onClick={imprimir} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={15} /> Imprimir / PDF</button>
      </div>

      {/* dica + parâmetros editáveis (Vale transporte / FGTS) */}
      <div className="card no-print" style={{ padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 220 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)", flexShrink: 0 }}><Info size={16} /></span>
          <p className="sub" style={{ margin: 0, lineHeight: 1.55, fontSize: 12.5 }}>
            Preencha o <b>salário bruto</b> de cada pessoa (o resto é calculado sozinho): <b>INSS</b> e <b>IRRF</b> pelas tabelas oficiais, <b>vale transporte</b>, <b>FGTS</b> e a provisão de <b>13º + férias</b>. A equipe vem do cadastro em <b>Configurações › Equipe</b>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label className="field" style={{ margin: 0 }}>
            <span className="f">Vale transporte (%)</span>
            <input type="number" min={0} max={6} step={0.5} value={cfg.vtPct} onChange={(e) => upCfg({ vtPct: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })} style={{ width: 90 }} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="f">FGTS (%)</span>
            <input type="number" min={0} max={20} step={0.5} value={cfg.fgtsPct} onChange={(e) => upCfg({ fgtsPct: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 90 }} />
          </label>
        </div>
      </div>

      {/* tabela da folha */}
      <div ref={areaRef} style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 14px 36px -26px rgba(0,0,0,.45)" }}>
        <table className="eq-tab" style={{ width: "100%", borderCollapse: "collapse", minWidth: 1160 }}>
          <thead>
            <tr>
              <th className="eq-th">Nome</th>
              <th className="eq-th">Departamento</th>
              <th className="eq-th" style={{ textAlign: "right" }}>Salário bruto</th>
              <th className="eq-th" style={{ textAlign: "right" }}>Vale transporte</th>
              <th className="eq-th" style={{ textAlign: "right" }}>INSS</th>
              <th className="eq-th" style={{ textAlign: "right" }}>IRRF</th>
              <th className="eq-th" style={{ textAlign: "right" }}>Total descontos</th>
              <th className="eq-th" style={{ textAlign: "right" }}>Salário líquido</th>
              <th className="eq-th" style={{ textAlign: "right" }}>13º + Férias</th>
              <th className="eq-th" style={{ textAlign: "right" }}>FGTS</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ f, bruto, vt, inss, irrf, totalDesc, liquido, provisao, fgts }) => (
              <tr key={f.id} className="eq-row">
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--brand) 16%, transparent)", color: "var(--brand)", fontWeight: 800, fontSize: 11 }}>{iniciais(f.nome) || <User size={15} />}</span>
                    <b style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome || "—"}</b>
                  </div>
                </td>
                <td><CampoTexto valor={f.departamento || f.cargo || ""} onSalvar={(v) => salvarDepto(f.id, v)} /></td>
                <td style={{ fontWeight: 700 }}><CampoMoeda valor={bruto} onSalvar={(n) => salvarSalario(f.id, n)} /></td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(vt)}</td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(inss)}</td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(irrf)}</td>
                <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{brl(totalDesc)}</td>
                <td style={{ textAlign: "right", color: "#10B981", fontWeight: 800 }}>{brl(liquido)}</td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(provisao)}</td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{brl(fgts)}</td>
              </tr>
            ))}
            {carregado && linhas.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 26, color: "var(--muted)" }}>Nenhuma pessoa ativa na equipe. Cadastre em <b>Configurações › Equipe</b>.</td></tr>
            )}
          </tbody>
          {linhas.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800 }}>
                <td style={{ padding: "12px 10px" }}>Total ({linhas.length})</td>
                <td />
                <td style={{ textAlign: "right", padding: "12px 10px" }}>{brl(tot.bruto)}</td>
                <td style={{ textAlign: "right" }}>{brl(tot.vt)}</td>
                <td style={{ textAlign: "right" }}>{brl(tot.inss)}</td>
                <td style={{ textAlign: "right" }}>{brl(tot.irrf)}</td>
                <td style={{ textAlign: "right", color: "#EF4444" }}>{brl(tot.totalDesc)}</td>
                <td style={{ textAlign: "right", color: "#10B981" }}>{brl(tot.liquido)}</td>
                <td style={{ textAlign: "right" }}>{brl(tot.provisao)}</td>
                <td style={{ textAlign: "right" }}>{brl(tot.fgts)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* resumo do custo total (empresa) */}
      {linhas.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {[
            { t: "Salários (bruto)", v: tot.bruto, cor: "var(--txt)" },
            { t: "Líquido a pagar", v: tot.liquido, cor: "#10B981" },
            { t: "Encargos (FGTS + provisões)", v: round2(tot.fgts + tot.provisao), cor: "var(--brand)" },
            { t: "Custo total da folha", v: custoTotal, cor: "var(--brand)" },
          ].map((c) => (
            <div key={c.t} className="card" style={{ flex: "1 1 200px", padding: 16 }}>
              <div className="sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{c.t}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: c.cor }}>{brl(c.v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
