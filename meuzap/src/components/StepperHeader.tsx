import React from 'react';
import { QrCode, Vote, Users, Send, ShieldCheck } from 'lucide-react';
import type { EtapaFluxo } from '../types';

interface Props {
  etapaAtual: EtapaFluxo;
  onMudarEtapa?: (etapa: EtapaFluxo) => void;
  podeAvancar?: boolean;
}

const ETAPAS: { id: EtapaFluxo; label: string; num: number; icon: any }[] = [
  { id: 'conexao', label: 'Conexão', num: 1, icon: QrCode },
  { id: 'colinha', label: 'Colinha', num: 2, icon: Vote },
  { id: 'contatos', label: 'Contatos', num: 3, icon: Users },
  { id: 'disparo', label: 'Disparo', num: 4, icon: Send },
];

export const StepperHeader: React.FC<Props> = ({ etapaAtual }) => {
  const indiceAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">MeuZap</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Democracias.org
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Disparador de Colinha Personalizada com IA</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-semibold">
            <ShieldCheck className="size-4" />
            <span className="hidden sm:inline">Conexão 100% Efêmera & Segura</span>
            <span className="sm:hidden">Seguro</span>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {ETAPAS.map((etapa, idx) => {
            const Icon = etapa.icon;
            const isAtiva = etapaAtual === etapa.id;
            const isConcluida = idx < indiceAtual;

            return (
              <div key={etapa.id} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isAtiva
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/20'
                        : isConcluida
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isConcluida ? '✓' : etapa.num}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className={`text-xs font-bold truncate ${isAtiva ? 'text-white' : isConcluida ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {etapa.label}
                    </p>
                  </div>
                  {idx < ETAPAS.length - 1 && (
                    <div
                      className={`hidden sm:block flex-1 h-0.5 rounded-full transition-colors ${
                        idx < indiceAtual ? 'bg-emerald-500/50' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
