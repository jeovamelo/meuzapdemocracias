import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  Package, 
  Send, 
  ArrowLeft, 
  Loader2, 
  Target, 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  Flag, 
  Shirt, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Search,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatNumero, type Material, type CategoriaMaterial } from "@/lib/db";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/public/solicitar")({
  head: () => ({
    meta: [
      { title: "Solicitar Materiais de Campanha — Democracias" },
      {
        name: "description",
        content: "Solicite materiais oficiais de campanha para mobilização eleitoral.",
      },
    ],
  }),
  component: PublicSolicitarPage,
});

const iconeCategoria = (c: string) => {
  if (c.includes("Adesivo")) return FileText;
  if (c.includes("Bandeira")) return Flag;
  if (c.includes("Santinho") || c.includes("Gráfico")) return FileText;
  if (c.includes("Vestuário") || c.includes("Bóton")) return Shirt;
  return Package;
};

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

function PublicSolicitarPage() {
  const search = useSearch({ strict: false }) as any;
  const { db, addPessoa, addSolicitacao } = useStore();

  const campParamId = search?.campanha || search?.campaign_id;
  const campParamUf = search?.uf;
  const campParamNr = search?.nr;

  // Localizar campanha indicada na URL ou na lista
  const campanhaAtiva = useMemo(() => {
    if (campParamId) {
      const encontrada = db.campanhas_registradas.find(c => c.id === campParamId);
      if (encontrada) return encontrada;
    }
    if (campParamUf && campParamNr) {
      const encontrada = db.campanhas_registradas.find(c => c.uf === campParamUf && c.numero === campParamNr);
      if (encontrada) return encontrada;
    }
    return db.campanhas_registradas[0] || null;
  }, [db.campanhas_registradas, campParamId, campParamUf, campParamNr]);

  const [passo, setPasso] = useState<"dados" | "materiais" | "sucesso">("dados");
  const [salvando, setSalvando] = useState(false);
  const [pedidoId, setPedidoId] = useState("");

  // 1. DADOS DO SOLICITANTE
  // Prioridade: CPF como 1º campo com auto-lookup
  const [cpf, setCpf] = useState("");
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [cpfEncontrado, setCpfEncontrado] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [expectativaVotos, setExpectativaVotos] = useState("1");
  const [buscaMaterial, setBuscaMaterial] = useState("");
  const [ordenacao, setOrdenacao] = useState<'nome-asc' | 'nome-desc'>('nome-asc');

  // 2. ENDEREÇO BASEADO NO CEP (FORMATO PADRÃO)
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [logradouro, setLogradouro] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [uf, setUf] = useState(campanhaAtiva?.uf || db.config.uf || "CE");
  const [cidade, setCidade] = useState("Fortaleza");
  const [tipoLogistica, setTipoLogistica] = useState<"retirada" | "entrega">("entrega");

  // MATERIAIS SELECIONADOS
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  // Materiais disponíveis da campanha
  const materiaisCampanha = useMemo(() => {
    const list = db.materiais.filter(
      (m) => !m.arquivado && (!campanhaAtiva?.id || !m.campaign_id || m.campaign_id === campanhaAtiva.id)
    );
    const filtered = list.filter((m) =>
      m.nome.toLowerCase().includes(buscaMaterial.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (ordenacao === 'nome-asc') {
        return a.nome.localeCompare(b.nome, 'pt-BR');
      } else {
        return b.nome.localeCompare(a.nome, 'pt-BR');
      }
    });
  }, [db.materiais, campanhaAtiva, buscaMaterial, ordenacao]);

  const itensSelecionados = useMemo(() => {
    return Object.entries(quantidades)
      .filter(([, qtd]) => qtd > 0)
      .map(([material_id, quantidade]) => ({ material_id, quantidade }));
  }, [quantidades]);

  const totalItens = itensSelecionados.reduce((acc, i) => acc + i.quantidade, 0);

  // CONSULTA AUTOMÁTICA DE CPF
  const handleCpfChange = async (valor: string) => {
    const formatted = formatCpf(valor);
    setCpf(formatted);
    const clean = formatted.replace(/\D/g, "");

    if (clean.length === 11) {
      setBuscandoCpf(true);
      try {
        // 1. Buscar localmente na store de pessoas
        const pessoaLocal = db.pessoas.find(
          (p) => (p.cpf && p.cpf.replace(/\D/g, "") === clean)
        );

        if (pessoaLocal) {
          if (pessoaLocal.nome) setNome(pessoaLocal.nome);
          if (pessoaLocal.telefone) setTelefone(pessoaLocal.telefone);
          if (pessoaLocal.meta_votos) setExpectativaVotos(String(pessoaLocal.meta_votos));
          if (pessoaLocal.cep) setCep(formatCep(pessoaLocal.cep));
          if (pessoaLocal.endereco) setLogradouro(pessoaLocal.endereco);
          if (pessoaLocal.numero) setNumeroEnd(pessoaLocal.numero);
          if (pessoaLocal.complemento) setComplemento(pessoaLocal.complemento);
          if (pessoaLocal.bairro) setBairro(pessoaLocal.bairro);
          if (pessoaLocal.municipio) setCidade(pessoaLocal.municipio);
          if (pessoaLocal.uf) setUf(pessoaLocal.uf);

          setCpfEncontrado(true);
          toast.success("Cadastro localizado! Seus dados foram preenchidos automaticamente.");
          return;
        }

        // 2. Buscar no Supabase
        const { data: pessoasDb, error } = await supabase
          .from("pessoas")
          .select("*")
          .or(`cpf.eq.${clean},cpf.eq.${formatted}`)
          .limit(1);

        if (!error && pessoasDb && pessoasDb.length > 0) {
          const p = pessoasDb[0];
          if (p) {
             if (p.nome) setNome(p.nome);
             if (p.telefone) setTelefone(p.telefone);
             if (p.meta_votos) setExpectativaVotos(String(p.meta_votos));
             if (p.cep) setCep(formatCep(p.cep));
             if (p.endereco) setLogradouro(p.endereco);
             if (p.numero) setNumeroEnd(p.numero);
             if (p.complemento) setComplemento(p.complemento);
             if (p.bairro) setBairro(p.bairro);
             if (p.municipio) setCidade(p.municipio);
             if (p.uf) setUf(p.uf);
           }

          setCpfEncontrado(true);
          toast.success("Cadastro localizado no sistema! Dados preenchidos automaticamente.");
        } else {
          setCpfEncontrado(false);
        }
      } catch (err) {
        console.warn("Erro ao consultar CPF:", err);
      } finally {
        setBuscandoCpf(false);
      }
    } else {
      setCpfEncontrado(false);
    }
  };

  // CONSULTA AUTOMÁTICA DE CEP (PADRÃO VIACEP)
  const handleCepChange = async (valor: string) => {
    const formatted = formatCep(valor);
    setCep(formatted);
    const clean = formatted.replace(/\D/g, "");

    if (clean.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          if (data.localidade) setCidade(data.localidade);
          if (data.uf) setUf(data.uf);
          toast.success("Endereço localizado pelo CEP!");
        } else {
          toast.info("CEP não encontrado. Preencha o endereço manualmente.");
        }
      } catch (e) {
        toast.error("Não foi possível consultar o CEP automaticamente.");
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleAvancarParaMateriais = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.trim() && cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Se informado, o CPF deve possuir 11 dígitos.");
      return;
    }
    if (!nome.trim()) {
      toast.error("Informe seu Nome Completo.");
      return;
    }
    if (telefone.trim() && telefone.replace(/\D/g, "").length < 10) {
      toast.error("Se informado, o WhatsApp/Telefone deve possuir DDD + número.");
      return;
    }
    const finalVotos = Number(expectativaVotos) > 0 ? Number(expectativaVotos) : 1;
    setExpectativaVotos(String(finalVotos));

    setPasso("materiais");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmeterSolicitacao = async () => {
    if (itensSelecionados.length === 0) {
      toast.error("Selecione a quantidade de ao menos um material.");
      return;
    }

    setSalvando(true);
    try {
      const enderecoCompleto = logradouro 
        ? `${logradouro}${numeroEnd ? `, Nº ${numeroEnd}` : ''}${complemento ? ` - ${complemento}` : ''}${bairro ? ` (${bairro})` : ''} - ${cidade}/${uf}${cep ? ` - CEP: ${cep}` : ''}`
        : `${cidade}/${uf}`;

      // 1. Cadastra/atualiza a pessoa como apoiadora com expectativa de votos
      const pessoaCriada = await addPessoa({
        nome: nome.trim(),
        cpf: cpf.trim() ? cpf.replace(/\D/g, "") : "",
        tipo: "apoiador",
        funcao: "Apoiador(a) / Mobilizador(a)",
        meta_votos: Number(expectativaVotos) > 0 ? Number(expectativaVotos) : 1,
        uf: uf,
        municipio: cidade,
        status: "ativo",
        ...(telefone.trim() ? { telefone: telefone.trim() } : { telefone: "" }),
        ...(campanhaAtiva?.id ? { campanha_id: campanhaAtiva.id } : {}),
        ...(cep.trim() ? { cep: cep.replace(/\D/g, "") } : {}),
        ...(enderecoCompleto ? { endereco: enderecoCompleto } : {}),
        ...(numeroEnd.trim() ? { numero: numeroEnd.trim() } : {}),
        ...(complemento.trim() ? { complemento: complemento.trim() } : {}),
        ...(bairro.trim() ? { bairro: bairro.trim() } : {}),
      } as any);

      // 2. Cria a solicitação no banco
      const solicitacaoCriada = await addSolicitacao({
        nome: nome.trim(),
        comite_id: db.comites[0]?.id || "",
        lideranca_id: pessoaCriada?.id,
        campaign_id: campanhaAtiva?.id,
        municipio: cidade,
        tipo_logistica: tipoLogistica,
        endereco_entrega: enderecoCompleto,
        itens: itensSelecionados,
      } as any);

      if (solicitacaoCriada) {
        setPedidoId(solicitacaoCriada.id);
      }

      setPasso("sucesso");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-orange-600 text-white font-black text-xs shadow-xs">
              DEM
            </span>
            <div>
              <p className="text-[11px] font-bold leading-tight uppercase tracking-wider text-slate-500">
                Portal de Solicitação de Materiais
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {campanhaAtiva ? `${campanhaAtiva.candidato_urna} ${campanhaAtiva.numero}` : "Campanha Democracias"}
              </h1>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs font-bold border-slate-300">
            {campanhaAtiva?.uf || uf || "BR"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6">
        {/* TELA 1: DADOS PESSOAIS (COM PRIORIDADE AO CPF E CEP PADRÃO) */}
        {passo === "dados" && (
          <form onSubmit={handleAvancarParaMateriais} className="space-y-5 animate-in fade-in duration-200">
            
            {/* BANNER INFORMATIVO */}
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 space-y-1">
              <p className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                <Sparkles className="size-4 text-orange-600" /> Mobilize sua Região
              </p>
              <p className="text-xs text-orange-950">
                Preencha seus dados para receber o material oficial de campanha de{" "}
                <strong>{campanhaAtiva?.candidato_urna || "nosso candidato"}</strong>.
              </p>
            </div>

            {/* SEÇÃO 1: DADOS DE CONTATO (CPF EM PRIMEIRO LUGAR) */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <User className="size-4 text-orange-600" /> 1. Seus Dados de Contato
                </h2>
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  * Obrigatórios
                </span>
              </div>

              {/* 1. CPF (PRIMEIRO ITEM COM AUTO-LOOKUP) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">
                    CPF
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    {buscandoCpf ? "Consultando base de dados..." : "Digite para preenchimento automático"}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className="h-12 bg-white text-md font-mono font-bold pr-10"
                  />
                  {buscandoCpf && (
                    <Loader2 className="absolute right-3.5 top-3.5 h-5 w-5 animate-spin text-orange-600" />
                  )}
                  {cpfEncontrado && !buscandoCpf && (
                    <CheckCircle2 className="absolute right-3.5 top-3.5 h-5 w-5 text-emerald-600" />
                  )}
                </div>

                {cpfEncontrado && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Cadastro localizado!</strong> Seus dados foram preenchidos automaticamente.</span>
                  </div>
                )}
              </div>

              {/* 2. NOME COMPLETO */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Nome Completo <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome e sobrenome"
                  className="h-12 bg-white text-md"
                />
              </div>

              {/* 3. WHATSAPP / TELEFONE */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  WhatsApp / Telefone
                </Label>
                <Input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(85) 99999-9999"
                  className="h-12 bg-white text-md font-mono"
                />
              </div>

              {/* 4. VOTOS ESPERADOS (COMPROMISSO / META) */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Target className="size-4 text-orange-600" />
                    Votos Esperados (Compromisso / Meta)
                  </Label>
                  <span className="text-[11px] text-slate-500 font-medium">Padrão: 1 (próprio voto)</span>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={expectativaVotos}
                  onChange={(e) => setExpectativaVotos(e.target.value)}
                  placeholder="1"
                  className="h-11 bg-white font-mono font-bold text-base"
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Quantos votos você e sua equipe de amigos se preparam para mobilizar com estes materiais?
                </p>
              </div>
            </div>

            {/* SEÇÃO 2: ENDEREÇO DE ENTREGA (BASEADO NO CEP EM FORMATO PADRÃO) */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Building className="size-4 text-orange-600" /> 2. Endereço de Entrega
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  Busca automática por CEP
                </span>
              </div>

              {/* CAMPO CEP (PRIMEIRO CAMPO DE ENDEREÇO) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">
                    CEP
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    {cepLoading ? "Buscando endereço..." : "Digite o CEP para autocompletar"}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="h-12 bg-white text-md font-mono pr-10"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3.5 top-3.5 h-5 w-5 animate-spin text-orange-600" />
                  )}
                </div>
              </div>

              {/* LOGRADOURO / RUA */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Logradouro / Rua
                </Label>
                <Input
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Avenida, Rua, Travessa..."
                  className="h-12 bg-white"
                />
              </div>

              {/* NÚMERO E COMPLEMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Número
                  </Label>
                  <Input
                    value={numeroEnd}
                    onChange={(e) => setNumeroEnd(e.target.value)}
                    placeholder="Nº ou S/N"
                    className="h-12 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Complemento
                  </Label>
                  <Input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco, Sala..."
                    className="h-12 bg-white"
                  />
                </div>
              </div>

              {/* BAIRRO */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Bairro
                </Label>
                <Input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="h-12 bg-white"
                />
              </div>

              {/* LOCALIDADE / CIDADE E UF */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-slate-800">
                  Localidade / Cidade e Estado (UF)
                </Label>
                <EstadoCidadeSelect
                  uf={uf}
                  cidade={cidade}
                  onUfChange={setUf}
                  onCidadeChange={setCidade}
                  showLabels={false}
                />
              </div>
            </div>

            {/* BOTÃO PARA AVANÇAR AOS MATERIAIS */}
            <Button 
              type="submit" 
              style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:bg-orange-700 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Próximo: Escolher Materiais</span>
              <ArrowRight className="size-5" />
            </Button>
          </form>
        )}

        {/* TELA 2: ESCOLHA DE MATERIAIS */}
        {passo === "materiais" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setPasso("dados")}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="size-4" /> Voltar aos Dados
              </button>
              <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                {formatNumero(totalItens)} ITENS SELECIONADOS
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Package className="size-4 text-orange-600" /> 2. Selecione os Materiais Desejados
              </h2>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={buscaMaterial}
                    onChange={(e) => setBuscaMaterial(e.target.value)}
                    placeholder="Buscar material por nome..."
                    className="h-12 rounded-xl bg-white pl-9 shadow-xs"
                  />
                </div>
                <Select value={ordenacao} onValueChange={(v: any) => setOrdenacao(v)}>
                  <SelectTrigger className="h-12 w-[110px] rounded-xl bg-white border-border font-medium text-xs shadow-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome-asc">A-Z</SelectItem>
                    <SelectItem value="nome-desc">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {materiaisCampanha.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                  <Package className="mx-auto mb-2 size-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Catálogo de materiais em atualização.</p>
                </div>
              ) : (
                materiaisCampanha.map((m) => {
                  const Icon = iconeCategoria(m.categoria);
                  const qtd = quantidades[m.id] || 0;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                        qtd > 0 ? "border-orange-500 bg-orange-50/50 shadow-xs" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-900 leading-tight">{m.nome}</p>
                        <p className="text-xs text-slate-500">{m.categoria}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuantidades({ ...quantidades, [m.id]: Math.max(0, qtd - 20) })}
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-xs hover:bg-slate-50 active:scale-95 cursor-pointer"
                        >
                          -20
                        </button>
                        <Input
                          type="number"
                          min="0"
                          value={qtd === 0 ? "" : qtd}
                          placeholder="0"
                          onChange={(e) =>
                            setQuantidades({ ...quantidades, [m.id]: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="h-9 w-14 text-center font-mono font-bold text-xs p-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantidades({ ...quantidades, [m.id]: qtd + 20 })}
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-xs hover:bg-slate-50 active:scale-95 cursor-pointer"
                        >
                          +20
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Button
              disabled={salvando || totalItens === 0}
              onClick={handleSubmeterSolicitacao}
              className="w-full h-14 rounded-2xl text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg cursor-pointer"
            >
              {salvando && <Loader2 className="size-5 animate-spin" />}
              Enviar Solicitação de Material ({formatNumero(totalItens)} un)
            </Button>
          </div>
        )}

         {/* TELA 3: SUCESSO */}
         {passo === "sucesso" && (
           <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-5 animate-in fade-in duration-300 shadow-xl">
             <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
               <CheckCircle2 className="size-10" />
             </div>
             <div className="space-y-1">
               <h2 className="text-2xl font-extrabold text-slate-900">Solicitação Enviada com Sucesso!</h2>
               {pedidoId && (
                 <p className="text-sm font-mono font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full inline-block">
                   Pedido: #{pedidoId.substring(0, 8).toUpperCase()}
                 </p>
               )}
               <p className="text-sm text-slate-600 max-w-md mx-auto pt-2">
                 Obrigado, <strong>{nome}</strong>! Sua solicitação de {formatNumero(totalItens)} itens e compromisso de {formatNumero(Number(expectativaVotos))} votos foi registrada para a equipe de logística de{" "}
                 <strong>{campanhaAtiva?.candidato_urna || "nossa campanha"}</strong>.
               </p>
             </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left space-y-2 text-xs text-slate-700">
              {pedidoId && (
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Número do Pedido:</span>
                  <span className="font-mono font-bold text-slate-900">#{pedidoId.substring(0, 8).toUpperCase()}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Solicitante:</span>
                <span className="font-bold text-slate-900">{nome} {cpf ? `(CPF: ${cpf})` : ''}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">WhatsApp:</span>
                <span className="font-bold text-slate-900">{telefone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Local de Entrega:</span>
                <span className="font-bold text-slate-900">{cidade}/{uf} {logradouro ? `(${logradouro})` : ''}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500">Meta de Mobilização:</span>
                <span className="font-bold text-orange-600">{formatNumero(Number(expectativaVotos))} votos</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={() => {
                  setPasso("dados");
                  setQuantidades({});
                  setNome("");
                  setCpf("");
                  setTelefone("");
                  setPedidoId("");
                  setCpfEncontrado(false);
                }}
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-bold"
              >
                Fazer Nova Solicitação
              </Button>
              <Link to="/">
                <Button className="w-full h-12 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white">
                  Voltar à Página Principal
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
