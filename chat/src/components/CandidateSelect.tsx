import React, { useState } from 'react';
import { Search, UserCheck } from 'lucide-react';
import type { Candidato } from '../types';
import { CandidateCard } from './CandidateCard';

interface Props {
  candidatos: Candidato[];
  uf: string;
  onSelecionar: (candidato: Candidato) => void;
}

export const CandidateSelect: React.FC<Props> = ({ candidatos, uf, onSelecionar }) => {
  const [busca, setBusca] = useState('');
  const [candidatoTemp, setCandidatoTemp] = useState<Candidato | null>(null);

  const filtrados = candidatos.filter(
    (c) =>
      c.nomeUrna.toLowerCase().includes(busca.toLowerCase()) ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.numero.includes(busca) ||
      c.cargo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-3 w-full animate-message">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar candidato de ${uf} por nome ou número...`}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
        {filtrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 text-center text-slate-400">
            <p className="text-sm font-semibold">Nenhum candidato encontrado para os termos informados.</p>
            <p className="text-xs text-slate-500 mt-1">Tente buscar apenas pelo número ou nome de urna.</p>
          </div>
        ) : (
          filtrados.map((c) => (
            <CandidateCard
              key={c.id}
              candidato={c}
              selecionado={candidatoTemp?.id === c.id}
              onSelecionar={(cand) => {
                setCandidatoTemp(cand);
                onSelecionar(cand);
              }}
            />
          ))
        )}
      </div>

      <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
        <UserCheck className="size-3.5 text-orange-400" />
        Toque no candidato desejado para prosseguir com a confirmação.
      </p>
    </div>
  );
};
