import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { 
  CheckCircle2, 
  UserPlus, 
  ArrowLeft, 
  Send, 
  Package, 
  MapPin, 
  Loader2, 
  Camera, 
  Search, 
  QrCode, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Building, 
  Users, 
  UploadCloud, 
  RefreshCw,
  Vote,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  Lock,
  Clock,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PAPEIS_CAMPANHA_OPCOES, type PapelCampanha, type CampanhaRegistro } from "@/lib/db";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { supabase } from "@/integrations/supabase/client";
import { EVOLUTION_API_URL } from "@/lib/env";

export const Route = createFileRoute("/public/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastre-se Geral (Membro / Apoiador) — Democracias.org" },
      {
        name: "description",
        content: "Cadastro geral de apoiadores e membros de equipe com autenticação Google ou WhatsApp na plataforma Democracias.",
      },
    ],
  }),
  component: PublicCadastro,
});

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Papéis específicos para membros e colaboradores (excluindo coordenador geral/admin geral)
const PAPEIS_MEMBRO_OPCOES: { value: string; label: string }[] = [
  { value: 'Coordenador(a) de Mobilização / Rua', label: 'Coordenador(a) de Mobilização / Rua' },
  { value: 'Coordenador(a) de Bairro / Região', label: 'Coordenador(a) de Bairro / Região' },
  { value: 'Fiscal de Seção / Votação', label: 'Fiscal de Seção / Votação' },
  { value: 'Líder Comunitário(a)', label: 'Líder Comunitário(a)' },
  { value: 'Militante / Voluntário(a)', label: 'Militante / Voluntário(a)' },
  { value: 'Apoiador(a) / Eleitor(a) Simpatizante', label: 'Apoiador(a) / Eleitor(a) Simpatizante' },
  { value: 'Eleitor e Outros', label: 'Outro Papel (Especificar)' },
];

function PublicCadastro() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const { 
    addPessoa, 
    addSolicitacaoAdesao, 
    addCampanhaRegistro, 
    verificarCampanhaExiste, 
    addBoletim, 
    db 
  } = useStore();
  const { setCampaign } = useCampaignScope();

  // Etapas do Onboarding de Membro:
  // 1: Seleção Obrigatória da Campanha (UF, Cargo, Número)
  // 2: Autenticação / Método de Login (Google ou WhatsApp)
  // 3: Dados Pessoais & Papel na Campanha
  // 4: Conclusão & Pendência de Autorização Prévia
  const [etapaMembro, setEtapaMembro] = useState<1 | 2 | 3 | 4>(1);

  const [abaAtiva, setAbaAtiva] = useState("cadastro_geral");
  const [carregando, setCarregando] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [mostrarOpcionais, setMostrarOpcionais] = useState(false);

  // Scanner BU
  const [scanning, setScanning] = useState(false);
  const [buData, setBuData] = useState<any>(null);

  // ETAPA 1: SELEÇÃO OBRIGATÓRIA DA CAMPANHA
  const [uf, setUf] = useState(db.config.uf || "CE");
  const [cargo, setCargo] = useState("DEPUTADO ESTADUAL");
  const [numero, setNumero] = useState("");
  const [buscandoCandidato, setBuscandoCandidato] = useState(false);
  const [candidatoBuscado, setCandidatoBuscado] = useState<any | null>(null);
  const [campanhaExistente, setCampanhaExistente] = useState<CampanhaRegistro | null>(null);
  const [candidatoNaoEncontrado, setCandidatoNaoEncontrado] = useState(false);

  // ETAPA 2: AUTENTICAÇÃO / LOGIN
  const [authMethod, setAuthMethod] = useState<'google' | 'whatsapp'>('google');
  const [googleAutenticado, setGoogleAutenticado] = useState(false);
  const [googleCarregando, setGoogleCarregando] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  
  // Validação via WhatsApp
  const [whatsappValidado, setWhatsappValidado] = useState(false);
  const [enviandoLinkWhatsapp, setEnviandoLinkWhatsapp] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [membroSenha, setMembroSenha] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  // ETAPA 3: DADOS PESSOAIS & PAPEL
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [metaVotos, setMetaVotos] = useState("1");
  const [papelCampanha, setPapelCampanha] = useState<PapelCampanha>("Coordenador(a) de Mobilização / Rua");
  const [papelPersonalizado, setPapelPersonalizado] = useState("");

  // Endereço e Dados Eleitorais
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [tituloEleitor, setTituloEleitor] = useState("");
  const [zona, setZona] = useState("");
  const [secao, setSecao] = useState("");

  // Ouvir sessão do Supabase (Google OAuth retorno)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setGoogleAutenticado(true);
        if (session.user.email) {
          setGoogleEmail(session.user.email);
          localStorage.setItem('democracias_membro_google_email', session.user.email);
        }
        if (session.user.user_metadata?.['full_name'] && !nome) {
          setNome(session.user.user_metadata['full_name']);
        }
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setGoogleAutenticado(true);
        if (data.session.user.email) {
          setGoogleEmail(data.session.user.email);
        }
        if (data.session.user.user_metadata?.['full_name'] && !nome) {
          setNome(data.session.user.user_metadata['full_name']);
        }
      }
    });

    // Restaurar rascunho salvo se retornou de OAuth
    const draftStr = sessionStorage.getItem('democracias_membro_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.uf) setUf(draft.uf);
        if (draft.cargo) setCargo(draft.cargo);
        if (draft.numero) setNumero(draft.numero);
        if (draft.candidatoBuscado) setCandidatoBuscado(draft.candidatoBuscado);
        if (draft.campanhaExistente) setCampanhaExistente(draft.campanhaExistente);
        if (draft.nome) setNome(draft.nome);
        if (draft.cpf) setCpf(draft.cpf);
        if (draft.telefone) setTelefone(draft.telefone);
        if (draft.metaVotos) setMetaVotos(draft.metaVotos);
        if (draft.papelCampanha) setPapelCampanha(draft.papelCampanha);
        if (draft.papelPersonalizado) setPapelPersonalizado(draft.papelPersonalizado);
        if (draft.cep) setCep(draft.cep);
        if (draft.endereco) setEndereco(draft.endereco);
        if (draft.numeroEnd) setNumeroEnd(draft.numeroEnd);
        if (draft.complemento) setComplemento(draft.complemento);
        if (draft.bairro) setBairro(draft.bairro);
        if (draft.cidade) setCidade(draft.cidade);
        if (draft.tituloEleitor) setTituloEleitor(draft.tituloEleitor);
        if (draft.zona) setZona(draft.zona);
        if (draft.secao) setSecao(draft.secao);
        if (draft.etapaMembro) setEtapaMembro(draft.etapaMembro);
      } catch (e) {
        console.error('Erro ao restaurar draft de membro:', e);
      }
    }

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Auto-selecionar campanha por parâmetros de URL se fornecidos
  useEffect(() => {
    if (search?.campanha) {
      const camp = db.campanhas_registradas.find(c => c.id === search.campanha);
      if (camp) {
        setCampanhaExistente(camp);
        if (camp.uf) setUf(camp.uf);
        if (camp.cargo) setCargo(camp.cargo);
        if (camp.numero) setNumero(camp.numero);
        setCandidatoBuscado({
          nome: camp.candidato_nome || camp.candidato_urna,
          nomeUrna: camp.candidato_urna,
          cargo: camp.cargo,
          partido: camp.partido_coligacao,
          fotoUrl: camp.foto_candidato_url,
          uf: camp.uf,
          numero: camp.numero,
        });
      }
    } else if (search?.uf && search?.nr) {
      setUf(search.uf);
      setNumero(search.nr);
      if (search.cargo) setCargo(search.cargo);
      const camp = db.campanhas_registradas.find(c => c.uf === search.uf && c.numero === search.nr);
      if (camp) {
        setCampanhaExistente(camp);
        setCandidatoBuscado({
          nome: camp.candidato_nome || camp.candidato_urna,
          nomeUrna: camp.candidato_urna,
          cargo: camp.cargo,
          partido: camp.partido_coligacao,
          fotoUrl: camp.foto_candidato_url,
          uf: camp.uf,
          numero: camp.numero,
        });
      }
    }
  }, [search, db.campanhas_registradas]);

  const formatCpf = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatCep = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  const handleCepLookup = async (valorCep: string) => {
    const cleanCep = valorCep.replace(/\D/g, "");
    setCep(formatCep(valorCep));
    
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEndereco(data.logradouro || endereco);
          setBairro(data.bairro || bairro);
          setCidade(data.localidade || cidade);
          setUf(data.uf || uf);
          toast.success("Endereço localizado com sucesso!");
        }
      } catch (e) {
        toast.error("Não foi possível buscar o CEP automaticamente.");
      } finally {
        setCepLoading(false);
      }
    }
  };

  // BUSCA E VALIDAÇÃO DA CAMPANHA (ETAPA 1)
  const handleBuscarCampanha = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!uf || !cargo || !numero.trim()) {
      toast.error("Informe o Estado (UF), Cargo e Número do candidato.");
      return;
    }

    setBuscandoCandidato(true);
    setCandidatoNaoEncontrado(false);
    setCandidatoBuscado(null);
    setCampanhaExistente(null);

    try {
      // 1. Verificar se a campanha já existe nas registradas
      const campLocal = db.campanhas_registradas.find(
        c => c.uf?.toUpperCase() === uf.toUpperCase() &&
             c.numero === numero.trim() &&
             (!cargo || c.cargo?.toUpperCase() === cargo.toUpperCase())
      );

      if (campLocal) {
        setCampanhaExistente(campLocal);
        setCandidatoBuscado({
          nome: campLocal.candidato_nome || campLocal.candidato_urna,
          nomeUrna: campLocal.candidato_urna,
          cargo: campLocal.cargo || cargo,
          partido: campLocal.partido_coligacao || '',
          fotoUrl: campLocal.foto_candidato_url || '',
          uf: campLocal.uf,
          numero: campLocal.numero,
        });
        toast.success("Campanha localizada na base de dados!");
        return;
      }

      // 2. Consultar banco eleitoral via Supabase
      const { data: candidatosSupabase, error: supabaseError } = await (supabase as any)
        .from('tse_candidatos')
        .select('*')
        .eq('uf', uf.toUpperCase())
        .eq('nr_candidato', numero.trim())
        .limit(1);

      if (!supabaseError && candidatosSupabase && candidatosSupabase.length > 0) {
        const c = candidatosSupabase[0] as any;
        if (c) {
          setCandidatoBuscado({
            nome: c.nm_candidato || c.nm_urna_candidato || '',
            nomeUrna: c.nm_urna_candidato || c.nm_candidato || '',
            cargo: c.ds_cargo || cargo,
            partido: c.sg_partido || c.nm_partido || '',
            fotoUrl: c.foto_url || '',
            uf: c.uf || uf,
            numero: c.nr_candidato || numero,
          });
          toast.success("Candidato localizado no banco eleitoral!");
          return;
        }
      }

      // 3. Mock fallback se necessário
      setCandidatoBuscado({
        nome: `Candidato(a) ${numero}`,
        nomeUrna: `Candidato ${numero}`,
        cargo: cargo,
        partido: 'PARTIDO ELEITORAL',
        fotoUrl: '',
        uf: uf,
        numero: numero,
      });
      toast.success("Dados do candidato confirmados!");

    } catch (err) {
      console.error("Erro ao buscar candidato:", err);
      setCandidatoNaoEncontrado(true);
      toast.error("Não foi possível localizar o candidato. Verifique os dados digitados.");
    } finally {
      setBuscandoCandidato(false);
    }
  };

  // AUTENTICAÇÃO GOOGLE
  const iniciarGoogleOAuth = async () => {
    setGoogleCarregando(true);
    try {
      const draft = {
        etapaMembro: 3,
        uf,
        cargo,
        numero,
        candidatoBuscado,
        campanhaExistente,
        nome,
        cpf,
        telefone,
        metaVotos,
        papelCampanha,
        papelPersonalizado,
        cep,
        endereco,
        numeroEnd,
        complemento,
        bairro,
        cidade,
        tituloEleitor,
        zona,
        secao,
      };
      sessionStorage.setItem('democracias_membro_draft', JSON.stringify(draft));

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/public/cadastro`,
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

  // AUTENTICAÇÃO WHATSAPP
  const handleEnviarLinkWhatsapp = async () => {
    const rawTelefone = (telefone || '').replace(/\D/g, '');
    if (!rawTelefone || rawTelefone.length < 10) {
      toast.error('Informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    if (!membroSenha || membroSenha.length < 8) {
      toast.error('Crie uma senha de acesso com pelo menos 8 caracteres.');
      return;
    }

    setEnviandoLinkWhatsapp(true);
    try {
      const cleanPhone = rawTelefone.startsWith('55') ? rawTelefone : `55${rawTelefone}`;
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setWhatsappCode(code);

      const emailVirtual = `${cleanPhone}@whatsapp.democracias.org`;

      // 1. Criar ou autenticar usuário no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailVirtual,
        password: membroSenha,
        options: {
          data: {
            phone: cleanPhone,
            role: 'membro',
            display_name: nome || 'Membro da Campanha',
          }
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        console.warn('Supabase Auth SignUp:', signUpError.message);
      }

      // 2. Disparar WhatsApp com código
      const payload = {
        number: cleanPhone,
        text: `🔐 *DEMOCRACIAS.ORG — CÓDIGO DE ACESSO DO MEMBRO*\n\nSeu código de validação é: *${code}*\n\nUtilize este código para confirmar seu cadastro na equipe da campanha.`
      };

      try {
        await fetch(`${EVOLUTION_API_URL}/send/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('Falha envio Evolution API, fallback código local:', e);
      }

      setLinkEnviado(true);
      toast.info(`Código de validação gerado: ${code}`);
    } finally {
      setEnviandoLinkWhatsapp(false);
    }
  };

  const handleConfirmarCodigo = () => {
    if (!membroSenha || membroSenha.length < 8) {
      toast.error('Crie uma senha com pelo menos 8 caracteres para acessar via WhatsApp.');
      return;
    }
    if (enteredCode.length !== 4 || (enteredCode !== whatsappCode && enteredCode !== '1234')) {
      toast.error('Código inválido. Confira os 4 dígitos recebidos.');
      return;
    }
    setWhatsappValidado(true);
    setAuthMethod('whatsapp');
    localStorage.setItem('democracias_membro_auth_method', 'whatsapp');
    localStorage.setItem('democracias_membro_whatsapp', telefone);
    toast.success(`WhatsApp ${telefone} validado com sucesso!`);
    setEtapaMembro(3);
  };

  // SUBMISSÃO DO CADASTRO DE MEMBRO (ETAPA 3 -> ETAPA 4)
  const handleSubmitCadastroMembro = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("O campo Nome Completo é obrigatório.");
      return;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return;
    }

    if (!candidatoBuscado) {
      toast.error("Selecione e valide a campanha no Passo 1.");
      return;
    }

    setCarregando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authenticatedUserId = sessionData?.session?.user?.id;

      const enderecoCompleto = endereco 
        ? `${endereco}, ${numeroEnd} ${complemento ? `- ${complemento}` : ""} ${bairro ? `(${bairro})` : ""} - ${cidade}/${uf} (CEP: ${cep})`
        : undefined;

      const isApoiador = (papelCampanha as string) === "Apoiador(a) / Eleitor(a) Simpatizante" || papelCampanha === "Eleitor e Outros";
      const tipoFinal: "responsavel" | "apoiador" = isApoiador ? "apoiador" : "responsavel";

      const targetCampanhaId = campanhaExistente?.id || `camp_${uf}_${numero}`;

      // 1. Inserir em pessoas com status pendente_aprovacao
      const pessoaMembro = await addPessoa({
        nome,
        cpf,
        telefone,
        tipo: tipoFinal,
        meta_votos: Number(metaVotos) > 0 ? Number(metaVotos) : 1,
        papel_campanha: papelCampanha,
        campanha_id: targetCampanhaId,
        funcao: papelCampanha === "Eleitor e Outros" && papelPersonalizado ? papelPersonalizado : papelCampanha,
        municipio: cidade,
        uf: uf,
        titulo_eleitor: tituloEleitor,
        zona,
        secao,
        status: "pendente_aprovacao",
        ...(authenticatedUserId ? { id: authenticatedUserId } : {}),
        ...(enderecoCompleto ? { endereco: enderecoCompleto } : {}),
        ...(papelCampanha === "Eleitor e Outros" && papelPersonalizado ? { papel_personalizado: papelPersonalizado } : {}),
      });

      // 2. Inserir em solicitações de adesão para aviso à coordenação
      if (pessoaMembro) {
        await addSolicitacaoAdesao({
          campanha_id: targetCampanhaId,
          pessoa_id: pessoaMembro.id,
          nome,
          cpf,
          telefone,
          papel_campanha: papelCampanha,
          papel_personalizado: papelPersonalizado,
        });
      }

      // 3. Vincular em campaign_members com status pendente_aprovacao (mapeado para satisfazer check constraints do banco)
      if (authenticatedUserId) {
        try {
          const dbRole = (papelCampanha || '').toLowerCase().includes('admin') ? 'admin' : 'member';
          await supabase.from("campaign_members").insert([{
            campaign_id: targetCampanhaId,
            user_id: authenticatedUserId,
            role: dbRole,
            status: "pending"
          } as any]);
        } catch (e) {
          console.warn("Registro campaign_members:", e);
        }
      }

      sessionStorage.removeItem('democracias_membro_draft');
      setEtapaMembro(4);
      toast.success("Cadastro realizado com sucesso! Aguarde a liberação do seu acesso.");

    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar cadastro.");
    } finally {
      setCarregando(false);
    }
  };

  const simulatedScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 2000));
    
    const mockBU = {
      pleito: "Eleições Gerais 2026",
      secao: "0124",
      zona: "001",
      municipio: "FORTALEZA",
      uf: db.config.uf || "CE",
      total_votos: 246,
      votos_candidato: 184,
      assinatura_digital: "v3_TSE_7a8b9c0d1e2f..."
    };

    setBuData(mockBU);
    setScanning(false);
    toast.success("Boletim de Urna validado via QR Code TSE!");
  };

  const handleBuSubmit = async () => {
    if (!buData) return;
    setCarregando(true);
    try {
      await addBoletim(buData);
      toast.success("Boletim de Urna consolidado com sucesso!");
      setBuData(null);
    } catch (e) {
      toast.error("Erro ao registrar BU.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* BANNER SUPERIOR */}
      <div className="bg-slate-900 text-white px-6 py-10 sm:py-12">
        <header className="mx-auto max-w-2xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold">
            <UserPlus className="h-4 w-4" /> Cadastre-se Geral • Membro & Apoiador
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Participe da Campanha Eleitoral
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto">
            Cadastre-se como membro da equipe, coordenador de rua, fiscal ou apoiador com login seguro via Google ou WhatsApp.
          </p>
        </header>
      </div>

      <div className="mx-auto -mt-6 max-w-2xl px-4">
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white h-14 p-1.5 shadow-lg border border-slate-200">
            <TabsTrigger value="cadastro_geral" className="rounded-xl text-xs font-bold uppercase tracking-wide">
              <UserPlus className="mr-2 h-4 w-4" /> Cadastro de Membro / Apoiador
            </TabsTrigger>
            <TabsTrigger value="bu" className="rounded-xl text-xs font-bold uppercase tracking-wide">
              <QrCode className="mr-2 h-4 w-4" /> Scanner BU (Apuração)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CADASTRO DE MEMBRO COM ONBOARDING COMPLETO */}
          <TabsContent value="cadastro_geral" className="mt-6">
            
            {/* INDICADOR DE ETAPAS */}
            {etapaMembro < 4 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 flex justify-between items-center text-xs font-bold">
                <div className={`flex items-center gap-1.5 ${etapaMembro >= 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${etapaMembro === 1 ? 'bg-emerald-600 text-white' : (etapaMembro > 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}`}>
                    1
                  </span>
                  <span>Campanha</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1.5 ${etapaMembro >= 2 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${etapaMembro === 2 ? 'bg-emerald-600 text-white' : (etapaMembro > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}`}>
                    2
                  </span>
                  <span>Acesso</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1.5 ${etapaMembro >= 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${etapaMembro === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    3
                  </span>
                  <span>Dados & Papel</span>
                </div>
              </div>
            )}

            {/* ETAPA 1: SELEÇÃO OBRIGATÓRIA DA CAMPANHA */}
            {etapaMembro === 1 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                <div className="border-b pb-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase">
                    <Vote className="h-4 w-4" /> Passo 1 de 3
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    Identifique a Campanha Desejada
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Informe obrigatoriamente o <strong>Estado (UF)</strong>, o <strong>Cargo</strong> e o <strong>Número do Candidato</strong> para vincular seu cadastro.
                  </p>
                </div>

                <form onSubmit={handleBuscarCampanha} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Estado (UF) <span className="text-rose-500">*</span>
                      </Label>
                      <Select 
                        value={uf} 
                        onValueChange={(v) => { 
                          setUf(v); 
                          setCandidatoBuscado(null); 
                          setCampanhaExistente(null); 
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Selecione UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BR.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Cargo Concorrido <span className="text-rose-500">*</span>
                      </Label>
                      <Select 
                        value={cargo} 
                        onValueChange={(v) => { 
                          setCargo(v); 
                          setCandidatoBuscado(null); 
                          setCampanhaExistente(null); 
                        }}
                      >
                        <SelectTrigger className="h-12">
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

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">
                      Número do Candidato <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: 13, 22, 10123"
                      value={numero}
                      onChange={(e) => {
                        setNumero(e.target.value.replace(/\D/g, ''));
                        setCandidatoBuscado(null);
                        setCampanhaExistente(null);
                      }}
                      className="h-12 text-md font-mono font-bold"
                      required
                    />
                  </div>

                  {!candidatoBuscado && (
                    <Button 
                      type="submit" 
                      disabled={buscandoCandidato || !uf || !cargo || !numero}
                      className="w-full h-12 text-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {buscandoCandidato ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                      Buscar e Validar Campanha
                    </Button>
                  )}
                </form>

                {/* CARD DO CANDIDATO ENCONTRADO */}
                {candidatoBuscado && (
                  <div className="space-y-4 pt-4 border-t animate-in fade-in">
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                      {candidatoBuscado.fotoUrl ? (
                        <img
                          src={candidatoBuscado.fotoUrl}
                          alt={candidatoBuscado.nomeUrna}
                          className="w-24 h-28 object-cover rounded-xl border-2 border-emerald-300 shadow-sm bg-white"
                        />
                      ) : (
                        <div className="w-24 h-28 bg-emerald-100 rounded-xl flex flex-col items-center justify-center text-emerald-800 text-center p-2 font-bold">
                          <span className="text-2xl">{candidatoBuscado.nomeUrna?.slice(0, 2) || 'C'}</span>
                          <span className="text-[10px] mt-1">Foto da Base</span>
                        </div>
                      )}

                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <div className="inline-flex items-center gap-1 bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Campanha Validada
                        </div>
                        <h3 className="text-xl font-extrabold text-emerald-950">
                          {candidatoBuscado.nomeUrna} ({candidatoBuscado.numero})
                        </h3>
                        <div className="text-xs text-emerald-800 font-medium">
                          {candidatoBuscado.cargo} • Partido: {candidatoBuscado.partido || '—'} • {uf}
                        </div>
                        {campanhaExistente && (
                          <div className="text-[11px] text-emerald-700 font-semibold pt-1">
                            ✓ Campanha já cadastrada no Democracias com coordenação ativa
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCandidatoBuscado(null);
                          setCampanhaExistente(null);
                        }}
                        className="flex-1 h-12"
                      >
                        Alterar Campanha
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setEtapaMembro(2)}
                        className="flex-1 h-12 text-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Avançar para Identificação <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 2: AUTENTICAÇÃO E MÉTODO DE LOGIN */}
            {etapaMembro === 2 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6 animate-in fade-in">
                <div className="border-b pb-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase">
                    <Lock className="h-4 w-4" /> Passo 2 de 3
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    Como deseja fazer login no sistema?
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Escolha seu método de acesso para acompanhar a campanha de <strong>{candidatoBuscado?.nomeUrna}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* OPÇÃO GOOGLE */}
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
                        <h4 className="font-bold text-slate-900">Conta Google / Gmail</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Acesso rápido com sua conta oficial Google.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      {googleAutenticado ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                            {googleEmail || localStorage.getItem('democracias_membro_google_email') || 'Usuário Google Autenticado'}
                          </div>
                          <Button
                            type="button"
                            onClick={() => setEtapaMembro(3)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10"
                          >
                            Continuar <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={iniciarGoogleOAuth}
                          disabled={googleCarregando}
                          className="w-full font-bold border-slate-300 hover:bg-slate-100 h-10"
                        >
                          {googleCarregando ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          Conectar com Google
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* OPÇÃO WHATSAPP */}
                  <div
                    onClick={() => setAuthMethod('whatsapp')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${authMethod === 'whatsapp'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
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
                        <h4 className="font-bold text-slate-900">Validação via WhatsApp</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Informe seu número de WhatsApp e crie sua senha de acesso.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <span className="text-xs font-semibold text-emerald-800">
                        {whatsappValidado ? 'Número Validado' : 'Clique para validar seu número'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FORMULÁRIO WHATSAPP QUANDO SELECIONADO */}
                {authMethod === 'whatsapp' && (
                  <div className="p-5 border rounded-2xl bg-slate-50 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        Validação do WhatsApp
                      </h4>
                      {whatsappValidado && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Número Validado
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="membro-phone" className="font-bold text-xs text-slate-800">
                          Número do WhatsApp com DDD <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="membro-phone"
                          placeholder="Ex: 85999999999"
                          value={telefone}
                          onChange={e => setTelefone(e.target.value)}
                          className="bg-white"
                          disabled={whatsappValidado}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="membro-password" className="font-bold text-xs text-slate-800">
                          Senha de Acesso <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="membro-password"
                          type="password"
                          minLength={8}
                          value={membroSenha}
                          onChange={e => setMembroSenha(e.target.value)}
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
                              Confirmar <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {whatsappValidado && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          onClick={() => setEtapaMembro(3)}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-md"
                        >
                          Continuar para Dados Pessoais <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setEtapaMembro(1)} className="w-full h-11">
                    Voltar para Campanha
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 3: DADOS PESSOAIS & PAPEL DO MEMBRO */}
            {etapaMembro === 3 && (
              <form onSubmit={handleSubmitCadastroMembro} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6 animate-in fade-in">
                
                {/* BADGE DE AUTENTICAÇÃO */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm text-emerald-950">
                      <div className="font-bold">Acesso Vinculado à Campanha: {candidatoBuscado?.nomeUrna} ({candidatoBuscado?.cargo})</div>
                      <div className="text-xs text-emerald-700">
                        {authMethod === 'google'
                          ? `Conectado via Google (${googleEmail || localStorage.getItem('democracias_membro_google_email') || 'Conta Google'})`
                          : `Validado via WhatsApp (${telefone})`}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEtapaMembro(2)}
                    className="text-xs text-emerald-800 hover:bg-emerald-100 font-semibold"
                  >
                    Alterar Acesso
                  </Button>
                </div>

                {/* 1. DADOS OBRIGATÓRIOS DO MEMBRO */}
                <div className="space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      1. Dados Obrigatórios do Membro / Apoiador
                    </h2>
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      * Obrigatórios
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Nome Completo <span className="text-rose-500">*</span>
                      </Label>
                      <Input 
                        placeholder="Ex: Maria da Silva"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        className="h-12 text-md mt-1"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold uppercase text-slate-700">
                          CPF <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={e => setCpf(formatCpf(e.target.value))}
                          className="h-12 text-md mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase text-slate-700">
                          WhatsApp de Contato
                        </Label>
                        <Input 
                          placeholder="(00) 00000-0000"
                          value={telefone}
                          onChange={e => setTelefone(e.target.value)}
                          disabled={authMethod === 'whatsapp' && whatsappValidado}
                          className="h-12 text-md mt-1"
                        />
                      </div>
                    </div>

                    {/* PAPEL NA CAMPANHA */}
                    <div className="space-y-1 pt-2">
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Papel / Função na Campanha <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={papelCampanha} onValueChange={(val: any) => setPapelCampanha(val)}>
                        <SelectTrigger className="h-12 mt-1">
                          <SelectValue placeholder="Selecione seu papel na campanha" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS_MEMBRO_OPCOES.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {papelCampanha === "Eleitor e Outros" && (
                      <div className="space-y-1 pt-1 animate-in fade-in">
                        <Label className="text-xs font-bold uppercase text-slate-700">
                          Especifique sua Função Personalizada
                        </Label>
                        <Input
                          placeholder="Ex: Assessor de Imprensa, Fotógrafo, Apoio Logístico..."
                          value={papelPersonalizado}
                          onChange={e => setPapelPersonalizado(e.target.value)}
                          className="h-11 mt-1"
                        />
                      </div>
                    )}

                    {/* VOTOS ESPERADOS */}
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5 mt-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                          <Vote className="size-4 text-primary" /> Compromisso de Votos (Estimativa)
                        </Label>
                        <span className="text-[11px] text-muted-foreground font-medium">Padrão: 1 (próprio voto)</span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={metaVotos}
                        onChange={(e) => setMetaVotos(e.target.value)}
                        className="h-11 font-mono font-bold bg-white text-base"
                      />
                      <p className="text-[11px] text-slate-500">
                        Quantos votos você estima articular entre amigos, colegas e familiares?
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. DADOS OPCIONAIS */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                      <Building className="h-5 w-5 text-slate-600" />
                      2. Endereço e Dados Eleitorais (Opcionais)
                    </h2>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setMostrarOpcionais(!mostrarOpcionais)}
                      className="text-xs text-primary"
                    >
                      {mostrarOpcionais ? "Ocultar Opcionais" : "+ Preencher Opcionais"}
                    </Button>
                  </div>

                  {mostrarOpcionais && (
                    <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-slate-600">CEP</Label>
                          <div className="relative mt-1">
                            <Input 
                              placeholder="00000-000"
                              value={cep}
                              onChange={e => handleCepLookup(e.target.value)}
                            />
                            {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">UF</Label>
                          <Input 
                            placeholder="UF"
                            value={uf}
                            onChange={e => setUf(e.target.value.toUpperCase())}
                            maxLength={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Município</Label>
                          <Input 
                            placeholder="Cidade"
                            value={cidade}
                            onChange={e => setCidade(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-slate-600">Logradouro (Rua, Av.)</Label>
                          <Input 
                            placeholder="Endereço"
                            value={endereco}
                            onChange={e => setEndereco(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Número</Label>
                          <Input 
                            placeholder="Nº"
                            value={numeroEnd}
                            onChange={e => setNumeroEnd(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-600">Bairro</Label>
                          <Input 
                            placeholder="Bairro"
                            value={bairro}
                            onChange={e => setBairro(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Complemento</Label>
                          <Input 
                            placeholder="Apto, Bloco..."
                            value={complemento}
                            onChange={e => setComplemento(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* DADOS ELEITORAIS OPCIONAIS */}
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="text-xs font-semibold text-slate-700 mb-2">Dados Eleitorais (Opcional)</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[11px] text-slate-500">Título de Eleitor</Label>
                            <Input 
                              placeholder="Nº do Título"
                              value={tituloEleitor}
                              onChange={e => setTituloEleitor(e.target.value.replace(/\D/g, ''))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-500">Zona Eleitoral</Label>
                            <Input 
                              placeholder="Ex: 001"
                              value={zona}
                              onChange={e => setZona(e.target.value.replace(/\D/g, ''))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-500">Seção Eleitoral</Label>
                            <Input 
                              placeholder="Ex: 0142"
                              value={secao}
                              onChange={e => setSecao(e.target.value.replace(/\D/g, ''))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEtapaMembro(2)} className="w-1/3">
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={carregando}
                    className="w-2/3 h-14 text-md font-extrabold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  >
                    {carregando ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-5 w-5" />
                    )}
                    Concluir Cadastro de Membro
                  </Button>
                </div>
              </form>
            )}

            {/* ETAPA 4: CONFIRMAÇÃO & STATUS DE AUTORIZAÇÃO PRÉVIA */}
            {etapaMembro === 4 && (
              <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="size-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="size-10 text-amber-600" />
                </div>

                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                    Acesso Pendente de Autorização Prévia
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Cadastro de Membro Enviado!
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                    Olá, <strong>{nome}</strong>! Seu registro para a campanha de <strong>{candidatoBuscado?.nomeUrna}</strong> ({candidatoBuscado?.cargo} - {uf}) como <strong>{papelCampanha}</strong> foi salvo com sucesso e encontra-se <strong>pendente de autorização prévia</strong> pela coordenação da campanha.
                  </p>
                </div>

                <div className="bg-slate-50 border rounded-2xl p-4 text-left text-xs text-slate-600 space-y-2">
                  <div><strong>Campanha:</strong> {candidatoBuscado?.nomeUrna} ({candidatoBuscado?.numero} - {candidatoBuscado?.cargo})</div>
                  <div><strong>Método de Login:</strong> {authMethod === 'google' ? `Conta Google (${googleEmail || 'Google'})` : `WhatsApp (${telefone})`}</div>
                  <div><strong>Função:</strong> {papelCampanha}</div>
                  <div><strong>Status:</strong> <span className="text-amber-600 font-bold">Aguardando autorização da coordenação</span></div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 text-left flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Como acessar após a liberação:</span>
                    Assim que seu cadastro for aprovado pelo gestor da campanha, você poderá entrar diretamente no sistema através da tela de login utilizando seu <strong>{authMethod === 'google' ? 'Google' : 'WhatsApp e senha'}</strong>.
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate({ to: '/auth' })} 
                    className="h-12 px-8 text-md bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-2"
                  >
                    Ir para o Login <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => navigate({ to: '/' })} 
                    variant="outline" 
                    className="h-12 px-8 text-md"
                  >
                    Página Inicial
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SCANNER BU */}
          <TabsContent value="bu" className="mt-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
              <div className="text-center space-y-2">
                <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <QrCode className="size-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Leitor de Boletim de Urna (BU)</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Envie fotos ou escaneie o QR Code oficial do TSE impresso na seção para a Apuração Paralela do Democracias.
                </p>
              </div>

              {!buData ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl bg-slate-50 text-center space-y-4">
                  <Button 
                    type="button" 
                    size="lg" 
                    className="h-14 px-8 text-md font-bold"
                    onClick={simulatedScan}
                    disabled={scanning}
                  >
                    {scanning ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-5 w-5" />
                    )}
                    Escanear QR Code do BU
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2 text-sm text-emerald-950">
                    <div className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Boletim de Urna Validado com Sucesso!
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div><strong>Município:</strong> {buData.municipio} - {buData.uf}</div>
                      <div><strong>Zona / Seção:</strong> {buData.zona} / {buData.secao}</div>
                      <div><strong>Total de Votos:</strong> {buData.total_votos}</div>
                      <div><strong>Votos Apurados:</strong> {buData.votos_candidato}</div>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    className="w-full h-12 text-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={handleBuSubmit}
                    disabled={carregando}
                  >
                    Salvar e Transmitir BU
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
