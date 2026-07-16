'use client';

/**
 * O exercício inteiro numa folha só — é isto que sai no "Baixar PDF".
 *
 * Antes o PDF saía só do pilar aberto: a pessoa tinha que imprimir 5 vezes e
 * juntar. Como cada pilar é uma rota diferente, não dá para imprimir todos a
 * partir de um deles — então montamos o documento a partir dos DADOS, não das
 * telas. De quebra sai mais limpo: sem botão, sem campo, sem navegação.
 *
 * Fica escondido na tela e só aparece na impressão (ver print.css).
 */

import { buscarDoToBe, preservarDasForcas, eliminarDasFraquezas, type StatusAcao, type Treino } from './store';

const ROTULO: Record<StatusAcao, string> = {
  'a-iniciar': 'A iniciar',
  'em-andamento': 'Em andamento',
  'concluido': 'Concluído',
};

const soTexto = (itens: { texto: string }[]) => itens.map((i) => i.texto);

function Secao({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22, breakInside: 'avoid' }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, borderBottom: '1.5px solid #111', paddingBottom: 4, marginBottom: 10 }}>
        {n}. {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Lista simples; se estiver vazia, diz que está — melhor que um buraco no papel. */
function Lista({ itens }: { itens: string[] }) {
  const cheios = itens.filter((i) => i.trim());
  if (!cheios.length) return <p style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>— não preenchido —</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 16 }}>
      {cheios.map((i, k) => <li key={k} style={{ fontSize: 11, marginBottom: 2 }}>{i}</li>)}
    </ul>
  );
}

function Quadro({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8 }}>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{titulo}</p>
      <Lista itens={itens} />
    </div>
  );
}

const grade2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } as const;
const celula = { border: '1px solid #ccc', padding: '4px 6px', fontSize: 10, textAlign: 'left' } as const;

export default function ResumoTudo({ dados: d }: { dados: Treino }) {
  const acoes = d.mapa.flatMap((o) =>
    o.subObjetivos.flatMap((s) =>
      s.iniciativas.flatMap((i) => i.acoes.map((a) => ({ a, i, s, o }))),
    ),
  );

  return (
    <div className="resumo-tudo" style={{ color: '#111', background: '#fff', fontSize: 11 }}>
      <header style={{ borderBottom: '2px solid #111', paddingBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666' }}>
          Aula de MBA · Planejamento Comercial
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{d.empresa || 'Plano comercial'}</h1>
        <p style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
          {d.nome ? `${d.nome} · ` : ''}{new Date().toLocaleDateString('pt-BR')}
        </p>
      </header>

      <Secao n={1} titulo="To be / As is">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...celula, fontWeight: 800, background: '#f3f4f6', width: '50%' }}>Queremos ser</th>
              <th style={{ ...celula, fontWeight: 800, background: '#f3f4f6' }}>Somos hoje</th>
            </tr>
          </thead>
          <tbody>
            {d.tobe.filter((l) => l.toBe.trim() || l.asIs.trim()).map((l) => (
              <tr key={l.id}>
                <td style={celula}>{l.toBe}</td>
                <td style={celula}>{l.asIs}</td>
              </tr>
            ))}
            {!d.tobe.some((l) => l.toBe.trim() || l.asIs.trim()) && (
              <tr><td style={{ ...celula, color: '#888', fontStyle: 'italic' }} colSpan={2}>— não preenchido —</td></tr>
            )}
          </tbody>
        </table>
      </Secao>

      <Secao n={2} titulo="SWOT">
        <div style={grade2}>
          <Quadro titulo="Forças" itens={d.swot.forcas} />
          <Quadro titulo="Fraquezas" itens={d.swot.fraquezas} />
          <Quadro titulo="Oportunidades" itens={d.swot.oportunidades} />
          <Quadro titulo="Ameaças" itens={d.swot.ameacas} />
        </div>
      </Secao>

      <Secao n={3} titulo="Motivadores estratégicos">
        <div style={grade2}>
          {/* o que a tela mostra: o que desceu dos outros pilares + o escrito à mão */}
          <Quadro titulo="Buscar" itens={[...soTexto(buscarDoToBe(d.tobe)), ...d.motivadores.buscar]} />
          <Quadro titulo="Preservar" itens={[...soTexto(preservarDasForcas(d.swot)), ...d.motivadores.preservar]} />
          <Quadro titulo="Evitar" itens={d.motivadores.evitar} />
          <Quadro titulo="Eliminar" itens={[...soTexto(eliminarDasFraquezas(d.swot)), ...d.motivadores.eliminar]} />
        </div>
      </Secao>

      <Secao n={4} titulo="Mapa de objetivos">
        {d.mapa.length === 0 && <p style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>— não preenchido —</p>}
        {d.mapa.map((o) => (
          <div key={o.id} style={{ marginBottom: 10, breakInside: 'avoid' }}>
            <p style={{ fontSize: 12, fontWeight: 800 }}>{o.texto || '(objetivo sem nome)'}</p>
            {o.subObjetivos.map((s) => (
              <div key={s.id} style={{ marginLeft: 12, marginTop: 3 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#333' }}>{s.texto || '(sub-objetivo sem nome)'}</p>
                <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
                  {s.iniciativas.filter((i) => i.texto.trim()).map((i) => (
                    <li key={i.id} style={{ fontSize: 10.5 }}>{i.texto}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </Secao>

      <Secao n={5} titulo="Iniciativas do ano · plano de ação">
        {acoes.length === 0 && <p style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>— não preenchido —</p>}
        {acoes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Objetivo', 'Iniciativa', 'Ação', 'Área', 'Responsável', 'Entrega', 'Status'].map((h) => (
                  <th key={h} style={{ ...celula, fontWeight: 800, background: '#f3f4f6' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acoes.map(({ a, i, o }, k) => (
                <tr key={k}>
                  <td style={celula}>{o.texto}</td>
                  <td style={celula}>{i.texto}</td>
                  <td style={celula}>{a.texto}</td>
                  <td style={celula}>{a.area}</td>
                  <td style={celula}>{a.responsavel}</td>
                  <td style={celula}>{a.entrega}</td>
                  <td style={celula}>{ROTULO[a.status] ?? a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Secao>
    </div>
  );
}
