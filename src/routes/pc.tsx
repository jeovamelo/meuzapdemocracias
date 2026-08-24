import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
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
  ExternalLink, 
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Send,
  Loader2,
  RefreshCw,
  Smartphone,
  Layers,
  Radio,
  Clock,
  Sparkles,
  FolderKanban,
  Trash2,
  CalendarDays,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatHora, formatDataCompleta } from '@/lib/date';
import { PainelPesquisaEleitoral } from '@/components/PainelPesquisaEleitoral';

class PesquisaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Erro na aba de pesquisa:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white border border-rose-200 rounded-2xl text-center space-y-4 shadow-sm">
          <div className="size-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Instabilidade ao carregar dados da Pesquisa
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Não foi possível carregar os gráficos eleitorais no momento. Verifique a conexão com o Supabase e tente novamente.
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false })} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
          >
            <RefreshCw className="mr-2 size-4" /> Tentar Novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute('/pc')({
  component: PcPage,
});

interface WhatsAppInstanceItem {
  name: string;
  phone?: string;
  status: 'connected' | 'connecting' | 'disconnected';
  profilePic?: string;
  campaign?: string;
  updatedAt?: string;
}

interface CampaignItem {
  id: string;
  nome_candidato: string | null;
  nome_urna: string | null;
  nr_candidato: string | null;
  cargo: string | null;
  uf: string | null;
  partido: string | null;
  created_at: string | null;
}

function PcPage() {
  // Autenticação Administrativa Obrigatória para /pc
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return false;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'geral' | 'evolution' | 'campaigns' | 'infra' | 'pesquisa'>('geral');
  
  // WhatsApp Geral do Sistema
  const [systemPhone, setSystemPhone] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [systemQrCode, setSystemQrCode] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Teste controlado de envio de mensagem pela instância geral.
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Listagem de Instâncias da Evolution API
  const [instances, setInstances] = useState<WhatsAppInstanceItem[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);

  // Campanhas: a exclusão é feita por uma função transacional no banco.
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignPendingDeletion, setCampaignPendingDeletion] = useState<CampaignItem | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    if (loginUser.trim() === 'jeovaabreu' && loginPass === 'tk90xz39@123E') {
      sessionStorage.setItem('democracias_pc_auth', 'true');
      setIsAuthenticated(true);
      toast.success('Acesso administrativo autorizado com sucesso!');
    } else {
      setLoginError('Usuário ou senha de administrador incorretos.');
      toast.error('Credenciais inválidas.');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('democracias_pc_auth');
    setIsAuthenticated(false);
    toast.info('Sessão administrativa encerrada.');
  };

  useEffect(() => {
    setIsAuthenticated(sessionStorage.getItem('democracias_pc_auth') === 'true');
    setSystemPhone(localStorage.getItem('democracias_system_phone') || '');
  }, []);

  const carregarCampanhas = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, nome_candidato, nome_urna, nr_candidato, cargo, uf, partido, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as CampaignItem[]);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Não foi possível carregar as campanhas cadastradas.');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const excluirCampanha = async () => {
    if (!campaignPendingDeletion) return;

    setIsDeletingCampaign(true);
    try {
      const { error } = await (supabase as any).rpc('delete_campaign_completely', {
        p_campaign_id: campaignPendingDeletion.id,
      });

      if (error) throw error;

      setCampaigns((current) => current.filter((campaign) => campaign.id !== campaignPendingDeletion.id));
      toast.success('Campanha e todos os dados vinculados foram excluídos.');
      setCampaignPendingDeletion(null);
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Não foi possível excluir a campanha. Verifique sua sessão administrativa e tente novamente.');
    } finally {
      setIsDeletingCampaign(false);
    }
  };

  // 1. Carregar Instâncias do Evolution Go
  const carregarInstancias = async () => {
    setLoadingInstances(true);
    try {
      // Buscar no endpoint /instance/all do Evolution Go
      const res = await fetch('https://api.democracias.org/evolution/instance/all', {
        headers: {
          'apikey': 'democracias_global_evolution_key_2026'
        }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (Array.isArray(data)) {
          const list: WhatsAppInstanceItem[] = data.map((item: any) => ({
            name: item.name || item.instanceName || 'instancia',
            phone: item.jid || item.owner || 'Não pareado',
            status: item.connected ? 'connected' : (item.qrcode ? 'connecting' : 'disconnected'),
            campaign: item.name?.replace('camp_', 'Campanha ') || 'Sistema Geral',
            updatedAt: item.createdAt ? formatHora(item.createdAt) : 'Recentemente'
          }));
          setInstances(list);
          
          const master = list.find(i => i.name === 'sistema-geral-democracias');
          if (master) {
            setSystemStatus(master.status);
          }
        }
      } else {
        // Fallback via tabela local do Supabase
        const { data: dbData } = await (supabase as any)
          .from('whatsapp_instances')
          .select('*')
          .order('updated_at', { ascending: false });

        if (dbData && dbData.length > 0) {
          const mapped: WhatsAppInstanceItem[] = dbData.map((d: any) => ({
            name: d.instance_name,
            phone: d.phone_number || 'Não informado',
            status: d.status || 'disconnected',
            campaign: d.campanha_id ? `Campanha #${d.campanha_id}` : 'Sistema Geral',
            updatedAt: d.updated_at ? formatHora(d.updated_at) : ''
          }));
          setInstances(mapped);
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar instâncias:", e);
    } finally {
      setLoadingInstances(false);
    }
  };

  useEffect(() => {
    carregarInstancias();
    const interval = setInterval(carregarInstancias, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'campaigns') {
      carregarCampanhas();
    }
  }, [isAuthenticated, activeTab]);

  // 2. Instância Única Padrão do Sistema: 'sistema-geral-democracias'
  const INSTANCE_MASTER = 'sistema-geral-democracias';
  const INSTANCE_MASTER_TOKEN = 'democracias_master_token_2026';

  const verificarStatusInstancia = async () => {
    try {
      const res = await fetch('https://api.democracias.org/evolution/instance/status', {
        headers: { 'apikey': INSTANCE_MASTER_TOKEN }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data?.connected === true) {
          setSystemStatus('connected');
          setSystemQrCode(null);
        } else if (data?.qrcode) {
          setSystemStatus('connecting');
          setSystemQrCode(data.qrcode);
        } else {
          setSystemStatus('disconnected');
        }
      }
    } catch {
      // Fallback
    }
  };

  // 3. Salvar e Gerar QR Code Real da Instância do Sistema
  const handleSalvarWhatsAppGeral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemPhone) {
      toast.error('Informe o número de WhatsApp Geral com DDD.');
      return;
    }

    setIsSavingPhone(true);
    setIsGeneratingQr(true);
    localStorage.setItem('democracias_system_phone', systemPhone);

    try {
      // 1. Criar instância se não existir no Evolution Go
      await fetch('https://api.democracias.org/evolution/instance/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'democracias_global_evolution_key_2026'
        },
        body: JSON.stringify({
          name: INSTANCE_MASTER,
          token: INSTANCE_MASTER_TOKEN
        })
      }).catch(() => {});

      // 2. Iniciar conexão da instância
      await fetch('https://api.democracias.org/evolution/instance/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': INSTANCE_MASTER_TOKEN
        },
        body: JSON.stringify({
          subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL']
        })
      }).catch(() => {});

      // 3. Obter QR Code oficial da Evolution Go
      const qrRes = await fetch('https://api.democracias.org/evolution/instance/qr', {
        headers: { 'apikey': INSTANCE_MASTER_TOKEN }
      });

      if (qrRes.ok) {
        const qrJson = await qrRes.json();
        const qrBase64 = qrJson?.data?.qrcode || qrJson?.qrcode || qrJson?.base64;
        if (qrBase64) {
          setSystemQrCode(qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`);
          setSystemStatus('connecting');
          toast.success('QR Code oficial do Evolution Go gerado com sucesso!');
        } else {
          verificarStatusInstancia();
          toast.info('Instância pronta para conexão!');
        }
      } else {
        verificarStatusInstancia();
        toast.info('Instância iniciada!');
      }

      carregarInstancias();
    } catch (err) {
      console.warn("Erro ao registrar WhatsApp master:", err);
      toast.error('Erro ao comunicar com o Evolution Go.');
    } finally {
      setIsSavingPhone(false);
      setIsGeneratingQr(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = testPhone.replace(/\D/g, '');
    if (number.length < 10 || !testMessage.trim()) {
      toast.error('Informe um número válido com DDD e uma mensagem.');
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('https://api.democracias.org/evolution/send/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: INSTANCE_MASTER_TOKEN,
        },
        body: JSON.stringify({
          number,
          text: testMessage.trim(),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `HTTP ${response.status}`);
      }

      setTestMessage('');
      toast.success('Mensagem de teste enviada com sucesso.');
    } catch (error) {
      console.error('Erro no teste de mensagem Evolution Go:', error);
      toast.error('Não foi possível enviar a mensagem de teste. Verifique o número e o status do WhatsApp.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // SE NÃO ESTIVER AUTENTICADO: RENDERIZAR TELA DE LOGIN ADMINISTRATIVO EXCLUSIVA
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Controle Global</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Área restrita de infraestrutura e administração master da plataforma Democracias.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Usuário Administrador</Label>
              <Input
                placeholder="Informe seu usuário"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                className="h-12 text-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Senha de Acesso</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="h-12 text-sm"
                required
              />
            </div>

            <Button type="submit" disabled={isLoggingIn} className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 mt-2 shadow-md">
              {isLoggingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
              Entrar no Painel Master
            </Button>
          </form>

          <div className="pt-2 text-center">
            <a href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              ← Voltar para a Página Inicial
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full md:max-w-screen-xl pb-24 px-4 sm:px-6">
      <PageHeader
        eyebrow="Administração Geral"
        title="Painel de Controle do Sistema"
        description="Central de infraestrutura, instâncias da Evolution API e WhatsApp Geral da plataforma."
        right={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50">
              Sair do Painel
            </Button>
            <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary font-bold shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        }
      />

      {/* ABAS DO PAINEL DE CONTROLE */}
      <div className="flex border-b border-slate-200 mt-6 gap-2">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'geral'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          WhatsApp Geral do Sistema
        </button>

        <button
          onClick={() => setActiveTab('evolution')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'evolution'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Instâncias Evolution API
          <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full ml-1">
            {instances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('infra')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'infra'
              ? 'border-blue-600 text-blue-700 bg-blue-50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4 text-blue-600" />
          Infraestrutura e Supabase
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'border-violet-600 text-violet-700 bg-violet-50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderKanban className="h-4 w-4 text-violet-600" />
          Campanhas
          <span className="text-[11px] bg-violet-100 text-violet-800 font-extrabold px-2 py-0.5 rounded-full ml-1">
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pesquisa')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pesquisa'
              ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-orange-500" />
          Pesquisa
        </button>
      </div>

      <div className="mt-8 max-w-5xl space-y-8">
        
        {/* ABA 1: WHATSAPP GERAL DO SISTEMA */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Smartphone className="h-6 w-6 text-primary" />
                    WhatsApp Geral Padrão da Plataforma
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Número oficial utilizado para alertas transacionais, avisos globais e validação de administradores.
                  </p>
                </div>

                <div>
                  {systemStatus === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sistema Conectado 🟢
                    </span>
                  ) : systemStatus === 'connecting' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="size-2 rounded-full bg-amber-500 animate-ping"></span>
                      Aguardando Leitura 🟡
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="size-2 rounded-full bg-rose-500"></span>
                      Desconectado 🔴
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSalvarWhatsAppGeral} className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="sysPhone" className="font-bold text-sm text-slate-800">
                    Número do WhatsApp com DDD <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="sysPhone"
                      placeholder="Ex: (85) 98886-3130"
                      value={systemPhone}
                      onChange={e => setSystemPhone(e.target.value)}
                      className="h-12 text-base font-mono pl-4"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Utilizado como remetente oficial de notificações e links de validação.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={isSavingPhone} className="h-12 px-6 font-bold bg-primary hover:bg-primary/90">
                    {isSavingPhone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Cadastrar e Gerar QR Code
                  </Button>
                  <Button type="button" variant="outline" onClick={carregarInstancias} className="h-12 px-4">
                    <RefreshCw className="mr-2 h-4 w-4" /> Atualizar Status
                  </Button>
                </div>
              </form>

              {/* EXIBIÇÃO DO QR CODE CASO GERADO */}
              {systemQrCode && (
                <div className="p-6 bg-slate-50 border rounded-xl text-center space-y-4 max-w-sm mx-auto">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" /> Escaneie o QR Code no seu WhatsApp
                  </h4>
                  <img src={systemQrCode} alt="QR Code WhatsApp Geral" className="w-56 h-56 mx-auto rounded-lg border bg-white p-2 shadow-sm" />
                  <p className="text-xs text-slate-500">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar um aparelho.</p>
                </div>
              )}

              <form onSubmit={handleSendTestMessage} className="border-t pt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" /> Testar envio de mensagem
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Envie uma mensagem de teste pela instância geral já conectada.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="testPhone" className="font-bold text-sm text-slate-800">Número com DDD</Label>
                    <Input
                      id="testPhone"
                      inputMode="numeric"
                      placeholder="5511999999999"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="h-12 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testMessage" className="font-bold text-sm text-slate-800">Mensagem</Label>
                    <Input
                      id="testMessage"
                      placeholder="Mensagem de teste"
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSendingTest} variant="outline" className="h-11 font-bold">
                  {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar mensagem de teste
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ABA 2: MÓDULO INTEGRADO EVOLUTION API (LISTAGEM LIMPA E OBJETIVA) */}
        {activeTab === 'evolution' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="h-6 w-6 text-emerald-600" />
                    Instâncias de WhatsApp Ativas no Sistema
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Visualização simplificada de todos os WhatsApps de campanhas e instâncias cadastradas.
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={carregarInstancias} disabled={loadingInstances}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingInstances ? 'animate-spin' : ''}`} />
                  Atualizar Lista
                </Button>
              </div>

              {/* LISTAGEM DAS INSTÂNCIAS */}
              <div className="space-y-3">
                {instances.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50">
                    <Smartphone className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700">Nenhuma instância cadastrada ainda</h3>
                    <p className="text-xs text-slate-500 mt-1">As instâncias de campanhas aparecerão aqui automaticamente após o onboarding.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instances.map((inst, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                            {inst.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{inst.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{inst.phone}</div>
                            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{inst.campaign}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          {inst.status === 'connected' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <span className="size-1.5 rounded-full bg-emerald-500"></span> Conectado
                            </span>
                          ) : inst.status === 'connecting' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <span className="size-1.5 rounded-full bg-amber-500"></span> Pareando
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                              <span className="size-1.5 rounded-full bg-rose-500"></span> Offline
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">Atualizado: {inst.updatedAt}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CENTRAL DE ATALHOS E LINKS DE INFRAESTRUTURA */}
        {activeTab === 'infra' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Database className="h-6 w-6 text-blue-600" />
                  Painéis e Links de Infraestrutura
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Acesso direto aos bancos de dados, painel do Supabase Studio e microsserviços.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DESTAQUE OBRIGATÓRIO: SUPABASE STUDIO */}
                <a 
                  href="https://api.democracias.org" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-5 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#3ECF8E]/20 text-[#3ECF8E] rounded-xl">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        Supabase Studio (VPS)
                        <span className="text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">Destaque</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">Gerenciador de Tabelas, TSE 2026, Autenticação e SQL Editor</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </a>

                {/* PAINEL DE WHATSAPP / EVOLUTION MANAGER */}
                <a 
                  href="https://manager.democracias.org" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                      <Server className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        Evolution Manager Web (Dashboard)
                        <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Painel Visual</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Interface gráfica oficial para gerenciar instâncias do Evolution Go</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: GESTÃO DE CAMPANHAS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <FolderKanban className="h-6 w-6 text-violet-600" />
                    Campanhas cadastradas
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                    Gerencie as campanhas da plataforma. A exclusão remove também todos os registros que possuem vínculo com a campanha.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={carregarCampanhas} disabled={loadingCampaigns} className="shrink-0">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingCampaigns ? 'animate-spin' : ''}`} />
                  Atualizar lista
                </Button>
              </div>

              {loadingCampaigns ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-500">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-violet-600" />
                  Carregando campanhas...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
                  <FolderKanban className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="font-bold text-slate-700">Nenhuma campanha cadastrada.</p>
                  <p className="mt-1 text-sm text-slate-500">As campanhas criadas no onboarding aparecerão aqui.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-bold">Candidato</th>
                        <th className="px-4 py-3 font-bold">Número</th>
                        <th className="px-4 py-3 font-bold">Cargo / UF</th>
                        <th className="px-4 py-3 font-bold">Partido</th>
                        <th className="px-4 py-3 font-bold">Criação</th>
                        <th className="px-4 py-3 text-right font-bold">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="bg-white hover:bg-slate-50/70">
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900">{campaign.nome_candidato || campaign.nome_urna || 'Candidato não informado'}</p>
                            {campaign.nome_urna && campaign.nome_urna !== campaign.nome_candidato && (
                              <p className="mt-0.5 text-xs text-slate-500">Nome de urna: {campaign.nome_urna}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 font-mono font-semibold text-slate-700">{campaign.nr_candidato || '—'}</td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-700">{campaign.cargo || '—'}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{campaign.uf || 'UF não informada'}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{campaign.partido || '—'}</td>
                          <td className="px-4 py-4 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {campaign.created_at ? formatDataCompleta(campaign.created_at) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCampaignPendingDeletion(campaign)}
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              Excluir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 5: PESQUISA ELEITORAL & HEATMAP */}
        {activeTab === 'pesquisa' && (
          <PesquisaErrorBoundary>
            <PainelPesquisaEleitoral />
          </PesquisaErrorBoundary>
        )}

      </div>

      <Dialog open={Boolean(campaignPendingDeletion)} onOpenChange={(open) => !open && !isDeletingCampaign && setCampaignPendingDeletion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Excluir campanha definitivamente?
            </DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              Você está prestes a excluir <strong>{campaignPendingDeletion?.nome_candidato || campaignPendingDeletion?.nome_urna || 'esta campanha'}</strong>.
              Esta ação remove a campanha, membros, instâncias e filas de WhatsApp, solicitações e demais dados vinculados. Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isDeletingCampaign} onClick={() => setCampaignPendingDeletion(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isDeletingCampaign} onClick={excluirCampanha} className="bg-rose-600 hover:bg-rose-700">
              {isDeletingCampaign ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
