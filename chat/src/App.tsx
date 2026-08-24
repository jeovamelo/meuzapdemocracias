import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  ArrowRight, 
  MapPin, 
  UserCheck, 
  Check, 
  RotateCcw, 
  Loader2, 
  ChevronRight, 
  ShieldCheck, 
  Vote,
  Sparkles,
  CircleDot,
  Ban
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { supabase } from './lib/supabase';
import { formatarCpf, validarCpf, formatarWhatsapp } from './lib/cep';
import { getHoraAtual } from './lib/date';
import type { Candidato, EtapaChat, Mensagem, RespostaUsuario, CargoEtapa } from './types';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { CandidateCard } from './components/CandidateCard';
import { MajoritarySelect } from './components/MajoritarySelect';
import { LocationInput } from './components/LocationInput';
import { ColinhaResumo } from './components/ColinhaResumo';
import { PaginaResultadosPublicos } from './pages/PaginaResultadosPublicos';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function App() {
  const [rotaAtual, setRotaAtual] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/resultado') || window.location.hash.includes('resultado') ? 'resultado' : 'chat';
    }
    return 'chat';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/resultado') || window.location.hash.includes('resultado')) {
        setRotaAtual('resultado');
      } else {
        setRotaAtual('chat');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (rotaAtual === 'resultado') {
    return <PaginaResultadosPublicos />;
  }

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [etapa, setEtapa] = useState<EtapaChat>('boas_vindas');
  const [digitando, setDigitando] = useState(false);
  const [inputText, setInputText] = useState('');
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Respostas do usuário
  const [respostas, setRespostas] = useState<RespostaUsuario>({
    nome: '',
    cpf: '',
    whatsapp: '',
    uf: 'CE',
    municipio: '',
    bairro: '',
    votos: {},
  });

  // Listas de candidatos carregados por cargo
  const [candidatosSenador, setCandidatosSenador] = useState<Candidato[]>([]);
  const [candidatosGovernador, setCandidatosGovernador] = useState<Candidato[]>([]);
  const [candidatosPresidente, setCandidatosPresidente] = useState<Candidato[]>([]);

  // Candidato temporário em fase de confirmação
  const [candidatoTemp, setCandidatoTemp] = useState<Candidato | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens, digitando, etapa]);

  // Mensagem inicial de boas-vindas
  useEffect(() => {
    const iniciarChat = async () => {
      setDigitando(true);
      await new Promise((r) => setTimeout(r, 600));
      setDigitando(false);

      const msg1: Mensagem = {
        id: '1',
        remetente: 'bot',
        conteudo: '👋 Olá! Bem-vindo(a) à Enquete Eleitoral da plataforma Democracias.\n\nSua participação é anônima, segura e ajuda a mapear a preferência dos eleitores em cada região.',
        timestamp: getHoraAtual(),
      };

      setMensagens([msg1]);

      setDigitando(true);
      await new Promise((r) => setTimeout(r, 800));
      setDigitando(false);

      const msg2: Mensagem = {
        id: '2',
        remetente: 'bot',
        conteudo: 'Meu nome é Democracias, qual é o seu?',
        timestamp: getHoraAtual(),
      };

      setMensagens((prev) => [...prev, msg2]);
      setEtapa('nome');
      carregarCandidatosMajoritarios('CE');
    };

    iniciarChat();
  }, []);

  const adicionarMensagemBot = async (conteudo: string, delay = 500) => {
    setDigitando(true);
    await new Promise((r) => setTimeout(r, delay));
    setDigitando(false);

    const novaMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'bot',
      conteudo,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, novaMsg]);
  };

  // Gerar URL oficial da foto do acervo interno / TSE / Campanha
  const buildFotoCandidato = (c: any, ufPadrao: string) => {
    if (c.foto_candidato_url) return c.foto_candidato_url;
    const isPres = (c.ds_cargo || c.cargo || '').toUpperCase().includes('PRESID');
    const cleanSq = String(c.sq_candidato ?? '').replace(/\D/g, '');
    const uf = isPres ? 'BR' : (c.sg_uf || c.uf || ufPadrao || 'CE').toUpperCase();

    if (c.foto_url && c.foto_url.startsWith('/candidatos/')) {
      if (isPres && c.foto_url.includes('/candidatos/F') && !c.foto_url.includes('/candidatos/FBR')) {
        return c.foto_url.replace(/\/candidatos\/F[A-Z]{2}/, '/candidatos/FBR');
      }
      return c.foto_url;
    }

    if (cleanSq) {
      return `/candidatos/F${uf}${cleanSq}_div.jpg`;
    }
    if (c.foto_url) return c.foto_url;
    return '';
  };

  // Carregar dados de candidatos majoritários do banco interno (tse_candidatos + campaigns)
  const carregarCandidatosMajoritarios = async (ufEscolhida: string) => {
    setCarregandoCandidatos(true);
    const ufUpper = (ufEscolhida || 'CE').toUpperCase();
    try {
      // 1. Buscar campanhas registradas para obter vínculos e fotos customizadas
      const { data: dbCamps } = await supabase
        .from('campaigns')
        .select('*');

      const campMap = new Map<string, any>();
      (dbCamps || []).forEach((camp: any) => {
        const chave = `${camp.uf}_${camp.cargo}_${camp.nr_candidato}`.toUpperCase();
        campMap.set(chave, camp);
        campMap.set(`${camp.nr_candidato}`, camp);
      });

      // 2. Buscar TODOS os candidatos de Governador e Senador no banco interno para o estado
      const { data: tseEstaduais, error: errEst } = await supabase
        .from('tse_candidatos')
        .select('*')
        .eq('sg_uf', ufUpper)
        .in('ds_cargo', ['GOVERNADOR', 'SENADOR']);

      if (errEst) console.warn('Erro tseEstaduais:', errEst);

      // 3. Buscar TODOS os candidatos a Presidente no banco interno
      const { data: tsePresidentes, error: errPres } = await supabase
        .from('tse_candidatos')
        .select('*')
        .ilike('ds_cargo', '%PRESIDENTE%')
        .eq('sg_uf', 'BR');

      if (errPres) console.warn('Erro tsePresidentes:', errPres);

      // Mapear Governadores
      const governadores: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'GOVERNADOR')
        .map((t: any) => {
          const campVinculada = campMap.get(`${t.sg_uf}_GOVERNADOR_${t.nr_candidato}`.toUpperCase()) || campMap.get(`${t.nr_candidato}`);
          return {
            id: t.id || `gov_${t.nr_candidato}`,
            nome: t.nm_candidato || t.nm_urna_candidato,
            nomeUrna: t.nm_urna_candidato || t.nm_candidato,
            numero: String(t.nr_candidato),
            cargo: 'Governador',
            partido: t.sg_partido || t.nm_partido || '',
            uf: t.sg_uf || ufUpper,
            sq_candidato: t.sq_candidato ? String(t.sq_candidato) : undefined,
            fotoUrl: campVinculada?.foto_candidato_url || buildFotoCandidato(t, ufUpper),
            campaign_id: campVinculada?.id,
          };
        });

      // Mapear Senadores (todos os cadastrados no banco para o estado)
      const senadores: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'SENADOR')
        .map((t: any) => {
          const campVinculada = campMap.get(`${t.sg_uf}_SENADOR_${t.nr_candidato}`.toUpperCase()) || campMap.get(`${t.nr_candidato}`);
          return {
            id: t.id || `sen_${t.nr_candidato}`,
            nome: t.nm_candidato || t.nm_urna_candidato,
            nomeUrna: t.nm_urna_candidato || t.nm_candidato,
            numero: String(t.nr_candidato),
            cargo: 'Senador',
            partido: t.sg_partido || t.nm_partido || '',
            uf: t.sg_uf || ufUpper,
            sq_candidato: t.sq_candidato ? String(t.sq_candidato) : undefined,
            fotoUrl: campVinculada?.foto_candidato_url || buildFotoCandidato(t, ufUpper),
            campaign_id: campVinculada?.id,
          };
        });

      // Mapear Presidentes (todos os cadastrados no banco nacional)
      const presidentes: Candidato[] = (tsePresidentes || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'PRESIDENTE')
        .map((t: any) => {
          const campVinculada = campMap.get(`${t.nr_candidato}`);
          return {
            id: t.id || `pres_${t.nr_candidato}`,
            nome: t.nm_candidato || t.nm_urna_candidato,
            nomeUrna: t.nm_urna_candidato || t.nm_candidato,
            numero: String(t.nr_candidato),
            cargo: 'Presidente',
            partido: t.sg_partido || t.nm_partido || '',
            uf: 'BR',
            sq_candidato: t.sq_candidato ? String(t.sq_candidato) : undefined,
            fotoUrl: campVinculada?.foto_candidato_url || buildFotoCandidato(t, 'BR'),
            campaign_id: campVinculada?.id,
          };
        });

      setCandidatosGovernador(governadores);
      setCandidatosSenador(senadores);
      setCandidatosPresidente(presidentes);
    } catch (e) {
      console.warn('Erro ao carregar candidatos do banco:', e);
    } finally {
      setCarregandoCandidatos(false);
    }
  };

  // Buscar candidato por número em todas as opções do banco interno (tse_candidatos + campaigns)
  const buscarCandidatoPorNumero = async (numeroDigitado: string, cargoBuscado: string): Promise<Candidato> => {
    const numLimpo = numeroDigitado.replace(/\D/g, '');

    try {
      // 1. Buscar no banco interno tse_candidatos
      let query = supabase
        .from('tse_candidatos')
        .select('*')
        .eq('nr_candidato', numLimpo);

      if (cargoBuscado.toLowerCase().includes('estadual')) {
        query = query.in('ds_cargo', ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL']).eq('sg_uf', respostas.uf);
      } else if (cargoBuscado.toLowerCase().includes('federal')) {
        query = query.eq('ds_cargo', 'DEPUTADO FEDERAL').eq('sg_uf', respostas.uf);
      } else if (cargoBuscado.toLowerCase().includes('senad')) {
        query = query.eq('ds_cargo', 'SENADOR').eq('sg_uf', respostas.uf);
      } else if (cargoBuscado.toLowerCase().includes('govern')) {
        query = query.eq('ds_cargo', 'GOVERNADOR').eq('sg_uf', respostas.uf);
      } else if (cargoBuscado.toLowerCase().includes('presid')) {
        query = query.eq('ds_cargo', 'PRESIDENTE');
      }

      const { data: tseList } = await query.limit(1);
      const dbTse = tseList && tseList.length > 0 ? tseList[0] : null;

      // 2. Verificar se existe campanha ativa cadastrada para este candidato
      const { data: dbCamp } = await supabase
        .from('campaigns')
        .select('*')
        .eq('nr_candidato', numLimpo)
        .limit(1)
        .maybeSingle();

      if (dbTse) {
        return {
          id: dbTse.id || `tse_${numLimpo}`,
          nome: dbTse.nm_candidato || dbTse.nm_urna_candidato,
          nomeUrna: dbTse.nm_urna_candidato || dbTse.nm_candidato,
          numero: String(dbTse.nr_candidato),
          cargo: dbTse.ds_cargo || cargoBuscado,
          partido: dbTse.sg_partido || dbTse.nm_partido || '',
          uf: cargoBuscado.toLowerCase().includes('presid') ? 'BR' : (dbTse.sg_uf || respostas.uf),
          sq_candidato: dbTse.sq_candidato ? String(dbTse.sq_candidato) : undefined,
          fotoUrl: dbCamp?.foto_candidato_url || buildFotoCandidato(dbTse, cargoBuscado.toLowerCase().includes('presid') ? 'BR' : (dbTse.sg_uf || respostas.uf)),
          campaign_id: dbCamp?.id,
        };
      }

      if (dbCamp) {
        return {
          id: dbCamp.id,
          nome: dbCamp.nome_candidato || dbCamp.nome_urna,
          nomeUrna: dbCamp.nome_urna || dbCamp.nome_candidato,
          numero: dbCamp.nr_candidato,
          cargo: dbCamp.cargo || cargoBuscado,
          partido: dbCamp.partido || '',
          uf: dbCamp.uf,
          fotoUrl: dbCamp.foto_candidato_url || '',
          campaign_id: dbCamp.id,
        };
      }
    } catch (err) {
      console.warn('Erro ao buscar candidato por número no banco:', err);
    }

    // Voto nominal com número digitado caso não esteja indexado
    return {
      id: `cand_${numLimpo}`,
      nome: `Candidato(a) Nº ${numLimpo}`,
      nomeUrna: `Candidato ${numLimpo}`,
      numero: numLimpo,
      cargo: cargoBuscado,
      partido: 'Voto Nominal / Legenda',
      uf: respostas.uf,
    };
  };

  // Enviar texto (Nome, CPF ou Número de Candidato)
  const handleEnviarTexto = async (e: React.FormEvent) => {
    e.preventDefault();
    const textoLimpo = inputText.trim();
    if (!textoLimpo && etapa !== 'cpf') return;

    if (etapa === 'nome') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: textoLimpo,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      setRespostas((prev) => ({ ...prev, nome: textoLimpo }));
      await adicionarMensagemBot(`Muito prazer, ${textoLimpo.split(' ')[0]}! 👍`);
      await adicionarMensagemBot(
        'Por favor, informe opcionalmente o seu CPF:\n\n' +
        '🔒 O CPF é necessário para garantir a integridade da enquete e evitar duplicidade de registros.\n' +
        'Seu CPF será criptografado e guardado de forma segura'
      );
      setEtapa('cpf');
      return;
    }

    if (etapa === 'cpf') {
      if (textoLimpo) {
        const cpfValido = validarCpf(textoLimpo);
        if (!cpfValido) {
          toast.error('CPF inválido! Verifique os 11 dígitos ou avance sem CPF.');
          await adicionarMensagemBot('⚠️ O CPF digitado é inválido. Por favor, confira os 11 dígitos ou clique no botão abaixo para avançar sem CPF:');
          return;
        }
      }

      const cpfFormatado = textoLimpo ? formatarCpf(textoLimpo) : '';
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: cpfFormatado ? `CPF: ${cpfFormatado}` : 'Prefiro não informar',
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      setRespostas((prev) => ({ ...prev, cpf: cpfFormatado }));
      await adicionarMensagemBot('Em qual Estado (UF) você vota ou reside atualmente?');
      setEtapa('uf');
      return;
    }

    if (etapa === 'whatsapp') {
      const zapFormatado = textoLimpo ? formatarWhatsapp(textoLimpo) : '';
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: zapFormatado ? `WhatsApp: ${zapFormatado}` : 'Prefiro não informar',
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      await salvarPesquisaCompleta(zapFormatado);
      return;
    }

    // VOTO DEPUTADO ESTADUAL POR NÚMERO
    if (etapa === 'voto_dep_estadual') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Deputado Estadual');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Localizamos o candidato abaixo. Confirma seu voto para Deputado Estadual?`);
      setEtapa('confirm_dep_estadual');
      return;
    }

    // VOTO DEPUTADO FEDERAL POR NÚMERO
    if (etapa === 'voto_dep_federal') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Deputado Federal');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Localizamos o candidato abaixo. Confirma seu voto para Deputado Federal?`);
      setEtapa('confirm_dep_federal');
      return;
    }

    // VOTO SENADOR 1 POR NÚMERO
    if (etapa === 'voto_senador_1') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Senador (1ª Vaga)');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Confirma seu voto para 1º Senador?`);
      setEtapa('confirm_senador_1');
      return;
    }

    // VOTO SENADOR 2 POR NÚMERO
    if (etapa === 'voto_senador_2') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Senador (2ª Vaga)');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Confirma seu voto para 2º Senador?`);
      setEtapa('confirm_senador_2');
      return;
    }

    // VOTO GOVERNADOR POR NÚMERO
    if (etapa === 'voto_governador') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Governador');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Confirma seu voto para Governador?`);
      setEtapa('confirm_governador');
      return;
    }

    // VOTO PRESIDENTE POR NÚMERO
    if (etapa === 'voto_presidente') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const cand = await buscarCandidatoPorNumero(textoLimpo, 'Presidente');
      setCandidatoTemp(cand);

      await adicionarMensagemBot(`Confirma seu voto para Presidente da República?`);
      setEtapa('confirm_presidente');
      return;
    }
  };

  // Pular CPF
  const handlePularCpf = async () => {
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: 'Prefiro não informar o CPF',
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    setRespostas((prev) => ({ ...prev, cpf: '' }));
    await adicionarMensagemBot('Tudo bem! Vamos continuar.');
    await adicionarMensagemBot('Em qual Estado (UF) você vota ou reside atualmente?');
    setEtapa('uf');
  };

  // Pular WhatsApp (finaliza a pesquisa sem whatsapp)
  const handlePularWhatsapp = async () => {
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: 'Prefiro não informar o WhatsApp',
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    await salvarPesquisaCompleta('');
  };

  // Selecionar UF
  const handleSelecionarUf = async (ufEscolhida: string) => {
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `Estado: ${ufEscolhida}`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    setRespostas((prev) => ({ ...prev, uf: ufEscolhida }));
    await carregarCandidatosMajoritarios(ufEscolhida);

    await adicionarMensagemBot(`Perfeito! Vamos iniciar a pesquisa seguindo a ordem oficial da cola e da urna eletrônica:`);
    await adicionarMensagemBot(`1️⃣ Digite o NÚMERO da sua candidata ou candidato a DEPUTADA OU DEPUTADO FEDERAL (4 dígitos) ou escolha Branco / Nulo:`);
    setEtapa('voto_dep_federal');
  };

  // Voto em Branco ou Nulo genérico
  const handleVotoBrancoNulo = async (tipo: 'BRANCO' | 'NULO', cargoNome: string, proximaEtapa: EtapaChat) => {
    const cand: Candidato = {
      id: `${tipo.toLowerCase()}_${Math.random()}`,
      nome: tipo === 'BRANCO' ? 'Voto em Branco' : 'Voto Nulo',
      nomeUrna: tipo === 'BRANCO' ? 'Branco' : 'Nulo',
      numero: tipo,
      cargo: cargoNome,
      uf: respostas.uf,
      isBrancoNulo: true,
    };
    setCandidatoTemp(cand);

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `Voto: ${cand.nomeUrna}`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    await adicionarMensagemBot(`Confirma o ${cand.nome} para ${cargoNome}?`);
    setEtapa(proximaEtapa);
  };

  // CONFIRMAÇÕES DE VOTO
  const handleConfirmarVoto = async (cargoChave: keyof typeof respostas.votos, proximaMsg: string, proximaEtapa: EtapaChat) => {
    if (!candidatoTemp) return;

    setRespostas((prev) => ({
      ...prev,
      votos: {
        ...prev.votos,
        [cargoChave]: candidatoTemp,
      },
    }));

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `✅ Voto confirmado: ${candidatoTemp.nomeUrna} (${candidatoTemp.numero})`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setCandidatoTemp(null);

    await adicionarMensagemBot(proximaMsg);
    setEtapa(proximaEtapa);
  };

  // Corrigir Voto
  const handleCorrigirVoto = async (etapaRetorno: EtapaChat, msgRetorno: string) => {
    setCandidatoTemp(null);
    await adicionarMensagemBot(msgRetorno);
    setEtapa(etapaRetorno);
  };

  // Obter ou gerar token persistente do respondente
  const getRespondenteToken = () => {
    try {
      let token = localStorage.getItem('democracias_chat_token');
      if (!token) {
        token = 'resp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('democracias_chat_token', token);
      }
      return token;
    } catch {
      return 'resp_' + Math.random().toString(36).substring(2, 12);
    }
  };

  // Responder Novamente / Alterar Votos
  const handleResponderNovamente = async () => {
    setCandidatoTemp(null);
    setRespostas((prev) => ({
      ...prev,
      votos: {},
    }));
    await adicionarMensagemBot(`🔄 Vamos atualizar a sua votação! Seus votos anteriores serão substituídos pelas novas escolhas.`);
    await adicionarMensagemBot(`1️⃣ Digite o NÚMERO da sua candidata ou candidato a DEPUTADA OU DEPUTADO FEDERAL (4 dígitos) ou escolha Branco / Nulo:`);
    setEtapa('voto_dep_federal');
  };

  // Confirmar Localização -> Em seguida pergunta o WhatsApp
  const handleConfirmarLocalizacao = async (dadosLoc: { cidade: string; bairro: string; cep?: string }) => {
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `📍 ${dadosLoc.cidade}/${respostas.uf} — Bairro ${dadosLoc.bairro}`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    setRespostas((prev) => ({
      ...prev,
      municipio: dadosLoc.cidade,
      bairro: dadosLoc.bairro,
      cep: dadosLoc.cep,
    }));

    await adicionarMensagemBot(`📍 Localização registrada: ${dadosLoc.cidade}/${respostas.uf} (Bairro ${dadosLoc.bairro}).`);
    await adicionarMensagemBot('📱 Para finalizarmos, se desejar receber o resultado desta pesquisa e novidades da sua região, informe o seu WhatsApp com DDD (Opcional — ou clique em Concluir sem WhatsApp abaixo):');
    setEtapa('whatsapp');
  };

  // Salvar tudo no Supabase com ou sem WhatsApp
  const salvarPesquisaCompleta = async (zapInformado?: string) => {
    setSalvando(true);
    const respostasFinais: RespostaUsuario = {
      ...respostas,
      whatsapp: zapInformado || '',
    };

    try {
      const token = getRespondenteToken();
      const cpfLimpo = respostasFinais.cpf ? respostasFinais.cpf.replace(/\D/g, '') : null;

      // Verificar se já existe pesquisa anterior pelo CPF ou pelo token do respondente
      let pesquisaExistenteId: string | null = null;

      if (cpfLimpo) {
        const { data: porCpf } = await supabase
          .from('pesquisas_chat')
          .select('id')
          .eq('cpf', cpfLimpo)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (porCpf?.id) pesquisaExistenteId = porCpf.id;
      }

      if (!pesquisaExistenteId && token) {
        const { data: porToken } = await supabase
          .from('pesquisas_chat')
          .select('id')
          .eq('respondente_token', token)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (porToken?.id) pesquisaExistenteId = porToken.id;
      }

      const payloadPesquisa = {
        respondente_token: token,
        nome: respostasFinais.nome.trim(),
        cpf: cpfLimpo,
        uf: respostasFinais.uf,
        municipio: respostasFinais.municipio,
        bairro: respostasFinais.bairro,
        dep_estadual_numero: respostasFinais.votos.deputado_estadual?.numero || null,
        dep_estadual_nome: respostasFinais.votos.deputado_estadual?.nomeUrna || null,
        dep_estadual_foto: respostasFinais.votos.deputado_estadual?.fotoUrl || null,
        dep_estadual_partido: respostasFinais.votos.deputado_estadual?.partido || null,
        dep_federal_numero: respostasFinais.votos.deputado_federal?.numero || null,
        dep_federal_nome: respostasFinais.votos.deputado_federal?.nomeUrna || null,
        dep_federal_foto: respostasFinais.votos.deputado_federal?.fotoUrl || null,
        dep_federal_partido: respostasFinais.votos.deputado_federal?.partido || null,
        senador1_numero: respostasFinais.votos.senador_1?.numero || null,
        senador1_nome: respostasFinais.votos.senador_1?.nomeUrna || null,
        senador1_foto: respostasFinais.votos.senador_1?.fotoUrl || null,
        senador1_partido: respostasFinais.votos.senador_1?.partido || null,
        senador2_numero: respostasFinais.votos.senador_2?.numero || null,
        senador2_nome: respostasFinais.votos.senador_2?.nomeUrna || null,
        senador2_foto: respostasFinais.votos.senador_2?.fotoUrl || null,
        senador2_partido: respostasFinais.votos.senador_2?.partido || null,
        governador_numero: respostasFinais.votos.governador?.numero || null,
        governador_nome: respostasFinais.votos.governador?.nomeUrna || null,
        governador_foto: respostasFinais.votos.governador?.fotoUrl || null,
        governador_partido: respostasFinais.votos.governador?.partido || null,
        presidente_numero: respostasFinais.votos.presidente?.numero || null,
        presidente_nome: respostasFinais.votos.presidente?.nomeUrna || null,
        presidente_foto: respostasFinais.votos.presidente?.fotoUrl || null,
        presidente_partido: respostasFinais.votos.presidente?.partido || null,
        origem_url: 'chat.democracias.org',
        whatsapp: respostasFinais.whatsapp || null,
        telefone: respostasFinais.whatsapp || null,
        atualizado_em: new Date().toISOString(),
      };

      if (pesquisaExistenteId) {
        // Sobrescreve a pesquisa anterior
        await supabase
          .from('pesquisas_chat')
          .update(payloadPesquisa)
          .eq('id', pesquisaExistenteId);
      } else {
        // Insere novo registro
        await supabase
          .from('pesquisas_chat')
          .insert([payloadPesquisa]);
      }

      // 2. Salvar na tabela pessoas (Apoiador da Campanha)
      const primaryCampId = 
        respostasFinais.votos.deputado_estadual?.campaign_id ||
        respostasFinais.votos.deputado_federal?.campaign_id ||
        respostasFinais.votos.governador?.campaign_id ||
        null;

      await supabase
        .from('pessoas')
        .insert([{
          nome: respostasFinais.nome.trim(),
          cpf: cpfLimpo,
          telefone: respostasFinais.whatsapp || null,
          tipo: 'apoiador',
          funcao: 'Apoiador(a) / Pesquisa Chat',
          meta_votos: 1,
          uf: respostasFinais.uf,
          municipio: respostasFinais.municipio,
          bairro: respostasFinais.bairro,
          cep: respostasFinais.cep || null,
          campanha_id: primaryCampId,
          campaign_id: primaryCampId,
          status: 'ativo'
        }]);

      setRespostas(respostasFinais);
      toast.success('Pesquisa registrada e computada com sucesso!');

      await adicionarMensagemBot(`🎉 Obrigado por sua participação na pesquisa, ${respostasFinais.nome.split(' ')[0]}!`);
      await adicionarMensagemBot('Aqui está o resumo da sua Colinha Eleitoral Oficial. Seus votos foram computados e você pode compartilhar no WhatsApp:');

      setEtapa('concluido');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Toaster position="top-center" richColors />

      {/* HEADER */}
      <ChatHeader />

      {/* ÁREA PRINCIPAL DO CHAT */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-4 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-1">
          {mensagens.map((msg) => (
            <MessageBubble key={msg.id} mensagem={msg} />
          ))}

          {digitando && <TypingIndicator />}

          {/* ETAPA: SELEÇÃO DE UF */}
          {etapa === 'uf' && !digitando && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 shadow-xl animate-message my-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <MapPin className="size-4 text-orange-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Selecione o seu Estado (UF)
                </h4>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['CE', 'SP', 'RJ', 'MG', 'BA', 'PE', 'PR', 'RS', 'DF'].map((sigla) => (
                  <button
                    key={sigla}
                    onClick={() => handleSelecionarUf(sigla)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 text-xs font-bold transition-all text-slate-200"
                  >
                    {sigla}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && handleSelecionarUf(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                >
                  <option value="" disabled>Ou escolha outro estado na lista...</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>{uf} — Estado</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ETAPAS PROPORCIONAIS (BOTÕES BRANCO E NULO RÁPIDOS) */}
          {(etapa === 'voto_dep_estadual' || etapa === 'voto_dep_federal') && !digitando && (
            <div className="flex gap-2 my-2 animate-message">
              <button
                type="button"
                onClick={() =>
                  handleVotoBrancoNulo(
                    'BRANCO',
                    etapa === 'voto_dep_estadual' ? 'Deputado Estadual' : 'Deputado Federal',
                    etapa === 'voto_dep_estadual' ? 'confirm_dep_estadual' : 'confirm_dep_federal'
                  )
                }
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <CircleDot className="size-3.5 text-slate-300" /> Votar em Branco
              </button>

              <button
                type="button"
                onClick={() =>
                  handleVotoBrancoNulo(
                    'NULO',
                    etapa === 'voto_dep_estadual' ? 'Deputado Estadual' : 'Deputado Federal',
                    etapa === 'voto_dep_estadual' ? 'confirm_dep_estadual' : 'confirm_dep_federal'
                  )
                }
                className="flex-1 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Ban className="size-3.5 text-rose-400" /> Votar Nulo
              </button>
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: DEP FEDERAL */}
          {etapa === 'confirm_dep_federal' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Deputada ou Deputado Federal" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'deputado_federal',
                      '2️⃣ Agora digite o NÚMERO da sua candidata ou candidato a DEPUTADA OU DEPUTADO ESTADUAL (5 dígitos) ou escolha Branco / Nulo:',
                      'voto_dep_estadual'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_dep_federal',
                      'Digite novamente o número da sua Deputada ou Deputado Federal (4 dígitos):'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: DEP ESTADUAL */}
          {etapa === 'confirm_dep_estadual' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Deputada ou Deputado Estadual" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'deputado_estadual',
                      '3️⃣ Escolha para SENADORA OU SENADOR (1ª vaga - 3 dígitos). Apresentamos as opções por ordem de número abaixo:',
                      'voto_senador_1'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_dep_estadual',
                      'Digite novamente o número da sua Deputada ou Deputado Estadual (5 dígitos):'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - 1º SENADOR */}
          {etapa === 'voto_senador_1' && !digitando && (
            <div className="my-3">
              <MajoritarySelect
                cargoTitulo="1º Senador"
                candidatos={candidatosSenador}
                onSelecionar={async (cand) => {
                  setCandidatoTemp(cand);
                  const userMsg: Mensagem = {
                    id: Math.random().toString(36).substring(2, 9),
                    remetente: 'user',
                    conteudo: `Escolhi: ${cand.nomeUrna} (${cand.numero})`,
                    timestamp: getHoraAtual(),
                  };
                  setMensagens((prev) => [...prev, userMsg]);
                  await adicionarMensagemBot(`Confirma seu voto para 1º Senador em ${cand.nomeUrna} (${cand.numero}${cand.partido ? ` - ${cand.partido}` : ''})?`);
                  setEtapa('confirm_senador_1');
                }}
                onVotoBranco={() => handleVotoBrancoNulo('BRANCO', '1º Senador', 'confirm_senador_1')}
                onVotoNulo={() => handleVotoBrancoNulo('NULO', '1º Senador', 'confirm_senador_1')}
              />
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: 1º SENADOR */}
          {etapa === 'confirm_senador_1' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="1º Senador" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'senador_1',
                      '4️⃣ Agora escolha a sua opção para SENADORA OU SENADOR (2ª vaga - 3 dígitos) entre as opções restantes:',
                      'voto_senador_2'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_senador_1',
                      'Selecione novamente o seu candidato a 1º Senador:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - 2º SENADOR */}
          {etapa === 'voto_senador_2' && !digitando && (
            <div className="my-3">
              <MajoritarySelect
                cargoTitulo="2º Senador"
                candidatos={candidatosSenador.filter((c) => {
                  const voto1 = respostas.votos.senador_1;
                  if (!voto1 || voto1.isBrancoNulo || voto1.numero === 'BRANCO' || voto1.numero === 'NULO') {
                    return true;
                  }
                  return c.numero !== voto1.numero && c.id !== voto1.id;
                })}
                onSelecionar={async (cand) => {
                  setCandidatoTemp(cand);
                  const userMsg: Mensagem = {
                    id: Math.random().toString(36).substring(2, 9),
                    remetente: 'user',
                    conteudo: `Escolhi: ${cand.nomeUrna} (${cand.numero})`,
                    timestamp: getHoraAtual(),
                  };
                  setMensagens((prev) => [...prev, userMsg]);
                  await adicionarMensagemBot(`Confirma seu voto para 2º Senador em ${cand.nomeUrna} (${cand.numero}${cand.partido ? ` - ${cand.partido}` : ''})?`);
                  setEtapa('confirm_senador_2');
                }}
                onVotoBranco={() => handleVotoBrancoNulo('BRANCO', '2º Senador', 'confirm_senador_2')}
                onVotoNulo={() => handleVotoBrancoNulo('NULO', '2º Senador', 'confirm_senador_2')}
              />
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: 2º SENADOR */}
          {etapa === 'confirm_senador_2' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="2º Senador" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'senador_2',
                      '5️⃣ Escolha a sua candidata ou candidato a GOVERNADORA OU GOVERNADOR (2 dígitos). Veja as opções abaixo:',
                      'voto_governador'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_senador_2',
                      'Selecione novamente o seu candidato a 2º Senador:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - GOVERNADOR */}
          {etapa === 'voto_governador' && !digitando && (
            <div className="my-3">
              <MajoritarySelect
                cargoTitulo="Governador"
                candidatos={candidatosGovernador}
                onSelecionar={async (cand) => {
                  setCandidatoTemp(cand);
                  const userMsg: Mensagem = {
                    id: Math.random().toString(36).substring(2, 9),
                    remetente: 'user',
                    conteudo: `Escolhi: ${cand.nomeUrna} (${cand.numero})`,
                    timestamp: getHoraAtual(),
                  };
                  setMensagens((prev) => [...prev, userMsg]);
                  await adicionarMensagemBot(`Confirma seu voto para GOVERNADORA OU GOVERNADOR em ${cand.nomeUrna} (${cand.numero}${cand.partido ? ` - ${cand.partido}` : ''})?`);
                  setEtapa('confirm_governador');
                }}
                onVotoBranco={() => handleVotoBrancoNulo('BRANCO', 'Governador', 'confirm_governador')}
                onVotoNulo={() => handleVotoBrancoNulo('NULO', 'Governador', 'confirm_governador')}
              />
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: GOVERNADOR */}
          {etapa === 'confirm_governador' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Governador" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'governador',
                      '6️⃣ Por fim, escolha a sua candidata ou candidato a PRESIDENTE DA REPÚBLICA (2 dígitos):',
                      'voto_presidente'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_governador',
                      'Selecione novamente o seu candidato a Governador:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - PRESIDENTE */}
          {etapa === 'voto_presidente' && !digitando && (
            <div className="my-3">
              <MajoritarySelect
                cargoTitulo="Presidente da República"
                candidatos={candidatosPresidente}
                onSelecionar={async (cand) => {
                  setCandidatoTemp(cand);
                  const userMsg: Mensagem = {
                    id: Math.random().toString(36).substring(2, 9),
                    remetente: 'user',
                    conteudo: `Escolhi: ${cand.nomeUrna} (${cand.numero})`,
                    timestamp: getHoraAtual(),
                  };
                  setMensagens((prev) => [...prev, userMsg]);
                  await adicionarMensagemBot(`Confirma seu voto para PRESIDENTE DA REPÚBLICA em ${cand.nomeUrna} (${cand.numero}${cand.partido ? ` - ${cand.partido}` : ''})?`);
                  setEtapa('confirm_presidente');
                }}
                onVotoBranco={() => handleVotoBrancoNulo('BRANCO', 'Presidente', 'confirm_presidente')}
                onVotoNulo={() => handleVotoBrancoNulo('NULO', 'Presidente', 'confirm_presidente')}
              />
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: PRESIDENTE */}
          {etapa === 'confirm_presidente' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Presidente" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'presidente',
                      '📍 Para finalizarmos o mapeamento regional dos votos, informe a sua Cidade e Bairro:',
                      'localizacao'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_presidente',
                      'Selecione novamente o seu candidato a Presidente:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: LOCALIZAÇÃO (CIDADE E BAIRRO) */}
          {etapa === 'localizacao' && !digitando && (
            <div className="my-3">
              <LocationInput
                ufInicial={respostas.uf}
                onConfirmar={handleConfirmarLocalizacao}
              />
            </div>
          )}

          {/* ETAPA: CONCLUÍDO / COLINHA ELEITORAL */}
          {etapa === 'concluido' && (
            <div className="my-4">
              <ColinhaResumo
                respostas={respostas}
                onResponderNovamente={handleResponderNovamente}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BARRA INFERIOR DE RESPOSTA */}
        {(etapa === 'nome' ||
          etapa === 'cpf' ||
          etapa === 'whatsapp' ||
          etapa === 'voto_dep_federal' ||
          etapa === 'voto_dep_estadual' ||
          etapa === 'voto_senador_1' ||
          etapa === 'voto_senador_2' ||
          etapa === 'voto_governador' ||
          etapa === 'voto_presidente') && (
          <div className="sticky bottom-0 mt-4 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 border-t border-slate-800">
            <form onSubmit={handleEnviarTexto} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type={etapa === 'cpf' || etapa === 'whatsapp' || etapa.startsWith('voto_') ? 'text' : 'text'}
                  inputMode={etapa === 'cpf' || etapa === 'whatsapp' || etapa.startsWith('voto_') ? 'numeric' : 'text'}
                  autoFocus
                  value={inputText}
                  onChange={(e) => {
                    if (etapa === 'cpf') {
                      setInputText(formatarCpf(e.target.value));
                    } else if (etapa === 'whatsapp') {
                      setInputText(formatarWhatsapp(e.target.value));
                    } else if (etapa.startsWith('voto_')) {
                      setInputText(e.target.value.replace(/\D/g, ''));
                    } else {
                      setInputText(e.target.value);
                    }
                  }}
                  placeholder={
                    etapa === 'nome'
                      ? 'Qual é o seu nome? (Digite aqui)...'
                      : etapa === 'cpf'
                      ? '000.000.000-00 (Opcional)'
                      : etapa === 'whatsapp'
                      ? '(85) 99999-9999 (Opcional)'
                      : etapa === 'voto_dep_federal'
                      ? 'Digite o número da Deputada ou Deputado Federal (4 dígitos)...'
                      : etapa === 'voto_dep_estadual'
                      ? 'Digite o número da Deputada ou Deputado Estadual (5 dígitos)...'
                      : etapa === 'voto_senador_1'
                      ? 'Digite o número da Senadora ou Senador - 1ª vaga (3 dígitos)...'
                      : etapa === 'voto_senador_2'
                      ? 'Digite o número da Senadora ou Senador - 2ª vaga (3 dígitos)...'
                      : etapa === 'voto_governador'
                      ? 'Digite o número da Governadora ou Governador (2 dígitos)...'
                      : 'Digite o número da candidata ou candidato a Presidente (2 dígitos)...'
                  }
                  className="flex-1 h-12 px-4 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && etapa !== 'cpf' && etapa !== 'whatsapp'}
                  className="size-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="size-5" />
                </button>
              </div>

              {etapa === 'cpf' && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handlePularCpf}
                    className="text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors py-1 flex items-center gap-1"
                  >
                    Avançar sem CPF <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}

              {etapa === 'whatsapp' && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handlePularWhatsapp}
                    className="text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors py-1 flex items-center gap-1"
                  >
                    Concluir Pesquisa sem WhatsApp <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
