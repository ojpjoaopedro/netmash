"use client";
import React from "react";

// Card de atalho da Home (Calendário / Painel financeiro). MESMO componente no
// web e no celular, pra ficar sempre padronizado. Estilo escuro com o ícone
// "brilhando" numa cor FIXA (não muda com a marca da empresa).
export default function CardAtalho({ label, Icon, cor, onClick }: {
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  cor: string;
  onClick: () => void;
}) {
  return (
    <button className="card-atalho" style={{ ["--cor" as string]: cor } as React.CSSProperties} onClick={onClick}>
      <span className="card-atalho-ico"><Icon size={30} /></span>
      <b>{label}</b>
    </button>
  );
}
