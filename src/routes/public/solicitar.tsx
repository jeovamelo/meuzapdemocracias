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
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatNumero, type Material, type CategoriaMaterial } from "@/lib/db";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";

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

  // DADOS DO SOLICITANTE
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [expectativaVotos, setExpectativaVotos] = useState("1");
  const [uf, setUf] = useState(campanhaAtiva?.uf || db.config.uf || "CE");
  const [cidade, setCidade] = useState("Fortaleza");
  const [endereco, setEndereco] = useState("");
  const [tipoLogistica, setTipoLogistica] = useState<"retirada" | "entrega">("retirada");

  // MATERIAIS SELECIONADOS
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  // Materiais disponíveis da campanha
  const materiaisCampanha = useMemo(() => {
    return db.materiais.filter(
      (m) => !m.arquivado && (!campanhaAtiva?.id || !m.campaign_id || m.campaign_id === campanhaAtiva.id)
    );
  }, [db.materiais, campanhaAtiva]);

  const itensSelecionados = useMemo(() => {
    return Object.entries(quantidades)
      .filter(([, qtd]) => qtd > 0)
      .map(([material_id, quantidade]) => ({ material_id, quantidade }));
  }, [quantidades]);

  const totalItens = itensSelecionados.reduce((acc, i) => acc + i.quantidade, 0);

  const handleAvancarParaMateriais = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu Nome Completo.");
      return;
    }
    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) {
      toast.error("Informe seu número de WhatsApp para combinarmos a entrega.");
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
      // 1. Cadastra/atualiza a pessoa como apoiadora com expectativa de votos
      const pessoaCriada = await addPessoa({
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, "") || undefined,
        telefone: telefone.trim(),
        tipo: "apoiador",
        funcao: "Apoiador(a) / Mobilizador(a)",
        meta_votos: Number(expectativaVotos) > 0 ? Number(expectativaVotos) : 1,
        campanha_id: campanhaAtiva?.id,
        uf: uf,
        municipio: cidade,
        endereco: endereco ? `${endereco} - ${cidade}/${uf}` : undefined,
        status: "ativo",
      });

      // 2. Cria a solicitação no banco
      await addSolicitacao({
        nome: nome.trim(),
        comite_id: db.comites[0]?.id || "",
        lideranca_id: pessoaCriada?.id,
        campaign_id: campanhaAtiva?.id,
        municipio: cidade,
        tipo_logistica: tipoLogistica,
        endereco_entrega: endereco ? `${endereco} (${cidade}/${uf})` : undefined,
        itens: itensSelecionados,
      });

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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs">
              DEM
            </span>
            <div>
              <p className="text-xs font-bold leading-tight uppercase tracking-wider text-muted-foreground">
                Portal de Solicitação de Materiais
              </p>
              <h1 className="text-sm font-extrabold truncate">
                {campanhaAtiva ? `${campanhaAtiva.candidato_urna} ${campanhaAtiva.numero}` : "Campanha Democracias"}
              </h1>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] font-bold">
            {campanhaAtiva?.uf || "BR"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        {/* TELA 1: DADOS PESSOAIS E EXPECTATIVA */}
        {passo === "dados" && (
          <form onSubmit={handleAvancarParaMateriais} className="space-y-5 animate-slide-up">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="size-4" /> Mobilize sua Região
              </p>
              <p className="text-xs text-muted-foreground">
                Preencha seus dados para receber o material oficial de campanha de{" "}
                <strong>{campanhaAtiva?.candidato_urna || "nosso candidato"}</strong>.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="size-4 text-primary" /> 1. Seus Dados de Contato
              </h2>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Nome Completo <span className="text-critical">*</span>
                </Label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome e sobrenome"
                  className="h-11 bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  WhatsApp / Telefone <span className="text-critical">*</span>
                </Label>
                <Input
                  required
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(85) 99999-9999"
                  className="h-11 bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold">CPF</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Opcional para apoiadores</span>
                </div>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-11 bg-background"
                />
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Target className="size-4 text-primary" />
                    Votos Esperados (Compromisso / Meta)
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">Padrão: 1 (próprio voto)</span>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={expectativaVotos}
                  onChange={(e) => setExpectativaVotos(e.target.value)}
                  placeholder="1 (próprio voto) ou estimativa"
                  className="h-11 bg-background font-mono font-bold text-base"
                />
                <p className="text-[11px] text-muted-foreground">
                  Quantos votos você e sua equipe de amigos se preparam para mobilizar com estes materiais?
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-bold">Localidade / Cidade</Label>
                <EstadoCidadeSelect
                  uf={uf}
                  cidade={cidade}
                  onUfChange={setUf}
                  onCidadeChange={setCidade}
                  showLabels={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Endereço de Entrega (ou Bairro)</Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número e bairro..."
                  className="h-11 bg-background"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold gap-2">
              Próximo: Escolher Materiais <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        {/* TELA 2: ESCOLHA DE MATERIAIS */}
        {passo === "materiais" && (
          <div className="space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPasso("dados")}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Voltar aos Dados
              </button>
              <span className="font-mono text-xs font-bold text-primary">
                {formatNumero(totalItens)} ITENS SELECIONADOS
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="size-4 text-primary" /> 2. Selecione os Materiais
              </h2>

              {materiaisCampanha.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                  <Package className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-muted-foreground">Catálogo de materiais em atualização.</p>
                </div>
              ) : (
                materiaisCampanha.map((m) => {
                  const Icon = iconeCategoria(m.categoria);
                  const qtd = quantidades[m.id] || 0;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                        qtd > 0 ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm leading-tight">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.categoria}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setQuantidades({ ...quantidades, [m.id]: Math.max(0, qtd - 20) })}
                          className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-xs active:scale-95"
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
                          className="h-8 w-14 text-center font-mono font-bold text-xs p-1 bg-background"
                        />
                        <button
                          onClick={() => setQuantidades({ ...quantidades, [m.id]: qtd + 20 })}
                          className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-xs active:scale-95"
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
              className="w-full h-14 rounded-xl text-base font-bold bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Enviar Solicitação de Material ({formatNumero(totalItens)} un)
            </Button>
          </div>
        )}

        {/* TELA 3: SUCESSO */}
        {passo === "sucesso" && (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center space-y-4 animate-slide-up shadow-lg">
            <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="text-xl font-extrabold leading-tight">Solicitação Enviada com Sucesso!</h2>
            <p className="text-sm text-muted-foreground">
              Obrigado, <strong>{nome}</strong>! Sua solicitação de {formatNumero(totalItens)} itens e compromisso de {formatNumero(Number(expectativaVotos))} votos já foi recebida pela equipe de logística de{" "}
              <strong>{campanhaAtiva?.candidato_urna || "nossa campanha"}</strong>.
            </p>
            <div className="rounded-2xl border border-border bg-background p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitante:</span>
                <span className="font-bold">{nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cidade:</span>
                <span className="font-bold">{cidade}/{uf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meta de Mobilização:</span>
                <span className="font-bold text-primary">{formatNumero(Number(expectativaVotos))} votos</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => {
                  setPasso("dados");
                  setQuantidades({});
                  setNome("");
                  setExpectativaVotos("");
                }}
                variant="outline"
                className="w-full rounded-xl"
              >
                Fazer Nova Solicitação
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
