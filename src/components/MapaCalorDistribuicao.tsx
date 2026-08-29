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
  Maximize2,
  Minimize2,
  Move,
  X,
  Share2,
  Lock,
  Copy,
  Check,
  MessageCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumero } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  destinatarios?: string[];
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modal de Compartilhamento Público com Senha e Token
  const [modalShareAberto, setModalShareAberto] = useState<boolean>(false);
  const [sharedToken, setSharedToken] = useState<string>("");
  const [sharedPin, setSharedPin] = useState<string>("");
  const [linkCopiado, setLinkCopiado] = useState<boolean>(false);
  const [pinCopiado, setPinCopiado] = useState<boolean>(false);

  // Estados de Zoom e Pan Interativos Isolados
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didDragRef = useRef<boolean>(false);
  const touchDistanceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  // Captura eventos de scroll (Wheel) para zoom isolado SEM rolar a página
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.15 : 0.85;

      setZoomLevel((prev) => {
        const next = Math.max(0.7, Math.min(5.0, prev * factor));
        return Number(next.toFixed(2));
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Fechamento de tela cheia via tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Manipuladores de Pan (arrasto com mouse/toque)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      didDragRef.current = true;
    }

    setPanOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Suporte a Touch Pinch-to-Zoom em mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistanceRef.current;
      setZoomLevel((prev) => Math.max(0.7, Math.min(5.0, prev * (ratio > 1 ? 1.05 : 0.95))));
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelecionado(null);
  };

  // Geração do Link Protegido com Token Compacto (12 chars) e Senha (Modo Anônimo)
  const handleAbrirModalCompartilhar = () => {
    // Gera token alfanumérico compacto de 12 caracteres
    const chars = "23456789abcdefghjkmnpqrstuvwxyz";
    let randomToken = "";
    for (let i = 0; i < 12; i++) {
      randomToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));

    setSharedToken(randomToken);
    setSharedPin(randomPin);
    setLinkCopiado(false);
    setPinCopiado(false);

    // Payload anônimo: dados consolidados estritamente sem nomes de candidatos, pessoas ou lideranças
    const payloadAnonimo = {
      token: randomToken,
      uf: activeUf,
      pin: randomPin,
      titulo: `Distribuição Territorial de Materiais • ${activeUf}`,
      cidades: Object.fromEntries(
        Object.entries(dados || {}).map(([key, val]) => [
          key,
          {
            municipio: val.municipio,
            uf: val.uf,
            totalItens: val.totalItens,
            totalPedidos: val.totalPedidos,
          },
        ])
      ),
      criadoEm: new Date().toISOString(),
    };

    // 1. Salva no localStorage local
    try {
      localStorage.setItem(`mapa_share_${randomToken}`, JSON.stringify(payloadAnonimo));
    } catch {}

    // 2. Persiste no Supabase para acesso global por qualquer dispositivo (celular / WhatsApp)
    try {
      supabase
        .from("solicitacoes")
        .insert([
          {
            nome: `MAP_SHARE_${randomToken}`,
            itens: payloadAnonimo as any,
            status: "entregue",
            tipo_logistica: "retirada",
          },
        ])
        .then(({ error }) => {
          if (error) {
            console.warn("Aviso ao persistir token compartilhado no Supabase:", error.message);
          }
        });
    } catch {}

    setModalShareAberto(true);
  };

  // URL Curta e Limpa do Link Gerado (máx ~45 caracteres no total)
  const sharedUrl = useMemo(() => {
    if (!sharedToken) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://democracias.org";
    return `${origin}/public/mapa?token=${sharedToken}`;
  }, [sharedToken]);

  const handleCopiarLink = () => {
    if (!sharedUrl) return;
    navigator.clipboard.writeText(sharedUrl);
    setLinkCopiado(true);
    toast.success("Link do mapa copiado com sucesso!");
    setTimeout(() => setLinkCopiado(false), 3000);
  };

  const handleCopiarPin = () => {
    if (!sharedPin) return;
    navigator.clipboard.writeText(sharedPin);
    setPinCopiado(true);
    toast.success("Senha de acesso copiada!");
    setTimeout(() => setPinCopiado(false), 3000);
  };

  const handleEnviarWhatsApp = () => {
    if (!sharedUrl || !sharedPin) return;
    const mensagem = `🗺️ *Acesso ao Mapa de Distribuição de Materiais*\n\nPara visualizar o mapa de calor georreferenciado e o quantitativo consolidado por município (${activeUf}), acesse o link protegido abaixo:\n\n🔗 *Link:* ${sharedUrl}\n🔑 *Senha de Acesso:* ${sharedPin}\n\n_Visualização segura e anônima via Democracias.org_`;
    const urlWa = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWa, "_blank");
  };

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

  // Cálculo do centróide visual das cidades ativas com prevenção de sobreposição (Anti-Collision)
  const cidadesComEntregas = useMemo(() => {
    if (!limites || !features || features.length === 0) return [];

    const cidadesBrutas = features
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

    // Ajuste inteligente de offsets para evitar sobreposição entre cidades vizinhas
    const posicionadas: Array<(typeof cidadesBrutas)[0] & { offsetX: number; offsetY: number }> = [];

    cidadesBrutas.forEach((cidade, i) => {
      let offsetY = -13; // padrão: etiqueta acima do ponto
      let offsetX = 0;

      // Verifica proximidade com cidades de maior volume já posicionadas
      for (let j = 0; j < posicionadas.length; j++) {
        const anterior = posicionadas[j];
        const dist = Math.hypot(cidade.cx - anterior.cx, cidade.cy - anterior.cy);

        if (dist < 34) {
          // Se estiver muito perto, alterna posição para baixo ou para o lado
          if (cidade.cy >= anterior.cy) {
            offsetY = +16; // posiciona abaixo do ponto
          } else {
            offsetY = -22; // posiciona mais acima
          }
          if (Math.abs(cidade.cx - anterior.cx) < 22) {
            offsetX = cidade.cx >= anterior.cx ? +18 : -18;
          }
        }
      }

      posicionadas.push({
        ...cidade,
        offsetX,
        offsetY,
      });
    });

    return posicionadas;
  }, [features, dadosNormalizados, limites, escala, fatorLon, margem, viewHeight]);

  // Cor do mapa de calor proporcional à intensidade de despacho
  const getHeatmapColor = (municipioNome: string) => {
    const info = dadosNormalizados.get(normalizar(municipioNome));
    const itens = info?.totalItens || 0;
    if (itens <= 0) return "hsl(215 22% 93%)"; // Neutro sem entregas

    const intensidade = Math.min(itens / maxItens, 1);

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
    <section
      className={`rounded-3xl border border-border bg-surface shadow-sm transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 m-0 flex flex-col rounded-none p-4 sm:p-6 overflow-hidden bg-background"
          : "p-5 sm:p-6 space-y-5"
      }`}
    >
      {/* CABEÇALHO DO MAPA COM CONTROLES */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4 shrink-0">
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
            {isFullscreen && (
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                Modo Tela Cheia
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Concentração de materiais e itens de campanha despachados por município de destino.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* BOTÃO GERAR LINK DO MAPA */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAbrirModalCompartilhar}
            className="h-9 gap-1.5 rounded-xl border border-border/80 text-xs font-bold hover:bg-muted/50 cursor-pointer"
            title="Gerar link protegido por senha para visualização anônima do mapa"
          >
            <Share2 className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Gerar Link do Mapa</span>
          </Button>

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

          {/* BOTÃO DE EXPANDIR / MINIMIZAR DINÂMICO */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className={`h-9 gap-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isFullscreen
                ? "bg-foreground text-background border-foreground hover:bg-foreground/90 shadow-md"
                : "border-border/80 hover:bg-muted/50"
            }`}
            title={isFullscreen ? "Minimizar tela (Esc)" : "Expandir para Tela Cheia"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="size-3.5" />
                <span>Minimizar</span>
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5" />
                <span className="hidden sm:inline">Tela Cheia</span>
              </>
            )}
          </Button>

          {isFullscreen && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFullscreen(false)}
              className="size-9 rounded-xl hover:bg-muted/80 cursor-pointer"
              title="Fechar tela cheia"
            >
              <X className="size-4 text-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* CARDS DE RESUMO LOGÍSTICO (OCULTOS OU COMPACTADOS NO FULLSCREEN) */}
      {!isFullscreen && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
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
      )}

      {/* ÁREA PRINCIPAL: MAPA OU RANKING */}
      {modoVisualizacao === "mapa" ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative overflow-hidden rounded-2xl border border-border bg-slate-50/80 p-2 sm:p-4 select-none touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          } ${isFullscreen ? "flex-1 w-full min-h-0" : "min-h-[440px] sm:min-h-[520px]"}`}
        >
          {/* LEGENDA TÉRMICA & DICA DE PAN */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-background/90 px-3 py-1.5 shadow-sm border border-border/60 backdrop-blur-xs text-[11px] font-bold">
              <span className="text-muted-foreground">0 itens</span>
              <span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-slate-200 via-amber-400 to-red-600" />
              <span className="text-primary font-extrabold">{formatNumero(maxItens)} itens</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-background/70 px-2 py-0.5 rounded-md border border-border/40 w-fit">
              <Move className="size-2.5" /> Arraste para mover • Scroll para zoom
            </div>
          </div>

          {/* CONTROLES FLUTUANTES DE ZOOM & RESET */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel((z) => Math.min(5.0, Number((z * 1.25).toFixed(2))))}
              className="size-8 rounded-lg bg-background/95 backdrop-blur-xs shadow-xs cursor-pointer hover:bg-muted"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel((z) => Math.max(0.7, Number((z * 0.8).toFixed(2))))}
              className="size-8 rounded-lg bg-background/95 backdrop-blur-xs shadow-xs cursor-pointer hover:bg-muted"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={resetView}
              className="size-8 rounded-lg bg-background/95 backdrop-blur-xs shadow-xs cursor-pointer hover:bg-muted"
              title="Centralizar e Resetar visualização"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>

          {carregando ? (
            <div className="flex h-full min-h-[400px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Carregando limites de {activeUf}...</span>
            </div>
          ) : !features.length ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <Info className="size-8 text-muted-foreground/40 mb-2" />
              <p className="font-bold text-foreground">Mapa do estado ({activeUf}) indisponível temporariamente.</p>
              <p className="text-xs mt-1 max-w-sm">
                Você pode visualizar os dados consolidados na aba de Ranking ao lado.
              </p>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center overflow-hidden">
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.12s ease-out",
                }}
                className="w-full h-full flex items-center justify-center"
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="h-full w-full max-h-[85vh] drop-shadow-sm"
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
                        strokeWidth={isSelected ? "2.8" : isHovered ? "2.2" : "0.55"}
                        className="cursor-pointer transition-all duration-150 hover:brightness-90 active:scale-[0.99]"
                        onClick={(e) => {
                          if (didDragRef.current) return;
                          e.stopPropagation();
                          setSelecionado(selecionado === municipio ? null : municipio);
                        }}
                        onMouseEnter={() => setHoveredMunicipio(municipio)}
                        onMouseLeave={() => setHoveredMunicipio(null)}
                      >
                        <title>{`${municipio}: ${formatNumero(total)} itens despachados (${
                          info?.totalPedidos || 0
                        } pedidos)`}</title>
                      </path>
                    ));
                  })}

                  {/* 2. RÓTULOS E PINS DAS CIDADES COM ENTREGAS (COM ESCALONAMENTO ZOOM-RESPONSIVO) */}
                  {mostrarRotulos && (() => {
                    const labelScale = Math.max(0.38, Math.min(1.0, 1 / Math.pow(zoomLevel, 0.72)));

                    return cidadesComEntregas.map((c, i) => {
                      const isSelected =
                        selecionado && normalizar(selecionado) === normalizar(c.nome);
                      const isHovered =
                        hoveredMunicipio && normalizar(hoveredMunicipio) === normalizar(c.nome);
                      const labelTexto = `${c.nome} • ${formatNumero(c.itens)}`;
                      const labelWidth = Math.max(62, labelTexto.length * 5.8 + 12);
                      const hasOffset = c.offsetX !== 0 || c.offsetY > 0;

                      return (
                        <g
                          key={`label-${c.nome}-${i}`}
                          className="cursor-pointer select-none transition-all duration-150"
                          onClick={(e) => {
                            if (didDragRef.current) return;
                            e.stopPropagation();
                            setSelecionado(selecionado === c.nome ? null : c.nome);
                          }}
                          onMouseEnter={() => setHoveredMunicipio(c.nome)}
                          onMouseLeave={() => setHoveredMunicipio(null)}
                        >
                          {/* Linha guia se a etiqueta estiver deslocada para evitar sobreposição */}
                          {hasOffset && (
                            <line
                              x1={c.cx}
                              y1={c.cy}
                              x2={c.cx + c.offsetX * labelScale}
                              y2={c.cy + (c.offsetY > 0 ? (c.offsetY - 6) * labelScale : (c.offsetY + 6) * labelScale)}
                              stroke={isSelected ? "var(--primary)" : "rgba(15, 23, 42, 0.4)"}
                              strokeWidth={0.8 * labelScale}
                              strokeDasharray={`${2 * labelScale} ${1.5 * labelScale}`}
                            />
                          )}

                          {/* Ponto / Marcador de Entrega */}
                          <circle
                            cx={c.cx}
                            cy={c.cy}
                            r={(isSelected || isHovered ? 5.2 : 3.8) * labelScale}
                            fill={isSelected ? "#0f172a" : "var(--primary)"}
                            stroke="#ffffff"
                            strokeWidth={1.5 * labelScale}
                            className="shadow-xs"
                          />

                          {/* Pill / Etiqueta Flutuante de Texto com Escala Proporcional ao Zoom */}
                          <g transform={`translate(${c.cx + c.offsetX * labelScale}, ${c.cy + c.offsetY * labelScale}) scale(${labelScale})`}>
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
                    });
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MODO RANKING (GRÁFICO DE BARRAS + LISTAGEM) */
        <div className={`space-y-4 ${isFullscreen ? "flex-1 overflow-y-auto" : ""}`}>
          <div className="h-[340px] sm:h-[400px] w-full rounded-2xl border border-border bg-slate-50/50 p-4">
            {listaCidades.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Nenhum município com saídas registradas até o momento.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={listaCidades.slice(0, 15).map((c) => ({
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
                    width={120}
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
                    {listaCidades.slice(0, 15).map((_, index) => (
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-slide-up shrink-0">
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

      {/* MODAL DE COMPARTILHAMENTO DE LINK PROTEGIDO */}
      <Dialog open={modalShareAberto} onOpenChange={setModalShareAberto}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border bg-surface shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
              <Share2 className="size-6" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Compartilhar Mapa Territorial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gere um link protegido por senha para visualização anônima do mapa de calor e dados consolidados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Lock className="size-3 text-primary" /> Senha de Acesso Única
              </Label>
              <div className="flex items-center justify-between gap-2 bg-background p-2.5 rounded-xl border border-border">
                <span className="font-mono text-xl font-black text-primary tracking-widest px-2">
                  {sharedPin}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopiarPin}
                  className="h-8 gap-1 text-xs font-bold hover:bg-muted"
                >
                  {pinCopiado ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                  <span>{pinCopiado ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                Link de Acesso Público
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={sharedUrl}
                  className="h-10 text-xs font-mono bg-background border-border text-muted-foreground truncate"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopiarLink}
                  className="h-10 shrink-0 gap-1 text-xs font-bold hover:bg-muted"
                >
                  {linkCopiado ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                  <span>{linkCopiado ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Modo Anônimo:</strong> O link público exibe exclusivamente os municípios e os totais despachados, sem revelar nomes de candidatos, responsáveis ou contatos.
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={handleEnviarWhatsApp}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md cursor-pointer"
              >
                <MessageCircle className="size-4" />
                Enviar Link e Senha no WhatsApp
              </Button>

              <Button
                variant="outline"
                onClick={() => setModalShareAberto(false)}
                className="w-full h-10 rounded-xl text-xs font-bold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
