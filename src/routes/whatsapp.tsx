import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Smartphone } from 'lucide-react';

export const Route = createFileRoute('/whatsapp')({ component: WhatsAppSetupPage });

function WhatsAppSetupPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaignScope();
  const [campaignName, setCampaignName] = useState(() => localStorage.getItem('whatsapp_campaign_name') || '');
  const [whatsappNumber, setWhatsappNumber] = useState(() => localStorage.getItem('whatsapp_campaign_number') || '');
  const [status, setStatus] = useState<{ online: boolean; message: string; qr?: string | null }>({ online: false, message: 'Carregando...' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('https://api.democracias.org/whatsapp/status');
        const data = await response.json();
        if (active) setStatus(data);
      } catch { if (active) setStatus({ online: false, message: 'Serviço indisponível' }); }
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const handleNext = async () => {
    if (!campaignName.trim() || whatsappNumber.replace(/\D/g, '').length < 10) return;
    localStorage.setItem('whatsapp_campaign_name', campaignName.trim());
    localStorage.setItem('whatsapp_campaign_number', whatsappNumber.replace(/\D/g, ''));
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user && campaign) {
      const { data: created, error } = await (supabase as any).from('campaigns').insert({ ano_eleicao: 2026, uf: campaign.uf, nr_candidato: campaign.numero, nome_urna: campaign.nomeUrna, cargo: campaign.cargo, nome_campanha: campaignName.trim(), admin_user_id: auth.user.id }).select('id').single();
      if (error) { alert(error.code === '23505' ? 'Este candidato já possui uma campanha cadastrada.' : 'Não foi possível cadastrar a campanha.'); return; }
      await (supabase as any).from('campaign_members').insert({ campaign_id: created.id, user_id: auth.user.id, role: 'admin', status: 'approved' });
    }
    navigate({ to: '/dashboard' });
  };

  return <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
    <div className="w-full max-w-xl text-center">
      <Smartphone className="mx-auto mb-4 h-10 w-10 text-orange-500" />
      <h1 className="text-3xl font-extrabold text-slate-900">Configurar WhatsApp</h1>
      <p className="mt-2 text-slate-600">Conecte o WhatsApp da campanha para interagir com os usuários.</p>
      <div className="mt-8 rounded-lg bg-white p-8 shadow">
        <div className="grid gap-4 text-left mb-6">
          <div><Label htmlFor="campaign-name">Nome da campanha</Label><Input id="campaign-name" className="mt-1" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Nome da campanha" /></div>
          <div><Label htmlFor="whatsapp-number">Número do WhatsApp</Label><Input id="whatsapp-number" className="mt-1" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="DDD + número" inputMode="numeric" /></div>
        </div>
        {status.online ? <div className="py-8"><CheckCircle2 className="mx-auto h-14 w-14 text-green-500" /><h2 className="mt-4 text-xl font-bold">WhatsApp conectado</h2><p className="mt-2 text-slate-600">O número está pronto para enviar e receber mensagens.</p></div> : status.qr ? <><h2 className="font-bold">Escaneie o QR Code</h2><img src={status.qr} alt="QR Code do WhatsApp" className="mx-auto mt-5 h-64 w-64" /><p className="mt-4 text-sm text-slate-600">Abra o WhatsApp no celular e acesse Dispositivos conectados.</p></> : <div className="py-12"><Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" /><p className="mt-4 text-slate-600">Aguardando QR Code...</p></div>}
        <Button className="mt-8 w-full h-12" onClick={handleNext} disabled={!campaignName.trim() || whatsappNumber.replace(/\D/g, '').length < 10}>Próximo</Button>
      </div>
    </div>
  </div>;
}
