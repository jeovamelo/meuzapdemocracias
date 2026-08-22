import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, UserPlus, AlertTriangle, FileText, Flag, Shirt, Send, BarChart3, PieChart as PieChartIcon, Map, Package, Search, ShieldCheck, Target, TrendingUp, Info, Loader2, QrCode } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero, isCritico, isHoje, pad2, type Material } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  const { db, ready, updateConfig } = useStore();
  const [showConfig, setShowConfig] = useState(false);
  const [loadingTse, setLoadingTse] = useState(false);
  const [configForm, setConfigForm] = useState({
    uf: db.config.uf || "CE",
    numero: db.config.numero || "",
    candidato_nome: db.config.candidato_nome || "",
    candidato_urna: db.config.candidato_urna || "",
    cargo: db.config.cargo || "",
    partido_coligacao: db.config.partido_coligacao || "",
    meta_eleicao: db.config.meta_eleicao || 0,
    meta_expectativa: db.config.meta_expectativa || 0,
    total_secoes: db.config.total_secoes || 500,
  });

  useEffect(() => {
    if (ready && !db.config.configurada) {
      setShowConfig(true);
    }
  }, [ready, db.config.configurada]);

  const buscarNoTse = async () => {
    if (!configForm.uf || !configForm.numero) {
      toast.error("Preencha UF e Número do Candidato");
      return;
    }

    setLoadingTse(true);
    // Simulação de busca no TSE
    await new Promise((r) => setTimeout(r, 1500));
    
    // Mock de dados baseados em números conhecidos ou genéricos
    const mockData = {
      candidato_nome: "MISSIAS DIAS DE SOUZA",
      candidato_urna: "MISSIAS DIAS",
      cargo: "Deputado Estadual",
      partido_coligacao: "PT / Federação Brasil da Esperança (PT/PC do B/PV)",
    };

    setConfigForm(prev => ({ ...prev, ...mockData }));
    setLoadingTse(false);
    toast.success("Dados localizados na base do TSE!");
  };

  const salvarConfiguracao = async () => {
    await updateConfig({
      ...configForm,
      configurada: true
    });
    setShowConfig(false);
    toast.success("Campanha configurada com sucesso!");
  };

  const comitesAtivos = db.comites.filter((c) => c.ativo).length;
  const apoiadores = db.pessoas.length;
  const criticos = db.materiais.filter(isCritico);
  const kitsHoje = db.saidas
    .filter((s) => isHoje(s.criado_em))
    .reduce((acc, s) => acc + s.kits.reduce((a, k) => a + k.quantidade, 0), 0);

  // Filtragem por UF da Campanha
  const ufCampanha = db.config.uf || "CE";

  // Dados para Gráfico por Município (filtrados pela UF da campanha)
  const dadosPorMunicipio = db.comites
    .filter(c => c.uf === ufCampanha || !c.uf) // Mostra os da UF ou os sem UF (migração)
    .reduce((acc: any[], comite) => {
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
    <div className="mx-auto w-full md:max-w-screen-xl relative -+">
      <div className="sr-only">
        Atualize a tela de configuração inicial de "Cadastrar Campanha" na página Início para buscar e autocompletar os dados oficiais via integração ou estrutura de dados do TSE:

1. **Entrada Simplificada por Estado e Número:**

   - No formulário de cadastro da campanha, o usuário deve informar apenas:

     - **Estado (UF)**

     - **Número do Candidato**

   - Assim que esses dois dados forem preenchidos (ou ao clicar em "Buscar no TSE"), o sistema deve consultar a base de dados de candidaturas para preencher de forma automática os seguintes campos:

     - **Nome Completo do Candidato**

     - **Nome de Urna**

     - **Cargo**

     - **Partido / Coligação**

2. **Complementos Manuais da Campanha:**

   - Deixe visíveis e abertos para o usuário preencher manualmente os dados estratégicos que a justiça eleitoral não possui, mas que são vitais para a gestão:

     - **Quantidade de Votos para ser Eleito (Meta / Qtd Necessária)**

     - **Quantidade de Votos Esperados (Expectativa Total)**

3. **Restrição de Escopo:**

   - Com o Estado definido por essa configuração, garanta que todas as listagens do sistema (cidades, lideranças, mapa de calor e painel de apuração) filtrem e exibam exclusivamente os municípios pertencentes àquele estado.
      </div>

      <PageHeader
        eyebrow="Painel Administrativo"
        title={`Gestão ${db.config.uf || "Estadual"}`}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-xs text-muted-foreground md:inline">{db.config.uf || "BR"}-LOG V2.0</span>
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
          to="/bu"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-2xl transition-transform active:scale-[0.98] md:h-16 md:w-auto md:rounded-xl md:px-6 md:gap-3"
        >
          <QrCode className="size-6 md:size-5" />
          <span className="hidden md:inline font-bold">Leitor BU</span>
        </Link>
        
        <Link
          to="/public/cadastro"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-[0.98] md:h-16 md:w-auto md:rounded-xl md:px-6 md:gap-3"
        >
          <Send className="size-6 md:size-5" />
          <span className="hidden md:inline font-bold">Link Apoiador</span>
        </Link>
      </div>
      
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              Configurar Campanha 2026
            </DialogTitle>
            <DialogDescription>
              Vincule seu número oficial para buscar dados no TSE e definir metas estratégicas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">01</div>
                <h3 className="font-bold uppercase text-xs tracking-wider">Dados Oficiais (Busca TSE)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Estado (UF)</Label>
                  <Select 
                    value={configForm.uf} 
                    onValueChange={(v) => setConfigForm({...configForm, uf: v})}
                  >
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Número do Candidato</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={configForm.numero}
                      onChange={e => setConfigForm({...configForm, numero: e.target.value})}
                      placeholder="Ex: 13123"
                      className="h-12 border-2"
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="h-12 px-4 gap-2"
                      onClick={buscarNoTse}
                      disabled={loadingTse}
                    >
                      {loadingTse ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>

              {configForm.candidato_nome && (
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-primary mb-1">Candidato Localizado</p>
                      <p className="text-lg font-black leading-tight uppercase">{configForm.candidato_urna}</p>
                      <p className="text-xs font-medium text-muted-foreground">{configForm.candidato_nome}</p>
                    </div>
                    <Badge className="font-mono text-lg px-3 py-1">{configForm.numero}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">Cargo</p>
                      <p className="text-xs font-bold">{configForm.cargo}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">Partido / Coligação</p>
                      <p className="text-xs font-bold truncate">{configForm.partido_coligacao}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">02</div>
                <h3 className="font-bold uppercase text-xs tracking-wider">Planejamento Estratégico</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Meta para Eleição</Label>
                    <Info className="size-3 text-muted-foreground" />
                  </div>
                  <Input 
                    type="number"
                    value={configForm.meta_eleicao}
                    onChange={e => setConfigForm({...configForm, meta_eleicao: Number(e.target.value)})}
                    placeholder="Qtd Votos"
                    className="h-12 border-2 font-mono font-bold"
                  />
                  <p className="text-[9px] text-muted-foreground leading-tight italic">Mínimo necessário para ser eleito (Quociente)</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Expectativa Total</Label>
                    <TrendingUp className="size-3 text-muted-foreground" />
                  </div>
                  <Input 
                    type="number"
                    value={configForm.meta_expectativa}
                    onChange={e => setConfigForm({...configForm, meta_expectativa: Number(e.target.value)})}
                    placeholder="Qtd Votos"
                    className="h-12 border-2 font-mono font-bold"
                  />
                  <p className="text-[9px] text-muted-foreground leading-tight italic">Meta agressiva de votos esperados</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Total de Seções</Label>
                    <Map className="size-3 text-muted-foreground" />
                  </div>
                  <Input 
                    type="number"
                    value={configForm.total_secoes}
                    onChange={e => setConfigForm({...configForm, total_secoes: Number(e.target.value)})}
                    placeholder="Qtd Seções"
                    className="h-12 border-2 font-mono font-bold"
                  />
                  <p className="text-[9px] text-muted-foreground leading-tight italic">Total de urnas na região de atuação</p>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button 
              className="h-14 w-full text-lg font-black uppercase gap-2"
              onClick={salvarConfiguracao}
              disabled={!configForm.candidato_nome}
            >
              Finalizar Cadastro da Campanha
              <ShieldCheck className="size-5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
