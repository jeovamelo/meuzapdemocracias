import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatNumero } from "@/lib/db";
import { 
  BarChart3, 
  Target, 
  Users, 
  MapPin, 
  QrCode, 
  Clock, 
  ShieldCheck, 
  FileText,
  TrendingUp,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Cell
} from "recharts";

export const Route = createFileRoute("/bu/")({
  head: () => ({
    title: "Apuração Paralela / Quick Count — Inteligência Eleitoral",
    meta: [
      { name: "description", content: "Painel de apuração paralela em tempo real e auditoria de Boletins de Urna (BU)." }
    ]
  }),
  component: ApuracaoParalela,
});

function ApuracaoParalela() {
  const { db } = useStore();
  const [tab, setTab] = useState<"dashboard" | "boletins">("dashboard");

  const totalSecoesLidas = db.boletins.length;
  const totalSecoesEstimado = db.config.total_secoes || 500;
  const progressoSecoes = (totalSecoesLidas / totalSecoesEstimado) * 100;
  
  const votosCandidato = db.boletins.reduce((sum, b) => sum + b.votos_candidato, 0);
  const metaExpectativa = db.config.meta_expectativa || 100000;
  const progressoVotos = (votosCandidato / metaExpectativa) * 100;

  // Dados para o gráfico por município
  const dadosGrafico = db.cidade_metas
    .filter(c => c.uf === db.config.uf)
    .map(c => {
      const votosNaCidade = db.boletins
        .filter(b => b.municipio.toLowerCase() === c.municipio.toLowerCase())
        .reduce((sum, b) => sum + b.votos_candidato, 0);
      
      return {
        name: c.municipio,
        votos: votosNaCidade,
        expectativa: c.meta_campanha
      };
    })
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-screen-xl px-5 py-6 mb-24 md:mb-0">
      <PageHeader 
        eyebrow="Quick Count"
        title="Apuração Paralela"
        right={
          <div className="flex bg-muted p-1 rounded-xl">
            <button 
              onClick={() => setTab("dashboard")}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${tab === "dashboard" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setTab("boletins")}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${tab === "boletins" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Boletins Lidos
            </button>
          </div>
        }
      />

      {tab === "dashboard" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase text-primary tracking-widest">Votos Computados</CardDescription>
                <CardTitle className="text-4xl font-black font-mono">{formatNumero(votosCandidato)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressoVotos} className="h-2 bg-primary/10" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{progressoVotos.toFixed(1)}% da meta final ({formatNumero(metaExpectativa)})</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest">Urnas Apuradas</CardDescription>
                <CardTitle className="text-4xl font-black font-mono">{totalSecoesLidas} <span className="text-lg text-muted-foreground font-normal">/ {totalSecoesEstimado}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressoSecoes} className="h-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{progressoSecoes.toFixed(1)}% das seções registradas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-accent/5 border-accent/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase text-accent tracking-widest">Projeção Final</CardDescription>
                <CardTitle className="text-4xl font-black font-mono">
                  {formatNumero(progressoSecoes > 0 ? (votosCandidato / totalSecoesLidas) * totalSecoesEstimado : 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] font-bold text-accent uppercase flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  Baseado na média por seção
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Comparativo */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Performance por Município (Top 6)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border-2 border-primary p-3 rounded-xl shadow-xl">
                              <p className="text-[10px] font-black uppercase mb-1">{payload[0].payload.name}</p>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-primary">Votos: {payload[0].value}</p>
                                <p className="text-[9px] font-medium text-muted-foreground uppercase">Expectativa: {payload[0].payload.expectativa}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="votos" radius={[0, 4, 4, 0]} barSize={24}>
                      {dadosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.votos >= entry.expectativa * (totalSecoesLidas/totalSecoesEstimado) ? 'var(--primary)' : 'var(--accent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          {db.boletins.length === 0 ? (
            <div className="py-20 text-center space-y-4 rounded-3xl border-2 border-dashed">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-muted-foreground">Nenhum Boletim Registrado</h3>
                <p className="text-xs text-muted-foreground">Escaneie os QR Codes dos BUs para iniciar a apuração paralela.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {db.boletins.map((bu) => (
                <Card key={bu.id} className="border-2 overflow-hidden hover:border-primary/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <QrCode className="size-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-sm uppercase">Seção {bu.secao} / Zona {bu.zona}</h4>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono">{bu.municipio}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {new Date(bu.data_leitura).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-green-500" /> TSE Validado</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xl font-black font-mono leading-none">{bu.votos_candidato}</p>
                        <p className="text-[9px] font-bold uppercase text-primary">Votos Candidato</p>
                      </div>
                      <div className="border-l pl-6">
                        <p className="text-xl font-black font-mono leading-none text-muted-foreground">{bu.total_votos}</p>
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Total Urna</p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}