"use client";
import { useCallback, useEffect, useState } from "react";
import { ShoppingBag, DollarSign, Users, RotateCcw } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type Venda = { id: string; email: string | null; nome: string | null; valor: number; modo: string | null; status: string; criado_em: string; produto: string };
type Totais = { recebido: number; vendas: number; reembolsos: number; clientes: number };

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBR(s: string) { try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return s; } }

export default function AdminVendas() {
  const [vendas, setVendas] = useState<Venda[] | null>(supabaseReady ? null : []);
  const [totais, setTotais] = useState<Totais>({ recebido: 0, vendas: 0, reembolsos: 0, clientes: 0 });

  const carregar = useCallback(async () => {
    if (!supabaseReady || !supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/vendas-admin", { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setVendas(j.vendas ?? []); setTotais(j.totais ?? { recebido: 0, vendas: 0, reembolsos: 0, clientes: 0 }); }
    else setVendas([]);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (!supabaseReady) return <p className="adm-sub">Conecte o Supabase para ver as vendas.</p>;

  const KPIS = [
    { ico: <DollarSign size={20} />, bg: "rgba(16,185,129,.16)", cor: "#10B981", valor: brl(totais.recebido), label: "Recebido (vendas pagas)" },
    { ico: <ShoppingBag size={20} />, bg: "rgba(26,173,226,.16)", cor: "#1AADE2", valor: String(totais.vendas), label: "Vendas" },
    { ico: <Users size={20} />, bg: "rgba(139,92,246,.16)", cor: "#8b5cf6", valor: String(totais.clientes), label: "Clientes" },
    { ico: <RotateCcw size={20} />, bg: "rgba(239,68,68,.16)", cor: "#EF4444", valor: String(totais.reembolsos), label: "Reembolsos" },
  ];

  return (
    <div>
      <h1 style={{ margin: "0 0 4px" }}>Vendas</h1>
      <p className="adm-sub" style={{ margin: "0 0 18px" }}>Cada pagamento aprovado no checkout aparece aqui automaticamente.</p>

      <div className="adm-kpis">
        {KPIS.map((k, i) => (
          <div key={i} className="adm-card"><span className="adm-ico" style={{ background: k.bg, color: k.cor }}>{k.ico}</span><div><b>{k.valor}</b><small>{k.label}</small></div></div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        {vendas === null ? <p className="adm-sub">Carregando…</p>
          : vendas.length === 0 ? (
            <div className="adm-acbox" style={{ textAlign: "center", padding: "40px 20px" }}>
              <ShoppingBag size={30} style={{ opacity: .4 }} />
              <p className="adm-sub" style={{ marginTop: 10 }}>Nenhuma venda ainda. Quando alguém comprar pelo checkout, aparece aqui.</p>
            </div>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody>
                  {vendas.map((v) => (
                    <tr key={v.id}>
                      <td>{dataBR(v.criado_em)}</td>
                      <td><b>{v.nome || "—"}</b><br /><span className="adm-sub">{v.email}</span></td>
                      <td>{v.produto}</td>
                      <td>{v.modo === "subscription" ? "Assinatura" : "Único"}</td>
                      <td><b>{brl(v.valor)}</b></td>
                      <td>
                        {v.status === "pago" ? <span className="adm-badge ativo">Pago</span>
                          : v.status === "reembolsado" ? <span className="adm-badge cortado">Reembolsado</span>
                          : <span className="adm-badge cortado">{v.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
