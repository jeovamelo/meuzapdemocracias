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
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

function fotoLocal(uf: string, sqCandidato: string | number | null | undefined) {
  if (!sqCandidato) return '';
  return `https://api.democracias.org/tse/foto/2026/${uf.toUpperCase()}/${String(sqCandidato)}`;
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { setCampaign } = useCampaignScope();
  
  const [uf, setUf] = useState('');
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [numero, setNumero] = useState('');
  
  const [isLoadingTse, setIsLoadingTse] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [candidateData, setCandidateData] = useState<{
    nome: string;
    nomeUrna: string;
    cargo: string;
    partido: string;
    fotoUrl?: string;
    vice?: { nome: string; nomeUrna: string; fotoUrl: string };
  } | null>(null);

  const buscarNoTse = async () => {
    if (!uf || !cargoSelecionado || !numero) {
      toast.error('Preencha a UF e o Número antes de buscar.');
      return;
    }

    setIsLoadingTse(true);
    try {
      // 1. Busca direta no Banco de Dados Supabase (Instantâneo)
      try {
        const { data: dbCand, error: dbError } = await (supabase as any)
          .from('tse_candidatos')
          .select('*')
          .eq('sg_uf', uf.toUpperCase().trim())
          .eq('nr_candidato', numero.trim())
          .eq('ds_cargo', cargoSelecionado)
          .limit(1)
          .maybeSingle();

        if (dbCand && !dbError) {
          let vice;
          if (cargoSelecionado === 'GOVERNADOR') {
            const { data: viceCand } = await (supabase as any).from('tse_candidatos').select('*').eq('sg_uf', uf.toUpperCase().trim()).eq('nr_candidato', numero.trim()).eq('ds_cargo', 'VICE-GOVERNADOR').limit(1).maybeSingle();
            if (viceCand) vice = { nome: viceCand.nm_candidato || '', nomeUrna: viceCand.nm_urna_candidato || '', fotoUrl: fotoLocal(uf, viceCand.sq_candidato) };
          }
          setCandidateData({
            nome: dbCand.nm_candidato || '',
            nomeUrna: dbCand.nm_urna_candidato || '',
            cargo: dbCand.ds_cargo || 'Candidato(a)',
            partido: dbCand.sg_partido || '',
            fotoUrl: fotoLocal(uf, dbCand.sq_candidato),
            vice,
          });
          toast.success(`Candidato(a) ${dbCand.nm_urna_candidato} localizado no Banco do TSE!`);
          setIsLoadingTse(false);
          return;
        }
      } catch (errDb) {
        console.warn('Erro ao consultar tabela tse_candidatos no Supabase:', errDb);
      }

      // 2. Fallback para o Microserviço Backend
      const backendUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:3001/tse/${uf}/${numero}?cargo=${encodeURIComponent(cargoSelecionado)}`
        : `/tse/${uf}/${numero}?cargo=${encodeURIComponent(cargoSelecionado)}`;

      let data: any = null;

      try {
        const response = await fetch(backendUrl);
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.candidate) {
            data = resJson.candidate;
          }
        }
      } catch (e) {
        console.warn("Backend proxy offline ou falhou, tentando fallback", e);
      }

      if (data) {
        setCandidateData({
          nome: data.nome || '',
          nomeUrna: data.nomeUrna || '',
          cargo: data.cargo || 'Candidato(a)',
          partido: data.partido || '',
          fotoUrl: fotoLocal(uf, data.sqCandidato),
        });
        toast.success(`Candidato(a) ${data.nomeUrna || data.nome} localizado no TSE!`);
      } else {
        toast.info('Candidato não encontrado automaticamente no TSE. Você pode preencher os dados manualmente abaixo.');
        setCandidateData({
          nome: '',
          nomeUrna: '',
          cargo: '',
          partido: '',
        });
      }
    } catch (err) {
      console.warn("Falha ao buscar TSE", err);
      toast.info('Não foi possível conectar ao TSE. Preencha os dados da campanha manualmente.');
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
    if (!uf || !cargoSelecionado || !numero || !candidateData?.nomeUrna) {
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
      navigate({ to: '/whatsapp' });

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
              <Label>UF</Label>
              <Select value={uf} onValueChange={value => { setUf(value); setCandidateData(null); }}>
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
              <Label>Cargo</Label>
              <Select value={cargoSelecionado} onValueChange={value => { setCargoSelecionado(value); setCandidateData(null); setNumero(''); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cargo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOVERNADOR">Governador</SelectItem>
                  <SelectItem value="DEPUTADO ESTADUAL">Deputado Estadual</SelectItem>
                  <SelectItem value="DEPUTADO FEDERAL">Deputado Federal</SelectItem>
                  <SelectItem value="SENADOR">Senador</SelectItem>
                  <SelectItem value="PRESIDENTE">Presidente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Número do Candidato</Label>
              <Input className="mt-1" value={numero} disabled={!cargoSelecionado}
                onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
          </div>

          {!candidateData ? (
            <Button 
              onClick={buscarNoTse} 
              className="w-full h-12 text-md mb-4"
              disabled={isLoadingTse || !uf || !cargoSelecionado || !numero}
            >
              {isLoadingTse ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Search className="mr-2 h-5 w-5" />
              )}
              Próximo
            </Button>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 border-t pt-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-4">
                {candidateData.fotoUrl ? (
                  <img 
                    src={candidateData.fotoUrl} 
                    alt={candidateData.nomeUrna || "Candidato"} 
                    className="w-24 h-28 object-cover rounded shadow-sm border border-slate-200 bg-white"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.alt = 'Foto não disponível';
                      img.style.objectFit = 'contain';
                    }}
                  />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                )}
                {candidateData.vice && (
                  <div className="flex items-center gap-3 border-l border-green-200 pl-3">
                    <img src={candidateData.vice.fotoUrl} alt={candidateData.vice.nomeUrna} className="w-16 h-20 object-cover rounded border bg-white" />
                    <div className="text-xs text-green-800"><strong>Vice:</strong><br />{candidateData.vice.nomeUrna}</div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-green-800">
                    {candidateData.nomeUrna ? `Candidato(a): ${candidateData.nomeUrna}` : 'Dados do Candidato / Editável'}
                  </h4>
                  <p className="text-xs text-green-700 mt-1">
                    {candidateData.partido ? `Partido: ${candidateData.partido} | ` : ''}Confirme ou edite os dados para criar o ambiente.
                  </p>
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
                Próximo
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
