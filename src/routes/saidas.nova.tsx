import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, MapPin, Package, Search, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatNumero, type SaidaItem, type Material } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/saidas/nova")({
  head: () => ({
    meta: [
      { title: "Nova Saída de Material — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Registre em poucos toques a saída de kits ou itens avulsos: comitê de origem, quem retira e confirmação com data e hora.",
      },
      { property: "og:title", content: "Nova Saída de Material — Estoque de Campanha" },
      {
        property: "og:description",
        content: "Check-out rápido de material de campanha em quatro passos.",
      },
    ],
  }),
  component: NovaSaida,
});

const PASSOS = ["Origem", "Recebedor", "Material", "Confirmar"];

function NovaSaida() {
  const { db, registrarSaida, addPessoa } = useStore();
  const { campaign } = useCampaignScope();
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [comiteId, setComiteId] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  const [nomeNovoRecebedor, setNomeNovoRecebedor] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroUf, setFiltroUf] = useState(campaign?.uf || db.config.uf || "CE");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [kits, setKits] = useState<Record<string, number>>({});
  const [avulsos, setAvulsos] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);

  // Filtrar comitês da campanha
  const comitesFiltrados = db.comites.filter((c) => {
    const matchCamp = !campaign?.id || !c.campaign_id || c.campaign_id === campaign.id;
    const matchUf = !filtroUf || c.uf === filtroUf;
    const matchCidade = !filtroCidade || (c.municipio && c.municipio.toLowerCase().includes(filtroCidade.toLowerCase()));
    return matchCamp && matchUf && matchCidade;
  });

  // Pessoas da campanha
  const pessoas = db.pessoas.filter((p) => {
    const matchCamp = !campaign?.id || !p.campanha_id || p.campanha_id === campaign.id;
    const matchBusca = `${p.nome} ${p.funcao}`.toLowerCase().includes(busca.toLowerCase());
    return matchCamp && matchBusca;
  });

  // Materiais e Kits da campanha
  const materiaisCampanha = db.materiais.filter(
    (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
  );

  const kitsCampanha = db.kits.filter(
    (k) => !k.arquivado && (!campaign?.id || !k.campaign_id || k.campaign_id === campaign.id)
  );

  const itensFinais: SaidaItem[] = [
    ...Object.entries(kits).flatMap(([kitId, qtd]) => {
      const kit = db.kits.find((k) => k.id === kitId);
      return (kit?.itens ?? []).map((i) => ({
        material_id: i.material_id,
        quantidade: i.quantidade * qtd,
        kit_id: kitId,
      }));
    }),
    ...Object.entries(avulsos)
      .filter(([, q]) => q > 0)
      .map(([material_id, quantidade]) => ({ material_id, quantidade })),
  ];

  const totalUnidades = itensFinais.reduce((a, i) => a + i.quantidade, 0);

  const podeAvancar =
    (passo === 0 && !!comiteId) ||
    (passo === 1 && (!!pessoaId || !!nomeNovoRecebedor.trim())) ||
    (passo === 2 && totalUnidades > 0) ||
    passo === 3;

  async function confirmar() {
    setSalvando(true);
    let finalPessoaId = pessoaId;

    // Se informou recebedor avulso não cadastrado, cria registro rápido
    if (!finalPessoaId && nomeNovoRecebedor.trim()) {
      const novaPessoa = await addPessoa({
        nome: nomeNovoRecebedor.trim(),
        tipo: "apoiador",
        funcao: "Apoiador(a) / Retirada",
        campanha_id: campaign?.id || undefined,
        comite_id: comiteId || undefined,
        uf: campaign?.uf || "CE",
        status: "ativo",
      });
      if (novaPessoa?.id) finalPessoaId = novaPessoa.id;
    }

    await registrarSaida({
      comite_id: comiteId,
      pessoa_id: finalPessoaId,
      campaign_id: campaign?.id || undefined,
      kits: Object.entries(kits)
        .filter(([, q]) => q > 0)
        .map(([kit_id, quantidade]) => ({ kit_id, quantidade })),
      itens: itensFinais,
    });

    setSalvando(false);
    toast.success("Saída registrada e estoque abatido imediatamente!");
    navigate({ to: "/saidas" });
  }

  const comite = db.comites.find((c) => c.id === comiteId);
  const pessoa = db.pessoas.find((p) => p.id === pessoaId);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-5 pt-7 pb-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link
            to="/saidas"
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Cancelar
          </Link>
          <div className="flex items-center gap-2">
            {campaign && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="truncate max-w-[120px]">{campaign.nomeUrna}</span>
                <span>•</span>
                <span className="font-mono text-primary">{campaign.numero}</span>
                <span>•</span>
                <span className="font-mono uppercase text-muted-foreground">{campaign.uf}</span>
              </span>
            )}
            <span className="font-mono text-xs text-muted-foreground">
              PASSO 0{passo + 1}/04
            </span>
          </div>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {PASSOS[passo]}
        </h1>
      </header>

      <div className="flex px-5 pt-4">
        {PASSOS.map((p, i) => (
          <div
            key={p}
            className={`h-1 w-1/4 ${i <= passo ? "bg-primary" : "bg-foreground/10"}`}
          />
        ))}
      </div>

      <main className="animate-slide-up px-5 py-6 pb-40">
        {/* PASSO 0: COMITÊ DE ORIGEM */}
        {passo === 0 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                Filtrar Comitês por Região
              </p>
              <EstadoCidadeSelect
                uf={filtroUf}
                cidade={filtroCidade}
                onUfChange={setFiltroUf}
                onCidadeChange={setFiltroCidade}
                showLabels={false}
              />
            </div>
            <p className="font-mono text-xs uppercase text-muted-foreground pt-1">
              De qual comitê o material vai sair?
            </p>
            {comitesFiltrados.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Nenhum comitê encontrado.</p>
                <Link to="/comites" className="text-xs text-primary font-bold mt-2 inline-block">
                  + Cadastrar Comitê
                </Link>
              </div>
            ) : (
              comitesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setComiteId(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    comiteId === c.id ? "border-2 border-primary bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <div>
                    <p className="font-bold leading-tight">{c.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {c.bairro} {c.municipio ? `• ${c.municipio}/${c.uf}` : ""}
                    </p>
                  </div>
                  {comiteId === c.id && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-primary-foreground" strokeWidth={4} />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* PASSO 1: RECEBEDOR */}
        {passo === 1 && (
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Quem está retirando o material?
            </p>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou função..."
                className="h-12 rounded-xl bg-surface pl-9"
              />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pessoas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPessoaId(p.id);
                    setNomeNovoRecebedor("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    pessoaId === p.id ? "border-2 border-primary bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{p.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.funcao || "Apoiador"} {p.municipio ? `• ${p.municipio}` : ""}
                    </span>
                  </div>
                  {pessoaId === p.id && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-primary-foreground" strokeWidth={4} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Ou informe um recebedor avulso:</p>
              <Input
                value={nomeNovoRecebedor}
                onChange={(e) => {
                  setNomeNovoRecebedor(e.target.value);
                  if (e.target.value) setPessoaId("");
                }}
                placeholder="Nome do recebedor..."
                className="bg-background"
              />
            </div>
          </div>
        )}

        {/* PASSO 2: MATERIAIS */}
        {passo === 2 && (
          <div className="space-y-5">
            {kitsCampanha.length > 0 && (
              <div>
                <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
                  Kits Pré-Configurados
                </p>
                <div className="space-y-2">
                  {kitsCampanha.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                    >
                      <Package className="size-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{k.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {k.itens.length} tipos de itens
                        </p>
                      </div>
                      <Stepper
                        value={kits[k.id] ?? 0}
                        onChange={(v) => setKits({ ...kits, [k.id]: v })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
                Itens e Materiais do Estoque
              </p>
              {materiaisCampanha.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum material cadastrado.</p>
                  <Link to="/materiais" className="text-xs text-primary font-bold mt-2 inline-block">
                    + Cadastrar Materiais
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {materiaisCampanha.map((m) => {
                    const temEstoque = m.estoque > 0;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          temEstoque ? "border-border bg-surface" : "border-border/50 bg-surface/40 opacity-70"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">{m.nome}</p>
                            <Badge 
                              variant={temEstoque ? "outline" : "destructive"} 
                              className="text-[9px] font-mono"
                            >
                              {temEstoque ? `${formatNumero(m.estoque)} ${m.unidade}` : "Sem Estoque"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{m.categoria}</p>
                        </div>
                        <Stepper
                          value={avulsos[m.id] ?? 0}
                          max={m.estoque > 0 ? m.estoque : undefined}
                          onChange={(v) => setAvulsos({ ...avulsos, [m.id]: v })}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASSO 3: CONFIRMAÇÃO */}
        {passo === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <h2 className="font-bold text-sm">Resumo da Saída</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Comitê de Origem:</span>
                  <span className="font-bold">{comite?.nome || "Não definido"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Recebedor:</span>
                  <span className="font-bold">{pessoa?.nome || nomeNovoRecebedor || "Não definido"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Itens:</span>
                  <span className="font-mono font-bold text-primary">{formatNumero(totalUnidades)} un</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xs uppercase text-muted-foreground">Itens a Baixar do Estoque:</p>
              {itensFinais.map((i, idx) => {
                const m = db.materiais.find((mat) => mat.id === i.material_id);
                return (
                  <div key={idx} className="flex justify-between items-center rounded-xl border border-border bg-surface p-3 text-xs">
                    <span className="font-semibold">{m?.nome || "Material"}</span>
                    <span className="font-mono font-black">{formatNumero(i.quantidade)} {m?.unidade || "un"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
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
              className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 active:scale-95"
            >
              Avançar
            </button>
          ) : (
            <button
              disabled={salvando || totalUnidades === 0}
              onClick={confirmar}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50 active:scale-95 shadow-md"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Confirmar e Baixar Estoque
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1">
      <button
        onClick={() => onChange(Math.max(0, value - 50))}
        className="flex size-7 items-center justify-center rounded-lg font-bold text-muted-foreground hover:bg-surface active:scale-95"
      >
        -50
      </button>
      <button
        onClick={() => onChange(Math.max(0, value - 10))}
        className="flex size-7 items-center justify-center rounded-lg font-bold text-muted-foreground hover:bg-surface active:scale-95"
      >
        -10
      </button>
      <Input
        type="number"
        min={0}
        max={max}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 w-16 text-center font-mono font-bold text-xs p-1"
      />
      <button
        onClick={() => onChange(value + 10)}
        className="flex size-7 items-center justify-center rounded-lg font-bold text-muted-foreground hover:bg-surface active:scale-95"
      >
        +10
      </button>
      <button
        onClick={() => onChange(value + 50)}
        className="flex size-7 items-center justify-center rounded-lg font-bold text-muted-foreground hover:bg-surface active:scale-95"
      >
        +50
      </button>
    </div>
  );
}
