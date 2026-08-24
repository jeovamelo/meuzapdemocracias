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

function resolverFoto(cand?: Candidato | null, ufPadrao?: string): string {
  if (!cand || cand.isBrancoNulo || cand.numero === 'BRANCO' || cand.numero === 'NULO') return '';
  const isPres = (cand.cargo || '').toLowerCase().includes('presid');
  const uf = isPres ? 'BR' : (cand.uf || ufPadrao || 'CE').toUpperCase();

  if (cand.fotoUrl) {
    if (isPres && cand.fotoUrl.includes('/candidatos/F') && !cand.fotoUrl.includes('/candidatos/FBR')) {
      return cand.fotoUrl.replace(/\/candidatos\/F[A-Z]{2}/, '/candidatos/FBR');
    }
    return cand.fotoUrl;
  }

  if (cand.sq_candidato) {
    return `/candidatos/F${uf}${cand.sq_candidato}_div.jpg`;
  }
  return '';
}

export async function gerarColinhaJpg(respostas: RespostaUsuario): Promise<{ blob: Blob; pngBlob: Blob; file: File; dataUrl: string }> {
  const { votos, uf, municipio, bairro } = respostas;

  const itens: { cargo: string; cand?: Candidato | null; digitos: string; ordem: string }[] = [
    { cargo: 'Dep. Federal (Dep. A)', cand: votos.deputado_federal, digitos: '4 dígitos', ordem: '1º' },
    { cargo: 'Deputado Estadual', cand: votos.deputado_estadual, digitos: '5 dígitos', ordem: '2º' },
    { cargo: 'Senador(a) — 1ª Vaga', cand: votos.senador_1, digitos: '3 dígitos', ordem: '3º' },
    { cargo: 'Senador(a) — 2ª Vaga', cand: votos.senador_2, digitos: '3 dígitos', ordem: '4º' },
    { cargo: 'Governador(a)', cand: votos.governador, digitos: '2 dígitos', ordem: '5º' },
    { cargo: 'Presidente', cand: votos.presidente, digitos: '2 dígitos', ordem: '6º' },
  ];

  // Pré-carregar todas as fotos dos candidatos em paralelo
  const fotosCarregadas = await Promise.all(
    itens.map((item) => carregarImagem(resolverFoto(item.cand, uf)))
  );

  const width = 960;
  const height = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar o canvas');

  // 1. Fundo Gradiente Escuro Moderno
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.4, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Efeito de iluminação suave no topo
  const glowGrad = ctx.createRadialGradient(width / 2, 100, 10, width / 2, 100, 500);
  glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
  glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, 550);

  // Borda sutil externa
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, width - 48, height - 48, 36);
  ctx.stroke();

  // 2. Cabeçalho Oficial
  // Badge Logo com fundo branco
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 52, 54, 56, 56, 18);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', 80, 82);

  // Título da Plataforma
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillText('Democracias', 124, 84);

  // Badge "ELEIÇÕES 2026"
  ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
  roundRect(ctx, 340, 58, 175, 36, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 340, 58, 175, 36, 12);
  ctx.stroke();

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ELEIÇÕES 2026', 427, 81);

  // Localização à Direita
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  const locTexto = `${municipio || 'Brasil'}/${uf || 'BR'}${bairro ? ` (${bairro})` : ''}`;
  ctx.fillText(`📍 ${locTexto}`, width - 56, 82);

  // Divisória
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 128);
  ctx.lineTo(width - 52, 128);
  ctx.stroke();

  // Título Principal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px sans-serif';
  ctx.fillText('🗳️ MINHA COLINHA ELEITORAL', width / 2, 176);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px sans-serif';
  ctx.fillText('Ordem oficial de votação na urna eletrônica', width / 2, 206);

  // 3. Renderização Vertical dos Cards Flutuantes Brancos (com fotos circulares e pílula laranja)
  const startY = 236;
  const cardHeight = 152;
  const cardGap = 18;
  const cardWidth = width - 104;

  itens.forEach((item, index) => {
    const y = startY + index * (cardHeight + cardGap);
    const cand = item.cand;
    const fotoImg = fotosCarregadas[index];
    const isBranco = cand?.numero === 'BRANCO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco'));
    const isNulo = cand?.numero === 'NULO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo'));

    // Sombra suave do card
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Fundo do Card Flutuante Branco Leve
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 52, y, cardWidth, cardHeight, 24);
    ctx.fill();
    ctx.restore();

    // Borda fina elegante
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 52, y, cardWidth, cardHeight, 24);
    ctx.stroke();

    // FOTO DO CANDIDATO CIRCULAR
    const photoRadius = 48;
    const photoCenterX = 52 + 24 + photoRadius;
    const photoCenterY = y + cardHeight / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (fotoImg && !isBranco && !isNulo) {
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
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iniciais = cand?.nomeUrna ? cand.nomeUrna.slice(0, 2).toUpperCase() : (isBranco ? '⚪' : isNulo ? '🚫' : '👤');
      ctx.fillText(iniciais, photoCenterX, photoCenterY);
    }
    ctx.restore();

    // Borda Temática Laranja da Foto Circular
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Informações Textuais (Hierarquia Tipográfica)
    const infoX = photoCenterX + photoRadius + 22;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 1. Ordem e Cargo
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${item.ordem} • ${item.cargo}`, infoX, y + 42);

    // 2. Nome de Urna em Destaque
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 26px sans-serif';
    const nomeExibicao = cand?.nomeUrna || (isBranco ? 'VOTO EM BRANCO' : isNulo ? 'VOTO NULO' : 'NÃO INFORMADO');
    ctx.fillText(nomeExibicao.slice(0, 26), infoX, y + 80);

    // 3. Sigla do Partido em Badge
    if (cand?.partido && !isBranco && !isNulo) {
      ctx.fillStyle = '#f1f5f9';
      roundRect(ctx, infoX, y + 96, 110, 32, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      roundRect(ctx, infoX, y + 96, 110, 32, 8);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = '900 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cand.partido, infoX + 55, y + 118);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px sans-serif';
      ctx.fillText(item.digitos, infoX, y + 118);
    }

    // NÚMERO EM PÍLULA LARANJA VIBRANTE À DIREITA
    const pillWidth = 160;
    const pillHeight = 64;
    const pillX = width - 52 - pillWidth - 20;
    const pillY = y + (cardHeight - pillHeight) / 2;

    // Fundo da Pílula com gradiente laranja
    const pillGrad = ctx.createLinearGradient(pillX, 0, pillX + pillWidth, 0);
    pillGrad.addColorStop(0, '#f97316');
    pillGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 32);
    ctx.fill();

    // Texto do Número
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const numeroExibicao = cand?.numero || '—';
    ctx.fillText(numeroExibicao, pillX + pillWidth / 2, pillY + pillHeight / 2);
  });

  // 4. Rodapé Promocional
  const footerY = height - 170;

  ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
  roundRect(ctx, 52, footerY, cardWidth, 110, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 52, footerY, cardWidth, 110, 22);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 19px sans-serif';
  ctx.fillText('Participe da enquete eleitoral e gere sua colinha:', width / 2, footerY + 38);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 26px monospace';
  ctx.fillText('🔗 https://chat.democracias.org', width / 2, footerY + 76);

  // 5. Retornar Blob JPEG + PNG
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (jpegBlob) => {
        if (!jpegBlob) {
          reject(new Error('Erro ao converter imagem da colinha'));
          return;
        }

        canvas.toBlob(
          (pngBlob) => {
            const finalPngBlob = pngBlob || jpegBlob;
            const file = new File([jpegBlob], 'minha_colinha_eleitoral_2026.jpg', { type: 'image/jpeg' });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve({ blob: jpegBlob, pngBlob: finalPngBlob, file, dataUrl });
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
