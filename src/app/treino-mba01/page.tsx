'use client';

/**
 * Entrada do treino: a pessoa põe o nome da empresa e ganha o link dela.
 *
 * Entre o cadastro e o exercício entra um aviso que ela precisa ler: o
 * simulador NÃO guarda nada em servidor, então quem fecha sem baixar o PDF
 * perde o trabalho. É melhor frustrar aqui, em 5 segundos, do que no fim da
 * aula depois de meia hora preenchendo.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompareArrows, ArrowRight, AlertTriangle, Download } from 'lucide-react';
import { paraSlug } from './slug';

export default function CadastroTreinoPage() {
  const router = useRouter();
  const [empresa, setEmpresa] = useState('');
  const [erro, setErro] = useState('');
  const [avisando, setAvisando] = useState(false);

  const slug = paraSlug(empresa);

  function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa.trim()) return;
    if (!slug) { setErro('Esse nome não gera um link válido. Use letras ou números.'); return; }
    setErro('');
    setAvisando(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-5 py-12">
      <div className="w-full max-w-[460px]">
        <div className="flex items-center gap-2.5 mb-7">
          <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0 text-white" style={{ background: '#10B981' }}>
            <GitCompareArrows className="w-5 h-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Aula de MBA</p>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Simulador</h1>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
            Escreva o nome da sua empresa para começar o exercício.
          </p>

          <form onSubmit={cadastrar}>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome da empresa
            </label>
            <input
              value={empresa}
              onChange={(e) => { setEmpresa(e.target.value); setErro(''); }}
              maxLength={80}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />

            {erro && <p className="mt-3 text-[13px] font-medium text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={!empresa.trim()}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: '#10B981' }}
            >
              Criar meu exercício <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {avisando && <AvisoSemSalvar onEntrar={() => router.push(`/treino-mba01/${slug}`)} />}
    </div>
  );
}

/* ── O recado que evita a frustração no fim da aula ──────────────────────── */

function AvisoSemSalvar({ onEntrar }: { onEntrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-5">
      {/* sem fechar no clique de fora e sem "cancelar": este aviso é para ser lido */}
      <div className="w-full max-w-[480px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-7">
        <span className="grid place-items-center w-14 h-14 rounded-2xl mx-auto mb-5 bg-amber-50 text-amber-500">
          <AlertTriangle className="w-7 h-7" />
        </span>

        <h2 className="text-center text-[22px] font-black leading-tight text-slate-800 mb-3">
          Este simulador <span className="text-amber-600">não salva</span> os seus dados
        </h2>

        <p className="text-center text-[14px] text-slate-600 leading-relaxed mb-5">
          Ao final, clique em <strong className="text-slate-800">Baixar PDF</strong> para ter o seu plano
          guardado. É a única forma de levar o trabalho embora.
        </p>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-6">
          <Download className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-[12.5px] text-amber-900 leading-relaxed">
            Se fechar a aba, limpar o navegador ou trocar de aparelho <strong>sem baixar o PDF</strong>,
            você perde o que preencheu.
          </p>
        </div>

        <button
          onClick={onEntrar}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-black text-white transition-all hover:brightness-110"
          style={{ background: '#10B981' }}
        >
          Entendi — começar o exercício
        </button>
      </div>
    </div>
  );
}
