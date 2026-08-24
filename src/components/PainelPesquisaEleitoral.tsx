import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  MapPin, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Loader2, 
  ExternalLink, 
  Vote, 
  Search, 
  Filter, 
  Sparkles,
  Map,
  Building2,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  Flag,
  Globe,
  Ban,
  CircleDot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MapaBrasilSvg, EstadoVotosData, CidadeVotosData } from './MapaBrasilSvg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ESTADOS_NOMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

type TipoCargo = 'todos' | 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual';
type AmostragemModo = 'geral' | 'voto_unico';
type TipoCamada = 'geral' | 'candidato' | 'partido';
type EscopoGeografico = 'nacional' | 'estadual' | 'municipal';

interface CandidatoOpcao {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: string;
  cargoKey: 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual';
  uf: string;
  fotoUrl?: string;
  totalVotos: number;
}

export const PainelPesquisaEleitoral: React.FC = () => {
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosTse, setCandidatosTse] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros Globais e Escopo
  const [escopo, setEscopo] = useState<EscopoGeografico>('nacional');
  const [amostragem, setAmostragem] = useState<AmostragemModo>('geral');
  const [cargoFiltro, setCargoFiltro] = useState<TipoCargo>('todos');
  
  // Camadas do Mapa
  const [camadaTipo, setCamadaTipo] = useState<TipoCamada>('geral');
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string>('todos');
  const [partidoSelecionado, setPartidoSelecionado] = useState<string>('todos');

  // Filtros Geográficos
  const [ufFiltro, setUfFiltro] = useState<string | null>(null);
  const [cidadeFiltro, setCidadeFiltro] = useState<string | null>(null);
  const [buscaTexto, setBuscaTexto] = useState('');

  // Carregar dados do Supabase
  const carregarDados = async () => {
    setCarregando(true);
    try {
      const { data: dataPesquisas } = await supabase
        .from('pesquisas_chat')
        .select('*')
        .order('criado_em', { ascending: false });

      setPesquisas(dataPesquisas || []);

      const { data: dataTse } = await supabase
        .from('tse_candidatos')
        .select('*');

      setCandidatosTse(dataTse || []);

      const { data: dataCamp } = await supabase
        .from('campaigns')
        .select('*');

      setCampanhas(dataCamp || []);
    } catch (e) {
      console.error('Erro ao carregar dados da pesquisa:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtragem de Amostragem (Geral vs. Voto Único por CPF/Token)
  const pesquisasAmostragem = useMemo(() => {
    if (amostragem === 'geral') return pesquisas;

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
  }, [pesquisas, amostragem]);

  // Filtragem por Escopo Geográfico (Nacional / Estadual / Municipal)
  const pesquisasFiltradas = useMemo(() => {
    return pesquisasAmostragem.filter((p) => {
      const pUf = (p.uf || '').toUpperCase();
      const pCid = (p.municipio || '').toLowerCase().trim();

      if (escopo === 'estadual' && ufFiltro && pUf !== ufFiltro.toUpperCase()) return false;
      if (escopo === 'municipal') {
        if (ufFiltro && pUf !== ufFiltro.toUpperCase()) return false;
        if (cidadeFiltro && pCid !== cidadeFiltro.toLowerCase().trim()) return false;
      }
      return true;
    });
  }, [pesquisasAmostragem, escopo, ufFiltro, cidadeFiltro]);

  // Lista de Partidos Únicos Presentes nos Votos
  const partidosDisponiveis = useMemo(() => {
    const setPartidos = new Set<string>();
    pesquisasAmostragem.forEach((p) => {
      [p.presidente_partido, p.governador_partido, p.senador1_partido, p.senador2_partido, p.dep_federal_partido, p.dep_estadual_partido].forEach((pt) => {
        if (pt && pt !== 'NULO' && pt !== 'BRANCO' && pt !== 'NÃO REGISTRADO') {
          setPartidos.add(pt.toUpperCase());
        }
      });
    });
    return Array.from(setPartidos).sort();
  }, [pesquisasAmostragem]);

  // Lista de Todos os Candidatos Oficiais Consolidados
  const listaCandidatosValidos = useMemo(() => {
    const mapaCands = new Map<string, CandidatoOpcao>();

    const registrarVoto = (
      numero: string,
      nome: string,
      partido: string,
      foto: string,
      cargoKey: 'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual',
      cargoLabel: string,
      ufPesquisa: string
    ) => {
      const numLimpo = (numero || '').trim();
      if (!numLimpo || numLimpo === 'BRANCO' || numLimpo === 'NULO') return;

      // Validação TSE
      let tseMatch: any = null;
      if (cargoKey === 'presidente') {
        tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE' && String(c.nr_candidato) === numLimpo);
      } else if (cargoKey === 'governador') {
        tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && String(c.nr_candidato) === numLimpo && (c.sg_uf || '').toUpperCase() === ufPesquisa.toUpperCase());
      } else if (cargoKey === 'senador') {
        tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && String(c.nr_candidato) === numLimpo && (c.sg_uf || '').toUpperCase() === ufPesquisa.toUpperCase());
      } else if (cargoKey === 'dep_federal') {
        tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'DEPUTADO FEDERAL' && String(c.nr_candidato) === numLimpo && (c.sg_uf || '').toUpperCase() === ufPesquisa.toUpperCase());
      } else if (cargoKey === 'dep_estadual') {
        tseMatch = candidatosTse.find((c) => ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'].includes((c.ds_cargo || '').toUpperCase()) && String(c.nr_candidato) === numLimpo && (c.sg_uf || '').toUpperCase() === ufPesquisa.toUpperCase());
      }

      // Validação Campanha
      const campMatch = campanhas.find((c) => {
        if (String(c.nr_candidato) !== numLimpo) return false;
        const cCargo = (c.cargo || '').toUpperCase();
        const cUf = (c.uf || '').toUpperCase();
        if (cargoKey === 'presidente') return cCargo.includes('PRESIDENTE');
        if (cUf !== ufPesquisa.toUpperCase()) return false;
        if (cargoKey === 'governador') return cCargo.includes('GOVERNADOR');
        if (cargoKey === 'senador') return cCargo.includes('SENADOR');
        if (cargoKey === 'dep_federal') return cCargo.includes('FEDERAL');
        if (cargoKey === 'dep_estadual') return cCargo.includes('ESTADUAL') || cCargo.includes('DISTRITAL');
        return false;
      });

      if (!tseMatch && !campMatch) return;

      const candUf = cargoKey === 'presidente' ? 'BR' : (tseMatch?.sg_uf || campMatch?.uf || ufPesquisa).toUpperCase();
      const chave = `${cargoKey}_${candUf}_${numLimpo}`;

      if (!mapaCands.has(chave)) {
        mapaCands.set(chave, {
          id: chave,
          numero: numLimpo,
          nomeUrna: tseMatch?.nm_urna_candidato || campMatch?.nome_urna || campMatch?.nome_candidato || nome,
          partido: tseMatch?.sg_partido || campMatch?.partido || partido || '',
          cargo: cargoLabel,
          cargoKey,
          uf: candUf,
          fotoUrl: tseMatch?.foto_url || campMatch?.foto_candidato_url || (tseMatch?.sq_candidato ? `/candidatos/F${candUf}${tseMatch.sq_candidato}_div.jpg` : foto),
          totalVotos: 0,
        });
      }

      const item = mapaCands.get(chave)!;
      item.totalVotos += 1;
    };

    pesquisasFiltradas.forEach((p) => {
      const uf = (p.uf || 'CE').toUpperCase();
      if (p.presidente_numero) registrarVoto(p.presidente_numero, p.presidente_nome, p.presidente_partido, p.presidente_foto, 'presidente', 'Presidente', 'BR');
      if (p.governador_numero) registrarVoto(p.governador_numero, p.governador_nome, p.governador_partido, p.governador_foto, 'governador', 'Governador', uf);
      if (p.senador1_numero) registrarVoto(p.senador1_numero, p.senador1_nome, p.senador1_partido, p.senador1_foto, 'senador', 'Senador', uf);
      if (p.senador2_numero) registrarVoto(p.senador2_numero, p.senador2_nome, p.senador2_partido, p.senador2_foto, 'senador', 'Senador', uf);
      if (p.dep_federal_numero) registrarVoto(p.dep_federal_numero, p.dep_federal_nome, p.dep_federal_partido, p.dep_federal_foto, 'dep_federal', 'Dep. Federal', uf);
      if (p.dep_estadual_numero) registrarVoto(p.dep_estadual_numero, p.dep_estadual_nome, p.dep_estadual_partido, p.dep_estadual_foto, 'dep_estadual', 'Deputado Estadual', uf);
    });

    const lista = Array.from(mapaCands.values());
    lista.sort((a, b) => b.totalVotos - a.totalVotos || a.nomeUrna.localeCompare(b.nomeUrna));
    return lista;
  }, [pesquisasFiltradas, candidatosTse, campanhas]);

  // Candidato Ativo Selecionado
  const candidatoAtivo = useMemo(() => {
    if (camadaTipo !== 'candidato' || candidatoSelecionadoId === 'todos') return null;
    return listaCandidatosValidos.find((c) => c.id === candidatoSelecionadoId) || null;
  }, [listaCandidatosValidos, candidatoSelecionadoId, camadaTipo]);

  // Cálculo de KPIs Gerais (Válidos vs. Brancos vs. Nulos)
  const kpisGerais = useMemo(() => {
    let validos = 0;
    let brancos = 0;
    let nulos = 0;
    let totalVotosRegistrados = 0;

    const setCidades = new Set<string>();
    const setBairros = new Set<string>();

    pesquisasFiltradas.forEach((p) => {
      if (p.municipio && p.municipio !== 'Não informado') setCidades.add(p.municipio);
      if (p.bairro && p.bairro !== 'Geral') setBairros.add(p.bairro);

      const checarVoto = (num?: string, partido?: string) => {
        if (!num) return;
        totalVotosRegistrados += 1;
        const n = String(num).toUpperCase();
        if (n === 'BRANCO') brancos += 1;
        else if (n === 'NULO' || partido === 'NÃO REGISTRADO') nulos += 1;
        else validos += 1;
      };

      if (cargoFiltro === 'todos' || cargoFiltro === 'presidente') checarVoto(p.presidente_numero, p.presidente_partido);
      if (cargoFiltro === 'todos' || cargoFiltro === 'governador') checarVoto(p.governador_numero, p.governador_partido);
      if (cargoFiltro === 'todos' || cargoFiltro === 'senador') {
        checarVoto(p.senador1_numero, p.senador1_partido);
        checarVoto(p.senador2_numero, p.senador2_partido);
      }
      if (cargoFiltro === 'todos' || cargoFiltro === 'dep_federal') checarVoto(p.dep_federal_numero, p.dep_federal_partido);
      if (cargoFiltro === 'todos' || cargoFiltro === 'dep_estadual') checarVoto(p.dep_estadual_numero, p.dep_estadual_partido);
    });

    return {
      totalParticipacoes: pesquisasFiltradas.length,
      totalVotos: totalVotosRegistrados,
      validos,
      brancos,
      nulos,
      percValidos: totalVotosRegistrados > 0 ? (validos / totalVotosRegistrados) * 100 : 0,
      percBrancos: totalVotosRegistrados > 0 ? (brancos / totalVotosRegistrados) * 100 : 0,
      percNulos: totalVotosRegistrados > 0 ? (nulos / totalVotosRegistrados) * 100 : 0,
      totalCidades: setCidades.size,
      totalBairros: setBairros.size,
    };
  }, [pesquisasFiltradas, cargoFiltro]);

  // Processamento do Mapa de Calor por Estados (UF)
  const dadosGeograficosEstados = useMemo(() => {
    const mapaUfs: Record<string, EstadoVotosData> = {};

    Object.keys(ESTADOS_NOMES).forEach((sigla) => {
      mapaUfs[sigla] = {
        uf: sigla,
        nome: ESTADOS_NOMES[sigla],
        regiao: '',
        votos: 0,
        percentual: 0,
        totalVotosEstado: 0,
      };
    });

    let totalVotosConsiderados = 0;

    pesquisasFiltradas.forEach((p) => {
      const uf = (p.uf || '').toUpperCase();
      if (!mapaUfs[uf]) return;

      mapaUfs[uf].totalVotosEstado += 1;

      let votou = false;

      if (camadaTipo === 'candidato' && candidatoAtivo) {
        const num = candidatoAtivo.numero;
        if (candidatoAtivo.cargoKey === 'presidente' && p.presidente_numero === num) votou = true;
        else if (candidatoAtivo.cargoKey === 'governador' && p.governador_numero === num && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'senador' && (p.senador1_numero === num || p.senador2_numero === num) && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'dep_federal' && p.dep_federal_numero === num && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'dep_estadual' && p.dep_estadual_numero === num && uf === candidatoAtivo.uf) votou = true;
      } else if (camadaTipo === 'partido' && partidoSelecionado !== 'todos') {
        const pt = partidoSelecionado.toUpperCase();
        if (
          p.presidente_partido?.toUpperCase() === pt ||
          p.governador_partido?.toUpperCase() === pt ||
          p.senador1_partido?.toUpperCase() === pt ||
          p.senador2_partido?.toUpperCase() === pt ||
          p.dep_federal_partido?.toUpperCase() === pt ||
          p.dep_estadual_partido?.toUpperCase() === pt
        ) {
          votou = true;
        }
      } else {
        votou = true;
      }

      if (votou) {
        mapaUfs[uf].votos += 1;
        totalVotosConsiderados += 1;
      }
    });

    Object.keys(mapaUfs).forEach((uf) => {
      if (totalVotosConsiderados > 0) {
        mapaUfs[uf].percentual = (mapaUfs[uf].votos / totalVotosConsiderados) * 100;
      }
    });

    return { mapaUfs, totalVotosConsiderados };
  }, [pesquisasFiltradas, camadaTipo, candidatoAtivo, partidoSelecionado]);

  // Detalhamento e Mapeamento de Cidades e Bairros
  const detalhamentoCidades = useMemo((): CidadeVotosData[] => {
    const mapaCidades: Record<string, CidadeVotosData> = {};

    pesquisasFiltradas.forEach((p) => {
      const uf = (p.uf || '').toUpperCase();
      const cidade = p.municipio || 'Não informada';
      const bairro = p.bairro || 'Geral';
      const cep = p.cep || '';

      let votou = false;
      if (camadaTipo === 'candidato' && candidatoAtivo) {
        const num = candidatoAtivo.numero;
        if (candidatoAtivo.cargoKey === 'presidente' && p.presidente_numero === num) votou = true;
        else if (candidatoAtivo.cargoKey === 'governador' && p.governador_numero === num && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'senador' && (p.senador1_numero === num || p.senador2_numero === num) && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'dep_federal' && p.dep_federal_numero === num && uf === candidatoAtivo.uf) votou = true;
        else if (candidatoAtivo.cargoKey === 'dep_estadual' && p.dep_estadual_numero === num && uf === candidatoAtivo.uf) votou = true;
      } else if (camadaTipo === 'partido' && partidoSelecionado !== 'todos') {
        const pt = partidoSelecionado.toUpperCase();
        if (
          p.presidente_partido?.toUpperCase() === pt ||
          p.governador_partido?.toUpperCase() === pt ||
          p.senador1_partido?.toUpperCase() === pt ||
          p.senador2_partido?.toUpperCase() === pt ||
          p.dep_federal_partido?.toUpperCase() === pt ||
          p.dep_estadual_partido?.toUpperCase() === pt
        ) {
          votou = true;
        }
      } else {
        votou = true;
      }

      if (votou) {
        const chave = `${uf}_${cidade}_${bairro}`;
        if (!mapaCidades[chave]) {
          mapaCidades[chave] = { cidade, uf, bairro, cep, votos: 0 };
        }
        mapaCidades[chave].votos += 1;
      }
    });

    const lista = Object.values(mapaCidades);
    lista.sort((a, b) => b.votos - a.votos || a.cidade.localeCompare(b.cidade));
    return lista;
  }, [pesquisasFiltradas, camadaTipo, candidatoAtivo, partidoSelecionado]);

  // Lista de Cidades Únicas para o Seletor de Escopo
  const listaCidadesDisponiveis = useMemo(() => {
    const setCidades = new Set<string>();
    pesquisasAmostragem.forEach((p) => {
      if (ufFiltro && (p.uf || '').toUpperCase() !== ufFiltro.toUpperCase()) return;
      if (p.municipio && p.municipio !== 'Não informado') {
        setCidades.add(p.municipio);
      }
    });
    return Array.from(setCidades).sort();
  }, [pesquisasAmostragem, ufFiltro]);

  const maxVotosEstado = useMemo(() => {
    return Math.max(1, ...Object.values(dadosGeograficosEstados.mapaUfs).map((e) => e.votos));
  }, [dadosGeograficosEstados]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* CABEÇALHO DO PAINEL DE PESQUISA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black">
              <TrendingUp className="size-3.5" /> Inteligência Eleitoral & Georreferenciamento
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pesquisa & Inteligência Geográfica
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Mapeamento de densidade eleitoral por Estado, Município e Bairro com filtros de candidatos e legendas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://chat.democracias.org/resultado"
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <span>Ver Tela Pública</span>
              <ExternalLink className="size-3.5" />
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={carregando}
              className="h-10 text-xs font-bold text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </Button>
          </div>
        </div>

        {/* BARRA DE FILTROS GLOBAIS DE ESCOPO */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* SELETOR DE ESCOPO */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Globe className="size-3.5 text-orange-400" /> Escopo Geográfico:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setEscopo('nacional');
                  setUfFiltro(null);
                  setCidadeFiltro(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  escopo === 'nacional' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nacional
              </button>
              <button
                type="button"
                onClick={() => {
                  setEscopo('estadual');
                  if (!ufFiltro) setUfFiltro('CE');
                  setCidadeFiltro(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  escopo === 'estadual' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Estadual
              </button>
              <button
                type="button"
                onClick={() => {
                  setEscopo('municipal');
                  if (!ufFiltro) setUfFiltro('CE');
                  if (!cidadeFiltro && listaCidadesDisponiveis.length > 0) setCidadeFiltro(listaCidadesDisponiveis[0]);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  escopo === 'municipal' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Municipal
              </button>
            </div>
          </div>

          {/* SELETOR DE ESTADO (UF) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-orange-400" /> Filtrar Estado (UF):
            </label>
            <select
              value={ufFiltro || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setUfFiltro(val);
                setCidadeFiltro(null);
                if (val && escopo === 'nacional') setEscopo('estadual');
              }}
              className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">Todos os Estados (Brasil)</option>
              {Object.entries(ESTADOS_NOMES).map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {sigla} - {nome}
                </option>
              ))}
            </select>
          </div>

          {/* SELETOR DE MUNICÍPIO */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-orange-400" /> Filtrar Município / Cidade:
            </label>
            <select
              value={cidadeFiltro || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setCidadeFiltro(val);
                if (val) setEscopo('municipal');
              }}
              className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">Todas as Cidades {ufFiltro ? `em ${ufFiltro}` : ''}</option>
              {listaCidadesDisponiveis.map((cid) => (
                <option key={cid} value={cid}>
                  {cid}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE KPIS CONSOLIDADOS (VISÃO MACRO EM TEMPO REAL) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" /> Participações
          </p>
          <p className="text-2xl font-black font-mono text-slate-950">
            {kpisGerais.totalParticipacoes.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setAmostragem('geral')}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                amostragem === 'geral' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setAmostragem('voto_unico')}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                amostragem === 'voto_unico' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Voto Único
            </button>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-extrabold uppercase text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Votos Válidos
          </p>
          <p className="text-2xl font-black font-mono text-emerald-600">
            {kpisGerais.validos.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            {kpisGerais.percValidos.toFixed(1)}% do total
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-extrabold uppercase text-rose-600 flex items-center gap-1.5">
            <Ban className="size-3.5" /> Votos Nulos
          </p>
          <p className="text-2xl font-black font-mono text-rose-600">
            {kpisGerais.nulos.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            {kpisGerais.percNulos.toFixed(1)}% do total
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-extrabold uppercase text-slate-600 flex items-center gap-1.5">
            <CircleDot className="size-3.5" /> Votos Brancos
          </p>
          <p className="text-2xl font-black font-mono text-slate-700">
            {kpisGerais.brancos.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            {kpisGerais.percBrancos.toFixed(1)}% do total
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-extrabold uppercase text-orange-600 flex items-center gap-1.5">
            <MapPin className="size-3.5" /> Cobertura Geo
          </p>
          <p className="text-2xl font-black font-mono text-orange-600">
            {kpisGerais.totalCidades}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            cidades • {kpisGerais.totalBairros} bairros
          </p>
        </div>
      </div>

      {/* FILTROS DE CAMADA DO MAPA (GERAL / CANDIDATO / PARTIDO) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        
        {/* ABAS DE SELEÇÃO DE CAMADA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Camada de Visualização do Heatmap
            </h3>
            <p className="text-xs text-slate-500">
              Selecione se deseja ver a densidade geral de eleitores, a força de um candidato específico ou a legenda partidária.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setCamadaTipo('geral');
                setCandidatoSelecionadoId('todos');
                setPartidoSelecionado('todos');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                camadaTipo === 'geral' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setCamadaTipo('candidato')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                camadaTipo === 'candidato' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Candidato
            </button>
            <button
              type="button"
              onClick={() => setCamadaTipo('partido')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                camadaTipo === 'partido' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Partido
            </button>
          </div>
        </div>

        {/* FILTROS ESPECÍFICOS QUANDO EM MODO CANDIDATO */}
        {camadaTipo === 'candidato' && (
          <div className="space-y-3 animate-fadeIn">
            {/* FILTRO RÁPIDO DE CARGOS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'todos', label: 'Todos os Cargos' },
                { id: 'presidente', label: 'Presidente' },
                { id: 'governador', label: 'Governador' },
                { id: 'senador', label: 'Senador' },
                { id: 'dep_federal', label: 'Dep. Federal' },
                { id: 'dep_estadual', label: 'Deputado Estadual' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCargoFiltro(tab.id as TipoCargo);
                    setCandidatoSelecionadoId('todos');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    cargoFiltro === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SELETOR DE CANDIDATO DROPDOWN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Buscar candidato por nome ou número..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="pl-9 h-11 rounded-2xl text-xs"
                />
              </div>

              <select
                value={candidatoSelecionadoId}
                onChange={(e) => setCandidatoSelecionadoId(e.target.value)}
                className="h-11 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="todos">Todos os Candidatos no Mapa</option>
                {listaCandidatosValidos
                  .filter((c) => {
                    if (cargoFiltro !== 'todos' && c.cargoKey !== cargoFiltro) return false;
                    if (buscaTexto) {
                      const t = buscaTexto.toLowerCase();
                      return c.nomeUrna.toLowerCase().includes(t) || c.numero.includes(t) || c.partido.toLowerCase().includes(t);
                    }
                    return true;
                  })
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cargo}: {c.nomeUrna} ({c.numero} - {c.partido}) • {c.totalVotos} votos
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* FILTROS ESPECÍFICOS QUANDO EM MODO PARTIDO */}
        {camadaTipo === 'partido' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPartidoSelecionado('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  partidoSelecionado === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todas as Legendas
              </button>
              {partidosDisponiveis.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPartidoSelecionado(pt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-mono ${
                    partidoSelecionado === pt ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAPA DE CALOR INTERATIVO */}
        <div className="pt-2">
          <MapaBrasilSvg
            dadosEstados={dadosGeograficosEstados.mapaUfs}
            dadosCidades={detalhamentoCidades}
            ufSelecionada={ufFiltro}
            cidadeSelecionada={cidadeFiltro}
            onSelectUf={(uf) => {
              setUfFiltro(uf);
              setCidadeFiltro(null);
              if (uf) setEscopo('estadual');
              else setEscopo('nacional');
            }}
            onSelectCidade={(cid) => {
              setCidadeFiltro(cid);
              if (cid) setEscopo('municipal');
            }}
            maxVotos={maxVotosEstado}
          />
        </div>
      </div>

      {/* TABELA DE RANKING E DETALHAMENTO GEOGRÁFICO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Detalhamento de Cidades e Bairros
            </h3>
            <p className="text-xs text-slate-500">
              Ranking de concentração de votos georreferenciados na pesquisa eleitoral.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 font-mono">
            {detalhamentoCidades.length} {detalhamentoCidades.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {detalhamentoCidades.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500">
              Nenhuma localidade registrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase">
                  <th className="py-2.5 px-3">Localidade</th>
                  <th className="py-2.5 px-3">UF</th>
                  <th className="py-2.5 px-3">Bairro / Região</th>
                  <th className="py-2.5 px-3">Votos</th>
                  <th className="py-2.5 px-3 text-right">Intensidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalhamentoCidades.slice(0, 25).map((loc, i) => {
                  const maxV = detalhamentoCidades[0]?.votos || 1;
                  const percRelativo = (loc.votos / maxV) * 100;

                  return (
                    <tr key={`${loc.cidade}_${loc.bairro}_${i}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {loc.cidade}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold bg-slate-100 text-slate-700">
                          {loc.uf}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {loc.bairro && loc.bairro !== 'Geral' ? loc.bairro : 'Centro / Geral'}
                      </td>
                      <td className="py-3 px-3 font-black font-mono text-orange-600">
                        {loc.votos} {loc.votos === 1 ? 'voto' : 'votos'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-100 ml-auto overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                            style={{ width: `${percRelativo}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PainelPesquisaEleitoral;
