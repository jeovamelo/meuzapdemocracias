import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, UserPlus, AlertTriangle, FileText, Flag, Shirt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero, isCritico, isHoje, pad2, type Material } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Logístico — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Painel de controle da logística de campanha: comitês ativos, apoiadores, estoque crítico e kits distribuídos no dia.",
      },
      { property: "og:title", content: "Painel Logístico — Estoque de Campanha" },
      {
        property: "og:description",
        content:
          "Controle de estoque, kits e distribuição de material de campanha direto do celular.",
      },
    ],
  }),
  component: Dashboard,
});

const iconePorCategoria = (m: Material) =>
  m.categoria === "Papelaria" ? FileText : m.categoria === "Grande Formato" ? Flag : Shirt;

function Dashboard() {
  const { db, ready } = useStore();

  const comitesAtivos = db.comites.filter((c) => c.ativo).length;
  const apoiadores = db.pessoas.length;
  const criticos = db.materiais.filter(isCritico);
  const kitsHoje = db.saidas
    .filter((s) => isHoje(s.criado_em))
    .reduce((acc, s) => acc + s.kits.reduce((a, k) => a + k.quantidade, 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Logística de Campo"
        title="Dashboard"
        right={
          <div className="flex size-10 items-center justify-center rounded-full border border-border bg-surface font-mono text-xs font-bold">
            OP-04
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 px-5 py-6">
        <Kpi label="Comitês Ativos" value={pad2(comitesAtivos)} />
        <Kpi label="Apoiadores" value={String(apoiadores)} />
        <Kpi
          label="Itens Críticos"
          value={pad2(criticos.length)}
          tone="critical"
        />
        <Kpi label="Kits Hoje" value={pad2(kitsHoje)} tone="primary" />
      </div>

      <div className="space-y-3 px-5">
        <Link
          to="/saidas/nova"
          className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-5 text-lg font-bold text-background shadow-lg transition-transform active:scale-95"
        >
          Nova Saída de Material
          <span className="rounded bg-background/20 px-2 py-1">
            <Plus className="size-4" strokeWidth={3} />
          </span>
        </Link>
        <Link
          to="/pessoas"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border py-4 font-semibold"
        >
          <UserPlus className="size-4" />
          Novo Cadastro
        </Link>
        <Link
          to="/cadastro"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 py-4 font-bold text-primary"
        >
          <Send className="size-4" />
          Link de Auto-Cadastro
        </Link>
      </div>

      <section className="mt-10 animate-slide-up px-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider">
            Últimas Saídas
          </h2>
          <Link to="/saidas" className="font-mono text-xs text-muted-foreground">
            VER TUDO
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {!ready ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : db.saidas.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma saída registrada ainda.
            </p>
          ) : (
            db.saidas.slice(0, 3).map((s) => {
              const pessoa = db.pessoas.find((p) => p.id === s.pessoa_id);
              const comite = db.comites.find((c) => c.id === s.comite_id);
              const totalItens = s.itens.reduce((a, i) => a + i.quantidade, 0);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-border/60 p-4 last:border-0"
                >
                  <div>
                    <p className="font-bold leading-tight">{pessoa?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{comite?.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold">
                      {formatNumero(totalItens)} itens
                    </p>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {s.kits.reduce((a, k) => a + k.quantidade, 0)} kits
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-10 px-5 pb-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
          <AlertTriangle className="size-4 text-critical" />
          Alertas de Estoque
        </h2>
        <div className="space-y-2">
          {criticos.length === 0 && (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
              Todo o estoque está acima do mínimo.
            </p>
          )}
          {criticos.map((m) => {
            const Icon = iconePorCategoria(m);
            return (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded bg-critical/10">
                  <Icon className="size-5 text-critical" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-tight">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.categoria}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-critical">
                    {formatNumero(m.estoque)}
                  </p>
                  <p className="text-[9px] uppercase text-muted-foreground">
                    Mín: {formatNumero(m.estoque_minimo)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "primary" | "critical";
}) {
  const box =
    tone === "critical"
      ? "bg-critical/5 border-critical/20"
      : tone === "primary"
        ? "bg-primary/5 border-primary/20"
        : "bg-surface border-border";
  const text =
    tone === "critical" ? "text-critical" : tone === "primary" ? "text-primary" : "";
  const labelColor =
    tone === "critical"
      ? "text-critical"
      : tone === "primary"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div className={`rounded-xl border p-4 ${box}`}>
      <span className={`text-[11px] font-semibold uppercase ${labelColor}`}>{label}</span>
      <div className={`mt-1 font-mono text-3xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
