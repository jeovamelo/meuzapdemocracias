import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero, type Comite } from "@/lib/db";
import { 
  Target, 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle,
  Map as MapIcon,
  ChevronRight,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from "recharts";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";

export const Route = createFileRoute("/potencial")({
  head: () => ({
    meta: [
      { title: "Inteligência Eleitoral — Painel Estratégico" },
      {
        name: "description",
        content: "Análise de metas, potencial de voto e eficiência de distribuição.",
      },
    ],
  }),
  component: PotencialEleitoral,
});

function PotencialEleitoral() {
  const { db } = useStore();

  // Cálculo de metas por comitê/cidade
  const dadosDesempenho = db.comites.map(comite => {
    const meta = comite.meta_votos || 0;
    const conquistados = comite.meta_votos_conquistados || 0;
    const porcentagem = meta > 0 ? (conquistados / meta) * 100 : 0;
    
    // Eficiência de Distribuição: Materiais enviados vs Meta
    const totalMateriais = db.saidas
      .filter(s => s.comite_id === comite.id)
      .reduce((acc, s) => acc + s.itens.reduce((sum, i) => sum + i.quantidade, 0), 0);
    
    // Métrica: itens por voto esperado
    const itensPorVoto = meta > 0 ? totalMateriais / meta : 0;
    
    // Status de eficiência (alerta de desperdício se itensPorVoto > 10 e conquistados < 10%)
    let statusEficiencia: 'ideal' | 'alerta' | 'critico' = 'ideal';
    if (itensPorVoto > 15 && porcentagem < 20) statusEficiencia = 'critico';
    else if (itensPorVoto > 10) statusEficiencia = 'alerta';

    return {
      ...comite,
      meta,
      conquistados,
      porcentagem,
      totalMateriais,
      itensPorVoto,
      statusEficiencia
    };
  }).sort((a, b) => b.porcentagem - a.porcentagem);

  const metaTotalEstadual = db.comites.reduce((acc, c) => acc + (c.meta_votos || 0), 0);
  const conquistadosTotal = db.comites.reduce((acc, c) => acc + (c.meta_votos_conquistados || 0), 0);
  const porcentagemEstadual = metaTotalEstadual > 0 ? (conquistadosTotal / metaTotalEstadual) * 100 : 0;

  return (
    <div className="mx-auto w-full md:max-w-screen-xl">
      <PageHeader
        eyebrow="Inteligência Eleitoral"
        title="Painel Estratégico"
      />

      <div className="grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-3">
        <MetricCard 
          label="Meta Estadual" 
          value={formatNumero(metaTotalEstadual)} 
          subValue={`${formatNumero(conquistadosTotal)} conquistados`}
          progress={porcentagemEstadual}
          icon={Target}
        />
        <MetricCard 
          label="Atingimento Global" 
          value={`${porcentagemEstadual.toFixed(1)}%`} 
          subValue="Média do Estado"
          progress={porcentagemEstadual}
          icon={TrendingUp}
          tone="primary"
        />
        <MetricCard 
          label="Eficiência Média" 
          value="8.4" 
          subValue="Itens por voto"
          progress={84}
          icon={Package}
          tone="accent"
        />
      </div>

      <div className="px-5 py-2">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
          <MapIcon className="size-4 text-primary" />
          Mapa de Calor Ceará (Simulado)
        </h2>
        
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-surface md:aspect-[21/9]">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <MapIcon className="size-64" />
          </div>
          
          {/* Mock de pontos interativos no mapa */}
          {dadosDesempenho.map((c, i) => (
            <div 
              key={c.id}
              className="absolute"
              style={{ 
                left: `${20 + (i * 15) % 60}%`, 
                top: `${30 + (i * 20) % 50}%` 
              }}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className={`size-6 animate-pulse rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 ${
                      c.statusEficiencia === 'critico' ? 'bg-critical' : 
                      c.porcentagem > 50 ? 'bg-green-500' : 'bg-primary'
                    }`}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="center">
                  <div className="border-b border-border bg-muted/50 p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">{c.municipio}</p>
                    <h3 className="text-sm font-bold">{c.nome}</h3>
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Meta</p>
                        <p className="font-mono text-xs font-bold">{formatNumero(c.meta)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Conquistado</p>
                        <p className="font-mono text-xs font-bold">{formatNumero(c.conquistados)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[9px] font-bold uppercase">
                        <span>Eficiência</span>
                        <span className={c.statusEficiencia === 'critico' ? 'text-critical' : ''}>
                          {c.itensPorVoto.toFixed(1)} itens/voto
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className={`h-full transition-all ${c.statusEficiencia === 'critico' ? 'bg-critical' : 'bg-primary'}`}
                          style={{ width: `${Math.min(c.porcentagem, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ))}
          
          <div className="absolute bottom-4 right-4 rounded-lg bg-background/80 p-2 text-[9px] font-bold backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-green-500" /> <span>Meta {" > "} 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-primary" /> <span>Em progresso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-critical" /> <span>Alerta Eficiência</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-8">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
          <TrendingUp className="size-4 text-accent" />
          Ranking de Desempenho Regional
        </h2>

        <div className="h-[400px] w-full rounded-2xl border border-border bg-surface p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosDesempenho} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                dataKey="municipio" 
                type="category" 
                width={100} 
                tick={{ fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    if (!data) return null;
                    return (
                      <div className="rounded-lg border border-border bg-background p-3 shadow-xl">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">{data.municipio}</p>
                        <p className="font-mono text-sm font-bold">{data.porcentagem.toFixed(1)}% da meta</p>
                        <p className="text-[10px] text-muted-foreground">{formatNumero(data.conquistados)} / {formatNumero(data.meta)} votos</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="porcentagem" radius={[0, 4, 4, 0]} barSize={24}>
                {dadosDesempenho.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.porcentagem > 50 ? '#10b981' : 'var(--primary)'} 
                  />
                ))}
              </Bar>
              <ReferenceLine x={50} stroke="#666" strokeDasharray="3 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-12">
        <h2 className="text-sm font-extrabold uppercase tracking-wider">
          Lideranças e Metas Individuais
        </h2>
        {db.pessoas.filter(p => p.meta_votos).map(lider => {
          const atingimento = (lider.meta_votos_conquistados || 0) / (lider.meta_votos || 1) * 100;
          return (
            <div 
              key={lider.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{lider.nome}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                    {lider.municipio}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.min(atingimento, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold">
                  {formatNumero(lider.meta_votos_conquistados || 0)}
                </p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">
                  Alvo: {formatNumero(lider.meta_votos || 0)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  subValue, 
  progress, 
  icon: Icon, 
  tone = "neutral" 
}: { 
  label: string; 
  value: string; 
  subValue: string; 
  progress: number;
  icon: any;
  tone?: "neutral" | "primary" | "accent";
}) {
  const colors = {
    neutral: "text-muted-foreground bg-muted/20",
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon className="size-5" />
        </div>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono text-3xl font-bold">{value}</div>
      <p className="mb-4 text-[10px] font-bold uppercase text-muted-foreground">{subValue}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div 
          className={`h-full transition-all ${tone === 'primary' ? 'bg-primary' : tone === 'accent' ? 'bg-accent' : 'bg-foreground'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
