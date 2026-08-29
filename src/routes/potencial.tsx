import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Filter, LoaderCircle, MapPin, Save, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { useLocalidades } from "@/hooks/useLocalidades";
import { supabase } from "@/integrations/supabase/client";
import { formatNumero } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/potencial")({
  head: () => ({ meta: [{ title: "Inteligência Eleitoral — Gestão de Votos" }] }),
  component: InteligenciaEleitoral,
});

type CidadeMeta = { id?: string; municipio: string; uf: string; meta_campanha: number; realidade_votos: number };
type GeoFeature = { properties?: { nome?: string; NM_MUN?: string }; geometry?: { type?: string; coordinates?: any } };
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleUpperCase("pt-BR");
const numero = (valor: unknown) => Math.max(0, Number(valor) || 0);

function MapaDeCalor({ uf, metas }: { uf: string; metas: CidadeMeta[] }) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  useEffect(() => {
    let ativa = true;
    setCarregando(true);
    fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}/municipios?formato=application/vnd.geo+json`)
      .then((resposta) => resposta.ok ? resposta.json() : Promise.reject())
      .then((geojson) => ativa && setFeatures(geojson.features || []))
      .catch(() => ativa && setFeatures([]))
      .finally(() => ativa && setCarregando(false));
    return () => { ativa = false; };
  }, [uf]);

  const metasPorMunicipio = useMemo(() => new Map(metas.map((meta) => [normalizar(meta.municipio), meta])), [metas]);
  const maximo = Math.max(0, ...metas.map((meta) => Math.max(meta.meta_campanha, meta.realidade_votos)));
  const limites = useMemo(() => {
    if (!features || features.length === 0) return null;
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const processPoint = (pt: any) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        const lon = Number(pt[0]);
        const lat = Number(pt[1]);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    };

    const processRings = (rings: any) => {
      if (!Array.isArray(rings)) return;
      rings.forEach((ring: any) => {
        if (!Array.isArray(ring)) return;
        ring.forEach((pt: any) => processPoint(pt));
      });
    };

    features.forEach((feature) => {
      const geom = feature.geometry;
      if (!geom || !geom.coordinates) return;
      if (geom.type === "Polygon") {
        processRings(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        if (Array.isArray(geom.coordinates)) {
          geom.coordinates.forEach((poly: any) => processRings(poly));
        }
      }
    });

    if (!Number.isFinite(minLon) || !Number.isFinite(maxLon)) return null;
    return { minLon, maxLon, minLat, maxLat };
  }, [features]);

  const paths = (feature: GeoFeature) => {
    if (!limites || !feature.geometry?.coordinates) return [];
    const poligonos = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
    const largura = 760, altura = 460, margem = 12;
    const escala = Math.min((largura - margem * 2) / Math.max(limites.maxLon - limites.minLon, .001), (altura - margem * 2) / Math.max(limites.maxLat - limites.minLat, .001));
    const offsetX = (largura - (limites.maxLon - limites.minLon) * escala) / 2;
    const offsetY = (altura - (limites.maxLat - limites.minLat) * escala) / 2;
    return poligonos.map((poligono: number[][][]) => poligono.map((anel) => anel.map(([lon, lat], indice) => `${indice ? "L" : "M"}${(offsetX + (lon - limites.minLon) * escala).toFixed(2)} ${(altura - offsetY - (lat - limites.minLat) * escala).toFixed(2)}`).join(" ") + " Z").join(" "));
  };
  const metaSelecionada = selecionada ? metasPorMunicipio.get(normalizar(selecionada)) : null;

  return <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black uppercase">Mapa de calor de votos</h2><p className="text-sm text-muted-foreground">Clique em um município para consultar o planejamento.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Menor</span><span className="h-3 w-28 rounded-full bg-gradient-to-r from-slate-200 via-amber-300 to-red-600" /><span>Maior</span></div></div>
    <div className="overflow-hidden rounded-2xl border border-border bg-slate-50">
      {carregando ? <div className="flex h-[330px] items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Carregando limites de {uf}…</div> : !features.length ? <div className="flex h-[330px] items-center justify-center px-6 text-center text-sm text-muted-foreground">Não foi possível carregar o mapa geográfico deste estado.</div> : <svg viewBox="0 0 760 460" className="h-auto w-full" role="img" aria-label={`Mapa de calor de votos de ${uf}`}>{features.flatMap((feature, indice) => { const municipio = feature.properties?.nome || feature.properties?.NM_MUN || "Município"; const meta = metasPorMunicipio.get(normalizar(municipio)); const votos = Math.max(meta?.meta_campanha || 0, meta?.realidade_votos || 0); const intensidade = maximo ? Math.min(votos / maximo, 1) : 0; const fill = votos ? `hsl(${52 - intensidade * 52} 92% ${66 - intensidade * 18}%)` : "hsl(210 25% 90%)"; return paths(feature).map((d, pathIndice) => <path key={`${indice}-${pathIndice}`} d={d} fill={fill} stroke="rgba(15,23,42,.25)" strokeWidth=".65" className="cursor-pointer transition-opacity hover:opacity-70" onClick={() => setSelecionada(municipio)}><title>{`${municipio}: ${formatNumero(votos)} votos`}</title></path>); })}</svg>}
    </div>
    {selecionada && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4"><div><p className="font-bold">{selecionada}</p><p className="text-sm text-muted-foreground">Votos esperados: {formatNumero(metaSelecionada?.meta_campanha || 0)} · Realidade: {formatNumero(metaSelecionada?.realidade_votos || 0)}</p></div><Button size="sm" variant="outline" onClick={() => setSelecionada(null)}>Limpar</Button></div>}
  </section>;
}

function InteligenciaEleitoral() {
  const { db } = useStore();
  const { campaign } = useCampaignScope();
  const activeUf = campaign?.uf || db.config.uf || "CE";
  const { cidades, loadingCidades } = useLocalidades(activeUf);
  const [metas, setMetas] = useState<CidadeMeta[]>([]);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [loteAberto, setLoteAberto] = useState(false);
  const [votosLote, setVotosLote] = useState<Record<string, string>>({});
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState({ meta: 0, realidade: 0 });

  const carregarMetas = async () => {
    if (!campaign?.id) { setMetas([]); setCarregandoMetas(false); return; }
    setCarregandoMetas(true);
    const { data, error } = await (supabase.from("cidade_metas") as any).select("id, municipio, uf, meta_campanha, realidade_votos").eq("campaign_id", campaign.id).eq("uf", activeUf).order("municipio");
    setCarregandoMetas(false);
    if (error) { toast.error("Não foi possível carregar as metas por cidade."); return; }
    setMetas((data || []).map((meta: any) => ({ ...meta, meta_campanha: numero(meta.meta_campanha), realidade_votos: numero(meta.realidade_votos) })));
  };
  useEffect(() => { void carregarMetas(); }, [campaign?.id, activeUf]);

  const cidadesOrdenadas = useMemo(() => [...cidades].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [cidades]);
  const metasPorMunicipio = useMemo(() => new Map(metas.map((meta) => [normalizar(meta.municipio), meta])), [metas]);
  const abrirLote = () => {
    if (!campaign?.id) { toast.error("Selecione uma campanha antes de planejar os votos."); return; }
    setVotosLote(Object.fromEntries(cidadesOrdenadas.map((cidade) => [cidade.nome, String(metasPorMunicipio.get(normalizar(cidade.nome))?.meta_campanha || "")] )));
    setLoteAberto(true);
  };
  const salvarLote = async () => {
    if (!campaign?.id) return;
    setSalvandoLote(true);
    const registros = cidadesOrdenadas.filter((cidade) => votosLote[cidade.nome] !== "").map((cidade) => ({ campaign_id: campaign.id, municipio: cidade.nome, uf: activeUf, meta_campanha: numero(votosLote[cidade.nome]), realidade_votos: metasPorMunicipio.get(normalizar(cidade.nome))?.realidade_votos || 0 }));
    const { error } = await (supabase.from("cidade_metas") as any).upsert(registros, { onConflict: "campaign_id,municipio" });
    setSalvandoLote(false);
    if (error) { toast.error("Não foi possível salvar o planejamento em lote."); return; }
    toast.success("Planejamento por município salvo."); setLoteAberto(false); await carregarMetas();
  };
  const salvarEdicao = async (cidade: CidadeMeta) => {
    const { error } = await (supabase.from("cidade_metas") as any).update({ meta_campanha: edicao.meta, realidade_votos: edicao.realidade }).eq("id", cidade.id);
    if (error) { toast.error("Não foi possível salvar a cidade."); return; }
    setEditando(null); await carregarMetas(); toast.success("Dados atualizados.");
  };

  return <div className="mx-auto w-full pb-24 md:max-w-screen-xl"><PageHeader eyebrow="Inteligência Eleitoral" title="Gestão de Votos por Cidade" />
    <div className="px-5 py-4"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div className="w-full md:w-64"><Label className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground">Estado (UF da campanha)</Label><div className="flex h-12 items-center justify-between rounded-md border-2 border-input bg-muted/40 px-3 text-sm font-bold uppercase"><span>{activeUf}</span><Badge variant="outline" className="text-[10px]">Estado concorrente</Badge></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="h-12 gap-2 border-2"><Filter className="size-4" />Filtros avançados</Button><Button className="h-12 gap-2 font-bold uppercase" onClick={abrirLote} disabled={loadingCidades}><Target className="size-4" />Preenchimento em lote</Button></div></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]"><MapaDeCalor uf={activeUf} metas={metas} /><section className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-base font-black uppercase">Resumo do planejamento</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Cidades planejadas</p><p className="mt-1 font-mono text-3xl font-black">{metas.length}</p></div><div className="rounded-2xl bg-primary/10 p-4"><p className="text-xs text-muted-foreground">Votos esperados</p><p className="mt-1 font-mono text-3xl font-black text-primary">{formatNumero(metas.reduce((total, meta) => total + meta.meta_campanha, 0))}</p></div></div><p className="mt-5 text-sm text-muted-foreground">Use o preenchimento em lote para planejar todos os municípios em ordem alfabética.</p></section></div>
      <section className="mt-6 space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Metas cadastradas</h2><span className="text-sm text-muted-foreground">{carregandoMetas ? "Carregando…" : `${metas.length} municípios`}</span></div>{metas.map((cidade) => { const atingimento = cidade.meta_campanha ? cidade.realidade_votos / cidade.meta_campanha * 100 : 0; const isEditing = editando === cidade.id; return <div key={cidade.id || cidade.municipio} className={`rounded-2xl border p-5 ${isEditing ? "border-primary bg-primary/5" : "border-border bg-surface"}`}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><MapPin className="size-4 text-primary" /><h3 className="text-lg font-black">{cidade.municipio}</h3><Badge variant={atingimento >= 100 ? "default" : "secondary"}>{atingimento.toFixed(0)}%</Badge></div></div>{isEditing ? <div className="flex gap-2"><Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button><Button onClick={() => salvarEdicao(cidade)}><Save className="mr-2 size-4" />Salvar</Button></div> : <Button variant="secondary" onClick={() => { setEditando(cidade.id || null); setEdicao({ meta: cidade.meta_campanha, realidade: cidade.realidade_votos }); }}>Editar metas</Button>}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label>Votos esperados</Label>{isEditing ? <Input className="mt-2" type="number" value={edicao.meta} onChange={(event) => setEdicao({ ...edicao, meta: numero(event.target.value) })} /> : <p className="mt-2 font-mono text-2xl font-black">{formatNumero(cidade.meta_campanha)}</p>}</div><div><Label>Realidade dos votos</Label>{isEditing ? <Input className="mt-2" type="number" value={edicao.realidade} onChange={(event) => setEdicao({ ...edicao, realidade: numero(event.target.value) })} /> : <p className="mt-2 font-mono text-2xl font-black text-accent">{formatNumero(cidade.realidade_votos)}</p>}</div></div></div>; })}</section>
    </div>
    <Dialog open={loteAberto} onOpenChange={setLoteAberto}><DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0"><DialogHeader className="border-b px-6 py-5"><DialogTitle>Preenchimento em lote — {activeUf}</DialogTitle><DialogDescription>Informe os votos esperados. Municípios em ordem alfabética e dados salvos na campanha ativa.</DialogDescription></DialogHeader><div className="max-h-[60vh] overflow-y-auto px-6 py-4">{loadingCidades ? <div className="flex justify-center py-10"><LoaderCircle className="size-6 animate-spin" /></div> : cidadesOrdenadas.map((cidade) => <div key={cidade.id || cidade.nome} className="grid grid-cols-[1fr_150px] items-center gap-4 border-b py-3"><Label className="font-semibold">{cidade.nome}</Label><Input aria-label={`Votos esperados em ${cidade.nome}`} inputMode="numeric" type="number" min="0" value={votosLote[cidade.nome] || ""} onChange={(event) => setVotosLote((atual) => ({ ...atual, [cidade.nome]: event.target.value }))} /></div>)}</div><div className="flex justify-end gap-3 border-t px-6 py-4"><Button variant="outline" onClick={() => setLoteAberto(false)} disabled={salvandoLote}>Cancelar</Button><Button onClick={salvarLote} disabled={salvandoLote || loadingCidades}>{salvandoLote && <LoaderCircle className="mr-2 size-4 animate-spin" />}Salvar planejamento</Button></div></DialogContent></Dialog>
  </div>;
}
