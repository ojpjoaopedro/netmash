'use client';

/**
 * Entrada do treino: a pessoa põe o nome da empresa e ganha o link dela.
 *
 * Só o nome da empresa — é uma aula, não um cadastro. O nome da pessoa e o
 * exercício vêm depois, já dentro do link. Sem senha: quem tem o link, edita.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompareArrows, ArrowRight, Loader2 } from 'lucide-react';

export default function CadastroTreinoPage() {
  const router = useRouter();
  const [empresa, setEmpresa] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const r = await fetch('/api/treino-mba01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa: empresa.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.slug) {
        setErro(j.erro || 'Não deu para criar agora. Tente de novo.');
        setEnviando(false);
        return;
      }
      // não solta o "enviando": a navegação já está a caminho
      router.push(`/treino-mba01/${j.slug}`);
    } catch {
      setErro('Sem conexão. Verifique a internet e tente de novo.');
      setEnviando(false);
    }
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
            <h1 className="text-xl font-black tracking-tight text-slate-800">Plano comercial da sua empresa</h1>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
            Escreva o nome da sua empresa. Vamos criar um <strong className="text-slate-800">link só seu</strong>,
            onde o exercício fica salvo — dá para fechar, trocar de aparelho e voltar depois.
          </p>

          <form onSubmit={cadastrar}>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome da empresa
            </label>
            <input
              value={empresa}
              onChange={(e) => { setEmpresa(e.target.value); setErro(''); }}
              placeholder="Ex: Padaria do João"
              maxLength={80}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />

            {erro && <p className="mt-3 text-[13px] font-medium text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={!empresa.trim() || enviando}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: '#10B981' }}
            >
              {enviando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</>
                : <>Criar meu exercício <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
          Já começou antes? É só abrir o <strong className="text-slate-500">link da sua empresa</strong> de novo —
          ele continua de onde parou.
        </p>
      </div>
    </div>
  );
}
