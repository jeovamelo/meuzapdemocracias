import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  CheckCircle2, 
  UserPlus, 
  ArrowLeft, 
  Send, 
  Package, 
  MapPin, 
  Loader2, 
  Camera,
  Search
} from "lucide-react";
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

export const Route = createFileRoute("/public/cadastro")({
  head: () => ({
    meta: [
      { title: "Portal Público — Campanha 2026" },
      {
        name: "description",
        content: "Cadastro de apoiadores, comitês populares e solicitação de materiais.",
      },
    ],
  }),
  component: PublicCadastro,
});

function PublicCadastro() {
  const { addPessoa, addComite, addSolicitacao, db } = useStore();
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("apoiador");

  // Apoiador State
  const [apoiadorForm, setApoiadorForm] = useState({
    nome: "",
    telefone: "",
    bairro: "",
    zona: "",
  });
  
  const municipios = Array.from(new Set(db.comites.map(c => c.municipio))).sort();

  // Solicitação State
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    nome: "",
    comite_id: "",
    lideranca_id: "",
    municipio: "",
    tipo_material: "",
    quantidade: "1",
  });

  // Comitê State
  const [comiteForm, setComiteForm] = useState({
    responsavel: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    municipio: "Fortaleza",
    ponto_referencia: "",
  });

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setComiteForm(prev => ({ ...prev, cep }));
    
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setComiteForm(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            municipio: data.localidade || prev.municipio,
          }));
          toast.success("Endereço localizado!");
        }
      } catch (e) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleApoiadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await addPessoa({
        nome: apoiadorForm.nome,
        telefone: apoiadorForm.telefone,
        zona: apoiadorForm.zona,
        municipio: apoiadorForm.bairro || "Fortaleza",
        tipo: "apoiador",
        funcao: "Apoiador Voluntário",
        comite_id: db.comites[0]?.id || "c1",
        status: "ativo",
      });
      setEnviado(true);
    } catch (error) {
      toast.error("Erro ao processar.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSolicitacaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitacaoForm.comite_id || !solicitacaoForm.tipo_material) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setCarregando(true);
    try {
      await addSolicitacao({
        nome: solicitacaoForm.nome,
        comite_id: solicitacaoForm.comite_id,
        tipo_material: solicitacaoForm.tipo_material,
        quantidade: Number(solicitacaoForm.quantidade),
      });
      setEnviado(true);
    } catch (error) {
      toast.error("Erro ao processar.");
    } finally {
      setCarregando(false);
    }
  };

  const handleComiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await addComite({
        nome: `Comitê Popular - ${comiteForm.responsavel}`,
        coordenador: comiteForm.responsavel,
        cep: comiteForm.cep,
        endereco: comiteForm.endereco,
        numero: comiteForm.numero,
        bairro: comiteForm.bairro,
        municipio: comiteForm.municipio,
        ponto_referencia: comiteForm.ponto_referencia,
        observacoes: "Cadastro via portal público.",
        status: "pendente_validacao",
      });
      setEnviado(true);
    } catch (error) {
      toast.error("Erro ao processar.");
    } finally {
      setCarregando(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-10 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Sucesso!</h1>
        <p className="mt-4 text-muted-foreground">
          Sua ação foi registrada. Se necessário, entraremos em contato.
        </p>
        <Button className="mt-10 h-14 w-full text-lg font-bold" onClick={() => setEnviado(false)}>
          Fazer novo registro
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary px-6 py-12 text-primary-foreground">
        <header className="mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight">Portal da Campanha</h1>
          <p className="mt-2 text-primary-foreground/80 font-medium">
            Fortaleça nosso time no Ceará
          </p>
        </header>
      </div>

      <div className="mx-auto -mt-8 max-w-lg px-4">
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-surface h-16 p-2 shadow-xl border border-border">
            <TabsTrigger value="apoiador" className="rounded-xl text-[10px] font-black uppercase">Apoiador</TabsTrigger>
            <TabsTrigger value="material" className="rounded-xl text-[10px] font-black uppercase">Material</TabsTrigger>
            <TabsTrigger value="comite" className="rounded-xl text-[10px] font-black uppercase">Comitê</TabsTrigger>
          </TabsList>

          <div className="mt-6 rounded-3xl border border-border bg-background p-6 shadow-sm">
            <TabsContent value="apoiador" className="mt-0 space-y-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <UserPlus className="size-5" />
                </div>
                <h2 className="font-extrabold">Cadastro de Apoiador</h2>
              </div>
              
              <form onSubmit={handleApoiadorSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome Completo</Label>
                  <Input 
                    value={apoiadorForm.nome}
                    onChange={e => setApoiadorForm({...apoiadorForm, nome: e.target.value})}
                    placeholder="Seu nome"
                    className="h-12 border-2"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp</Label>
                  <Input 
                    value={apoiadorForm.telefone}
                    onChange={e => setApoiadorForm({...apoiadorForm, telefone: e.target.value})}
                    placeholder="85 9..."
                    type="tel"
                    className="h-12 border-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Bairro</Label>
                    <Input 
                      value={apoiadorForm.bairro}
                      onChange={e => setApoiadorForm({...apoiadorForm, bairro: e.target.value})}
                      placeholder="Ex: Aldeota"
                      className="h-12 border-2"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Zona (Opcional)</Label>
                    <Input 
                      value={apoiadorForm.zona}
                      onChange={e => setApoiadorForm({...apoiadorForm, zona: e.target.value})}
                      placeholder="Ex: 001"
                      className="h-12 border-2"
                    />
                  </div>
                </div>
                <Button type="submit" className="h-14 w-full text-lg font-black uppercase" disabled={carregando}>
                  {carregando ? "Enviando..." : "Confirmar Cadastro"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="material" className="mt-0 space-y-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <Package className="size-5" />
                </div>
                <h2 className="font-extrabold">Solicitar Material</h2>
              </div>

              <form onSubmit={handleSolicitacaoSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Seu Nome</Label>
                  <Input 
                    value={solicitacaoForm.nome}
                    onChange={e => setSolicitacaoForm({...solicitacaoForm, nome: e.target.value})}
                    placeholder="Nome completo"
                    className="h-12 border-2"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Local de Retirada</Label>
                  <Select 
                    value={solicitacaoForm.comite_id} 
                    onValueChange={v => setSolicitacaoForm({...solicitacaoForm, comite_id: v})}
                  >
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue placeholder="Selecione o comitê" />
                    </SelectTrigger>
                    <SelectContent>
                      {db.comites.filter(c => c.status === "ativo").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</Label>
                    <Select 
                      value={solicitacaoForm.tipo_material} 
                      onValueChange={v => setSolicitacaoForm({...solicitacaoForm, tipo_material: v})}
                    >
                      <SelectTrigger className="h-12 border-2">
                        <SelectValue placeholder="O que deseja?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adesivo">Adesivo</SelectItem>
                        <SelectItem value="Bandeira">Bandeira</SelectItem>
                        <SelectItem value="Folder">Folder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Qtd</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={solicitacaoForm.quantidade}
                      onChange={e => setSolicitacaoForm({...solicitacaoForm, quantidade: e.target.value})}
                      className="h-12 border-2"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="h-14 w-full text-lg font-black uppercase" disabled={carregando}>
                  {carregando ? "Enviando..." : "Solicitar Agora"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="comite" className="mt-0 space-y-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 text-green-600">
                  <MapPin className="size-5" />
                </div>
                <h2 className="font-extrabold">Comitê Popular</h2>
              </div>

              <form onSubmit={handleComiteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Responsável</Label>
                  <Input 
                    value={comiteForm.responsavel}
                    onChange={e => setComiteForm({...comiteForm, responsavel: e.target.value})}
                    placeholder="Nome completo"
                    className="h-12 border-2"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">CEP</Label>
                  <div className="relative">
                    <Input 
                      value={comiteForm.cep}
                      onChange={e => handleCepLookup(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="h-12 border-2"
                      required
                    />
                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Endereço</Label>
                    <Input 
                      value={comiteForm.endereco}
                      onChange={e => setComiteForm({...comiteForm, endereco: e.target.value})}
                      className="h-12 border-2"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nº</Label>
                    <Input 
                      value={comiteForm.numero}
                      onChange={e => setComiteForm({...comiteForm, numero: e.target.value})}
                      className="h-12 border-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ponto de Referência</Label>
                  <Input 
                    value={comiteForm.ponto_referencia}
                    onChange={e => setComiteForm({...comiteForm, ponto_referencia: e.target.value})}
                    placeholder="Ex: Perto do mercadinho..."
                    className="h-12 border-2"
                  />
                </div>

                <div className="rounded-xl border-2 border-dashed border-border p-4 text-center">
                  <Camera className="mx-auto size-6 text-muted-foreground" />
                  <span className="mt-1 block text-[10px] font-bold uppercase text-muted-foreground">Foto do Local (Opcional)</span>
                </div>

                <Button type="submit" className="h-14 w-full text-lg font-black uppercase" disabled={carregando}>
                  {carregando ? "Enviando..." : "Solicitar Abertura"}
                </Button>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="mt-10 px-6 text-center">
        <Link to="/" className="text-sm font-mono text-muted-foreground underline">
          VOLTAR AO ACESSO RESTRITO
        </Link>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
