import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, Heart, FileCheck, Image as ImageIcon, Loader2, User, Ban, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import type { RespostaUsuario, Candidato } from '../types';
import { gerarColinhaJpg } from '../lib/gerarColinhaJpg';

interface Props {
  respostas: RespostaUsuario;
  onResponderNovamente?: () => void;
}

export const ColinhaResumo: React.FC<Props> = ({ respostas, onResponderNovamente }) => {
  const [gerandoJpg, setGerandoJpg] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { votos, nome, uf, municipio, bairro } = respostas;

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

  // Copiar Colinha + Gerar Imagem JPEG vertical com fotos e link
  const handleCopiarEGerarImagem = async () => {
    setGerandoJpg(true);
    try {
      // 1. Copiar texto formatado com link para a área de transferência
      await navigator.clipboard.writeText(textoCompartilhamento);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 4000);

      // 2. Gerar imagem JPEG vertical de alta qualidade com fotos
      const { file, dataUrl } = await gerarColinhaJpg(respostas);

      // 3. Se suportar compartilhamento nativo de imagem em dispositivos móveis
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Minha Colinha Eleitoral 2026 — Democracias',
            text: textoCompartilhamento,
            files: [file],
          });
          toast.success('Colinha em JPEG pronta para compartilhar!');
          return;
        } catch {
          // Fallback para download se o usuário fechar o menu nativo
        }
      }

      // 4. Download automático da imagem JPEG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `colinha_eleitoral_2026_${uf}_${municipio.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Imagem JPEG gerada e texto copiado com o link!');
    } catch (err) {
      console.error('Erro ao gerar colinha:', err);
      toast.info('Texto da colinha copiado para a área de transferência!');
    } finally {
      setGerandoJpg(false);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-slate-800/90 to-slate-900 p-4 sm:p-5 space-y-4 shadow-2xl animate-message">
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

      {/* CARD DA COLINHA ELEITORAL — DISPOSIÇÃO VERTICAL UM ABAIXO DO OUTRO */}
      <div className="rounded-2xl bg-slate-950/95 border border-slate-800 p-3.5 sm:p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="size-4" /> Sua Colinha Eleitoral 2026
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {uf} • {municipio}
          </span>
        </div>

        {/* LISTA VERTICAL: 1 VOTO ABAIXO DO OUTRO COM FOTO, NOME, NÚMERO E PARTIDO */}
        <div className="flex flex-col gap-2.5">
          {itensColinha.map(({ cargo, cand, ordem }) => {
            const isBranco = cand?.numero === 'BRANCO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco'));
            const isNulo = cand?.numero === 'NULO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo'));

            return (
              <div
                key={cargo}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-colors shadow-sm"
              >
                {/* FOTO DO CANDIDATO */}
                <div className="relative size-12 sm:size-14 shrink-0 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow flex items-center justify-center">
                  {isBranco ? (
                    <CircleDot className="size-6 text-slate-400" />
                  ) : isNulo ? (
                    <Ban className="size-6 text-rose-400" />
                  ) : cand?.fotoUrl ? (
                    <img
                      src={cand.fotoUrl}
                      alt={cand.nomeUrna}
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
                    className={`photo-fallback size-full items-center justify-center bg-slate-900 text-slate-400 font-black text-xs ${
                      cand?.fotoUrl && !isBranco && !isNulo ? 'hidden' : 'flex'
                    }`}
                  >
                    {cand?.nomeUrna && !isBranco && !isNulo ? (
                      <span>{cand.nomeUrna.slice(0, 2).toUpperCase()}</span>
                    ) : (
                      <User className="size-5" />
                    )}
                  </div>
                </div>

                {/* INFORMAÇÕES: CARGO, NOME DE URNA E PARTIDO */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-orange-400 font-mono">{ordem}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{cargo}</p>
                  </div>

                  <p className="font-black text-white text-sm truncate mt-0.5">
                    {cand?.nomeUrna || (isBranco ? 'Voto em Branco' : isNulo ? 'Voto Nulo' : 'Não Informado')}
                  </p>

                  {cand?.partido && !isBranco && !isNulo && (
                    <span className="inline-block text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25 uppercase mt-0.5">
                      {cand.partido}
                    </span>
                  )}
                </div>

                {/* NÚMERO DESTACADO */}
                <div className="shrink-0 flex flex-col items-end">
                  <span className="font-mono font-black text-sm sm:text-base px-3 py-1 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-400 border border-orange-500/35 shadow-sm">
                    {cand?.numero || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-center">
          <p className="text-[10px] text-slate-500">
            Oferecido por <strong className="text-slate-400">Democracias</strong> • <span className="text-orange-400/80 font-mono">chat.democracias.org</span>
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
            className="h-12 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="size-4" /> Compartilhar no WhatsApp
          </a>

          <button
            onClick={handleCopiarEGerarImagem}
            disabled={gerandoJpg}
            className="h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {gerandoJpg ? (
              <Loader2 className="size-4 animate-spin" />
            ) : copiado ? (
              <CheckCircle2 className="size-4 text-white" />
            ) : (
              <ImageIcon className="size-4" />
            )}
            {gerandoJpg ? 'Gerando Imagem JPEG...' : copiado ? 'Copiado & Baixado!' : 'Copiar Colinha (JPEG)'}
          </button>
        </div>

        {onResponderNovamente && (
          <button
            type="button"
            onClick={onResponderNovamente}
            className="w-full h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-orange-400 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="size-3.5" /> Responder Novamente / Atualizar Meus Votos
          </button>
        )}
      </div>
    </div>
  );
};
