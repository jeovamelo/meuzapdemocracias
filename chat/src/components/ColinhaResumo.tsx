import React, { useState } from 'react';
import { Send, CheckCircle2, Copy, Sparkles, Heart, FileCheck, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RespostaUsuario } from '../types';
import { gerarColinhaJpg } from '../lib/gerarColinhaJpg';

interface Props {
  respostas: RespostaUsuario;
  onResponderNovamente?: () => void;
}

export const ColinhaResumo: React.FC<Props> = ({ respostas, onResponderNovamente }) => {
  const [gerandoJpg, setGerandoJpg] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { votos, nome, uf, municipio, bairro } = respostas;

  const itensColinha = [
    { cargo: 'Deputada ou Deputado Federal', cand: votos.deputado_federal, digitos: '4 Dígitos', ordem: '1º' },
    { cargo: 'Deputada ou Deputado Estadual', cand: votos.deputado_estadual, digitos: '5 Dígitos', ordem: '2º' },
    { cargo: 'Senadora ou Senador (1ª vaga)', cand: votos.senador_1, digitos: '3 Dígitos', ordem: '3º' },
    { cargo: 'Senadora ou Senador (2ª vaga)', cand: votos.senador_2, digitos: '3 Dígitos', ordem: '4º' },
    { cargo: 'Governadora ou Governador', cand: votos.governador, digitos: '2 Dígitos', ordem: '5º' },
    { cargo: 'Presidente da República', cand: votos.presidente, digitos: '2 Dígitos', ordem: '6º' },
  ];

  const textoCompartilhamento = `🗳️ *MINHA ESCOLHA ELEITORAL 2026 — DEMOCRACIAS*\n\n` +
    `📍 *Local:* ${municipio}/${uf} (${bairro})\n\n` +
    `📋 *Votos Declarados (Ordem da Urna):*\n` +
    `1️⃣ *Dep. Federal:* ${votos.deputado_federal?.numero || '—'} - ${votos.deputado_federal?.nomeUrna || '—'} ${votos.deputado_federal?.partido ? `(${votos.deputado_federal.partido})` : ''}\n` +
    `2️⃣ *Dep. Estadual:* ${votos.deputado_estadual?.numero || '—'} - ${votos.deputado_estadual?.nomeUrna || '—'} ${votos.deputado_estadual?.partido ? `(${votos.deputado_estadual.partido})` : ''}\n` +
    `3️⃣ *1º Senador:* ${votos.senador_1?.numero || '—'} - ${votos.senador_1?.nomeUrna || '—'} ${votos.senador_1?.partido ? `(${votos.senador_1.partido})` : ''}\n` +
    `4️⃣ *2º Senador:* ${votos.senador_2?.numero || '—'} - ${votos.senador_2?.nomeUrna || '—'} ${votos.senador_2?.partido ? `(${votos.senador_2.partido})` : ''}\n` +
    `5️⃣ *Governador:* ${votos.governador?.numero || '—'} - ${votos.governador?.nomeUrna || '—'} ${votos.governador?.partido ? `(${votos.governador.partido})` : ''}\n` +
    `6️⃣ *Presidente:* ${votos.presidente?.numero || '—'} - ${votos.presidente?.nomeUrna || '—'} ${votos.presidente?.partido ? `(${votos.presidente.partido})` : ''}\n\n` +
    `Participe você também da pesquisa oficial e gere sua colinha: https://chat.democracias.org`;

  const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoCompartilhamento)}`;

  // Copiar Colinha + Gerar Imagem JPG vertical organizada com o link
  const handleCopiarEGerarImagem = async () => {
    setGerandoJpg(true);
    try {
      // 1. Copiar texto formatado com link para a área de transferência
      await navigator.clipboard.writeText(textoCompartilhamento);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 4000);

      // 2. Gerar imagem JPG vertical de alta qualidade
      const { file, dataUrl } = await gerarColinhaJpg(respostas);

      // 3. Se suportar compartilhamento nativo de imagem em dispositivos móveis
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Minha Colinha Eleitoral 2026 — Democracias',
            text: textoCompartilhamento,
            files: [file],
          });
          toast.success('Colinha em JPG pronta para compartilhar!');
          return;
        } catch {
          // Usuário cancelou ou fallback para download
        }
      }

      // 4. Download automático da imagem JPG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `colinha_eleitoral_2026_${uf}_${municipio.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Imagem JPG gerada e texto com link copiado!');
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
      <div className="rounded-2xl bg-slate-950/95 border border-slate-800 p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="size-4" /> Sua Colinha Eleitoral 2026
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {uf} • {municipio}
          </span>
        </div>

        {/* LISTA VERTICAL: 1 VOTO ABAIXO DO OUTRO */}
        <div className="flex flex-col gap-2">
          {itensColinha.map(({ cargo, cand, ordem }) => {
            const isBranco = cand?.numero === 'BRANCO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Branco'));
            const isNulo = cand?.numero === 'NULO' || (cand?.isBrancoNulo && cand?.nomeUrna.includes('Nulo'));

            return (
              <div
                key={cargo}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-orange-400 font-mono">{ordem}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{cargo}</p>
                  </div>

                  <p className="font-black text-white text-sm truncate mt-0.5">
                    {cand?.nomeUrna || (isBranco ? 'Voto em Branco' : isNulo ? 'Voto Nulo' : 'Não Informado')}
                  </p>

                  {cand?.partido && !isBranco && !isNulo && (
                    <span className="inline-block text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase mt-1">
                      {cand.partido}
                    </span>
                  )}
                </div>

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
            {gerandoJpg ? 'Gerando Imagem JPG...' : copiado ? 'Copiado & Baixado!' : 'Copiar Colinha (JPG)'}
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
