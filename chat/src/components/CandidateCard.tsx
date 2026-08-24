import React from 'react';
import { User, CheckCircle2, Award, Ban, CircleDot, AlertTriangle } from 'lucide-react';
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
  const isBranco =
    candidato.numero === 'BRANCO' ||
    Boolean(candidato.isBrancoNulo && candidato.nomeUrna?.toLowerCase().includes('branco'));

  const isNulo =
    candidato.numero === 'NULO' ||
    candidato.partido === 'NÃO REGISTRADO' ||
    candidato.partido?.toLowerCase().includes('legenda') ||
    candidato.nomeUrna?.toLowerCase().includes('nulo') ||
    (Boolean(candidato.isBrancoNulo) && !isBranco);

  return (
    <div
      onClick={() => onSelecionar && onSelecionar(candidato)}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        onSelecionar ? 'cursor-pointer' : ''
      } ${
        isNulo
          ? 'border-rose-500 bg-gradient-to-b from-rose-500/10 via-slate-900/90 to-slate-950 shadow-xl ring-2 ring-rose-500/30'
          : isBranco
          ? 'border-slate-600 bg-slate-800/90 shadow-xl ring-2 ring-slate-600/50'
          : selecionado || modoConfirmacao
          ? 'border-orange-500 bg-gradient-to-b from-orange-500/10 via-slate-800/90 to-slate-900 shadow-xl ring-2 ring-orange-500/30'
          : 'border-slate-800 bg-slate-800/70 hover:border-slate-700 hover:bg-slate-800 hover:shadow-md'
      }`}
    >
      <div className="p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4">
        {/* FOTO OFICIAL OU ÍCONE DESTACADO */}
        <div
          className={`relative size-14 sm:size-16 shrink-0 rounded-2xl overflow-hidden shadow-md flex items-center justify-center border-2 ${
            isNulo
              ? 'bg-rose-950/60 border-rose-500 text-rose-400'
              : isBranco
              ? 'bg-slate-950 border-slate-700 text-slate-300'
              : 'bg-slate-950 border-slate-700/80'
          }`}
        >
          {isBranco ? (
            <CircleDot className="size-7 text-slate-300" />
          ) : isNulo ? (
            <div className="flex flex-col items-center justify-center">
              <Ban className="size-6 text-rose-500" />
              <span className="text-[8px] font-black tracking-wider text-rose-400 mt-0.5">NULO</span>
            </div>
          ) : (
            <>
              {candidato.fotoUrl ? (
                <img
                  src={candidato.fotoUrl}
                  alt={candidato.nomeUrna}
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
                  candidato.fotoUrl ? 'hidden' : 'flex'
                }`}
              >
                {candidato.nomeUrna ? (
                  <span>{candidato.nomeUrna.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <User className="size-7" />
                )}
              </div>
            </>
          )}

          {!isBranco && !isNulo && candidato.uf && (
            <span className="absolute bottom-0 inset-x-0 bg-black/75 py-0.2 text-center text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
              {candidato.uf}
            </span>
          )}
        </div>

        {/* INFORMAÇÕES DO VOTO / CANDIDATO */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {/* BADGE DE NÚMERO */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black font-mono ${
                isBranco
                  ? 'bg-slate-700 text-slate-200 border border-slate-600'
                  : isNulo
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                  : 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
              }`}
            >
              {candidato.numero === 'BRANCO' || candidato.numero === 'NULO'
                ? candidato.numero
                : `Nº ${candidato.numero}`}
            </span>

            {/* BADGE DE CLASSIFICAÇÃO */}
            {isNulo ? (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black font-mono bg-rose-600 text-white shadow-sm uppercase">
                <Ban className="size-2.5" /> VOTO NULO
              </span>
            ) : isBranco ? (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black font-mono bg-slate-600 text-white shadow-sm uppercase">
                VOTO EM BRANCO
              </span>
            ) : candidato.partido ? (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                {candidato.partido}
              </span>
            ) : null}

            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {tituloCargo || candidato.cargo}
            </span>
          </div>

          {/* TÍTULO PRINCIPAL */}
          <h3
            className={`text-sm sm:text-base font-black leading-tight truncate ${
              isNulo ? 'text-rose-400' : 'text-white'
            }`}
          >
            {isNulo
              ? `Voto Nulo (Nº ${candidato.numero})`
              : isBranco
              ? 'Voto em Branco'
              : candidato.nomeUrna}
          </h3>

          {/* DESCRIÇÃO DE VALIDAÇÃO */}
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {isNulo
              ? `Número ${candidato.numero} não encontrado como candidato nominal registrado`
              : isBranco
              ? 'Voto em branco registrado para o cargo'
              : candidato.nome && candidato.nome !== candidato.nomeUrna
              ? `${candidato.nome} • ${candidato.partido || ''}`
              : candidato.partido
              ? `Partido: ${candidato.partido}`
              : ''}
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
        <div
          className={`border-t px-4 py-2 flex items-center justify-between text-xs ${
            isNulo
              ? 'border-rose-500/30 bg-rose-500/15'
              : isBranco
              ? 'border-slate-700 bg-slate-800/80'
              : 'border-orange-500/20 bg-orange-500/10'
          }`}
        >
          <span
            className={`font-bold flex items-center gap-1.5 text-[11px] ${
              isNulo ? 'text-rose-300' : isBranco ? 'text-slate-300' : 'text-orange-400'
            }`}
          >
            {isNulo ? (
              <>
                <AlertTriangle className="size-3.5 text-rose-400 shrink-0" />
                <span>Confirmando <strong>VOTO NULO</strong> para {tituloCargo || candidato.cargo}</span>
              </>
            ) : isBranco ? (
              <>
                <CircleDot className="size-3.5 text-slate-300 shrink-0" />
                <span>Confirmando <strong>Voto em Branco</strong> para {tituloCargo || candidato.cargo}</span>
              </>
            ) : (
              <>
                <Award className="size-3.5 text-orange-400 shrink-0" />
                <span>Confirmando Voto para {tituloCargo || candidato.cargo}</span>
              </>
            )}
          </span>

          <span className="text-[10px] text-slate-400 font-mono font-bold">
            {candidato.numero}
          </span>
        </div>
      )}
    </div>
  );
};
