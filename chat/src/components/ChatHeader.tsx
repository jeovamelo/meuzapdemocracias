import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  candidatoAtivo?: { nomeUrna: string; numero: string; uf: string } | null;
}

export const ChatHeader: React.FC<Props> = ({ candidatoAtivo }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 shadow-lg">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <div className="flex items-center gap-3">
          {/* CONTAINER COM FUNDO BRANCO PARA DESTACAR A LOGO */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="bg-white px-2.5 py-1 rounded-xl shadow-md border border-white/20 flex items-center justify-center">
              <img
                src="/democraciaslogo.png"
                alt="Democracias"
                className="h-7 sm:h-8 w-auto object-contain transition-transform hover:scale-105"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white">Democracias</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                <Sparkles className="size-2.5" /> Enquete
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-400" />
              Participação Cidadã & Inteligência Eleitoral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {candidatoAtivo && (
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 text-right">
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

          <a
            href="/resultado"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-400 border border-orange-500/40 text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <span className="text-sm">📊</span>
            <span className="hidden sm:inline font-black">Resultado da Enquete</span>
            <span className="sm:hidden font-black">Resultados</span>
          </a>
        </div>
      </div>
    </header>
  );
};
