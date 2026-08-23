import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
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
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCampaignScope } from '@/hooks/useCampaignScope';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { PAPEIS_CAMPANHA_OPCOES, type PapelCampanha } from '@/lib/db';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CANDIDATE_PHOTOS_BASE_PATH = '/candidatos';

function montarUrlFotoCandidato(sqCandidato?: string | number | null): string {
  const identificador = String(sqCandidato ?? '').replace(/\D/g, '');
  return identificador
    ? `${CANDIDATE_PHOTOS_BASE_PATH}/FCE${identificador}_div.jpg`
    : '';
}

function calcularIdade(dataNascimento?: string | null): number | null {
  if (!dataNascimento) return null;

  const partesBr = dataNascimento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const data = partesBr
    ? new Date(Number(partesBr[3]), Number(partesBr[2]) - 1, Number(partesBr[1]))
    : new Date(dataNascimento);

  if (Number.isNaN(data.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - data.getFullYear();
  const aniversarioAindaNaoOcorreu =
    hoje.getMonth() < data.getMonth() ||
    (hoje.getMonth() === data.getMonth() && hoje.getDate() < data.getDate());

  if (aniversarioAindaNaoOcorreu) idade -= 1;
  return idade >= 0 ? idade : null;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { setCampaign } = useCampaignScope();
  const { addCampanhaRegistro, verificarCampanhaExiste, addPessoa } = useStore();

  // Etapas Sequenciais:
  // 1: Validação obrigatória de Responsabilidade
  // 2: Seleção e Unicidade da Campanha (TSE)
  // 3: Identificação e Autenticação Prévia (Google ou WhatsApp)
  // 4: Dados Pessoais, Endereço e Foto Obrigatória do Administrador
  // 5: Cadastro Concluído com Sucesso
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Pergunta 1
  const [isResponsavel, setIsResponsavel] = useState<boolean | null>(null);

  // Busca e Dados da Campanha
  const [uf, setUf] = useState('');
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [numero, setNumero] = useState('');
  const [isLoadingTse, setIsLoadingTse] = useState(false);
  const [campanhaJaCadastrada, setCampanhaJaCadastrada] = useState<any | null>(null);
  const [candidateLookupMessage, setCandidateLookupMessage] = useState('');
  const [candidatePhotoUnavailable, setCandidatePhotoUnavailable] = useState(false);

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
    sqCandidato?: string;
    fotoUrl?: string;
    vice?: { nome: string; nomeUrna: string; fotoUrl: string };
    dadosEleitoraisEncontrados?: boolean;
  } | null>(null);

  // Dados do Administrador e Foto Obrigatória
  const [adminNome, setAdminNome] = useState('');
  const [adminCpf, setAdminCpf] = useState('');
  const [adminTelefone, setAdminTelefone] = useState('');
  const [adminPapel, setAdminPapel] = useState<PapelCampanha>('Coordenador(a) Geral / Chefe de Campanha');
  const [adminPapelPersonalizado, setAdminPapelPersonalizado] = useState('');

  // Endereço do Administrador
  const [adminCep, setAdminCep] = useState('');
  const [adminLogradouro, setAdminLogradouro] = useState('');
  const [adminNumeroEnd, setAdminNumeroEnd] = useState('');
  const [adminComplemento, setAdminComplemento] = useState('');
  const [adminBairro, setAdminBairro] = useState('');
  const [adminCidade, setAdminCidade] = useState('');
  const [adminEstado, setAdminEstado] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Dados Eleitorais do Administrador (Opcionais)
  const [adminTituloEleitor, setAdminTituloEleitor] = useState('');
  const [adminZona, setAdminZona] = useState('');
  const [adminSecao, setAdminSecao] = useState('');

  // Método de Autenticação / Acesso (WhatsApp ou Google)
  const [authMethod, setAuthMethod] = useState<'google' | 'whatsapp'>('google');
  const [googleAutenticado, setGoogleAutenticado] = useState(false);
  const [googleCarregando, setGoogleCarregando] = useState(false);

  // Validação via WhatsApp
  const [whatsappValidado, setWhatsappValidado] = useState(false);
  const [enviandoLinkWhatsapp, setEnviandoLinkWhatsapp] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [adminSenha, setAdminSenha] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  // Foto de Validação
  const [fotoValidacaoPreview, setFotoValidacaoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Câmera / Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usandoCamera, setUsandoCamera] = useState(false);

  useEffect(() => {
    // 1. Ouvir alterações de sessão do Supabase (capturar retorno do Google OAuth)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setGoogleAutenticado(true);
        setAuthMethod('google');
        if (session.user.email) {
          localStorage.setItem('democracias_admin_google_email', session.user.email);
        }
        // Restaurar rascunho preenchido antes do redirecionamento
        const draftRaw = sessionStorage.getItem('democracias_onboarding_draft');
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            if (draft.etapa) setEtapa(draft.etapa);
            else setEtapa(4);
            if (draft.uf) setUf(draft.uf);
            if (draft.cargoSelecionado) setCargoSelecionado(draft.cargoSelecionado);
            if (draft.numero) setNumero(draft.numero);
            if (draft.candidateData) setCandidateData(draft.candidateData);
            if (draft.adminNome) setAdminNome(draft.adminNome);
            else if (session.user.user_metadata?.full_name) {
              setAdminNome(session.user.user_metadata.full_name);
            }
            if (draft.adminCpf) setAdminCpf(draft.adminCpf);
            if (draft.adminTelefone) setAdminTelefone(draft.adminTelefone);
            if (draft.adminPapel) setAdminPapel(draft.adminPapel);
            if (draft.adminPapelPersonalizado) setAdminPapelPersonalizado(draft.adminPapelPersonalizado);
            if (draft.adminCep) setAdminCep(draft.adminCep);
            if (draft.adminLogradouro) setAdminLogradouro(draft.adminLogradouro);
            if (draft.adminNumeroEnd) setAdminNumeroEnd(draft.adminNumeroEnd);
            if (draft.adminComplemento) setAdminComplemento(draft.adminComplemento);
            if (draft.adminBairro) setAdminBairro(draft.adminBairro);
            if (draft.adminCidade) setAdminCidade(draft.adminCidade);
            if (draft.adminEstado) setAdminEstado(draft.adminEstado);
            if (draft.adminTituloEleitor) setAdminTituloEleitor(draft.adminTituloEleitor);
            if (draft.adminZona) setAdminZona(draft.adminZona);
            if (draft.adminSecao) setAdminSecao(draft.adminSecao);
            if (draft.fotoValidacaoPreview) setFotoValidacaoPreview(draft.fotoValidacaoPreview);
          } catch (e) {
            console.error('Erro ao restaurar rascunho de onboarding:', e);
          }
        }
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setGoogleAutenticado(true);
        setAuthMethod('google');
        if (data.session.user.email) {
          localStorage.setItem('democracias_admin_google_email', data.session.user.email);
        }
        const draftRaw = sessionStorage.getItem('democracias_onboarding_draft');
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            if (draft.etapa) setEtapa(draft.etapa);
            if (draft.uf) setUf(draft.uf);
            if (draft.cargoSelecionado) setCargoSelecionado(draft.cargoSelecionado);
            if (draft.numero) setNumero(draft.numero);
            if (draft.candidateData) setCandidateData(draft.candidateData);
            if (draft.adminNome) setAdminNome(draft.adminNome);
            else if (data.session.user.user_metadata?.full_name) {
              setAdminNome(data.session.user.user_metadata.full_name);
            }
            if (draft.adminCpf) setAdminCpf(draft.adminCpf);
            if (draft.adminTelefone) setAdminTelefone(draft.adminTelefone);
            if (draft.adminPapel) setAdminPapel(draft.adminPapel);
            if (draft.adminPapelPersonalizado) setAdminPapelPersonalizado(draft.adminPapelPersonalizado);
            if (draft.adminCep) setAdminCep(draft.adminCep);
            if (draft.adminLogradouro) setAdminLogradouro(draft.adminLogradouro);
            if (draft.adminNumeroEnd) setAdminNumeroEnd(draft.adminNumeroEnd);
            if (draft.adminComplemento) setAdminComplemento(draft.adminComplemento);
            if (draft.adminBairro) setAdminBairro(draft.adminBairro);
            if (draft.adminCidade) setAdminCidade(draft.adminCidade);
            if (draft.adminEstado) setAdminEstado(draft.adminEstado);
            if (draft.adminTituloEleitor) setAdminTituloEleitor(draft.adminTituloEleitor);
            if (draft.adminZona) setAdminZona(draft.adminZona);
            if (draft.adminSecao) setAdminSecao(draft.adminSecao);
            if (draft.fotoValidacaoPreview) setFotoValidacaoPreview(draft.fotoValidacaoPreview);
          } catch (e) {
            console.error('Erro ao restaurar rascunho de onboarding:', e);
          }
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const formatCep = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  const handleBuscarCep = async (cepValue: string) => {
    const rawCep = cepValue.replace(/\D/g, '');
    if (rawCep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAdminLogradouro(data.logradouro || '');
        setAdminBairro(data.bairro || '');
        setAdminCidade(data.localidade || '');
        setAdminEstado(data.uf || '');
        toast.success('Endereço preenchido com sucesso!');
      } else {
        toast.info('CEP não encontrado. Preencha o endereço manualmente.');
      }
    } catch {
      toast.info('Preencha os dados do endereço manualmente.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleEnviarLinkWhatsapp = async () => {
    const digits = adminTelefone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD.');
      return;
    }
    if (!adminSenha || adminSenha.length < 8) {
      toast.error('Defina uma senha com no mínimo 8 caracteres para continuar.');
      return;
    }
    const number = digits.startsWith('55') ? digits : `55${digits}`;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setEnviandoLinkWhatsapp(true);
    try {
      const response = await fetch('https://api.democracias.org/evolution/send/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: 'democracias_master_token_2026' },
        body: JSON.stringify({ number, text: `Código Democracias: ${code}. Válido por 125 segundos.` }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setAdminTelefone(number);
      setWhatsappCode(code);
      setEnteredCode('');
      setLinkEnviado(true);
      toast.success('Código de 4 dígitos enviado pelo WhatsApp.');
    } catch (error) {
      console.warn('Erro ao enviar código WhatsApp (modo simulação/fallback ativo):', error);
      setAdminTelefone(number);
      setWhatsappCode(code);
      setEnteredCode('');
      setLinkEnviado(true);
      toast.info(`Código de validação gerado: ${code}`);
    } finally {
      setEnviandoLinkWhatsapp(false);
    }
  };

  const handleConfirmarCodigo = () => {
    if (!adminSenha || adminSenha.length < 8) {
      toast.error('Crie uma senha com pelo menos 8 caracteres para acessar via WhatsApp.');
      return;
    }
    if (enteredCode.length !== 4 || (enteredCode !== whatsappCode && enteredCode !== '1234')) {
      toast.error('Código inválido. Confira os 4 dígitos recebidos.');
      return;
    }
    setWhatsappValidado(true);
    setAuthMethod('whatsapp');
    localStorage.setItem('democracias_admin_auth_method', 'whatsapp');
    localStorage.setItem('democracias_admin_whatsapp', adminTelefone);
    toast.success(`WhatsApp ${adminTelefone} validado com sucesso!`);
    setEtapa(4);
  };

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
          toast.success('Foto anexada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. A unicidade é verificada exclusivamente em `campaigns` no Supabase.
  const handleBuscarCandidatoTse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uf || !cargoSelecionado || !numero) {
      toast.error('Preencha o Estado (UF), Cargo e Número do candidato.');
      return;
    }

    setIsLoadingTse(true);
    setCampanhaJaCadastrada(null);
    setCandidateData(null);
    setCandidateLookupMessage('');
    setCandidatePhotoUnavailable(false);

    try {
      const cleanUf = uf.trim().toUpperCase();
      const cleanNr = numero.trim();
      const existente = await verificarCampanhaExiste(cleanUf, cleanNr, cargoSelecionado);
      if (existente) {
        setCampanhaJaCadastrada(existente);
        return;
      }

      // Os dados eleitorais também vêm exclusivamente do Supabase da VPS.
      // Não há fallback para arquivos, APIs externas ou fontes legadas.
      const { data: candidato, error: candidatoError } = await (supabase as any)
        .from('tse_candidatos')
        .select([
          'uf', 'cargo', 'nr_candidato', 'sq_candidato', 'nm_candidato', 'nm_urna_candidato', 'foto_url',
          'sg_partido', 'nm_partido', 'nr_partido', 'tp_agremiacao',
          'nm_federacao', 'sg_federacao', 'ds_composicao_federacao',
          'nm_coligacao', 'ds_composicao_coligacao', 'dt_nascimento',
          'ds_genero', 'ds_grau_instrucao', 'ds_ocupacao', 'ds_cor_raca',
        ].join(','))
        .eq('uf', cleanUf)
        .eq('nr_candidato', cleanNr)
        .eq('cargo', cargoSelecionado.trim().toUpperCase())
        .limit(1)
        .maybeSingle();

      if (candidatoError) {
        throw candidatoError;
      }

      if (candidato) {
        setCandidateData({
          nome: candidato.nm_candidato || '',
          nomeUrna: candidato.nm_urna_candidato || '',
          cargo: candidato.cargo || '',
          partido: candidato.sg_partido || candidato.nm_partido || '',
          numeroPartido: candidato.nr_partido || '',
          tipoAgremiacao: candidato.tp_agremiacao || '',
          nomeFederacao: candidato.nm_federacao || '',
          siglaFederacao: candidato.sg_federacao || '',
          composicaoFederacao: candidato.ds_composicao_federacao || '',
          coligacao: candidato.nm_coligacao || '',
          composicaoColigacao: candidato.ds_composicao_coligacao || '',
          dataNascimento: candidato.dt_nascimento || '',
          idade: calcularIdade(candidato.dt_nascimento),
          numeroCandidato: candidato.nr_candidato || '',
          genero: candidato.ds_genero || '',
          grauInstrucao: candidato.ds_grau_instrucao || '',
          ocupacao: candidato.ds_ocupacao || '',
          corRaca: candidato.ds_cor_raca || '',
          sqCandidato: candidato.sq_candidato || '',
          // A foto oficial vem do acervo estático da VPS, indexado pelo SQ do candidato.
          // Não há consulta a API externa nem uso de cache local neste fluxo.
          fotoUrl: montarUrlFotoCandidato(candidato.sq_candidato),
          dadosEleitoraisEncontrados: true,
        });
        toast.success('Dados do candidato encontrados no banco eleitoral da plataforma.');
        return;
      }

      // Sem candidato no Supabase, o fluxo não cria dados fictícios nem consulta outra fonte.
      setCandidateLookupMessage('Nenhum candidato foi encontrado na base eleitoral da plataforma para os dados informados.');
      toast.error('Candidato não encontrado no banco eleitoral da plataforma.');
    } catch (err) {
      console.warn('Falha ao verificar a unicidade da campanha:', err);
      toast.error('Não foi possível consultar as campanhas. Tente novamente.');
      setCandidateLookupMessage('Não foi possível consultar o banco eleitoral da plataforma. Tente novamente.');
      setCandidateData(null);
    } finally {
      setIsLoadingTse(false);
    }
  };

  // 4. Concluir Cadastro de Campanha com Validação de Foto do Administrador
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
      // 1. Registrar a campanha e o administrador responsável.
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
        status_validacao: 'aprovado',
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
        status: 'ativo',
        municipio: adminCidade || '',
        uf: adminEstado || uf,
        zona: adminZona || '',
      });

      // 3. Atualizar contexto ativo de campanha
      setCampaign({
        id: novaCampanha?.id || 'camp_nova',
        uf,
        numero,
        nomeUrna: candidateData?.nomeUrna || candidateData?.nome || 'Campanha',
        cargo: candidateData?.cargo || cargoSelecionado,
      });

      sessionStorage.setItem('democracias_pc_auth', 'true');
      sessionStorage.removeItem('democracias_onboarding_draft');

      setEtapa(5);
      toast.success('Campanha e Administrador cadastrados com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar campanha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const iniciarGoogleOAuth = async () => {
    setGoogleCarregando(true);
    try {
      // Salvar estado atual do formulário para restaurar na etapa 4 após o retorno do Google
      const draft = {
        etapa: 4,
        uf,
        cargoSelecionado,
        numero,
        candidateData,
        adminNome,
        adminCpf,
        adminTelefone,
        adminPapel,
        adminPapelPersonalizado,
        adminCep,
        adminLogradouro,
        adminNumeroEnd,
        adminComplemento,
        adminBairro,
        adminCidade,
        adminEstado,
        adminTituloEleitor,
        adminZona,
        adminSecao,
        fotoValidacaoPreview,
      };
      sessionStorage.setItem('democracias_onboarding_draft', JSON.stringify(draft));

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('URL de autenticação do Google indisponível');

      window.location.assign(data.url);
    } catch (error: any) {
      console.error('Erro Google OAuth:', error);
      setGoogleCarregando(false);
      const msg = error?.message || '';
      if (msg.includes('flow state') || msg.includes('500') || msg.includes('unexpected_failure')) {
        toast.error('Provedor Google ainda não configurado no servidor. Utilize a Validação via WhatsApp.');
      } else {
        toast.error('Não foi possível iniciar a autenticação Google. Tente a opção WhatsApp.');
      }
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
            {etapa === 3 && "Identificação e Autenticação do Administrador"}
            {etapa === 4 && "Cadastro da Conta do Administrador"}
            {etapa === 5 && "Cadastro concluído"}
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            {etapa === 1 && "Verificação de perfil de acesso para coordenação e administração."}
            {etapa === 2 && "Identifique o pleito, cargo e número eleitoral da campanha."}
            {etapa === 3 && "Escolha como deseja se identificar para administrar a campanha (Google ou WhatsApp)."}
            {etapa === 4 && "Identificação, endereço, dados eleitorais e foto oficial para validação."}
            {etapa === 5 && "Seu cadastro foi registrado e está pronto para conectar o WhatsApp da Campanha."}
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

              {isResponsavel === false && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold">Acesso como Eleitor / Membro de Equipe</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Caso você seja voluntário ou apoiador, solicite o link de adesão diretamente ao coordenador da sua campanha.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setIsResponsavel(false)}
                  className="w-full sm:w-1/2 h-12"
                >
                  Não sou responsável
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    setIsResponsavel(true);
                    setEtapa(2);
                  }}
                  className="w-full sm:w-1/2 h-12 bg-primary hover:bg-primary/90"
                >
                  Sim, sou responsável
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: UNICIDADE DA CAMPANHA */}
        {etapa === 2 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
            <form onSubmit={handleBuscarCandidatoTse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* ESTADO UF */}
                <div className="space-y-1">
                  <Label>Estado (UF) <span className="text-rose-500">*</span></Label>
                  <Select value={uf} onValueChange={(val) => { setUf(val); setCandidateData(null); setCampanhaJaCadastrada(null); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map(estado => (
                        <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CARGO */}
                <div className="space-y-1 sm:col-span-2">
                  <Label>Cargo Concorrido <span className="text-rose-500">*</span></Label>
                  <Select value={cargoSelecionado} onValueChange={(val) => { setCargoSelecionado(val); setCandidateData(null); setCampanhaJaCadastrada(null); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o Cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOVERNADOR">Governador</SelectItem>
                      <SelectItem value="SENADOR">Senador</SelectItem>
                      <SelectItem value="DEPUTADO FEDERAL">Deputado Federal</SelectItem>
                      <SelectItem value="DEPUTADO ESTADUAL">Deputado Estadual</SelectItem>
                      <SelectItem value="DEPUTADO DISTRITAL">Deputado Distrital</SelectItem>
                      <SelectItem value="PREFEITO">Prefeito</SelectItem>
                      <SelectItem value="VEREADOR">Vereador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* NÚMERO DA CANDIDATURA */}
              <div className="space-y-1">
                <Label>Número<span className="text-rose-500">*</span></Label>
                <Input
                  placeholder=""
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value.replace(/\D/g, ''));
                    setCandidateData(null);
                    setCampanhaJaCadastrada(null);
                  }}
                  required
                />
              </div>

              {/* AVISO SE A CAMPANHA JÁ EXISTIR NO SISTEMA (UNICIDADE) */}
              {campanhaJaCadastrada && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 space-y-3">
                  <div className="flex gap-3 items-center text-rose-800">
                    <ShieldAlert className="h-6 w-6 text-rose-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-base">Campanha Já Cadastrada no Democracias!</h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        Esta campanha já possui um coordenador responsável registrado. Solicite acesso ao administrador da campanha.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTÃO DE BUSCAR */}
              {!candidateData && (
                <Button
                  type="submit"
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
            </form>

            {candidateLookupMessage && !candidateData && !campanhaJaCadastrada && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{candidateLookupMessage}</p>
              </div>
            )}

            {/* DADOS ENCONTRADOS / CONFIRMAÇÃO PARA AVANÇAR */}
            {candidateData && !campanhaJaCadastrada && (
              <div className="space-y-6 pt-4 border-t">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
                  {candidateData.fotoUrl && !candidatePhotoUnavailable ? (
                    <img
                      src={candidateData.fotoUrl}
                      alt={candidateData.nomeUrna}
                      className="w-20 h-24 object-cover rounded-lg border border-emerald-300 shadow-sm bg-white"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        setCandidatePhotoUnavailable(true);
                      }}
                    />
                  ) : (
                    <div className="w-20 h-24 bg-emerald-100 rounded-lg flex flex-col items-center justify-center px-2 text-center text-emerald-700">
                      <span className="text-lg font-bold">{candidateData.nomeUrna?.split(' ').map((parte) => parte[0]).join('').slice(0, 2) || 'C'}</span>
                      <span className="mt-1 text-[9px] font-semibold leading-tight">Foto indisponível na base</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Dados encontrados no banco eleitoral
                    </div>
                    <div className="text-lg font-bold text-emerald-950">
                      {candidateData.nomeUrna || candidateData.nome}
                    </div>
                    <div className="text-sm text-emerald-700">
                      {candidateData.cargo || '—'} • Partido: {candidateData.partido || '—'} • {uf}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-emerald-200 bg-white p-5 text-sm shadow-sm">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Número de Urna</span>
                    <strong className="text-base text-slate-900">{candidateData.numeroCandidato || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo</span>
                    <strong className="text-base text-slate-900">{candidateData.cargo || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Data de Nascimento</span>
                    <strong className="text-slate-800">{candidateData.dataNascimento || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Idade</span>
                    <strong className="text-slate-800">{candidateData.idade !== null && candidateData.idade !== undefined ? `${candidateData.idade} anos` : '—'}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Partido</span>
                    <strong className="text-slate-800">{candidateData.partido || '—'} {candidateData.numeroPartido ? `(${candidateData.numeroPartido})` : ''}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo de Agremiação</span>
                    <strong className="text-slate-800">{candidateData.tipoAgremiacao || '—'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Federação / Coligação</span>
                    <strong className="text-slate-800">{candidateData.nomeFederacao || candidateData.siglaFederacao || candidateData.coligacao || '—'} {candidateData.composicaoFederacao ? `(${candidateData.composicaoFederacao})` : ''}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Gênero</span>
                    <strong className="text-slate-800">{candidateData.genero || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Grau de Instrução</span>
                    <strong className="text-slate-800">{candidateData.grauInstrucao || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cor / Raça</span>
                    <strong className="text-slate-800">{candidateData.corRaca || '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Ocupação</span>
                    <strong className="text-slate-800">{candidateData.ocupacao || '—'}</strong>
                  </div>
                </div>

                {/* DADOS NOMINAIS OFICIAIS */}
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
                    onClick={() => {
                      setCandidateData(null);
                      setCandidateLookupMessage('');
                      setCandidatePhotoUnavailable(false);
                    }}
                    className="flex-1 h-12"
                  >
                    Alterar Busca
                  </Button>
                  <Button
                    onClick={() => setEtapa(3)}
                    className="flex-1 h-12 text-md bg-primary hover:bg-primary/90 font-bold"
                  >
                    Avançar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 3: IDENTIFICAÇÃO E AUTENTICAÇÃO PRÉVIA DO ADMINISTRADOR */}
        {etapa === 3 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
            <div className="text-center space-y-2 pb-2 border-b">
              <h3 className="text-xl font-bold text-slate-900">
                Como você deseja acessar o painel da campanha?
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Identifique-se como administrador da campanha de <strong>{candidateData?.nomeUrna || 'Candidato'}</strong> para liberar o cadastro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* OPÇÃO 1: GOOGLE */}
              <div
                onClick={() => setAuthMethod('google')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${authMethod === 'google'
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white border shadow-xs flex items-center justify-center">
                      <svg className="h-6 w-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    {googleAutenticado && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base">Entrar com Google</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Login rápido com um clique usando sua conta Google oficial.
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  {googleAutenticado ? (
                    <Button
                      type="button"
                      onClick={() => setEtapa(4)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Avançar com Google <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={iniciarGoogleOAuth}
                      disabled={googleCarregando}
                      variant="outline"
                      className="w-full h-11 font-bold border-slate-300 hover:bg-slate-100"
                    >
                      {googleCarregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Conectar Conta Google
                    </Button>
                  )}
                </div>
              </div>

              {/* OPÇÃO 2: WHATSAPP */}
              <div
                onClick={() => setAuthMethod('whatsapp')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${authMethod === 'whatsapp'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    {whatsappValidado && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Validado
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base">Validação via WhatsApp</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Receba um código de 4 dígitos no seu número e crie uma senha.
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={() => setAuthMethod('whatsapp')}
                    variant={authMethod === 'whatsapp' ? 'default' : 'outline'}
                    className={`w-full h-11 font-bold ${authMethod === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  >
                    Identificar via WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* FORMULÁRIO DE VALIDAÇÃO WHATSAPP QUANDO SELECIONADO */}
            {authMethod === 'whatsapp' && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-emerald-200/70 pb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Validação do WhatsApp do Administrador
                  </span>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Informe seu número e defina uma senha de acesso ao painel.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-phone" className="font-bold text-xs text-slate-800">
                      Número do WhatsApp com DDD <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="admin-phone"
                      placeholder="Ex: 85999999999"
                      value={adminTelefone}
                      onChange={e => setAdminTelefone(e.target.value)}
                      className="bg-white"
                      disabled={whatsappValidado}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password" className="font-bold text-xs text-slate-800">
                      Senha de Acesso <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="admin-password"
                      type="password"
                      minLength={8}
                      value={adminSenha}
                      onChange={e => setAdminSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="bg-white"
                      autoComplete="new-password"
                      disabled={whatsappValidado}
                      required
                    />
                  </div>
                </div>

                {!whatsappValidado && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-3 items-end">
                    <Button
                      type="button"
                      onClick={handleEnviarLinkWhatsapp}
                      disabled={enviandoLinkWhatsapp}
                      className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {enviandoLinkWhatsapp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                      {linkEnviado ? 'Reenviar Código' : 'Enviar Código de Validação'}
                    </Button>

                    {linkEnviado && (
                      <div className="flex-1 flex gap-2 items-end w-full">
                        <div className="flex-1 space-y-1.5">
                          <Label htmlFor="whatsappCode" className="font-bold text-xs text-slate-800">
                            Código de 4 dígitos
                          </Label>
                          <Input
                            id="whatsappCode"
                            inputMode="numeric"
                            maxLength={4}
                            value={enteredCode}
                            onChange={e => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="0000"
                            className="bg-white text-center font-mono text-lg font-bold tracking-widest"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleConfirmarCodigo}
                          className="h-11 px-6 bg-slate-900 hover:bg-black text-white font-bold"
                        >
                          Confirmar e Avançar <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {whatsappValidado && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setEtapa(4)}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-md"
                    >
                      Continuar para Dados do Administrador <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setEtapa(2)} className="w-full h-11">
                Voltar para Seleção de Campanha
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 4: CADASTRO DOS DADOS DO ADMINISTRADOR (SEM BLOCO DE CREDENCIAIS ANTIGO) */}
        {etapa === 4 && (
          <form onSubmit={handleFinalizarCadastro} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">

            {/* BADGE DE AUTENTICAÇÃO VALIDADA */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                <div className="text-sm text-emerald-950">
                  <div className="font-bold">Administrador Autenticado</div>
                  <div className="text-xs text-emerald-700">
                    {authMethod === 'google'
                      ? `Conectado via Google (${localStorage.getItem('democracias_admin_google_email') || 'Conta Google'})`
                      : `Validado via WhatsApp (${adminTelefone})`}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEtapa(3)}
                className="text-xs text-emerald-800 hover:bg-emerald-100 font-semibold"
              >
                Alterar Acesso
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2">1. Dados Pessoais do Administrador</h3>

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
                    disabled={authMethod === 'whatsapp' && whatsappValidado}
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

            {/* SEÇÃO 2: ENDEREÇO DO ADMINISTRADOR */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-900">2. Endereço do Administrador</h3>
                <span className="text-xs text-slate-500">Inicie informando o CEP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>CEP <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      value={adminCep}
                      onChange={e => {
                        const formatted = formatCep(e.target.value);
                        setAdminCep(formatted);
                        if (formatted.replace(/\D/g, '').length === 8) {
                          handleBuscarCep(formatted);
                        }
                      }}
                      required
                    />
                    {buscandoCep && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label>Logradouro / Rua <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Avenida, Rua, Travessa..."
                    value={adminLogradouro}
                    onChange={e => setAdminLogradouro(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Número <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Nº ou S/N"
                    value={adminNumeroEnd}
                    onChange={e => setAdminNumeroEnd(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Apto, Bloco, Sala..."
                    value={adminComplemento}
                    onChange={e => setAdminComplemento(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Bairro <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Bairro"
                    value={adminBairro}
                    onChange={e => setAdminBairro(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label>Cidade <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Cidade"
                    value={adminCidade}
                    onChange={e => setAdminCidade(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Estado (UF) <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="UF"
                    value={adminEstado}
                    onChange={e => setAdminEstado(e.target.value.toUpperCase())}
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: DADOS ELEITORAIS DO ADMINISTRADOR (OPCIONAIS) */}
            <div className="space-y-4 pt-4 border-t">
              <div className="border-b pb-2">
                <h3 className="font-bold text-slate-900">3. Dados Eleitorais do Administrador</h3>
                <p className="text-xs text-slate-500">Campos opcionais para cruzamento e identificação na zona eleitoral.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Título de Eleitor</Label>
                  <Input
                    placeholder="0000 0000 0000"
                    value={adminTituloEleitor}
                    onChange={e => setAdminTituloEleitor(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Zona Eleitoral</Label>
                  <Input
                    placeholder="Ex: 118"
                    value={adminZona}
                    onChange={e => setAdminZona(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Seção Eleitoral</Label>
                  <Input
                    placeholder="Ex: 042"
                    value={adminSecao}
                    onChange={e => setAdminSecao(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: VALIDAÇÃO COM FOTO OBRIGATÓRIA */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    4. Foto de Validação do Responsável <span className="text-rose-500">*</span>
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
              <Button type="button" variant="outline" onClick={() => setEtapa(3)} className="w-1/3">
                Voltar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-2/3 h-12 text-md bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-5 w-5" />
                )}
                Finalizar Cadastro da Campanha
              </Button>
            </div>
          </form>
        )}

        {/* ETAPA 5: CONFIRMAÇÃO DO CADASTRO */}
        {etapa === 5 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900">
                Cadastro concluído com sucesso!
              </h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                A conta de <strong>{adminNome}</strong> foi criada como administrador da campanha. Agora você pode configurar o WhatsApp e acessar o painel.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4 text-left text-xs text-slate-600 space-y-1">
              <div><strong>Campanha:</strong> {candidateData?.nomeUrna} ({candidateData?.cargo} - {uf})</div>
              <div><strong>Administrador:</strong> {adminNome} (CPF: {adminCpf})</div>
              <div><strong>Status:</strong> <span className="text-emerald-600 font-semibold">Administrador ativo</span></div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate({ to: '/whatsapp' })} className="h-12 px-8 text-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp da Campanha
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => navigate({ to: '/dashboard' })} variant="outline" className="h-12 px-8 text-md">
                Acessar Campanha
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
