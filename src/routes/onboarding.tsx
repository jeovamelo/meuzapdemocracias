import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaignScope } from '@/hooks/useCampaignScope';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { setCampaign } = useCampaignScope();
  
  const [uf, setUf] = useState('');
  const [numero, setNumero] = useState('');
  
  const [isLoadingTse, setIsLoadingTse] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [candidateData, setCandidateData] = useState<{
    nome: string;
    nomeUrna: string;
    cargo: string;
    partido: string;
  } | null>(null);

  const buscarNoTse = async () => {
    if (!uf || !numero) {
      toast.error('Preencha a UF e o Número antes de buscar.');
      return;
    }

    setIsLoadingTse(true);
    try {
      // Endpoint público do TSE para divulgação de candidaturas (Exemplo para 2024/2026)
      // Como a API pode mudar o ID da eleição, isso é um wrapper de simulação baseada na documentação aberta.
      const eleicaoId = '2045202024'; // ID Fictício / Ano eleitoral genérico para o MVP
      const response = await fetch(
        `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2024/${uf}/${eleicaoId}/candidato/${numero}`
      ).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        // A API do TSE geralmente retorna um objeto complexo. Adaptando para o MVP:
        setCandidateData({
          nome: data.nomeCompleto || '',
          nomeUrna: data.nomeUrna || '',
          cargo: data.cargo?.nome || 'Candidato',
          partido: data.partido?.sigla || ''
        });
        toast.success('Dados importados do TSE!');
      } else {
        throw new Error('Candidato não encontrado na API do TSE.');
      }
    } catch (err) {
      console.warn("Falha ao buscar TSE", err);
      toast.info('Não foi possível buscar os dados automaticamente. Por favor, preencha manualmente.');
      // Habilita preenchimento manual ativando o form vazio
      setCandidateData({
        nome: '',
        nomeUrna: '',
        cargo: '',
        partido: ''
      });
    } finally {
      setIsLoadingTse(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uf || !numero || !candidateData?.nomeUrna) {
      toast.error('Preencha as informações obrigatórias.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Salvar no Supabase (MVP Mock -> set state global)
      // const { data } = await supabase.from('campaigns').insert({...})
      
      // Simulando a persistência do isolamento
      setCampaign({
        id: 'camp_12345',
        uf,
        numero,
        nomeUrna: candidateData.nomeUrna,
        cargo: candidateData.cargo
      });

      toast.success('Campanha configurada com sucesso!');
      
      // 2. Redirecionar para o Dashboard que agora ficará isolado
      navigate({ to: '/dashboard' });

    } catch (error) {
      toast.error('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900">Configuração de Campanha</h2>
          <p className="mt-2 text-slate-600">
            Defina o estado e o candidato para isolar o ambiente da plataforma.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="flex gap-4 mb-8">
            <div className="flex-1">
              <Label>Estado de Atuação (UF)</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label>Número do Candidato</Label>
              <Input 
                className="mt-1" 
                placeholder="Ex: 13, 22, 15123..." 
                value={numero}
                onChange={e => setNumero(e.target.value)}
              />
            </div>
          </div>

          {!candidateData ? (
            <Button 
              onClick={buscarNoTse} 
              className="w-full h-12 text-md mb-4"
              disabled={isLoadingTse || !uf || !numero}
            >
              {isLoadingTse ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Search className="mr-2 h-5 w-5" />
              )}
              Buscar Dados Oficiais no TSE
            </Button>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 border-t pt-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">Candidato Localizado / Editável</h4>
                  <p className="text-sm text-green-700 mt-1">Confirme os dados abaixo para criar o ambiente.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input 
                    value={candidateData.nome} 
                    onChange={e => setCandidateData({...candidateData, nome: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome de Urna</Label>
                  <Input 
                    value={candidateData.nomeUrna} 
                    onChange={e => setCandidateData({...candidateData, nomeUrna: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input 
                    value={candidateData.cargo} 
                    onChange={e => setCandidateData({...candidateData, cargo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Partido (Sigla)</Label>
                  <Input 
                    value={candidateData.partido} 
                    onChange={e => setCandidateData({...candidateData, partido: e.target.value})}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Finalizar Configuração
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
