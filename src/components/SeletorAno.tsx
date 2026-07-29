"use client";

const ANOS = [2026, 2027, 2028];

/** Dropdown de ano reutilizável. `escuro` para painéis de fundo escuro. */
export default function SeletorAno({ ano, setAno, escuro }: { ano: number; setAno: (a: number) => void; escuro?: boolean }) {
  return (
    <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano"
      style={{
        width: "auto", padding: "6px 10px", borderRadius: 9, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
        ...(escuro
          ? { background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }
          : { background: "var(--card)", color: "var(--txt)", border: "1px solid var(--line-2)" }),
      }}>
      {ANOS.map((a) => <option key={a} value={a} style={{ color: "#111" }}>{a}</option>)}
    </select>
  );
}
