import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
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
import { 
  Loader2, 
  Search, 
  CheckCircle2, 
  Camera, 
  ShieldAlert, 
  ShieldCheck, 
  UploadCloud, 
  UserCheck, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useCampaignScope } from '@/hooks/useCampaignScope';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { PAPEIS_CAMPANHA_OPCOES, type PapelCampanha } from '@/lib/db';

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

function calcularIdade(data?: string) {
  if (!data) return null;
  const partes = data.includes('/') ? data.split('/').reverse() : data.split('-');
  const nascimento = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date(); let idade = hoje.getFullYear() - nascimento.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())) idade--;
  return idade;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { setCampaign } = useCampaignScope();
  const { addCampanhaRegistro, verificarCampanhaExiste, addPessoa } = useStore();

  // Etapas:
  // 1: Pergunta obrigatória de Responsabilidade ("Você é responsável, coordenador ou candidato da campanha?")
  // 2: Seleção de UF, Cargo, Número e Consulta TSE / Validação de Unicidade
  // 3: Dados do Administrador e Captura Obrigatória de Foto de Validação
  // 4: Submissão Concluída / Pendente de Aprovação pelo Admin Geral
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  // Pergunta 1
  const [isResponsavel, setIsResponsavel] = useState<boolean | null>(null);

  // Busca e Dados da Campanha
  const [uf, setUf] = useState('');
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [numero, setNumero] = useState('');
  const [isLoadingTse, setIsLoadingTse] = useState(false);
  const [campanhaJaCadastrada, setCampanhaJaCadastrada] = useState<any | null>(null);

  const [candidateData, setCandidateData] = useState<{
    nome: string;
    nomeUrna: string;
    cargo: string;
    partido: string;
    numeroPartido?: string;
    tipoAgremiacao?: string;
    nomeFederacao?: string;
    siglaFederacao?: string;
    composicaoFederacao?: string;
    coligacao?: string;
    composicaoColigacao?: string;
    dataNascimento?: string;
    idade?: number | null;
    numeroCandidato?: string;
    genero?: string;
    grauInstrucao?: string;
    ocupacao?: string;
    corRaca?: string;
    fotoUrl?: string;
    vice?: { nome: string; nomeUrna: string; fotoUrl: string };
  } | null>(null);

  // Dados do Administrador e Foto Obrigatória
  const [adminNome, setAdminNome] = useState('');
  const [adminCpf, setAdminCpf] = useState('');
  const [adminTelefone, setAdminTelefone] = useState('');
  const [adminPapel, setAdminPapel] = useState<PapelCampanha>('Coordenador(a) Geral / Chefe de Campanha');
  const [adminPapelPersonalizado, setAdminPapelPersonalizado] = useState('');
  const [fotoValidacaoPreview, setFotoValidacaoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Câmera / Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usandoCamera, setUsandoCamera] = useState(false);

  const formatCpf = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleIniciarCamera = async () => {
    try {
      setUsandoCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Não foi possível acessar a câmera. Você pode fazer o upload da foto.');
      setUsandoCamera(false);
    }
  };

  const handleTirarFoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFotoValidacaoPreview(dataUrl);
        // Parar stream
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setUsandoCamera(false);
        toast.success('Foto capturada para validação!');
      }
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFotoValidacaoPreview(ev.target.result as string);
          toast.success('Foto carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Validar Pergunta de Responsável
  const handleConfirmarResponsavel = (resp: boolean) => {
    setIsResponsavel(resp);
    if (!resp) {
      // Se responder "Não", o usuário não tem permissão para cadastrar campanha e volta para a home
      toast.info('A criação de campanha é restrita a administradores. Redirecionando para a página inicial...');
      navigate({ to: '/' });
    } else {
      setEtapa(2);
    }
  };

  // 2. Consulta no TSE e Regra de Unicidade
  const buscarNoTseEValidarUnicidade = async () => {
    if (!uf || !cargoSelecionado || !numero) {
      toast.error('Preencha a UF, Cargo e Número antes de continuar.');
      return;
    }

    setIsLoadingTse(true);
    setCampanhaJaCadastrada(null);

    try {
      // REGRA 1: VERIFICAÇÃO DE UNICIDADE DA CAMPANHA
      const campanhaExistente = await verificarCampanhaExiste(uf, numero, cargoSelecionado);
      if (campanhaExistente) {
        setCampanhaJaCadastrada(campanhaExistente);
        setIsLoadingTse(false);
        return;
      }

      // Consulta ao Banco Oficial do TSE no Supabase
      try {
        // Formatar o cargo para busca exata ou ilike
        const cargoQuery = cargoSelecionado.trim().toUpperCase();

        const { data: dbCand, error: dbError } = await (supabase as any)
          .from('tse_candidatos')
          .select('*')
          .eq('sg_uf', uf.toUpperCase().trim())
          .eq('nr_candidato', numero.trim())
          .ilike('ds_cargo', `%${cargoQuery}%`)
          .limit(1)
          .maybeSingle();

        if (dbCand && !dbError) {
          let vice;
          if (cargoSelecionado === 'GOVERNADOR' || cargoQuery.includes('GOVERNADOR')) {
            const { data: viceCand } = await (supabase as any)
              .from('tse_candidatos')
              .select('*')
              .eq('sg_uf', uf.toUpperCase().trim())
              .eq('nr_candidato', numero.trim())
              .ilike('ds_cargo', '%VICE-GOVERNADOR%')
              .limit(1)
              .maybeSingle();
            if (viceCand) {
              vice = {
                nome: viceCand.nm_candidato || '',
                nomeUrna: viceCand.nm_urna_candidato || '',
                fotoUrl: fotoLocal(uf, viceCand.sq_candidato)
              };
            }
          }

          setCandidateData({
            nome: dbCand.nm_candidato || '',
            nomeUrna: dbCand.nm_urna_candidato || '',
            cargo: dbCand.ds_cargo || cargoSelecionado,
            partido: dbCand.sg_partido || dbCand.nm_partido || 'Não informado',
            numeroPartido: dbCand.nr_partido || '',
            tipoAgremiacao: dbCand.tp_agremiacao || 'Não informado',
            nomeFederacao: dbCand.nm_federacao || '',
            siglaFederacao: dbCand.sg_federacao || '',
            composicaoFederacao: dbCand.ds_composicao_federacao || '',
            coligacao: dbCand.nm_coligacao || '',
            composicaoColigacao: dbCand.ds_composicao_coligacao || '',
            dataNascimento: dbCand.dt_nascimento || 'Não informado',
            idade: calcularIdade(dbCand.dt_nascimento),
            numeroCandidato: dbCand.nr_candidato || numero,
            genero: dbCand.ds_genero || 'Não informado',
            grauInstrucao: dbCand.ds_grau_instrucao || 'Não informado',
            ocupacao: dbCand.ds_ocupacao || 'Não informado',
            corRaca: dbCand.ds_cor_raca || 'Não informado',
            fotoUrl: fotoLocal(uf, dbCand.sq_candidato),
            vice,
          });

          toast.success(`Candidato(a) ${dbCand.nm_urna_candidato} validado(a) na base oficial do TSE!`);
          setIsLoadingTse(false);
          return;
        } else {
          toast.error(`Candidato nº ${numero} para ${cargoSelecionado} não foi encontrado na base oficial do TSE em ${uf}.`);
          setCandidateData(null);
        }
      } catch (errDb) {
        console.warn('Erro na busca Supabase TSE:', errDb);
        toast.error('Falha ao consultar a base oficial do TSE.');
        setCandidateData(null);
      }
    } catch (err) {
      console.warn("Falha geral ao buscar", err);
      toast.error('Erro ao verificar campanha.');
      setCandidateData(null);
    } finally {
      setIsLoadingTse(false);
    }
  };

  // 3. Submeter Cadastro de Campanha com Validação de Foto do Administrador
  const handleFinalizarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminNome.trim() || !adminCpf.trim()) {
      toast.error('Preencha o Nome Completo e o CPF do Administrador da Campanha.');
      return;
    }

    if (adminCpf.replace(/\D/g, '').length !== 11) {
      toast.error('CPF inválido. Certifique-se de digitar os 11 dígitos.');
      return;
    }

    if (!fotoValidacaoPreview) {
      toast.error('O envio/captura da foto de validação do Administrador é OBRIGATÓRIO.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Cadastrar Registro da Campanha (Pendente de Validação pelo Admin Geral)
      const novaCampanha = await addCampanhaRegistro({
        uf,
        cargo: candidateData?.cargo || cargoSelecionado,
        numero,
        candidato_nome: candidateData?.nome || candidateData?.nomeUrna || 'Candidato',
        candidato_urna: candidateData?.nomeUrna || candidateData?.nome || 'Candidato',
        partido_coligacao: candidateData?.partido || '',
        foto_candidato_url: candidateData?.fotoUrl || '',
        admin_nome: adminNome,
        admin_cpf: adminCpf,
        admin_telefone: adminTelefone,
        admin_foto_validacao_url: fotoValidacaoPreview,
        status_validacao: 'pendente_aprovacao_admin_geral',
      });

      // 2. Cadastrar Usuário Administrador
      await addPessoa({
        nome: adminNome,
        cpf: adminCpf,
        telefone: adminTelefone,
        tipo: 'responsavel',
        papel_campanha: adminPapel,
        papel_personalizado: adminPapel === 'Eleitor e Outros' ? adminPapelPersonalizado : undefined,
        campanha_id: novaCampanha?.id,
        is_admin_campanha: true,
        foto_validacao_url: fotoValidacaoPreview,
        status: 'pendente_aprovacao',
        municipio: '',
        uf: uf,
        zona: '',
      });

      // 3. Atualizar contexto ativo de campanha
      setCampaign({
        id: novaCampanha?.id || 'camp_nova',
        uf,
        numero,
        nomeUrna: candidateData?.nomeUrna || candidateData?.nome || 'Campanha',
        cargo: candidateData?.cargo || cargoSelecionado,
      });

      setEtapa(4);
      toast.success('Campanha e Administrador cadastrados com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar campanha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        
        {/* CABEÇALHO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-3">
            <ShieldCheck className="h-4 w-4" />
            Democracias — Cadastro Seguro
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {etapa === 1 && "Validação de Responsabilidade"}
            {etapa === 2 && "Registro e Unicidade da Campanha"}
            {etapa === 3 && "Validação de Identidade do Administrador"}
            {etapa === 4 && "Campanha Submetida"}
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            {etapa === 1 && "Verificação de perfil de acesso para coordenação e administração."}
            {etapa === 2 && "Identifique o pleito, cargo e número eleitoral da campanha."}
            {etapa === 3 && "Envio obrigatório de foto para comprovação e auditoria do Administrador Geral."}
            {etapa === 4 && "Seu pedido de cadastro foi registrado e está em análise."}
          </p>
        </div>

        {/* ETAPA 1: PERGUNTA OBRIGATÓRIA DE RESPONSABILIDADE */}
        {etapa === 1 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Você é responsável, coordenador ou candidato da campanha?
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  A criação de campanhas no sistema é restrita a coordenadores, dirigentes ou ao próprio candidato(a).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <Button 
                  size="lg" 
                  className="h-16 text-lg font-semibold bg-primary hover:bg-primary/90"
                  onClick={() => handleConfirmarResponsavel(true)}
                >
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  Sim, sou Responsável / Candidato
                </Button>

                <Link to="/" className="w-full">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    type="button"
                    className="w-full h-16 text-lg font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      toast.info('Redirecionando para a página inicial...');
                    }}
                  >
                    Não, sou Apoiador / Membro
                  </Button>
                </Link>
              </div>

              {isResponsavel === false && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left mt-6 space-y-3">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-900">Acesso Restrito para Criação de Campanhas</h4>
                      <p className="text-sm text-amber-800 mt-1">
                        Se você deseja apoiar uma campanha ou participar da equipe em campo, utilize o nosso <strong>Cadastro Geral</strong> para localizar a campanha e solicitar sua adesão.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Link to="/public/cadastro">
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        <Users className="mr-2 h-4 w-4" />
                        Ir para Cadastro Geral de Apoiadores / Equipe
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 2: DADOS DA CAMPANHA E VERIFICAÇÃO DE UNICIDADE */}
        {etapa === 2 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>UF</Label>
                <Select value={uf} onValueChange={(val) => { setUf(val); setCandidateData(null); setCampanhaJaCadastrada(null); }}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione a UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(estado => (
                      <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Cargo Concorrido</Label>
                <Select value={cargoSelecionado} onValueChange={(val) => { setCargoSelecionado(val); setCandidateData(null); setCampanhaJaCadastrada(null); }}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOVERNADOR">Governador</SelectItem>
                    <SelectItem value="SENADOR">Senador</SelectItem>
                    <SelectItem value="DEPUTADO FEDERAL">Deputado Federal</SelectItem>
                    <SelectItem value="DEPUTADO ESTADUAL">Deputado Estadual</SelectItem>
                    <SelectItem value="PRESIDENTE">Presidente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Número do Candidato</Label>
                <Input 
                  className="h-11"
                  placeholder=""
                  value={numero}
                  onChange={e => { setNumero(e.target.value.replace(/\D/g, '')); setCandidateData(null); setCampanhaJaCadastrada(null); }}
                />
              </div>
            </div>

            {/* SE A CAMPANHA JÁ EXISTIR: BLOQUEIO DE DUPLICIDADE */}
            {campanhaJaCadastrada && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <ShieldAlert className="h-8 w-8 text-rose-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-rose-900">
                      Campanha Já Cadastrada no Democracias!
                    </h3>
                    <p className="text-sm text-rose-800 mt-1">
                      Pela <strong>Regra de Unicidade</strong>, cada campanha só pode ser cadastrada uma única vez. 
                      A campanha do(a) <strong>{campanhaJaCadastrada.candidato_urna || campanhaJaCadastrada.candidato_nome}</strong> ({campanhaJaCadastrada.cargo} - {campanhaJaCadastrada.uf}) já foi registrada anteriormente por outro responsável.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-rose-200 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{campanhaJaCadastrada.candidato_urna}</div>
                    <div className="text-xs text-slate-500">Status: {campanhaJaCadastrada.status_validacao}</div>
                  </div>
                  <Link to="/public/cadastro">
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                      Solicitar Participação na Campanha
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* BOTÃO DE BUSCAR NO TSE */}
            {!candidateData && !campanhaJaCadastrada && (
              <Button 
                onClick={buscarNoTseEValidarUnicidade} 
                className="w-full h-12 text-md"
                disabled={isLoadingTse || !uf || !cargoSelecionado || !numero}
              >
                {isLoadingTse ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Search className="mr-2 h-5 w-5" />
                )}
                Buscar e Validar Campanha
              </Button>
            )}

            {/* DADOS ENCONTRADOS / CONFIRMAÇÃO PARA AVANÇAR */}
            {candidateData && !campanhaJaCadastrada && (
              <div className="space-y-6 pt-4 border-t">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
                  {candidateData.fotoUrl ? (
                    <img 
                      src={candidateData.fotoUrl} 
                      alt={candidateData.nomeUrna} 
                      className="w-20 h-24 object-cover rounded-lg border border-emerald-300 shadow-sm bg-white"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-24 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold">
                      {candidateData.nomeUrna?.[0] || 'C'}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Campanha Elegível para Cadastro Único
                    </div>
                    <div className="text-lg font-bold text-emerald-950">
                      {candidateData.nomeUrna || candidateData.nome}
                    </div>
                    <div className="text-sm text-emerald-700">
                      {candidateData.cargo} • Partido: {candidateData.partido || 'N/A'} • {uf}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-emerald-200 bg-white p-5 text-sm shadow-sm">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Número de Urna</span>
                    <strong className="text-base text-slate-900">{candidateData.numeroCandidato || numero}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo</span>
                    <strong className="text-base text-slate-900">{candidateData.cargo}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Data de Nascimento</span>
                    <strong className="text-slate-800">{candidateData.dataNascimento || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Idade</span>
                    <strong className="text-slate-800">{candidateData.idade ? `${candidateData.idade} anos` : 'Não informado'}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Partido</span>
                    <strong className="text-slate-800">{candidateData.partido || 'Não informado'} {candidateData.numeroPartido ? `(${candidateData.numeroPartido})` : ''}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo de Agremiação</span>
                    <strong className="text-slate-800">{candidateData.tipoAgremiacao || 'Não informado'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Federação / Coligação</span>
                    <strong className="text-slate-800">{candidateData.nomeFederacao || candidateData.siglaFederacao || candidateData.coligacao || 'Partido Isolado'} {candidateData.composicaoFederacao ? `(${candidateData.composicaoFederacao})` : ''}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Gênero</span>
                    <strong className="text-slate-800">{candidateData.genero || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Grau de Instrução</span>
                    <strong className="text-slate-800">{candidateData.grauInstrucao || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cor / Raça</span>
                    <strong className="text-slate-800">{candidateData.corRaca || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Ocupação</span>
                    <strong className="text-slate-800">{candidateData.ocupacao || 'Não informado'}</strong>
                  </div>
                </div>

                {/* DADOS NOMINAIS OFICIAIS (SOMENTE LEITURA - DADOS DO TSE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nome Civil Completo</span>
                    <div className="font-semibold text-slate-900 text-sm mt-1">{candidateData.nome}</div>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nome de Urna</span>
                    <div className="font-semibold text-slate-900 text-sm mt-1">{candidateData.nomeUrna}</div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { setCandidateData(null); }}
                    className="flex-1 h-12"
                  >
                    Alterar Busca
                  </Button>
                  <Button 
                    onClick={() => setEtapa(3)} 
                    className="flex-1 h-12 text-md bg-primary hover:bg-primary/90 font-bold"
                  >
                    Avançar para Validação do Admin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 3: VALIDAÇÃO DE IDENTIDADE COM FOTO DO ADMINISTRADOR */}
        {etapa === 3 && (
          <form onSubmit={handleFinalizarCadastro} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-center">
              <ShieldCheck className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <strong>Comprovação de Identidade:</strong> Como responsável pela campanha de <strong>{candidateData?.nomeUrna}</strong>, você deve fornecer seu CPF e foto para validação pelo <strong>Administrador Geral</strong> do Democracias.
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2">1. Dados do Administrador da Campanha</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome Completo <span className="text-rose-500">*</span></Label>
                  <Input 
                    placeholder="Seu nome completo"
                    value={adminNome}
                    onChange={e => setAdminNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>CPF <span className="text-rose-500">*</span></Label>
                  <Input 
                    placeholder="000.000.000-00"
                    value={adminCpf}
                    onChange={e => setAdminCpf(formatCpf(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>WhatsApp de Contato</Label>
                  <Input 
                    placeholder="(00) 00000-0000"
                    value={adminTelefone}
                    onChange={e => setAdminTelefone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Papel / Função na Campanha <span className="text-rose-500">*</span></Label>
                  <Select value={adminPapel} onValueChange={(val: any) => setAdminPapel(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPEIS_CAMPANHA_OPCOES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {adminPapel === "Eleitor e Outros" && (
                <div className="space-y-1 pt-2">
                  <Label>Especifique o Cargo / Denominação Personalizada</Label>
                  <Input 
                    placeholder="Ex: Assessor Especial, Coordenador de Voluntários..."
                    value={adminPapelPersonalizado}
                    onChange={e => setAdminPapelPersonalizado(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* VALIDAÇÃO COM FOTO OBRIGATÓRIA */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    2. Foto de Validação do Responsável <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tire uma selfie ou envie uma foto nítida do seu rosto para autenticação.
                  </p>
                </div>
                {fotoValidacaoPreview && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Foto Anexada
                  </span>
                )}
              </div>

              {/* ÁREA DE CAPTURA / PREVIEW */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl bg-slate-50 text-center">
                {usandoCamera ? (
                  <div className="space-y-4 w-full max-w-sm">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-xl border bg-black" />
                    <Button type="button" onClick={handleTirarFoto} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Camera className="mr-2 h-5 w-5" /> Capturar Foto Agora
                    </Button>
                  </div>
                ) : fotoValidacaoPreview ? (
                  <div className="space-y-4">
                    <img 
                      src={fotoValidacaoPreview} 
                      alt="Foto de validação" 
                      className="w-48 h-56 object-cover rounded-xl border-2 border-primary shadow-md mx-auto" 
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setFotoValidacaoPreview('')}>
                        <RefreshCw className="mr-1 h-4 w-4" /> Trocar Foto
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                      <Camera className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Foto Obrigatória de Identificação</div>
                      <div className="text-xs text-slate-500 max-w-xs mt-1">
                        Utilize a câmera do dispositivo ou anexe um arquivo de imagem (PNG/JPG).
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button type="button" variant="secondary" onClick={handleIniciarCamera}>
                        <Camera className="mr-2 h-4 w-4" /> Abrir Câmera
                      </Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="mr-2 h-4 w-4" /> Enviar Arquivo
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUploadFoto} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setEtapa(2)} className="w-1/3">
                Voltar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-2/3 h-12 text-md bg-primary hover:bg-primary/90">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-5 w-5" />
                )}
                Submeter para Aprovação Geral
              </Button>
            </div>
          </form>
        )}

        {/* ETAPA 4: CONFIRMAÇÃO DE SUBMISSÃO PENDENTE DE APROVAÇÃO */}
        {etapa === 4 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900">
                Campanha Registrada com Sucesso!
              </h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Os dados da campanha e a foto de identificação de <strong>{adminNome}</strong> foram enviados para o <strong>Painel do Administrador Geral</strong> para validação de autenticidade.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4 text-left text-xs text-slate-600 space-y-1">
              <div><strong>Campanha:</strong> {candidateData?.nomeUrna} ({candidateData?.cargo} - {uf})</div>
              <div><strong>Administrador:</strong> {adminNome} (CPF: {adminCpf})</div>
              <div><strong>Status:</strong> <span className="text-amber-600 font-semibold">Pendente de Validação pelo Admin Geral</span></div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate({ to: '/dashboard' })} className="h-12 px-8 text-md bg-primary hover:bg-primary/90">
                Acessar Painel da Campanha
              </Button>
              <Link to="/">
                <Button variant="outline" className="h-12 px-8 text-md">
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
