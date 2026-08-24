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
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MapaBrasilSvg, EstadoVotosData } from './MapaBrasilSvg';
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

  const [amostragem, setAmostragem] = useState<AmostragemModo>('geral');
  const [cargoFiltro, setCargoFiltro] = useState<TipoCargo>('todos');
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string>('todos');
  const [ufFiltroMapa, setUfFiltroMapa] = useState<string | null>(null);
  const [buscaTexto, setBuscaTexto] = useState('');

  // Carregar dados de pesquisas_chat, candidatos TSE e campanhas
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
      console.error('Erro ao carregar dados de pesquisa:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtragem de amostragem: Geral vs Voto Único
  const pesquisasFiltradas = useMemo(() => {
    if (amostragem === 'geral') {
      return pesquisas;
    }

    // Modo Voto Único (desduplicação por CPF / token de respondente único)
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

  // Lista de todos os candidatos oficiais válidos que receberam votos
  const listaCandidatosValidos = useMemo(() => {
    const mapaCands = new Map<string, CandidatoOpcao>();

    const registrarVotoCand = (
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

      // Validação: verificar se consta no banco oficial do TSE
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

      // Validação na base de campanhas
      const campMatch = campanhas.find((c) => String(c.nr_candidato) === numLimpo && (cargoKey === 'presidente' || (c.uf || '').toUpperCase() === ufPesquisa.toUpperCase()));

      // Validação estrita: se não for oficial do TSE nem campanha registrada, descarta (trata como nulo)
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
      if (p.presidente_numero) registrarVotoCand(p.presidente_numero, p.presidente_nome, p.presidente_partido, p.presidente_foto, 'presidente', 'Presidente', 'BR');
      if (p.governador_numero) registrarVotoCand(p.governador_numero, p.governador_nome, p.governador_partido, p.governador_foto, 'governador', 'Governador(a)', uf);
      if (p.senador1_numero) registrarVotoCand(p.senador1_numero, p.senador1_nome, p.senador1_partido, p.senador1_foto, 'senador', 'Senador(a)', uf);
      if (p.senador2_numero) registrarVotoCand(p.senador2_numero, p.senador2_nome, p.senador2_partido, p.senador2_foto, 'senador', 'Senador(a)', uf);
      if (p.dep_federal_numero) registrarVotoCand(p.dep_federal_numero, p.dep_federal_nome, p.dep_federal_partido, p.dep_federal_foto, 'dep_federal', 'Dep. Federal (Dep. A)', uf);
      if (p.dep_estadual_numero) registrarVotoCand(p.dep_estadual_numero, p.dep_estadual_nome, p.dep_estadual_partido, p.dep_estadual_foto, 'dep_estadual', 'Deputado Estadual', uf);
    });

    const lista = Array.from(mapaCands.values());
    lista.sort((a, b) => b.totalVotos - a.totalVotos || a.nomeUrna.localeCompare(b.nomeUrna));
    return lista;
  }, [pesquisasFiltradas, candidatosTse, campanhas]);

  // Candidatos filtrados por busca e cargo
  const candidatosFiltradosSelect = useMemo(() => {
    return listaCandidatosValidos.filter((c) => {
      if (cargoFiltro !== 'todos' && c.cargoKey !== cargoFiltro) return false;
      if (buscaTexto) {
        const termo = buscaTexto.toLowerCase();
        return (
          c.nomeUrna.toLowerCase().includes(termo) ||
          c.numero.includes(termo) ||
          c.partido.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [listaCandidatosValidos, cargoFiltro, buscaTexto]);

  // Candidato atualmente selecionado para análise geográfica
  const candidatoAtivo = useMemo(() => {
    if (candidatoSelecionadoId === 'todos') return null;
    return listaCandidatosValidos.find((c) => c.id === candidatoSelecionadoId) || null;
  }, [listaCandidatosValidos, candidatoSelecionadoId]);

  // Cruzamento Geográfico para o Mapa de Calor (Por Estado / UF)
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

      // Se um candidato específico foi selecionado
      if (candidatoAtivo) {
        let votouNeste = false;
        const num = candidatoAtivo.numero;

        if (candidatoAtivo.cargoKey === 'presidente' && p.presidente_numero === num) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'governador' && p.governador_numero === num && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'senador' && (p.senador1_numero === num || p.senador2_numero === num) && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'dep_federal' && p.dep_federal_numero === num && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'dep_estadual' && p.dep_estadual_numero === num && uf === candidatoAtivo.uf) votouNeste = true;

        if (votouNeste) {
          mapaUfs[uf].votos += 1;
          totalVotosConsiderados += 1;
        }
      } else {
        // Se visão geral de toda a enquete
        mapaUfs[uf].votos += 1;
        totalVotosConsiderados += 1;
      }
    });

    // Calcular percentuais
    Object.keys(mapaUfs).forEach((uf) => {
      if (totalVotosConsiderados > 0) {
        mapaUfs[uf].percentual = (mapaUfs[uf].votos / totalVotosConsiderados) * 100;
      }
    });

    return { mapaUfs, totalVotosConsiderados };
  }, [pesquisasFiltradas, candidatoAtivo]);

  // Detalhamento por Cidades, Bairros e CEPs
  const detalhamentoCidades = useMemo(() => {
    const mapaCidades: Record<string, { cidade: string; uf: string; bairro?: string; cep?: string; votos: number }> = {};

    pesquisasFiltradas.forEach((p) => {
      const uf = (p.uf || '').toUpperCase();
      const cidade = p.municipio || 'Não informada';
      const bairro = p.bairro || '';
      const cep = p.cep || '';

      if (ufFiltroMapa && uf !== ufFiltroMapa) return;

      let votouNeste = true;
      if (candidatoAtivo) {
        votouNeste = false;
        const num = candidatoAtivo.numero;
        if (candidatoAtivo.cargoKey === 'presidente' && p.presidente_numero === num) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'governador' && p.governador_numero === num && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'senador' && (p.senador1_numero === num || p.senador2_numero === num) && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'dep_federal' && p.dep_federal_numero === num && uf === candidatoAtivo.uf) votouNeste = true;
        else if (candidatoAtivo.cargoKey === 'dep_estadual' && p.dep_estadual_numero === num && uf === candidatoAtivo.uf) votouNeste = true;
      }

      if (votouNeste) {
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
  }, [pesquisasFiltradas, candidatoAtivo, ufFiltroMapa]);

  const maxVotosEstado = useMemo(() => {
    return Math.max(1, ...Object.values(dadosGeograficosEstados.mapaUfs).map((e) => e.votos));
  }, [dadosGeograficosEstados]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CABEÇALHO DO PAINEL DE PESQUISA ELEITORAL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black">
              <TrendingUp className="size-3.5" /> Inteligência Geográfica & Analítica
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Dashboard de Pesquisa & Mapa de Calor Eleitoral
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Análise geoespacial da força eleitoral e intenção de votos dos candidatos consolidados na enquete.
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

        {/* MÉTRICAS GERAIS RESUMIDAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[11px] font-bold text-slate-400">Total de Pesquisas</p>
            <p className="font-mono text-2xl font-black text-white mt-1">
              {pesquisasFiltradas.length.toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[11px] font-bold text-slate-400">Candidatos Pontuando</p>
            <p className="font-mono text-2xl font-black text-orange-400 mt-1">
              {listaCandidatosValidos.length}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[11px] font-bold text-slate-400">Votos no Filtro Atual</p>
            <p className="font-mono text-2xl font-black text-emerald-400 mt-1">
              {dadosGeograficosEstados.totalVotosConsiderados.toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[11px] font-bold text-slate-400">Modo de Amostragem</p>
            <div className="flex items-center gap-1 mt-1">
              <button
                type="button"
                onClick={() => setAmostragem('geral')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  amostragem === 'geral' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setAmostragem('voto_unico')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  amostragem === 'voto_unico' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Voto Único
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SELETORES E FILTROS DE CANDIDATO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Filter className="size-4 text-primary" />
              Seletor de Candidato para o Mapa de Calor
            </h3>
            <p className="text-xs text-slate-500">
              Escolha um candidato de qualquer cargo para visualizar sua distribuição geográfica precisa.
            </p>
          </div>

          {/* FILTRO RÁPIDO DE CARGOS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'todos', label: 'Todos os Cargos' },
              { id: 'presidente', label: 'Presidente' },
              { id: 'governador', label: 'Governador(a)' },
              { id: 'senador', label: 'Senador(a)' },
              { id: 'dep_federal', label: 'Dep. Federal' },
              { id: 'dep_estadual', label: 'Dep. Estadual' },
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
        </div>

        {/* BUSCADOR E SELECTOR DE CANDIDATOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-600">Buscar por Nome, Número ou Partido</Label>
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-3 top-3.5" />
              <Input
                placeholder="Ex: Lula, Elmano, Cid Gomes, 13, 13123..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-600">Selecione o Candidato Alvo</Label>
            <select
              value={candidatoSelecionadoId}
              onChange={(e) => setCandidatoSelecionadoId(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="todos">🌐 Panorama Geral (Todos os Votos da Enquete)</option>
              {candidatosFiltradosSelect.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.nomeUrna} ({cand.numero}) — {cand.cargo} ({cand.uf}) • {cand.totalVotos} votos
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CARD DO CANDIDATO ATIVO SE SELECIONADO */}
        {candidatoAtivo && (
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-full overflow-hidden bg-white border-2 border-orange-500 shadow-sm flex items-center justify-center shrink-0">
                {candidatoAtivo.fotoUrl ? (
                  <img src={candidatoAtivo.fotoUrl} alt={candidatoAtivo.nomeUrna} className="size-full object-cover" />
                ) : (
                  <span className="font-black text-slate-700">{candidatoAtivo.nomeUrna.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-slate-900">{candidatoAtivo.nomeUrna}</h4>
                  <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {candidatoAtivo.partido}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {candidatoAtivo.cargo} • Nº {candidatoAtivo.numero} • UF: {candidatoAtivo.uf}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-500 block">Total de Votos no Painel</span>
                <span className="font-mono text-2xl font-black text-orange-600">
                  {candidatoAtivo.totalVotos}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCandidatoSelecionadoId('todos')}
                className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-sm"
              >
                Limpar Filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD GEOGRÁFICO: MAPA DO BRASIL + DETALHAMENTO DE LOCALIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: MAPA DO BRASIL INTERATIVO */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Map className="size-4 text-primary" />
                Mapa de Calor Georreferenciado do Brasil
              </h3>
              <p className="text-xs text-slate-500">
                {candidatoAtivo
                  ? `Concentração de votos de ${candidatoAtivo.nomeUrna} por estado`
                  : 'Densidade geral de eleitores que responderam à enquete'}
              </p>
            </div>

            {ufFiltroMapa && (
              <span className="text-xs font-mono font-bold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">
                Filtro: {ufFiltroMapa}
              </span>
            )}
          </div>

          <MapaBrasilSvg
            dadosEstados={dadosGeograficosEstados.mapaUfs}
            ufSelecionada={ufFiltroMapa}
            onSelectUf={(uf) => setUfFiltroMapa(uf)}
            maxVotos={maxVotosEstado}
          />
        </div>

        {/* COLUNA DIREITA: DETALHAMENTO DE CIDADES, BAIRROS E CEP */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-600" />
                  Localidades com Votos Informados
                </h3>
                <p className="text-xs text-slate-500">
                  {ufFiltroMapa ? `Filtrando apenas cidades de ${ufFiltroMapa}` : 'Todas as cidades registradas'}
                </p>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {detalhamentoCidades.length} {detalhamentoCidades.length === 1 ? 'local' : 'locais'}
              </span>
            </div>

            {detalhamentoCidades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <MapPin className="size-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold">Nenhum voto georreferenciado encontrado para este filtro.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                {detalhamentoCidades.map((loc, idx) => (
                  <div
                    key={`${loc.uf}_${loc.cidade}_${loc.bairro}_${idx}`}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-orange-500 shrink-0" />
                        <span className="font-black text-slate-900 text-xs truncate">
                          {loc.cidade} / {loc.uf}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {loc.bairro ? `Bairro ${loc.bairro}` : 'Região Central / Geral'}
                        {loc.cep ? ` • CEP ${loc.cep}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {loc.votos} {loc.votos === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ufFiltroMapa && (
            <div className="pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUfFiltroMapa(null)}
                className="w-full text-xs font-bold text-slate-700"
              >
                Limpar Filtro por Estado ({ufFiltroMapa})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* RANKING COMPARATIVO DE TODOS OS CANDIDATOS DO CARGO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Ranking Comparativo de Candidatos da Enquete
            </h3>
            <p className="text-xs text-slate-500">
              Listagem consolidada de todos os concorrentes oficiais com votos válidos computados.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Total: {candidatosFiltradosSelect.length} candidatos listados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {candidatosFiltradosSelect.slice(0, 15).map((cand, idx) => {
            const isSelected = cand.id === candidatoSelecionadoId;
            return (
              <div
                key={cand.id}
                onClick={() => setCandidatoSelecionadoId(cand.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/30'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-7 rounded-full bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}º
                  </span>

                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-xs truncate">{cand.nomeUrna}</h4>
                    <p className="text-[10px] text-slate-500">
                      Nº {cand.numero} • {cand.partido} • {cand.cargo}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-sm text-orange-600">
                    {cand.totalVotos} {cand.totalVotos === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
