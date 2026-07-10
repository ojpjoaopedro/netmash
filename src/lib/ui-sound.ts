"use client";
// Sons de interface (Web Audio — sem arquivos). Clique suave na navegação e
// um "chime" ao salvar. Pode ser ligado/desligado (fica salvo no navegador).

let ctx: AudioContext | null = null;
let ligado = true;
if (typeof window !== "undefined") ligado = localStorage.getItem("me_som") !== "0";

export function somLigado(): boolean { return ligado; }
export function setSom(v: boolean): void {
  ligado = v;
  if (typeof window !== "undefined") localStorage.setItem("me_som", v ? "1" : "0");
  if (v) playTick(560); // feedback ao ligar
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    return ctx;
  } catch { return null; }
}

/** Bip curto e suave (sine). */
export function playTick(freq = 520, vol = 0.05): void {
  if (!ligado) return;
  const a = ac();
  if (!a) return;
  try {
    if (a.state === "suspended") a.resume();
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, a.currentTime + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.12);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.13);
  } catch { /* ignora */ }
}

/** Duas notas ascendentes — sucesso ao salvar. */
export function playSuccess(): void {
  playTick(660, 0.06);
  setTimeout(() => playTick(880, 0.06), 90);
}
