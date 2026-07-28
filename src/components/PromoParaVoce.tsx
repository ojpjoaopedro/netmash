"use client";

/** Card promocional "Para você" com o banner de métricas no celular. */
export default function PromoParaVoce() {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <b style={{ fontSize: 16, marginBottom: 14 }}>Para você</b>

      {/* banner */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/banner-metricas.png" alt="Métricas no celular"
        style={{ width: "100%", borderRadius: 14, display: "block", objectFit: "cover" }} />

      <div style={{ marginTop: 16, flex: 1 }}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 6 }}>Métricas no celular</b>
        <p className="sub" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          Acompanhe todas as suas métricas na palma da mão. Analise e tome decisões de onde estiver.
        </p>
      </div>

      <button className="btn" style={{ marginTop: 16, alignSelf: "flex-start" }}>Quero no meu celular</button>
    </div>
  );
}
