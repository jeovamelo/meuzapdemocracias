import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { QrCode, Camera, ShieldCheck, AlertCircle, Search, Info, BarChart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/bu/")({
  head: () => ({
    title: "Leitor Universal de Boletim de Urna (BU) — Inteligência Eleitoral",
    meta: [
      { name: "description", content: "Auditoria e digitalização rápida de Boletins de Urna (BU) via QR Code oficial do TSE." }
    ]
  }),
  component: LeitorBU,
});

function LeitorBU() {
  const { db } = useStore();
  const [scanning, setScanning] = useState(false);
  const [buData, setBuData] = useState<any>(null);
  const [codigoManual, setCodigoManual] = useState("");

  const simulatedScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 2000));
    
    // Mock de dados de BU (Baseado no layout do TSE)
    const mockBU = {
      pleito: "Eleições Gerais 2026",
      secao: "0124",
      zona: "001",
      municipio: "FORTALEZA",
      uf: "CE",
      data: "04/10/2026",
      hora_abertura: "08:00:00",
      hora_fechamento: "17:00:00",
      votos: [
        { candidato: db.config.candidato_urna || "MISSIAS DIAS", numero: db.config.numero || "13123", total: 184, meta_atingida: true },
        { candidato: "CANDIDATO B", numero: "99000", total: 42, meta_atingida: false },
        { candidato: "Nulos", numero: "-", total: 12, meta_atingida: false },
        { candidato: "Brancos", numero: "-", total: 8, meta_atingida: false },
      ],
      total_votos: 246,
      assinatura_digital: "v3_TSE_7a8b9c0d1e2f..."
    };

    setBuData(mockBU);
    setScanning(false);
    toast.success("Boletim de Urna validado e importado!");
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-5 py-6 mb-24 md:mb-0">
      <PageHeader 
        eyebrow="Auditoria em Campo"
        title="Leitor de BU"
        right={
          <Badge variant="outline" className="font-mono gap-1 text-[10px] uppercase border-primary/30 text-primary">
            <ShieldCheck className="size-3" />
            V3-TSE Digital
          </Badge>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <Card className="border-2 overflow-hidden bg-surface">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                Captura Digital
              </CardTitle>
              <CardDescription className="text-xs">
                Aponte a câmera para o QR Code no rodapé do Boletim impresso pela Urna.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-3xl border-4 border-dashed border-primary/20 bg-muted/30 flex items-center justify-center overflow-hidden group">
                {scanning ? (
                  <div className="flex flex-col items-center gap-3 animate-pulse">
                    <QrCode className="size-20 text-primary/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Escaneando...</span>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent h-1/2 w-full animate-scan-loop" />
                  </div>
                ) : buData ? (
                  <div className="flex flex-col items-center gap-4 text-center p-6">
                    <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ShieldCheck className="size-10 text-green-500" />
                    </div>
                    <div>
                      <p className="font-black text-xl uppercase leading-tight">BU Importado</p>
                      <p className="text-xs text-muted-foreground">Digitalizado com sucesso</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setBuData(null)}>Novo Escaneamento</Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <QrCode className="size-24 text-muted-foreground/20 group-hover:text-primary/20 transition-colors" />
                    <Button className="h-12 px-8 font-bold uppercase gap-2 shadow-xl shadow-primary/20" onClick={simulatedScan}>
                      Abrir Câmera
                      <Camera className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
              <Info className="size-3" />
              Entrada Manual Alternativa
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Hash da Assinatura Digital..." 
                value={codigoManual}
                onChange={e => setCodigoManual(e.target.value)}
                className="h-10 text-xs font-mono"
              />
              <Button size="sm" variant="secondary" className="px-4 font-bold uppercase text-[10px]">Validar</Button>
            </div>
          </div>
        </section>

        <section>
          {buData ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Resultado da Seção {buData.secao}</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase text-primary">{buData.municipio} - {buData.uf} | ZONA {buData.zona}</CardDescription>
                    </div>
                    <Badge className="bg-primary hover:bg-primary/90 font-mono">{buData.total_votos} Votos</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="space-y-3">
                    {buData.votos.map((v: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${v.meta_atingida ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-surface'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-lg flex items-center justify-center font-black text-xs ${v.meta_atingida ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {i + 1}º
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase leading-none mb-1">{v.candidato}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">Número: {v.numero}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl leading-none">{v.total}</p>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Votos Totais</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Abertura / Fechamento</p>
                      <p className="font-mono text-[10px] font-bold">{buData.hora_abertura} - {buData.hora_fechamento}</p>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Assinatura TSE</p>
                      <p className="font-mono text-[10px] font-bold truncate">{buData.pleito}</p>
                    </div>
                  </div>

                  <Button className="w-full h-12 gap-2 font-black uppercase shadow-lg shadow-primary/10">
                    Sincronizar com Inteligência Central
                    <Search className="size-4" />
                  </Button>
                </CardContent>
              </Card>

              <div className="rounded-2xl border-2 border-dashed border-accent/30 p-4 bg-accent/5 flex items-center gap-4">
                <div className="size-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <BarChart className="size-6 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-accent">Análise de Performance</p>
                  <p className="text-[10px] font-medium leading-tight">Este resultado representa 104% da meta esperada para esta seção. Excelente desempenho!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 space-y-4 rounded-3xl border-2 border-dashed border-border bg-muted/10">
              <div className="size-16 rounded-3xl bg-muted flex items-center justify-center">
                <AlertCircle className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nenhum Boletim Selecionado</h3>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-2">Os dados da apuração aparecerão aqui assim que o escaneamento for concluído.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}