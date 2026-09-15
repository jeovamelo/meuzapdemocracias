import React, { useState, useEffect } from 'react';
import { Search, X, User, Check, Ban, Loader2 } from 'lucide-react';
import type { Candidato } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  cargoNome: string;
  uf: string;
  candidatoAtual?: Candidato | null;
  onSelecionar: (candidato: Candidato) => void;
  onFechar: () => void;
}

export const ModalBuscaCandidato: React.FC<Props> = ({
  cargoNome,
  uf,
  candidatoAtual,
  onSelecionar,
  onFechar,
}) => {
  const [busca, setBusca] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      try {
        const ufUpper = (cargoNome.toLowerCase().includes('presid') ? 'BR' : uf).toUpperCase();
        let query = supabase
          .from('tse_candidatos')
          .select('id, nm_candidato, nm_urna_candidato, nr_candidato, ds_cargo, sg_partido, nm_partido, sg_uf, sq_candidato')
          .eq('sg_uf', ufUpper);

        if (cargoNome.toLowerCase().includes('federal')) {
          query = query.eq('ds_cargo', 'DEPUTADO FEDERAL');
        } else if (cargoNome.toLowerCase().includes('estadual')) {
          query = query.in('ds_cargo', ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL']);
        } else if (cargoNome.toLowerCase().includes('senad')) {
          query = query.eq('ds_cargo', 'SENADOR');
        } else if (cargoNome.toLowerCase().includes('govern')) {
          query = query.eq('ds_cargo', 'GOVERNADOR');
        } else if (cargoNome.toLowerCase().includes('presid')) {
          query = query.ilike('ds_cargo', '%PRESIDENTE%');
        }

        const { data, error } = await query.order('nm_urna_candidato', { ascending: true }).limit(250);

        if (!error && data && ativo) {
          const formatados: Candidato[] = data.map((d: any) => ({
            id: String(d.id || d.nr_candidato),
            nome: d.nm_candidato || d.nm_urna_candidato,
            nomeUrna: d.nm_urna_candidato || d.nm_candidato,
            numero: String(d.nr_candidato),
            cargo: cargoNome,
            partido: d.sg_partido || d.nm_partido || '',
            uf: d.sg_uf || ufUpper,
            sq_candidato: d.sq_candidato ? String(d.sq_candidato) : undefined,
          }));
          setCandidatos(formatados);
        }
      } catch (err) {
        console.warn('Erro ao carregar candidatos:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => { ativo = false; };
  }, [cargoNome, uf]);

  const filtrados = candidatos.filter((c) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      c.nomeUrna.toLowerCase().includes(termo) ||
      c.nome.toLowerCase().includes(termo) ||
      c.numero.includes(termo) ||
      c.partido.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">Escolher {cargoNome}</h3>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {cargoNome.toLowerCase().includes('presid') ? 'BR' : uf.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Candidaturas oficiais registradas no TSE</p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome de urna, número ou partido..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de Candidatos */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {/* Opção Voto em Branco / Nulo */}
          <button
            type="button"
            onClick={() => {
              onSelecionar({
                id: 'branco_nulo_' + cargoNome,
                nome: 'Voto em Branco / Nulo',
                nomeUrna: 'BRANCO / NULO',
                numero: 'BRANCO',
                cargo: cargoNome,
                partido: 'Sem partido',
                uf,
                isBrancoNulo: true,
              });
              onFechar();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-600 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                <Ban className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Votar em Branco / Nulo</p>
                <p className="text-xs text-slate-400">Declarar intenção de voto nulo ou em branco para este cargo</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 px-2.5 py-1 rounded-lg bg-slate-800">
              BRANCO
            </span>
          </button>

          {carregando ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="size-6 animate-spin text-emerald-400" />
              <p className="text-sm">Carregando candidatos oficiais...</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">Nenhum candidato encontrado com "{busca}".</p>
              <p className="text-xs text-slate-500 mt-1">Tente pesquisar apenas pelo número da candidatura.</p>
            </div>
          ) : (
            filtrados.map((cand) => {
              const isSelecionado = candidatoAtual?.numero === cand.numero;
              const isPres = (cand.cargo || '').toLowerCase().includes('presid');
              const ufItem = isPres ? 'BR' : uf.toUpperCase();
              const fotoUrl = cand.sq_candidato ? `/candidatos/F${ufItem}${cand.sq_candidato}_div.jpg` : undefined;

              return (
                <button
                  key={cand.id + '_' + cand.numero}
                  type="button"
                  onClick={() => {
                    onSelecionar(cand);
                    onFechar();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isSelecionado
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={cand.nomeUrna}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="size-6 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{cand.nomeUrna}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {cand.partido ? `Partido: ${cand.partido} • ` : ''}{cand.nome}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-lg font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                      {cand.numero}
                    </span>
                    {isSelecionado && <Check className="size-5 text-emerald-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
