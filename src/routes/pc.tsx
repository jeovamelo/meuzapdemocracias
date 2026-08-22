import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2, Phone, Save, MessageCircle, ShieldCheck, Database, Server, Key, Link as LinkIcon, ExternalLink, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemStore } from '@/hooks/useSystemStore';

export const Route = createFileRoute('/pc')({
  component: PcPage,
});

function PcPage() {
  const { officialWhatsApp, setOfficialWhatsApp, googleAuth, setGoogleAuth } = useSystemStore();
  const [phone, setPhone] = useState(officialWhatsApp);
  const [clientId, setClientId] = useState(googleAuth?.clientId || '');
  const [clientSecret, setClientSecret] = useState(googleAuth?.clientSecret || '');
  const [isSaving, setIsSaving] = useState(false);

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
    if (!clientId || !clientSecret) {
      toast.error('Preencha os campos de OAuth.');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setGoogleAuth({ clientId, clientSecret });
      toast.success('Credenciais Google OAuth salvas com sucesso!');
      setIsSaving(false);
    }, 600);
  };

  const handleTestDisparo = async () => {
    if (!officialWhatsApp) {
      toast.error('Configure um número primeiro.');
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: officialWhatsApp,
          message: '⚙️ *Democracias (Sistema)*: Teste de integração de infraestrutura bem sucedido.',
        }),
      });

      if (!res.ok) {
        toast.warning('O webhook do WhatsApp falhou.');
      } else {
        toast.success('Mensagem de teste enviada!');
      }
    } catch (err) {
      toast.warning('Não foi possível contactar a API do WhatsApp na porta 3001.');
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
            <a href="http://localhost:8000" target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-[#3ECF8E]/10 p-2 rounded-lg"><Database className="h-5 w-5 text-[#3ECF8E]" /></div>
                <div>
                  <h3 className="font-bold text-sm">Supabase Studio Local</h3>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Banco de Dados e Auth</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            
            <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
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
                  <li>http://localhost:5173/onboarding</li>
                  <li>https://democracias.com/onboarding</li>
                </ul>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto h-11" disabled={isSaving}>
               {isSaving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Credenciais</>}
            </Button>
          </form>
        </section>

        {/* 3. Configuração do WhatsApp Oficial da Plataforma */}
        <section className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">WhatsApp Oficial do Sistema</h2>
              <p className="text-sm text-muted-foreground">O canal central do Democracias para avisos de sistema.</p>
            </div>
          </div>
          <form onSubmit={handleSavePhone} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="systemPhone" className="text-base font-semibold">Número Mestre (Admin)</Label>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <p className="text-sm text-muted-foreground max-w-2xl">
                Este número é isolado e gerencia os disparos <strong>GLOBAIS</strong> do sistema (avisos da plataforma, segurança, etc). <strong>NÃO</strong> é o WhatsApp usado nas Campanhas de cada cliente.
              </p>
              
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="systemPhone"
                  type="text"
                  placeholder="Ex: 5511999999999"
                  className="pl-10 h-12 text-lg font-mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/50 mt-6">
              <Button type="submit" className="h-11 font-bold sm:w-auto" disabled={isSaving}>
                 {isSaving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Atualizar Número</>}
              </Button>
              <Button type="button" variant="outline" className="h-11 font-semibold text-green-600 sm:w-auto" onClick={handleTestDisparo}>
                <MessageCircle className="mr-2 h-4 w-4" /> Testar Conexão WA
              </Button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
