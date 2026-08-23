import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { formatNumero } from "@/lib/db";
import { 
  Target, 
  TrendingUp, 
  Users, 
  MapPin, 
  ChevronRight,
  Filter,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/potencial")({
  head: () => ({
    meta: [
      { title: "Inteligência Eleitoral — Gestão de Votos" },
      {
        name: "description",
        content: "Gestão estratégica de votos por cidade e comparativo de desempenho.",
      },
    ],
  }),
  component: InteligenciaEleitoral,
});

function InteligenciaEleitoral() {
  const { db, updateCidadeMeta } = useStore();
  const { campaign } = useCampaignScope();
  
  // UF da campanha ativa (ou db.config.uf)
  const candidateUf = campaign?.uf || db.config.uf || "CE";
  const [selectedUf, setSelectedUf] = useState(candidateUf);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState({ meta: 0, realidade: 0 });

  // Garante que se o escopo da campanha mudar, o selectedUf acompanha
  const activeUf = candidateUf;

  const cidadesFiltradas = db.cidade_metas.filter(c => c.uf === activeUf);

  const getExpectativaApoiadores = (municipio: string) => {
    const pessoasNoMunicipio = db.pessoas.filter(p => p.municipio === municipio);
    const comitesNoMunicipio = db.comites.filter(c => c.municipio === municipio);
    
    const metaPessoas = pessoasNoMunicipio.reduce((acc, p) => acc + (p.meta_votos || 0), 0);
    const metaComites = comitesNoMunicipio.reduce((acc, c) => acc + (c.meta_votos || 0), 0);
    
    return Math.max(metaPessoas, metaComites);
  };

  const handleSave = async (id: string) => {
    try {
      await updateCidadeMeta(id, {
        meta_campanha: tempValues.meta,
        realidade_votos: tempValues.realidade
      });
      setEditMode(null);
      toast.success("Dados atualizados com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  return (
    <div className="mx-auto w-full md:max-w-screen-xl pb-24">
      <PageHeader
        eyebrow="Inteligência Eleitoral"
        title="Gestão de Votos por Cidade"
      />

      <div className="px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between mb-8">
          <div className="w-full md:w-64">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Estado (UF da Campanha)</Label>
            <div className="flex h-12 w-full items-center justify-between rounded-md border-2 border-input bg-muted/40 px-3 py-2 text-sm font-bold uppercase tracking-wider">
              <span>{activeUf}</span>
              <Badge variant="outline" className="text-[10px] font-bold">Estado Concorrente</Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 gap-2 border-2">
              <Filter className="size-4" />
              Filtros Avançados
            </Button>
            <Button className="h-12 gap-2 font-bold uppercase">
              Preenchimento em Lote
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {cidadesFiltradas.map(cidade => {
            const apoiadores = getExpectativaApoiadores(cidade.municipio);
            const atingimento = cidade.meta_campanha > 0 
              ? (cidade.realidade_votos / cidade.meta_campanha) * 100 
              : 0;
            
            const gapApoiadores = cidade.meta_campanha > 0 
              ? (apoiadores / cidade.meta_campanha) * 100 
              : 0;

            const isEditing = editMode === cidade.id;

            return (
              <div 
                key={cidade.id} 
                className={`rounded-3xl border-2 transition-all p-6 ${
                  isEditing ? 'border-primary bg-primary/5 shadow-xl' : 'border-border bg-surface'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="size-4 text-primary" />
                      <h3 className="text-xl font-black uppercase tracking-tight">{cidade.municipio}</h3>
                      <Badge variant={atingimento >= 100 ? "default" : atingimento > 50 ? "secondary" : "destructive"} className="ml-2 font-mono">
                        {atingimento.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                      Estado: {cidade.uf} • Lideranças: {db.pessoas.filter(p => p.municipio === cidade.municipio).length}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 px-4 border-2" 
                          onClick={() => setEditMode(null)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-10 px-4 gap-2 font-bold uppercase"
                          onClick={() => handleSave(cidade.id)}
                        >
                          <Save className="size-4" />
                          Salvar
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-10 px-4 font-bold uppercase"
                        onClick={() => {
                          setEditMode(cidade.id);
                          setTempValues({ 
                            meta: cidade.meta_campanha, 
                            realidade: cidade.realidade_votos 
                          });
                        }}
                      >
                        Editar Metas
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Meta Campanha */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Expectativa Campanha</Label>
                      <Target className="size-3 text-muted-foreground" />
                    </div>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        className="h-12 border-2 font-mono text-lg font-bold"
                        value={tempValues.meta}
                        onChange={e => setTempValues({...tempValues, meta: Number(e.target.value)})}
                      />
                    ) : (
                      <div className="font-mono text-3xl font-black">{formatNumero(cidade.meta_campanha)}</div>
                    )}
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Meta estratégica definida pela coordenação</p>
                  </div>

                  {/* Apoiadores */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Expectativa Apoiadores</Label>
                      <Users className="size-3 text-muted-foreground" />
                    </div>
                    <div className="font-mono text-3xl font-black text-primary">{formatNumero(apoiadores)}</div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${gapApoiadores >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(gapApoiadores, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                        {gapApoiadores.toFixed(1)}% da meta coberta por apoiadores
                      </p>
                    </div>
                  </div>

                  {/* Realidade */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Realidade dos Votos</Label>
                      <TrendingUp className="size-3 text-muted-foreground" />
                    </div>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        className="h-12 border-2 font-mono text-lg font-bold"
                        value={tempValues.realidade}
                        onChange={e => setTempValues({...tempValues, realidade: Number(e.target.value)})}
                      />
                    ) : (
                      <div className="font-mono text-3xl font-black text-accent">{formatNumero(cidade.realidade_votos)}</div>
                    )}
                    <div className="flex items-center gap-2">
                      {atingimento >= 100 ? (
                        <CheckCircle2 className="size-3 text-green-500" />
                      ) : (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                      <p className={`text-[9px] font-bold uppercase ${atingimento >= 100 ? 'text-green-600' : 'text-destructive'}`}>
                        {atingimento >= 100 ? 'Meta Superada' : `Déficit de ${formatNumero(cidade.meta_campanha - cidade.realidade_votos)} votos`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
