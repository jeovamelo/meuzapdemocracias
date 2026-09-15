import type { ColinhaVotos, Candidato } from '../types';

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

function resolverFoto(cand?: Candidato | null, ufPadrao = 'CE'): string {
  if (!cand || cand.isBrancoNulo || cand.numero === 'BRANCO' || cand.numero === 'NULO') return '';
  const isPres = (cand.cargo || '').toLowerCase().includes('presid');
  const uf = isPres ? 'BR' : (cand.uf || ufPadrao).toUpperCase();

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function gerarColinhaJpg(
  votos: ColinhaVotos,
  uf = 'CE',
  nomeEleitor = ''
): Promise<{ blob: Blob; dataUrl: string }> {
  const itens: { cargo: string; cand?: Candidato | null; digitos: string; ordem: string }[] = [
    { cargo: 'Deputado Federal', cand: votos.deputado_federal, digitos: '4 dígitos', ordem: '1º' },
    { cargo: 'Deputado Estadual', cand: votos.deputado_estadual, digitos: '5 dígitos', ordem: '2º' },
    { cargo: 'Senador(a) — 1ª Vaga', cand: votos.senador_1, digitos: '3 dígitos', ordem: '3º' },
    { cargo: 'Senador(a) — 2ª Vaga', cand: votos.senador_2, digitos: '3 dígitos', ordem: '4º' },
    { cargo: 'Governador(a)', cand: votos.governador, digitos: '2 dígitos', ordem: '5º' },
    { cargo: 'Presidente', cand: votos.presidente, digitos: '2 dígitos', ordem: '6º' },
  ];

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

  // Fundo Gradiente Escuro Moderno
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#040d1a');
  bgGrad.addColorStop(0.5, '#020617');
  bgGrad.addColorStop(1, '#081c15');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Efeito Glow Verde Esmeralda no Topo
  const glowGrad = ctx.createRadialGradient(width / 2, 100, 10, width / 2, 100, 500);
  glowGrad.addColorStop(0, 'rgba(34, 197, 94, 0.22)');
  glowGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, 550);

  // Borda sutil externa
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, width - 48, height - 48, 36);
  ctx.stroke();

  // Cabeçalho Oficial
  ctx.fillStyle = '#22c55e';
  roundRect(ctx, 52, 54, 56, 56, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', 80, 82);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('MeuZap • Democracias', 124, 84);

  // Badge Eleições 2026
  ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
  roundRect(ctx, width - 240, 56, 184, 40, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, width - 240, 56, 184, 40, 14);
  ctx.stroke();

  ctx.fillStyle = '#4ade80';
  ctx.font = '700 16px "Plus Jakarta Sans", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ELEIÇÕES 2026', width - 148, 82);

  // Linha divisória
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(52, 130);
  ctx.lineTo(width - 52, 130);
  ctx.stroke();

  // Subtítulo e Eleitor
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  const eleitorTxt = nomeEleitor ? `Colinha oficial montada por ${nomeEleitor} (${uf.toUpperCase()})` : `Colinha Eleitoral Oficial • Estado: ${uf.toUpperCase()}`;
  ctx.fillText(eleitorTxt, 54, 164);

  // Renderizar 6 Cards de Candidatos
  const cardYStart = 192;
  const cardHeight = 186;
  const cardSpacing = 16;

  itens.forEach((item, index) => {
    const cardY = cardYStart + index * (cardHeight + cardSpacing);
    const cand = item.cand;
    const foto = fotosCarregadas[index];
    const isBrancoNulo = cand?.isBrancoNulo || cand?.numero === 'BRANCO' || cand?.numero === 'NULO';

    // Fundo do Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, 52, cardY, width - 104, cardHeight, 24);
    ctx.fill();

    ctx.strokeStyle = cand ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    roundRect(ctx, 52, cardY, width - 104, cardHeight, 24);
    ctx.stroke();

    // Badge Ordem
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
    roundRect(ctx, 72, cardY + 20, 48, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.font = '800 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.ordem, 96, cardY + 34);

    // Nome do Cargo
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.cargo, 132, cardY + 40);

    // Foto do Candidato
    const fotoX = 72;
    const fotoY = cardY + 60;
    const fotoSize = 104;

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, fotoX, fotoY, fotoSize, fotoSize, 18);
    ctx.clip();

    if (foto) {
      ctx.drawImage(foto, fotoX, fotoY, fotoSize, fotoSize);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(fotoX, fotoY, fotoSize, fotoSize);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBrancoNulo ? '✕' : '👤', fotoX + fotoSize / 2, fotoY + fotoSize / 2);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, fotoX, fotoY, fotoSize, fotoSize, 18);
    ctx.stroke();

    // Informações do Candidato
    const infoX = fotoX + fotoSize + 24;

    if (cand) {
      if (isBrancoNulo) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(cand.nomeUrna || 'VOTO EM BRANCO / NULO', infoX, cardY + 104);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Opção declarada na urna', infoX, cardY + 136);
      } else {
        // Nome de Urna
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
        const nomeTruncado = cand.nomeUrna.length > 22 ? cand.nomeUrna.slice(0, 22) + '...' : cand.nomeUrna;
        ctx.fillText(nomeTruncado, infoX, cardY + 102);

        // Partido e Nome Completo
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
        const partidoTexto = cand.partido ? `Partido: ${cand.partido}` : '';
        ctx.fillText(partidoTexto, infoX, cardY + 132);

        // Número Gigante em Destaque à Direita
        ctx.fillStyle = '#22c55e';
        ctx.font = '800 44px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(cand.numero, width - 84, cardY + 115);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(item.digitos, width - 84, cardY + 144);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Candidato(a) a definir', infoX, cardY + 106);

      ctx.fillStyle = '#475569';
      ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Consulte e anote o número no dia da votação', infoX, cardY + 136);
    }
  });

  // Rodapé Oficial com Verificação
  const rodapeY = height - 70;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(52, rodapeY);
  ctx.lineTo(width - 52, rodapeY);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Plataforma Democracias.org • meuzap.democracias.org • Colinha Eleitoral 2026', 54, rodapeY + 36);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#4ade80';
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('✓ Certificada & Verificada', width - 54, rodapeY + 36);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) throw new Error('Falha ao gerar blob');
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({ blob, dataUrl });
      },
      'image/jpeg',
      0.92
    );
  });
}
