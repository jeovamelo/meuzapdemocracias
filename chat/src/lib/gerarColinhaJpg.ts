import type { RespostaUsuario } from '../types';

export async function gerarColinhaJpg(respostas: RespostaUsuario): Promise<{ blob: Blob; file: File; dataUrl: string }> {
  const { votos, uf, municipio, bairro } = respostas;

  const itens = [
    { cargo: 'DEPUTADA OU DEPUTADO FEDERAL', cand: votos.deputado_federal, digitos: '4 DÍGITOS' },
    { cargo: 'DEPUTADA OU DEPUTADO ESTADUAL', cand: votos.deputado_estadual, digitos: '5 DÍGITOS' },
    { cargo: 'SENADORA OU SENADOR (1ª VAGA)', cand: votos.senador_1, digitos: '3 DÍGITOS' },
    { cargo: 'SENADORA OU SENADOR (2ª VAGA)', cand: votos.senador_2, digitos: '3 DÍGITOS' },
    { cargo: 'GOVERNADORA OU GOVERNADOR', cand: votos.governador, digitos: '2 DÍGITOS' },
    { cargo: 'PRESIDENTE DA REPÚBLICA', cand: votos.presidente, digitos: '2 DÍGITOS' },
  ];

  const width = 900;
  const height = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar o canvas');

  // 1. Fundo Gradiente Elegante
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Efeito decorativo de luz no topo
  const glowGrad = ctx.createRadialGradient(width / 2, 100, 10, width / 2, 100, 450);
  glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
  glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, 500);

  // Borda decorativa geral do card
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
  ctx.lineWidth = 4;
  roundRect(ctx, 20, 20, width - 40, height - 40, 32);
  ctx.stroke();

  // 2. Cabeçalho
  // Logotipo / Badge Superior
  ctx.fillStyle = '#f97316';
  roundRect(ctx, 45, 50, 48, 48, 14);
  ctx.fill();

  // Ícone de urna no badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', 69, 74);

  // Título da Marca
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillText('Democracias', 108, 78);

  // Tag "Pesquisa Oficial 2026"
  ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
  roundRect(ctx, 315, 54, 190, 32, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 315, 54, 190, 32, 8);
  ctx.stroke();

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ELEIÇÕES 2026', 410, 75);

  // Localização à direita
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px sans-serif';
  const locTexto = `${municipio || 'Brasil'} / ${uf || 'BR'}${bairro ? ` (${bairro})` : ''}`;
  ctx.fillText(`📍 ${locTexto}`, width - 50, 77);

  // Linha divisória
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(45, 115);
  ctx.lineTo(width - 45, 115);
  ctx.stroke();

  // Título Principal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px sans-serif';
  ctx.fillText('🗳️ MINHA ESCOLHA ELEITORAL', width / 2, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px sans-serif';
  ctx.fillText('Colinha oficial para votação na urna eletrônica', width / 2, 190);

  // 3. Renderização dos Votos (1 abaixo do outro verticalmente)
  let startY = 220;
  const cardHeight = 135;
  const cardGap = 16;

  itens.forEach((item, index) => {
    const y = startY + index * (cardHeight + cardGap);
    const cand = item.cand;
    const isBranco = cand?.numero === 'BRANCO' || cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco');
    const isNulo = cand?.numero === 'NULO' || cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo');

    // Fundo do card do cargo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, 45, y, width - 90, cardHeight, 18);
    ctx.fill();

    // Borda do card
    ctx.strokeStyle = cand ? 'rgba(249, 115, 22, 0.35)' : 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 45, y, width - 90, cardHeight, 18);
    ctx.stroke();

    // Faixa lateral esquerda colorida
    ctx.fillStyle = '#f97316';
    roundRect(ctx, 45, y, 6, cardHeight, { tl: 18, bl: 18, tr: 0, br: 0 });
    ctx.fill();

    // Cargo e indicador de ordem
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${index + 1}º • ${item.cargo}`, 70, y + 32);

    // Nome da Candidata / Candidato
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px sans-serif';
    const nomeExibicao = cand?.nomeUrna || (isBranco ? 'VOTO EM BRANCO' : isNulo ? 'VOTO NULO' : 'NÃO INFORMADO');
    ctx.fillText(nomeExibicao.slice(0, 32), 70, y + 68);

    // Informação de Partido / Cargo completo
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 15px sans-serif';
    if (cand?.partido) {
      // Badge de partido
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      roundRect(ctx, 70, y + 84, 90, 28, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, 70, y + 84, 90, 28, 6);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cand.partido, 115, y + 103);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText(item.digitos, 70, y + 103);
    }

    // Caixa de Número Destacada à Direita
    const numBoxWidth = 160;
    const numBoxHeight = 85;
    const numBoxX = width - 45 - numBoxWidth - 20;
    const numBoxY = y + 25;

    ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
    roundRect(ctx, numBoxX, numBoxY, numBoxWidth, numBoxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    roundRect(ctx, numBoxX, numBoxY, numBoxWidth, numBoxHeight, 14);
    ctx.stroke();

    // Rótulo "NÚMERO"
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NÚMERO', numBoxX + numBoxWidth / 2, numBoxY + 22);

    // Dígitos do Número
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px monospace';
    const numeroExibicao = cand?.numero || '—';
    ctx.fillText(numeroExibicao, numBoxX + numBoxWidth / 2, numBoxY + 62);
  });

  // 4. Rodapé Promocional com o Link
  const footerY = height - 160;

  // Caixa de chamada com Link
  ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
  roundRect(ctx, 45, footerY, width - 90, 105, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 45, footerY, width - 90, 105, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('Participe você também da pesquisa e gere a sua colinha oficial:', width / 2, footerY + 38);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 24px monospace';
  ctx.fillText('🔗 https://chat.democracias.org', width / 2, footerY + 75);

  // 5. Gerar arquivo JPG de alta qualidade
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Erro ao converter imagem da colinha'));
          return;
        }
        const file = new File([blob], 'minha_colinha_eleitoral_2026.jpg', { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve({ blob, file, dataUrl });
      },
      'image/jpeg',
      0.95
    );
  });
}

// Função auxiliar para desenhar retângulos com cantos arredondados
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  let r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : radius;

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}
