import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  User, 
  X,
  Sparkles,
  Award
} from 'lucide-react';
import type { Candidato } from '../types';

interface Props {
  cargoNome: string;
  uf?: string;
  ufInicial?: string;
  candidatos: Candidato[];
  onSelecionarCandidato: (candidato: Candidato) => void;
  onFechar: () => void;
}

export const ModalConsultaCandidatos: React.FC<Props> = ({
  cargoNome,
  uf,
  ufInicial,
  candidatos,
  onSelecionarCandidato,
  onFechar,
}) => {
  const ufExibir = uf || ufInicial || 'BR';
  const [busca, setBusca] = useState('');

  // Ordenar candidatos rigorosamente em ordem alfabética por nome de urna / nome
  const candidatosOrdenados = useMemo(() => {
    const lista = [...candidatos];
    lista.sort((a, b) => (a.nomeUrna || a.nome).localeCompare(b.nomeUrna || b.nome, 'pt-BR'));
    return lista;
  }, [candidatos]);

  // Filtrar pela busca
  const candidatosFiltrados = useMemo(() => {
    if (!busca.trim()) return candidatosOrdenados;
    const termo = busca.toLowerCase().trim();
    return candidatosOrdenados.filter(
      (c) =>
        (c.nomeUrna && c.nomeUrna.toLowerCase().includes(termo)) ||
        (c.nome && c.nome.toLowerCase().includes(termo)) ||
        (c.numero && c.numero.includes(termo)) ||
        (c.partido && c.partido.toLowerCase().includes(termo))
    );
  }, [candidatosOrdenados, busca]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onFechar}
              className="size-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all border border-slate-700 shrink-0 cursor-pointer"
              title="Voltar / Digitar número"
            >
              <ArrowLeft className="size-5 text-orange-400" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Candidatos a {cargoNome}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 shrink-0">
                  {ufExibir}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Ordem alfabética • {candidatos.length} candidatos disponíveis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* CAMPO DE BUSCA E BOTÃO VOLTAR SUPERIOR */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do candidato, número ou partido..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Exibindo <strong>{candidatosFiltrados.length}</strong> de {candidatos.length} candidatos
            </span>
            <button
              type="button"
              onClick={onFechar}
              className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Voltar para digitação
            </button>
          </div>
        </div>

        {/* LISTA ROLÁVEL DE CANDIDATOS EM ORDEM ALFABÉTICA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {candidatosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users className="size-8 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Nenhum candidato encontrado</p>
              <p className="text-xs text-slate-500">Tente buscar por outro termo ou nome de urna.</p>
            </div>
          ) : (
            candidatosFiltrados.map((c, idx) => (
              <div
                key={c.id || `${c.numero}_${idx}`}
                onClick={() => {
                  onSelecionarCandidato(c);
                  onFechar();
                }}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/60 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:shadow-md hover:ring-1 hover:ring-orange-500/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* FOTO OU AVATAR */}
                  <div className="relative size-12 sm:size-13 shrink-0 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 group-hover:border-orange-500/60 shadow flex items-center justify-center">
                    {c.fotoUrl ? (
                      <img
                        src={c.fotoUrl}
                        alt={c.nomeUrna}
                        loading="lazy"
                        className="size-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = 'none';
                          const parent = img.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.c-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className={`c-fallback size-full items-center justify-center bg-slate-900 text-slate-400 font-black text-xs ${
                        c.fotoUrl ? 'hidden' : 'flex'
                      }`}
                    >
                      {c.nomeUrna ? (
                        <span>{c.nomeUrna.slice(0, 2).toUpperCase()}</span>
                      ) : (
                        <User className="size-5" />
                      )}
                    </div>
                  </div>

                  {/* NOME E PARTIDO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-black text-white text-sm group-hover:text-orange-400 transition-colors truncate">
                        {c.nomeUrna}
                      </h4>

                      {c.partido && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase shrink-0">
                          {c.partido}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {c.nome && c.nome !== c.nomeUrna ? c.nome : c.cargo}
                    </p>
                  </div>
                </div>

                {/* NÚMERO DO CANDIDATO E BOTÃO VOTAR */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">Número</span>
                    <span className="font-mono font-black text-base sm:text-lg text-orange-400">
                      {c.numero}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl bg-orange-500 group-hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow transition-all active:scale-95"
                  >
                    <span>Votar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RODAPÉ DO MODAL COM BOTÃO DE RETORNO */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <UserCheck className="size-4 text-orange-400" />
            Toque em um candidato para confirmar o voto.
          </p>

          <button
            type="button"
            onClick={onFechar}
            className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar ao Chat</span>
          </button>
        </div>

      </div>
    </div>
  );
};
