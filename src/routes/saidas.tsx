import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero, formatData, formatHora } from "@/lib/db";
import { Package, MapPin, User, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/saidas")({
  head: () => ({
    meta: [
      { title: "Histórico de Saídas — Estoque de Campanha" },
      {
        name: "description",
        content: "Acompanhe a distribuição de materiais, status de entrega e metas por localidade.",
      },
    ],
  }),
  component: SaidasPage,
});

function SaidasPage() {
  const { db } = useStore();

  const getStatusEntrega = (comiteId: string, pessoaId: string) => {
    const comite = db.comites.find(c => c.id === comiteId);
    const pessoa = db.pessoas.find(p => p.id === pessoaId);
    const meta = pessoa?.meta_votos || comite?.meta_votos || 0;
    
    const enviado = db.saidas
      .filter(s => s.comite_id === comiteId || s.pessoa_id === pessoaId)
      .reduce((acc, s) => acc + s.itens.reduce((sum, i) => sum + i.quantidade, 0), 0);

    if (meta === 0) return { label: "Sem Meta", color: "bg-slate-100 text-slate-600" };
    if (enviado >= meta) return { label: "Suficiente", color: "bg-green-100 text-green-700" };
    return { label: "Déficit", color: "bg-amber-100 text-amber-700" };
  };

  return (
    <>
      <PageHeader
        eyebrow="Logística"
        title="Histórico de Saídas"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {db.saidas.length} REGISTROS
          </span>
        }
      />

      <div className="space-y-4 px-5 py-6 pb-20">
        {db.saidas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="size-12 text-muted-foreground/20" />
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma saída registrada.</p>
          </div>
        ) : (
          db.saidas.map((saida) => {
            const comite = db.comites.find((c) => c.id === saida.comite_id);
            const pessoa = db.pessoas.find((p) => p.id === saida.pessoa_id);
            const status = getStatusEntrega(saida.comite_id, saida.pessoa_id);
            const totalItens = saida.itens.reduce((acc, i) => acc + i.quantidade, 0);

            return (
              <article
                key={saida.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="size-3" />
                    {formatData(saida.criado_em)} às {formatHora(saida.criado_em)}
                  </div>
                  <Badge className={`rounded-full border-0 font-black uppercase text-[9px] ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>

                <div className="p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <MapPin className="size-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Origem</p>
                          <p className="text-sm font-bold leading-tight">{comite?.nome || "Comitê Excluído"}</p>
                          <p className="text-xs text-muted-foreground">{comite?.municipio}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <User className="size-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Destinatário / Liderança</p>
                          <p className="text-sm font-bold leading-tight">{pessoa?.nome || "Pessoa Excluída"}</p>
                          <p className="text-xs text-muted-foreground">{pessoa?.funcao} • {pessoa?.zona}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center rounded-xl bg-muted/20 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Distribuído</p>
                      <p className="mt-1 font-mono text-3xl font-black text-foreground">
                        {formatNumero(totalItens)}
                      </p>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
                        Unidades
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-border/50">
                    {saida.kits.map((k, idx) => {
                      const kit = db.kits.find(x => x.id === k.kit_id);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-0.5 text-[9px] font-bold uppercase">
                          <Package className="size-2.5" />
                          {k.quantidade}x {kit?.nome || "Kit"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
