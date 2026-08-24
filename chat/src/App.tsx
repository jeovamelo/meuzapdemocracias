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
  Ban,
  Users,
  AlertTriangle
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
import { ModalConsultaCandidatos } from './components/ModalConsultaCandidatos';
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
      if (typeof window !== 'undefined') {
        setRotaAtual(window.location.pathname.startsWith('/resultado') || window.location.hash.includes('resultado') ? 'resultado' : 'chat');
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

  // Listas de candidatos carregados por cargo (ordenados alfabeticamente)
  const [candidatosDepFederal, setCandidatosDepFederal] = useState<Candidato[]>([]);
  const [candidatosDepEstadual, setCandidatosDepEstadual] = useState<Candidato[]>([]);
  const [candidatosSenador, setCandidatosSenador] = useState<Candidato[]>([]);
  const [candidatosGovernador, setCandidatosGovernador] = useState<Candidato[]>([]);
  const [candidatosPresidente, setCandidatosPresidente] = useState<Candidato[]>([]);

  // Modal de consulta e ajuda com lista completa
  const [modalConsultaCargo, setModalConsultaCargo] = useState<{ cargoNome: string; candidatos: Candidato[] } | null>(null);

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
      carregarTodosCandidatos('CE');
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

  // Carregar todos os candidatos oficiais do banco interno (tse_candidatos + campaigns)
  const carregarTodosCandidatos = async (ufEscolhida: string) => {
    setCarregandoCandidatos(true);
    const ufUpper = (ufEscolhida || 'CE').toUpperCase();
    try {
      // 1. Buscar campanhas registradas
      const { data: dbCamps } = await supabase
        .from('campaigns')
        .select('*');

      const campMap = new Map<string, any>();
      (dbCamps || []).forEach((camp: any) => {
        const chave = `${camp.uf}_${camp.cargo}_${camp.nr_candidato}`.toUpperCase();
        campMap.set(chave, camp);
        campMap.set(`${camp.nr_candidato}`, camp);
      });

      // 2. Buscar candidatos do estado e presidente
      const { data: tseEstaduais, error: errEst } = await supabase
        .from('tse_candidatos')
        .select('*')
        .eq('sg_uf', ufUpper);

      if (errEst) console.warn('Erro tseEstaduais:', errEst);

      const { data: tsePresidentes, error: errPres } = await supabase
        .from('tse_candidatos')
        .select('*')
        .ilike('ds_cargo', '%PRESIDENTE%')
        .eq('sg_uf', 'BR');

      if (errPres) console.warn('Erro tsePresidentes:', errPres);

      const mapearItem = (t: any, cargoNome: string, ufItem: string): Candidato => {
        const campVinculada = campMap.get(`${ufItem}_${t.ds_cargo}_${t.nr_candidato}`.toUpperCase()) || campMap.get(`${t.nr_candidato}`);
        return {
          id: t.id || `${cargoNome.toLowerCase()}_${t.nr_candidato}`,
          nome: t.nm_candidato || t.nm_urna_candidato,
          nomeUrna: t.nm_urna_candidato || t.nm_candidato,
          numero: String(t.nr_candidato),
          cargo: cargoNome,
          partido: t.sg_partido || t.nm_partido || '',
          uf: ufItem,
          sq_candidato: t.sq_candidato ? String(t.sq_candidato) : undefined,
          fotoUrl: campVinculada?.foto_candidato_url || buildFotoCandidato(t, ufItem),
          campaign_id: campVinculada?.id,
        };
      };

      // Mapear Deputados Federais (ordenados alfabeticamente)
      const depFed: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'DEPUTADO FEDERAL')
        .map((t: any) => mapearItem(t, 'Dep. Federal (Dep. A)', ufUpper));
      depFed.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));

      // Mapear Deputados Estaduais (ordenados alfabeticamente)
      const depEst: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'].includes((t.ds_cargo || '').toUpperCase()))
        .map((t: any) => mapearItem(t, 'Deputado Estadual', ufUpper));
      depEst.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));

      // Mapear Senadores
      const senadores: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'SENADOR')
        .map((t: any) => mapearItem(t, 'Senador', ufUpper));
      senadores.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));

      // Mapear Governadores
      const governadores: Candidato[] = (tseEstaduais || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'GOVERNADOR')
        .map((t: any) => mapearItem(t, 'Governador', ufUpper));
      governadores.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));

      // Mapear Presidentes
      const presidentes: Candidato[] = (tsePresidentes || [])
        .filter((t: any) => (t.ds_cargo || '').toUpperCase() === 'PRESIDENTE')
        .map((t: any) => mapearItem(t, 'Presidente', 'BR'));
      presidentes.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));

      setCandidatosDepFederal(depFed);
      setCandidatosDepEstadual(depEst);
      setCandidatosSenador(senadores);
      setCandidatosGovernador(governadores);
      setCandidatosPresidente(presidentes);
    } catch (e) {
      console.warn('Erro ao carregar candidatos do banco:', e);
    } finally {
      setCarregandoCandidatos(false);
    }
  };

  // Buscar candidato por número com VALIDAÇÃO RIGOROSA DE CARGO (Anti-Cruzamento)
  const buscarCandidatoPorNumero = async (
    numeroDigitado: string,
    cargoBuscado: string
  ): Promise<{
    candidato: Candidato;
    avisoCargoCruzado?: { cargoReal: string; nomeReal: string };
  }> => {
    const numLimpo = numeroDigitado.replace(/\D/g, '');
    const ufUpper = (respostas.uf || 'CE').toUpperCase();

    let cargoDBSought = '';
    if (cargoBuscado.toLowerCase().includes('estadual') || cargoBuscado.toLowerCase().includes('distrital')) {
      cargoDBSought = 'DEPUTADO ESTADUAL';
    } else if (cargoBuscado.toLowerCase().includes('federal')) {
      cargoDBSought = 'DEPUTADO FEDERAL';
    } else if (cargoBuscado.toLowerCase().includes('senad')) {
      cargoDBSought = 'SENADOR';
    } else if (cargoBuscado.toLowerCase().includes('govern')) {
      cargoDBSought = 'GOVERNADOR';
    } else if (cargoBuscado.toLowerCase().includes('presid')) {
      cargoDBSought = 'PRESIDENTE';
    }

    try {
      // 1. Busca correspondência EXATA no banco interno tse_candidatos para este cargo e UF
      let query = supabase
        .from('tse_candidatos')
        .select('*')
        .eq('nr_candidato', numLimpo);

      if (cargoDBSought === 'DEPUTADO ESTADUAL') {
        query = query.in('ds_cargo', ['DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL']).eq('sg_uf', ufUpper);
      } else if (cargoDBSought === 'DEPUTADO FEDERAL') {
        query = query.eq('ds_cargo', 'DEPUTADO FEDERAL').eq('sg_uf', ufUpper);
      } else if (cargoDBSought === 'SENADOR') {
        query = query.eq('ds_cargo', 'SENADOR').eq('sg_uf', ufUpper);
      } else if (cargoDBSought === 'GOVERNADOR') {
        query = query.eq('ds_cargo', 'GOVERNADOR').eq('sg_uf', ufUpper);
      } else if (cargoDBSought === 'PRESIDENTE') {
        query = query.eq('ds_cargo', 'PRESIDENTE');
      }

      const { data: exactTse } = await query.limit(1);
      const dbTse = exactTse && exactTse.length > 0 ? exactTse[0] : null;

      // 2. Busca correspondência EXATA na base de campanhas para este cargo e UF
      const { data: dbCamps } = await supabase
        .from('campaigns')
        .select('*')
        .eq('nr_candidato', numLimpo);

      const exactCamp = (dbCamps || []).find((c: any) => {
        const cCargo = (c.cargo || '').toUpperCase();
        if (cargoDBSought === 'PRESIDENTE') return cCargo.includes('PRESIDENTE');
        if (cargoDBSought === 'DEPUTADO ESTADUAL') return (cCargo.includes('ESTADUAL') || cCargo.includes('DISTRITAL')) && (c.uf || '').toUpperCase() === ufUpper;
        if (cargoDBSought === 'DEPUTADO FEDERAL') return cCargo.includes('FEDERAL') && (c.uf || '').toUpperCase() === ufUpper;
        if (cargoDBSought === 'SENADOR') return cCargo.includes('SENADOR') && (c.uf || '').toUpperCase() === ufUpper;
        if (cargoDBSought === 'GOVERNADOR') return cCargo.includes('GOVERNADOR') && (c.uf || '').toUpperCase() === ufUpper;
        return false;
      });

      // Se encontrou candidato oficial para o cargo exato:
      if (dbTse) {
        return {
          candidato: {
            id: dbTse.id || `tse_${numLimpo}`,
            nome: dbTse.nm_candidato || dbTse.nm_urna_candidato,
            nomeUrna: dbTse.nm_urna_candidato || dbTse.nm_candidato,
            numero: String(dbTse.nr_candidato),
            cargo: dbTse.ds_cargo || cargoBuscado,
            partido: dbTse.sg_partido || dbTse.nm_partido || '',
            uf: cargoDBSought === 'PRESIDENTE' ? 'BR' : (dbTse.sg_uf || ufUpper),
            sq_candidato: dbTse.sq_candidato ? String(dbTse.sq_candidato) : undefined,
            fotoUrl: exactCamp?.foto_candidato_url || buildFotoCandidato(dbTse, cargoDBSought === 'PRESIDENTE' ? 'BR' : (dbTse.sg_uf || ufUpper)),
            campaign_id: exactCamp?.id,
          },
        };
      }

      if (exactCamp) {
        return {
          candidato: {
            id: exactCamp.id,
            nome: exactCamp.nome_candidato || exactCamp.nome_urna,
            nomeUrna: exactCamp.nome_urna || exactCamp.nome_candidato,
            numero: exactCamp.nr_candidato,
            cargo: exactCamp.cargo || cargoBuscado,
            partido: exactCamp.partido || '',
            uf: exactCamp.uf || ufUpper,
            fotoUrl: exactCamp.foto_candidato_url || '',
            campaign_id: exactCamp.id,
          },
        };
      }

      // 3. VALIDAÇÃO ANTI-CRUZAMENTO: Verificar se o número pertence a OUTRO CARGO
      const { data: otherTse } = await supabase
        .from('tse_candidatos')
        .select('*')
        .eq('nr_candidato', numLimpo)
        .or(`sg_uf.eq.BR,sg_uf.eq.${ufUpper}`)
        .limit(1);

      if (otherTse && otherTse.length > 0) {
        const o = otherTse[0];
        const outroCargo = o.ds_cargo || 'Outro Cargo';
        const outroNome = o.nm_urna_candidato || o.nm_candidato || `Candidato ${numLimpo}`;
        return {
          candidato: {
            id: `nulo_${numLimpo}`,
            nome: `Voto Nulo (Nº ${numLimpo})`,
            nomeUrna: `Voto Nulo (Nº ${numLimpo})`,
            numero: numLimpo,
            cargo: cargoBuscado,
            partido: 'NÃO REGISTRADO',
            uf: ufUpper,
            isBrancoNulo: true,
          },
          avisoCargoCruzado: { cargoReal: outroCargo, nomeReal: outroNome },
        };
      }

      if (dbCamps && dbCamps.length > 0) {
        const campOther = dbCamps[0];
        const outroCargo = campOther.cargo || 'Outro Cargo';
        const outroNome = campOther.nome_urna || campOther.nome_candidato || `Candidato ${numLimpo}`;
        return {
          candidato: {
            id: `nulo_${numLimpo}`,
            nome: `Voto Nulo (Nº ${numLimpo})`,
            nomeUrna: `Voto Nulo (Nº ${numLimpo})`,
            numero: numLimpo,
            cargo: cargoBuscado,
            partido: 'NÃO REGISTRADO',
            uf: ufUpper,
            isBrancoNulo: true,
          },
          avisoCargoCruzado: { cargoReal: outroCargo, nomeReal: outroNome },
        };
      }
    } catch (err) {
      console.warn('Erro ao verificar cargo cruzado:', err);
    }

    // 4. Número não localizado em nenhum cargo (VOTO NULO padrão)
    return {
      candidato: {
        id: `nulo_${numLimpo}`,
        nome: `Voto Nulo (Nº ${numLimpo})`,
        nomeUrna: `Voto Nulo (Nº ${numLimpo})`,
        numero: numLimpo,
        cargo: cargoBuscado,
        partido: 'NÃO REGISTRADO',
        uf: ufUpper,
        isBrancoNulo: true,
      },
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
        if (!validarCpf(textoLimpo)) {
          toast.error('Por favor, informe um CPF válido ou clique em pular.');
          return;
        }
      }

      const cpfFormatado = textoLimpo ? formatarCpf(textoLimpo) : '';
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: cpfFormatado || 'Prefiro não informar o CPF',
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      setRespostas((prev) => ({ ...prev, cpf: cpfFormatado }));
      await adicionarMensagemBot('Em qual ESTADO (UF) você vota? Escolha uma das opções abaixo:');
      setEtapa('uf');
      return;
    }

    // VOTO DEP. FEDERAL (DEP. A) POR NÚMERO
    if (etapa === 'voto_dep_federal') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Número: ${textoLimpo}`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      setInputText('');

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Dep. Federal (Dep. A)');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: Você informou o número ${textoLimpo}, que pertence a um candidato a ${cargoReal} (${nomeReal}).\n\n` +
          `Como você está votando para Dep. Federal (Dep. A), este número é INVÁLIDO para este cargo e será computado como VOTO NULO caso confirme.\n\n` +
          `👉 Clique em "Corrigir" para redigitar o número certo ou "Confirmar" para registrar como voto nulo:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(
          `⚠️ O número ${textoLimpo} não foi localizado entre os candidatos oficiais a Dep. Federal (Dep. A) em ${respostas.uf}.\n\n` +
          `Este voto será registrado como VOTO NULO. Deseja corrigir o número ou confirmar o voto nulo?`
        );
      } else {
        await adicionarMensagemBot(`Localizamos o candidato oficial abaixo. Confirma seu voto para Dep. Federal (Dep. A)?`);
      }
      setEtapa('confirm_dep_federal');
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

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Deputado Estadual');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: Você informou o número ${textoLimpo}, que pertence a um candidato a ${cargoReal} (${nomeReal}).\n\n` +
          `Como você está votando para Deputado Estadual, este número é INVÁLIDO para este cargo e será computado como VOTO NULO caso confirme.\n\n` +
          `👉 Clique em "Corrigir" para redigitar o número certo ou "Confirmar" para registrar como voto nulo:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(
          `⚠️ O número ${textoLimpo} não foi localizado entre os candidatos oficiais a Deputado Estadual em ${respostas.uf}.\n\n` +
          `Este voto será registrado como VOTO NULO. Deseja corrigir o número ou confirmar o voto nulo?`
        );
      } else {
        await adicionarMensagemBot(`Localizamos o candidato oficial abaixo. Confirma seu voto para Deputado Estadual?`);
      }
      setEtapa('confirm_dep_estadual');
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

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Senador');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: O número ${textoLimpo} pertence a ${cargoReal} (${nomeReal}). Para 1º Senador, será computado como VOTO NULO caso confirme:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(`⚠️ O número ${textoLimpo} não foi localizado para Senador(a). Será registrado como VOTO NULO. Confirma?`);
      } else {
        await adicionarMensagemBot(`Confirma seu voto para 1º Senador(a)?`);
      }
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

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Senador');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: O número ${textoLimpo} pertence a ${cargoReal} (${nomeReal}). Para 2º Senador, será computado como VOTO NULO caso confirme:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(`⚠️ O número ${textoLimpo} não foi localizado para Senador(a). Será registrado como VOTO NULO. Confirma?`);
      } else {
        await adicionarMensagemBot(`Confirma seu voto para 2º Senador(a)?`);
      }
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

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Governador');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: O número ${textoLimpo} pertence a ${cargoReal} (${nomeReal}). Para Governador(a), será computado como VOTO NULO caso confirme:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(`⚠️ O número ${textoLimpo} não foi localizado para Governador(a) em ${respostas.uf}. Será registrado como VOTO NULO. Confirma?`);
      } else {
        await adicionarMensagemBot(`Confirma seu voto para Governador(a)?`);
      }
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

      const resBusca = await buscarCandidatoPorNumero(textoLimpo, 'Presidente');
      const cand = resBusca.candidato;
      setCandidatoTemp(cand);

      if (resBusca.avisoCargoCruzado) {
        const { cargoReal, nomeReal } = resBusca.avisoCargoCruzado;
        await adicionarMensagemBot(
          `⚠️ ATENÇÃO: O número ${textoLimpo} pertence a ${cargoReal} (${nomeReal}). Para Presidente, será computado como VOTO NULO caso confirme:`
        );
      } else if (cand.partido === 'NÃO REGISTRADO') {
        await adicionarMensagemBot(`⚠️ O número ${textoLimpo} não foi localizado para Presidente. Será registrado como VOTO NULO. Confirma?`);
      } else {
        await adicionarMensagemBot(`Confirma seu voto para Presidente?`);
      }
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
    await adicionarMensagemBot('Sem problemas! Em qual ESTADO (UF) você vota? Escolha uma das opções abaixo:');
    setEtapa('uf');
  };

  // Escolha do Estado (UF)
  const handleSelecionarUf = async (ufEscolhida: string) => {
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `Estado: ${ufEscolhida}`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    setRespostas((prev) => ({ ...prev, uf: ufEscolhida }));
    await carregarTodosCandidatos(ufEscolhida);

    await adicionarMensagemBot(`Perfeito! Vamos iniciar a pesquisa seguindo a ordem oficial da cola e da urna eletrônica:`);
    await adicionarMensagemBot(`1️⃣ Digite o NÚMERO da sua candidata ou candidato a DEPUTADA OU DEPUTADO FEDERAL (4 dígitos), consulte a lista ou escolha Branco / Nulo:`);
    setEtapa('voto_dep_federal');
  };

  // Seleção de candidato via Modal de Consulta
  const handleSelecionarCandidatoViaModal = async (c: Candidato) => {
    setCandidatoTemp(c);
    if (etapa === 'voto_dep_federal') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Localizamos o candidato oficial abaixo. Confirma seu voto para Dep. Federal (Dep. A)?`);
      setEtapa('confirm_dep_federal');
    } else if (etapa === 'voto_dep_estadual') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Localizamos o candidato oficial abaixo. Confirma seu voto para Deputado Estadual?`);
      setEtapa('confirm_dep_estadual');
    } else if (etapa === 'voto_senador_1') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Confirma seu voto para 1º Senador(a)?`);
      setEtapa('confirm_senador_1');
    } else if (etapa === 'voto_senador_2') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Confirma seu voto para 2º Senador(a)?`);
      setEtapa('confirm_senador_2');
    } else if (etapa === 'voto_governador') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Confirma seu voto para Governador(a)?`);
      setEtapa('confirm_governador');
    } else if (etapa === 'voto_presidente') {
      const userMsg: Mensagem = {
        id: Math.random().toString(36).substring(2, 9),
        remetente: 'user',
        conteudo: `Candidato selecionado: ${c.nomeUrna} (${c.numero})`,
        timestamp: getHoraAtual(),
      };
      setMensagens((prev) => [...prev, userMsg]);
      await adicionarMensagemBot(`Confirma seu voto para Presidente da República?`);
      setEtapa('confirm_presidente');
    }
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

    const isNuloOuBranco =
      candidatoTemp.isBrancoNulo ||
      candidatoTemp.partido === 'NÃO REGISTRADO' ||
      candidatoTemp.numero === 'BRANCO' ||
      candidatoTemp.numero === 'NULO';

    const textoConfirmacao = isNuloOuBranco
      ? candidatoTemp.numero === 'BRANCO'
        ? `⚪ Voto em Branco registrado`
        : `🚫 Voto NULO registrado (Nº ${candidatoTemp.numero})`
      : `✅ Voto confirmado: ${candidatoTemp.nomeUrna} (${candidatoTemp.numero})`;

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: textoConfirmacao,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setCandidatoTemp(null);

    await adicionarMensagemBot(proximaMsg);
    setEtapa(proximaEtapa);
  };

  // CORREÇÃO DE VOTO
  const handleCorrigirVoto = async (etapaVolta: EtapaChat, mensagemOrientacao: string) => {
    setCandidatoTemp(null);
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: '🔄 Quero corrigir meu voto',
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    await adicionarMensagemBot(mensagemOrientacao);
    setEtapa(etapaVolta);
  };

  // Confirmação de Localização (Cidade + Bairro)
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
      const getRespondenteToken = () => {
        let token = localStorage.getItem('democracias_respondente_token');
        if (!token) {
          token = 'resp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
          localStorage.setItem('democracias_respondente_token', token);
        }
        return token;
      };

      const token = getRespondenteToken();
      const cpfLimpo = respostasFinais.cpf ? respostasFinais.cpf.replace(/\D/g, '') : null;

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

      const extrairVotoParaDb = (cand?: Candidato | null) => {
        if (!cand || cand.isBrancoNulo || cand.partido === 'NÃO REGISTRADO' || cand.numero === 'BRANCO' || cand.numero === 'NULO') {
          const isBranco = cand?.numero === 'BRANCO' || cand?.nomeUrna?.toLowerCase().includes('branco');
          return {
            numero: isBranco ? 'BRANCO' : 'NULO',
            nome: isBranco ? 'Voto em Branco' : 'Voto Nulo',
            foto: null,
            partido: isBranco ? 'BRANCO' : 'NULO',
          };
        }
        return {
          numero: cand.numero || null,
          nome: cand.nomeUrna || null,
          foto: cand.fotoUrl || null,
          partido: cand.partido || null,
        };
      };

      const vDepFed = extrairVotoParaDb(respostasFinais.votos.deputado_federal);
      const vDepEst = extrairVotoParaDb(respostasFinais.votos.deputado_estadual);
      const vSen1 = extrairVotoParaDb(respostasFinais.votos.senador_1);
      const vSen2 = extrairVotoParaDb(respostasFinais.votos.senador_2);
      const vGov = extrairVotoParaDb(respostasFinais.votos.governador);
      const vPres = extrairVotoParaDb(respostasFinais.votos.presidente);

      const dadosParaSalvar: any = {
        nome: respostasFinais.nome || null,
        cpf: cpfLimpo,
        respondente_token: token,
        uf: respostasFinais.uf || 'CE',
        municipio: respostasFinais.municipio || null,
        bairro: respostasFinais.bairro || null,
        whatsapp: zapInformado ? zapInformado.replace(/\D/g, '') : null,
        telefone: zapInformado ? zapInformado.replace(/\D/g, '') : null,
        
        dep_federal_numero: vDepFed.numero,
        dep_federal_nome: vDepFed.nome,
        dep_federal_foto: vDepFed.foto,
        dep_federal_partido: vDepFed.partido,

        dep_estadual_numero: vDepEst.numero,
        dep_estadual_nome: vDepEst.nome,
        dep_estadual_foto: vDepEst.foto,
        dep_estadual_partido: vDepEst.partido,

        senador1_numero: vSen1.numero,
        senador1_nome: vSen1.nome,
        senador1_foto: vSen1.foto,
        senador1_partido: vSen1.partido,

        senador2_numero: vSen2.numero,
        senador2_nome: vSen2.nome,
        senador2_foto: vSen2.foto,
        senador2_partido: vSen2.partido,

        governador_numero: vGov.numero,
        governador_nome: vGov.nome,
        governador_foto: vGov.foto,
        governador_partido: vGov.partido,

        presidente_numero: vPres.numero,
        presidente_nome: vPres.nome,
        presidente_foto: vPres.foto,
        presidente_partido: vPres.partido,

        atualizado_em: new Date().toISOString(),
      };

      if (pesquisaExistenteId) {
        const { error } = await supabase
          .from('pesquisas_chat')
          .update(dadosParaSalvar)
          .eq('id', pesquisaExistenteId);
        if (error) throw error;
      } else {
        dadosParaSalvar.criado_em = new Date().toISOString();
        const { error } = await supabase
          .from('pesquisas_chat')
          .insert([dadosParaSalvar]);
        if (error) throw error;
      }

      await adicionarMensagemBot('🎉 Sua pesquisa eleitoral foi gravada com sucesso!');
      await adicionarMensagemBot('Aqui está o seu cartão resumo oficial (sua Colinha Eleitoral 2026). Você pode baixá-la ou compartilhar agora mesmo:');
      setEtapa('colinha');
    } catch (err: any) {
      console.error('Erro ao salvar pesquisa no Supabase:', err);
      toast.error('Erro ao registrar pesquisa. Verifique sua conexão.');
    } finally {
      setSalvando(false);
    }
  };

  // Enviar WhatsApp final
  const handleEnviarWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    const zap = inputText.trim();
    if (zap) {
      const zapLimpo = zap.replace(/\D/g, '');
      if (zapLimpo.length < 10) {
        toast.error('Informe um WhatsApp válido com DDD ou clique em pular.');
        return;
      }
    }

    const zapFormatado = zap ? formatarWhatsapp(zap) : '';
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: zapFormatado || 'Concluir sem WhatsApp',
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setInputText('');

    await salvarPesquisaCompleta(zapFormatado);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      <Toaster richColors position="top-right" theme="dark" />

      {/* CABEÇALHO */}
      <ChatHeader />

      {/* ÁREA DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4">
        {mensagens.map((msg) => (
          <MessageBubble key={msg.id} mensagem={msg} />
        ))}

        {digitando && <TypingIndicator />}

        {/* COMPONENTES INTERATIVOS INLINE NO CHAT */}
        <div className="space-y-4 pt-1">
          {/* ETAPA: ESCOLHA DE ESTADO (UF) */}
          {etapa === 'uf' && !digitando && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 shadow-xl animate-message">
              <div className="flex items-center gap-2 text-xs font-black text-orange-400">
                <MapPin className="size-4" /> Selecione o seu Estado (UF):
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {ESTADOS_BR.map((sigla) => (
                  <button
                    key={sigla}
                    onClick={() => handleSelecionarUf(sigla)}
                    className="h-10 rounded-xl bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center justify-center font-mono shadow-sm active:scale-95"
                  >
                    {sigla}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ETAPAS PROPORCIONAIS (BOTÃO LISTA COMPLETA DE CANDIDATOS + BRANCO/NULO) */}
          {(etapa === 'voto_dep_estadual' || etapa === 'voto_dep_federal') && !digitando && (
            <div className="space-y-2 my-2 animate-message">
              <button
                type="button"
                onClick={() => {
                  const cargoNome = etapa === 'voto_dep_federal' ? 'Dep. Federal (Dep. A)' : 'Deputado Estadual';
                  const lista = etapa === 'voto_dep_federal' ? candidatosDepFederal : candidatosDepEstadual;
                  setModalConsultaCargo({ cargoNome, candidatos: lista });
                }}
                className="w-full h-11 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Users className="size-4 text-orange-400" />
                <span>
                  📋 Ver lista completa de candidatos ({etapa === 'voto_dep_federal' ? candidatosDepFederal.length : candidatosDepEstadual.length})
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleVotoBrancoNulo(
                      'BRANCO',
                      etapa === 'voto_dep_estadual' ? 'Deputado Estadual' : 'Dep. Federal (Dep. A)',
                      etapa === 'voto_dep_estadual' ? 'confirm_dep_estadual' : 'confirm_dep_federal'
                    )
                  }
                  className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CircleDot className="size-3.5 text-slate-300" /> Votar em Branco
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleVotoBrancoNulo(
                      'NULO',
                      etapa === 'voto_dep_estadual' ? 'Deputado Estadual' : 'Dep. Federal (Dep. A)',
                      etapa === 'voto_dep_estadual' ? 'confirm_dep_estadual' : 'confirm_dep_federal'
                    )
                  }
                  className="flex-1 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Ban className="size-3.5 text-rose-400" /> Votar Nulo
                </button>
              </div>
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: DEP FEDERAL */}
          {etapa === 'confirm_dep_federal' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Dep. Federal (Dep. A)" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'deputado_federal',
                      '2️⃣ Agora digite o NÚMERO da sua candidata ou candidato a DEPUTADO ESTADUAL (5 dígitos), consulte a lista ou escolha Branco / Nulo:',
                      'voto_dep_estadual'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_dep_federal',
                      'Digite novamente o número da sua escolha para Dep. Federal (Dep. A) (4 dígitos) ou consulte a lista abaixo:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA CONFIRMAÇÃO: DEP ESTADUAL */}
          {etapa === 'confirm_dep_estadual' && candidatoTemp && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoTemp} tituloCargo="Deputado Estadual" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'deputado_estadual',
                      '3️⃣ Escolha para SENADOR(A) (1ª vaga - 3 dígitos). Apresentamos as opções por ordem de número abaixo:',
                      'voto_senador_1'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_dep_estadual',
                      'Digite novamente o número da sua escolha para Deputado Estadual (5 dígitos) ou consulte a lista abaixo:'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - 1º SENADOR */}
          {etapa === 'voto_senador_1' && !digitando && (
            <div className="my-3 space-y-2">
              <button
                type="button"
                onClick={() => setModalConsultaCargo({ cargoNome: 'Senador (1ª Vaga)', candidatos: candidatosSenador })}
                className="w-full h-10 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Users className="size-4 text-orange-400" />
                <span>📋 Ver todos os candidatos a Senador ({candidatosSenador.length})</span>
              </button>

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
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - 2º SENADOR */}
          {etapa === 'voto_senador_2' && !digitando && (
            <div className="my-3 space-y-2">
              <button
                type="button"
                onClick={() => setModalConsultaCargo({ cargoNome: 'Senador (2ª Vaga)', candidatos: candidatosSenador })}
                className="w-full h-10 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Users className="size-4 text-orange-400" />
                <span>📋 Ver todos os candidatos a Senador ({candidatosSenador.length})</span>
              </button>

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
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - GOVERNADOR */}
          {etapa === 'voto_governador' && !digitando && (
            <div className="my-3 space-y-2">
              <button
                type="button"
                onClick={() => setModalConsultaCargo({ cargoNome: 'Governador(a)', candidatos: candidatosGovernador })}
                className="w-full h-10 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Users className="size-4 text-orange-400" />
                <span>📋 Ver todos os candidatos a Governador ({candidatosGovernador.length})</span>
              </button>

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
              <CandidateCard candidato={candidatoTemp} tituloCargo="Governador(a)" modoConfirmacao />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    handleConfirmarVoto(
                      'governador',
                      '6️⃣ Por fim, escolha a sua candidata ou candidato a PRESIDENTE (2 dígitos):',
                      'voto_presidente'
                    )
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="size-4" /> Confirmar
                </button>
                <button
                  onClick={() =>
                    handleCorrigirVoto(
                      'voto_governador',
                      'Selecione novamente o seu candidato a Governador(a):'
                    )
                  }
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: SELEÇÃO MAJORITÁRIA - PRESIDENTE */}
          {etapa === 'voto_presidente' && !digitando && (
            <div className="my-3 space-y-2">
              <button
                type="button"
                onClick={() => setModalConsultaCargo({ cargoNome: 'Presidente', candidatos: candidatosPresidente })}
                className="w-full h-10 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Users className="size-4 text-orange-400" />
                <span>📋 Ver todos os candidatos a Presidente ({candidatosPresidente.length})</span>
              </button>

              <MajoritarySelect
                cargoTitulo="Presidente"
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
                  await adicionarMensagemBot(`Confirma seu voto para PRESIDENTE em ${cand.nomeUrna} (${cand.numero}${cand.partido ? ` - ${cand.partido}` : ''})?`);
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
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Corrigir
                </button>
              </div>
            </div>
          )}

          {/* ETAPA: LOCALIZAÇÃO (CIDADE + BAIRRO + CEP) */}
          {etapa === 'localizacao' && !digitando && (
            <div className="my-2">
              <LocationInput
                uf={respostas.uf}
                onConfirmarLocalizacao={handleConfirmarLocalizacao}
              />
            </div>
          )}

          {/* ETAPA FINAL: COLINHA RESUMO */}
          {etapa === 'colinha' && (
            <div className="my-3">
              <ColinhaResumo respostas={respostas} />
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* MODAL DE CONSULTA DE CANDIDATOS (ORDEM ALFABÉTICA) */}
      {modalConsultaCargo && (
        <ModalConsultaCandidatos
          cargoNome={modalConsultaCargo.cargoNome}
          uf={respostas.uf}
          candidatos={modalConsultaCargo.candidatos}
          onSelecionarCandidato={handleSelecionarCandidatoViaModal}
          onFechar={() => setModalConsultaCargo(null)}
        />
      )}

      {/* BARRA DE ENTRADA DE TEXTO INFERIOR */}
      {etapa !== 'colinha' && (
        <div className="border-t border-slate-800 bg-slate-950/95 p-3 sm:p-4 shrink-0">
          <div className="max-w-2xl mx-auto space-y-2">
            {/* BOTÃO PULAR CPF */}
            {etapa === 'cpf' && (
              <button
                type="button"
                onClick={handlePularCpf}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-200 py-1.5 text-center transition-colors"
              >
                Pular CPF e prosseguir anônimo →
              </button>
            )}

            {/* BOTÃO CONCLUIR SEM WHATSAPP */}
            {etapa === 'whatsapp' && (
              <button
                type="button"
                onClick={() => salvarPesquisaCompleta()}
                disabled={salvando}
                className="w-full text-xs font-bold text-orange-400 hover:text-orange-300 py-1.5 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {salvando ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Concluir e gerar minha Colinha sem WhatsApp →</span>
              </button>
            )}

            <form onSubmit={etapa === 'whatsapp' ? handleEnviarWhatsapp : handleEnviarTexto} className="flex gap-2">
              <input
                type={
                  etapa === 'cpf' || etapa.startsWith('voto_') || etapa === 'whatsapp'
                    ? 'tel'
                    : 'text'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  etapa === 'nome'
                    ? 'Digite o seu nome completo ou apelido...'
                    : etapa === 'cpf'
                    ? 'Digite o seu CPF (Opcional)...'
                    : etapa === 'voto_dep_federal'
                    ? 'Digite o NÚMERO do Deputado Federal (4 dígitos)...'
                    : etapa === 'voto_dep_estadual'
                    ? 'Digite o NÚMERO do Deputado Estadual (5 dígitos)...'
                    : etapa === 'voto_senador_1' || etapa === 'voto_senador_2'
                    ? 'Digite o NÚMERO do Senador (3 dígitos) ou toque acima...'
                    : etapa === 'voto_governador'
                    ? 'Digite o NÚMERO do Governador (2 dígitos) ou toque acima...'
                    : etapa === 'voto_presidente'
                    ? 'Digite o NÚMERO do Presidente (2 dígitos) ou toque acima...'
                    : etapa === 'whatsapp'
                    ? 'Digite o seu WhatsApp com DDD (Opcional)...'
                    : 'Digite sua mensagem...'
                }
                disabled={digitando || salvando || etapa.startsWith('confirm_') || etapa === 'uf' || etapa === 'localizacao'}
                className="flex-1 h-12 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  digitando ||
                  salvando ||
                  (!inputText.trim() && etapa !== 'cpf' && etapa !== 'whatsapp') ||
                  etapa.startsWith('confirm_') ||
                  etapa === 'uf' ||
                  etapa === 'localizacao'
                }
                className="size-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {salvando ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
