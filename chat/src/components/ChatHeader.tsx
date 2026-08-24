import React from 'react';
import { Vote, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  candidatoAtivo?: { nomeUrna: string; numero: string; uf: string } | null;
}

export const ChatHeader: React.FC<Props> = ({ candidatoAtivo }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800/90 border border-slate-700/80 p-1 shadow-md">
            <img src="/logo_icon.png" alt="Democracias" className="size-full object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-white">Democracias</h1>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                <Sparkles className="size-2.5" /> Pesquisa
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-400" />
              Participação Cidadã & Inteligência Eleitoral
            </p>
          </div>
        </div>

        {candidatoAtivo && (
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 text-right">
            <div>
              <p className="text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                {candidatoAtivo.nomeUrna}
              </p>
              <p className="font-mono text-[10px] font-black text-orange-400">
                {candidatoAtivo.numero} • {candidatoAtivo.uf}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
