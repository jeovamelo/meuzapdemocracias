import type { RespostaUsuario, Candidato } from '../types';

function carregarImagem(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function gerarColinhaJpg(respostas: RespostaUsuario): Promise<{ blob: Blob; file: File; dataUrl: string }> {
  const { votos, uf, municipio, bairro } = respostas;

  const itens: { cargo: string; cand?: Candidato | null; digitos: string; ordem: string }[] = [
    { cargo: 'Deputado(a) Federal', cand: votos.deputado_federal, digitos: '4 dígitos', ordem: '1º' },
    { cargo: 'Deputado(a) Estadual', cand: votos.deputado_estadual, digitos: '5 dígitos', ordem: '2º' },
    { cargo: 'Senador(a) — 1ª Vaga', cand: votos.senador_1, digitos: '3 dígitos', ordem: '3º' },
    { cargo: 'Senador(a) — 2ª Vaga', cand: votos.senador_2, digitos: '3 dígitos', ordem: '4º' },
    { cargo: 'Governador(a)', cand: votos.governador, digitos: '2 dígitos', ordem: '5º' },
    { cargo: 'Presidente', cand: votos.presidente, digitos: '2 dígitos', ordem: '6º' },
  ];

  // Pré-carregar todas as fotos dos candidatos em paralelo
  const fotosCarregadas = await Promise.all(
    itens.map((item) => carregarImagem(item.cand?.fotoUrl))
  );

  const width = 960;
  const height = 1480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar o canvas');

  // 1. Fundo Gradiente Elegante Escuro
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.4, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Efeito decorativo de luz no topo
  const glowGrad = ctx.createRadialGradient(width / 2, 100, 10, width / 2, 100, 480);
  glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
  glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, 550);

  // Borda decorativa geral do card
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
  ctx.lineWidth = 4;
  roundRect(ctx, 24, 24, width - 48, height - 48, 36);
  ctx.stroke();

  // 2. Cabeçalho
  // Badge da Logo
  ctx.fillStyle = '#f97316';
  roundRect(ctx, 52, 54, 52, 52, 16);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', 78, 80);

  // Título Democracias
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillText('Democracias', 120, 84);

  // Tag "Eleições 2026"
  ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
  roundRect(ctx, 335, 58, 175, 34, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 335, 58, 175, 34, 10);
  ctx.stroke();

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ELEIÇÕES 2026', 422, 80);

  // Localização à direita
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  const locTexto = `${municipio || 'Brasil'}/${uf || 'BR'}${bairro ? ` (${bairro})` : ''}`;
  ctx.fillText(`📍 ${locTexto}`, width - 56, 82);

  // Divisória do Cabeçalho
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 126);
  ctx.lineTo(width - 52, 126);
  ctx.stroke();

  // Título e Subtítulo Principal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px sans-serif';
  ctx.fillText('🗳️ MINHA COLINHA ELEITORAL', width / 2, 172);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px sans-serif';
  ctx.fillText('Ordem oficial de votação na urna eletrônica', width / 2, 202);

  // 3. Renderização Vertical dos Votos (1 abaixo do outro com FOTOS)
  const startY = 230;
  const cardHeight = 150;
  const cardGap = 16;
  const cardWidth = width - 104;

  itens.forEach((item, index) => {
    const y = startY + index * (cardHeight + cardGap);
    const cand = item.cand;
    const fotoImg = fotosCarregadas[index];
    const isBranco = cand?.numero === 'BRANCO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco'));
    const isNulo = cand?.numero === 'NULO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo'));

    // Fundo do Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    roundRect(ctx, 52, y, cardWidth, cardHeight, 20);
    ctx.fill();

    // Borda do Card
    ctx.strokeStyle = cand ? 'rgba(249, 115, 22, 0.35)' : 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 52, y, cardWidth, cardHeight, 20);
    ctx.stroke();

    // Faixa lateral esquerda
    ctx.fillStyle = '#f97316';
    roundRect(ctx, 52, y, 6, cardHeight, { tl: 20, bl: 20, tr: 0, br: 0 });
    ctx.fill();

    // FOTO DO CANDIDATO (ou avatar com iniciais)
    const photoSize = 104;
    const photoX = 74;
    const photoY = y + 23;

    ctx.save();
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 18);
    ctx.clip();

    if (fotoImg && !isBranco && !isNulo) {
      // Desenhar a foto oficial recortada
      ctx.drawImage(fotoImg, photoX, photoY, photoSize, photoSize);
    } else {
      // Fundo para fallback
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iniciais = cand?.nomeUrna ? cand.nomeUrna.slice(0, 2).toUpperCase() : (isBranco ? '⚪' : isNulo ? '🚫' : '👤');
      ctx.fillText(iniciais, photoX + photoSize / 2, photoY + photoSize / 2);
    }
    ctx.restore();

    // Borda da foto
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 18);
    ctx.stroke();

    // Informações Textuais do Candidato
    const infoX = photoX + photoSize + 22;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Ordem e Cargo Compacto
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${item.ordem} • ${item.cargo}`, infoX, y + 42);

    // Nome de Urna
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px sans-serif';
    const nomeExibicao = cand?.nomeUrna || (isBranco ? 'VOTO EM BRANCO' : isNulo ? 'VOTO NULO' : 'NÃO INFORMADO');
    ctx.fillText(nomeExibicao.slice(0, 28), infoX, y + 78);

    // Partido (Badge)
    if (cand?.partido && !isBranco && !isNulo) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      roundRect(ctx, infoX, y + 96, 95, 30, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, infoX, y + 96, 95, 30, 8);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = '900 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cand.partido, infoX + 47, y + 117);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 14px sans-serif';
      ctx.fillText(item.digitos, infoX, y + 116);
    }

    // Caixa de Número Destacada à Direita
    const numBoxWidth = 175;
    const numBoxHeight = 96;
    const numBoxX = width - 52 - numBoxWidth - 20;
    const numBoxY = y + 27;

    ctx.fillStyle = 'rgba(249, 115, 22, 0.14)';
    roundRect(ctx, numBoxX, numBoxY, numBoxWidth, numBoxHeight, 16);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    roundRect(ctx, numBoxX, numBoxY, numBoxWidth, numBoxHeight, 16);
    ctx.stroke();

    // Rótulo NÚMERO
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NÚMERO', numBoxX + numBoxWidth / 2, numBoxY + 26);

    // Dígitos do Número
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px monospace';
    const numeroExibicao = cand?.numero || '—';
    ctx.fillText(numeroExibicao, numBoxX + numBoxWidth / 2, numBoxY + 72);
  });

  // 4. Rodapé Promocional com o Link
  const footerY = height - 175;

  ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
  roundRect(ctx, 52, footerY, cardWidth, 115, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 52, footerY, cardWidth, 115, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 19px sans-serif';
  ctx.fillText('Participe da pesquisa oficial e gere sua colinha oficial para a urna:', width / 2, footerY + 44);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 26px monospace';
  ctx.fillText('🔗 https://chat.democracias.org', width / 2, footerY + 84);

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  const r = typeof radius === 'number'
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
