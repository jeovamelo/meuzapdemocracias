import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowLeft, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Loader2, 
  FileCheck,
  User,
  Ban,
  CircleDot
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { RespostaUsuario } from '../types';
import { resolverFotoCandidato } from './ColinhaResumo';

interface Props {
  respostas: RespostaUsuario;
  onVoltarParaColinha: () => void;
}

type CargoTab = 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual';

interface ItemResultado {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: string;
  uf: string;
  sq_candidato?: string;
  fotoUrl?: string;
  percentual: number;
  posicao: number;
  isVotoUsuario: boolean;
  votosContados: number;
}

interface EstatisticasCargo {
  totalValidos: number;
  totalNulos: number;
  totalBrancos: number;
  totalGeral: number;
  pctValidos: number;
  pctNulos: number;
  pctBrancos: number;
}

export const ResultadosPesquisa: React.FC<Props> = ({ respostas, onVoltarParaColinha }) => {
  const [tabAtiva, setTabAtiva] = useState<CargoTab>('presidente');
  const [carregando, setCarregando] = useState(true);
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosTse, setCandidatosTse] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [totalRespondentes, setTotalRespondentes] = useState<number>(0);

  const { uf, municipio, votos } = respostas;

  // Carregar dados de pesquisas_chat, candidatos oficiais do TSE e campanhas cadastradas
  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      try {
        const { data: dataPesquisas, error: errPesq } = await supabase
          .from('pesquisas_chat')
          .select('*');

        if (errPesq) console.warn('Erro ao carregar pesquisas:', errPesq);

        const listaPesquisas = dataPesquisas || [];
        setPesquisas(listaPesquisas);

        // Contagem de participantes únicos validados
        const participantesUnicos = new Set<string>();
        listaPesquisas.forEach((p) => {
          const chave = p.cpf ? `cpf_${p.cpf}` : (p.respondente_token ? `tok_${p.respondente_token}` : p.id);
          participantesUnicos.add(chave);
        });
        setTotalRespondentes(participantesUnicos.size);

        // Carregar candidatos cadastrados no TSE
        const { data: dataTse, error: errTse } = await supabase
          .from('tse_candidatos')
          .select('*')
          .or(`sg_uf.eq.BR,sg_uf.eq.${uf.toUpperCase()}`);

        if (errTse) console.warn('Erro ao carregar candidatos TSE:', errTse);
        setCandidatosTse(dataTse || []);

        // Carregar campanhas registradas no sistema
        const { data: dataCamp } = await supabase
          .from('campaigns')
          .select('*');

        setCampanhas(dataCamp || []);
      } catch (err) {
        console.error('Erro ao processar resultados:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [uf]);

  // Processar resultados por cargo com validação ESTRITA e redirecionamento de inexistentes para NULO
  const dadosConsolidados = useMemo(() => {
    const pesquisasEstado = pesquisas.filter((p) => (p.uf || '').toUpperCase() === uf.toUpperCase());

    const encontrarCandidatoOficial = (numero: string, cargoKey: string, ufAlvo: string) => {
      const num = String(numero || '').trim();
      if (!num || num === 'BRANCO' || num === 'NULO') return null;

      let tse: any = null;
      if (cargoKey === 'presidente') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE' && String(c.nr_candidato) === num);
      } else if (cargoKey === 'governador') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufAlvo.toUpperCase());
      } else if (cargoKey === 'senador') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufAlvo.toUpperCase());
      } else if (cargoKey === 'dep_federal') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'DEPUTADO FEDERAL' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufAlvo.toUpperCase());
      } else if (cargoKey === 'dep_estadual') {
        tse = candidatosTse.find((c) => ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'].includes((c.ds_cargo || '').toUpperCase()) && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufAlvo.toUpperCase());
      }

      if (tse) {
        return {
          numero: num,
          nomeUrna: tse.nm_urna_candidato || tse.nm_candidato,
          partido: tse.sg_partido || tse.nm_partido || '',
          cargo: tse.ds_cargo,
          uf: tse.sg_uf || ufAlvo,
          sq_candidato: tse.sq_candidato ? String(tse.sq_candidato) : undefined,
          fotoUrl: tse.foto_url || (tse.sq_candidato ? `/candidatos/F${(tse.sg_uf || 'BR').toUpperCase()}${tse.sq_candidato}_div.jpg` : ''),
        };
      }

      const camp = campanhas.find((c) => String(c.nr_candidato) === num && (cargoKey === 'presidente' || (c.uf || '').toUpperCase() === ufAlvo.toUpperCase()));
      if (camp) {
        return {
          numero: num,
          nomeUrna: camp.nome_urna || camp.nome_candidato,
          partido: camp.partido || '',
          cargo: camp.cargo,
          uf: camp.uf || ufAlvo,
          fotoUrl: camp.foto_candidato_url || '',
        };
      }

      return null;
    };

    const processarCargo = (
      votosBrutos: { numero?: any; nome?: any }[],
      cargoKey: CargoTab,
      cargoLabel: string,
      ufAlvo: string,
      meuVotoNumero?: string
    ) => {
      let totalValidos = 0;
      let totalNulos = 0;
      let totalBrancos = 0;
      const countCands: Record<string, { count: number; info: any }> = {};

      votosBrutos.forEach((v) => {
        const num = String(v.numero || '').trim();
        const nomeStr = String(v.nome || '').toLowerCase();

        if (!num || num === 'NULO' || nomeStr.includes('voto nulo') || nomeStr.includes('não registrado')) {
          totalNulos += 1;
          return;
        }

        if (num === 'BRANCO' || nomeStr.includes('branco')) {
          totalBrancos += 1;
          return;
        }

        const matchOficial = encontrarCandidatoOficial(num, cargoKey, ufAlvo);

        if (matchOficial) {
          if (!countCands[num]) {
            countCands[num] = { count: 0, info: matchOficial };
          }
          countCands[num].count += 1;
          totalValidos += 1;
        } else {
          // REDIRECIONADO PARA NULO AUTOMATICAMENTE
          totalNulos += 1;
        }
      });

      const totalGeral = totalValidos + totalNulos + totalBrancos;

      const itens: ItemResultado[] = Object.keys(countCands).map((num) => {
        const item = countCands[num];
        const info = item.info;
        const pct = totalValidos > 0 ? (item.count / totalValidos) * 100 : 0;
        const isUser = meuVotoNumero === num;

        return {
          id: `${cargoKey}_${num}`,
          numero: num,
          nomeUrna: info.nomeUrna,
          partido: info.partido,
          cargo: cargoLabel,
          uf: ufAlvo,
          sq_candidato: info.sq_candidato,
          fotoUrl: info.fotoUrl || resolverFotoCandidato({ numero: num, cargo: cargoLabel, uf: ufAlvo } as any, ufAlvo),
          percentual: pct,
          posicao: 0,
          isVotoUsuario: isUser,
          votosContados: item.count,
        };
      });

      itens.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
      itens.forEach((item, idx) => { item.posicao = idx + 1; });

      const estatisticas: EstatisticasCargo = {
        totalValidos,
        totalNulos,
        totalBrancos,
        totalGeral,
        pctValidos: totalGeral > 0 ? (totalValidos / totalGeral) * 100 : 0,
        pctNulos: totalGeral > 0 ? (totalNulos / totalGeral) * 100 : 0,
        pctBrancos: totalGeral > 0 ? (totalBrancos / totalGeral) * 100 : 0,
      };

      return { itens, estatisticas };
    };

    const pres = processarCargo(
      pesquisas.map((p) => ({ numero: p.presidente_numero, nome: p.presidente_nome })),
      'presidente',
      'Presidente',
      'BR',
      votos.presidente?.numero
    );

    const gov = processarCargo(
      pesquisasEstado.map((p) => ({ numero: p.governador_numero, nome: p.governador_nome })),
      'governador',
      'Governador(a)',
      uf.toUpperCase(),
      votos.governador?.numero
    );

    const votosSen1 = pesquisasEstado.map((p) => ({ numero: p.senador1_numero, nome: p.senador1_nome }));
    const votosSen2 = pesquisasEstado.map((p) => ({ numero: p.senador2_numero, nome: p.senador2_nome }));
    const sen = processarCargo(
      [...votosSen1, ...votosSen2],
      'senador',
      'Senador(a)',
      uf.toUpperCase(),
      votos.senador_1?.numero || votos.senador_2?.numero
    );

    const fed = processarCargo(
      pesquisasEstado.map((p) => ({ numero: p.dep_federal_numero, nome: p.dep_federal_nome })),
      'dep_federal',
      'Dep. Federal (Dep. A)',
      uf.toUpperCase(),
      votos.deputado_federal?.numero
    );

    const est = processarCargo(
      pesquisasEstado.map((p) => ({ numero: p.dep_estadual_numero, nome: p.dep_estadual_nome })),
      'dep_estadual',
      'Deputado Estadual',
      uf.toUpperCase(),
      votos.deputado_estadual?.numero
    );

    return {
      ranking: {
        presidente: pres.itens,
        governador: gov.itens,
        senador: sen.itens,
        dep_federal: fed.itens,
        dep_estadual: est.itens,
      },
      estatisticas: {
        presidente: pres.estatisticas,
        governador: gov.estatisticas,
        senador: sen.estatisticas,
        dep_federal: fed.estatisticas,
        dep_estadual: est.estatisticas,
      },
    };
  }, [pesquisas, candidatosTse, campanhas, uf, votos]);

  const resultadosPorCargo = dadosConsolidados.ranking;
  const estatisticasPorCargo = dadosConsolidados.estatisticas;

  const tabs: { id: CargoTab; label: string; subtitulo: string; icon: string }[] = [
    { id: 'presidente', label: 'Presidente', subtitulo: 'Nacional', icon: '🇧🇷' },
    { id: 'governador', label: 'Governador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'senador', label: 'Senador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'dep_federal', label: 'Dep. Federal (Dep. A)', subtitulo: `${uf}`, icon: '📋' },
    { id: 'dep_estadual', label: 'Deputado Estadual', subtitulo: `${uf}`, icon: '📋' },
  ];

  const listaAtual = resultadosPorCargo[tabAtiva] || [];
  const statsAtual = estatisticasPorCargo[tabAtiva];

  return (
    <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 via-slate-900/95 to-slate-950 p-4 sm:p-5 space-y-4 shadow-2xl animate-message">
      {/* CABEÇALHO COM BOTÃO VOLTAR */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={onVoltarParaColinha}
          className="flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300 transition-colors bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" /> Voltar para Minha Colinha
        </button>

        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          📍 {municipio}/{uf}
        </span>
      </div>

      {/* TÍTULO PRINCIPAL E SELO DE PRIVACIDADE */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              Resultados Oficiais da Enquete
            </h3>
            <p className="text-xs text-slate-400">
              Preferência de votos nominais válidos e percentuais por cargo
            </p>
          </div>
        </div>

        {totalRespondentes >= 10000 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Mais de {totalRespondentes.toLocaleString('pt-BR')} eleitores validados na amostra.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <span>Amostra regional com validação de candidaturas oficiais.</span>
          </div>
        )}
      </div>

      {/* ABAS DE NAVEGAÇÃO ENTRE OS CARGOS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTabAtiva(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
              tabAtiva === tab.id
                ? 'bg-orange-500 text-white border-orange-400 shadow-md ring-2 ring-orange-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CARREGAMENTO OU LISTAGEM DE RESULTADOS */}
      {carregando ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="size-6 animate-spin text-orange-500" />
          <span className="text-xs font-bold">Consolidando votos válidos...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* BARRA DE ESTATÍSTICAS TRANSPARENTES (VÁLIDOS / NULOS / BRANCOS) */}
          {statsAtual && (
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block font-sans font-bold">Votos Válidos</span>
                <span className="text-xs font-black text-emerald-400">
                  {statsAtual.pctValidos.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[9px] text-slate-500 block">({statsAtual.totalValidos})</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans font-bold">Votos Nulos</span>
                <span className="text-xs font-black text-rose-400">
                  {statsAtual.pctNulos.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[9px] text-slate-500 block">({statsAtual.totalNulos})</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans font-bold">Em Branco</span>
                <span className="text-xs font-black text-slate-300">
                  {statsAtual.pctBrancos.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[9px] text-slate-500 block">({statsAtual.totalBrancos})</span>
              </div>
            </div>
          )}

          {listaAtual.length === 0 ? (
            <div className="py-10 text-center bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-1">
              <p className="text-xs font-bold text-slate-300">Nenhum voto registrado para candidatos oficiais</p>
              <p className="text-[11px] text-slate-400">
                Os votos deste cargo foram em branco ou nulos no estado {uf}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {listaAtual.map((cand) => {
                const isTop1 = cand.posicao === 1;

                return (
                  <div
                    key={cand.id}
                    className={`rounded-2xl border p-3 sm:p-3.5 space-y-2.5 transition-all ${
                      cand.isVotoUsuario
                        ? 'border-orange-500/80 bg-gradient-to-r from-orange-500/20 via-slate-900 to-slate-900 shadow-lg ring-1 ring-orange-500/40'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* BADGE DE POSIÇÃO */}
                        <div
                          className={`size-7 rounded-full flex items-center justify-center font-black text-xs font-mono shrink-0 shadow-sm ${
                            isTop1
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : cand.posicao <= 3
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cand.posicao}º
                        </div>

                        {/* FOTO DO CANDIDATO */}
                        <div className="relative size-10 sm:size-11 shrink-0 rounded-full overflow-hidden bg-slate-950 border border-slate-700 shadow flex items-center justify-center">
                          {cand.fotoUrl ? (
                            <img
                              src={cand.fotoUrl}
                              alt={cand.nomeUrna}
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
                            className={`photo-fallback size-full items-center justify-center bg-slate-900 text-slate-400 font-black text-[10px] ${
                              cand.fotoUrl ? 'hidden' : 'flex'
                            }`}
                          >
                            {cand.nomeUrna ? (
                              <span>{cand.nomeUrna.slice(0, 2).toUpperCase()}</span>
                            ) : (
                              <User className="size-4" />
                            )}
                          </div>
                        </div>

                        {/* NOME E PARTIDO */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-white text-xs sm:text-sm leading-tight truncate">
                              {cand.nomeUrna}
                            </h4>

                            {cand.isVotoUsuario && (
                              <span className="text-[9px] font-black uppercase bg-orange-500 text-white px-1.5 py-0.2 rounded-full shadow-sm">
                                Seu Voto
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Nº {cand.numero} {cand.partido ? `• ${cand.partido}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* PERCENTUAL */}
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-base sm:text-lg text-orange-400">
                          {cand.percentual.toFixed(1).replace('.', ',')}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">votos válidos</span>
                      </div>
                    </div>

                    {/* BARRA DE PROGRESSO */}
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cand.isVotoUsuario
                            ? 'bg-gradient-to-r from-orange-400 to-amber-400'
                            : isTop1
                            ? 'bg-orange-500'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(cand.percentual, 3))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
