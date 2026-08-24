import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Vote, 
  TrendingUp, 
  FileCheck,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { RespostaUsuario, Candidato } from '../types';
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
  percentual: number; // Percentual formatado (ex: 42.5)
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
        // 1. Carregar pesquisas registradas para o estado do usuário
        const { data: dataPesquisas, error: errPesq } = await supabase
          .from('pesquisas_chat')
          .select('*');

        if (errPesq) console.warn('Erro ao carregar pesquisas:', errPesq);

        const listaPesquisas = dataPesquisas || [];
        setPesquisas(listaPesquisas);

        // Contagem de participantes únicos validados (por CPF ou por token de respondente)
        const participantesUnicos = new Set<string>();
        listaPesquisas.forEach((p) => {
          const chave = p.cpf ? `cpf_${p.cpf}` : (p.respondente_token ? `tok_${p.respondente_token}` : p.id);
          participantesUnicos.add(chave);
        });
        setTotalRespondentes(participantesUnicos.size);

        // 2. Carregar todos os candidatos cadastrados no TSE (Presidente nível BR + Majoritários do estado)
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

  // Processar resultados por cargo seguindo as regras de exibição
  const resultadosPorCargo = useMemo(() => {
    const dados: Record<CargoTab, ItemResultado[]> = {
      presidente: [],
      governador: [],
      senador: [],
      dep_federal: [],
      dep_estadual: [],
    };

    // 1. PRESIDENTE (Majoritário: Todos os candidatos listados)
    const votosPres = pesquisas.map((p) => p.presidente_numero).filter(Boolean);
    const totalVotosPres = votosPres.length || 1;

    // Mapa de contagem de votos para presidente
    const countPres: Record<string, number> = {};
    votosPres.forEach((num) => {
      countPres[num] = (countPres[num] || 0) + 1;
    });

    const candsPresTse = candidatosTse.filter((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE');
    // Adicionar também eventuais candidatos votados que não estejam no TSE
    const presMap = new Map<string, any>();
    candsPresTse.forEach((c) => presMap.set(String(c.nr_candidato), c));

    // Montar lista completa
    const listaPres: ItemResultado[] = Array.from(presMap.values()).map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countPres[numStr] || 0;
      const pct = (qtdVotos / totalVotosPres) * 100;
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

    // Ordenar decrescente por percentual
    listaPres.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaPres.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.presidente = listaPres;

    // 2. GOVERNADOR (Majoritário: Todos os candidatos listados do estado)
    const pesquisasEstado = pesquisas.filter((p) => (p.uf || '').toUpperCase() === uf.toUpperCase());
    const votosGov = pesquisasEstado.map((p) => p.governador_numero).filter(Boolean);
    const totalVotosGov = votosGov.length || 1;

    const countGov: Record<string, number> = {};
    votosGov.forEach((num) => {
      countGov[num] = (countGov[num] || 0) + 1;
    });

    const candsGovTse = candidatosTse.filter(
      (c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
    );
    const govMap = new Map<string, any>();
    candsGovTse.forEach((c) => govMap.set(String(c.nr_candidato), c));

    const listaGov: ItemResultado[] = Array.from(govMap.values()).map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countGov[numStr] || 0;
      const pct = (qtdVotos / totalVotosGov) * 100;
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

    // 3. SENADOR (Majoritário: Todos os candidatos listados do estado)
    const votosSen1 = pesquisasEstado.map((p) => p.senador1_numero).filter(Boolean);
    const votosSen2 = pesquisasEstado.map((p) => p.senador2_numero).filter(Boolean);
    const totalRespondentesEstado = pesquisasEstado.length || 1;

    const countSen: Record<string, number> = {};
    [...votosSen1, ...votosSen2].forEach((num) => {
      countSen[num] = (countSen[num] || 0) + 1;
    });

    const candsSenTse = candidatosTse.filter(
      (c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && (c.sg_uf || '').toUpperCase() === uf.toUpperCase()
    );
    const senMap = new Map<string, any>();
    candsSenTse.forEach((c) => senMap.set(String(c.nr_candidato), c));

    const listaSen: ItemResultado[] = Array.from(senMap.values()).map((c) => {
      const numStr = String(c.nr_candidato);
      const qtdVotos = countSen[numStr] || 0;
      // Percentual de respondentes que votaram neste senador
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

    // 4. DEPUTADO FEDERAL (Proporcional: Top 3 + Candidato do Usuário se fora do Top 3)
    const votosFed = pesquisasEstado.map((p) => ({
      numero: p.dep_federal_numero,
      nome: p.dep_federal_nome,
      partido: p.dep_federal_partido,
      foto: p.dep_federal_foto,
    })).filter((v) => v.numero);

    const totalVotosFed = votosFed.length || 1;
    const countFed: Record<string, { count: number; info: any }> = {};

    votosFed.forEach((v) => {
      if (!countFed[v.numero]) {
        countFed[v.numero] = { count: 0, info: v };
      }
      countFed[v.numero].count += 1;
    });

    // Se o candidato do usuário não estiver na contagem ainda, adiciona com 0 ou o voto dele
    const meuCandFed = votos.deputado_federal;
    if (meuCandFed && meuCandFed.numero && !meuCandFed.isBrancoNulo && !countFed[meuCandFed.numero]) {
      countFed[meuCandFed.numero] = {
        count: 0,
        info: {
          numero: meuCandFed.numero,
          nome: meuCandFed.nomeUrna,
          partido: meuCandFed.partido,
          foto: meuCandFed.fotoUrl,
        },
      };
    }

    const rankingFedCompleto: ItemResultado[] = Object.keys(countFed).map((num) => {
      const item = countFed[num];
      const pct = (item.count / totalVotosFed) * 100;
      const isUser = meuCandFed?.numero === num;
      return {
        id: `fed_${num}`,
        numero: num,
        nomeUrna: item.info.nome || `Deputado ${num}`,
        partido: item.info.partido || '',
        cargo: 'Deputado(a) Federal',
        uf: uf.toUpperCase(),
        fotoUrl: item.info.foto || resolverFotoCandidato({ ...meuCandFed, numero: num } as any, uf),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    rankingFedCompleto.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    rankingFedCompleto.forEach((item, idx) => { item.posicao = idx + 1; });

    // Regra Proporcional: Apenas os 3 primeiros colocados
    const top3Fed = rankingFedCompleto.slice(0, 3);
    const usuarioNoTop3Fed = top3Fed.some((i) => i.isVotoUsuario);

    if (!usuarioNoTop3Fed && meuCandFed && meuCandFed.numero && !meuCandFed.isBrancoNulo) {
      // Localizar o candidato do usuário no ranking completo
      const itemUsuario = rankingFedCompleto.find((i) => i.isVotoUsuario);
      if (itemUsuario) {
        top3Fed.push(itemUsuario);
      } else {
        top3Fed.push({
          id: `fed_user_${meuCandFed.numero}`,
          numero: meuCandFed.numero,
          nomeUrna: meuCandFed.nomeUrna,
          partido: meuCandFed.partido || '',
          cargo: 'Deputado(a) Federal',
          uf: uf.toUpperCase(),
          fotoUrl: resolverFotoCandidato(meuCandFed, uf),
          percentual: 0,
          posicao: rankingFedCompleto.length + 1,
          isVotoUsuario: true,
        });
      }
    }
    dados.dep_federal = top3Fed;

    // 5. DEPUTADO ESTADUAL (Proporcional: Top 3 + Candidato do Usuário se fora do Top 3)
    const votosEst = pesquisasEstado.map((p) => ({
      numero: p.dep_estadual_numero,
      nome: p.dep_estadual_nome,
      partido: p.dep_estadual_partido,
      foto: p.dep_estadual_foto,
    })).filter((v) => v.numero);

    const totalVotosEst = votosEst.length || 1;
    const countEst: Record<string, { count: number; info: any }> = {};

    votosEst.forEach((v) => {
      if (!countEst[v.numero]) {
        countEst[v.numero] = { count: 0, info: v };
      }
      countEst[v.numero].count += 1;
    });

    const meuCandEst = votos.deputado_estadual;
    if (meuCandEst && meuCandEst.numero && !meuCandEst.isBrancoNulo && !countEst[meuCandEst.numero]) {
      countEst[meuCandEst.numero] = {
        count: 0,
        info: {
          numero: meuCandEst.numero,
          nome: meuCandEst.nomeUrna,
          partido: meuCandEst.partido,
          foto: meuCandEst.fotoUrl,
        },
      };
    }

    const rankingEstCompleto: ItemResultado[] = Object.keys(countEst).map((num) => {
      const item = countEst[num];
      const pct = (item.count / totalVotosEst) * 100;
      const isUser = meuCandEst?.numero === num;
      return {
        id: `est_${num}`,
        numero: num,
        nomeUrna: item.info.nome || `Deputado ${num}`,
        partido: item.info.partido || '',
        cargo: 'Deputado(a) Estadual',
        uf: uf.toUpperCase(),
        fotoUrl: item.info.foto || resolverFotoCandidato({ ...meuCandEst, numero: num } as any, uf),
        percentual: pct,
        posicao: 0,
        isVotoUsuario: isUser,
      };
    });

    rankingEstCompleto.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    rankingEstCompleto.forEach((item, idx) => { item.posicao = idx + 1; });

    // Regra Proporcional: Apenas os 3 primeiros colocados
    const top3Est = rankingEstCompleto.slice(0, 3);
    const usuarioNoTop3Est = top3Est.some((i) => i.isVotoUsuario);

    if (!usuarioNoTop3Est && meuCandEst && meuCandEst.numero && !meuCandEst.isBrancoNulo) {
      const itemUsuario = rankingEstCompleto.find((i) => i.isVotoUsuario);
      if (itemUsuario) {
        top3Est.push(itemUsuario);
      } else {
        top3Est.push({
          id: `est_user_${meuCandEst.numero}`,
          numero: meuCandEst.numero,
          nomeUrna: meuCandEst.nomeUrna,
          partido: meuCandEst.partido || '',
          cargo: 'Deputado(a) Estadual',
          uf: uf.toUpperCase(),
          fotoUrl: resolverFotoCandidato(meuCandEst, uf),
          percentual: 0,
          posicao: rankingEstCompleto.length + 1,
          isVotoUsuario: true,
        });
      }
    }
    dados.dep_estadual = top3Est;

    return dados;
  }, [pesquisas, candidatosTse, uf, votos]);

  const tabs: { id: CargoTab; label: string; subtitulo: string; icon: string }[] = [
    { id: 'presidente', label: 'Presidente', subtitulo: 'Nacional', icon: '🇧🇷' },
    { id: 'governador', label: 'Governador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'senador', label: 'Senador(a)', subtitulo: `${uf}`, icon: '🏛️' },
    { id: 'dep_federal', label: 'Dep. Federal', subtitulo: `Top 3 • ${uf}`, icon: '📋' },
    { id: 'dep_estadual', label: 'Dep. Estadual', subtitulo: `Top 3 • ${uf}`, icon: '📋' },
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
          className="flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300 transition-colors bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30"
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
              Resultados da Pesquisa Eleitoral 2026
            </h3>
            <p className="text-xs text-slate-400">
              Intenção de votos computada na plataforma Democracias
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
                Amostra representativa regional • Resultados consolidados exclusivamente em percentual (%)
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
            TSE 2026
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
              className={`px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
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
            Exibindo os <strong>3 primeiros colocados</strong> no estado, acompanhados da sua escolha com a respectiva colocação.
          </span>
        </p>
      )}

      {/* LISTAGEM DE RESULTADOS (CARDS COM BARRA DE PERCENTUAL E SEM NÚMERO ABSOLUTO) */}
      {carregando ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="size-6 animate-spin text-orange-500" />
          <p className="text-xs">Calculando intenção de votos...</p>
        </div>
      ) : listaAtual.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
          <p className="text-xs text-slate-400">Nenhum dado computado ainda para este cargo nesta região.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {listaAtual.map((cand) => {
            const fotoSrc = cand.fotoUrl || resolverFotoCandidato(cand as any, uf);
            const isTop1 = cand.posicao === 1;

            return (
              <div
                key={cand.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-md ${
                  cand.isVotoUsuario
                    ? 'bg-gradient-to-r from-orange-500/15 via-white to-amber-500/10 border-orange-500 ring-2 ring-orange-500/30 text-slate-900'
                    : 'bg-white border-slate-100 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
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
                      <span className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {cand.nomeUrna}
                      </span>

                      {cand.partido && (
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 uppercase">
                          {cand.partido}
                        </span>
                      )}

                      {cand.isVotoUsuario && (
                        <span className="text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Seu Voto
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                      Nº {cand.numero}
                    </p>
                  </div>

                  {/* PERCENTUAL (RESTRIÇÃO ABSOLUTA: APENAS %) */}
                  <div className="shrink-0 text-right">
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

      {/* RODAPÉ COM CHAMADA PARA VOLTAR E COMPARTILHAR */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onVoltarParaColinha}
          className="flex-1 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-md transition-all active:scale-95"
        >
          <FileCheck className="size-4 text-orange-400" /> Ver Minha Colinha Eleitoral
        </button>
      </div>
    </div>
  );
};
