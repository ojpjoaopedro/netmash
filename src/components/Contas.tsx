"use client";
import { useMemo, useState } from "react";
import { Lancamento, Tipo, marcarPago, delLancamento } from "@/lib/db";
import { brl, dataBR, diasAte } from "@/lib/format";
import LancamentoModal from "./LancamentoModal";

function statusVenc(l: Lancamento): { txt: string; cls: string } {
  const dias = diasAte(l.vencimento);
  if (dias === null) return { txt: "sem data", cls: "muted" };
  if (dias < 0) return { txt: `vencida há ${-dias}d`, cls: "red" };
  if (dias === 0) return { txt: "vence hoje", cls: "amber" };
  if (dias <= 5) return { txt: `em ${dias}d`, cls: "amber" };
  return { txt: dataBR(l.vencimento), cls: "muted" };
}

function Coluna({ titulo, tipo, itens, reload, onNova }: {
  titulo: string; tipo: Tipo; itens: Lancamento[]; reload: () => void; onNova: () => void;
}) {
  const total = itens.reduce((a, l) => a + l.valor, 0);
  const cor = tipo === "receita" ? "var(--green)" : "var(--red)";
  return (
    <div className="card">
      <div className="section-title" style={{ margin: "0 0 10px" }}>
        <h3 style={{ margin: 0 }}>{titulo}</h3>
        <button className="btn sm ghost" onClick={onNova}>+ Adicionar</button>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor, marginBottom: 12 }}>{brl(total)}</div>
      {itens.length === 0 ? (
        <div className="empty" style={{ padding: 24 }}>Nada em aberto aqui.</div>
      ) : (
        <table className="table">
          <tbody>
            {itens.sort((a, b) => ((a.vencimento || "9") < (b.vencimento || "9") ? -1 : 1)).map((l) => {
              const s = statusVenc(l);
              return (
                <tr key={l.id}>
                  <td>
                    <b>{l.descricao}</b>
                    <div style={{ marginTop: 3 }}>
                      <span className={`chip ${s.cls}`}>{s.txt}</span>
                      {l.contato && <span style={{ color: "var(--muted)", fontSize: 12.5, marginLeft: 8 }}>{l.contato}</span>}
                    </div>
                  </td>
                  <td className="num" style={{ color: cor }}>{brl(l.valor)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn sm green" onClick={async () => { await marcarPago(l.id, true); reload(); }}>
                      {tipo === "receita" ? "Recebi" : "Paguei"}
                    </button>{" "}
                    <button className="btn ghost sm" onClick={async () => { if (confirm("Excluir?")) { await delLancamento(l.id); reload(); } }}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Contas({ lancs, reload }: { lancs: Lancamento[]; reload: () => void }) {
  const [modal, setModal] = useState<null | Tipo>(null);
  const abertas = useMemo(() => lancs.filter((l) => !l.pago), [lancs]);
  const receber = abertas.filter((l) => l.tipo === "receita");
  const pagar = abertas.filter((l) => l.tipo === "despesa");

  const vencidas = abertas.filter((l) => (diasAte(l.vencimento) ?? 1) < 0);

  return (
    <>
      <div className="section-title">
        <h2>Contas a pagar e receber</h2>
      </div>

      {vencidas.length > 0 && (
        <div className="err" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ Você tem <b>{vencidas.length}</b> conta(s) vencida(s), somando <b>{brl(vencidas.reduce((a, l) => a + l.valor, 0))}</b>.
        </div>
      )}

      <div className="grid two">
        <Coluna titulo="📥 A receber" tipo="receita" itens={receber} reload={reload} onNova={() => setModal("receita")} />
        <Coluna titulo="📤 A pagar" tipo="despesa" itens={pagar} reload={reload} onNova={() => setModal("despesa")} />
      </div>

      {modal && (
        <LancamentoModal
          tipoInicial={modal}
          comoConta
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
    </>
  );
}
