'use client';

/**
 * Página PÚBLICA de votação — é o link que o professor manda para a turma.
 * Feita para o celular: pergunta grande, dois botões, e pronto.
 *
 * O aluno NUNCA vê o placar (senão o último a votar seguiria a maioria).
 * O resultado só aparece na tela do professor, no slide 3 de /mbaaula01.
 *
 * Precisa estar em PUBLIC_PATHS no middleware.ts.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

const NAVY = '#0A1A2E';
const BLUE = '#1AADE2';
const GOLD = '#C48A57';

type Estado = 'perguntando' | 'enviando' | 'votou' | 'erro';

export default function VotarMba01() {
  const [estado, setEstado] = useState<Estado>('perguntando');
  const [meuVoto, setMeuVoto] = useState<'sim' | 'nao' | null>(null);

  async function votar(voto: 'sim' | 'nao') {
    setEstado('enviando');
    setMeuVoto(voto);
    try {
      const r = await fetch('/api/quiz-mba01/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voto }),
      });
      if (!r.ok) throw new Error('falhou');
      setEstado('votou');
    } catch {
      setEstado('erro');
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 py-10" style={{ backgroundColor: NAVY }}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_25%,rgba(26,173,226,0.12),transparent_60%)]" />

      <div className="relative w-full max-w-[440px]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-center mb-8" style={{ color: GOLD }}>
          Planejamento Comercial
        </p>

        <AnimatePresence mode="wait">
          {estado !== 'votou' ? (
            <motion.div key="pergunta" exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <h1 className="text-2xl sm:text-3xl font-black leading-snug text-white text-center">
                Sua empresa tem uma meta de vendas.
              </h1>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black leading-snug text-center" style={{ color: BLUE }}>
                Mas existe um plano capaz de explicar como ela será atingida?
              </h2>

              <div className="mt-12 grid grid-cols-2 gap-4">
                {(['sim', 'nao'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => votar(v)}
                    disabled={estado === 'enviando'}
                    className="relative py-6 rounded-2xl border-2 text-xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      borderColor: v === 'sim' ? `${BLUE}66` : `${GOLD}66`,
                      color: v === 'sim' ? BLUE : GOLD,
                      background: v === 'sim' ? 'rgba(26,173,226,0.08)' : 'rgba(196,138,87,0.08)',
                    }}
                  >
                    {estado === 'enviando' && meuVoto === v ? (
                      <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                    ) : (
                      v === 'sim' ? 'Sim' : 'Não'
                    )}
                  </button>
                ))}
              </div>

              {estado === 'erro' && (
                <p className="mt-6 text-center text-sm text-red-400">
                  Não deu para registrar. Toque de novo.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="obrigado"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="text-center"
            >
              <div
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto"
                style={{ borderColor: BLUE, background: 'rgba(26,173,226,0.12)' }}
              >
                <Check className="w-9 h-9" style={{ color: BLUE }} />
              </div>
              <p className="mt-6 text-2xl font-black text-white">Voto registrado</p>
              <p className="mt-2 text-lg font-bold" style={{ color: meuVoto === 'sim' ? BLUE : GOLD }}>
                {meuVoto === 'sim' ? 'Sim' : 'Não'}
              </p>
              <p className="mt-6 text-sm text-slate-400">Agora olhe para a tela.</p>

              <button
                onClick={() => { setEstado('perguntando'); setMeuVoto(null); }}
                className="mt-10 text-[11px] uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
              >
                votar de novo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
