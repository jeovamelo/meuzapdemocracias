import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, MapPin, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatNumero, type SaidaItem } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";

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
  const { db, registrarSaida } = useStore();
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [comiteId, setComiteId] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroUf, setFiltroUf] = useState(db.config.uf || "CE");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [kits, setKits] = useState<Record<string, number>>({});
  const [avulsos, setAvulsos] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);

  const pessoas = db.pessoas.filter((p) =>
    `${p.nome} ${p.funcao}`.toLowerCase().includes(busca.toLowerCase()),
  );

  const comitesFiltrados = db.comites.filter((c) => {
    const matchUf = !filtroUf || c.uf === filtroUf;
    const matchCidade = !filtroCidade || (c.municipio && c.municipio.toLowerCase().includes(filtroCidade.toLowerCase()));
    return matchUf && matchCidade;
  });

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
    (passo === 1 && !!pessoaId) ||
    (passo === 2 && itensFinais.length > 0) ||
    passo === 3;

  async function confirmar() {
    setSalvando(true);
    await registrarSaida({
      comite_id: comiteId,
      pessoa_id: pessoaId,
      kits: Object.entries(kits)
        .filter(([, q]) => q > 0)
        .map(([kit_id, quantidade]) => ({ kit_id, quantidade })),
      itens: itensFinais,
    });
    setSalvando(false);
    toast.success("Saída registrada e estoque abatido.");
    navigate({ to: "/saidas" });
  }

  const comite = db.comites.find((c) => c.id === comiteId);
  const pessoa = db.pessoas.find((p) => p.id === pessoaId);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-5 pt-8 pb-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link
            to="/saidas"
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Cancelar
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            PASSO 0{passo + 1}/04
          </span>
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
              De qual comitê o material sai?
            </p>
            {comitesFiltrados.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground text-center">
                Nenhum comitê encontrado para a localidade selecionada.
              </p>
            ) : (
              comitesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setComiteId(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
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

        {passo === 1 && (
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Quem está retirando?
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar apoiador ou responsável"
                className="h-12 rounded-xl bg-surface pl-9"
              />
            </div>
            {pessoas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPessoaId(p.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                  pessoaId === p.id ? "border-2 border-primary bg-primary/5" : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.funcao} - {p.zona}
                  </span>
                </div>
                {pessoaId === p.id && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary">
                    <span className="size-2 rounded-full bg-primary-foreground" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-5">
            <div>
              <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
                Kits pré-configurados
              </p>
              <div className="space-y-2">
                {db.kits.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <Package className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{k.nome}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {k.itens.length} tipos de item
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
            <div>
              <p className="mb-3 font-mono text-xs uppercase text-muted-foreground">
                Itens avulsos
              </p>
              <div className="space-y-2">
                {db.materiais.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{m.nome}</p>
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        disp. {formatNumero(m.estoque)} {m.unidade}
                      </p>
                    </div>
                    <Input
                      inputMode="numeric"
                      value={avulsos[m.id] || ""}
                      onChange={(e) =>
                        setAvulsos({ ...avulsos, [m.id]: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="h-10 w-20 text-center font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <Linha rotulo="Comitê de origem" valor={comite?.nome ?? "—"} />
              <Linha rotulo="Retirado por" valor={pessoa?.nome ?? "—"} />
              <Linha rotulo="Função" valor={pessoa?.funcao ?? "—"} />
              <Linha
                rotulo="Data / Hora"
                valor={new Date().toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <p className="border-b border-border px-4 py-3 font-mono text-xs uppercase text-muted-foreground">
                Material — {formatNumero(totalUnidades)} unidades
              </p>
              {itensFinais.map((i, idx) => {
                const m = db.materiais.find((x) => x.id === i.material_id);
                const kit = db.kits.find((k) => k.id === i.kit_id);
                const insuficiente = (m?.estoque ?? 0) < i.quantidade;
                return (
                  <div
                    key={`${i.material_id}-${idx}`}
                    className="flex items-center justify-between border-b border-border/60 px-4 py-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-bold">{m?.nome}</p>
                      {kit && (
                        <p className="text-[10px] uppercase text-primary">via {kit.nome}</p>
                      )}
                      {insuficiente && (
                        <p className="text-[10px] uppercase text-critical">
                          estoque insuficiente
                        </p>
                      )}
                    </div>
                    <p className="font-mono font-bold">{formatNumero(i.quantidade)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-24 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-5">
        {passo < 3 ? (
          <div className="flex gap-2">
            {passo > 0 && (
              <button
                onClick={() => setPasso(passo - 1)}
                className="rounded-xl border-2 border-border bg-background px-5 py-4 font-bold"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => setPasso(passo + 1)}
              disabled={!podeAvancar}
              className="flex-1 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setPasso(2)}
              className="rounded-xl border-2 border-border bg-background px-5 py-4 font-bold"
            >
              Voltar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-4 font-bold text-background shadow-lg disabled:opacity-60"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Confirmar Saída
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Diminuir"
        className="flex size-9 items-center justify-center rounded-lg border border-border font-bold"
      >
        −
      </button>
      <span className="w-6 text-center font-mono font-bold">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar"
        className="flex size-9 items-center justify-center rounded-lg border border-border font-bold"
      >
        +
      </button>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-xs uppercase text-muted-foreground">{rotulo}</span>
      <span className="text-sm font-bold">{valor}</span>
    </div>
  );
}
