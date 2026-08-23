import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings2, 
  Phone, 
  Save, 
  MessageCircle, 
  ShieldCheck, 
  Database, 
  Server, 
  Key, 
  Link as LinkIcon, 
  ExternalLink, 
  Lock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Activity,
  Send,
  Loader2,
  RefreshCw,
  PauseCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemStore } from '@/hooks/useSystemStore';
import { EvolutionWhatsAppService } from '@/lib/evolutionWhatsAppService';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/pc')({
  component: PcPage,
});

function PcPage() {
  const { officialWhatsApp, setOfficialWhatsApp, googleAuth, setGoogleAuth } = useSystemStore();
  const [phone, setPhone] = useState(officialWhatsApp);
  const [clientId, setClientId] = useState(googleAuth?.clientId || '');
  const [clientSecret, setClientSecret] = useState(googleAuth?.clientSecret || '');
  const [isSaving, setIsSaving] = useState(false);

  // Status da Instância do Sistema na Evolution API
  const [systemInstanceStatus, setSystemInstanceStatus] = useState<{
    status: 'connected' | 'connecting' | 'disconnected';
    phone?: string;
    qrCode?: string;
    mensagensHoje: number;
    taxaEntrega: number;
  }>({
    status: 'disconnected',
    mensagensHoje: 0,
    taxaEntrega: 100
  });
  const [loadingStatus, setLoadingStatus] = useState(false);

  const carregarStatusInstancia = async () => {
    setLoadingStatus(true);
    try {
      const { data } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('tipo', 'system_general')
        .maybeSingle();

      if (data) {
        setSystemInstanceStatus({
          status: data.status || 'disconnected',
          phone: data.phone_number,
          qrCode: data.qr_code_base64,
          mensagensHoje: data.mensagens_enviadas_hoje || 0,
          taxaEntrega: data.taxa_sucesso || 100
        });
      }
    } catch (e) {
      console.warn("Erro ao buscar status:", e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    carregarStatusInstancia();
    const interval = setInterval(carregarStatusInstancia, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Informe um número válido.');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setOfficialWhatsApp(phone);
      toast.success('WhatsApp Oficial do Sistema salvo com sucesso!');
      setIsSaving(false);
    }, 600);
  };

  const handleSaveGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      setGoogleAuth({ clientId, clientSecret });
      toast.success('Credenciais do Google Auth salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar credenciais do Google.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDisparo = async () => {
    if (!phone) {
      toast.error('Configure um número primeiro.');
      return;
    }
    try {
      const result = await EvolutionWhatsAppService.enqueueMessage({
        instanceName: 'democracias_sistema_master',
        recipientPhone: phone,
        messageText: '⚙️ *Democracias (Sistema Master)*: Teste de infraestrutura e mensageria transacional concluído com sucesso.',
        tipoMensagem: 'transacional'
      });

      if (result.success) {
        toast.success('Mensagem enfileirada com delay randômico humano (8-15s) e controle anti-bloqueio!');
      } else {
        toast.error('Falha ao enviar mensagem de teste.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o serviço de mensageria.');
    }
  };

  return (
    <div className="mx-auto w-full md:max-w-screen-xl pb-20">
      <PageHeader
        eyebrow="Painel de Controle"
        title="Central Master Democracias"
        right={
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary font-bold shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        }
      />

      <div className="p-5 md:p-8 max-w-4xl mx-auto mt-2 space-y-8">

        {/* 1. Links de Infraestrutura */}
        <section className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <Database className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Infraestrutura</h2>
              <p className="text-sm text-muted-foreground">Links rápidos para os painéis de gerenciamento de banco de dados e servidores.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="https://api.democracias.org" target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-[#3ECF8E]/10 p-2 rounded-lg"><Database className="h-5 w-5 text-[#3ECF8E]" /></div>
                <div>
                  <h3 className="font-bold text-sm">Supabase Studio Local</h3>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Banco de Dados e Auth</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            
            <a href="https://api.democracias.org/whatsapp" target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg"><Server className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <h3 className="font-bold text-sm">Microsserviço WhatsApp</h3>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Baileys API Node.js</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>
        </section>

        {/* 2. Gerenciamento de Credenciais OAuth */}
        <section className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Key className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Gerenciamento de Credenciais</h2>
              <p className="text-sm text-muted-foreground">Configuração do Google Auth e chaves de segurança externas.</p>
            </div>
          </div>
          <form onSubmit={handleSaveGoogleAuth} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clientId" className="font-semibold text-sm">Google Client ID</Label>
                <div className="relative">
                  <Input
                    id="clientId"
                    type="text"
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                    className="h-11 font-mono text-xs"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret" className="font-semibold text-sm">Google Client Secret</Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="GOCSPX-xxxxxxxxxxxxx"
                    className="h-11 font-mono text-xs"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
              <LinkIcon className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Redirect URLs (Copie para o painel do Google)</p>
                <ul className="list-disc pl-4 space-y-1 font-mono text-xs text-blue-700/80">
                  <li>https://democracias.org/onboarding</li>
                  <li>https://democracias.org/onboarding</li>
                </ul>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto h-11" disabled={isSaving}>
               {isSaving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Credenciais</>}
            </Button>
          </form>
        </section>

        {/* 3. Configuração do WhatsApp Oficial da Plataforma e Painel Anti-Ban */}
        <section className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <MessageCircle className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">WhatsApp Master (Evolution API v2)</h2>
                <p className="text-sm text-muted-foreground">Instância fixa `system-general-pc` e motor de disparos anti-bloqueio.</p>
              </div>
            </div>

            {/* Status Badge em Tempo Real */}
            <div className="flex items-center gap-2">
              {systemInstanceStatus.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado 🟢
                </span>
              ) : systemInstanceStatus.status === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="size-2 rounded-full bg-amber-500 animate-ping"></span>
                  Aguardando Leitura 🟡
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="size-2 rounded-full bg-rose-500"></span>
                  Desconectado 🔴
                </span>
              )}
            </div>
          </div>

          {/* MÉTRICAS DE DISPARO E CONTROLE ANTI-BAN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Enviados Hoje</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{systemInstanceStatus.mensagensHoje}</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Taxa de Sucesso</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{systemInstanceStatus.taxaEntrega}%</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Delay Anti-Ban</div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">8s - 15s</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Limite Seguro/Dia</div>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">150 msgs</div>
            </div>
          </div>

          {/* BOTÃO KILL SWITCH DE EMERGÊNCIA */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-rose-950 text-sm">Parada de Emergência da Fila (Kill Switch)</div>
                <div className="text-xs text-rose-800">Interrompe instantaneamente o envio de qualquer mensagem pendente na fila.</div>
              </div>
            </div>
            <Button 
              type="button" 
              variant="destructive"
              className="font-extrabold shadow-sm"
              onClick={() => {
                const newState = !WhatsAppDispatcherService.getKillSwitchState();
                WhatsAppDispatcherService.setKillSwitch(newState);
                toast.warning(newState ? "🚨 KILL SWITCH ATIVADO: Todos os disparos foram pausados imediatamente!" : "Disparos retomados.");
              }}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              {WhatsAppDispatcherService.getKillSwitchState() ? "Retomar Disparos" : "🚨 PARAR DISPAROS IMEDIATAMENTE"}
            </Button>
          </div>

          <form onSubmit={handleSavePhone} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="systemPhone" className="text-sm font-semibold">Número Mestre (WhatsApp Geral do Sistema)</Label>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="systemPhone"
                  type="text"
                  placeholder="Ex: 5511999999999"
                  className="pl-10 h-11 text-md font-mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" className="h-11 font-bold sm:w-auto" disabled={isSaving}>
                 {isSaving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Número</>}
              </Button>
              <Button type="button" variant="outline" className="h-11 font-semibold text-green-600 sm:w-auto" onClick={handleTestDisparo}>
                <Send className="mr-2 h-4 w-4" /> Testar Disparo com Delay Anti-Ban
              </Button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
