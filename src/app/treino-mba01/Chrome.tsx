'use client';

/**
 * Moldura comum dos 3 exercícios: identificação do aluno, navegação entre os
 * pilares, salvar e baixar PDF.
 *
 * O PDF usa a impressão nativa do navegador (window.print) em vez de uma lib:
 * "Salvar como PDF" já existe no diálogo de impressão, e assim não entra
 * dependência nova no projeto. O CSS de impressão está em print.css.
 */

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Download, GitCompareArrows, LayoutGrid, Rocket, Save, Plus, Trash2, Network, ListChecks, AlertTriangle } from 'lucide-react';
import type { Treino } from './store';

/** `sufixo` é o que vem depois do link da empresa: /treino-mba01/<slug><sufixo>. */
export const PILARES = [
  { n: 1, sufixo: '', titulo: 'To be / As is', icon: GitCompareArrows, cor: '#10B981' },
  { n: 2, sufixo: '/swot', titulo: 'SWOT', icon: LayoutGrid, cor: '#3B82F6' },
  { n: 3, sufixo: '/motivadores', titulo: 'Motivadores Estratégicos', icon: Rocket, cor: '#8B5CF6' },
  { n: 4, sufixo: '/mapa-objetivos', titulo: 'Mapa de Objetivos', icon: Network, cor: '#EC4899' },
  { n: 5, sufixo: '/iniciativas', titulo: 'Iniciativas do Ano', icon: ListChecks, cor: '#0EA5E9' },
];

/** Quantos exercícios existem — a faixa de cada pilar mostra "Pilar N de TOTAL". */
export const TOTAL_PILARES = PILARES.length;

/* ── Cabeçalho fixo: quem é o aluno + ações ─────────────────────────────── */
export function Topo({
  dados, alterar, salvar, sujo, salvando, salvoEm, slug,
}: {
  dados: Treino;
  alterar: (m: Partial<Treino>) => void;
  salvar: () => Promise<boolean>;
  sujo: boolean;
  salvando: boolean;
  salvoEm: string | null;
  slug: string;
}) {
  const caminho = usePathname();
  const router = useRouter();
  /** Cada empresa tem o seu conjunto de pilares, debaixo do link dela. */
  const href = (sufixo: string) => `/treino-mba01/${slug}${sufixo}`;

  /**
   * Cada exercício recarrega os dados do localStorage ao abrir. Então trocar de
   * pilar com coisa não salva jogava o trabalho fora, calado. O beforeunload do
   * store não pega isso — ele só cobre fechar a aba.
   * Aqui a troca de pilar passa por este porteiro: se está sujo, pergunta antes.
   */
  const [destino, setDestino] = useState<string | null>(null);
  const irPara = (href: string) => {
    if (href === caminho) return;
    if (sujo) { setDestino(href); return; }
    router.push(href);
  };

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
              onClick={async () => { if (!(await salvar())) window.alert('Não deu para salvar agora. Verifique a internet e tente de novo.'); }}
              disabled={salvando}
              className="flex items-center gap-1.5 text-xs font-bold text-white rounded-lg px-3.5 py-2 transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: '#10B981' }}
            >
              <Save className="w-4 h-4" /> {salvando ? 'Salvando…' : 'Salvar'}
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
            const destinoP = href(p.sufixo);
            const ativo = caminho === destinoP;
            return (
              <button
                key={p.sufixo}
                onClick={() => irPara(destinoP)}
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
              </button>
            );
          })}
        </nav>
      </div>

      {destino && (
        <AvisoNaoSalvo
          salvando={salvando}
          onSalvar={async () => {
            // só sai se o banco confirmou — senão o aluno sairia achando que salvou
            const ok = await salvar();
            if (ok) { router.push(destino); setDestino(null); }
          }}
          onDescartar={() => { router.push(destino); setDestino(null); }}
          onCancelar={() => setDestino(null)}
        />
      )}
    </header>
  );
}

/* ── Porteiro: aparece ao trocar de pilar com alteração não salva ────────── */

function AvisoNaoSalvo({ salvando, onSalvar, onDescartar, onCancelar }: {
  salvando: boolean;
  onSalvar: () => void;
  onDescartar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-5 print:hidden"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0 bg-amber-50 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="text-base font-black text-slate-800">Você tem alterações não salvas</p>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          Se sair agora sem salvar, o que você escreveu neste exercício será perdido.
          O que deseja fazer?
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="w-full rounded-xl px-4 py-3 text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: '#10B981' }}
          >
            {salvando ? 'Salvando…' : 'Salvar e sair'}
          </button>
          <button
            onClick={onDescartar}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
          >
            Descartar e sair
          </button>
          <button
            onClick={onCancelar}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
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
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: cor }}>Pilar {n} de {TOTAL_PILARES}</p>
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
/** Link errado ou apagado. Melhor dizer na cara do que deixar preencher à toa. */
export function LinkNaoEncontrado() {
  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-5">
      <div className="w-full max-w-[420px] rounded-2xl bg-white border border-slate-200 p-7 text-center shadow-sm">
        <span className="grid place-items-center w-12 h-12 rounded-xl mx-auto mb-4 bg-amber-50 text-amber-500">
          <AlertTriangle className="w-6 h-6" />
        </span>
        <p className="text-lg font-black text-slate-800 mb-2">Não achamos esse exercício</p>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          O link pode estar com um erro de digitação — confira o endereço. Se você ainda não criou o seu,
          é rapidinho.
        </p>
        <a
          href="/treino-mba01"
          className="inline-block rounded-xl px-5 py-3 text-sm font-black text-white transition-all hover:brightness-110"
          style={{ background: '#10B981' }}
        >
          Criar meu exercício
        </a>
      </div>
    </div>
  );
}

/** Diz onde o exercício mora. Antes era "neste navegador"; agora é o link. */
export function AvisoLocal({ slug }: { slug?: string }) {
  return (
    <p className="text-[11px] text-slate-400 text-center mt-10 print:hidden">
      Seu exercício fica salvo no link{' '}
      <strong className="text-slate-500">minhasmetricas.com/treino-mba01/{slug ?? '…'}</strong> — guarde
      esse endereço para voltar de qualquer aparelho. Para levar embora, use{' '}
      <strong className="text-slate-500">Baixar PDF</strong>.
    </p>
  );
}
