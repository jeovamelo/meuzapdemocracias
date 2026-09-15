import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Smartphone, ShieldCheck, CheckCircle2, Loader2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { criarSessaoMeuzap, checarStatusSessao } from '../lib/meuzapApi';

interface Props {
  voterName: string;
  onVoterNameChange: (nome: string) => void;
  sessionId: string | null;
  onSessionCreated: (sessionId: string, voterPhone?: string) => void;
  onAvancar: () => void;
}

export const Step1Conexao: React.FC<Props> = ({
  voterName,
  onVoterNameChange,
  sessionId,
  onSessionCreated,
  onAvancar,
}) => {
  const [gerandoQr, setGerandoQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [telefoneConectado, setTelefoneConectado] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  const iniciarConexao = async () => {
    if (!voterName.trim()) {
      toast.error('Por favor, digite seu nome completo para prosseguir.');
      return;
    }

    setGerandoQr(true);
    try {
      const res = await criarSessaoMeuzap(voterName.trim());
      if (res.success && res.sessionId) {
        onSessionCreated(res.sessionId);
        setQrCode(res.qrCode || null);
        toast.success('QR Code gerado com sucesso! Aponte a câmera do seu WhatsApp.');
      } else {
        toast.error(res.error || 'Não foi possível gerar a sessão temporária.');
      }
    } catch (err: any) {
      toast.error('Erro de conexão ao iniciar WhatsApp.');
    } finally {
      setGerandoQr(false);
    }
  };

  // Monitorar pareamento do QR Code via polling a cada 2.5 segundos
  useEffect(() => {
    if (!sessionId || conectado) return;

    const checar = async () => {
      const status = await checarStatusSessao(sessionId);
      if (status.connected && status.loggedIn) {
        setConectado(true);
        setTelefoneConectado(status.phone);
        onSessionCreated(sessionId, status.phone || undefined);
        toast.success('WhatsApp conectado com sucesso!', {
          description: 'Sua sessão temporária está ativa e pronta para montar a colinha.',
        });
      }
    };

    pollingRef.current = setInterval(checar, 2500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, conectado, onSessionCreated]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Título & Descrição */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="size-4" /> Passo 1 de 4 • Identificação e Pareamento Seguro
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Conecte seu WhatsApp para disparar sua colinha
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Conexão individual temporária. O sistema usa seu WhatsApp apenas para enviar a colinha aos seus contatos próximos e se desconecta automaticamente ao final.
        </p>
      </div>

      {/* Card de Identificação */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Seu Nome Completo
          </label>
          <input
            type="text"
            value={voterName}
            onChange={(e) => onVoterNameChange(e.target.value)}
            disabled={Boolean(sessionId)}
            placeholder="Ex.: Maria Souza"
            className="w-full h-13 px-4 rounded-2xl bg-slate-950 border border-slate-700 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-60 transition-all font-medium"
          />
          <p className="text-[12px] text-slate-400">
            Seu nome será utilizado pela Inteligência Artificial para assinar as mensagens com tom pessoal e amigável.
          </p>
        </div>

        {/* Estado 1: Botão Conectar */}
        {!sessionId && (
          <button
            type="button"
            onClick={iniciarConexao}
            disabled={gerandoQr || !voterName.trim()}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            {gerandoQr ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Gerando QR Code Seguro...
              </>
            ) : (
              <>
                <QrCode className="size-5" />
                Gerar QR Code de Conexão
              </>
            )}
          </button>
        )}

        {/* Estado 2: Exibir QR Code e Instruções */}
        {sessionId && !conectado && (
          <div className="space-y-6 animate-fade-in border-t border-slate-800/80 pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              {/* Box do QR Code */}
              <div className="relative size-60 sm:size-64 rounded-2xl bg-white p-3 shadow-xl border-4 border-emerald-500/30 flex items-center justify-center shrink-0">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code WhatsApp" className="size-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-700">
                    <Loader2 className="size-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold text-center">Sincronizando com WhatsApp...</span>
                  </div>
                )}
              </div>

              {/* Instruções passo a passo */}
              <div className="space-y-3 text-sm text-slate-300 max-w-xs">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Smartphone className="size-4 text-emerald-400" /> Como conectar:
                </h4>
                <ol className="space-y-2 text-xs sm:text-sm list-decimal list-inside text-slate-400">
                  <li>Abra o <strong>WhatsApp</strong> no celular</li>
                  <li>Acesse <strong>Aparelhos Conectados</strong></li>
                  <li>Toque em <strong>Conectar um aparelho</strong></li>
                  <li>Aponte a câmera para o QR Code ao lado</li>
                </ol>

                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  Aguardando leitura do aparelho...
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={iniciarConexao}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Recarregar novo QR Code
              </button>
            </div>
          </div>
        )}

        {/* Estado 3: Conectado com Sucesso */}
        {conectado && (
          <div className="space-y-6 animate-fade-in border-t border-slate-800/80 pt-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">WhatsApp Conectado com Sucesso!</h4>
                <p className="text-xs text-slate-400">
                  {telefoneConectado ? `Número: +${telefoneConectado}` : 'Aparelho pareado e pronto para uso.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onAvancar}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>Avançar para Montar a Colinha</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Box de Privacidade e LGPD */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs text-slate-400 flex items-start gap-3">
        <AlertCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong>Privacidade Garantida:</strong> Nossa infraestrutura não armazena suas conversas particulares. Assim que seus disparos terminarem ou você sair desta página, a sessão na Evolution API é destruída permanentemente do servidor.
        </p>
      </div>
    </div>
  );
};
