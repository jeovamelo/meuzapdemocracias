import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  AlertTriangle,
  FileText,
  Flag,
  Shirt,
  Send,
  BarChart3,
  PieChart as PieChartIcon,
  Package,
  QrCode,
  Settings2,
  MapPin,
  Truck,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { formatNumero, isCritico, isHoje, pad2, type Material } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  MapaCalorDistribuicao,
  type DadosMunicipioDistribuicao,
} from "@/components/MapaCalorDistribuicao";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Central — Gestão e Logística de Campanha" },
      {
        name: "description",
        content:
          "Gestão Centralizada de Estoque, Logística e Mapa de Calor de Distribuição de Campanha.",
      },
      { property: "og:title", content: "Painel Central — Gestão e Logística" },
      {
        property: "og:description",
        content: "Dashboard administrativo com mapa de calor de distribuição por município.",
      },
    ],
  }),
  component: Dashboard,
});

const iconePorCategoria = (m: Material) => {
  if (m.categoria.includes("Adesivo")) return FileText;
  if (m.categoria.includes("Bandeira")) return Flag;
  if (
    m.categoria.includes("Santinho") ||
    m.categoria === "Santão" ||
    m.categoria === "Revista dobrada"
  )
    return FileText;
  if (m.categoria.includes("Banner")) return Flag;
  if (m.categoria.includes("Vestuário") || m.categoria === "Bóton") return Shirt;
  return Package;
};

const COLORS = ["var(--primary)", "var(--accent)", "#10b981", "#8b5cf6", "#f43f5e", "#0ea5e9"];

type CampaignHeaderData = {
  nomeUrna: string;
  numero: string;
  uf: string;
  cargo?: string;
};

function Dashboard() {
  const { db, ready } = useStore();
  const { campaign } = useCampaignScope();
  const [campaignHeader, setCampaignHeader] = useState<CampaignHeaderData | null>(null);

  useEffect(() => {
    let active = true;

    const fallback = campaign
      ? {
          nomeUrna: campaign.nomeUrna,
          numero: campaign.numero,
          uf: campaign.uf,
          cargo: campaign.cargo,
        }
      : null;

    if (!campaign?.id) {
      setCampaignHeader(fallback);
      return () => {
        active = false;
      };
    }

    async function loadCampaignHeader() {
      const { data, error } = await supabase
        .from("campaigns")
        .select("nome_urna, nr_candidato, uf, cargo")
        .eq("id", campaign.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setCampaignHeader(fallback);
        return;
      }

      setCampaignHeader({
        nomeUrna: data.nome_urna || fallback?.nomeUrna || "Campanha",
        numero: data.nr_candidato || fallback?.numero || "",
        uf: data.uf || fallback?.uf || "",
        cargo: (data as any)?.cargo || fallback?.cargo || "Estadual",
      });
    }

    void loadCampaignHeader();

    return () => {
      active = false;
    };
  }, [campaign?.id, campaign?.nomeUrna, campaign?.numero, campaign?.uf, campaign?.cargo]);

  const ufCampanha = campaignHeader?.uf || campaign?.uf || db.config.uf || "CE";
  const cargoCampanha = campaignHeader?.cargo || campaign?.cargo || "Estadual";

  // Filtro de saídas da campanha ativa
  const saidasCampanha = useMemo(() => {
    return (db.saidas || []).filter(
      (s) => !campaign?.id || !s.campaign_id || s.campaign_id === campaign.id
    );
  }, [db.saidas, campaign?.id]);

  // Agrupamento geográfico de saídas por município de destino
  const dadosDistribuicaoMunicipios = useMemo(() => {
    const res: Record<string, DadosMunicipioDistribuicao> = {};

    saidasCampanha.forEach((s) => {
      const pessoa = (db.pessoas || []).find((p) => p.id === s.pessoa_id);
      const comite = (db.comites || []).find((c) => c.id === s.comite_id);
      const cidade = (pessoa?.municipio || comite?.municipio || "Fortaleza").trim();
      const uf = pessoa?.uf || comite?.uf || ufCampanha;
      const totalItens = (s.itens || []).reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0);

      if (!res[cidade]) {
        res[cidade] = {
          municipio: cidade,
          uf,
          totalItens: 0,
          totalPedidos: 0,
          destinatarios: [],
        };
      }

      res[cidade].totalItens += totalItens;
      res[cidade].totalPedidos += 1;
      if (pessoa?.nome && !res[cidade].destinatarios.includes(pessoa.nome)) {
        res[cidade].destinatarios.push(pessoa.nome);
      }
    });

    return res;
  }, [saidasCampanha, db.pessoas, db.comites, ufCampanha]);

  const comitesAtivos = db.comites.filter(
    (c) => c.ativo && (!campaign?.id || !c.campaign_id || c.campaign_id === campaign.id)
  ).length;

  const apoiadores = db.pessoas.filter(
    (p) => !campaign?.id || !p.campaign_id || p.campaign_id === campaign.id
  ).length;

  const materiaisCampanha = db.materiais.filter(
    (m) => !campaign?.id || !m.campaign_id || m.campaign_id === campaign.id
  );

  const criticos = materiaisCampanha.filter(isCritico);

  const kitsHoje = saidasCampanha
    .filter((s) => isHoje(s.criado_em))
    .reduce((acc, s) => acc + (s.kits || []).reduce((a, k) => a + k.quantidade, 0), 0);

  const dashboardTitle = campaignHeader
    ? [campaignHeader.nomeUrna, campaignHeader.numero, campaignHeader.uf]
        .filter(Boolean)
        .join(" • ")
    : `Gestão ${ufCampanha}`;

  // Dados para Gráfico por Categoria (Estoque Total da Campanha)
  const dadosPorCategoria = useMemo(() => {
    return materiaisCampanha.reduce<{ name: string; value: number }[]>((acc, m) => {
      const index = acc.findIndex((d) => d.name === m.categoria);
      if (index > -1) {
        acc[index].value += m.estoque;
      } else {
        acc.push({ name: m.categoria, value: m.estoque });
      }
      return acc;
    }, []);
  }, [materiaisCampanha]);

  return (
    <div className="mx-auto w-full md:max-w-screen-xl relative pb-28 space-y-6">
      <PageHeader
        eyebrow="Painel Administrativo & Logística"
        title={dashboardTitle}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-xs text-muted-foreground md:inline">
              {ufCampanha}-LOG V2.0
            </span>
            <Link
              to="/whatsapp"
              aria-label="Configurações do WhatsApp da campanha"
              title="Configurações do WhatsApp da campanha"
              className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Settings2 className="size-4" />
            </Link>
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-surface font-mono text-xs font-bold text-primary">
              {ufCampanha}
            </div>
          </div>
        }
      />

      {/* CARDS DE KPIS SUPERIORES */}
      <div className="grid grid-cols-2 gap-3 px-5 md:grid-cols-4 md:gap-6">
        <Kpi label="Comitês Ativos" value={pad2(comitesAtivos)} />
        <Kpi label="Apoiadores" value={String(apoiadores)} />
        <Kpi label="Itens Críticos" value={pad2(criticos.length)} tone="critical" />
        <Kpi label="Kits Hoje" value={pad2(kitsHoje)} tone="primary" />
      </div>

      {/* MAPA DE CALOR GEORREFERENCIADO POR MUNICÍPIO */}
      <div className="px-5">
        <MapaCalorDistribuicao
          uf={ufCampanha}
          cargo={cargoCampanha}
          dados={dadosDistribuicaoMunicipios}
          titulo="Distribuição Geográfica de Saídas (Mapa de Calor)"
        />
      </div>

      {/* GRÁFICO DE COMPOSIÇÃO DO ESTOQUE E ALERTAS */}
      <div className="grid gap-6 px-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico de Categoria (Estoque Total) */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
            <PieChartIcon className="size-4 text-accent" />
            Composição do Estoque
          </h2>
          <div className="h-[280px] w-full">
            {dadosPorCategoria.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Nenhum material cadastrado.
              </div>
            ) : (
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
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-xl">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                              {payload?.[0]?.name || ""}
                            </p>
                            <p className="font-mono text-sm font-bold">
                              {formatNumero((payload?.[0]?.value || 0) as number)} unid.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
            {dadosPorCategoria.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-[10px] font-bold uppercase text-muted-foreground truncate">
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Movimentações */}
        <section className="rounded-2xl border border-border bg-surface p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Truck className="size-4 text-primary" /> Últimas Movimentações
              </h2>
              <Link to="/saidas" className="font-mono text-xs text-primary font-bold hover:underline">
                VER TODAS →
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl divide-y divide-border/60">
              {!ready ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : db.historico_estoque.length === 0 ? (
                <p className="py-6 text-xs text-muted-foreground text-center">
                  Nenhuma movimentação registrada ainda.
                </p>
              ) : (
                db.historico_estoque.slice(0, 4).map((m) => {
                  const material = db.materiais.find((mat) => mat.id === m.material_id);
                  const Icon = material ? iconePorCategoria(material) : Package;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/5 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex size-7 items-center justify-center rounded-lg shrink-0 ${
                            m.tipo === "ajuste_inventario"
                              ? "bg-accent/10 text-accent"
                              : m.diferenca > 0
                                ? "bg-green-100 text-green-600"
                                : "bg-critical/10 text-critical"
                          }`}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate leading-tight">{material?.nome ?? "Material"}</p>
                          <p className="text-[10px] text-muted-foreground uppercase truncate">
                            {m.tipo.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-mono text-xs font-bold ${
                            m.diferenca > 0 ? "text-green-600" : "text-critical"
                          }`}
                        >
                          {m.diferenca > 0 ? "+" : ""}
                          {m.diferenca}
                        </p>
                        <p className="text-[9px] uppercase text-muted-foreground">
                          Saldo: {m.quantidade_nova}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Alertas de Estoque */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
            <AlertTriangle className="size-4 text-critical" />
            Alertas de Estoque
          </h2>
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
            {criticos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Todos os itens de material estão acima do estoque mínimo.
              </div>
            ) : (
              criticos.map((m) => {
                const Icon = iconePorCategoria(m);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-critical/20 bg-critical/5 p-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-critical/10">
                      <Icon className="size-4 text-critical" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{m.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.categoria}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-critical">
                        {formatNumero(m.estoque)}
                      </p>
                      <p className="text-[9px] uppercase text-muted-foreground">
                        Mín: {formatNumero(m.estoque_minimo)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* BOTÕES FLUTUANTES DE AÇÃO RÁPIDA */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 md:bottom-8 md:right-8 z-20">
        <Link
          to="/saidas/nova"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-2xl transition-transform active:scale-95 md:h-14 md:w-auto md:rounded-xl md:px-5 md:gap-2.5"
        >
          <Plus className="size-5" strokeWidth={3} />
          <span className="hidden md:inline font-bold text-xs">Nova Saída</span>
        </Link>
        <Link
          to="/bu"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-2xl transition-transform active:scale-[0.98] md:h-14 md:w-auto md:rounded-xl md:px-5 md:gap-2.5"
        >
          <QrCode className="size-5" />
          <span className="hidden md:inline font-bold text-xs">Leitor BU</span>
        </Link>

        <Link
          to="/public/cadastro"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-[0.98] md:h-14 md:w-auto md:rounded-xl md:px-5 md:gap-2.5"
        >
          <Send className="size-5" />
          <span className="hidden md:inline font-bold text-xs">Link Apoiador</span>
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
  const text = tone === "critical" ? "text-critical" : tone === "primary" ? "text-primary" : "";
  const labelColor =
    tone === "critical"
      ? "text-critical"
      : tone === "primary"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div className={`rounded-2xl border p-4 md:p-6 ${box}`}>
      <span className={`text-[10px] md:text-[11px] font-semibold uppercase ${labelColor}`}>
        {label}
      </span>
      <div className={`mt-1 font-mono text-3xl md:text-5xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
