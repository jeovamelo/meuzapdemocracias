import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  MapPin, 
  Package, 
  Search, 
  User, 
  Barcode, 
  FileText, 
  Flag, 
  Shirt, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Building,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatNumero, type SaidaItem, type Material } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/saidas/nova")({
  head: () => ({
    meta: [
      { title: "Nova Saída de Material (Pedido) — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Registro e baixa rápida de materiais de campanha, geração de número de pedido sequencial e rastreabilidade.",
      },
    ],
  }),
  component: NovaSaida,
});

// Fluxo objetivo de 3 passos sem divisão por comitês de origem
const PASSOS = ["1. Materiais", "2. Destino & Responsável", "3. Confirmar Pedido"];

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
  
  // 0: Materiais | 1: Destino & Responsável | 2: Confirmar Pedido
  const [passo, setPasso] = useState(0);

  // ETAPA 1: MATERIAIS SELECIONADOS
  const [kits, setKits] = useState<Record<string, number>>({});
  const [avulsos, setAvulsos] = useState<Record<string, number>>({});
  const [buscaMaterial, setBuscaMaterial] = useState("");
  const [ordenacao, setOrdenacao] = useState<'nome-asc' | 'nome-desc'>('nome-asc');

  // ETAPA 2: DESTINO E RESPONSÁVEL
  const [ufDestino, setUfDestino] = useState(campaign?.uf || db.config.uf || "CE");
  const [cidadeDestino, setCidadeDestino] = useState("Fortaleza");

  // Responsável unificado (opcional)
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [observacaoEntrega, setObservacaoEntrega] = useState("");

  const [salvando, setSalvando] = useState(false);

  // GERAÇÃO DE NÚMERO SEQUENCIAL ESTRUTURADO: PED-[número do candidato]-[sequencial 5 dígitos]
  const numeroCandidato = useMemo(() => {
    return campaign?.numero || "0000";
  }, [campaign]);

  const proximoSequencial = useMemo(() => {
    let maxSeq = 0;
    const regex = new RegExp(`^#?PED-${numeroCandidato}-(\\d{5})$`);
    
    const check = (num: string | null | undefined) => {
      if (!num) return;
      const match = num.trim().match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    };
    
    (db.saidas || []).forEach(s => {
      if (!campaign?.id || s.campaign_id === campaign.id) check(s.numero_pedido);
    });
    
    (db.solicitacoes || []).forEach(sol => {
      if (!campaign?.id || sol.campaign_id === campaign.id) check(sol.numero_pedido);
    });
    
    const nextSeq = maxSeq + 1;
    return String(nextSeq).padStart(5, "0");
  }, [db.saidas, db.solicitacoes, campaign, numeroCandidato]);

  const numeroPedidoGerado = useMemo(() => {
    return `#PED-${numeroCandidato}-${proximoSequencial}`;
  }, [numeroCandidato, proximoSequencial]);

  // Materiais disponíveis no estoque da campanha
  const materiaisCampanha = useMemo(() => {
    const list = (db.materiais || []).filter(
      (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
    );
    const filtered = buscaMaterial.trim()
      ? list.filter((m) => m.nome.toLowerCase().includes(buscaMaterial.toLowerCase()))
      : list;

    return filtered.sort((a, b) => {
      if (ordenacao === 'nome-asc') {
        return a.nome.localeCompare(b.nome, 'pt-BR');
      } else {
        return b.nome.localeCompare(a.nome, 'pt-BR');
      }
    });
  }, [db.materiais, campaign, buscaMaterial, ordenacao]);

  const kitsCampanha = useMemo(() => {
    return (db.kits || []).filter(
      (k) => !k.arquivado && (!campaign?.id || !k.campaign_id || k.campaign_id === campaign.id)
    );
  }, [db.kits, campaign]);

  // Pessoas cadastradas para sugestão não intrusiva no datalist
  const sugestoesPessoas = useMemo(() => {
    return (db.pessoas || []).filter(
      (p) => !campaign?.id || !p.campanha_id || p.campanha_id === campaign.id
    );
  }, [db.pessoas, campaign]);

  // Cálculo de itens finais agrupados
  const itensFinais: SaidaItem[] = useMemo(() => {
    const itensKits = Object.entries(kits).flatMap(([kitId, qtd]) => {
      const kit = (db.kits || []).find((k) => k.id === kitId);
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

  // Validação fluida de avanço
  const podeAvancar = useMemo(() => {
    if (passo === 0) return totalUnidades > 0;
    if (passo === 1) return !!cidadeDestino.trim(); // A única informação obrigatória é a cidade de destino
    return true;
  }, [passo, totalUnidades, cidadeDestino]);

  // CONFIRMAÇÃO DO PEDIDO E BAIXA AUTOMÁTICA DO ESTOQUE
  async function handleConfirmarPedido() {
    setSalvando(true);
    try {
      let finalPessoaId = "";

      // Se o usuário informou o nome do responsável, cadastra/vincula no banco
      if (nomeResponsavel.trim()) {
        const pessoaExistente = sugestoesPessoas.find(
          (p) => p.nome.trim().toLowerCase() === nomeResponsavel.trim().toLowerCase()
        );

        if (pessoaExistente) {
          finalPessoaId = pessoaExistente.id;
        } else {
          const novaPessoa = await addPessoa({
            nome: nomeResponsavel.trim(),
            cpf: "",
            tipo: "apoiador",
            funcao: "Responsável por Retirada / Transporte",
            meta_votos: 1,
            uf: ufDestino,
            municipio: cidadeDestino,
            status: "ativo",
            ...(telefoneResponsavel.trim() ? { telefone: telefoneResponsavel.trim() } : {}),
            ...(campaign?.id ? { campaign_id: campaign.id } : {}),
          });
          if (novaPessoa?.id) finalPessoaId = novaPessoa.id;
        }
      }

      // Baixa no estoque e registro do pedido
      await registrarSaida({
        numero_pedido: numeroPedidoGerado,
        comite_id: db.comites[0]?.id || "",
        pessoa_id: finalPessoaId || null,
        kits: Object.entries(kits)
          .filter(([, q]) => q > 0)
          .map(([kit_id, quantidade]) => ({ kit_id, quantidade })),
        itens: itensFinais,
        ...(campaign?.id ? { campaign_id: campaign.id } : {}),
      });

      toast.success(`Pedido #${numeroPedidoGerado} registrado e estoque atualizado com sucesso!`);
      navigate({ to: "/saidas" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar saída de estoque.");
    } finally {
      setSalvando(false);
    }
  }

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
              {passo + 1}/03
            </span>
          </div>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {PASSOS[passo]}
        </h1>
      </header>

      {/* BARRA DE PROGRESSO COM 3 ETAPAS */}
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
        
        {/* ETAPA 1: MATERIAIS (SELEÇÃO DIRETA DO ESTOQUE PRINCIPAL) */}
        {passo === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Package className="size-4 text-primary" /> Estoque Principal da Campanha
              </p>
              <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {formatNumero(totalUnidades)} UN SELECIONADAS
              </span>
            </div>

            {/* KITS PRÉ-MONTADOS */}
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
                        type="button"
                        onClick={() => setKits({ ...kits, [k.id]: Math.max(0, (kits[k.id] || 0) - 1) })}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-sm active:scale-95 cursor-pointer"
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
                        type="button"
                        onClick={() => setKits({ ...kits, [k.id]: (kits[k.id] || 0) + 1 })}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background font-bold text-sm active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MATERIAIS INDIVIDUAIS DO ESTOQUE UNIFICADO */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">Itens e Materiais Individuais</p>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={buscaMaterial}
                    onChange={(e) => setBuscaMaterial(e.target.value)}
                    placeholder="Buscar material por nome..."
                    className="h-12 rounded-xl bg-surface pl-9"
                  />
                </div>
                <Select value={ordenacao} onValueChange={(v: any) => setOrdenacao(v)}>
                  <SelectTrigger className="h-12 w-[110px] rounded-xl bg-surface border-border font-medium text-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome-asc">A-Z</SelectItem>
                    <SelectItem value="nome-desc">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                          type="button"
                          onClick={() => setAvulsos({ ...avulsos, [m.id]: Math.max(0, qtd - 50) })}
                          className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-bold text-muted-foreground active:scale-95 cursor-pointer"
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
                          type="button"
                          onClick={() => setAvulsos({ ...avulsos, [m.id]: qtd + 50 })}
                          className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-bold text-muted-foreground active:scale-95 cursor-pointer"
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

        {/* ETAPA 2: DESTINO & RESPONSÁVEL (COM DESTINO OBRIGATÓRIO E RESPONSÁVEL OPCIONAL) */}
        {passo === 1 && (
          <div className="space-y-4">
            
            {/* 1. MUNICÍPIO / CIDADE DE DESTINO (ÚNICA OBRIGATÓRIA) */}
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" /> Município / Cidade de Destino <span className="text-critical">*</span>
                </Label>
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  * Obrigatório
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Inicia com a capital/estado padrão, permitindo alterar livremente para qualquer município.
              </p>
              <EstadoCidadeSelect
                uf={ufDestino}
                cidade={cidadeDestino}
                onUfChange={(uf) => setUfDestino(uf)}
                onCidadeChange={(cidade) => setCidadeDestino(cidade)}
                showLabels={false}
              />
            </div>

            {/* 2. RESPONSÁVEL PELO MATERIAL (UNIFICADO E 100% OPCIONAL) */}
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <User className="size-4 text-primary" /> Responsável (Opcional)
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">Opcional</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Informe quem vai retirar, transportar ou receber o material (indiferente do papel logístico).
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Nome do Responsável</Label>
                  <Input
                    list="lista-pessoas-sugestao"
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    placeholder="Digite o nome da pessoa responsável (opcional)..."
                    className="bg-background text-sm h-11"
                  />
                  {/* Datalist não invasivo para autocompletar conforme o usuário digita */}
                  <datalist id="lista-pessoas-sugestao">
                    {sugestoesPessoas.map((p) => (
                      <option key={p.id} value={p.nome}>
                        {p.funcao ? `${p.funcao} - ${p.municipio || ""}` : p.municipio || ""}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">WhatsApp / Telefone</Label>
                  <Input
                    type="tel"
                    value={telefoneResponsavel}
                    onChange={(e) => setTelefoneResponsavel(e.target.value)}
                    placeholder="(85) 99999-9999 (opcional)..."
                    className="bg-background text-sm h-11"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Ponto de Entrega / Observações</Label>
                  <Input
                    value={observacaoEntrega}
                    onChange={(e) => setObservacaoEntrega(e.target.value)}
                    placeholder="Ex: Entregar no comitê central, comício da praça..."
                    className="bg-background text-sm h-11"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: CONFIRMAR PEDIDO E BAIXA DE ESTOQUE */}
        {passo === 2 && (
          <div className="space-y-4">
            {/* NÚMERO DO PEDIDO SEQUENCIAL: PED-[Nº CANDIDATO]-[SEQUENCIAL 5 DÍGITOS] */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-2 shadow-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-xs font-mono font-black tracking-widest">
                <Barcode className="size-3.5" /> NÚMERO DO PEDIDO
              </span>
              <h2 className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-foreground">
                #{numeroPedidoGerado}
              </h2>
              <p className="text-xs text-muted-foreground">
                Anote ou grampeie este número no pacote físico para controle logístico e rastreabilidade.
              </p>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Building className="size-4 text-primary" /> Resumo do Pedido
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Estoque de Origem:</span>
                  <span className="font-bold">Estoque Principal (Sede Geral)</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Cidade / UF de Destino:</span>
                  <span className="font-bold text-primary">{cidadeDestino}/{ufDestino}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-bold">
                    {nomeResponsavel.trim() ? `${nomeResponsavel} ${telefoneResponsavel ? `(${telefoneResponsavel})` : ''}` : "Não informado (Saída Geral)"}
                  </span>
                </div>
                {observacaoEntrega.trim() && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Observação:</span>
                    <span className="font-medium text-slate-800">{observacaoEntrega}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground font-bold">Volume Total:</span>
                  <span className="font-mono font-black text-primary text-sm">{formatNumero(totalUnidades)} unidades</span>
                </div>
              </div>
            </div>

            {/* LISTAGEM DE ITENS A BAIXAR */}
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase font-bold text-muted-foreground">Itens a Baixar do Estoque:</p>
              {itensFinais.map((i, idx) => {
                const m = (db.materiais || []).find((mat) => mat.id === i.material_id);
                const estoqueAtual = m?.estoque ?? 0;
                const estoqueRestante = estoqueAtual - i.quantidade;

                return (
                  <div key={idx} className="flex justify-between items-center rounded-xl border border-border bg-surface p-3 text-xs shadow-sm">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{m?.nome || "Material"}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        Estoque atual: {formatNumero(estoqueAtual)} → Restante: {formatNumero(estoqueRestante)}
                      </span>
                    </div>
                    <span className="font-mono font-black text-primary text-sm">
                      -{formatNumero(i.quantidade)} {m?.unidade || "un"}
                    </span>
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
              type="button"
              onClick={() => setPasso(passo - 1)}
              className="flex-1 rounded-xl border border-border bg-surface py-3.5 text-sm font-bold transition-all active:scale-95 cursor-pointer"
            >
              Voltar
            </button>
          )}

          {passo < 2 ? (
            <button
              type="button"
              disabled={!podeAvancar}
              onClick={() => setPasso(passo + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 active:scale-95 shadow-md cursor-pointer"
            >
              <span>Avançar</span>
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={salvando || totalUnidades === 0}
              onClick={handleConfirmarPedido}
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg cursor-pointer"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              <span>Confirmar Pedido (#{numeroPedidoGerado})</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
