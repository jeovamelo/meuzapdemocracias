import React from 'react';
import { CircleDot, Ban, UserCheck, Vote } from 'lucide-react';
import type { Candidato } from '../types';
import { CandidateCard } from './CandidateCard';

interface Props {
  cargoTitulo: string;
  candidatos: Candidato[];
  candidatoSelecionadoTemp?: Candidato | null;
  onSelecionar: (candidato: Candidato) => void;
  onVotoBranco: () => void;
  onVotoNulo: () => void;
}

export const MajoritarySelect: React.FC<Props> = ({
  cargoTitulo,
  candidatos,
  candidatoSelecionadoTemp,
  onSelecionar,
  onVotoBranco,
  onVotoNulo,
}) => {
  // Ordenar candidatos por número eleitoral crescente
  const ordenados = [...candidatos].sort((a, b) => {
    const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 999999;
    const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 999999;
    return numA - numB;
  });

  return (
    <div className="space-y-3 w-full animate-message">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Vote className="size-4 text-orange-400" />
          Opções para {cargoTitulo} (Por Número)
        </div>
      </div>

      {/* LISTA DE CANDIDATOS ORDENADOS POR NÚMERO */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
        {ordenados.map((cand) => (
          <CandidateCard
            key={cand.id}
            candidato={cand}
            tituloCargo={cargoTitulo}
            selecionado={candidatoSelecionadoTemp?.id === cand.id}
            onSelecionar={onSelecionar}
          />
        ))}
      </div>

      {/* BOTÕES BRANCO E NULO */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
        <button
          type="button"
          onClick={onVotoBranco}
          className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
        >
          <CircleDot className="size-3.5 text-slate-300" /> Votar em Branco
        </button>

        <button
          type="button"
          onClick={onVotoNulo}
          className="h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
        >
          <Ban className="size-3.5 text-rose-400" /> Votar Nulo
        </button>
      </div>

      <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
        <UserCheck className="size-3 text-orange-400" />
        Selecione na lista ou digite o número no campo abaixo.
      </p>
    </div>
  );
};
