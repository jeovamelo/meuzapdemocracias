import React, { useEffect, useMemo, useState, useRef, Component } from "react";
import {
  MapPin,
  Package,
  Users,
  TrendingUp,
  Map as MapIcon,
  BarChart3,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumero } from "@/lib/db";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface DadosMunicipioDistribuicao {
  municipio: string;
  uf: string;
  totalItens: number;
  totalPedidos: number;
  destinatarios: string[];
}

interface Props {
  uf?: string;
  cargo?: string;
  dados?: Record<string, DadosMunicipioDistribuicao>;
  titulo?: string;
}

type GeoFeature = {
  properties?: {
    nome?: string;
    NM_MUN?: string;
    codarea?: string;
    id?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: any;
  };
};

const normalizar = (valor: string) =>
  valor
    ? valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleUpperCase("pt-BR")
    : "";

// Error Boundary para proteger a renderização do mapa
class MapaErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Erro interno no componente de Mapa de Calor:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[340px] flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
          <Info className="size-8 text-muted-foreground/40 mb-2" />
          <p className="font-bold text-foreground">Não foi possível carregar a visualização gráfica.</p>
          <p className="text-xs mt-1">Os dados consolidados continuam disponíveis nos indicadores acima.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MapaCalorDistribuicao({
  uf = "CE",
  cargo = "Estadual",
  dados = {},
  titulo = "Distribuição Geográfica de Materiais",
}: Props) {
  return (
    <MapaErrorBoundary>
      <MapaCalorDistribuicaoInterno uf={uf} cargo={cargo} dados={dados} titulo={titulo} />
    </MapaErrorBoundary>
  );
}

function MapaCalorDistribuicaoInterno({
  uf = "CE",
  cargo = "Estadual",
  dados = {},
  titulo = "Distribuição Geográfica de Materiais",
}: Props) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hoveredMunicipio, setHoveredMunicipio] = useState<string | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<"mapa" | "grafico">("mapa");
  const [mostrarRotulos, setMostrarRotulos] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeUf = (uf || "CE").toUpperCase();

  // Carrega malha GeoJSON oficial do IBGE e lista de nomes dos municípios da UF
  useEffect(() => {
    let ativa = true;
    setCarregando(true);

    const urlMalha = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${activeUf}?formato=application/vnd.geo+json&intrarregiao=municipio`;
    const urlNomes = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${activeUf}/municipios`;

    Promise.all([
      fetch(urlMalha).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(urlNomes).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([geojson, listaNomes]) => {
        if (!ativa) return;

        if (geojson && geojson.features && Array.isArray(geojson.features) && geojson.features.length > 0) {
          // Mapeia os códigos do IBGE (codarea) para os nomes oficiais
          const nomesPorCodigo = new Map<string, string>();
          if (Array.isArray(listaNomes)) {
            listaNomes.forEach((item: any) => {
              if (item?.id && item?.nome) {
                nomesPorCodigo.set(String(item.id), item.nome);
              }
            });
          }

          const featuresComNome = geojson.features.map((feat: GeoFeature) => {
            const cod = String(feat.properties?.codarea || feat.properties?.id || "");
            const nomeEncontrado =
              nomesPorCodigo.get(cod) || feat.properties?.nome || feat.properties?.NM_MUN || "Município";
            return {
              ...feat,
              properties: {
                ...feat.properties,
                nome: nomeEncontrado,
              },
            };
          });

          setFeatures(featuresComNome);
        } else {
          setFeatures([]);
        }
      })
      .catch((err) => {
        console.warn("Erro ao processar dados geográficos do IBGE:", err);
        if (ativa) setFeatures([]);
      })
      .finally(() => {
        if (ativa) setCarregando(false);
      });

    return () => {
      ativa = false;
    };
  }, [activeUf]);

  // Indexa dados por nome normalizado
  const dadosNormalizados = useMemo(() => {
    const mapa = new Map<string, DadosMunicipioDistribuicao>();
    if (!dados) return mapa;
    Object.entries(dados).forEach(([_, val]) => {
      if (val && val.municipio) {
        mapa.set(normalizar(val.municipio), val);
      }
    });
    return mapa;
  }, [dados]);

  // Estatísticas gerais
  const listaCidades = useMemo(() => {
    if (!dados) return [];
    return Object.values(dados).sort((a, b) => (b?.totalItens || 0) - (a?.totalItens || 0));
  }, [dados]);

  const maxItens = useMemo(() => {
    return Math.max(1, listaCidades.reduce((acc, c) => Math.max(acc, c?.totalItens || 0), 0));
  }, [listaCidades]);

  const totalGeralItens = useMemo(() => {
    return listaCidades.reduce((acc, c) => acc + (c?.totalItens || 0), 0);
  }, [listaCidades]);

  const totalMunicipiosAtendidos = useMemo(() => {
    return listaCidades.filter((c) => (c?.totalItens || 0) > 0).length;
  }, [listaCidades]);

  const totalMunicipiosEstado = features.length || (activeUf === "CE" ? 184 : 100);
  const percentualCobertura = totalMunicipiosEstado
    ? ((totalMunicipiosAtendidos / totalMunicipiosEstado) * 100).toFixed(1)
    : "0.0";

  // Cálculo seguro dos limites geográficos e proporção do estado
  const { limites, viewWidth, viewHeight, escala, fatorLon, margem } = useMemo(() => {
    if (!features || features.length === 0) {
      return {
        limites: null,
        viewWidth: 600,
        viewHeight: 560,
        escala: 1,
        fatorLon: 1,
        margem: 12,
      };
    }

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

    if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return {
        limites: null,
        viewWidth: 600,
        viewHeight: 560,
        escala: 1,
        fatorLon: 1,
        margem: 12,
      };
    }

    // Projeção Mercator ajustada com fator de latitude do centro do estado
    const latMedia = (minLat + maxLat) / 2;
    const fLon = Math.cos((latMedia * Math.PI) / 180);
    const diffLonProjetada = (maxLon - minLon) * fLon;
    const diffLat = maxLat - minLat;

    const marg = 14;
    const targetH = 560;
    const esc = (targetH - marg * 2) / Math.max(diffLat, 0.001);
    const targetW = Math.max(340, Math.round(diffLonProjetada * esc + marg * 2));

    return {
      limites: { minLon, maxLon, minLat, maxLat },
      viewWidth: targetW,
      viewHeight: targetH,
      escala: esc,
      fatorLon: fLon,
      margem: marg,
    };
  }, [features]);

  // Projeção dos polígonos
  const paths = (feature: GeoFeature): string[] => {
    if (!limites || !feature?.geometry?.coordinates) return [];
    const geom = feature.geometry;
    const poligonos: number[][][][] =
      geom.type === "Polygon"
        ? [geom.coordinates as number[][][]]
        : geom.type === "MultiPolygon"
        ? (geom.coordinates as number[][][][])
        : [];

    const pathStrings: string[] = [];

    poligonos.forEach((poligono) => {
      if (!Array.isArray(poligono)) return;
      const partes: string[] = [];
      poligono.forEach((anel) => {
        if (!Array.isArray(anel) || anel.length === 0) return;
        const segmento = anel
          .map(([lon, lat], indice) => {
            const x = (margem + (lon - limites.minLon) * fatorLon * escala).toFixed(2);
            const y = (viewHeight - margem - (lat - limites.minLat) * escala).toFixed(2);
            return `${indice === 0 ? "M" : "L"}${x} ${y}`;
          })
          .join(" ");
        if (segmento) {
          partes.push(segmento + " Z");
        }
      });
      if (partes.length > 0) {
        pathStrings.push(partes.join(" "));
      }
    });

    return pathStrings;
  };

  // Cálculo do centróide visual das cidades ativas para posicionar os rótulos de forma limpa
  const cidadesComEntregas = useMemo(() => {
    if (!limites || !features || features.length === 0) return [];

    return features
      .map((feature) => {
        const nome = feature.properties?.nome || feature.properties?.NM_MUN || "Município";
        const info = dadosNormalizados.get(normalizar(nome));
        if (!info || info.totalItens <= 0) return null;

        const geom = feature.geometry;
        if (!geom || !geom.coordinates) return null;

        let sumX = 0;
        let sumY = 0;
        let count = 0;

        const addPoint = (lon: number, lat: number) => {
          const px = margem + (lon - limites.minLon) * fatorLon * escala;
          const py = viewHeight - margem - (lat - limites.minLat) * escala;
          sumX += px;
          sumY += py;
          count++;
        };

        const processRings = (rings: any) => {
          if (!Array.isArray(rings)) return;
          rings.forEach((ring: any) => {
            if (!Array.isArray(ring)) return;
            ring.forEach((pt: any) => {
              if (Array.isArray(pt) && pt.length >= 2) {
                addPoint(Number(pt[0]), Number(pt[1]));
              }
            });
          });
        };

        if (geom.type === "Polygon") {
          processRings(geom.coordinates);
        } else if (geom.type === "MultiPolygon") {
          if (Array.isArray(geom.coordinates)) {
            geom.coordinates.forEach((poly: any) => processRings(poly));
          }
        }

        if (count === 0) return null;

        return {
          nome,
          info,
          itens: info.totalItens,
          pedidos: info.totalPedidos,
          cx: sumX / count,
          cy: sumY / count,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.itens - a.itens);
  }, [features, dadosNormalizados, limites, escala, fatorLon, margem, viewHeight]);

  // Cor do mapa de calor proporcional à intensidade de despacho
  const getHeatmapColor = (municipioNome: string) => {
    const info = dadosNormalizados.get(normalizar(municipioNome));
    const itens = info?.totalItens || 0;
    if (itens <= 0) return "hsl(215 22% 93%)"; // Neutro sem entregas

    const intensidade = Math.min(itens / maxItens, 1);

    // Gradiente: Amarelo-Alaranjado -> Laranja Democracias -> Vermelho Intenso
    if (intensidade < 0.25) {
      return `hsl(42, 95%, ${72 - intensidade * 20}%)`;
    } else if (intensidade < 0.65) {
      return `hsl(25, 95%, ${55 - (intensidade - 0.25) * 15}%)`;
    } else {
      return `hsl(12, 90%, ${48 - (intensidade - 0.65) * 12}%)`;
    }
  };

  const dadosSelecionado = selecionado
    ? dadosNormalizados.get(normalizar(selecionado))
    : hoveredMunicipio
    ? dadosNormalizados.get(normalizar(hoveredMunicipio))
    : null;

  const nomeExibicaoSelecionado = selecionado || hoveredMunicipio;

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-sm space-y-5">
      {/* CABEÇALHO DO MAPA COM CONTROLES */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapIcon className="size-4" />
            </div>
            <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground">
              {titulo}
            </h2>
            <Badge
              variant="outline"
              className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20"
            >
              Escopo {activeUf} • {cargo || "Estadual"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Concentração de materiais e itens de campanha despachados por município de destino.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {modoVisualizacao === "mapa" && (
            <button
              type="button"
              onClick={() => setMostrarRotulos((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                mostrarRotulos
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground"
              }`}
              title="Alternar visibilidade dos rótulos de cidades com entregas"
            >
              <MapPin className="size-3.5" />
              <span>{mostrarRotulos ? "Rótulos Ativos" : "Ocultar Rótulos"}</span>
            </button>
          )}

          <div className="flex rounded-xl bg-muted/40 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setModoVisualizacao("mapa")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modoVisualizacao === "mapa"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="size-3.5" />
              <span>Mapa de Calor</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao("grafico")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modoVisualizacao === "grafico"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="size-3.5" />
              <span>Ranking</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO LOGÍSTICO */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Package className="size-3 text-primary" /> Total Despachado
          </span>
          <p className="font-mono text-xl sm:text-2xl font-black text-foreground">
            {formatNumero(totalGeralItens)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">unidades em campo</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3 text-primary" /> Cidades Atendidas
          </span>
          <p className="font-mono text-xl sm:text-2xl font-black text-primary">
            {totalMunicipiosAtendidos}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">
            de {totalMunicipiosEstado} municípios ({percentualCobertura}%)
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3 text-emerald-600" /> Cidade Principal
          </span>
          <p className="font-mono text-base sm:text-lg font-black text-foreground truncate">
            {listaCidades[0]?.municipio || "Nenhuma"}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium truncate">
            {listaCidades[0]
              ? `${formatNumero(listaCidades[0].totalItens)} itens (${(
                  (listaCidades[0].totalItens / Math.max(1, totalGeralItens)) *
                  100
                ).toFixed(0)}%)`
              : "Aguardando saídas"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Users className="size-3 text-orange-600" /> Remessas
          </span>
          <p className="font-mono text-xl sm:text-2xl font-black text-foreground">
            {listaCidades.reduce((acc, c) => acc + (c?.totalPedidos || 0), 0)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">pedidos entregues</p>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: MAPA OU RANKING */}
      {modoVisualizacao === "mapa" ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-50/80 p-2 sm:p-4">
          {/* LEGENDA TÉRMICA */}
          <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-2 rounded-xl bg-background/90 px-3 py-1.5 shadow-sm border border-border/60 backdrop-blur-xs text-[11px] font-bold">
            <span className="text-muted-foreground">0 itens</span>
            <span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-slate-200 via-amber-400 to-red-600" />
            <span className="text-primary font-extrabold">{formatNumero(maxItens)} itens</span>
          </div>

          {/* CONTROLES DE ZOOM */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="size-8 rounded-lg bg-background/90 backdrop-blur-xs shadow-xs cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="size-8 rounded-lg bg-background/90 backdrop-blur-xs shadow-xs cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setZoomLevel(1);
                setSelecionado(null);
              }}
              className="size-8 rounded-lg bg-background/90 backdrop-blur-xs shadow-xs cursor-pointer"
              title="Resetar visualização"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>

          {carregando ? (
            <div className="flex h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Carregando limites de {activeUf}...</span>
            </div>
          ) : !features.length ? (
            <div className="flex h-[420px] flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <Info className="size-8 text-muted-foreground/40 mb-2" />
              <p className="font-bold text-foreground">Mapa do estado ({activeUf}) indisponível temporariamente.</p>
              <p className="text-xs mt-1 max-w-sm">
                Você pode visualizar os dados consolidados na aba de Ranking ao lado.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden flex items-center justify-center min-h-[420px] sm:min-h-[500px]">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-auto w-full max-h-[520px] transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
                role="img"
                aria-label={`Mapa de calor de distribuição de materiais de ${activeUf}`}
              >
                {/* 1. POLÍGONOS DOS MUNICÍPIOS */}
                {features.flatMap((feature, indice) => {
                  const municipio =
                    feature.properties?.nome || feature.properties?.NM_MUN || "Município";
                  const fill = getHeatmapColor(municipio);
                  const isSelected =
                    selecionado && normalizar(selecionado) === normalizar(municipio);
                  const isHovered =
                    hoveredMunicipio && normalizar(hoveredMunicipio) === normalizar(municipio);
                  const info = dadosNormalizados.get(normalizar(municipio));
                  const total = info?.totalItens || 0;

                  return paths(feature).map((d, pathIndice) => (
                    <path
                      key={`${indice}-${pathIndice}`}
                      d={d}
                      fill={fill}
                      stroke={
                        isSelected ? "#0f172a" : isHovered ? "var(--primary)" : "rgba(15,23,42,0.25)"
                      }
                      strokeWidth={isSelected ? "2.6" : isHovered ? "2.0" : "0.55"}
                      className="cursor-pointer transition-all duration-150 hover:brightness-90 active:scale-[0.99]"
                      onClick={() => setSelecionado(selecionado === municipio ? null : municipio)}
                      onMouseEnter={() => setHoveredMunicipio(municipio)}
                      onMouseLeave={() => setHoveredMunicipio(null)}
                    >
                      <title>{`${municipio}: ${formatNumero(total)} itens despachados (${
                        info?.totalPedidos || 0
                      } pedidos)`}</title>
                    </path>
                  ));
                })}

                {/* 2. RÓTULOS E PINS DAS CIDADES COM ENTREGAS */}
                {mostrarRotulos &&
                  cidadesComEntregas.map((c, i) => {
                    const isSelected =
                      selecionado && normalizar(selecionado) === normalizar(c.nome);
                    const isHovered =
                      hoveredMunicipio && normalizar(hoveredMunicipio) === normalizar(c.nome);
                    const labelTexto = `${c.nome} • ${formatNumero(c.itens)}`;
                    const labelWidth = Math.max(68, labelTexto.length * 6.2 + 14);

                    return (
                      <g
                        key={`label-${c.nome}-${i}`}
                        className="cursor-pointer select-none transition-all duration-150"
                        onClick={() => setSelecionado(selecionado === c.nome ? null : c.nome)}
                        onMouseEnter={() => setHoveredMunicipio(c.nome)}
                        onMouseLeave={() => setHoveredMunicipio(null)}
                      >
                        {/* Ponto / Marcador de Entrega */}
                        <circle
                          cx={c.cx}
                          cy={c.cy}
                          r={isSelected || isHovered ? 5.5 : 4}
                          fill={isSelected ? "#0f172a" : "var(--primary)"}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="shadow-xs"
                        />

                        {/* Pill / Etiqueta Flutuante de Texto */}
                        <g transform={`translate(${c.cx}, ${c.cy - 12})`}>
                          <rect
                            x={-labelWidth / 2}
                            y={-14}
                            width={labelWidth}
                            height={17}
                            rx={4.5}
                            fill={
                              isSelected
                                ? "#0f172a"
                                : isHovered
                                ? "hsl(24, 95%, 45%)"
                                : "rgba(15, 23, 42, 0.88)"
                            }
                            stroke={
                              isSelected
                                ? "var(--primary)"
                                : isHovered
                                ? "#ffffff"
                                : "rgba(255, 255, 255, 0.25)"
                            }
                            strokeWidth={isSelected || isHovered ? 1.4 : 0.8}
                            className="shadow-md"
                          />
                          <text
                            x={0}
                            y={-2}
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="800"
                            textAnchor="middle"
                            letterSpacing="0.2px"
                          >
                            {labelTexto}
                          </text>
                        </g>
                      </g>
                    );
                  })}
              </svg>
            </div>
          )}
        </div>
      ) : (
        /* MODO RANKING (GRÁFICO DE BARRAS + LISTAGEM) */
        <div className="space-y-4">
          <div className="h-[340px] w-full rounded-2xl border border-border bg-slate-50/50 p-4">
            {listaCidades.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Nenhum município com saídas registradas até o momento.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={listaCidades.slice(0, 10).map((c) => ({
                    name: c.municipio,
                    total: c.totalItens,
                    pedidos: c.totalPedidos,
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-background p-3 shadow-xl text-xs space-y-1">
                            <p className="font-extrabold text-foreground">{d.name}</p>
                            <p className="font-mono text-primary font-black">
                              {formatNumero(d.total)} itens despachados
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {d.pedidos} pedidos/remessas
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                    {listaCidades.slice(0, 10).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "var(--primary)"
                            : index < 3
                            ? "hsl(24, 95%, 53%)"
                            : "hsl(24, 80%, 65%)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* DETALHES DO MUNICÍPIO SELECIONADO / EM FOCO */}
      {nomeExibicaoSelecionado && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-slide-up">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary shrink-0" />
              <h3 className="font-extrabold text-base text-foreground truncate">
                {nomeExibicaoSelecionado} ({activeUf})
              </h3>
              {dadosSelecionado && dadosSelecionado.totalItens > 0 ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Ativo na Campanha
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Sem saídas
                </Badge>
              )}
            </div>

            {dadosSelecionado && dadosSelecionado.totalItens > 0 ? (
              <p className="text-xs text-muted-foreground">
                <strong className="font-mono font-extrabold text-foreground">
                  {formatNumero(dadosSelecionado.totalItens)}
                </strong>{" "}
                itens entregues em{" "}
                <strong className="font-mono font-bold text-foreground">
                  {dadosSelecionado.totalPedidos}
                </strong>{" "}
                pedidos
                {dadosSelecionado.destinatarios && dadosSelecionado.destinatarios.length > 0 && (
                  <span>
                    {" "}
                    • Responsáveis:{" "}
                    <span className="font-bold text-foreground">
                      {dadosSelecionado.destinatarios.slice(0, 3).join(", ")}
                      {dadosSelecionado.destinatarios.length > 3
                        ? ` (+${dadosSelecionado.destinatarios.length - 3})`
                        : ""}
                    </span>
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum material despachado para este município ainda.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selecionado && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelecionado(null)}
                className="h-8 rounded-xl text-xs font-bold cursor-pointer"
              >
                Limpar Seleção
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
