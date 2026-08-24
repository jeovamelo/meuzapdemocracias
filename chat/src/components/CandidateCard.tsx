import React from 'react';
import { User, CheckCircle2, Award } from 'lucide-react';
import type { Candidato } from '../types';

interface Props {
  candidato: Candidato;
  selecionado?: boolean;
  onSelecionar?: (c: Candidato) => void;
  modoConfirmacao?: boolean;
}

export const CandidateCard: React.FC<Props> = ({
  candidato,
  selecionado,
  onSelecionar,
  modoConfirmacao,
}) => {
  return (
    <div
      onClick={() => onSelecionar && onSelecionar(candidato)}
      className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer ${
        selecionado || modoConfirmacao
          ? 'border-orange-500 bg-gradient-to-b from-orange-500/10 via-slate-800/90 to-slate-900 shadow-xl ring-2 ring-orange-500/30'
          : 'border-slate-800 bg-slate-800/70 hover:border-slate-700 hover:bg-slate-800 hover:shadow-md'
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        {/* FOTO OFICIAL */}
        <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-md">
          {candidato.fotoUrl ? (
            <img
              src={candidato.fotoUrl}
              alt={candidato.nomeUrna}
              className="size-full object-cover"
              onError={(e) => {
                // Fallback para avatar genérico se a foto quebrar
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.photo-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div
            className={`photo-fallback size-full items-center justify-center bg-slate-900 text-slate-500 ${
              candidato.fotoUrl ? 'hidden' : 'flex'
            }`}
          >
            <User className="size-8" />
          </div>
          <span className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
            {candidato.uf}
          </span>
        </div>

        {/* INFORMAÇÕES */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-black font-mono text-orange-400">
              Nº {candidato.numero}
            </span>
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {candidato.cargo}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white leading-tight truncate">
            {candidato.nomeUrna}
          </h3>

          <p className="text-xs text-slate-400 truncate mt-0.5">
            {candidato.partido || candidato.nome}
          </p>
        </div>

        {/* ÍCONE DE SELEÇÃO */}
        {selecionado && (
          <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md animate-in zoom-in-50">
            <CheckCircle2 className="size-5" />
          </div>
        )}
      </div>

      {modoConfirmacao && (
        <div className="border-t border-orange-500/20 bg-orange-500/10 px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-bold text-orange-400 flex items-center gap-1">
            <Award className="size-3.5" /> Candidato Selecionado
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {candidato.uf} • {candidato.numero}
          </span>
        </div>
      )}
    </div>
  );
};
