import React, { useState } from 'react';
import { Share2, Send, CheckCircle2, Sparkles, Heart, FileCheck, Loader2, User, Ban, CircleDot, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { RespostaUsuario, Candidato } from '../types';
import { gerarColinhaJpg } from '../lib/gerarColinhaJpg';
import { ResultadosPesquisa } from './ResultadosPesquisa';

interface Props {
  respostas: RespostaUsuario;
  onResponderNovamente?: () => void;
}

// Helper para resolver URL da foto local / estática com garantia para Presidente (UF BR)
export const resolverFotoCandidato = (cand?: Candidato | null, ufPadrao?: string): string => {
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
};

export const ColinhaResumo: React.FC<Props> = ({ respostas, onResponderNovamente }) => {
  const [gerandoJpg, setGerandoJpg] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const { votos, nome, uf, municipio, bairro } = respostas;

  // Se o usuário alternou para a visualização dos resultados
  if (mostrarResultados) {
    return (
      <ResultadosPesquisa
        respostas={respostas}
        onVoltarParaColinha={() => setMostrarResultados(false)}
      />
    );
  }

  const itensColinha: { cargo: string; cand?: Candidato | null; digitos: string; ordem: string }[] = [
    { cargo: 'Deputado(a) Federal', cand: votos.deputado_federal, digitos: '4 dígitos', ordem: '1º' },
    { cargo: 'Deputado(a) Estadual', cand: votos.deputado_estadual, digitos: '5 dígitos', ordem: '2º' },
    { cargo: 'Senador(a) — 1ª Vaga', cand: votos.senador_1, digitos: '3 dígitos', ordem: '3º' },
    { cargo: 'Senador(a) — 2ª Vaga', cand: votos.senador_2, digitos: '3 dígitos', ordem: '4º' },
    { cargo: 'Governador(a)', cand: votos.governador, digitos: '2 dígitos', ordem: '5º' },
    { cargo: 'Presidente', cand: votos.presidente, digitos: '2 dígitos', ordem: '6º' },
  ];

  const textoCompartilhamento = `🗳️ *MINHA ESCOLHA ELEITORAL 2026 — DEMOCRACIAS*\n\n` +
    `📍 *Local:* ${municipio}/${uf} (${bairro})\n\n` +
    `📋 *Votos Declarados (Ordem da Urna):*\n` +
    `1️⃣ *Deputado(a) Federal:* ${votos.deputado_federal?.numero || '—'} - ${votos.deputado_federal?.nomeUrna || '—'} ${votos.deputado_federal?.partido ? `(${votos.deputado_federal.partido})` : ''}\n` +
    `2️⃣ *Deputado(a) Estadual:* ${votos.deputado_estadual?.numero || '—'} - ${votos.deputado_estadual?.nomeUrna || '—'} ${votos.deputado_estadual?.partido ? `(${votos.deputado_estadual.partido})` : ''}\n` +
    `3️⃣ *Senador(a) 1ª Vaga:* ${votos.senador_1?.numero || '—'} - ${votos.senador_1?.nomeUrna || '—'} ${votos.senador_1?.partido ? `(${votos.senador_1.partido})` : ''}\n` +
    `4️⃣ *Senador(a) 2ª Vaga:* ${votos.senador_2?.numero || '—'} - ${votos.senador_2?.nomeUrna || '—'} ${votos.senador_2?.partido ? `(${votos.senador_2.partido})` : ''}\n` +
    `5️⃣ *Governador(a):* ${votos.governador?.numero || '—'} - ${votos.governador?.nomeUrna || '—'} ${votos.governador?.partido ? `(${votos.governador.partido})` : ''}\n` +
    `6️⃣ *Presidente:* ${votos.presidente?.numero || '—'} - ${votos.presidente?.nomeUrna || '—'} ${votos.presidente?.partido ? `(${votos.presidente.partido})` : ''}\n\n` +
    `Participe você também da pesquisa oficial e gere sua colinha: https://chat.democracias.org`;

  const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoCompartilhamento)}`;

  // Compartilhar Colinha (Nativo via Web Share ou Cópia + Download)
  const handleCompartilharColinha = async () => {
    setGerandoJpg(true);
    try {
      // 1. Gerar imagem JPEG/PNG vertical de alta qualidade com fotos
      const { pngBlob, file, dataUrl } = await gerarColinhaJpg(respostas);

      // 2. Se suportar compartilhamento nativo de imagem em dispositivos móveis (WhatsApp, Instagram, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Minha Colinha Eleitoral 2026 — Democracias',
            text: textoCompartilhamento,
            files: [file],
          });
          setCompartilhado(true);
          setTimeout(() => setCompartilhado(false), 4000);
          toast.success('Colinha pronta para compartilhar!');
          return;
        } catch {
          // Fallback para download caso o usuário feche o modal nativo
        }
      }

      // 3. Cópia direta para Clipboard no desktop
      let copiouClipboard = false;
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([clipboardItem]);
          copiouClipboard = true;
        } catch {
          try {
            await navigator.clipboard.writeText(textoCompartilhamento);
          } catch {}
        }
      } else {
        try {
          await navigator.clipboard.writeText(textoCompartilhamento);
        } catch {}
      }

      // 4. Download automático da imagem JPEG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `colinha_eleitoral_2026_${uf}_${municipio.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCompartilhado(true);
      setTimeout(() => setCompartilhado(false), 4000);

      if (copiouClipboard) {
        toast.success('Imagem copiada para a área de transferência e baixada em JPEG!');
      } else {
        toast.success('Imagem JPEG baixada e texto com link copiado!');
      }
    } catch (err) {
      console.error('Erro ao processar colinha:', err);
      try {
        await navigator.clipboard.writeText(textoCompartilhamento);
        toast.info('Texto da colinha copiado para a área de transferência!');
      } catch {
        toast.error('Erro ao processar colinha.');
      }
    } finally {
      setGerandoJpg(false);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-slate-800/90 to-slate-900 p-4 sm:p-5 space-y-4 shadow-2xl animate-message">
      {/* MENSAGEM DE AGRADECIMENTO */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">
          <CheckCircle2 className="size-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-1.5">
            Obrigado, {nome.split(' ')[0]}! <Heart className="size-4 text-rose-400 fill-rose-400" />
          </h3>
          <p className="text-xs text-slate-300">
            Sua pesquisa foi computada e direcionada para o mapeamento eleitoral de <strong>{municipio}/{uf}</strong>.
          </p>
        </div>
      </div>

      {/* NOVO DESIGN AMIGÁVEL DA COLINHA ELEITORAL 2026 */}
      <div className="rounded-3xl bg-slate-950/90 border border-slate-800/90 p-4 sm:p-5 space-y-3.5 shadow-2xl">
        {/* CABEÇALHO DO CARD */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="size-4 text-orange-400" /> Sua Colinha Eleitoral 2026
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            {uf} • {municipio}
          </span>
        </div>

        {/* LISTA VERTICAL DE CARDS FLUTUANTES (FUNDO BRANCO/LEVE + FOTOS CIRCULARES + PÍLULA LARANJA) */}
        <div className="flex flex-col gap-2.5">
          {itensColinha.map(({ cargo, cand, ordem }) => {
            const isBranco = cand?.numero === 'BRANCO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco'));
            const isNulo = cand?.numero === 'NULO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo'));
            const fotoSrc = resolverFotoCandidato(cand, uf);

            return (
              <div
                key={cargo}
                className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-md hover:shadow-lg transition-all"
              >
                {/* FOTO DO CANDIDATO CIRCULAR */}
                <div className="relative size-13 sm:size-15 shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-500/80 shadow-sm flex items-center justify-center">
                  {isBranco ? (
                    <CircleDot className="size-6 text-slate-400" />
                  ) : isNulo ? (
                    <Ban className="size-6 text-rose-500" />
                  ) : fotoSrc ? (
                    <img
                      src={fotoSrc}
                      alt={cand?.nomeUrna || 'Candidato'}
                      loading="eager"
                      className="size-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.photo-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}

                  <div
                    className={`photo-fallback size-full items-center justify-center bg-slate-200 text-slate-600 font-black text-xs ${
                      fotoSrc && !isBranco && !isNulo ? 'hidden' : 'flex'
                    }`}
                  >
                    {cand?.nomeUrna && !isBranco && !isNulo ? (
                      <span>{cand.nomeUrna.slice(0, 2).toUpperCase()}</span>
                    ) : (
                      <User className="size-5 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* HIERARQUIA TIPOGRÁFICA: CARGO, NOME E PARTIDO */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-orange-600 font-mono">{ordem}</span>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{cargo}</p>
                  </div>

                  <h4 className="font-black text-slate-900 text-sm sm:text-base truncate leading-tight mt-0.5">
                    {cand?.nomeUrna || (isBranco ? 'Voto em Branco' : isNulo ? 'Voto Nulo' : 'Não Informado')}
                  </h4>

                  {cand?.partido && !isBranco && !isNulo && (
                    <div className="mt-1">
                      <span className="inline-block text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                        {cand.partido}
                      </span>
                    </div>
                  )}
                </div>

                {/* NÚMERO EM PÍLULA LARANJA VIBRANTE */}
                <div className="shrink-0">
                  <span className="inline-flex items-center justify-center font-mono font-black text-sm sm:text-base px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md">
                    {cand?.numero || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RODAPÉ DO CARD */}
        <div className="pt-2.5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            Oferecido por <strong className="text-white font-black">Democracias</strong> • <span className="text-orange-400 font-mono font-bold">chat.democracias.org</span>
          </p>
        </div>
      </div>

      {/* AÇÕES DE COMPARTILHAMENTO E REPETIÇÃO */}
      <div className="space-y-2.5 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="size-4" /> Compartilhar no WhatsApp
          </a>

          <button
            onClick={handleCompartilharColinha}
            disabled={gerandoJpg}
            className="h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {gerandoJpg ? (
              <Loader2 className="size-4 animate-spin" />
            ) : compartilhado ? (
              <CheckCircle2 className="size-4 text-white" />
            ) : (
              <Share2 className="size-4" />
            )}
            {gerandoJpg ? 'Gerando Imagem...' : compartilhado ? 'Colinha Pronta!' : 'Compartilhar Colinha'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMostrarResultados(true)}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-indigo-400/30"
        >
          <BarChart3 className="size-4.5 text-blue-200" /> 📊 Ver Resultados da Pesquisa em {municipio || uf}
        </button>

        {onResponderNovamente && (
          <button
            type="button"
            onClick={onResponderNovamente}
            className="w-full h-11 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-orange-400 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="size-3.5" /> Responder Novamente / Atualizar Meus Votos
          </button>
        )}
      </div>
    </div>
  );
};
