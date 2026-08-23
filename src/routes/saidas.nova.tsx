import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  MapPin, 
  Package, 
  Search, 
  Plus, 
  User, 
  Truck, 
  Barcode, 
  FileText, 
  Flag, 
  Shirt,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatNumero, type SaidaItem, type Material } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/saidas/nova")({
  head: () => ({
    meta: [
      { title: "Nova Saída de Material — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Check-out rápido de materiais de campanha, lançamento de quantidades e geração de número de pedido.",
      },
    ],
  }),
  component: NovaSaida,
});

const PASSOS = ["1. Origem", "2. Materiais", "3. Destino & Transporte", "4. Confirmar"];

const iconeCategoria = (c: string) => {
  if (c.includes("Adesivo")) return FileText;
  if (c.includes("Bandeira")) return Flag;
  if (c.includes("Santinho") || c.includes("Gráfico")) return FileText;
  if (c.includes("Vestuário") || c.includes("Bóton")) return Shirt;
  return Package;
};

function NovaSaida() {
  const { db, registrarSaida, addPessoa } = useStore();
  const { campaign } = useCampaignScope();
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);

  // ETAPA 1: ORIGEM
  const [filtroUf, setFiltroUf] = useState(campaign?.uf || db.config.uf || "CE");
  const [filtroCidade, setFiltroCidade] = useState("Fortaleza");
  const [comiteId, setComiteId] = useState("");

  // ETAPA 2: MATERIAIS
  const [kits, setKits] = useState<Record<string, number>>({});
  const [avulsos, setAvulsos] = useState<Record<string, number>>({});

  // ETAPA 3: DESTINATÁRIO E ENTREGADOR
  const [pessoaId, setPessoaId] = useState("");
  const [nomeNovoRecebedor, setNomeNovoRecebedor] = useState("");
  const [telefoneNovoRecebedor, setTelefoneNovoRecebedor] = useState("");
  const [buscaRecebedor, setBuscaRecebedor] = useState("");
  const [entregadorId, setEntregadorId] = useState("");

  const [salvando, setSalvando] = useState(false);

  // Número de pedido gerado aleatoriamente para identificação
  const numeroPedidoGerado = useMemo(() => {
    const timestamp = Date.now().toString().slice(-4);
    const rand = Math.floor(100 + Math.random() * 900);
    return `PED-${timestamp}-${rand}`;
  }, []);

  // Comitês da campanha e localidade
  const comitesDisponiveis = useMemo(() => {
    return db.comites.filter((c) => {
      const matchCamp = !campaign?.id || !c.campaign_id || c.campaign_id === campaign.id;
      const matchUf = !filtroUf || c.uf === filtroUf;
      return matchCamp && matchUf;
    });
  }, [db.comites, campaign, filtroUf]);

  // Materiais da campanha
  const materiaisCampanha = useMemo(() => {
    return db.materiais.filter(
      (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
    );
  }, [db.materiais, campaign]);

  const kitsCampanha = useMemo(() => {
    return db.kits.filter(
      (k) => !k.arquivado && (!campaign?.id || !k.campaign_id || k.campaign_id === campaign.id)
    );
  }, [db.kits, campaign]);

  // Pessoas da campanha
  const pessoasCampanha = useMemo(() => {
    return db.pessoas.filter((p) => {
      const matchCamp = !campaign?.id || !p.campanha_id || p.campanha_id === campaign.id;
      const matchBusca = `${p.nome} ${p.funcao || ""} ${p.municipio || ""}`
        .toLowerCase()
        .includes(buscaRecebedor.toLowerCase());
      return matchCamp && matchBusca;
    });
  }, [db.pessoas, campaign, buscaRecebedor]);

  // Entregadores / Motoristas disponíveis
  const entregadores = useMemo(() => {
    return db.pessoas.filter(
      (p) => !campaign?.id || !p.campanha_id || p.campanha_id === campaign.id
    );
  }, [db.pessoas, campaign]);

  // Itens calculados
  const itensFinais: SaidaItem[] = useMemo(() => {
    const itensKits = Object.entries(kits).flatMap(([kitId, qtd]) => {
      const kit = db.kits.find((k) => k.id === kitId);
      return (kit?.itens ?? []).map((i) => ({
        material_id: i.material_id,
        quantidade: i.quantidade * qtd,
        kit_id: kitId,
      }));
    });

    const itensAvulsos = Object.entries(avulsos)
      .filter(([, q]) => q > 0)
      .map(([material_id, quantidade]) => ({ material_id, quantidade }));

    // Agrupar itens repetidos
    const agrupado = new Map<string, number>();
    [...itensKits, ...itensAvulsos].forEach((item) => {
      agrupado.set(item.material_id, (agrupado.get(item.material_id) || 0) + item.quantidade);
    });

    return Array.from(agrupado.entries()).map(([material_id, quantidade]) => ({
      material_id,
      quantidade,
    }));
  }, [kits, avulsos, db.kits]);

  const totalUnidades = itensFinais.reduce((a, i) => a + i.quantidade, 0);

  const podeAvancar = useMemo(() => {
    if (passo === 0) return true;
    if (passo === 1) return totalUnidades > 0;
    if (passo === 2) return !!pessoaId || !!nomeNovoRecebedor.trim();
    return true;
  }, [passo, totalUnidades, pessoaId, nomeNovoRecebedor]);

  async function confirmarSaida() {
    setSalvando(true);
    try {
      let finalPessoaId = pessoaId;

      // Se for recebedor avulso, cadastra automaticamente na equipe
      if (!finalPessoaId && nomeNovoRecebedor.trim()) {
        const novaPessoa = await addPessoa({
          nome: nomeNovoRecebedor.trim(),
          telefone: telefoneNovoRecebedor.trim() || undefined,
          tipo: "apoiador",
          funcao: "Apoiador(a) / Retirada",
          campanha_id: campaign?.id || undefined,
          comite_id: comiteId || undefined,
          uf: filtroUf,
          municipio: filtroCidade,
          status: "ativo",
        });
        if (novaPessoa?.id) finalPessoaId = novaPessoa.id;
      }

      await registrarSaida({
        numero_pedido: numeroPedidoGerado,
        comite_id: comiteId || db.comites[0]?.id || "",
        pessoa_id: finalPessoaId || "",
        entregador_id: entregadorId || undefined,
        campaign_id: campaign?.id || undefined,
        kits: Object.entries(kits)
          .filter(([, q]) => q > 0)
          .map(([kit_id, quantidade]) => ({ kit_id, quantidade })),
        itens: itensFinais,
      });

      toast.success(`Saída confirmada! Pedido #${numeroPedidoGerado} registrado.`);
      navigate({ to: "/saidas" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar saída de estoque.");
    } finally {
      setSalvando(false);
    }
  }

  const comiteSelecionado = db.comites.find((c) => c.id === comiteId);
  const pessoaSelecionada = db.pessoas.find((p) => p.id === pessoaId);
  const entregadorSelecionado = db.pessoas.find((p) => p.id === entregadorId);

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pt-7 pb-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link
            to="/saidas"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Cancelar Saída
          </Link>
          <div className="flex items-center gap-2">
            {campaign && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">{campaign.nomeUrna}</span>
                <span>•</span>
                <span className="font-mono text-primary">{campaign.numero}</span>
                <span>•</span>
                <span className="font-mono uppercase text-muted-foreground">{campaign.uf}</span>
              </span>
            )}
            <span className="font-mono text-xs font-bold text-muted-foreground">
              {passo + 1}/04
            </span>
          </div>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {PASSOS[passo]}
        </h1>
      </header>

      {/* BARRA DE PROGRESSO */}
      <div className="flex px-5 pt-3">
        {PASSOS.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 flex-1 rounded-full mx-0.5 transition-all ${
              i <= passo ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <main className="animate-slide-up px-5 py-5 max-w-xl mx-auto space-y-4">
        {/* ETAPA 1: ORIGEM / LOCALIDADE */}
        {passo === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                <MapPin className="size-4" /> De onde sairá o material?
              </p>
              <p className="text-xs text-muted-foreground">
                Defina a localidade do envio e selecione o comitê de origem caso possua um ponto físico cadastrado.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Estado e Município de Origem / Destino</Label>
                <EstadoCidadeSelect
                  uf={filtroUf}
                  cidade={filtroCidade}
                  onUfChange={(uf) => setFiltroUf(uf)}
                  onCidadeChange={(cidade) => setFiltroCidade(cidade)}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-bold">Comitê de Distribuição (Opcional)</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setComiteId("")}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                      !comiteId ? "border-2 border-primary bg-primary/5 shadow-sm" : "border-border bg-background"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">Sede Geral / Distribuição Direta</p>
                      <p className="text-xs text-muted-foreground">{filtroCidade} • {filtroUf}</p>
                    </div>
                    {!comiteId && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={4} />
                      </span>
                    )}
                  </button>

                  {comitesDisponiveis.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setComiteId(c.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        comiteId === c.id ? "border-2 border-primary bg-primary/5 shadow-sm" : "border-border bg-background"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.bairro} {c.municipio ? `• ${c.municipio}` : ""}</p>
                      </div>
                      {comiteId === c.id && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" strokeWidth={4} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: MATERIAIS */}
        {passo === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold text-muted-foreground uppercase">
                Estoque da Campanha
              </p>
              <span className="font-mono text-xs font-black text-primary">
                {formatNumero(totalUnidades)} UN SELECIONADAS
              </span>
            </div>

            {/* KITS */}
            {kitsCampanha.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Kits Pré-Montados</p>
                {kitsCampanha.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm">{k.nome}</p>
                      <p className="text-xs text-muted-foreground">{k.itens.length} tipos de itens combinados</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setKits({ ...kits, [k.id]: Math.max(0, (kits[k.id] || 0) - 1) })}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-sm active:scale-95"
                      >
                        -
                      </button>
                      <Input
                        type="number"
                        min="0"
                        value={kits[k.id] || ""}
                        placeholder="0"
                        onChange={(e) => setKits({ ...kits, [k.id]: Math.max(0, Number(e.target.value) || 0) })}
                        className="h-8 w-14 text-center font-mono font-bold text-xs bg-background"
                      />
                      <button
                        onClick={() => setKits({ ...kits, [k.id]: (kits[k.id] || 0) + 1 })}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MATERIAIS INDIVIDUAIS */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Itens e Materiais Individuais</p>
              {materiaisCampanha.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                  <Package className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum material cadastrado na campanha.</p>
                  <Link to="/materiais" className="text-xs text-primary font-bold mt-2 inline-block">
                    + Cadastrar Materiais
                  </Link>
                </div>
              ) : (
                materiaisCampanha.map((m) => {
                  const Icon = iconeCategoria(m.categoria);
                  const qtd = avulsos[m.id] || 0;
                  const temEstoque = m.estoque > 0;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all shadow-sm ${
                        qtd > 0 ? "border-primary bg-primary/5" : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-sm leading-tight">{m.nome}</p>
                          <Badge
                            variant={temEstoque ? "outline" : "destructive"}
                            className="text-[9px] font-mono"
                          >
                            {temEstoque ? `${formatNumero(m.estoque)} disp.` : "Zerado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.categoria}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAvulsos({ ...avulsos, [m.id]: Math.max(0, qtd - 50) })}
                          className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-bold text-muted-foreground active:scale-95"
                        >
                          -50
                        </button>
                        <Input
                          type="number"
                          min="0"
                          value={qtd === 0 ? "" : qtd}
                          placeholder="0"
                          onChange={(e) => setAvulsos({ ...avulsos, [m.id]: Math.max(0, Number(e.target.value) || 0) })}
                          className="h-8 w-16 text-center font-mono font-bold text-xs bg-background p-1"
                        />
                        <button
                          onClick={() => setAvulsos({ ...avulsos, [m.id]: qtd + 50 })}
                          className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-bold text-muted-foreground active:scale-95"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ETAPA 3: DESTINO E ENTREGADOR */}
        {passo === 2 && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <User className="size-4 text-primary" /> Quem está recebendo o material? <span className="text-critical">*</span>
              </Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaRecebedor}
                  onChange={(e) => setBuscaRecebedor(e.target.value)}
                  placeholder="Buscar apoiador ou líder cadastrado..."
                  className="h-10 pl-9 bg-background"
                />
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {pessoasCampanha.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPessoaId(p.id);
                      setNomeNovoRecebedor("");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                      pessoaId === p.id ? "border-2 border-primary bg-primary/5 font-bold" : "border-border bg-background"
                    }`}
                  >
                    <span>{p.nome} ({p.funcao || "Apoiador"})</span>
                    {pessoaId === p.id && <Check className="size-3.5 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-border/50 space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground">Ou informe recebedor avulso:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={nomeNovoRecebedor}
                    onChange={(e) => {
                      setNomeNovoRecebedor(e.target.value);
                      if (e.target.value) setPessoaId("");
                    }}
                    placeholder="Nome do recebedor..."
                    className="bg-background text-xs"
                  />
                  <Input
                    value={telefoneNovoRecebedor}
                    onChange={(e) => setTelefoneNovoRecebedor(e.target.value)}
                    placeholder="WhatsApp (opcional)..."
                    className="bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ENTREGADOR / TRANSPORTE */}
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Truck className="size-4 text-primary" /> Responsável pelo Transporte / Entregador (Opcional)
              </Label>
              <Select value={entregadorId} onValueChange={setEntregadorId}>
                <SelectTrigger className="bg-background text-xs">
                  <SelectValue placeholder="Selecione o entregador (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum / Retirada no Balcão</SelectItem>
                  {entregadores.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} {e.funcao ? `(${e.funcao})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ETAPA 4: CONFIRMAÇÃO & NÚMERO DO PEDIDO */}
        {passo === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-2 shadow-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-xs font-mono font-black tracking-widest">
                <Barcode className="size-3.5" /> NÚMERO DO PACOTE
              </span>
              <h2 className="text-2xl font-mono font-extrabold tracking-wider text-foreground">
                #{numeroPedidoGerado}
              </h2>
              <p className="text-xs text-muted-foreground">
                Anote ou grampeie este número no pacote físico para controle logístico.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-sm">Resumo da Saída</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Origem:</span>
                  <span className="font-bold">{comiteSelecionado?.nome || "Sede Geral"} ({filtroCidade}/{filtroUf})</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Recebedor:</span>
                  <span className="font-bold">{pessoaSelecionada?.nome || nomeNovoRecebedor || "Não informado"}</span>
                </div>
                {entregadorSelecionado && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Transporte por:</span>
                    <span className="font-bold">{entregadorSelecionado.nome}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume Total:</span>
                  <span className="font-mono font-bold text-primary">{formatNumero(totalUnidades)} unidades</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xs uppercase font-bold text-muted-foreground">Itens a Baixar do Estoque:</p>
              {itensFinais.map((i, idx) => {
                const m = db.materiais.find((mat) => mat.id === i.material_id);
                return (
                  <div key={idx} className="flex justify-between items-center rounded-xl border border-border bg-surface p-3 text-xs shadow-sm">
                    <span className="font-semibold">{m?.nome || "Material"}</span>
                    <span className="font-mono font-black text-primary">{formatNumero(i.quantidade)} {m?.unidade || "un"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur-md shadow-2xl">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {passo > 0 && (
            <button
              onClick={() => setPasso(passo - 1)}
              className="flex-1 rounded-xl border border-border bg-surface py-3.5 text-sm font-bold transition-all active:scale-95"
            >
              Voltar
            </button>
          )}

          {passo < 3 ? (
            <button
              disabled={!podeAvancar}
              onClick={() => setPasso(passo + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 active:scale-95 shadow-md"
            >
              <span>Avançar</span>
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              disabled={salvando || totalUnidades === 0}
              onClick={confirmarSaida}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Confirmar Saída (#{numeroPedidoGerado})
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
