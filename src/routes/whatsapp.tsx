import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Smartphone, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useCampaignScope } from '@/hooks/useCampaignScope';
import { EvolutionWhatsAppService } from '@/lib/evolutionWhatsAppService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/whatsapp')({ component: WhatsAppSetupPage });

function WhatsAppSetupPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaignScope();
  const [campaignName, setCampaignName] = useState(() => localStorage.getItem('whatsapp_campaign_name') || campaign?.nomeUrna || '');
  const [whatsappNumber, setWhatsappNumber] = useState(() => localStorage.getItem('whatsapp_campaign_number') || '');
  const [status, setStatus] = useState<{ online: boolean; message: string; qr?: string | null }>({ 
    online: false, 
    message: 'Gerando instância única para a campanha...',
    qr: null
  });
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [activeInstanceName, setActiveInstanceName] = useState<string>('');

  // 1. Inicializar ou substituir instância única para a campanha na Evolution API
  const inicializarInstanciaCampanha = async () => {
    if (!campaign?.id) return;
    setLoadingInstance(true);
    try {
      const res = await EvolutionWhatsAppService.createOrReplaceCampaignInstance(
        campaign.id,
        campaignName || campaign.nomeUrna || 'Campanha'
      );
      if (res.success) {
        setActiveInstanceName(res.instanceName);
        if (res.qrCode) {
          setStatus({
            online: false,
            message: 'Aguardando leitura do QR Code',
            qr: res.qrCode
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao iniciar instância Evolution:", e);
    } finally {
      setLoadingInstance(false);
    }
  };

  useEffect(() => {
    inicializarInstanciaCampanha();
  }, [campaign?.id]);

  // 2. Polling de status da conexão da instância
  useEffect(() => {
    if (!activeInstanceName) return;
    let active = true;

    const checarStatus = async () => {
      try {
        const stateRes = await EvolutionWhatsAppService.getInstanceStatus(activeInstanceName);
        if (active && stateRes?.instance?.state === 'open') {
          setStatus({ online: true, message: 'WhatsApp conectado com sucesso!', qr: null });
        }
      } catch {
        // ignora erro transitório de polling
      }
    };

    const timer = setInterval(checarStatus, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [activeInstanceName]);

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
              <img src={status.qr} alt="QR Code do WhatsApp" className="mx-auto h-64 w-64 rounded-xl border-2 border-primary shadow" />
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Abra o WhatsApp no celular do coordenador/candidato, vá em <strong>Aparelhos Conectados</strong> e aponte para a tela.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={inicializarInstanciaCampanha}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="py-12 bg-slate-50 rounded-xl border border-slate-200">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-slate-600 text-sm">{status.message}</p>
            </div>
          )}

          <Button className="mt-8 w-full h-12 text-md font-bold" onClick={handleNext}>
            Concluir e Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
