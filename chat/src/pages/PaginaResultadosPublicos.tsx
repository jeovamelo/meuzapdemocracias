import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Share2, 
  MapPin, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Loader2, 
  Vote, 
  TrendingUp, 
  ChevronRight, 
  ArrowLeft, 
  FileCheck,
  User,
  Instagram,
  CheckCircle2,
  ExternalLink
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
  posicao: number;
  votosContados: number;
}

export const PaginaResultadosPublicos: React.FC = () => {
  const [ufSelecionada, setUfSelecionada] = useState('CE');
  const [cargoSelecionado, setCargoSelecionado] = useState<CargoFiltro>('todos');
  const [modo, setModo] = useState<ModoVisualizacao>('panorama');
  const [carregando, setCarregando] = useState(true);
  const [gerandoCardId, setGerandoCardId] = useState<string | null>(null);

  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosTse, setCandidatosTse] = useState<any[]>([]);
  const [totalRespondentes, setTotalRespondentes] = useState<number>(0);

  // Carregar dados de pesquisas_chat e candidatos oficiais
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
        setTotalRespondentes(participantesUnicos.size);

        const { data: dataTse } = await supabase
          .from('tse_candidatos')
          .select('*')
          .or(`sg_uf.eq.BR,sg_uf.eq.${ufSelecionada.toUpperCase()}`);

        setCandidatosTse(dataTse || []);
      } catch (e) {
        console.error('Erro ao carregar resultados públicos:', e);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [ufSelecionada]);

  // Processar ranking consolidado por cargo
  const rankingConsolidado = useMemo(() => {
    const dados: Record<'presidente' | 'governador' | 'senador' | 'dep_federal' | 'dep_estadual', ItemRankeado[]> = {
      presidente: [],
      governador: [],
      senador: [],
      dep_federal: [],
      dep_estadual: [],
    };

    const pesquisasUf = pesquisas.filter((p) => (p.uf || '').toUpperCase() === ufSelecionada.toUpperCase());

    // 1. PRESIDENTE (Nível Nacional)
    const votosPres = pesquisas.map((p) => ({
      numero: p.presidente_numero,
      nome: p.presidente_nome,
      partido: p.presidente_partido,
      foto: p.presidente_foto,
    })).filter((v) => v.numero);

    const totalPres = votosPres.length || 1;
    const countPres: Record<string, { count: number; info: any }> = {};

    votosPres.forEach((v) => {
      if (!countPres[v.numero]) countPres[v.numero] = { count: 0, info: v };
      countPres[v.numero].count += 1;
    });

    const listaPres: ItemRankeado[] = Object.keys(countPres).map((num) => {
      const item = countPres[num];
      const tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'PRESIDENTE' && String(c.nr_candidato) === num);
      return {
        id: `pres_${num}`,
        numero: num,
        nomeUrna: tseMatch?.nm_urna_candidato || item.info.nome || `Presidente ${num}`,
        partido: tseMatch?.sg_partido || item.info.partido || '',
        cargo: 'Presidente',
        uf: 'BR',
        sq_candidato: tseMatch?.sq_candidato ? String(tseMatch.sq_candidato) : undefined,
        fotoUrl: tseMatch?.foto_url || (tseMatch?.sq_candidato ? `/candidatos/FBR${tseMatch.sq_candidato}_div.jpg` : item.info.foto),
        percentual: (item.count / totalPres) * 100,
        posicao: 0,
        votosContados: item.count,
      };
    });

    listaPres.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaPres.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.presidente = listaPres;

    // 2. GOVERNADOR (Nível Estadual)
    const votosGov = pesquisasUf.map((p) => ({
      numero: p.governador_numero,
      nome: p.governador_nome,
      partido: p.governador_partido,
      foto: p.governador_foto,
    })).filter((v) => v.numero);

    const totalGov = votosGov.length || 1;
    const countGov: Record<string, { count: number; info: any }> = {};

    votosGov.forEach((v) => {
      if (!countGov[v.numero]) countGov[v.numero] = { count: 0, info: v };
      countGov[v.numero].count += 1;
    });

    const listaGov: ItemRankeado[] = Object.keys(countGov).map((num) => {
      const item = countGov[num];
      const tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'GOVERNADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufSelecionada.toUpperCase());
      return {
        id: `gov_${num}`,
        numero: num,
        nomeUrna: tseMatch?.nm_urna_candidato || item.info.nome || `Governador ${num}`,
        partido: tseMatch?.sg_partido || item.info.partido || '',
        cargo: 'Governador(a)',
        uf: ufSelecionada.toUpperCase(),
        sq_candidato: tseMatch?.sq_candidato ? String(tseMatch.sq_candidato) : undefined,
        fotoUrl: tseMatch?.foto_url || (tseMatch?.sq_candidato ? `/candidatos/F${ufSelecionada.toUpperCase()}${tseMatch.sq_candidato}_div.jpg` : item.info.foto),
        percentual: (item.count / totalGov) * 100,
        posicao: 0,
        votosContados: item.count,
      };
    });

    listaGov.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaGov.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.governador = listaGov;

    // 3. SENADOR (Nível Estadual)
    const votosSen1 = pesquisasUf.map((p) => ({ numero: p.senador1_numero, nome: p.senador1_nome, partido: p.senador1_partido, foto: p.senador1_foto })).filter((v) => v.numero);
    const votosSen2 = pesquisasUf.map((p) => ({ numero: p.senador2_numero, nome: p.senador2_nome, partido: p.senador2_partido, foto: p.senador2_foto })).filter((v) => v.numero);
    const totalRespondentesUf = pesquisasUf.length || 1;

    const countSen: Record<string, { count: number; info: any }> = {};
    [...votosSen1, ...votosSen2].forEach((v) => {
      if (!countSen[v.numero]) countSen[v.numero] = { count: 0, info: v };
      countSen[v.numero].count += 1;
    });

    const listaSen: ItemRankeado[] = Object.keys(countSen).map((num) => {
      const item = countSen[num];
      const tseMatch = candidatosTse.find((c) => (c.ds_cargo || '').toUpperCase() === 'SENADOR' && String(c.nr_candidato) === num && (c.sg_uf || '').toUpperCase() === ufSelecionada.toUpperCase());
      return {
        id: `sen_${num}`,
        numero: num,
        nomeUrna: tseMatch?.nm_urna_candidato || item.info.nome || `Senador ${num}`,
        partido: tseMatch?.sg_partido || item.info.partido || '',
        cargo: 'Senador(a)',
        uf: ufSelecionada.toUpperCase(),
        sq_candidato: tseMatch?.sq_candidato ? String(tseMatch.sq_candidato) : undefined,
        fotoUrl: tseMatch?.foto_url || (tseMatch?.sq_candidato ? `/candidatos/F${ufSelecionada.toUpperCase()}${tseMatch.sq_candidato}_div.jpg` : item.info.foto),
        percentual: (item.count / totalRespondentesUf) * 100,
        posicao: 0,
        votosContados: item.count,
      };
    });

    listaSen.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaSen.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.senador = listaSen;

    // 4. DEPUTADO FEDERAL (Proporcional)
    const votosFed = pesquisasUf.map((p) => ({ numero: p.dep_federal_numero, nome: p.dep_federal_nome, partido: p.dep_federal_partido, foto: p.dep_federal_foto })).filter((v) => v.numero);
    const totalFed = votosFed.length || 1;
    const countFed: Record<string, { count: number; info: any }> = {};

    votosFed.forEach((v) => {
      if (!countFed[v.numero]) countFed[v.numero] = { count: 0, info: v };
      countFed[v.numero].count += 1;
    });

    const listaFed: ItemRankeado[] = Object.keys(countFed).map((num) => {
      const item = countFed[num];
      return {
        id: `fed_${num}`,
        numero: num,
        nomeUrna: item.info.nome || `Deputado ${num}`,
        partido: item.info.partido || '',
        cargo: 'Deputado(a) Federal',
        uf: ufSelecionada.toUpperCase(),
        fotoUrl: item.info.foto || resolverFotoCandidato({ numero: num, cargo: 'Deputado Federal', uf: ufSelecionada } as any, ufSelecionada),
        percentual: (item.count / totalFed) * 100,
        posicao: 0,
        votosContados: item.count,
      };
    });

    listaFed.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaFed.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.dep_federal = listaFed;

    // 5. DEPUTADO ESTADUAL (Proporcional)
    const votosEst = pesquisasUf.map((p) => ({ numero: p.dep_estadual_numero, nome: p.dep_estadual_nome, partido: p.dep_estadual_partido, foto: p.dep_estadual_foto })).filter((v) => v.numero);
    const totalEst = votosEst.length || 1;
    const countEst: Record<string, { count: number; info: any }> = {};

    votosEst.forEach((v) => {
      if (!countEst[v.numero]) countEst[v.numero] = { count: 0, info: v };
      countEst[v.numero].count += 1;
    });

    const listaEst: ItemRankeado[] = Object.keys(countEst).map((num) => {
      const item = countEst[num];
      return {
        id: `est_${num}`,
        numero: num,
        nomeUrna: item.info.nome || `Deputado ${num}`,
        partido: item.info.partido || '',
        cargo: 'Deputado(a) Estadual',
        uf: ufSelecionada.toUpperCase(),
        fotoUrl: item.info.foto || resolverFotoCandidato({ numero: num, cargo: 'Deputado Estadual', uf: ufSelecionada } as any, ufSelecionada),
        percentual: (item.count / totalEst) * 100,
        posicao: 0,
        votosContados: item.count,
      };
    });

    listaEst.sort((a, b) => b.percentual - a.percentual || a.nomeUrna.localeCompare(b.nomeUrna));
    listaEst.forEach((item, idx) => { item.posicao = idx + 1; });
    dados.dep_estadual = listaEst;

    return dados;
  }, [pesquisas, candidatosTse, ufSelecionada]);

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

      const texto = `📊 *${candidato.nomeUrna}* está com *${candidato.percentual.toFixed(1).replace('.', ',')}%* para ${candidato.cargo} na Pesquisa Oficial da plataforma Democracias!\n\nConfira os resultados e participe: https://chat.democracias.org`;

      // 1. Web Share nativo no celular (Instagram, WhatsApp, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Resultado Oficial — ${candidato.nomeUrna}`,
            text: texto,
            files: [file],
          });
          toast.success('Card de resultado compartilhado!');
          return;
        } catch {
          // Fallback para download caso feche o menu
        }
      }

      // 2. Download do JPEG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `card_${candidato.cargo.toLowerCase().replace(/\s+/g, '_')}_${candidato.nomeUrna.toLowerCase().replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Cópia da imagem / texto
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

  const secoesCargo: { key: keyof typeof rankingConsolidado; titulo: string; icon: string; subtitulo: string }[] = [
    { key: 'presidente', titulo: 'Presidente da República', icon: '🇧🇷', subtitulo: 'Nacional' },
    { key: 'governador', titulo: 'Governador(a)', icon: '🏛️', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'senador', titulo: 'Senador(a)', icon: '🏛️', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'dep_federal', titulo: 'Deputado(a) Federal', icon: '📋', subtitulo: `Estado: ${ufSelecionada}` },
    { key: 'dep_estadual', titulo: 'Deputado(a) Estadual', icon: '📋', subtitulo: `Estado: ${ufSelecionada}` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white pb-16">
      <Toaster richColors position="top-right" theme="dark" />

      {/* CABEÇALHO SUPERIOR FIXO */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo Democracias em Badge Branca */}
            <div className="flex items-center justify-center rounded-xl bg-white px-2.5 py-1 shadow-md border border-white/20">
              <img
                src="/democraciaslogo.png"
                alt="Democracias"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Democracias</span>
                <span className="rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-400 border border-orange-500/30">
                  Resultados Oficiais
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Inteligência & Mapeamento Eleitoral 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Vote className="size-3.5" />
              <span className="hidden sm:inline">Participar da Pesquisa</span>
              <span className="sm:hidden">Votar</span>
            </a>
          </div>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* BANNER DE BOAS-VINDAS E SELETOR DE ESTADO */}
        <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 via-slate-900/90 to-slate-950 p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <TrendingUp className="size-4 text-orange-400" /> Eleições Gerais 2026
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Resultado Oficial da Pesquisa
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Acompanhe a intenção de voto dos eleitores consolidados em percentual (%).
              </p>
            </div>

            {/* SELETOR DE UF */}
            <div className="shrink-0 flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-inner">
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

          {/* REGRA 4: PRIVACIDADE DO VOLUME TOTAL */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              {totalRespondentes >= 10000 ? (
                <span className="text-emerald-300 font-bold text-xs">
                  Base calculada com base em <strong>{totalRespondentes.toLocaleString('pt-BR')}</strong> participantes validados
                </span>
              ) : (
                <span className="text-slate-300 font-medium text-xs">
                  Amostra representativa regional • Resultados consolidados exclusivamente em percentual (%)
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 shrink-0">
              LEGISLAÇÃO TSE
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE VISUALIZAÇÃO: PANORAMA GERAL VS DETALHES POR CARGO */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setModo('panorama');
              setCargoSelecionado('todos');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-2 border ${
              modo === 'panorama' && cargoSelecionado === 'todos'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md ring-2 ring-orange-500/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <BarChart3 className="size-4" />
            <span>Panorama Geral (Top 3 por Cargo)</span>
          </button>

          {secoesCargo.map((sec) => (
            <button
              key={sec.key}
              type="button"
              onClick={() => {
                setModo('detalhado');
                setCargoSelecionado(sec.key as CargoFiltro);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 border ${
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
            <p className="text-sm font-bold">Consolidando dados da pesquisa...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* MODO 1: PANORAMA GERAL (TOP 3 DE CADA CARGO QUE RECEBEU VOTOS) */}
            {modo === 'panorama' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secoesCargo.map((sec) => {
                  // FILTRO DE OCULTAÇÃO: Apenas candidatos que receberam votos (> 0)
                  const listaCompleta = rankingConsolidado[sec.key] || [];
                  const listaComVotos = listaCompleta.filter((c) => c.votosContados > 0);
                  const top3 = listaComVotos.slice(0, 3);

                  return (
                    <div
                      key={sec.key}
                      className="rounded-3xl bg-slate-900/85 border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{sec.icon}</span>
                            <div>
                              <h2 className="text-base font-black text-white">{sec.titulo}</h2>
                              <p className="text-[10px] font-mono text-slate-400">{sec.subtitulo}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModo('detalhado');
                              setCargoSelecionado(sec.key as CargoFiltro);
                            }}
                            className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20"
                          >
                            Ver Todos ({listaComVotos.length}) <ChevronRight className="size-3" />
                          </button>
                        </div>

                        {top3.length === 0 ? (
                          <div className="py-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
                            <p className="text-xs text-slate-400">Nenhum voto registrado ainda para este cargo no estado.</p>
                            <a
                              href="/"
                              className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 hover:underline mt-2"
                            >
                              Seja o primeiro a votar! <ChevronRight className="size-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
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

                      {top3.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setModo('detalhado');
                              setCargoSelecionado(sec.key as CargoFiltro);
                            }}
                            className="w-full h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-xs font-black text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>Ver Detalhes do Cargo</span>
                            <ChevronRight className="size-3.5 text-orange-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO 2: VISÃO DETALHADA POR CARGO (TODOS QUE RECEBERAM VOTOS) */}
            {modo === 'detalhado' && (
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModo('panorama')}
                      className="size-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all border border-slate-700 shadow shrink-0"
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
                        Listagem completa de todos os candidatos que pontuaram na pesquisa
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 self-start sm:self-auto">
                    📍 {ufSelecionada} • 2026
                  </span>
                </div>

                {/* LISTAGEM DETALHADA COM APENAS CANDIDATOS QUE RECEBERAM VOTOS */}
                {(() => {
                  const listaCargo = rankingConsolidado[cargoSelecionado as keyof typeof rankingConsolidado] || [];
                  const listaComVotos = listaCargo.filter((c) => c.votosContados > 0);

                  if (listaComVotos.length === 0) {
                    return (
                      <div className="py-16 text-center bg-slate-950/60 rounded-3xl border border-slate-800 p-6 space-y-3">
                        <Vote className="size-10 text-slate-600 mx-auto" />
                        <h3 className="text-base font-black text-white">Nenhum voto registrado para este cargo</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Ainda não foram computados votos para esta modalidade no estado selecionado. Participe e convide amigos para compor a amostragem!
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
                          modoDetalhado
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

// COMPONENTE DO CARD DE LINHA DO CANDIDATO COM DESIGN FLUTUANTE BRANCO E BOTÃO DE COMPARTILHAR INSTAGRAM/STORIES
const CardCandidatoLinha: React.FC<{
  candidato: ItemRankeado;
  modoDetalhado?: boolean;
  gerandoCardId?: string | null;
  onCompartilhar: () => void;
}> = ({ candidato, modoDetalhado, gerandoCardId, onCompartilhar }) => {
  const isTop1 = candidato.posicao === 1;
  const gerandoEste = gerandoCardId === candidato.id;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-md hover:shadow-lg transition-all space-y-2.5">
      <div className="flex items-center gap-3">
        {/* POSIÇÃO */}
        <div
          className={`size-8 shrink-0 rounded-full font-black text-xs flex items-center justify-center shadow-sm ${
            isTop1
              ? 'bg-amber-400 text-amber-950 font-black ring-2 ring-amber-300'
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
            <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
              {candidato.nomeUrna}
            </h4>

            {candidato.partido && (
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 uppercase">
                {candidato.partido}
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            Nº {candidato.numero}
          </p>
        </div>

        {/* PERCENTUAL */}
        <div className="shrink-0 text-right">
          <span className="font-mono font-black text-base sm:text-lg text-orange-600">
            {candidato.percentual.toFixed(1).replace('.', ',')}%
          </span>
        </div>

        {/* BOTÃO COMPARTILHAR CARD (INSTAGRAM / WHATSAPP) */}
        <div className="shrink-0 pl-1">
          <button
            type="button"
            onClick={onCompartilhar}
            disabled={gerandoEste}
            title="Compartilhar Card no Instagram e WhatsApp"
            className="size-9 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-md transition-all active:scale-90 disabled:opacity-50"
          >
            {gerandoEste ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Instagram className="size-4" />
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
