export interface DadosCardCandidato {
  nomeUrna: string;
  cargo: string;
  numero: string;
  partido: string;
  uf: string;
  fotoUrl?: string;
  percentual: number;
  posicao: number;
}

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

export async function gerarCardCandidatoJpg(dados: DadosCardCandidato): Promise<{ blob: Blob; pngBlob: Blob; file: File; dataUrl: string }> {
  const { nomeUrna, cargo, numero, partido, uf, fotoUrl, percentual, posicao } = dados;

  // Imagem formato Story / Feed HD (1080 x 1350 px)
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Erro ao inicializar canvas para o card');

  const fotoImg = await carregarImagem(fotoUrl);

  // 1. Fundo Gradiente Escuro Premium
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#060a12');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Glow de fundo temático laranja/dourado
  const glowGrad = ctx.createRadialGradient(width / 2, 420, 50, width / 2, 420, 550);
  glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
  glowGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.08)');
  glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Borda externa elegante
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
  ctx.lineWidth = 4;
  roundRect(ctx, 32, 32, width - 64, height - 64, 40);
  ctx.stroke();

  // 2. Cabeçalho Oficial
  // Badge da Logo
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 70, 70, 64, 64, 20);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', 102, 102);

  // Nome Democracias
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Democracias', 150, 105);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PESQUISA ELEITORAL 2026', 152, 130);

  // Badge da Localidade
  ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
  roundRect(ctx, width - 260, 72, 190, 48, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, width - 260, 72, 190, 48, 14);
  ctx.stroke();

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`📍 ${uf || 'BRASIL'}`, width - 165, 103);

  // 3. Card Central do Candidato (Fundo Branco Flutuante)
  const cardX = 70;
  const cardY = 180;
  const cardW = width - 140;
  const cardH = 920;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  // Borda sutil
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();

  // Badge de Posição
  ctx.fillStyle = posicao === 1 ? '#fbbf24' : '#0f172a';
  roundRect(ctx, cardX + 36, cardY + 36, 110, 44, 14);
  ctx.fill();
  ctx.fillStyle = posicao === 1 ? '#78350f' : '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${posicao}º LUGAR`, cardX + 91, cardY + 66);

  // Cargo no topo do card
  ctx.fillStyle = '#64748b';
  ctx.font = '800 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(cargo.toUpperCase(), cardX + cardW - 36, cardY + 66);

  // 4. Foto do Candidato (Grande Circular com Moldura Laranja)
  const photoRadius = 155;
  const photoCenterX = width / 2;
  const photoCenterY = cardY + 280;

  ctx.save();
  ctx.beginPath();
  ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (fotoImg) {
    ctx.drawImage(
      fotoImg,
      photoCenterX - photoRadius,
      photoCenterY - photoRadius,
      photoRadius * 2,
      photoRadius * 2
    );
  } else {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(
      photoCenterX - photoRadius,
      photoCenterY - photoRadius,
      photoRadius * 2,
      photoRadius * 2
    );

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 70px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nomeUrna.slice(0, 2).toUpperCase(), photoCenterX, photoCenterY);
  }
  ctx.restore();

  // Borda Circular Laranja
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Nome de Urna
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 48px sans-serif';
  ctx.fillText(nomeUrna, width / 2, cardY + 500);

  // Partido e Número
  const infoY = cardY + 560;

  // Badge do Partido
  if (partido) {
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, width / 2 - 190, infoY - 34, 160, 48, 12);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    roundRect(ctx, width / 2 - 190, infoY - 34, 160, 48, 12);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = '900 24px monospace';
    ctx.fillText(partido, width / 2 - 110, infoY);
  }

  // Pílula Laranja do Número
  const numGrad = ctx.createLinearGradient(width / 2 + 30, 0, width / 2 + 190, 0);
  numGrad.addColorStop(0, '#f97316');
  numGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = numGrad;
  roundRect(ctx, width / 2 + 30, infoY - 34, 160, 48, 24);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 26px monospace';
  ctx.fillText(`Nº ${numero}`, width / 2 + 110, infoY - 2);

  // Divisória no card
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 48, cardY + 620);
  ctx.lineTo(cardX + cardW - 48, cardY + 620);
  ctx.stroke();

  // 6. BLOCO DE INTENÇÃO DE VOTO EM DESTAQUE GIGANTE
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('INTENÇÃO DE VOTOS NA PESQUISA OFICIAL', width / 2, cardY + 665);

  ctx.fillStyle = '#ea580c';
  ctx.font = '900 88px monospace';
  const pctTexto = `${percentual.toFixed(1).replace('.', ',')}%`;
  ctx.fillText(pctTexto, width / 2, cardY + 760);

  // Barra de Progresso
  const barW = cardW - 120;
  const barX = cardX + 60;
  const barY = cardY + 800;
  const barH = 26;

  ctx.fillStyle = '#f1f5f9';
  roundRect(ctx, barX, barY, barW, barH, 13);
  ctx.fill();

  const fillW = Math.min(barW, Math.max(barW * (percentual / 100), 20));
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
  fillGrad.addColorStop(0, '#f97316');
  fillGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = fillGrad;
  roundRect(ctx, barX, barY, fillW, barH, 13);
  ctx.fill();

  // Rodapé do Card
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 16px sans-serif';
  ctx.fillText('Métricas consolidadas em percentual (%) conforme a legislação', width / 2, cardY + 870);

  // 7. Rodapé do Banner
  const bannerFooterY = height - 160;

  ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
  roundRect(ctx, 70, bannerFooterY, cardW, 95, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 70, bannerFooterY, cardW, 95, 20);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('Participe e acompanhe a pesquisa oficial em tempo real:', width / 2, bannerFooterY + 38);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 28px monospace';
  ctx.fillText('🔗 chat.democracias.org', width / 2, bannerFooterY + 72);

  // 8. Retornar Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (jpegBlob) => {
        if (!jpegBlob) {
          reject(new Error('Erro ao converter imagem do card'));
          return;
        }

        canvas.toBlob(
          (pngBlob) => {
            const finalPng = pngBlob || jpegBlob;
            const fileName = `resultado_${cargo.toLowerCase().replace(/\s+/g, '_')}_${nomeUrna.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            const file = new File([jpegBlob], fileName, { type: 'image/jpeg' });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve({ blob: jpegBlob, pngBlob: finalPng, file, dataUrl });
          },
          'image/png'
        );
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
