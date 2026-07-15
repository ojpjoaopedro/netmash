'use client';

/**
 * Moldura comum dos 3 exercícios: identificação do aluno, navegação entre os
 * pilares, salvar e baixar PDF.
 *
 * O PDF usa a impressão nativa do navegador (window.print) em vez de uma lib:
 * "Salvar como PDF" já existe no diálogo de impressão, e assim não entra
 * dependência nova no projeto. O CSS de impressão está em print.css.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Download, GitCompareArrows, LayoutGrid, Rocket, Save, Plus, Trash2 } from 'lucide-react';
import type { Treino } from './store';

export const PILARES = [
  { n: 1, href: '/treino-mba01', titulo: 'To be / As is', icon: GitCompareArrows, cor: '#10B981' },
  { n: 2, href: '/treino-mba01/swot', titulo: 'SWOT', icon: LayoutGrid, cor: '#3B82F6' },
  { n: 3, href: '/treino-mba01/motivadores', titulo: 'Motivadores Estratégicos', icon: Rocket, cor: '#8B5CF6' },
];

/* ── Cabeçalho fixo: quem é o aluno + ações ─────────────────────────────── */
export function Topo({
  dados, alterar, salvar, sujo, salvoEm,
}: {
  dados: Treino;
  alterar: (m: Partial<Treino>) => void;
  salvar: () => boolean;
  sujo: boolean;
  salvoEm: string | null;
}) {
  const caminho = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 print:static print:border-0">
      <div className="mx-auto max-w-[1180px] px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* identificação */}
          <div className="flex items-center gap-2.5">
            <input
              value={dados.nome}
              onChange={(e) => alterar({ nome: e.target.value })}
              placeholder="Seu nome"
              className="w-[190px] px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-400 print:border-0 print:px-0 print:w-auto"
            />
            <span className="text-slate-300 print:hidden">·</span>
            <input
              value={dados.empresa}
              onChange={(e) => alterar({ empresa: e.target.value })}
              placeholder="Sua empresa"
              className="w-[210px] px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 print:border-0 print:px-0 print:w-auto"
            />
          </div>

          {/* ações */}
          <div className="flex items-center gap-2 print:hidden">
            {salvoEm && !sujo && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <Check className="w-3.5 h-3.5" /> salvo {salvoEm}
              </span>
            )}
            {sujo && <span className="text-[11px] text-amber-600 font-medium">alterações não salvas</span>}
            <button
              onClick={() => salvar()}
              className="flex items-center gap-1.5 text-xs font-bold text-white rounded-lg px-3.5 py-2 transition-all hover:brightness-110"
              style={{ background: '#10B981' }}
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3.5 py-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
          </div>
        </div>

        {/* navegação entre os pilares */}
        <nav className="flex items-center gap-1.5 mt-3 print:hidden">
          {PILARES.map((p) => {
            const ativo = caminho === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors border"
                style={
                  ativo
                    ? { background: `${p.cor}14`, borderColor: `${p.cor}55`, color: p.cor }
                    : { background: 'transparent', borderColor: 'transparent', color: '#64748B' }
                }
              >
                <p.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{p.n}. {p.titulo}</span>
                <span className="sm:hidden">{p.n}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/* ── Faixa do pilar ──────────────────────────────────────────────────────── */
export function FaixaPilar({ n, titulo, desc, icon: Icone, cor }: {
  n: number; titulo: string; desc: string;
  icon: React.ComponentType<{ className?: string }>; cor: string;
}) {
  return (
    <div className="rounded-2xl px-6 py-5 mb-7 flex items-center gap-4" style={{ background: `${cor}0f` }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: cor }}>
        <Icone className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: cor }}>Pilar {n} de 3</p>
        <h1 className="text-2xl font-black text-slate-900 leading-tight">{titulo}</h1>
        <p className="text-[13px] text-slate-500 italic mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ── Lista editável genérica (usada na SWOT e nos Motivadores) ───────────── */
export function ListaEditavel({
  itens, onChange, placeholder, cor,
}: {
  itens: string[];
  onChange: (novos: string[]) => void;
  placeholder: string;
  cor: string;
}) {
  const editar = (i: number, v: string) => onChange(itens.map((x, j) => (j === i ? v : x)));
  const remover = (i: number) => onChange(itens.filter((_, j) => j !== i));
  const adicionar = () => onChange([...itens, '']);

  return (
    <div className="space-y-2">
      {itens.map((item, i) => (
        <div key={i} className="group flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cor }} />
          <input
            value={item}
            onChange={(e) => editar(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 placeholder:italic focus:outline-none focus:bg-white focus:border-slate-400 print:border-0 print:bg-transparent print:px-0"
          />
          <button
            onClick={() => remover(i)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all print:hidden"
            aria-label="remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {itens.length === 0 && (
        <p className="text-[12px] text-slate-400 italic py-2 print:hidden">Nenhum item ainda.</p>
      )}
      <button
        onClick={adicionar}
        className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors print:hidden hover:bg-slate-100"
        style={{ color: cor }}
      >
        <Plus className="w-3.5 h-3.5" /> adicionar
      </button>
    </div>
  );
}

/* ── Aviso de onde os dados moram ───────────────────────────────────────── */
export function AvisoLocal() {
  return (
    <p className="text-[11px] text-slate-400 text-center mt-10 print:hidden">
      Seu exercício fica salvo <strong className="text-slate-500">neste navegador</strong> — não enviamos
      nada para nenhum servidor. Para levar embora, use <strong className="text-slate-500">Baixar PDF</strong>.
    </p>
  );
}
