import React, { useState } from 'react';
import { Send, CheckCircle2, Copy, Sparkles, Heart, FileCheck, Award } from 'lucide-react';
import type { RespostaUsuario } from '../types';

interface Props {
  respostas: RespostaUsuario;
  onResponderNovamente?: () => void;
}

export const ColinhaResumo: React.FC<Props> = ({ respostas, onResponderNovamente }) => {
  const [copiado, setCopiado] = useState(false);
  const { votos, nome, uf, municipio, bairro } = respostas;

  const itensColinha = [
    { cargo: 'Deputado Estadual', cand: votos.deputado_estadual },
    { cargo: 'Deputado Federal', cand: votos.deputado_federal },
    { cargo: '1º Senador', cand: votos.senador_1 },
    { cargo: '2º Senador', cand: votos.senador_2 },
    { cargo: 'Governador', cand: votos.governador },
    { cargo: 'Presidente', cand: votos.presidente },
  ];

  const textoCompartilhamento = `🗳️ *MINHA ESCOLHA ELEITORAL 2026 — DEMOCRACIAS*\n\n` +
    `👤 *Eleitor:* ${nome}\n` +
    `📍 *Local:* ${municipio}/${uf} (${bairro})\n\n` +
    `📋 *Votos Declarados:*\n` +
    `• Dep. Estadual: ${votos.deputado_estadual?.numero || '—'} - ${votos.deputado_estadual?.nomeUrna || '—'}\n` +
    `• Dep. Federal: ${votos.deputado_federal?.numero || '—'} - ${votos.deputado_federal?.nomeUrna || '—'}\n` +
    `• 1º Senador: ${votos.senador_1?.numero || '—'} - ${votos.senador_1?.nomeUrna || '—'}\n` +
    `• 2º Senador: ${votos.senador_2?.numero || '—'} - ${votos.senador_2?.nomeUrna || '—'}\n` +
    `• Governador: ${votos.governador?.numero || '—'} - ${votos.governador?.nomeUrna || '—'}\n` +
    `• Presidente: ${votos.presidente?.numero || '—'} - ${votos.presidente?.nomeUrna || '—'}\n\n` +
    `Participe você também da pesquisa oficial: https://chat.democracias.org`;

  const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoCompartilhamento)}`;

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoCompartilhamento);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-slate-800/90 to-slate-900 p-5 space-y-4 shadow-2xl animate-message">
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

      {/* CARD DA COLINHA ELEITORAL */}
      <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="size-4" /> Sua Colinha Eleitoral 2026
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {uf} • {municipio}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {itensColinha.map(({ cargo, cand }) => (
            <div key={cargo} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{cargo}</p>
                <p className="font-bold text-white truncate max-w-[140px]">{cand?.nomeUrna || 'Não Informado'}</p>
              </div>
              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/30">
                {cand?.numero || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES DE COMPARTILHAMENTO E REPETIÇÃO */}
      <div className="space-y-2.5 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <Send className="size-4" /> Compartilhar no WhatsApp
          </a>

          <button
            onClick={handleCopiar}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {copiado ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            {copiado ? 'Copiado com Sucesso!' : 'Copiar Colinha'}
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
