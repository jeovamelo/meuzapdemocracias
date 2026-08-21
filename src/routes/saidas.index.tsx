import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatData, formatHora, formatNumero, isHoje } from "@/lib/db";

export const Route = createFileRoute("/saidas/")({
  head: () => ({
    meta: [
      { title: "Histórico de Saídas — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Histórico completo de saídas de material: quem retirou, de qual comitê, kits e itens com data e hora.",
      },
      { property: "og:title", content: "Histórico de Saídas — Estoque de Campanha" },
      {
        property: "og:description",
        content: "Cada retirada registrada com responsável, comitê, itens e horário.",
      },
    ],
  }),
  component: SaidasPage,
});

function SaidasPage() {
  const { db } = useStore();

  return (
    <>
      <PageHeader
        eyebrow="Distribuição"
        title="Saídas"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {db.saidas.length} REGISTROS
          </span>
        }
      />

      <div className="px-5 py-6">
        <Link
          to="/saidas/nova"
          className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-5 text-lg font-bold text-background shadow-lg transition-transform active:scale-95"
        >
          Nova Saída de Material
          <span className="rounded bg-background/20 px-2 py-1">
            <Plus className="size-4" strokeWidth={3} />
          </span>
        </Link>
      </div>

      <div className="space-y-2 px-5 pb-10">
        {db.saidas.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            Nenhuma saída registrada.
          </p>
        )}
        {db.saidas.map((s) => {
          const pessoa = db.pessoas.find((p) => p.id === s.pessoa_id);
          const comite = db.comites.find((c) => c.id === s.comite_id);
          return (
            <article
              key={s.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="flex items-start justify-between p-4">
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ArrowRightLeft className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold leading-tight">{pessoa?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{comite?.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pessoa?.funcao} • {pessoa?.zona}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">{formatHora(s.criado_em)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {isHoje(s.criado_em) ? "Hoje" : formatData(s.criado_em)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border bg-background/50 px-4 py-2">
                {s.kits.map((k) => {
                  const kit = db.kits.find((x) => x.id === k.kit_id);
                  return (
                    <span
                      key={k.kit_id}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary"
                    >
                      {kit?.nome ?? "Kit"} x{k.quantidade}
                    </span>
                  );
                })}
                {s.itens
                  .filter((i) => !i.kit_id)
                  .map((i) => {
                    const m = db.materiais.find((x) => x.id === i.material_id);
                    return (
                      <span
                        key={i.material_id}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase"
                      >
                        {m?.nome ?? "Item"} x{formatNumero(i.quantidade)}
                      </span>
                    );
                  })}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
