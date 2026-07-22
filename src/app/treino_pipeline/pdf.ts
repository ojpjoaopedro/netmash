'use client';

/**
 * Fotografa um pedaço da tela e salva em PDF A4 retrato, quebrando em páginas
 * quando o conteúdo é mais alto que a folha.
 *
 * Trabalha sobre uma CÓPIA do elemento, montada fora da tela: para o html2canvas
 * ler as cores é preciso reescrever todas elas, e mexer no elemento vivo deixaria
 * o painel do aluno remendado depois do download.
 */
export async function baixarPdf(alvo: HTMLElement, arquivo: string): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const JsPDF = jspdf.jsPDF;

  /**
   * O html2canvas só entende cor no formato antigo (rgb/rgba). O Tailwind v4
   * escreve transparência como `color-mix(in oklab, ...)`, e nisso ele engasga
   * e derruba o PDF inteiro. Copiar o getComputedStyle não resolve — o navegador
   * devolve a cor ainda em oklab. Então pedimos para ele PINTAR a cor num canvas
   * 1×1 e lemos o pixel: o que volta é rgba() puro.
   */
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const paraRgba = (cor: string): string => {
    if (!cx || !cor) return cor;
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = cor;               // se o navegador não entender, fica no #000
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  };

  const largura = alvo.offsetWidth;
  const palco = document.createElement('div');
  palco.style.cssText = `position:fixed;left:-100000px;top:0;width:${largura}px;background:#ffffff`;
  const copia = alvo.cloneNode(true) as HTMLElement;
  copia.style.width = `${largura}px`;
  copia.style.maxHeight = 'none';
  copia.style.overflow = 'visible';
  palco.appendChild(copia);
  document.body.appendChild(palco);

  try {
    // as cores saem do original (o clone fora da tela não herda o cálculo)
    const originais = [alvo, ...Array.from(alvo.querySelectorAll<HTMLElement>('*'))];
    const clones = [copia, ...Array.from(copia.querySelectorAll<HTMLElement>('*'))];
    originais.forEach((el, i) => {
      const c = clones[i];
      if (!c) return;
      const cs = getComputedStyle(el);
      c.style.color = paraRgba(cs.color);
      c.style.borderTopColor = paraRgba(cs.borderTopColor);
      c.style.borderRightColor = paraRgba(cs.borderRightColor);
      c.style.borderBottomColor = paraRgba(cs.borderBottomColor);
      c.style.borderLeftColor = paraRgba(cs.borderLeftColor);
      const fundo = paraRgba(cs.backgroundColor);
      if (!fundo.endsWith(', 0.000)')) c.style.backgroundColor = fundo;
      c.style.boxShadow = 'none';     // sombra vira borrão cinza na foto
    });

    const canvas = await html2canvas(copia, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const folhaL = pdf.internal.pageSize.getWidth();
    const folhaA = pdf.internal.pageSize.getHeight();
    const imgA = (canvas.height * folhaL) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.92);

    // uma imagem só, empurrada para cima a cada folha: é o corte mais simples
    // que não deixa linha de conteúdo se perder entre uma página e outra
    let sobra = imgA;
    let topo = 0;
    pdf.addImage(img, 'JPEG', 0, 0, folhaL, imgA);
    sobra -= folhaA;
    while (sobra > 1) {
      pdf.addPage();
      topo -= folhaA;
      pdf.addImage(img, 'JPEG', 0, topo, folhaL, imgA);
      sobra -= folhaA;
    }
    pdf.save(arquivo);
  } finally {
    document.body.removeChild(palco);
  }
}
