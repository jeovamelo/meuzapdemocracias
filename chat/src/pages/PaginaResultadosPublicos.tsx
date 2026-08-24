import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  MapPin, 
  ShieldCheck, 
  Loader2, 
  Vote, 
  TrendingUp, 
  ChevronRight, 
  ArrowLeft, 
  User,
  Instagram,
  Sparkles,
  Users,
  Ban,
  CircleDot,
  CheckCircle2
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase } from '../lib/supabase';
import { resolverFotoCandidato } from '../components/ColinhaResumo';
import { gerarCardCandidatoJpg } from '../lib/gerarCardCandidatoJpg';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type ModoVisualizacao = 'panorama' | 'detalhado';
type CargoFiltro = 'todos' | 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual';
type TipoAmostragem = 'geral' | 'voto_unico';

export interface ItemRankeado {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: string;
  uf: string;
  sq_candidato?: string;
  fotoUrl?: string;
  percentual: number;
  percentualGeral: number;
  posicao: number;
  votosContados: number;
}

export interface EstatisticasCargo {
  totalValidos: number;
  totalNulos: number;
  totalBrancos: number;
  totalGeral: number;
  pctValidos: number;
  pctNulos: number;
  pctBrancos: number;
}

export const PaginaResultadosPublicos: React.FC = () => {
  const [ufSelecionada, setUfSelecionada] = useState('CE');
  const [cargoSelecionado, setCargoSelecionado] = useState<CargoFiltro>('todos');
  const [modo, setModo] = useState<ModoVisualizacao>('panorama');
  const [tipoAmostragem, setTipoAmostragem] = useState<TipoAmostragem>('geral');
  const [carregando, setCarregando] = useState(true);
  const [gerandoCardId, setGerandoCardId] = useState<string | null>(null);

  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosTse, setCandidatosTse] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [totalRespondentesUnicos, setTotalRespondentesUnicos] = useState<number>(0);

  // Carregar dados de pesquisas_chat, candidatos oficiais do TSE e campanhas cadastradas
  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const { data: dataPesquisas } = await supabase
          .from('pesquisas_chat')
          .select('*');

        const listaPesq = dataPesquisas || [];
        setPesquisas(listaPesq);

        const participantesUnicos = new Set<string>();
        listaPesq.forEach((p) => {
          const chave = p.cpf ? `cpf_${p.cpf}` : (p.respondente_token ? `tok_${p.respondente_token}` : p.id);
          participantesUnicos.add(chave);
        });
        setTotalRespondentesUnicos(participantesUnicos.size);

        const { data: dataTse } = await supabase
          .from('tse_candidatos')
          .select('*')
          .or(`sg_uf.eq.BR,sg_uf.eq.${ufSelecionada.toUpperCase()}`);

        setCandidatosTse(dataTse || []);

        const { data: dataCamp } = await supabase
          .from('campaigns')
          .select('*');

        setCampanhas(dataCamp || []);
      } catch (e) {
        console.error('Erro ao carregar resultados públicos:', e);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [ufSelecionada]);

  // Lista de pesquisas filtradas de acordo com a amostragem selecionada (Geral vs Voto Único)
  const pesquisasFiltradasAmostragem = useMemo(() => {
    if (tipoAmostragem === 'geral') {
      return pesquisas;
    }

    // Modo VOTO ÚNICO: mantém apenas o voto mais recente de cada participante único (por CPF ou Token)
    const mapaUnicos = new Map<string, any>();
    const ordenadas = [...pesquisas].sort((a, b) => {
      const dataA = new Date(a.atualizado_em || a.criado_em || 0).getTime();
      const dataB = new Date(b.atualizado_em || b.criado_em || 0).getTime();
      return dataA - dataB;
    });

    ordenadas.forEach((p) => {
      const chave = p.cpf ? `cpf_${p.cpf}` : (p.respondente_token ? `tok_${p.respondente_token}` : p.id);
      mapaUnicos.set(chave, p);
    });

    return Array.from(mapaUnicos.values());
  }, [pesquisas, tipoAmostragem]);

  // Processar ranking consolidado por cargo com validação ESTRITA e redirecionamento de inexistentes para NULO
  const dadosConsolidados = useMemo(() => {
    const basePesquisas = pesquisasFiltradasAmostragem;
    const pesquisasUf = basePesquisas.filter((p) => (p.uf || '').toUpperCase() === ufSelecionada.toUpperCase());

    // Função de validação estrita de candidatura oficial
    const encontrarCandidatoOficial = (numero: string, cargoKey: string, uf: string) => {
      const num = String(numero || '').trim();
      if (!num || num === 'BRANCO' || num === 'NULO') return null;

      // 1. Busca no banco oficial do TSE
      let tse: any = null;
      if (cargoKey === 'presidente') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE' && String(c.nr_candidato) === num);
      } else if (cargoKey === 'governador') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === uf.toUpperCase());
      } else if (cargoKey === 'senador') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === uf.toUpperCase());
      } else if (cargoKey === 'dep_federal') {
        tse = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'DEPUTADO FEDERAL' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === uf.toUpperCase());
      } else if (cargoKey === 'dep_estadual') {
        tse = candidatosTse.find((c) => ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'].includes((c.ds_cargo || '').toUpperCase()) && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === uf.toUpperCase());
      }

      if (tse) {
        return {
          numero: num,
          nomeUrna: tse.nm_urna_candidato || tse.nm_candidato,
          partido: tse.sg_partido || tse.nm_partido || '',
          cargo: tse.ds_cargo,
          uf: tse.sg_uf || uf,
          sq_candidato: tse.sq_candidato ? String(tse.sq_candidato) : undefined,
          fotoUrl: tse.foto_url || (tse.sq_candidato ? `/candidatos/F${(tse.sg_uf || 'BR').toUpperCase()}${tse.sq_candidato}_div.jpg` : ''),
        };
      }

      // 2. Busca na base de campanhas cadastradas no sistema
      const camp = campanhas.find((c) => String(c.nr_candidato) === num && (cargoKey === 'presidente' || (c.uf || '').toUpperCase() === uf.toUpperCase()));
      if (camp) {
        return {
          numero: num,
          nomeUrna: camp.nome_urna || camp.nome_candidato,
          partido: camp.partido || '',
          cargo: camp.cargo,
          uf: camp.uf || uf,
          fotoUrl: camp.foto_candidato_url || '',
        };
      }

      // NENHUMA correspondência oficial = Voto Nulo
      return null;
    };

    const processarCargo = (
      votosBrutos: { numero?: any; nome?: any }[],
      cargoKey: 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual',
      cargoLabel: string,
      ufAlvo: string
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

        // Validação estrita contra a base oficial
        const matchOficial = encontrarCandidatoOficial(num, cargoKey, ufAlvo);

        if (matchOficial) {
          if (!countCands[num]) {
            countCands[num] = { count: 0, info: matchOficial };
          }
          countCands[num].count += 1;
          totalValidos += 1;
        } else {
          // Voto com número inexistente ou legenda não cadastrada é REDIRECIONADO PARA NULO
          totalNulos += 1;
        }
      });

      const totalGeral = totalValidos + totalNulos + totalBrancos;

      const itens: ItemRankeado[] = Object.keys(countCands).map((num) => {
        const item = countCands[num];
        const info = item.info;
        const pctValidos = totalValidos > 0 ? (item.count / totalValidos) * 100 : 0;
        const pctGeral = totalGeral > 0 ? (item.count / totalGeral) * 100 : 0;

        return {
          id: `${cargoKey}_${num}`,
          numero: num,
          nomeUrna: info.nomeUrna,
          partido: info.partido,
          cargo: cargoLabel,
          uf: ufAlvo,
          sq_candidato: info.sq_candidato,
          fotoUrl: info.fotoUrl || resolverFotoCandidato({ numero: num, cargo: cargoLabel, uf: ufAlvo } as any, ufAlvo),
          percentual: pctValidos,
          percentualGeral: pctGeral,
          posicao: 0,
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

    // 1. PRESIDENTE
    const dadosPres = processarCargo(
      basePesquisas.map((p) => ({ numero: p.presidente_numero, nome: p.presidente_nome })),
      'presidente',
      'Presidente',
      'BR'
    );

    // 2. GOVERNADOR
    const dadosGov = processarCargo(
      pesquisasUf.map((p) => ({ numero: p.governador_numero, nome: p.governador_nome })),
      'governador',
      'Governador(a)',
      ufSelecionada.toUpperCase()
    );

    // 3. SENADOR
    const votosSen1 = pesquisasUf.map((p) => ({ numero: p.senador1_numero, nome: p.senador1_nome }));
    const votosSen2 = pesquisasUf.map((p) => ({ numero: p.senador2_numero, nome: p.senador2_nome }));
    const dadosSen = processarCargo(
      [...votosSen1, ...votosSen2],
      'senador',
      'Senador(a)',
      ufSelecionada.toUpperCase()
    );

    // 4. DEP. FEDERAL (DEP. A)
    const dadosFed = processarCargo(
      pesquisasUf.map((p) => ({ numero: p.dep_federal_numero, nome: p.dep_federal_nome })),
      'dep_federal',
      'Dep. Federal (Dep. A)',
      ufSelecionada.toUpperCase()
    );

    // 5. DEPUTADO ESTADUAL
    const dadosEst = processarCargo(
      pesquisasUf.map((p) => ({ numero: p.dep_estadual_numero, nome: p.dep_estadual_nome })),
      'dep_estadual',
      'Deputado Estadual',
      ufSelecionada.toUpperCase()
    );

    return {
      ranking: {
        presidente: dadosPres.itens,
        governador: dadosGov.itens,
        senador: dadosSen.itens,
        dep_federal: dadosFed.itens,
        dep_estadual: dadosEst.itens,
      },
      estatisticas: {
        presidente: dadosPres.estatisticas,
        governador: dadosGov.estatisticas,
        senador: dadosSen.estatisticas,
        dep_federal: dadosFed.estatisticas,
        dep_estadual: dadosEst.estatisticas,
      },
    };
  }, [pesquisasFiltradasAmostragem, candidatosTse, campanhas, ufSelecionada]);

  const rankingConsolidado = dadosConsolidados.ranking;
  const estatisticasPorCargo = dadosConsolidados.estatisticas;

  // Função para compartilhar o Card do Candidato no Instagram/WhatsApp
  const handleCompartilharCardCandidato = async (candidato: ItemRankeado) => {
    setGerandoCardId(candidato.id);
    try {
      const fotoUrlFinal = candidato.fotoUrl || resolverFotoCandidato(candidato as any, ufSelecionada);
      const { file, pngBlob, dataUrl } = await gerarCardCandidatoJpg({
        nomeUrna: candidato.nomeUrna,
        cargo: candidato.cargo,
        numero: candidato.numero,
        partido: candidato.partido,
        uf: candidato.uf,
        fotoUrl: fotoUrlFinal,
        percentual: candidato.percentual,
        posicao: candidato.posicao,
      });

      const texto = `📊 *${candidato.nomeUrna}* está com *${candidato.percentual.toFixed(1).replace('.', ',')}%* dos votos válidos para ${candidato.cargo} na Enquete Eleitoral da plataforma Democracias!\n\nConfira os resultados e participe: https://chat.democracias.org`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Resultado Oficial — ${candidato.nomeUrna}`,
            text: texto,
            files: [file],
          });
          toast.success('Card de resultado compartilhado!');
          return;
        } catch {}
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `card_${candidato.cargo.toLowerCase().replace(/\s+/g, '_')}_${candidato.nomeUrna.toLowerCase().replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const item = new ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([item]);
          toast.success('Card copiado e baixado para compartilhar no Instagram e WhatsApp!');
          return;
        } catch {}
      }

      toast.success('Card baixado em JPEG de alta resolução!');
    } catch (e) {
      console.error('Erro ao gerar card:', e);
      toast.error('Erro ao gerar card do candidato.');
    } finally {
      setGerandoCardId(null);
    }
  };

  // Seções com Padronização Oficial dos Nomes dos Cargos
  const secoesCargo: { key: keyof typeof rankingConsolidado; titulo: string; icon: string; subtitulo: string }[] = [
    { key: 'presidente', titulo: 'Presidente', icon: '🇧🇷', subtitulo: 'Nacional' },
    { key: 'governador', titulo: 'Governador(a)', icon: '🏛️', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'senador', titulo: 'Senador(a)', icon: '🏛️', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'dep_federal', titulo: 'Dep. Federal (Dep. A)', icon: '📋', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'dep_estadual', titulo: 'Deputado Estadual', icon: '📋', subtitulo: `Estado: ${ufSelecionada}` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white pb-16">
      <Toaster richColors position="top-right" theme="dark" />

      {/* CABEÇALHO SUPERIOR FIXO */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-black shadow-inner">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white">
                  Democracias
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-sm">
                  Enquete Eleitoral
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Inteligência & Mapeamento Eleitoral 2026
              </p>
            </div>
          </div>

          <a
            href="/"
            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Vote className="size-3.5" />
            <span>Participar da Enquete</span>
          </a>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* BANNER DE BOAS-VINDAS E CONTROLES */}
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold mb-1">
                <TrendingUp className="size-3.5" /> Resultados em Tempo Real
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                Panorama da Enquete Eleitoral 2026
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Acompanhe a preferência de votos nominais válidos consolidados em percentual (%).
              </p>
            </div>

            {/* CONTROLES DO TOPO: ALTERNADOR GERAL / VOTO ÚNICO E SELETOR DE UF */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              {/* FILTRO DE VISUALIZAÇÃO: GERAL VS VOTO ÚNICO */}
              <div className="flex items-center bg-slate-950/90 border border-slate-800 p-1 rounded-2xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setTipoAmostragem('geral')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    tipoAmostragem === 'geral'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Total de votos e pesquisas consolidadas"
                >
                  <BarChart3 className="size-3.5" />
                  <span>Geral</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoAmostragem('voto_unico')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    tipoAmostragem === 'voto_unico'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Consolidação por participante único (desduplicação estrita)"
                >
                  <Users className="size-3.5" />
                  <span>Voto Único</span>
                </button>
              </div>

              {/* SELETOR DE UF */}
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl shadow-inner">
                <MapPin className="size-4 text-orange-400 ml-2" />
                <span className="text-xs font-bold text-slate-400">Estado:</span>
                <select
                  value={ufSelecionada}
                  onChange={(e) => setUfSelecionada(e.target.value)}
                  className="bg-slate-950 text-orange-400 font-black font-mono text-sm px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
                >
                  {ESTADOS_BR.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* INFORMAÇÃO DE AUDITORIA E PRIVACIDADE */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              {totalRespondentesUnicos >= 10000 ? (
                <span className="text-emerald-300 font-bold text-xs">
                  Base consolidada em <strong>{totalRespondentesUnicos.toLocaleString('pt-BR')}</strong> participantes validados {tipoAmostragem === 'voto_unico' ? '(Modo Voto Único por Eleitor)' : '(Modo Geral)'}
                </span>
              ) : (
                <span className="text-slate-300 font-medium text-xs">
                  Amostra regional oficial com validação estrita • Votos nominais válidos e tratamento transparente de nulos
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 shrink-0 self-start sm:self-auto">
              ENQUETE INDEPENDENTE
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE VISUALIZAÇÃO: GERAL VS DETALHES POR CARGO */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {/* BOTÃO SIMPLIFICADO GERAL */}
          <button
            type="button"
            onClick={() => {
              setModo('panorama');
              setCargoSelecionado('todos');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
              modo === 'panorama' && cargoSelecionado === 'todos'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md ring-2 ring-orange-500/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <BarChart3 className="size-4" />
            <span>Geral</span>
          </button>

          {secoesCargo.map((sec) => (
            <button
              key={sec.key}
              type="button"
              onClick={() => {
                setModo('detalhado');
                setCargoSelecionado(sec.key as CargoFiltro);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                modo === 'detalhado' && cargoSelecionado === sec.key
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md ring-2 ring-orange-500/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.titulo}</span>
            </button>
          ))}
        </div>

        {/* CONTEÚDO DOS RESULTADOS */}
        {carregando ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-orange-500" />
            <p className="text-sm font-bold">Consolidando dados oficiais da enquete...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* MODO 1: PANORAMA GERAL (CARGOS COM CANDIDATOS OFICIAIS VÁLIDOS) */}
            {modo === 'panorama' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secoesCargo.map((sec) => {
                  const listaCompleta = rankingConsolidado[sec.key] || [];
                  const listaComVotos = listaCompleta.filter((c) => c.votosContados > 0);
                  const top3 = listaComVotos.slice(0, 3);
                  const stats = estatisticasPorCargo[sec.key];

                  return (
                    <div
                      key={sec.key}
                      className="rounded-3xl bg-slate-900/85 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl shrink-0">{sec.icon}</span>
                            <div className="min-w-0">
                              <h2 className="text-base font-black text-white truncate">{sec.titulo}</h2>
                              <p className="text-[10px] font-mono text-slate-400 truncate">{sec.subtitulo}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModo('detalhado');
                              setCargoSelecionado(sec.key as CargoFiltro);
                            }}
                            className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 shrink-0 cursor-pointer"
                          >
                            Ver Todos ({listaComVotos.length}) <ChevronRight className="size-3" />
                          </button>
                        </div>

                        {top3.length === 0 ? (
                          <div className="py-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
                            <p className="text-xs text-slate-400">Nenhum voto nominal registrado para candidatos oficiais neste estado.</p>
                            <a
                              href="/"
                              className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 hover:underline mt-2"
                            >
                              Seja o primeiro a votar! <ChevronRight className="size-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {top3.map((cand) => (
                              <CardCandidatoLinha
                                key={cand.id}
                                candidato={cand}
                                gerandoCardId={gerandoCardId}
                                onCompartilhar={() => handleCompartilharCardCandidato(cand)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* BARRA DE TRANSPARÊNCIA ELEITORAL: VOTOS VÁLIDOS, NULOS E BRANCOS */}
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono font-bold text-center">
                          <div className="text-emerald-400">
                            <span className="text-slate-400 block text-[9px]">Válidos</span>
                            {stats.pctValidos.toFixed(1).replace('.', ',')}%
                          </div>
                          <div className="text-rose-400">
                            <span className="text-slate-400 block text-[9px]">Nulos</span>
                            {stats.pctNulos.toFixed(1).replace('.', ',')}%
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400 block text-[9px]">Brancos</span>
                            {stats.pctBrancos.toFixed(1).replace('.', ',')}%
                          </div>
                        </div>

                        {top3.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setModo('detalhado');
                              setCargoSelecionado(sec.key as CargoFiltro);
                            }}
                            className="w-full h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-xs font-black text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Ver Detalhes do Cargo</span>
                            <ChevronRight className="size-3.5 text-orange-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO 2: VISÃO DETALHADA POR CARGO */}
            {modo === 'detalhado' && (
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModo('panorama')}
                      className="size-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all border border-slate-700 shadow shrink-0 cursor-pointer"
                      title="Voltar ao Panorama"
                    >
                      <ArrowLeft className="size-5" />
                    </button>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        {secoesCargo.find((s) => s.key === cargoSelecionado)?.icon}{' '}
                        {secoesCargo.find((s) => s.key === cargoSelecionado)?.titulo}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Listagem completa de candidatos oficiais nominais validados
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 self-start sm:self-auto">
                    📍 {ufSelecionada} • 2026
                  </span>
                </div>

                {/* MÉTRICAS COMPLETAS DO CARGO */}
                {(() => {
                  const stats = estatisticasPorCargo[cargoSelecionado as keyof typeof estatisticasPorCargo];
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="size-3" /> Votos Válidos
                        </span>
                        <p className="font-mono text-xl font-black text-white mt-1">
                          {stats?.pctValidos.toFixed(1).replace('.', ',')}%
                        </p>
                        <span className="text-[10px] text-slate-500">{stats?.totalValidos} votos</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                        <span className="text-[11px] font-bold text-rose-400 flex items-center justify-center gap-1">
                          <Ban className="size-3" /> Votos Nulos
                        </span>
                        <p className="font-mono text-xl font-black text-rose-400 mt-1">
                          {stats?.pctNulos.toFixed(1).replace('.', ',')}%
                        </p>
                        <span className="text-[10px] text-slate-500">{stats?.totalNulos} votos</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1">
                          <CircleDot className="size-3" /> Em Branco
                        </span>
                        <p className="font-mono text-xl font-black text-slate-300 mt-1">
                          {stats?.pctBrancos.toFixed(1).replace('.', ',')}%
                        </p>
                        <span className="text-[10px] text-slate-500">{stats?.totalBrancos} votos</span>
                      </div>
                    </div>
                  );
                })()}

                {/* LISTAGEM DETALHADA */}
                {(() => {
                  const listaCargo = rankingConsolidado[cargoSelecionado as keyof typeof rankingConsolidado] || [];
                  const listaComVotos = listaCargo.filter((c) => c.votosContados > 0);

                  if (listaComVotos.length === 0) {
                    return (
                      <div className="py-16 text-center bg-slate-950/60 rounded-3xl border border-slate-800 p-6 space-y-3">
                        <Vote className="size-10 text-slate-600 mx-auto" />
                        <h3 className="text-base font-black text-white">Nenhum voto registrado para candidatos oficiais</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Ainda não foram computados votos nominais válidos para esta modalidade no estado selecionado.
                        </p>
                        <a
                          href="/"
                          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-lg transition-all"
                        >
                          <Vote className="size-4" /> Votar no Assistente Agora
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {listaComVotos.map((cand) => (
                        <CardCandidatoLinha
                          key={cand.id}
                          candidato={cand}
                          gerandoCardId={gerandoCardId}
                          onCompartilhar={() => handleCompartilharCardCandidato(cand)}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Componente de Linha de Candidato do Ranking Oficial
const CardCandidatoLinha: React.FC<{
  candidato: ItemRankeado;
  gerandoCardId: string | null;
  onCompartilhar: () => void;
}> = ({ candidato, gerandoCardId, onCompartilhar }) => {
  const gerandoEste = gerandoCardId === candidato.id;
  const isTop1 = candidato.posicao === 1;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-3 sm:p-4 shadow-sm space-y-3 transition-all hover:border-orange-500/50 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* POSIÇÃO */}
          <div
            className={`size-8 sm:size-9 rounded-full flex items-center justify-center font-black text-xs sm:text-sm font-mono shrink-0 shadow-sm ${
              isTop1
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                : candidato.posicao <= 3
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {candidato.posicao}º
          </div>

          {/* FOTO CIRCULAR */}
          <div className="relative size-12 sm:size-13 shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-500/80 shadow-sm flex items-center justify-center">
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
                    const fallback = parent.querySelector('.card-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}

            <div
              className={`card-fallback size-full items-center justify-center bg-slate-200 text-slate-600 font-black text-xs ${
                candidato.fotoUrl ? 'hidden' : 'flex'
              }`}
            >
              {candidato.nomeUrna ? (
                <span>{candidato.nomeUrna.slice(0, 2).toUpperCase()}</span>
              ) : (
                <User className="size-5 text-slate-500" />
              )}
            </div>
          </div>

          {/* INFORMAÇÕES DO CANDIDATO */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight break-words">
                {candidato.nomeUrna}
              </h4>

              {candidato.partido && (
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase shrink-0">
                  {candidato.partido}
                </span>
              )}
            </div>

            <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
              Nº {candidato.numero}
            </p>
          </div>
        </div>

        {/* LADO DIREITO (DESKTOP) / BLOCO DE AÇÃO (MOBILE): PERCENTUAL + BOTÃO INSTAGRAM */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          {/* PERCENTUAL EM DESTAQUE */}
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 block sm:hidden">Votos Válidos</span>
            <span className="font-mono font-black text-lg sm:text-xl text-orange-600">
              {candidato.percentual.toFixed(1).replace('.', ',')}%
            </span>
          </div>

          {/* BOTÃO COMPARTILHAR CARD (INSTAGRAM / WHATSAPP) COM FORMATO RESPONSIVO */}
          <button
            type="button"
            onClick={onCompartilhar}
            disabled={gerandoEste}
            title="Compartilhar Card no Instagram e WhatsApp"
            className="h-9 px-3 sm:px-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {gerandoEste ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Instagram className="size-4 shrink-0" />
                <span className="text-xs font-black sm:hidden">Compartilhar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BARRA DE PROGRESSO VISUAL */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isTop1 ? 'bg-orange-500' : 'bg-slate-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(candidato.percentual, 4))}%` }}
        />
      </div>
    </div>
  );
};
