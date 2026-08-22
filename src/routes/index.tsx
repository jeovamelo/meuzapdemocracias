import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, UserPlus, AlertTriangle, FileText, Flag, Shirt, Send, BarChart3, PieChart as PieChartIcon, Map, Package } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero, isCritico, isHoje, pad2, type Material } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Central — Gestão Ceará" },
      {
        name: "description",
        content:
          "Gestão Centralizada de Estoque e Logística de Campanha Eleitoral no Estado do Ceará.",
      },
      { property: "og:title", content: "Painel Central — Gestão Ceará" },
      {
        property: "og:description",
        content:
          "Dashboard administrativo para controle estadual de logística de campanha.",
      },
    ],
  }),
  component: Dashboard,
});

const iconePorCategoria = (m: Material) => {
  if (m.categoria.includes("Adesivo")) return FileText;
  if (m.categoria.includes("Bandeira")) return Flag;
  if (m.categoria.includes("Santinho") || m.categoria === "Santão" || m.categoria === "Revista dobrada") return FileText;
  if (m.categoria.includes("Banner")) return Flag;
  if (m.categoria.includes("Vestuário") || m.categoria === "Bóton") return Shirt;
  return Package;
};

const COLORS = ["var(--primary)", "var(--accent)", "#10b981", "#8b5cf6", "#f43f5e"];

function Dashboard() {
  const { db, ready } = useStore();

  const comitesAtivos = db.comites.filter((c) => c.ativo).length;
  const apoiadores = db.pessoas.length;
  const criticos = db.materiais.filter(isCritico);
  const kitsHoje = db.saidas
    .filter((s) => isHoje(s.criado_em))
    .reduce((acc, s) => acc + s.kits.reduce((a, k) => a + k.quantidade, 0), 0);

  // Dados para Gráfico por Município
  const dadosPorMunicipio = db.comites.reduce((acc: any[], comite) => {
    const totalSaidas = db.saidas
      .filter((s) => s.comite_id === comite.id)
      .reduce((t, s) => t + s.itens.reduce((sum, i) => sum + i.quantidade, 0), 0);
    
    const index = acc.findIndex(d => d.name === comite.municipio);
    if (index > -1) {
      acc[index].total += totalSaidas;
    } else {
      acc.push({ name: comite.municipio, total: totalSaidas });
    }
    return acc;
  }, []).sort((a, b) => b.total - a.total);

  // Dados para Gráfico por Categoria
  const dadosPorCategoria = db.materiais.reduce((acc: any[], m) => {
    const index = acc.findIndex(d => d.name === m.categoria);
    if (index > -1) {
      acc[index].value += m.estoque;
    } else {
      acc.push({ name: m.categoria, value: m.estoque });
    }
    return acc;
  }, []);

  return (
    <div className="mx-auto w-full md:max-w-screen-xl relative">
      <div className="sr-only">
        Atualize a aba/formulário público de **"Comitê Popular"** com as seguintes regras de negócio e ordem de campos:

1. **WhatsApp como Primeiro Campo:**

   - O primeiro campo do formulário de cadastro de comitê popular deve ser obrigatoriamente o **Número do WhatsApp** do responsável.

   - Ao preencher o número do WhatsApp, o sistema deve verificar automaticamente na base de dados de pessoas/apoiadores:

     - Se o número **já estiver cadastrado**, exiba o nome e os dados já existentes, permitindo avançar para o endereço.

     - Se o número **não estiver cadastrado**, exiba um aviso amigável informando que o responsável precisa estar cadastrado primeiro, bloqueando o envio até que o cadastro prévio seja feito (ou solicitando o nome e dados básicos na mesma hora).

2. **Endereço Completo e CEP:**

   - Logo após a validação do responsável via WhatsApp, exiba os campos de **CEP** (com busca automática via ViaCEP), **Endereço**, **Número**, **Bairro/Zona** e **Ponto de Referência**.

3. **Validação do Administrator:**

   - Mantenha o fluxo onde o comitê popular cadastrado fica com status pendente até que o administrador aprove no painel interno.x'
      </div>

      <PageHeader
        eyebrow="Painel Administrativo"
        title="Gestão Ceará"
        right={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-xs text-muted-foreground md:inline">CE-LOG V2.0</span>
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-surface font-mono text-xs font-bold">
              HQ
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 px-5 py-6 md:grid-cols-4 md:gap-6">
        <Kpi label="Comitês Ativos" value={pad2(comitesAtivos)} />
        <Kpi label="Apoiadores" value={String(apoiadores)} />
        <Kpi
          label="Itens Críticos"
          value={pad2(criticos.length)}
          tone="critical"
        />
        <Kpi label="Kits Hoje" value={pad2(kitsHoje)} tone="primary" />
      </div>

      <div className="grid gap-6 px-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico de Distribuição por Município */}
        <div className="rounded-2xl border border-border bg-surface p-6 md:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
              <BarChart3 className="size-4 text-primary" />
              Distribuição por Município
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorMunicipio} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-xl">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">{payload?.[0]?.payload?.name || ""}</p>
                          <p className="font-mono text-sm font-bold">{formatNumero((payload?.[0]?.value || 0) as number)} itens</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Categoria (Estoque Total) */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
            <PieChartIcon className="size-4 text-accent" />
            Composição do Estoque
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPorCategoria}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dadosPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || "#ccc"} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-xl">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">{payload?.[0]?.name || ""}</p>
                          <p className="font-mono text-sm font-bold">{formatNumero((payload?.[0]?.value || 0) as number)} unid.</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {dadosPorCategoria.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 md:grid-cols-2">
        <section className="animate-slide-up">
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
              db.saidas.slice(0, 5).map((s) => {
                const pessoa = db.pessoas.find((p) => p.id === s.pessoa_id);
                const comite = db.comites.find((c) => c.id === s.comite_id);
                const totalItens = s.itens.reduce((a, i) => a + i.quantidade, 0);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-border/60 p-4 last:border-0 hover:bg-muted/5 transition-colors"
                  >
                    <div>
                      <p className="font-bold leading-tight">{pessoa?.nome ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{comite?.nome} • {comite?.municipio}</p>
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

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
            <AlertTriangle className="size-4 text-critical" />
            Alertas de Estoque
          </h2>
          <div className="space-y-2">
            {criticos.length === 0 && (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                Todo o estoque está acima do mínimo.
              </p>
            )}
            {criticos.map((m) => {
              const Icon = iconePorCategoria(m);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3"
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
      </div>

      <div className="fixed bottom-24 right-6 flex flex-col gap-3 md:bottom-8 md:right-8">
        <Link
          to="/saidas/nova"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-2xl transition-transform active:scale-95 md:h-16 md:w-auto md:rounded-xl md:px-6 md:gap-3"
        >
          <Plus className="size-6 md:size-5" strokeWidth={3} />
          <span className="hidden md:inline font-bold">Nova Saída</span>
        </Link>
        
        <Link
          to="/public/cadastro"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-[0.98] md:h-16 md:w-auto md:rounded-xl md:px-6 md:gap-3"
        >
          <Send className="size-6 md:size-5" />
          <span className="hidden md:inline font-bold">Link Apoiador</span>
        </Link>
      </div>
    </div>
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
    <div className={`rounded-2xl border p-4 md:p-6 ${box}`}>
      <span className={`text-[10px] md:text-[11px] font-semibold uppercase ${labelColor}`}>{label}</span>
      <div className={`mt-1 font-mono text-3xl md:text-5xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
