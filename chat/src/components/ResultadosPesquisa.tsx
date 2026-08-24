import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowLeft, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Loader2, 
  FileCheck,
  User
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
  isBrancoNulo?: boolean;
}

export const ResultadosPesquisa: React.FC<Props> = ({ respostas, onVoltarParaColinha }) => {
  const [tabAtiva, setTabAtiva] = useState<CargoTab>('presidente');
  const [carregando, setCarregando] = useState(true);
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosTse, setCandidatosTse] = useState<any[]>([]);
  const [totalRespondentes, setTotalRespondentes] = useState<number>(0);

  const { uf, municipio, votos } = respostas;

  // Carregar dados de pesquisas_chat e candidatos oficiais do banco
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
      } catch (err) {
        console.error('Erro ao processar resultados:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [uf]);

  // Processar resultados por cargo seguindo as regras de exibição e validação estrita
  const resultadosPorCargo = useMemo(() => {
    const dados: Record<CargoTab, ItemResultado[]> = {
      presidente: [],
      governador: [],
      senador: [],
      dep_federal: [],
      dep_estadual: [],
    };

    // 1. PRESIDENTE
    const votosPres = pesquisas.map((p) => String(p.presidente_numero || '').trim()).filter((num) => num && num !== 'BRANCO' && num !== 'NULO');
    const candsPresTse = candidatosTse.filter((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE');
    
    let totalValidosPres = 0;
    const countPres: Record<string, number> = {};
    votosPres.forEach((num) => {
      const match = candsPresTse.find((c) => String(c.nr_candidato) === num);
      if (match) {
        countPres[num] = (countPres[num] || 0) + 1;
        totalValidosPres += 1;
      }
    });

    const listaPres: ItemResultado[] = candsPresTse.map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countPres[numStr] || 0;
      const pct = totalValidosPres > 0 ? (qtdVotos / totalValidosPres) * 100 : 0;
      const isUser = votos.presidente?.numero === numStr;
      return {
        id: `pres_${numStr}`,
        numero: numStr,
        nomeUrna: c.nm_urna_candidato || c.nm_candidato,
        partido: c.sg_partido || c.nm_partido || '',
        cargo: 'Presidente',
        uf: 'BR',
        sq_candidato: c.sq_candidato ? String(c.sq_candidato) : undefined,
        fotoUrl: c.foto_url || (c.sq_candidato ? `/candidatos/FBR${c.sq_candidato}_div.jpg` : ''),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    listaPres.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaPres.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.presidente = listaPres;

    // 2. GOVERNADOR
    const pesquisasEstado = pesquisas.filter((p) => (p.uf || '').toUpperCase() === uf.toUpperCase());
    const votosGov = pesquisasEstado.map((p) => String(p.governador_numero || '').trim()).filter((num) => num && num !== 'BRANCO' && num !== 'NULO');
    const candsGovTse = candidatosTse.filter(
      (c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
    );

    let totalValidosGov = 0;
    const countGov: Record<string, number> = {};
    votosGov.forEach((num) => {
      const match = candsGovTse.find((c) => String(c.nr_candidato) === num);
      if (match) {
        countGov[num] = (countGov[num] || 0) + 1;
        totalValidosGov += 1;
      }
    });

    const listaGov: ItemResultado[] = candsGovTse.map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countGov[numStr] || 0;
      const pct = totalValidosGov > 0 ? (qtdVotos / totalValidosGov) * 100 : 0;
      const isUser = votos.governador?.numero === numStr;
      return {
        id: `gov_${numStr}`,
        numero: numStr,
        nomeUrna: c.nm_urna_candidato || c.nm_candidato,
        partido: c.sg_partido || c.nm_partido || '',
        cargo: 'Governador(a)',
        uf: uf.toUpperCase(),
        sq_candidato: c.sq_candidato ? String(c.sq_candidato) : undefined,
        fotoUrl: c.foto_url || (c.sq_candidato ? `/candidatos/F${uf.toUpperCase()}${c.sq_candidato}_div.jpg` : ''),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    listaGov.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaGov.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.governador = listaGov;

    // 3. SENADOR
    const votosSen1 = pesquisasEstado.map((p) => String(p.senador1_numero || '').trim()).filter((num) => num && num !== 'BRANCO' && num !== 'NULO');
    const votosSen2 = pesquisasEstado.map((p) => String(p.senador2_numero || '').trim()).filter((num) => num && num !== 'BRANCO' && num !== 'NULO');
    const totalRespondentesEstado = pesquisasEstado.length || 1;

    const candsSenTse = candidatosTse.filter(
      (c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
    );

    const countSen: Record<string, number> = {};
    [...votosSen1, ...votosSen2].forEach((num) => {
      const match = candsSenTse.find((c) => String(c.nr_candidato) === num);
      if (match) {
        countSen[num] = (countSen[num] || 0) + 1;
      }
    });

    const listaSen: ItemResultado[] = candsSenTse.map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countSen[numStr] || 0;
      const pct = (qtdVotos / totalRespondentesEstado) * 100;
      const isUser = votos.senador_1?.numero === numStr || votos.senador_2?.numero === numStr;
      return {
        id: `sen_${numStr}`,
        numero: numStr,
        nomeUrna: c.nm_urna_candidato || c.nm_candidato,
        partido: c.sg_partido || c.nm_partido || '',
        cargo: 'Senador(a)',
        uf: uf.toUpperCase(),
        sq_candidato: c.sq_candidato ? String(c.sq_candidato) : undefined,
        fotoUrl: c.foto_url || (c.sq_candidato ? `/candidatos/F${uf.toUpperCase()}${c.sq_candidato}_div.jpg` : ''),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    listaSen.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaSen.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.senador = listaSen;

    // 4. DEP. FEDERAL (DEP. A)
    const votosFed = pesquisasEstado.map((p) => ({
      numero: String(p.dep_federal_numero || '').trim(),
      nome: p.dep_federal_nome,
      partido: p.dep_federal_partido,
      foto: p.dep_federal_foto,
    })).filter((v) => v.numero && v.numero !== 'BRANCO' && v.numero !== 'NULO');

    const countFed: Record<string, { count: number; info: any; tseMatch?: any }> = {};
    let totalValidosFed = 0;

    votosFed.forEach((v) => {
      const tseMatch = candidatosTse.find(
        (c) => (c.ds_cargo || '').toUpperCase() === 'DEPUTADO FEDERAL' &&
               String(c.nr_candidato) === v.numero &&
               (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
      );

      if (tseMatch || v.numero.length === 4) {
        if (!countFed[v.numero]) {
          countFed[v.numero] = { count: 0, info: v, tseMatch };
        }
        countFed[v.numero].count += 1;
        totalValidosFed += 1;
      }
    });

    const meuCandFed = votos.deputado_federal;
    const rankingFedCompleto: ItemResultado[] = Object.keys(countFed).map((num) => {
      const item = countFed[num];
      const tse = item.tseMatch;
      const pct = totalValidosFed > 0 ? (item.count / totalValidosFed) * 100 : 0;
      const isUser = meuCandFed?.numero === num;
      return {
        id: `fed_${num}`,
        numero: num,
        nomeUrna: tse?.nm_urna_candidato || item.info.nome || `Deputado ${num}`,
        partido: tse?.sg_partido || item.info.partido || '',
        cargo: 'Dep. Federal (Dep. A)',
        uf: uf.toUpperCase(),
        fotoUrl: tse?.foto_url || item.info.foto || resolverFotoCandidato({ ...meuCandFed, numero: num } as any, uf),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    rankingFedCompleto.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    rankingFedCompleto.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.dep_federal = rankingFedCompleto.slice(0, 3);

    // 5. DEPUTADO ESTADUAL
    const votosEst = pesquisasEstado.map((p) => ({
      numero: String(p.dep_estadual_numero || '').trim(),
      nome: p.dep_estadual_nome,
      partido: p.dep_estadual_partido,
      foto: p.dep_estadual_foto,
    })).filter((v) => v.numero && v.numero !== 'BRANCO' && v.numero !== 'NULO');

    const countEst: Record<string, { count: number; info: any; tseMatch?: any }> = {};
    let totalValidosEst = 0;

    votosEst.forEach((v) => {
      const tseMatch = candidatosTse.find(
        (c) => ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'].includes((c.ds_cargo || '').toUpperCase()) &&
               String(c.nr_candidato) === v.numero &&
               (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
      );

      // Tratamento estrito: só computa se for candidato oficial do estado (5 dígitos)
      const isValidCandidate = tseMatch || (v.nome && !v.nome.toLowerCase().includes('candidato ') && !v.nome.toLowerCase().includes('não registrado') && v.numero.length === 5);

      if (isValidCandidate) {
        if (!countEst[v.numero]) {
          countEst[v.numero] = { count: 0, info: v, tseMatch };
        }
        countEst[v.numero].count += 1;
        totalValidosEst += 1;
      }
    });

    const meuCandEst = votos.deputado_estadual;
    const rankingEstCompleto: ItemResultado[] = Object.keys(countEst).map((num) => {
      const item = countEst[num];
      const tse = item.tseMatch;
      const pct = totalValidosEst > 0 ? (item.count / totalValidosEst) * 100 : 0;
      const isUser = meuCandEst?.numero === num;
      return {
        id: `est_${num}`,
        numero: num,
        nomeUrna: tse?.nm_urna_candidato || item.info.nome || `Deputado ${num}`,
        partido: tse?.sg_partido || item.info.partido || '',
        cargo: 'Deputado Estadual',
        uf: uf.toUpperCase(),
        fotoUrl: tse?.foto_url || item.info.foto || resolverFotoCandidato({ ...meuCandEst, numero: num } as any, uf),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    rankingEstCompleto.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    rankingEstCompleto.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.dep_estadual = rankingEstCompleto.slice(0, 3);

    return dados;
  }, [pesquisas, candidatosTse, uf, votos]);

  const tabs: { id: CargoTab; label: string; subtitulo: string; icon: string }[] = [
    { id: 'presidente', label: 'Presidente', subtitulo: 'Nacional', icon: '🇧🇷' },
    { id: 'governador', label: 'Governador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'senador', label: 'Senador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'dep_federal', label: 'Dep. Federal (Dep. A)', subtitulo: `Top 3 • ${uf}`, icon: '📋' },
    { id: 'dep_estadual', label: 'Deputado Estadual', subtitulo: `Top 3 • ${uf}`, icon: '📋' },
  ];

  const listaAtual = resultadosPorCargo[tabAtiva] || [];
  const ehProporcional = tabAtiva === 'dep_federal' || tabAtiva === 'dep_estadual';

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
              Resultados da Enquete Eleitoral 2026
            </h3>
            <p className="text-xs text-slate-400">
              Preferência de votos computada na plataforma independente Democracias
            </p>
          </div>
        </div>

        {/* REGRA 4: DIVULGAÇÃO DO VOLUME TOTAL */}
        <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            {totalRespondentes >= 10000 ? (
              <span className="text-emerald-300 font-bold text-[11px]">
                Base calculada com base em <strong>{totalRespondentes.toLocaleString('pt-BR')}</strong> participantes validados
              </span>
            ) : (
              <span className="text-slate-300 font-medium text-[11px]">
                Amostra independente regional • Resultados consolidados exclusivamente em percentual (%)
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
            ENQUETE INDEPENDENTE
          </span>
        </div>
      </div>

      {/* TABS DE CARGOS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => {
          const ativa = tabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                ativa
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md ring-2 ring-orange-500/20'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              <div className="text-left">
                <p className="leading-tight font-black">{tab.label}</p>
                <p className={`text-[9px] ${ativa ? 'text-orange-100' : 'text-slate-500'}`}>{tab.subtitulo}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* AVISO EXPLICATIVO PARA CARGOS PROPORCIONAIS */}
      {ehProporcional && (
        <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2">
          <Award className="size-4 text-amber-400 shrink-0" />
          <span>
            Exibindo os candidatos oficiais com maior preferência no estado.
          </span>
        </p>
      )}

      {/* LISTAGEM DE RESULTADOS RESPONSIVA */}
      {carregando ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="size-6 animate-spin text-orange-500" />
          <p className="text-xs">Calculando intenção de votos...</p>
        </div>
      ) : listaAtual.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
          <p className="text-xs text-slate-400">Nenhum dado computado ainda para candidatos oficiais deste cargo nesta região.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {listaAtual.map((cand) => {
            const fotoSrc = cand.fotoUrl || resolverFotoCandidato(cand as any, uf);
            const isTop1 = cand.posicao === 1;

            return (
              <div
                key={cand.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-md overflow-hidden ${
                  cand.isVotoUsuario
                    ? 'bg-gradient-to-r from-orange-500/15 via-white to-amber-500/10 border-orange-500 ring-2 ring-orange-500/30 text-slate-900'
                    : 'bg-white border-slate-100 text-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* POSIÇÃO / BADGE */}
                    <div
                      className={`size-8 shrink-0 rounded-full font-black text-xs flex items-center justify-center shadow-sm ${
                        isTop1
                          ? 'bg-amber-400 text-amber-950 font-black ring-2 ring-amber-300'
                          : cand.posicao <= 3
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cand.posicao}º
                    </div>

                    {/* FOTO CIRCULAR */}
                    <div className="relative size-12 sm:size-13 shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-500/80 shadow-sm flex items-center justify-center">
                      {fotoSrc ? (
                        <img
                          src={fotoSrc}
                          alt={cand.nomeUrna}
                          loading="eager"
                          className="size-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.res-fallback');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}

                      <div
                        className={`res-fallback size-full items-center justify-center bg-slate-200 text-slate-600 font-black text-xs ${
                          fotoSrc ? 'hidden' : 'flex'
                        }`}
                      >
                        {cand.nomeUrna ? (
                          <span>{cand.nomeUrna.slice(0, 2).toUpperCase()}</span>
                        ) : (
                          <User className="size-5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* INFORMAÇÕES DO CANDIDATO */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base leading-tight break-words">
                          {cand.nomeUrna}
                        </span>

                        {cand.partido && (
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase shrink-0">
                            {cand.partido}
                          </span>
                        )}

                        {cand.isVotoUsuario && (
                          <span className="text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="size-3" /> Seu Voto
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                        Nº {cand.numero}
                      </p>
                    </div>
                  </div>

                  {/* PERCENTUAL */}
                  <div className="shrink-0 text-left sm:text-right pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="font-mono font-black text-base sm:text-lg text-orange-600">
                      {cand.percentual.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO VISUAL */}
                <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      cand.isVotoUsuario
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : isTop1
                        ? 'bg-orange-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(cand.percentual, 3))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RODAPÉ */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onVoltarParaColinha}
          className="flex-1 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <FileCheck className="size-4 text-orange-400" /> Ver Minha Colinha Eleitoral
        </button>
      </div>
    </div>
  );
};
