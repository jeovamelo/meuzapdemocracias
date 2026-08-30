import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Smartphone, ShieldCheck, RefreshCw, AlertCircle, Send } from 'lucide-react';
import { useCampaignScope } from '@/hooks/useCampaignScope';
import { EvolutionWhatsAppService } from '@/lib/evolutionWhatsAppService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/whatsapp')({ component: WhatsAppSetupPage });

function WhatsAppSetupPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaignScope();
  const [campaignName, setCampaignName] = useState(campaign?.nomeUrna || '');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [status, setStatus] = useState<{ online: boolean; message: string; qr?: string | null }>({ 
    online: false, 
    message: 'Gerando instância única para a campanha...',
    qr: null
  });
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [activeInstanceName, setActiveInstanceName] = useState<string>('');
  const [generationError, setGenerationError] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('whatsapp_campaign_name');
      const storedNumber = localStorage.getItem('whatsapp_campaign_number');
      if (storedName) setCampaignName(storedName);
      else if (campaign?.nomeUrna) setCampaignName(campaign.nomeUrna);
      if (storedNumber) setWhatsappNumber(storedNumber);
    }
  }, [campaign?.nomeUrna]);

  // 1. Inicializar ou conectar instância única para a campanha na Evolution API / Evolution Go
  const inicializarInstanciaCampanha = async (forceRecreate = false) => {
    if (!campaign?.id) return;
    setLoadingInstance(true);
    setGenerationError('');
    setStatus({ online: false, message: 'Conectando instância na Evolution Go...', qr: null });
    try {
      const res = await EvolutionWhatsAppService.createOrReplaceCampaignInstance(
        campaign.id,
        campaignName || campaign.nomeUrna || 'Campanha',
        forceRecreate
      );

      if (res.instanceName) {
        setActiveInstanceName(res.instanceName);
      }

      if (!res.success) {
        setGenerationError(res.error || 'Não foi possível inicializar a instância.');
        return;
      }

      if (res.connected) {
        setStatus({ online: true, message: 'WhatsApp conectado com sucesso!', qr: null });
      } else if (res.qrCode) {
        setStatus({
          online: false,
          message: 'Aguardando leitura do QR Code',
          qr: res.qrCode
        });
      } else {
        // Tentar obter o QR code em seguida
        setStatus({
          online: false,
          message: 'Instância ativa. Buscando QR Code...',
          qr: null
        });
        const qr = await EvolutionWhatsAppService.getInstanceQr(res.instanceName);
        if (qr) {
          setStatus({
            online: false,
            message: 'Aguardando leitura do QR Code',
            qr
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao iniciar instância Evolution:", e);
      setGenerationError('Falha de comunicação com a Evolution Go.');
    } finally {
      setLoadingInstance(false);
    }
  };

  useEffect(() => {
    inicializarInstanciaCampanha();
  }, [campaign?.id]);

  // 2. Polling inteligente de status e QR Code da instância
  useEffect(() => {
    if (!activeInstanceName) return;
    let active = true;

    const checarStatus = async () => {
      try {
        const stateRes = await EvolutionWhatsAppService.getInstanceStatus(activeInstanceName);
        if (!active) return;

        if (stateRes?.instance?.state === 'open') {
          setStatus({ online: true, message: 'WhatsApp conectado com sucesso!', qr: null });
        } else {
          // Se ainda não está conectado, buscar/atualizar QR code se não tiver ou para refresh
          const qr = await EvolutionWhatsAppService.getInstanceQr(activeInstanceName);
          if (active && qr) {
            setStatus({
              online: false,
              message: 'Aguardando leitura do QR Code',
              qr
            });
          }
        }
      } catch {
        // ignora erro transitório de polling
      }
    };

    const timer = setInterval(checarStatus, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [activeInstanceName]);

  const handleSendTest = async (event: React.FormEvent) => {
    event.preventDefault();
    const recipient = testPhone.replace(/\D/g, '');
    if (!status.online || !activeInstanceName) {
      toast.error('Conecte o WhatsApp da campanha antes de enviar o teste.');
      return;
    }
    if (recipient.length < 10 || !testMessage.trim()) {
      toast.error('Informe um número válido com DDD e uma mensagem.');
      return;
    }

    setSendingTest(true);
    try {
      await EvolutionWhatsAppService.sendTestMessage(activeInstanceName, recipient, testMessage);
      setTestMessage('');
      toast.success('Mensagem de teste enviada com sucesso!');
    } catch (error) {
      console.error('Erro no envio de teste pela Evolution Go:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem de teste.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleNext = async () => {
    if (!campaignName.trim() || whatsappNumber.replace(/\D/g, '').length < 10) {
      toast.error("Preencha o nome da campanha e o número do WhatsApp.");
      return;
    }
    localStorage.setItem('whatsapp_campaign_name', campaignName.trim());
    localStorage.setItem('whatsapp_campaign_number', whatsappNumber.replace(/\D/g, ''));

    toast.success("WhatsApp da campanha configurado!");
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold mb-3">
          <ShieldCheck className="h-4 w-4" /> Evolution API • Instância Única por Campanha
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Conectar WhatsApp da Campanha</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Canal exclusivo para disparos transacionais, notificações e validação de equipes.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="grid gap-4 text-left mb-6">
            <div>
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input 
                id="campaign-name" 
                className="mt-1" 
                value={campaignName} 
                onChange={e => setCampaignName(e.target.value)} 
                placeholder="Ex: Campanha Deputado João Silva" 
              />
            </div>
            <div>
              <Label htmlFor="whatsapp-number">Número Oficial do WhatsApp</Label>
              <Input 
                id="whatsapp-number" 
                className="mt-1" 
                value={whatsappNumber} 
                onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 13))} 
                placeholder="(DDD) 99999-9999" 
                inputMode="numeric" 
              />
              {whatsappNumber && (
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Número oficial: {whatsappNumber.replace(/\D/g, '').startsWith('55') ? whatsappNumber.replace(/\D/g, '') : `55${whatsappNumber.replace(/\D/g, '')}`}
                </p>
              )}
            </div>
          </div>

          {/* ÁREA DE QR CODE / STATUS */}
          {status.online ? (
            <div className="py-8 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-emerald-950">WhatsApp Conectado!</h2>
              <p className="mt-2 text-sm text-emerald-800">
                A instância única da campanha está ativa na Evolution API e pronta para disparos com política anti-bloqueio.
              </p>
            </div>
          ) : status.qr ? (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800">Escaneie o QR Code</h2>
              <img src={status.qr} alt="QR Code do WhatsApp" className="mx-auto h-64 w-64 rounded-xl border-2 border-primary shadow bg-white p-2" />
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Abra o WhatsApp no celular do coordenador/candidato, vá em <strong>Aparelhos Conectados</strong> e aponte para a tela.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => inicializarInstanciaCampanha(false)} disabled={loadingInstance}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInstance ? 'animate-spin' : ''}`} /> Atualizar QR Code
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => inicializarInstanciaCampanha(true)} disabled={loadingInstance} className="text-xs text-slate-500 hover:text-rose-600">
                  Reiniciar Sessão
                </Button>
              </div>
            </div>
          ) : generationError ? (
            <div className="py-8 bg-rose-50 rounded-xl border border-rose-200">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
              <p className="mt-3 text-sm text-rose-800">{generationError}</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => inicializarInstanciaCampanha(false)} disabled={loadingInstance}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingInstance ? 'animate-spin' : ''}`} /> Tentar novamente
                </Button>
                <Button type="button" variant="destructive" onClick={() => inicializarInstanciaCampanha(true)} disabled={loadingInstance}>
                  Forçar Nova Instância
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-slate-600 text-sm">{status.message}</p>
              <Button type="button" variant="ghost" size="sm" className="mt-3 text-xs text-slate-500" onClick={() => inicializarInstanciaCampanha(false)}>
                <RefreshCw className="mr-1 h-3 w-3" /> Forçar busca de QR Code
              </Button>
            </div>
          )}

          <form onSubmit={handleSendTest} className="mt-6 border-t border-slate-200 pt-6 text-left space-y-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Send className="h-4 w-4 text-primary" /> Testar envio de mensagem
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                O envio será liberado assim que o QR Code for lido e a instância estiver conectada.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="test-phone">Número de destino com DDD</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="DDD + número"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label htmlFor="test-message">Mensagem</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  placeholder="Digite a mensagem de teste"
                />
              </div>
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={!status.online || sendingTest}>
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {status.online ? 'Enviar mensagem de teste' : 'Aguardando conexão do WhatsApp'}
            </Button>
          </form>

          <Button className="mt-8 w-full h-12 text-md font-bold" onClick={handleNext}>
            Concluir e Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
