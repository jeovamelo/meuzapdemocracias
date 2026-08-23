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
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

function PcPage() {
  // Autenticação Administrativa Obrigatória para /pc
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('democracias_pc_auth') === 'true';
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'geral' | 'evolution' | 'infra'>('geral');
  
  // WhatsApp Geral do Sistema
  const [systemPhone, setSystemPhone] = useState(() => localStorage.getItem('democracias_system_phone') || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [systemQrCode, setSystemQrCode] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Listagem de Instâncias da Evolution API
  const [instances, setInstances] = useState<WhatsAppInstanceItem[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);

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
            updatedAt: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'Recentemente'
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
            updatedAt: d.updated_at ? new Date(d.updated_at).toLocaleTimeString() : ''
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

                {/* PAINEL DE WHATSAPP / EVOLUTION */}
                <a 
                  href="https://api.democracias.org/whatsapp" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <Server className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Dashboard Evolution API</div>
                      <p className="text-xs text-slate-500 mt-0.5">Painel direto de instâncias e conexão WebSocket</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
