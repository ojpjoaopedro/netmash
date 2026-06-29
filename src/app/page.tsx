export default function EmConstrucao() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "#0b0f14",
        color: "#e7ecf2",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: 56, lineHeight: 1 }}>🚧</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        EM CONSTRUÇÃO
      </h1>
      <p style={{ fontSize: 16, color: "#9aa6b2", maxWidth: 420, margin: 0 }}>
        Estamos preparando algo novo por aqui. Volte em breve.
      </p>
    </div>
  );
}
