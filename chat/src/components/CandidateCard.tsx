import React from 'react';
import { User, CheckCircle2, Award, Ban, CircleDot } from 'lucide-react';
import type { Candidato } from '../types';

interface Props {
  candidato: Candidato;
  selecionado?: boolean;
  onSelecionar?: (c: Candidato) => void;
  modoConfirmacao?: boolean;
  tituloCargo?: string;
}

export const CandidateCard: React.FC<Props> = ({
  candidato,
  selecionado,
  onSelecionar,
  modoConfirmacao,
  tituloCargo,
}) => {
  const isBranco = candidato.numero === 'BRANCO' || candidato.isBrancoNulo && candidato.nomeUrna.includes('Branco');
  const isNulo = candidato.numero === 'NULO' || candidato.isBrancoNulo && candidato.nomeUrna.includes('Nulo');

  return (
    <div
      onClick={() => onSelecionar && onSelecionar(candidato)}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        onSelecionar ? 'cursor-pointer' : ''
      } ${
        selecionado || modoConfirmacao
          ? isBranco || isNulo
            ? 'border-slate-600 bg-slate-800/90 shadow-xl ring-2 ring-slate-600/50'
            : 'border-orange-500 bg-gradient-to-b from-orange-500/10 via-slate-800/90 to-slate-900 shadow-xl ring-2 ring-orange-500/30'
          : 'border-slate-800 bg-slate-800/70 hover:border-slate-700 hover:bg-slate-800 hover:shadow-md'
      }`}
    >
      <div className="p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4">
        {/* FOTO OFICIAL OU ÍCONE */}
        <div className="relative size-14 sm:size-16 shrink-0 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-md flex items-center justify-center">
          {isBranco ? (
            <CircleDot className="size-7 text-slate-300" />
          ) : isNulo ? (
            <Ban className="size-7 text-rose-400" />
          ) : candidato.fotoUrl ? (
            <img
              src={candidato.fotoUrl}
              alt={candidato.nomeUrna}
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.photo-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}

          {!isBranco && !isNulo && (
            <div
              className={`photo-fallback size-full items-center justify-center bg-slate-900 text-slate-500 ${
                candidato.fotoUrl ? 'hidden' : 'flex'
              }`}
            >
              <User className="size-7" />
            </div>
          )}

          {!isBranco && !isNulo && candidato.uf && (
            <span className="absolute bottom-0 inset-x-0 bg-black/75 py-0.2 text-center text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
              {candidato.uf}
            </span>
          )}
        </div>

        {/* INFORMAÇÕES */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black font-mono ${
                isBranco
                  ? 'bg-slate-700 text-slate-200 border border-slate-600'
                  : isNulo
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
              }`}
            >
              {isBranco || isNulo ? candidato.numero : `Nº ${candidato.numero}`}
            </span>
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {tituloCargo || candidato.cargo}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
            {candidato.nomeUrna}
          </h3>

          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {isBranco || isNulo ? 'Voto registrado' : candidato.partido || candidato.nome}
          </p>
        </div>

        {/* ÍCONE DE SELEÇÃO */}
        {selecionado && (
          <div className="shrink-0 flex size-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
            <CheckCircle2 className="size-4" />
          </div>
        )}
      </div>

      {modoConfirmacao && (
        <div className="border-t border-orange-500/20 bg-orange-500/10 px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-bold text-orange-400 flex items-center gap-1 text-[11px]">
            <Award className="size-3.5" /> Confirmando Voto para {tituloCargo || candidato.cargo}
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">
            {candidato.numero}
          </span>
        </div>
      )}
    </div>
  );
};
