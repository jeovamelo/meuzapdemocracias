import React, { useState } from 'react';
import { Send, CheckCircle2, Share2, Copy, Sparkles, Heart } from 'lucide-react';
import type { Candidato } from '../types';

interface Props {
  candidato: Candidato;
  nomeUsuario: string;
}

export const ShareBanner: React.FC<Props> = ({ candidato, nomeUsuario }) => {
  const [copiado, setCopiado] = useState(false);

  const textoCompartilhamento = `🗳️ Olá! Acabei de participar da pesquisa cívica da plataforma Democracias e declarei meu apoio ao candidato ${candidato.nomeUrna} (${candidato.numero} - ${candidato.uf}). Participe você também e fortaleça nossa campanha: https://chat.democracias.org`;

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
            Obrigado, {nomeUsuario.split(' ')[0]}! <Heart className="size-4 text-rose-400 fill-rose-400" />
          </h3>
          <p className="text-xs text-slate-300">
            Seu apoio foi registrado e direcionado para a campanha de <strong>{candidato.nomeUrna} ({candidato.numero})</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <Sparkles className="size-3" /> Mobilize Seus Contatos
          </span>
          <span>Compartilhe Agora</span>
        </div>
        <p className="text-xs text-slate-300 italic bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
          "{textoCompartilhamento}"
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
          {copiado ? 'Link Copiado!' : 'Copiar Texto'}
        </button>
      </div>
    </div>
  );
};
