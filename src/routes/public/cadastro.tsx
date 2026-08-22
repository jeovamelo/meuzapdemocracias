import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
    cep: "",
    uf: "",
    cidade: "",
    endereco: "",
    numero: "",
    complemento: "",
    meta_votos: "0",
  });
  
  const municipios = Array.from(new Set(db.comites.map(c => c.municipio))).sort();

  // Solicitação State
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    whatsapp: "",
    nome: "",
    endereco: "",
    comite_id: "",
    lideranca_id: "",
    municipio: "",
    itens: [] as { material_id: string; quantidade: number }[],
    tipo_logistica: "retirada" as "retirada" | "entrega",
    endereco_entrega: "",
  });
  
  const [passoMaterial, setPassoMaterial] = useState(1); // 1: WhatsApp, 2: Pedido, 3: Logística, 4: Resumo
  const [passoComite, setPassoComite] = useState(1); // 1: WhatsApp/Responsável, 2: Endereço

  // Comitê State
  const [comiteForm, setComiteForm] = useState({
    responsavel: "",
    whatsapp: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    municipio: "Fortaleza",
    uf: db.config.uf || "CE",
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
            uf: data.uf || prev.uf,
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
      const enderecoCompleto = `${apoiadorForm.endereco}, ${apoiadorForm.numero} ${apoiadorForm.complemento ? `- ${apoiadorForm.complemento}` : ""} - ${apoiadorForm.cidade}/${apoiadorForm.uf} (CEP: ${apoiadorForm.cep})`;
      
      await addPessoa({
        nome: apoiadorForm.nome,
        telefone: apoiadorForm.telefone,
        endereco: enderecoCompleto,
        meta_votos: Number(apoiadorForm.meta_votos),
        municipio: apoiadorForm.cidade || "Ceará",
        uf: apoiadorForm.uf || db.config.uf || "CE",
        tipo: "apoiador",
        funcao: "Apoiador Voluntário",
        comite_id: db.comites.find(c => c.municipio === apoiadorForm.cidade)?.id || db.comites[0]?.id || "c1",
        status: "ativo",
        zona: "",
      });
      setEnviado(true);
    } catch (error) {
      toast.error("Erro ao processar.");
    } finally {
      setCarregando(false);
    }
  };

  const handleApoiadorCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setApoiadorForm(prev => ({ ...prev, cep }));
    
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setApoiadorForm(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
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

  const handleSolicitacaoSubmit = async () => {
    if (solicitacaoForm.itens.length === 0) {
      toast.error("Selecione ao menos um item.");
      return;
    }
    setCarregando(true);
    try {
      await addSolicitacao({
        nome: solicitacaoForm.nome,
        comite_id: solicitacaoForm.comite_id || db.comites.find(c => c.municipio === solicitacaoForm.municipio)?.id || db.comites[0]?.id || "c1",
        lideranca_id: solicitacaoForm.lideranca_id,
        municipio: solicitacaoForm.municipio,
        itens: solicitacaoForm.itens,
        tipo_logistica: solicitacaoForm.tipo_logistica,
        endereco_entrega: solicitacaoForm.endereco_entrega,
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
        whatsapp_coordenador: comiteForm.whatsapp,
        cep: comiteForm.cep,
        endereco: comiteForm.endereco,
        numero: comiteForm.numero,
        bairro: comiteForm.bairro,
        municipio: comiteForm.municipio,
        uf: comiteForm.uf || db.config.uf || "CE",
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
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">CEP</Label>
                    <div className="relative">
                      <Input 
                        value={apoiadorForm.cep}
                        onChange={e => handleApoiadorCepLookup(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="h-12 border-2"
                        required
                      />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">UF</Label>
                      <Input 
                        value={apoiadorForm.uf}
                        onChange={e => setApoiadorForm({...apoiadorForm, uf: e.target.value.toUpperCase()})}
                        placeholder="CE"
                        maxLength={2}
                        className="h-12 border-2"
                        required
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cidade</Label>
                      <Input 
                        value={apoiadorForm.cidade}
                        onChange={e => setApoiadorForm({...apoiadorForm, cidade: e.target.value})}
                        placeholder="Sua cidade"
                        className="h-12 border-2"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Endereço (Logradouro)</Label>
                    <Input 
                      value={apoiadorForm.endereco}
                      onChange={e => setApoiadorForm({...apoiadorForm, endereco: e.target.value})}
                      placeholder="Rua, Av..."
                      className="h-12 border-2"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Número</Label>
                      <Input 
                        value={apoiadorForm.numero}
                        onChange={e => setApoiadorForm({...apoiadorForm, numero: e.target.value})}
                        placeholder="123"
                        className="h-12 border-2"
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Complemento</Label>
                      <Input 
                        value={apoiadorForm.complemento}
                        onChange={e => setApoiadorForm({...apoiadorForm, complemento: e.target.value})}
                        placeholder="Apto, Sala, Casa..."
                        className="h-12 border-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Quantidade de Votos (Expectativa)</Label>
                  <Input 
                    type="number"
                    value={apoiadorForm.meta_votos}
                    onChange={e => setApoiadorForm({...apoiadorForm, meta_votos: e.target.value})}
                    placeholder="0"
                    className="h-12 border-2"
                    required
                  />
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

              <div className="space-y-4">
                {passoMaterial === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Número do WhatsApp</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={solicitacaoForm.whatsapp}
                          onChange={e => setSolicitacaoForm({...solicitacaoForm, whatsapp: e.target.value})}
                          placeholder="85 9..."
                          className="h-12 border-2"
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="h-12 px-4"
                          onClick={() => {
                            const pessoa = db.pessoas.find(p => p.telefone.replace(/\D/g, '') === solicitacaoForm.whatsapp.replace(/\D/g, ''));
                            if (pessoa) {
                              setSolicitacaoForm({
                                ...solicitacaoForm,
                                nome: pessoa.nome,
                                endereco: pessoa.endereco || "",
                                municipio: pessoa.municipio
                              });
                              toast.success(`Olá ${pessoa.nome}!`);
                              setPassoMaterial(2);
                            } else {
                              toast.error("WhatsApp não cadastrado como apoiador.");
                              setAbaAtiva("apoiador");
                              setApoiadorForm(prev => ({ ...prev, telefone: solicitacaoForm.whatsapp }));
                            }
                          }}
                        >
                          <Search className="size-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">Insira seu WhatsApp para começar o pedido.</p>
                    </div>
                  </div>
                )}

                {passoMaterial === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-xl bg-muted/30 p-4 text-sm border border-border">
                      <p className="font-bold">{solicitacaoForm.nome}</p>
                      <p className="text-xs text-muted-foreground">{solicitacaoForm.endereco}</p>
                      <button 
                        onClick={() => setPassoMaterial(1)}
                        className="mt-2 text-[10px] font-black uppercase text-primary underline"
                      >
                        Não sou eu / Corrigir
                      </button>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Escolha os Materiais</Label>
                      <div className="grid gap-3">
                        {db.materiais.filter(m => !m.arquivado).map(m => {
                          const item = solicitacaoForm.itens.find(i => i.material_id === m.id);
                          return (
                            <div key={m.id} className="flex items-center justify-between rounded-xl border border-border p-3 bg-surface">
                              <div className="flex-1">
                                <p className="text-xs font-bold leading-tight">{m.nome}</p>
                                <p className="text-[9px] uppercase text-muted-foreground">{m.categoria}</p>
                              </div>
                              <div className="w-20">
                                <Input 
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="h-9 border-2 text-center"
                                  value={item?.quantidade || ""}
                                  onChange={e => {
                                    const qty = parseInt(e.target.value) || 0;
                                    const novosItens = solicitacaoForm.itens.filter(i => i.material_id !== m.id);
                                    if (qty > 0) {
                                      novosItens.push({ material_id: m.id, quantidade: qty });
                                    }
                                    setSolicitacaoForm({ ...solicitacaoForm, itens: novosItens });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button 
                      className="h-14 w-full text-lg font-black uppercase" 
                      onClick={() => {
                        if (solicitacaoForm.itens.length === 0) {
                          toast.error("Selecione ao menos um item.");
                          return;
                        }
                        setPassoMaterial(3);
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                )}

                {passoMaterial === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Forma de Recebimento</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          type="button"
                          variant={solicitacaoForm.tipo_logistica === "retirada" ? "default" : "outline"}
                          className="h-20 flex-col gap-2 rounded-2xl"
                          onClick={() => setSolicitacaoForm({ ...solicitacaoForm, tipo_logistica: "retirada" })}
                        >
                          <MapPin className="size-5" />
                          <span className="text-[10px] font-black uppercase">Retirar no Comitê</span>
                        </Button>
                        <Button 
                          type="button"
                          variant={solicitacaoForm.tipo_logistica === "entrega" ? "default" : "outline"}
                          className="h-20 flex-col gap-2 rounded-2xl"
                          onClick={() => setSolicitacaoForm({ ...solicitacaoForm, tipo_logistica: "entrega" })}
                        >
                          <Send className="size-5" />
                          <span className="text-[10px] font-black uppercase">Receber em Casa</span>
                        </Button>
                      </div>
                    </div>

                    {solicitacaoForm.tipo_logistica === "entrega" && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Endereço de Entrega</Label>
                        <Select 
                          value={solicitacaoForm.endereco_entrega === solicitacaoForm.endereco ? "atual" : "novo"}
                          onValueChange={(v) => {
                            if (v === "atual") setSolicitacaoForm({ ...solicitacaoForm, endereco_entrega: solicitacaoForm.endereco });
                            else setSolicitacaoForm({ ...solicitacaoForm, endereco_entrega: "" });
                          }}
                        >
                          <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder="Onde entregar?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="atual">Meu endereço cadastrado</SelectItem>
                            <SelectItem value="novo">Outro endereço</SelectItem>
                          </SelectContent>
                        </Select>

                        {solicitacaoForm.endereco_entrega !== solicitacaoForm.endereco && (
                          <Textarea 
                            placeholder="Rua, número, bairro, cidade e complemento..."
                            className="border-2 min-h-[100px]"
                            value={solicitacaoForm.endereco_entrega}
                            onChange={e => setSolicitacaoForm({ ...solicitacaoForm, endereco_entrega: e.target.value })}
                          />
                        )}
                      </div>
                    )}

                    <Button 
                      className="h-14 w-full text-lg font-black uppercase" 
                      onClick={() => setPassoMaterial(4)}
                    >
                      Revisar Pedido
                    </Button>
                  </div>
                )}

                {passoMaterial === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
                      <h3 className="text-sm font-black uppercase tracking-wider mb-3">Resumo do Pedido</h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Apoiador</p>
                          <p className="text-sm font-bold">{solicitacaoForm.nome}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Itens</p>
                          <div className="space-y-1">
                            {solicitacaoForm.itens.map(i => {
                              const m = db.materiais.find(mat => mat.id === i.material_id);
                              return (
                                <p key={i.material_id} className="text-xs font-medium">
                                  {i.quantidade}x {m?.nome}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Logística</p>
                          <p className="text-sm font-bold">
                            {solicitacaoForm.tipo_logistica === "retirada" ? "Retirada no Comitê" : `Entrega em: ${solicitacaoForm.endereco_entrega}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="h-14 w-full text-lg font-black uppercase" 
                      onClick={handleSolicitacaoSubmit}
                      disabled={carregando}
                    >
                      {carregando ? <Loader2 className="animate-spin" /> : "Confirmar e Finalizar"}
                    </Button>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase" onClick={() => setPassoMaterial(2)}>
                      Voltar e Editar
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comite" className="mt-0 space-y-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 text-green-600">
                  <MapPin className="size-5" />
                </div>
                <h2 className="font-extrabold">Comitê Popular</h2>
              </div>

              <div className="space-y-4">
                {passoComite === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Número do WhatsApp do Responsável</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={comiteForm.whatsapp}
                          onChange={e => setComiteForm({...comiteForm, whatsapp: e.target.value})}
                          placeholder="85 9..."
                          className="h-12 border-2"
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="h-12 px-4"
                          onClick={() => {
                            const pessoa = db.pessoas.find(p => p.telefone.replace(/\D/g, '') === comiteForm.whatsapp.replace(/\D/g, ''));
                            if (pessoa) {
                              setComiteForm({
                                ...comiteForm,
                                responsavel: pessoa.nome,
                              });
                              toast.success(`Olá ${pessoa.nome}! Vamos cadastrar o comitê.`);
                              setPassoComite(2);
                            } else {
                              toast.error("Responsável não cadastrado como apoiador.");
                              setAbaAtiva("apoiador");
                              setApoiadorForm(prev => ({ ...prev, telefone: comiteForm.whatsapp }));
                            }
                          }}
                        >
                          <Search className="size-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">O responsável deve estar cadastrado como apoiador primeiro.</p>
                    </div>

                    {comiteForm.responsavel && (
                      <div className="rounded-xl bg-muted/30 p-4 text-sm border border-border">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Responsável Identificado</p>
                        <p className="font-bold">{comiteForm.responsavel}</p>
                        <Button 
                          variant="ghost" 
                          className="mt-2 h-auto p-0 text-[10px] font-black uppercase text-primary underline"
                          onClick={() => setPassoComite(2)}
                        >
                          Continuar para Endereço
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {passoComite === 2 && (
                  <form onSubmit={handleComiteSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-xl bg-muted/30 p-4 text-sm border border-border mb-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Responsável</p>
                      <p className="font-bold">{comiteForm.responsavel}</p>
                      <button 
                        type="button"
                        onClick={() => setPassoComite(1)}
                        className="mt-1 text-[10px] font-black uppercase text-primary underline"
                      >
                        Trocar Responsável
                      </button>
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
                    
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cidade</Label>
                        <Input 
                          value={comiteForm.municipio}
                          onChange={e => setComiteForm({...comiteForm, municipio: e.target.value})}
                          placeholder="Sua cidade"
                          className="h-12 border-2"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">UF</Label>
                        <Input 
                          value={comiteForm.uf}
                          onChange={e => setComiteForm({...comiteForm, uf: e.target.value.toUpperCase()})}
                          placeholder="CE"
                          maxLength={2}
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
                      {carregando ? <Loader2 className="animate-spin" /> : "Solicitar Abertura"}
                    </Button>
                  </form>
                )}
              </div>
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

function LiderancaSelect({ municipio, value, onChange, db }: { municipio: string, value: string, onChange: (v: string) => void, db: any }) {
  const liderancas = useMemo(() => {
    let list = [...db.pessoas];
    
    // Priorização
    return list.sort((a, b) => {
      // 1. Prioridade por município selecionado
      const aMatches = a.municipio === municipio;
      const bMatches = b.municipio === municipio;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;

      // 2. Destaque extra para Fortaleza
      if (a.municipio === "Fortaleza" && b.municipio !== "Fortaleza") return -1;
      if (a.municipio !== "Fortaleza" && b.municipio === "Fortaleza") return 1;

      return a.nome.localeCompare(b.nome);
    });
  }, [db.pessoas, municipio]);

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Liderança</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 border-2">
          <SelectValue placeholder="Selecione a liderança" />
        </SelectTrigger>
        <SelectContent>
          {liderancas.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome} {p.municipio ? `(${p.municipio})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MetaInfo({ municipio, liderancaId, db }: { municipio: string, liderancaId: string, db: any }) {
  if (!municipio && !liderancaId) return null;

  const lideranca = db.pessoas.find((p: any) => p.id === liderancaId);
  const comiteLocal = db.comites.find((c: any) => c.municipio === municipio);
  
  const meta = lideranca?.meta_votos || comiteLocal?.meta_votos || 0;
  
  // Cálculo simplificado de material enviado
  const enviado = db.saidas
    .filter((s: any) => (liderancaId && s.pessoa_id === liderancaId) || (municipio && !liderancaId && db.comites.find((c: any) => c.id === s.comite_id)?.municipio === municipio))
    .reduce((acc: number, s: any) => acc + s.itens.reduce((sum: number, i: any) => sum + i.quantidade, 0), 0);

  const status = enviado >= meta && meta > 0 ? "Suficiente" : "Necessita mais";
  const statusColor = status === "Suficiente" ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50";

  return (
    <div className="rounded-2xl border-2 border-border bg-surface p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Votos Estimados</span>
        <span className="font-mono font-bold text-sm">{meta}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Material já enviado</span>
        <span className="font-mono font-bold text-sm">{enviado}</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusColor}`}>
          {status}
        </span>
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
