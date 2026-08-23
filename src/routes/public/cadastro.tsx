import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
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
  Sparkles
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
import { Textarea } from "@/components/ui/textarea";
import { PAPEIS_CAMPANHA_OPCOES, type PapelCampanha, type CampanhaRegistro } from "@/lib/db";
import { useCampaignScope } from "@/hooks/useCampaignScope";

export const Route = createFileRoute("/public/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastre-se — Democracias.org" },
      {
        name: "description",
        content: "Cadastro geral de apoiadores, membros de campanha e eleitores na plataforma Democracias.",
      },
    ],
  }),
  component: PublicCadastro,
});

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function PublicCadastro() {
  const navigate = useNavigate();
  const { 
    addPessoa, 
    addSolicitacaoAdesao, 
    addCampanhaRegistro, 
    verificarCampanhaExiste, 
    addBoletim, 
    db 
  } = useStore();
  const { setCampaign } = useCampaignScope();

  const [enviado, setEnviado] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<{ titulo: string; desc: string }>({
    titulo: "Cadastro Realizado!",
    desc: "Suas informações foram salvas com sucesso no sistema."
  });
  const [carregando, setCarregando] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("cadastro_geral");
  const [mostrarOpcionais, setMostrarOpcionais] = useState(false);

  // Scanner BU
  const [scanning, setScanning] = useState(false);
  const [buData, setBuData] = useState<any>(null);

  // DADOS DO FORMULÁRIO GERAL
  // 1. Obrigatórios: Nome Completo e CPF
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [metaVotos, setMetaVotos] = useState("1");

  // 2. Opcionais: Endereço (com CEP) e Título de Eleitor (Zona/Seção)
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState(db.config.uf || "CE");
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [tituloEleitor, setTituloEleitor] = useState("");
  const [zona, setZona] = useState("");
  const [secao, setSecao] = useState("");

  // 3. Papel e Seleção de Campanha
  const [tipoVinculo, setTipoVinculo] = useState<"campanha" | "eleitor">("campanha");
  const [papelCampanha, setPapelCampanha] = useState<PapelCampanha>("Coordenador(a) de Mobilização / Rua");
  const [papelPersonalizado, setPapelPersonalizado] = useState("");

  // Busca de Campanha
  const [buscaCampanhaUf, setBuscaCampanhaUf] = useState(db.config.uf || "CE");
  const [buscaTermo, setBuscaTermo] = useState("");
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaRegistro | null>(null);
  const [campanhaNaoEncontrada, setCampanhaNaoEncontrada] = useState(false);

  // Modal / Fluxo de "Deseja ser o Administrador?"
  const [modoCriarAdmin, setModoCriarAdmin] = useState(false);
  const [cargoNovaCampanha, setCargoNovaCampanha] = useState("DEPUTADO ESTADUAL");
  const [numeroNovaCampanha, setNumeroNovaCampanha] = useState("");
  const [nomeUrnaNovaCampanha, setNomeUrnaNovaCampanha] = useState("");
  const [partidoNovaCampanha, setPartidoNovaCampanha] = useState("");
  const [fotoValidacaoAdmin, setFotoValidacaoAdmin] = useState("");
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

  // Câmera para validação de admin
  const handleIniciarCamera = async () => {
    try {
      setUsandoCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Câmera indisponível. Você pode enviar um arquivo com sua foto.');
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
        setFotoValidacaoAdmin(dataUrl);
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        setUsandoCamera(false);
        toast.success('Foto capturada para validação!');
      }
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFotoValidacaoAdmin(ev.target.result as string);
          toast.success('Foto carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Lista de campanhas disponíveis filtradas
  const campanhasFiltradas = useMemo(() => {
    return db.campanhas_registradas.filter(c => {
      const matchUf = !buscaCampanhaUf || c.uf.toUpperCase() === buscaCampanhaUf.toUpperCase();
      const matchTermo = !buscaTermo || 
        c.candidato_urna.toLowerCase().includes(buscaTermo.toLowerCase()) ||
        c.candidato_nome.toLowerCase().includes(buscaTermo.toLowerCase()) ||
        c.numero.includes(buscaTermo) ||
        c.cargo.toLowerCase().includes(buscaTermo.toLowerCase());
      return matchUf && matchTermo;
    });
  }, [db.campanhas_registradas, buscaCampanhaUf, buscaTermo]);

  const handleBuscarCampanha = () => {
    if (campanhasFiltradas.length === 0) {
      setCampanhaNaoEncontrada(true);
      setCampanhaSelecionada(null);
    } else {
      setCampanhaNaoEncontrada(false);
    }
  };

  // SUBMISSÃO DO CADASTRO
  const handleSubmitCadastroGeral = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validação Obrigatória: Nome e CPF
    if (!nome.trim()) {
      toast.error("O campo Nome Completo é obrigatório.");
      return;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return;
    }

    setCarregando(true);
    try {
      const enderecoCompleto = endereco ? `${endereco}, ${numeroEnd} ${complemento ? `- ${complemento}` : ""} ${bairro ? `(${bairro})` : ""} - ${cidade}/${uf} (CEP: ${cep})` : undefined;

      // CASO 1: Usuário optou por ser Eleitor Geral (sem vínculo de campanha)
      if (tipoVinculo === "eleitor") {
        const pessoaCriada = await addPessoa({
          nome,
          cpf,
          telefone,
          tipo: "eleitor",
          meta_votos: Number(metaVotos) > 0 ? Number(metaVotos) : 1,
          papel_campanha: "Eleitor e Outros",
          funcao: "Eleitor / Apoiador Cidadão",
          cep: cep || undefined,
          endereco: enderecoCompleto,
          numero: numeroEnd || undefined,
          complemento: complemento || undefined,
          bairro: bairro || undefined,
          municipio: cidade || undefined,
          uf: uf || undefined,
          titulo_eleitor: tituloEleitor || undefined,
          zona: zona || undefined,
          secao: secao || undefined,
          status: "ativo",
        });

        setMensagemSucesso({
          titulo: "Cadastro de Eleitor Concluído!",
          desc: "Você agora possui acesso às consultas públicas da plataforma Democracias, como Boletins de Urna e informações eleitorais."
        });
        setEnviado(true);
        return;
      }

      // CASO 2: Usuário se tornou Administrador de Campanha Inexistente
      if (modoCriarAdmin) {
        if (!fotoValidacaoAdmin) {
          toast.error("Para se tornar o Administrador da Campanha, o envio da FOTO DE VALIDAÇÃO é obrigatório.");
          setCarregando(false);
          return;
        }

        if (!numeroNovaCampanha || !nomeUrnaNovaCampanha) {
          toast.error("Preencha o Número e o Nome de Urna do Candidato.");
          setCarregando(false);
          return;
        }

        // Validação de unicidade
        const existe = await verificarCampanhaExiste(buscaCampanhaUf, numeroNovaCampanha, cargoNovaCampanha);
        if (existe) {
          toast.error("Esta campanha já se encontra cadastrada no sistema.");
          setCarregando(false);
          return;
        }

        // Cadastra Campanha
        const novaCamp = await addCampanhaRegistro({
          uf: buscaCampanhaUf,
          cargo: cargoNovaCampanha,
          numero: numeroNovaCampanha,
          candidato_nome: nomeUrnaNovaCampanha,
          candidato_urna: nomeUrnaNovaCampanha,
          partido_coligacao: partidoNovaCampanha,
          admin_nome: nome,
          admin_cpf: cpf,
          admin_telefone: telefone,
          admin_foto_validacao_url: fotoValidacaoAdmin,
          status_validacao: "pendente_aprovacao_admin_geral",
        });

        // Cadastra Pessoa como Admin
        await addPessoa({
          nome,
          cpf,
          telefone,
          tipo: "responsavel",
          meta_votos: Number(metaVotos) > 0 ? Number(metaVotos) : 1,
          papel_campanha: papelCampanha,
          papel_personalizado: papelCampanha === "Eleitor e Outros" ? papelPersonalizado : undefined,
          campanha_id: novaCamp?.id,
          is_admin_campanha: true,
          foto_validacao_url: fotoValidacaoAdmin,
          endereco: enderecoCompleto,
          municipio: cidade,
          uf: buscaCampanhaUf,
          titulo_eleitor: tituloEleitor,
          zona,
          secao,
          status: "pendente_aprovacao",
        });

        setCampaign({
          id: novaCamp?.id || 'camp_nova',
          uf: buscaCampanhaUf,
          numero: numeroNovaCampanha,
          nomeUrna: nomeUrnaNovaCampanha,
          cargo: cargoNovaCampanha,
        });

        setMensagemSucesso({
          titulo: "Campanha e Administrador Registrados!",
          desc: "Seus dados e a foto de identificação foram enviados para a fila de validação do Administrador Geral do Democracias."
        });
        setEnviado(true);
        return;
      }

      // CASO 3: Usuário escolheu uma campanha existente -> entra na Fila de Aprovação
      if (!campanhaSelecionada) {
        toast.error("Selecione uma campanha na lista ou opte pelo cadastro como Eleitor.");
        setCarregando(false);
        return;
      }

      const isApoiador = papelCampanha === "Apoiador(a) / Eleitor(a) Simpatizante" || papelCampanha === "Eleitor e Outros";
      const tipoFinal: "responsavel" | "apoiador" = isApoiador ? "apoiador" : "responsavel";

      const pessoaMembro = await addPessoa({
        nome,
        cpf,
        telefone,
        tipo: tipoFinal,
        meta_votos: Number(metaVotos) > 0 ? Number(metaVotos) : 1,
        papel_campanha: papelCampanha,
        papel_personalizado: papelCampanha === "Eleitor e Outros" ? papelPersonalizado : undefined,
        campanha_id: campanhaSelecionada.id,
        funcao: papelCampanha === "Eleitor e Outros" && papelPersonalizado ? papelPersonalizado : papelCampanha,
        endereco: enderecoCompleto,
        municipio: cidade,
        uf: uf,
        titulo_eleitor: tituloEleitor,
        zona,
        secao,
        status: "pendente_aprovacao",
      });

      if (pessoaMembro) {
        await addSolicitacaoAdesao({
          campanha_id: campanhaSelecionada.id,
          pessoa_id: pessoaMembro.id,
          nome,
          cpf,
          telefone,
          papel_campanha: papelCampanha,
          papel_personalizado: papelPersonalizado,
        });
      }

      setMensagemSucesso({
        titulo: "Solicitação de Participação Enviada!",
        desc: `Você entrou na fila de aprovação da campanha de ${campanhaSelecionada.candidato_urna}. Assim que o Administrador da Campanha liberar, seu acesso será ativado.`
      });
      setEnviado(true);

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
      setMensagemSucesso({
        titulo: "Boletim de Urna Registrado!",
        desc: "Os dados da seção eleitoral foram consolidados no sistema de Apuração Paralela."
      });
      setEnviado(true);
      setBuData(null);
    } catch (e) {
      toast.error("Erro ao registrar BU.");
    } finally {
      setCarregando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100 space-y-6">
          <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900">{mensagemSucesso.titulo}</h1>
            <p className="text-slate-600 text-sm leading-relaxed">{mensagemSucesso.desc}</p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <Link to="/">
              <Button className="w-full h-12 text-md bg-primary hover:bg-primary/90">
                Voltar à Página Principal
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setEnviado(false)}>
              Fazer Outro Cadastro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* BANNER SUPERIOR */}
      <div className="bg-slate-900 text-white px-6 py-12">
        <header className="mx-auto max-w-2xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground px-3.5 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" /> Plataforma Democracias • democracias.org
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Portal de Cadastro e Participação
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto">
            Cadastre-se para apoiar, coordenar ou acompanhar com transparência a sua campanha eleitoral.
          </p>
        </header>
      </div>

      <div className="mx-auto -mt-6 max-w-2xl px-4">
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white h-14 p-1.5 shadow-lg border border-slate-200">
            <TabsTrigger value="cadastro_geral" className="rounded-xl text-xs font-bold uppercase tracking-wide">
              <UserPlus className="mr-2 h-4 w-4" /> Cadastre-se Geral
            </TabsTrigger>
            <TabsTrigger value="bu" className="rounded-xl text-xs font-bold uppercase tracking-wide">
              <QrCode className="mr-2 h-4 w-4" /> Scanner BU (Apuração)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CADASTRE-SE GERAL (MEMBRO / APOIADOR / ELEITOR) */}
          <TabsContent value="cadastro_geral" className="mt-6">
            <form onSubmit={handleSubmitCadastroGeral} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
              
              {/* 1. DADOS OBRIGATÓRIOS */}
              <div className="space-y-4">
                <div className="border-b pb-2 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    1. Dados Obrigatórios
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
                        className="h-12 text-md mt-1"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5 mt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                        <Vote className="size-4 text-primary" /> Votos Esperados / Compromisso
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
                      Quantos votos você estima mobilizar com seu grupo de amigos e familiares?
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
                        <Select value={uf} onValueChange={setUf}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BR.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                      <div className="text-xs font-semibold text-slate-700 mb-2">Dados do Título de Eleitor (Opcional)</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[11px] text-slate-500">Título de Eleitor</Label>
                          <Input 
                            placeholder="Nº do Título"
                            value={tituloEleitor}
                            onChange={e => setTituloEleitor(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-500">Zona Eleitoral</Label>
                          <Input 
                            placeholder="Ex: 001"
                            value={zona}
                            onChange={e => setZona(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-500">Seção Eleitoral</Label>
                          <Input 
                            placeholder="Ex: 0142"
                            value={secao}
                            onChange={e => setSecao(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. ASSOCIAÇÃO À CAMPANHA OU ACESSO COMO ELEITOR */}
              <div className="space-y-4 border-t pt-4">
                <div className="border-b pb-2 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    3. Vínculo e Papel na Campanha
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    type="button" 
                    variant={tipoVinculo === "campanha" ? "default" : "outline"}
                    className="h-14 font-bold text-xs uppercase"
                    onClick={() => { setTipoVinculo("campanha"); setModoCriarAdmin(false); }}
                  >
                    Vincular a uma Campanha
                  </Button>
                  <Button 
                    type="button" 
                    variant={tipoVinculo === "eleitor" ? "default" : "outline"}
                    className="h-14 font-bold text-xs uppercase"
                    onClick={() => { setTipoVinculo("eleitor"); setModoCriarAdmin(false); setCampanhaSelecionada(null); }}
                  >
                    Apenas Eleitor / Cidadão
                  </Button>
                </div>

                {/* FLUXO: ELEITOR / CIDADÃO */}
                {tipoVinculo === "eleitor" && (
                  <div className="bg-slate-50 p-4 rounded-xl border text-sm text-slate-600">
                    Você será registrado como <strong>Usuário / Eleitor</strong>, com acesso livre às ferramentas públicas, consulta de dados eleitorais e envio de Boletins de Urna (BU).
                  </div>
                )}

                {/* FLUXO: VINCULAR A UMA CAMPANHA */}
                {tipoVinculo === "campanha" && !modoCriarAdmin && (
                  <div className="space-y-4 pt-2">
                    
                    {/* PAPÉIS E DENOMINAÇÕES OFICIAIS */}
                    <div>
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Seu Papel / Função na Campanha <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={papelCampanha} onValueChange={(v: any) => setPapelCampanha(v)}>
                        <SelectTrigger className="h-12 mt-1">
                          <SelectValue placeholder="Selecione o papel exato..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS_CAMPANHA_OPCOES.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {papelCampanha === "Eleitor e Outros" && (
                      <div className="animate-in fade-in">
                        <Label className="text-xs font-bold uppercase text-slate-700">
                          Denominação Personalizada da Função
                        </Label>
                        <Input 
                          placeholder="Ex: Assessor de Imprensa, Motorista da Coordenação..."
                          value={papelPersonalizado}
                          onChange={e => setPapelPersonalizado(e.target.value)}
                          className="h-11 mt-1"
                        />
                      </div>
                    )}

                    {/* BUSCA DE CAMPANHA */}
                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-bold uppercase text-slate-700">
                        Localize a Campanha para Participar <span className="text-rose-500">*</span>
                      </Label>

                      <div className="flex gap-2">
                        <Select value={buscaCampanhaUf} onValueChange={setBuscaCampanhaUf}>
                          <SelectTrigger className="w-28 h-12">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BR.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <Input 
                          placeholder="Nome do candidato, número ou cargo..."
                          value={buscaTermo}
                          onChange={e => { setBuscaTermo(e.target.value); setCampanhaNaoEncontrada(false); }}
                          className="h-12"
                        />

                        <Button type="button" onClick={handleBuscarCampanha} className="h-12 px-4">
                          <Search className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* LISTAGEM DE CAMPANHAS ENCONTRADAS */}
                      {campanhasFiltradas.length > 0 && (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {campanhasFiltradas.map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => setCampanhaSelecionada(c)}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                campanhaSelecionada?.id === c.id 
                                  ? "border-primary bg-primary/5 shadow-sm" 
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{c.candidato_urna} ({c.numero})</div>
                                <div className="text-xs text-slate-500">{c.cargo} • {c.uf} • {c.partido_coligacao || 'Coligação'}</div>
                              </div>
                              {campanhaSelecionada?.id === c.id ? (
                                <Badge className="bg-primary text-white">Selecionada</Badge>
                              ) : (
                                <Button type="button" variant="outline" size="sm">Selecionar</Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* TRATAMENTO DE CAMPANHA INEXISTENTE */}
                      {(campanhasFiltradas.length === 0 || campanhaNaoEncontrada) && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
                          <div className="flex gap-3">
                            <HelpCircle className="h-7 w-7 text-amber-600 flex-shrink-0" />
                            <div>
                              <h3 className="font-bold text-amber-950 text-base">
                                A campanha não existe na plataforma.
                              </h3>
                              <p className="text-xs text-amber-900 mt-1">
                                Deseja cadastrá-la e ser o <strong>Administrador Responsável</strong> dela?
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button 
                              type="button" 
                              className="bg-amber-600 hover:bg-amber-700 text-white flex-1 font-bold"
                              onClick={() => {
                                setModoCriarAdmin(true);
                                setNomeUrnaNovaCampanha(buscaTermo);
                              }}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Sim, desejo ser o Administrador
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => { setBuscaTermo(""); setCampanhaNaoEncontrada(false); }}
                            >
                              Buscar Outra
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SE O USUÁRIO OPTOU POR SER O ADMINISTRADOR DA CAMPANHA INEXISTENTE */}
                {tipoVinculo === "campanha" && modoCriarAdmin && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                      <div className="flex items-center gap-2 text-blue-950 font-bold">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        Cadastro de Administrador da Nova Campanha
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-blue-700" 
                        onClick={() => setModoCriarAdmin(false)}
                      >
                        Cancelar
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-blue-900">Cargo</Label>
                        <Select value={cargoNovaCampanha} onValueChange={setCargoNovaCampanha}>
                          <SelectTrigger className="mt-1 bg-white">
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

                      <div>
                        <Label className="text-xs text-blue-900">Número do Candidato <span className="text-rose-500">*</span></Label>
                        <Input 
                          placeholder="Ex: 13, 22, 10123"
                          value={numeroNovaCampanha}
                          onChange={e => setNumeroNovaCampanha(e.target.value.replace(/\D/g, ''))}
                          className="mt-1 bg-white"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-xs text-blue-900">Nome de Urna do Candidato <span className="text-rose-500">*</span></Label>
                        <Input 
                          placeholder="Nome como aparecerá na urna"
                          value={nomeUrnaNovaCampanha}
                          onChange={e => setNomeUrnaNovaCampanha(e.target.value)}
                          className="mt-1 bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* CAPTURA DE FOTO OBRIGATÓRIA */}
                    <div className="border-t border-blue-200 pt-3 space-y-2">
                      <Label className="text-xs font-bold text-blue-950 flex items-center gap-1">
                        <Camera className="h-4 w-4 text-primary" />
                        Foto Obrigatória de Validação do Administrador <span className="text-rose-500">*</span>
                      </Label>
                      <p className="text-[11px] text-blue-800">
                        Para comprovar autenticidade, tire ou anexe uma foto para análise do Administrador Geral do Sistema.
                      </p>

                      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-xl bg-white text-center">
                        {usandoCamera ? (
                          <div className="space-y-3 w-full max-w-xs">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover rounded-lg bg-black" />
                            <Button type="button" size="sm" onClick={handleTirarFoto} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Camera className="mr-1 h-4 w-4" /> Capturar Foto
                            </Button>
                          </div>
                        ) : fotoValidacaoAdmin ? (
                          <div className="space-y-2">
                            <img src={fotoValidacaoAdmin} alt="Validação Admin" className="w-32 h-40 object-cover rounded-lg border-2 border-primary mx-auto" />
                            <Button type="button" variant="outline" size="sm" onClick={() => setFotoValidacaoAdmin("")}>
                              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Trocar Foto
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-center gap-2">
                              <Button type="button" size="sm" variant="secondary" onClick={handleIniciarCamera}>
                                <Camera className="mr-1 h-4 w-4" /> Câmera
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <UploadCloud className="mr-1 h-4 w-4" /> Anexar
                              </Button>
                              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUploadFoto} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÃO FINAL DE SUBMISSÃO */}
              <Button 
                type="submit" 
                disabled={carregando}
                className="w-full h-14 text-lg font-extrabold uppercase tracking-wide bg-primary hover:bg-primary/90 shadow-md"
              >
                {carregando ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-5 w-5" />
                )}
                {tipoVinculo === "eleitor" 
                  ? "Concluir Cadastro de Eleitor" 
                  : modoCriarAdmin 
                    ? "Submeter Campanha e Admin para Aprovação Geral" 
                    : "Solicitar Entrada na Campanha"}
              </Button>
            </form>
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
                    className="w-full h-12 text-md bg-emerald-600 hover:bg-emerald-700 text-white"
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
