import React, { useEffect, useMemo, useState, useRef } from "react";
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
  CheckCircle2
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
  Cell
} from "recharts";

export interface DadosMunicipioDistribuicao {
  municipio: string;
  uf: string;
  totalItens: number;
  totalPedidos: number;
  destinatarios: string[];
}

interface Props {
  uf: string;
  cargo?: string;
  dados: Record<string, DadosMunicipioDistribuicao>;
  titulo?: string;
}

type GeoFeature = {
  properties?: {
    nome?: string;
    NM_MUN?: string;
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

export function MapaCalorDistribuicao({
  uf = "CE",
  cargo = "Estadual",
  dados = {},
  titulo = "Distribuição Geográfica de Materiais"
}: Props) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hoveredMunicipio, setHoveredMunicipio] = useState<string | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<"mapa" | "grafico">("mapa");
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeUf = (uf || "CE").toUpperCase();

  // Carrega malha GeoJSON oficial do IBGE para a UF da campanha
  useEffect(() => {
    let ativa = true;
    setCarregando(true);

    fetch(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${activeUf}/municipios?formato=application/vnd.geo+json&qualidade=intermediaria`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Falha ao carregar IBGE"))))
      .then((geojson) => {
        if (ativa) {
          setFeatures(geojson.features || []);
        }
      })
      .catch((err) => {
        console.warn("Erro ao carregar malha do IBGE:", err);
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
    Object.entries(dados).forEach(([_, val]) => {
      if (val && val.municipio) {
        mapa.set(normalizar(val.municipio), val);
      }
    });
    return mapa;
  }, [dados]);

  // Estatísticas gerais
  const listaCidades = useMemo(() => {
    return Object.values(dados).sort((a, b) => b.totalItens - a.totalItens);
  }, [dados]);

  const maxItens = useMemo(() => {
    return Math.max(1, ...listaCidades.map((c) => c.totalItens));
  }, [listaCidades]);

  const totalGeralItens = useMemo(() => {
    return listaCidades.reduce((acc, c) => acc + c.totalItens, 0);
  }, [listaCidades]);

  const totalMunicipiosAtendidos = useMemo(() => {
    return listaCidades.filter((c) => c.totalItens > 0).length;
  }, [listaCidades]);

  const totalMunicipiosEstado = features.length || (activeUf === "CE" ? 184 : 100);
  const percentualCobertura = totalMunicipiosEstado
    ? ((totalMunicipiosAtendidos / totalMunicipiosEstado) * 100).toFixed(1)
    : "0.0";

  // Projeção SVG dos polígonos dos municípios
  const pontos = useMemo(() => {
    return features.flatMap((feature) => {
      const coordenadas = feature.geometry?.coordinates;
      if (!coordenadas) return [];
      return feature.geometry?.type === "Polygon"
        ? (coordenadas.flat(2) as number[][])
        : (coordenadas.flat(3) as number[][]);
    });
  }, [features]);

  const limites = useMemo(() => {
    if (!pontos.length) return null;
    return {
      minLon: Math.min(...pontos.map(([lon]) => lon)),
      maxLon: Math.max(...pontos.map(([lon]) => lon)),
      minLat: Math.min(...pontos.map(([, lat]) => lat)),
      maxLat: Math.max(...pontos.map(([, lat]) => lat)),
    };
  }, [pontos]);

  const paths = (feature: GeoFeature) => {
    if (!limites || !feature.geometry?.coordinates) return [];
    const poligonos =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.type === "MultiPolygon"
        ? feature.geometry.coordinates
        : [];
    const largura = 760;
    const altura = 480;
    const margem = 16;
    const escala = Math.min(
      (largura - margem * 2) / Math.max(limites.maxLon - limites.minLon, 0.001),
      (altura - margem * 2) / Math.max(limites.maxLat - limites.minLat, 0.001)
    );
    const offsetX = (largura - (limites.maxLon - limites.minLon) * escala) / 2;
    const offsetY = (altura - (limites.maxLat - limites.minLat) * escala) / 2;

    return poligonos.map((poligono: number[][][]) =>
      poligono
        .map(
          (anel) =>
            anel
              .map(
                ([lon, lat], indice) =>
                  `${indice ? "L" : "M"}${(offsetX + (lon - limites.minLon) * escala).toFixed(2)} ${(
                    altura -
                    offsetY -
                    (lat - limites.minLat) * escala
                  ).toFixed(2)}`
              )
              .join(" ") + " Z"
        )
        .join(" ")
    );
  };

  // Cor do mapa de calor proporcional à intensidade de despacho
  const getHeatmapColor = (municipioNome: string) => {
    const info = dadosNormalizados.get(normalizar(municipioNome));
    const itens = info?.totalItens || 0;
    if (itens <= 0) return "hsl(215 20% 92%)"; // Neutro sem entregas

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
            <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20">
              Escopo {activeUf} • {cargo || "Estadual"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Concentração de materiais e itens de campanha despachados por município de destino.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
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
          <p className="text-[10px] text-muted-foreground font-medium">de {totalMunicipiosEstado} municípios ({percentualCobertura}%)</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3 text-emerald-600" /> Cidade Principal
          </span>
          <p className="font-mono text-base sm:text-lg font-black text-foreground truncate">
            {listaCidades[0]?.municipio || "Nenhuma"}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium truncate">
            {listaCidades[0] ? `${formatNumero(listaCidades[0].totalItens)} itens (${((listaCidades[0].totalItens / Math.max(1, totalGeralItens)) * 100).toFixed(0)}%)` : "Aguardando saídas"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Users className="size-3 text-orange-600" /> Remessas
          </span>
          <p className="font-mono text-xl sm:text-2xl font-black text-foreground">
            {listaCidades.reduce((acc, c) => acc + c.totalPedidos, 0)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">pedidos entregues</p>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: MAPA OU RANKING */}
      {modoVisualizacao === "mapa" ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-50/80 p-3">
          {/* LEGENDA TÉRMICA & ZOOM */}
          <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-xl bg-background/90 px-3 py-1.5 shadow-sm border border-border/60 backdrop-blur-xs text-[11px] font-bold">
            <span className="text-muted-foreground">0 itens</span>
            <span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-slate-200 via-amber-400 to-red-600" />
            <span className="text-primary font-extrabold">{formatNumero(maxItens)} itens</span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
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
            <div className="flex h-[360px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Carregando mapa georreferenciado de {activeUf}...</span>
            </div>
          ) : !features.length ? (
            <div className="flex h-[360px] flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <Info className="size-8 text-muted-foreground/40 mb-2" />
              <p className="font-bold text-foreground">Mapa do estado ({activeUf}) indisponível temporariamente.</p>
              <p className="text-xs mt-1 max-w-sm">Você pode visualizar os dados consolidados na aba de Ranking ao lado.</p>
            </div>
          ) : (
            <div className="overflow-hidden flex items-center justify-center min-h-[360px]">
              <svg
                ref={svgRef}
                viewBox="0 0 760 480"
                className="h-auto w-full max-h-[440px] transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
                role="img"
                aria-label={`Mapa de calor de distribuição de materiais de ${activeUf}`}
              >
                {features.flatMap((feature, indice) => {
                  const municipio =
                    feature.properties?.nome || feature.properties?.NM_MUN || "Município";
                  const fill = getHeatmapColor(municipio);
                  const isSelected = selecionado && normalizar(selecionado) === normalizar(municipio);
                  const isHovered = hoveredMunicipio && normalizar(hoveredMunicipio) === normalizar(municipio);
                  const info = dadosNormalizados.get(normalizar(municipio));
                  const total = info?.totalItens || 0;

                  return paths(feature).map((d, pathIndice) => (
                    <path
                      key={`${indice}-${pathIndice}`}
                      d={d}
                      fill={fill}
                      stroke={isSelected ? "#0f172a" : isHovered ? "var(--primary)" : "rgba(15,23,42,0.2)"}
                      strokeWidth={isSelected ? "2.2" : isHovered ? "1.6" : "0.5"}
                      className="cursor-pointer transition-all duration-150 hover:brightness-90 active:scale-[0.99]"
                      onClick={() => setSelecionado(selecionado === municipio ? null : municipio)}
                      onMouseEnter={() => setHoveredMunicipio(municipio)}
                      onMouseLeave={() => setHoveredMunicipio(null)}
                    >
                      <title>{`${municipio}: ${formatNumero(total)} itens despachados (${info?.totalPedidos || 0} pedidos)`}</title>
                    </path>
                  ));
                })}
              </svg>
            </div>
          )}
        </div>
      ) : (
        /* MODO RANKING (GRÁFICO DE BARRAS + LISTAGEM) */
        <div className="space-y-4">
          <div className="h-[320px] w-full rounded-2xl border border-border bg-slate-50/50 p-4">
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
                    pedidos: c.totalPedidos
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
                        fill={index === 0 ? "var(--primary)" : index < 3 ? "hsl(24, 95%, 53%)" : "hsl(24, 80%, 65%)"}
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
                {dadosSelecionado.destinatarios.length > 0 && (
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
