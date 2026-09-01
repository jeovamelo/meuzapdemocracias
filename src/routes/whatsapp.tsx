import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Send,
  Plus,
  Trash2,
  Edit3,
  Radio,
  Check,
} from 'lucide-react';
import { useCampaignScope } from '@/hooks/useCampaignScope';
import { EvolutionWhatsAppService } from '@/lib/evolutionWhatsAppService';
import { toast } from 'sonner';

export const Route = createFileRoute('/whatsapp')({ component: WhatsAppSetupPage });

function WhatsAppSetupPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaignScope();

  // Dados da Campanha e WhatsApp
  const [campaignName, setCampaignName] = useState(campaign?.nomeUrna || '');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [activeInstanceName, setActiveInstanceName] = useState<string>('');

  // Status da Conexão
  const [status, setStatus] = useState<{ online: boolean; message: string; qr?: string | null }>({
    online: false,
    message: 'Gerando instância única para a campanha...',
    qr: null,
  });
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [generationError, setGenerationError] = useState('');

  // Teste de Mensagem
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Modais de Gestão de Instância
  const [isNewInstanceModalOpen, setIsNewInstanceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Formulário Nova / Editar Instância
  const [newInstanceNameInput, setNewInstanceNameInput] = useState('');
  const [newCampaignNameInput, setNewCampaignNameInput] = useState('');
  const [newWhatsappNumberInput, setNewWhatsappNumberInput] = useState('');
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState(false);

  // Carregar dados salvos localmente ou do escopo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('whatsapp_campaign_name');
      const storedNumber = localStorage.getItem('whatsapp_campaign_number');
      const storedInstance = localStorage.getItem('whatsapp_active_instance');

      if (storedName) setCampaignName(storedName);
      else if (campaign?.nomeUrna) setCampaignName(campaign.nomeUrna);

      if (storedNumber) setWhatsappNumber(storedNumber);
      if (storedInstance) setActiveInstanceName(storedInstance);
    }
  }, [campaign?.nomeUrna]);

  // 1. Inicializar ou conectar instância na Evolution API
  const inicializarInstanciaCampanha = async (forceRecreate = false, customName?: string) => {
    if (!campaign?.id) return;
    setLoadingInstance(true);
    setGenerationError('');
    setStatus({ online: false, message: 'Conectando instância na Evolution API...', qr: null });

    try {
      let res;
      if (customName && customName.trim() !== '') {
        res = await EvolutionWhatsAppService.createCustomInstance(campaign.id, customName.trim(), forceRecreate);
      } else {
        res = await EvolutionWhatsAppService.createOrReplaceCampaignInstance(
          campaign.id,
          campaignName || campaign.nomeUrna || 'Campanha',
          forceRecreate
        );
      }

      if (res.instanceName) {
        setActiveInstanceName(res.instanceName);
        localStorage.setItem('whatsapp_active_instance', res.instanceName);
      }

      if (!res.success) {
        setGenerationError(res.error || 'Não foi possível inicializar a instância.');
        return;
      }

      if (res.connected) {
        setStatus({ online: true, message: 'WhatsApp conectado com sucesso!', qr: null });
        toast.success('WhatsApp conectado com sucesso!');
      } else if (res.qrCode) {
        setStatus({
          online: false,
          message: 'Aguardando leitura do QR Code',
          qr: res.qrCode,
        });
      } else {
        setStatus({
          online: false,
          message: 'Instância ativa. Buscando QR Code...',
          qr: null,
        });
        const qr = await EvolutionWhatsAppService.getInstanceQr(res.instanceName);
        if (qr) {
          setStatus({
            online: false,
            message: 'Aguardando leitura do QR Code',
            qr,
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao iniciar instância Evolution:', e);
      setGenerationError('Falha de comunicação com a Evolution API.');
    } finally {
      setLoadingInstance(false);
    }
  };

  useEffect(() => {
    if (campaign?.id) {
      inicializarInstanciaCampanha();
    }
  }, [campaign?.id]);

  // 2. Polling inteligente de status e QR Code da instância
  useEffect(() => {
    if (!activeInstanceName) return;
    let active = true;

    const checarStatus = async () => {
      try {
        const stateRes = await EvolutionWhatsAppService.getInstanceStatus(activeInstanceName);
        if (!active) return;

        if (stateRes?.instance?.state === 'open' || stateRes?.instance?.connected) {
          setStatus({ online: true, message: 'WhatsApp conectado com sucesso!', qr: null });
        } else {
          const qr = await EvolutionWhatsAppService.getInstanceQr(activeInstanceName);
          if (active && qr) {
            setStatus({
              online: false,
              message: 'Aguardando leitura do QR Code',
              qr,
            });
          }
        }
      } catch (err) {
        console.warn('Polling de status da instância:', err);
      }
    };

    checarStatus();
    const interval = setInterval(checarStatus, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeInstanceName]);

  // 3. Cadastrar / Criar Nova Instância
  const handleCreateNewInstance = async () => {
    if (!newCampaignNameInput.trim()) {
      toast.error('Informe o nome da campanha para a nova instância.');
      return;
    }

    setCreatingInstance(true);
    try {
      const cleanName = newCampaignNameInput.trim();
      const cleanNumber = newWhatsappNumberInput.replace(/\D/g, '');

      setCampaignName(cleanName);
      setWhatsappNumber(cleanNumber);
      localStorage.setItem('whatsapp_campaign_name', cleanName);
      localStorage.setItem('whatsapp_campaign_number', cleanNumber);

      let chosenInstanceName = newInstanceNameInput.trim();
      if (!chosenInstanceName) {
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18);
        chosenInstanceName = `camp_${slug}_${campaign?.id ? campaign.id.slice(0, 6) : 'inst'}`;
      }

      await inicializarInstanciaCampanha(false, chosenInstanceName);
      setIsNewInstanceModalOpen(false);
      toast.success('Nova instância criada com sucesso! Escaneie o QR Code.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar nova instância.');
    } finally {
      setCreatingInstance(false);
    }
  };

  // 4. Salvar Edição de Parâmetros
  const handleSaveEditInstance = async () => {
    if (!campaignName.trim()) {
      toast.error('O nome da campanha é obrigatório.');
      return;
    }

    localStorage.setItem('whatsapp_campaign_name', campaignName.trim());
    localStorage.setItem('whatsapp_campaign_number', whatsappNumber.replace(/\D/g, ''));
    if (activeInstanceName) {
      localStorage.setItem('whatsapp_active_instance', activeInstanceName);
    }

    setIsEditModalOpen(false);
    toast.success('Parâmetros da instância atualizados com sucesso!');
  };

  // 5. Excluir Instância Ativa
  const handleDeleteInstance = async () => {
    if (!activeInstanceName) return;
    setDeletingInstance(true);

    try {
      if (campaign?.id) {
        await EvolutionWhatsAppService.deleteAndUnlinkInstance(campaign.id, activeInstanceName);
      } else {
        await EvolutionWhatsAppService.deleteInstance(activeInstanceName);
      }

      localStorage.removeItem('whatsapp_active_instance');
      setActiveInstanceName('');
      setStatus({
        online: false,
        message: 'Instância excluída com sucesso. Crie ou conecte uma nova instância.',
        qr: null,
      });

      setIsDeleteDialogOpen(false);
      toast.success('Instância excluída com sucesso da Evolution API!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir instância.');
    } finally {
      setDeletingInstance(false);
    }
  };

  // 6. Teste de Envio de Mensagem
  const handleSendTest = async (event: React.FormEvent) => {
    event.preventDefault();
    const recipient = testPhone.replace(/\D/g, '');

    if (!recipient || recipient.length < 10) {
      toast.error('Informe um número válido com DDD para envio de teste.');
      return;
    }
    if (!testMessage.trim()) {
      toast.error('Digite a mensagem de teste.');
      return;
    }
    if (!activeInstanceName) {
      toast.error('Nenhuma instância ativa conectada.');
      return;
    }

    setSendingTest(true);
    try {
      await EvolutionWhatsAppService.sendTestMessage(activeInstanceName, recipient, testMessage);
      setTestMessage('');
      toast.success(`Mensagem de teste enviada com sucesso para +${recipient.startsWith('55') ? recipient : '55' + recipient}!`);
    } catch (error) {
      console.error('Erro no envio de teste pela Evolution API:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem de teste.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleNext = async () => {
    if (!campaignName.trim() || whatsappNumber.replace(/\D/g, '').length < 10) {
      toast.error('Preencha o nome da campanha e o número do WhatsApp.');
      return;
    }
    localStorage.setItem('whatsapp_campaign_name', campaignName.trim());
    localStorage.setItem('whatsapp_campaign_number', whatsappNumber.replace(/\D/g, ''));

    toast.success('WhatsApp da campanha configurado!');
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center">
      <div className="w-full max-w-2xl text-center">
        
        {/* BADGE DE TOPO */}
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-emerald-200 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Evolution API • Gerenciador de Instâncias & Disparos</span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Conectar WhatsApp da Campanha</h1>
        <p className="mt-2 text-slate-600 text-sm max-w-lg mx-auto">
          Canal exclusivo para disparos transacionais, notificações em tempo real e validação de equipes.
        </p>

        {/* PAINEL PRINCIPAL */}
        <div className="mt-6 rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          
          {/* BARRA DE CONTROLE E AÇÕES DA INSTÂNCIA */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instância Ativa:</span>
                <Badge variant={status.online ? 'default' : 'secondary'} className={status.online ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-200 text-slate-700'}>
                  <Radio className={`w-3 h-3 mr-1 ${status.online ? 'animate-pulse text-emerald-200' : 'text-slate-400'}`} />
                  {activeInstanceName || 'Nenhuma instância'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                {status.online ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Conectada e pronta para disparos
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">Aguardando pareamento de QR Code</span>
                )}
              </p>
            </div>

            {/* BOTÕES DE GESTÃO DE INSTÂNCIA */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
              {false && <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                onClick={() => {
                  setNewCampaignNameInput(campaignName);
                  setNewWhatsappNumberInput(whatsappNumber);
                  setIsEditModalOpen(true);
                }}
                title="Editar parâmetros da instância ativa"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Editar</span>
              </Button>}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1"
                onClick={() => {
                  setNewCampaignNameInput(campaignName || campaign?.nomeUrna || '');
                  setNewWhatsappNumberInput(whatsappNumber || '');
                  setNewInstanceNameInput('');
                  setIsNewInstanceModalOpen(true);
                }}
                title="Cadastrar ou conectar uma nova instância da Evolution API"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Instância</span>
              </Button>

              {activeInstanceName && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 flex items-center gap-1"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Excluir instância da Evolution API e reiniciar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </Button>
              )}
            </div>
          </div>

          {/* DADOS DA CAMPANHA E NÚMERO OFICIAL */}
          <div className="grid gap-4 text-left sm:grid-cols-2">
            <div>
              <Label htmlFor="campaign-name" className="text-xs font-bold text-slate-700">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                className="mt-1 bg-white text-sm"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Campanha Missias 13123"
              />
            </div>
            <div>
              <Label htmlFor="whatsapp-number" className="text-xs font-bold text-slate-700">Número Oficial do WhatsApp</Label>
              <Input
                id="whatsapp-number"
                className="mt-1 bg-white text-sm"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="(DDD) 99999-9999"
                inputMode="numeric"
              />
              {whatsappNumber && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                  Número oficial: {whatsappNumber.replace(/\D/g, '').startsWith('55') ? whatsappNumber.replace(/\D/g, '') : `55${whatsappNumber.replace(/\D/g, '')}`}
                </p>
              )}
            </div>
          </div>

          {/* ÁREA DE QR CODE / STATUS EM TEMPO REAL */}
          {status.online ? (
            <div className="py-8 px-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="text-xl font-black text-emerald-950">WhatsApp Conectado!</h2>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                A instância <code className="bg-emerald-200/70 px-1.5 py-0.5 rounded font-mono font-bold">{activeInstanceName}</code> está ativa na Evolution API e pronta para disparar mensagens com fila controlada e proteção anti-bloqueio.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inicializarInstanciaCampanha(true)}
                  disabled={loadingInstance}
                  className="text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInstance ? 'animate-spin' : ''}`} /> Reconectar Sessão
                </Button>
              </div>
            </div>
          ) : status.qr ? (
            <div className="space-y-4 p-6 bg-slate-50/80 rounded-2xl border border-slate-200 text-center">
              <h2 className="font-black text-slate-800 text-base">Escaneie o QR Code com o WhatsApp</h2>
              <div className="relative inline-block">
                <img
                  src={status.qr}
                  alt="QR Code do WhatsApp"
                  className="mx-auto h-64 w-64 rounded-2xl border-2 border-emerald-500 shadow-lg bg-white p-2"
                />
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Abra o WhatsApp no celular da campanha, vá em <strong>Configurações &gt; Aparelhos Conectados</strong> e aponte para a tela.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inicializarInstanciaCampanha(false)}
                  disabled={loadingInstance}
                  className="text-xs font-bold"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInstance ? 'animate-spin' : ''}`} /> Atualizar QR Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => inicializarInstanciaCampanha(true)}
                  disabled={loadingInstance}
                  className="text-xs text-slate-500 hover:text-rose-600"
                >
                  Reiniciar Sessão
                </Button>
              </div>
            </div>
          ) : generationError ? (
            <div className="py-8 px-6 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
              <p className="text-xs font-semibold text-rose-800 leading-relaxed">{generationError}</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inicializarInstanciaCampanha(false)}
                  disabled={loadingInstance}
                  className="text-xs font-bold"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInstance ? 'animate-spin' : ''}`} /> Tentar Novamente
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => inicializarInstanciaCampanha(true)}
                  disabled={loadingInstance}
                  className="text-xs font-bold"
                >
                  Forçar Nova Instância
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-12 px-6 bg-slate-50/80 rounded-2xl border border-slate-200 text-center space-y-3">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-700">{status.message}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-slate-500 hover:text-emerald-700 font-bold"
                onClick={() => inicializarInstanciaCampanha(false)}
                disabled={loadingInstance}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInstance ? 'animate-spin' : ''}`} /> Forçar busca de QR Code
              </Button>
            </div>
          )}

          {/* FORMULÁRIO DE TESTE DE DISPARO */}
          <form onSubmit={handleSendTest} className="border-t border-slate-200 pt-6 text-left space-y-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Send className="h-4 w-4 text-emerald-600" /> Testar envio de mensagem
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                O envio será liberado assim que o QR Code for lido e a instância estiver conectada.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="test-phone" className="text-xs text-slate-700">Número de destino com DDD</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="DDD + número (ex: 85999999999)"
                  inputMode="numeric"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="test-message" className="text-xs text-slate-700">Mensagem</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  placeholder="Digite a mensagem de teste..."
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full font-bold text-xs h-10 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all"
              disabled={!status.online || sendingTest}
            >
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {status.online ? 'Enviar mensagem de teste' : 'Aguardando conexão do WhatsApp'}
            </Button>
          </form>

          {/* BOTÃO PRINCIPAL DE CONCLUSÃO */}
          <Button
            className="w-full h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg transition-all"
            onClick={handleNext}
          >
            Concluir e Ir para o Dashboard
          </Button>
        </div>

        {/* MODAL 1: CADASTRAR NOVA INSTÂNCIA */}
        <Dialog open={isNewInstanceModalOpen} onOpenChange={setIsNewInstanceModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Cadastrar Nova Instância (Evolution API)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Crie um novo canal de WhatsApp dedicado para a campanha. O sistema reiniciará a conexão para leitura do QR Code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-left">
              <div>
                <Label htmlFor="new-camp-name" className="text-xs font-bold text-slate-700">Nome da Campanha</Label>
                <Input
                  id="new-camp-name"
                  value={newCampaignNameInput}
                  onChange={(e) => setNewCampaignNameInput(e.target.value)}
                  placeholder="Ex: Campanha Deputado João Silva"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="new-inst-name" className="text-xs font-bold text-slate-700">Nome Técnico da Instância (Opcional)</Label>
                <Input
                  id="new-inst-name"
                  value={newInstanceNameInput}
                  onChange={(e) => setNewInstanceNameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="Ex: camp_joao_13123 (vazio = automático)"
                  className="mt-1 text-sm font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Se deixar em branco, geraremos automaticamente com base na campanha.</p>
              </div>

              <div>
                <Label htmlFor="new-whatsapp-num" className="text-xs font-bold text-slate-700">Número Oficial do WhatsApp</Label>
                <Input
                  id="new-whatsapp-num"
                  value={newWhatsappNumberInput}
                  onChange={(e) => setNewWhatsappNumberInput(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="(DDD) 99999-9999"
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewInstanceModalOpen(false)}
                disabled={creatingInstance}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                onClick={handleCreateNewInstance}
                disabled={creatingInstance}
              >
                {creatingInstance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar e Conectar Instância
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: EDITAR PARÂMETROS DA INSTÂNCIA */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Editar Parâmetros da Instância</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Atualize o nome da campanha e o número oficial vinculado a esta instância.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-left">
              <div>
                <Label htmlFor="edit-camp-name" className="text-xs font-bold text-slate-700">Nome da Campanha</Label>
                <Input
                  id="edit-camp-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="edit-inst-name" className="text-xs font-bold text-slate-700">Instância Ativa</Label>
                <Input
                  id="edit-inst-name"
                  value={activeInstanceName}
                  onChange={(e) => setActiveInstanceName(e.target.value)}
                  className="mt-1 text-sm font-mono"
                />
              </div>

              <div>
                <Label htmlFor="edit-whatsapp-num" className="text-xs font-bold text-slate-700">Número Oficial do WhatsApp</Label>
                <Input
                  id="edit-whatsapp-num"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" className="bg-blue-600 hover:bg-blue-500 font-bold" onClick={handleSaveEditInstance}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: CONFIRMAR EXCLUSÃO DA INSTÂNCIA */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-white rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <span>Excluir Instância do WhatsApp?</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
                Você tem certeza que deseja excluir a instância <strong className="text-slate-900 font-mono">{activeInstanceName}</strong>?
                <br /><br />
                Essa ação efetuará o logout na Evolution API e removerá o pareamento do WhatsApp. Você precisará escanear um novo QR Code caso crie uma nova instância.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingInstance}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 font-bold text-white"
                onClick={handleDeleteInstance}
                disabled={deletingInstance}
              >
                {deletingInstance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Excluir Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
