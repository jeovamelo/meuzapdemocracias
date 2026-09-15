import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, ShieldAlert, Play, Pause, XCircle, Loader2, Sparkles, CheckCircle, Clock } from 'lucide-react';
import type { ColinhaVotos, ContatoWhatsApp, DispatchProgress } from '../types';
import { gerarColinhaJpg } from '../lib/gerarColinhaJpg';
import { gerarMensagemPersonalizadaIA } from '../lib/aiGenerator';
import { getHumanAntiSpamDelayMs, delay } from '../lib/antiSpamQueue';
import { dispararMensagemIndividual, encerrarEDestruirSessao } from '../lib/meuzapApi';
import { SucessoDialog } from './SucessoDialog';
import { toast } from 'sonner';

interface Props {
  sessionId: string;
  voterName: string;
  voterPhone?: string;
  uf: string;
  votos: ColinhaVotos;
  contatos: ContatoWhatsApp[];
  onVoltar: () => void;
  onConcluir: () => void;
}

export const Step4Disparo: React.FC<Props> = ({
  sessionId,
  voterName,
  voterPhone,
  uf,
  votos,
  contatos,
  onVoltar,
  onConcluir,
}) => {
  const contatosAlvo = contatos.filter((c) => c.selected);

  // Estados de Disparo
  const [colinhaBase64, setColinhaBase64] = useState<string | null>(null);
  const [mensagemExemplo, setMensagemExemplo] = useState('');
  const [gerandoMidia, setGerandoMidia] = useState(true);

  // Controle do Runner
  const [statusDisparo, setStatusDisparo] = useState<'idle' | 'running' | 'paused' | 'waiting_delay' | 'completed' | 'cancelled'>('idle');
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [contadorRegressivo, setContadorRegressivo] = useState(0);
  const [enviadosCount, setEnviadosCount] = useState(0);
  const [falhasCount, setFalhasCount] = useState(0);
  const [logs, setLogs] = useState<{ nome: string; telefone: string; status: 'sent' | 'failed'; timestamp: string; error?: string }[]>([]);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);

  // Refs para controle seguro da execução assíncrona
  const pausadoRef = useRef(false);
  const canceladoRef = useRef(false);

  // 1. Gerar Colinha JPG em Alta Resolução e Exemplo da Mensagem de IA
  useEffect(() => {
    async function prepararPreview() {
      setGerandoMidia(true);
      try {
        const { dataUrl } = await gerarColinhaJpg(votos, uf, voterName);
        setColinhaBase64(dataUrl);

        const primeiroContatoNome = contatosAlvo[0]?.name || 'Amigo(a)';
        const textoIA = gerarMensagemPersonalizadaIA(voterName, primeiroContatoNome, votos);
        setMensagemExemplo(textoIA);
      } catch (err) {
        toast.error('Erro ao renderizar mídia da colinha.');
      } finally {
        setGerandoMidia(false);
      }
    }
    prepararPreview();
  }, [votos, uf, voterName, contatosAlvo]);

  // 2. Loop de Disparo com Compliance e Anti-Spam
  const iniciarDisparosSeguros = async () => {
    if (!colinhaBase64) {
      toast.error('Aguarde a preparação da imagem da colinha.');
      return;
    }

    setStatusDisparo('running');
    pausadoRef.current = false;
    canceladoRef.current = false;

    let index = indiceAtual;
    let localEnviados = enviadosCount;
    let localFalhas = falhasCount;

    while (index < contatosAlvo.length) {
      // Verificar cancelamento
      if (canceladoRef.current) {
        setStatusDisparo('cancelled');
        await encerrarEDestruirSessao(sessionId);
        toast.info('Envios cancelados pelo eleitor.');
        break;
      }

      // Verificar pausa
      if (pausadoRef.current) {
        setStatusDisparo('paused');
        break;
      }

      const contato = contatosAlvo[index];
      setIndiceAtual(index);

      // Gerar texto único com variação por IA
      const textoPersonalizado = gerarMensagemPersonalizadaIA(voterName, contato.name, votos);

      // Disparo real via backend
      try {
        const res = await dispararMensagemIndividual(sessionId, {
          contactPhone: contato.phone,
          contactName: contato.name,
          messageText: textoPersonalizado,
          mediaBase64: colinhaBase64,
          voterPhone,
        });

        const hora = new Date().toLocaleTimeString('pt-BR');

        if (res.success) {
          localEnviados++;
          setEnviadosCount(localEnviados);
          setLogs((prev) => [
            { nome: contato.name, telefone: contato.phone, status: 'sent', timestamp: hora },
            ...prev.slice(0, 49),
          ]);
        } else {
          localFalhas++;
          setFalhasCount(localFalhas);
          setLogs((prev) => [
            { nome: contato.name, telefone: contato.phone, status: 'failed', timestamp: hora, error: res.error },
            ...prev.slice(0, 49),
          ]);

          if (res.limitReached) {
            toast.error(res.error || 'Limite de envios atingido.');
            setStatusDisparo('cancelled');
            await encerrarEDestruirSessao(sessionId);
            break;
          }
        }
      } catch (err: any) {
        localFalhas++;
        setFalhasCount(localFalhas);
      }

      index++;
      setIndiceAtual(index);

      // Se ainda houver contatos e não estiver no fim, aplica delay randômico humanizado de 15 a 30 segundos
      if (index < contatosAlvo.length && !pausadoRef.current && !canceladoRef.current) {
        setStatusDisparo('waiting_delay');
        const delayMs = getHumanAntiSpamDelayMs(15, 30);
        const delaySec = Math.round(delayMs / 1000);

        for (let s = delaySec; s > 0; s--) {
          if (pausadoRef.current || canceladoRef.current) break;
          setContadorRegressivo(s);
          await delay(1000);
        }
        setContadorRegressivo(0);
        setStatusDisparo('running');
      }
    }

    // Se completou todos os contatos
    if (index >= contatosAlvo.length && !canceladoRef.current) {
      setStatusDisparo('completed');
      await encerrarEDestruirSessao(sessionId);
      setMostrarSucesso(true);
    }
  };

  const pausarDisparos = () => {
    pausadoRef.current = true;
    setStatusDisparo('paused');
    toast.info('Envios pausados. Você pode retomar a qualquer momento.');
  };

  const cancelarEExcluirSessao = async () => {
    canceladoRef.current = true;
    setStatusDisparo('cancelled');
    await encerrarEDestruirSessao(sessionId);
    toast.warning('Sessão cancelada e desconectada do servidor.');
  };

  const percentual = contatosAlvo.length > 0 ? Math.round((indiceAtual / contatosAlvo.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Título & Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Send className="size-4" /> Passo 4 de 4 • Revisão e Disparo Humanizado
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Revisão final e controle de disparos seguros
          </h1>
          <p className="text-slate-400 text-sm">
            Mensagens enviadas com intervalo randômico de 15 a 30 segundos e texto único por contato.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl text-xs font-semibold text-emerald-400 shrink-0">
          <Clock className="size-3.5" />
          <span>Intervalo Anti-Ban Ativo (15s a 30s)</span>
        </div>
      </div>

      {/* Grid: Pré-visualização do Envio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview da Imagem */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Imagem Oficial da Colinha (Anexo WhatsApp)
          </span>
          <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex justify-center p-2 min-h-[280px] items-center">
            {gerandoMidia ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin text-emerald-400" />
                <span className="text-xs">Renderizando colinha em alta definição...</span>
              </div>
            ) : colinhaBase64 ? (
              <img src={colinhaBase64} alt="Colinha 2026" className="max-h-[300px] object-contain rounded-xl" />
            ) : null}
          </div>
        </div>

        {/* Preview do Texto IA */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Texto Personalizado por Contato (IA)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Sparkles className="size-3" /> Anti-Signature
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line max-h-[260px] overflow-y-auto">
              {mensagemExemplo || 'Gerando texto personalizado com variações...'}
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Cada contato receberá uma versão única com sua respectiva saudação, sem hashes repetidos.
          </p>
        </div>
      </div>

      {/* Painel do Disparador em Tempo Real */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="size-5 text-emerald-400" />
              Progresso dos Disparos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Destinatários selecionados: <strong>{contatosAlvo.length}</strong> contatos
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {statusDisparo === 'idle' && (
              <button
                type="button"
                onClick={iniciarDisparosSeguros}
                disabled={contatosAlvo.length === 0 || gerandoMidia}
                className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                <Play className="size-4 fill-slate-950" />
                Iniciar Disparos Seguros
              </button>
            )}

            {(statusDisparo === 'running' || statusDisparo === 'waiting_delay') && (
              <button
                type="button"
                onClick={pausarDisparos}
                className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Pause className="size-4 fill-slate-950" /> Pausar
              </button>
            )}

            {statusDisparo === 'paused' && (
              <button
                type="button"
                onClick={iniciarDisparosSeguros}
                className="h-12 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="size-4 fill-slate-950" /> Retomar Envios
              </button>
            )}

            {statusDisparo !== 'idle' && statusDisparo !== 'completed' && (
              <button
                type="button"
                onClick={cancelarEExcluirSessao}
                className="h-12 px-4 rounded-2xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                title="Cancelar e encerrar WhatsApp"
              >
                <XCircle className="size-4" /> Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              {indiceAtual} de {contatosAlvo.length} mensagens processadas
            </span>
            <span className="text-emerald-400">{percentual}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>

        {/* Status Atual do Throttle / Digitação Humana */}
        {statusDisparo === 'waiting_delay' && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-blue-500 animate-ping" />
              <div>
                <p className="text-sm font-bold text-white">Simulando digitação humana anti-spam...</p>
                <p className="text-xs text-slate-400">Pausa randômica entre 15s e 30s para proteger seu WhatsApp.</p>
              </div>
            </div>
            <span className="text-xl font-mono font-black text-blue-400">
              {contadorRegressivo}s
            </span>
          </div>
        )}

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">Enviados com Sucesso</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{enviadosCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">Falhas / Erros</span>
            <p className="text-2xl font-black text-rose-400 mt-1">{falhasCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">Limite Diário</span>
            <p className="text-2xl font-black text-white mt-1">{enviadosCount}/50</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">Teto Absoluto</span>
            <p className="text-2xl font-black text-slate-400 mt-1">100</p>
          </div>
        </div>

        {/* Log de Envios em Tempo Real */}
        {logs.length > 0 && (
          <div className="space-y-2 border-t border-slate-800/80 pt-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Histórico Recente de Envios
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl border flex items-center justify-between ${
                    log.status === 'sent'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{log.status === 'sent' ? '✅' : '❌'}</span>
                    <span className="font-bold truncate">{log.nome}</span>
                    <span className="text-slate-500 hidden sm:inline">({log.telefone})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra Inferior */}
      <div className="border-t border-slate-800 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onVoltar}
          disabled={statusDisparo === 'running' || statusDisparo === 'waiting_delay'}
          className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm flex items-center gap-2 transition-all border border-slate-800 disabled:opacity-40 cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Voltar para Contatos
        </button>
      </div>

      {/* Modal de Conclusão */}
      {mostrarSucesso && (
        <SucessoDialog
          voterName={voterName}
          totalEnviados={enviadosCount}
          onReiniciar={() => {
            setMostrarSucesso(false);
            onConcluir();
          }}
        />
      )}
    </div>
  );
};
