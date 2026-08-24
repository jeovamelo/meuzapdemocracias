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
  Sparkles
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { supabase } from './lib/supabase';
import { formatarCpf } from './lib/cep';
import { getHoraAtual } from './lib/date';
import type { Candidato, EtapaChat, Mensagem, RespostaUsuario } from './types';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { CandidateCard } from './components/CandidateCard';
import { CandidateSelect } from './components/CandidateSelect';
import { LocationInput } from './components/LocationInput';
import { ShareBanner } from './components/ShareBanner';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function App() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [etapa, setEtapa] = useState<EtapaChat>('boas_vindas');
  const [digitando, setDigitando] = useState(false);
  const [inputText, setInputText] = useState('');
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Dados coletados
  const [respostas, setRespostas] = useState<RespostaUsuario>({
    nome: '',
    cpf: '',
    uf: 'CE',
    municipio: '',
    bairro: '',
  });

  // Lista de candidatos carregados
  const [candidatosDisponiveis, setCandidatosDisponiveis] = useState<Candidato[]>([]);
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<Candidato | null>(null);

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
        conteudo: '👋 Olá! Bem-vindo(a) à Pesquisa Cívica Oficial da plataforma Democracias.\n\nSua opinião e apoio ajudam a direcionar as ações estratégicas das campanhas da sua região.',
        timestamp: getHoraAtual(),
      };

      setMensagens([msg1]);

      setDigitando(true);
      await new Promise((r) => setTimeout(r, 800));
      setDigitando(false);

      const msg2: Mensagem = {
        id: '2',
        remetente: 'bot',
        conteudo: 'Para começarmos, qual é o seu Nome Completo?',
        timestamp: getHoraAtual(),
      };

      setMensagens((prev) => [...prev, msg2]);
      setEtapa('nome');
    };

    iniciarChat();
  }, []);

  // Adiciona mensagem do bot com simulação natural de digitação
  const adicionarMensagemBot = async (conteudo: string, delay = 600) => {
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

  // Carregar candidatos da UF
  const carregarCandidatosPorUf = async (ufEscolhida: string) => {
    setCarregandoCandidatos(true);
    try {
      // 1. Buscar campanhas registradas no Supabase
      const { data: campanhasDb, error: errCamp } = await supabase
        .from('campaigns')
        .select('*')
        .eq('uf', ufEscolhida.toUpperCase().trim());

      let lista: Candidato[] = [];

      if (!errCamp && campanhasDb && campanhasDb.length > 0) {
        lista = campanhasDb.map((c: any) => ({
          id: c.id,
          nome: c.nome_candidato || c.nome_urna || 'Candidato',
          nomeUrna: c.nome_urna || c.nome_candidato || 'Candidato',
          numero: c.nr_candidato,
          cargo: c.cargo || 'Candidato(a)',
          partido: c.partido || '',
          uf: c.uf,
          fotoUrl: c.foto_candidato_url || '',
          campaign_id: c.id,
        }));
      }

      // 2. Se não houver campanhas cadastradas nessa UF, buscar tabela tse_candidatos
      if (lista.length === 0) {
        const { data: tseData } = await supabase
          .from('tse_candidatos')
          .select('*')
          .eq('sg_uf', ufEscolhida.toUpperCase().trim())
          .limit(20);

        if (tseData && tseData.length > 0) {
          lista = tseData.map((t: any) => ({
            id: t.id || `tse_${t.nr_candidato}`,
            nome: t.nm_candidato || t.nm_urna_candidato,
            nomeUrna: t.nm_urna_candidato || t.nm_candidato,
            numero: String(t.nr_candidato),
            cargo: t.ds_cargo || 'Candidato(a)',
            partido: t.sg_partido || '',
            uf: t.sg_uf,
            fotoUrl: t.foto_url || '',
          }));
        }
      }

      // 3. Fallback inteligente de candidatos de referência do Ceará caso a base esteja vazia
      if (lista.length === 0 && ufEscolhida.toUpperCase() === 'CE') {
        lista = [
          {
            id: 'elmano_13',
            nome: 'Elmano de Freitas da Costa',
            nomeUrna: 'Elmano de Freitas',
            numero: '13',
            cargo: 'Governador',
            partido: 'PT - Federação Brasil da Esperança',
            uf: 'CE',
            fotoUrl: 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/2026/CE/202600000001',
          },
          {
            id: 'camilo_133',
            nome: 'Camilo Sobreira de Santana',
            nomeUrna: 'Camilo Santana',
            numero: '133',
            cargo: 'Senador',
            partido: 'PT',
            uf: 'CE',
          }
        ];
      }

      setCandidatosDisponiveis(lista);
    } catch (e) {
      console.warn('Erro ao carregar candidatos:', e);
    } finally {
      setCarregandoCandidatos(false);
    }
  };

  // Submissão do Input de Texto (Nome, CPF)
  const handleEnviarTexto = async (e: React.FormEvent) => {
    e.preventDefault();
    const textoLimpo = inputText.trim();
    if (!textoLimpo && etapa !== 'cpf') return;

    // Adiciona mensagem do usuário
    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: textoLimpo || 'Prefiro não informar',
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setInputText('');

    if (etapa === 'nome') {
      setRespostas((prev) => ({ ...prev, nome: textoLimpo }));
      await adicionarMensagemBot(`Muito prazer, ${textoLimpo.split(' ')[0]}! 👍`);
      await adicionarMensagemBot('Gostaria de informar o seu CPF? (É totalmente opcional para autenticação de apoio único)');
      setEtapa('cpf');
    } else if (etapa === 'cpf') {
      const cpfFormatado = formatarCpf(textoLimpo);
      setRespostas((prev) => ({ ...prev, cpf: cpfFormatado }));
      await adicionarMensagemBot('Em qual Estado (UF) você vota ou reside atualmente?');
      setEtapa('uf');
    }
  };

  // Pular etapa de CPF
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
    await carregarCandidatosPorUf(ufEscolhida);

    await adicionarMensagemBot(`Carregando os candidatos disponíveis no estado de ${ufEscolhida}...`);
    await adicionarMensagemBot('Qual candidato(a) você apoia ou pretende votar nesta eleição?');
    setEtapa('candidato_selecao');
  };

  // Selecionar Candidato
  const handleSelecionarCandidato = async (candidato: Candidato) => {
    setCandidatoSelecionado(candidato);
    setRespostas((prev) => ({ ...prev, candidato }));

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `Escolhi: ${candidato.nomeUrna} (${candidato.numero})`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    await adicionarMensagemBot(`Excelente escolha! Por favor, confirme o seu apoio:`);
    setEtapa('candidato_confirmacao');
  };

  // Confirmar Candidato
  const handleConfirmarCandidato = async () => {
    if (!candidatoSelecionado) return;

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `✅ Confirmado apoio a ${candidatoSelecionado.nomeUrna} (${candidatoSelecionado.numero})`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    await adicionarMensagemBot('Perfeito! Para mapearmos os votos e demandas por região, informe a sua Cidade e Bairro:');
    setEtapa('localizacao');
  };

  // Trocar Candidato
  const handleTrocarCandidato = async () => {
    setCandidatoSelecionado(null);
    await adicionarMensagemBot('Selecione novamente o seu candidato(a) na lista abaixo:');
    setEtapa('candidato_selecao');
  };

  // Confirmar Localização e Salvar no Supabase
  const handleConfirmarLocalizacao = async (dadosLoc: { cidade: string; bairro: string; cep?: string }) => {
    setSalvando(true);

    const userMsg: Mensagem = {
      id: Math.random().toString(36).substring(2, 9),
      remetente: 'user',
      conteudo: `📍 ${dadosLoc.cidade}/${respostas.uf} — Bairro ${dadosLoc.bairro}`,
      timestamp: getHoraAtual(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    try {
      const finalCampId = candidatoSelecionado?.campaign_id || null;

      // 1. Salvar na tabela pessoas (Pessoa / Apoiador da Campanha)
      const { data: pessoaCriada, error: errPessoa } = await supabase
        .from('pessoas')
        .insert([{
          nome: respostas.nome.trim(),
          cpf: respostas.cpf ? respostas.cpf.replace(/\D/g, '') : null,
          tipo: 'apoiador',
          funcao: 'Apoiador(a) / Participante Pesquisa Chat',
          meta_votos: 1,
          uf: respostas.uf,
          municipio: dadosLoc.cidade,
          bairro: dadosLoc.bairro,
          cep: dadosLoc.cep || null,
          campanha_id: finalCampId,
          campaign_id: finalCampId,
          status: 'ativo'
        }])
        .select()
        .single();

      if (errPessoa) {
        console.warn('Erro ao persistir em pessoas:', errPessoa);
      }

      // 2. Salvar na tabela de inteligência pesquisas_chat
      const { error: errPesquisa } = await supabase
        .from('pesquisas_chat')
        .insert([{
          pessoa_id: pessoaCriada?.id || null,
          campaign_id: finalCampId,
          nome: respostas.nome.trim(),
          cpf: respostas.cpf || null,
          uf: respostas.uf,
          municipio: dadosLoc.cidade,
          bairro: dadosLoc.bairro,
          candidato_nome: candidatoSelecionado?.nome,
          candidato_urna: candidatoSelecionado?.nomeUrna,
          candidato_numero: candidatoSelecionado?.numero,
          candidato_cargo: candidatoSelecionado?.cargo,
          candidato_partido: candidatoSelecionado?.partido,
          candidato_foto: candidatoSelecionado?.fotoUrl,
          origem_url: 'chat.democracias.org',
        }]);

      if (errPesquisa) {
        console.warn('Erro ao registrar pesquisa_chat:', errPesquisa);
      }

      toast.success('Pesquisa registrada com sucesso!');

      await adicionarMensagemBot(`🎉 Obrigado por sua participação cívica, ${respostas.nome.split(' ')[0]}!`);
      await adicionarMensagemBot(`Seus dados foram integrados com sucesso e direcionados para a coordenação da campanha de ${candidatoSelecionado?.nomeUrna}.`);

      setEtapa('concluido');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível registrar os dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Toaster position="top-center" richColors />

      {/* HEADER */}
      <ChatHeader candidatoAtivo={candidatoSelecionado} />

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

              {/* ATALHOS RÁPIDOS */}
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

          {/* ETAPA: SELEÇÃO DE CANDIDATO */}
          {etapa === 'candidato_selecao' && !digitando && (
            <div className="my-3">
              {carregandoCandidatos ? (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                  <Loader2 className="size-6 animate-spin text-orange-400" />
                  <span className="text-xs font-semibold">Buscando candidatos de {respostas.uf}...</span>
                </div>
              ) : (
                <CandidateSelect
                  candidatos={candidatosDisponiveis}
                  uf={respostas.uf}
                  onSelecionar={handleSelecionarCandidato}
                />
              )}
            </div>
          )}

          {/* ETAPA: CONFIRMAÇÃO DE CANDIDATO */}
          {etapa === 'candidato_confirmacao' && candidatoSelecionado && !digitando && (
            <div className="space-y-3 my-3 animate-message">
              <CandidateCard candidato={candidatoSelecionado} modoConfirmacao />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleConfirmarCandidato}
                  className="h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="size-4" /> Confirmar Escolha
                </button>

                <button
                  onClick={handleTrocarCandidato}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="size-4" /> Escolher Outro
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

          {/* ETAPA: CONCLUÍDO E COMPARTILHAMENTO */}
          {etapa === 'concluido' && candidatoSelecionado && (
            <div className="my-4">
              <ShareBanner
                candidato={candidatoSelecionado}
                nomeUsuario={respostas.nome}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BARRA INFERIOR DE RESPOSTA */}
        {(etapa === 'nome' || etapa === 'cpf') && (
          <div className="sticky bottom-0 mt-4 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 border-t border-slate-800">
            <form onSubmit={handleEnviarTexto} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type={etapa === 'cpf' ? 'text' : 'text'}
                  autoFocus
                  value={inputText}
                  onChange={(e) => {
                    if (etapa === 'cpf') {
                      setInputText(formatarCpf(e.target.value));
                    } else {
                      setInputText(e.target.value);
                    }
                  }}
                  placeholder={
                    etapa === 'nome'
                      ? 'Digite seu nome completo...'
                      : '000.000.000-00 (Opcional)'
                  }
                  className="flex-1 h-12 px-4 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && etapa !== 'cpf'}
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
                    Prefiro não informar CPF <ChevronRight className="size-3.5" />
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
