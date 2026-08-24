import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { Building2, Layers, Loader2, MapPin, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { CidadeVotosData } from './MapaBrasilSvg';
import type { MapaEleitoralInterativoProps } from './MapaEleitoralInterativo.types';

const CENTRO_BRASIL: LatLngExpression = [-14.235, -51.9253];

const CENTROS_UF: Record<string, [number, number]> = {
  AC: [-9.0238, -70.812], AL: [-9.5713, -36.782], AP: [1.41, -51.77], AM: [-3.4168, -65.8561],
  BA: [-12.5797, -41.7007], CE: [-5.4984, -39.3206], DF: [-15.7998, -47.8645], ES: [-19.1834, -40.3089],
  GO: [-15.827, -49.8362], MA: [-5.42, -45.44], MT: [-12.6819, -56.9211], MS: [-20.7722, -54.7852],
  MG: [-18.5122, -44.555], PA: [-3.4168, -52.2168], PB: [-7.24, -36.782], PR: [-24.89, -51.55],
  PE: [-8.8137, -36.9541], PI: [-7.7183, -42.7289], RJ: [-22.9099, -43.2095], RN: [-5.4026, -36.9541],
  RS: [-30.0346, -51.2177], RO: [-10.83, -63.34], RR: [2.7376, -62.0751], SC: [-27.2423, -50.2189],
  SP: [-22.19, -48.79], SE: [-10.5741, -37.3857], TO: [-10.1753, -48.2982],
};

interface PontoCidade extends CidadeVotosData {
  latitude: number;
  longitude: number;
}

interface RespostaCepV2 {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

const CACHE_KEY = 'democracias_geocodificacao_cep_v1';

const lerCache = (): Record<string, [number, number]> => {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const salvarCache = (cache: Record<string, [number, number]>) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // O mapa continua funcionando mesmo quando o navegador bloqueia o armazenamento.
  }
};

const normalizarCep = (cep?: string) => String(cep || '').replace(/\D/g, '').slice(0, 8);

const obterCoordenadasCep = async (cep: string, signal: AbortSignal): Promise<[number, number] | null> => {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as RespostaCepV2;
  const latitude = Number(dados.location?.coordinates?.latitude);
  const longitude = Number(dados.location?.coordinates?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};

const AjustarVisao: React.FC<{
  pontos: PontoCidade[];
  ufSelecionada?: string | null;
  cidadeSelecionada?: string | null;
}> = ({ pontos, ufSelecionada, cidadeSelecionada }) => {
  const mapa = useMap();

  useEffect(() => {
    const visiveis = cidadeSelecionada
      ? pontos.filter((ponto) => ponto.cidade === cidadeSelecionada)
      : pontos;

    if (visiveis.length > 0) {
      const limites = visiveis.map((ponto) => [ponto.latitude, ponto.longitude]) as LatLngBoundsExpression;
      mapa.fitBounds(limites, { padding: [45, 45], maxZoom: cidadeSelecionada ? 14 : 11 });
      return;
    }

    if (ufSelecionada && CENTROS_UF[ufSelecionada]) {
      mapa.setView(CENTROS_UF[ufSelecionada], 6);
      return;
    }

    mapa.setView(CENTRO_BRASIL, 4);
  }, [cidadeSelecionada, mapa, pontos, ufSelecionada]);

  return null;
};

export const MapaEleitoralLeaflet: React.FC<MapaEleitoralInterativoProps> = ({
  dadosEstados = {},
  dadosCidades = [],
  ufSelecionada = null,
  cidadeSelecionada = null,
  onSelectUf = () => {},
  onSelectCidade = () => {},
  maxVotos = 1,
}) => {
  const [pontosCidades, setPontosCidades] = useState<PontoCidade[]>([]);
  const [geocodificando, setGeocodificando] = useState(false);

  const cidadesDaUf = useMemo(
    () => dadosCidades.filter((cidade) => !ufSelecionada || cidade.uf.toUpperCase() === ufSelecionada.toUpperCase()),
    [dadosCidades, ufSelecionada],
  );

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    const carregar = async () => {
      const cache = lerCache();
      const encontrados: PontoCidade[] = [];
      const pendentes: CidadeVotosData[] = [];

      cidadesDaUf.forEach((cidade) => {
        if (Number.isFinite(cidade.latitude) && Number.isFinite(cidade.longitude)) {
          encontrados.push({ ...cidade, latitude: Number(cidade.latitude), longitude: Number(cidade.longitude) });
          return;
        }

        const cep = normalizarCep(cidade.cep);
        if (cep && cache[cep]) {
          encontrados.push({ ...cidade, latitude: cache[cep][0], longitude: cache[cep][1] });
        } else if (cep) {
          pendentes.push(cidade);
        }
      });

      if (ativo) setPontosCidades(encontrados);
      if (pendentes.length === 0) return;

      setGeocodificando(true);
      const fila = [...pendentes];
      const trabalhadores = Array.from({ length: Math.min(4, fila.length) }, async () => {
        while (fila.length > 0 && !controller.signal.aborted) {
          const cidade = fila.shift();
          if (!cidade) break;
          const cep = normalizarCep(cidade.cep);

          try {
            const coordenadas = await obterCoordenadasCep(cep, controller.signal);
            if (!coordenadas) continue;
            cache[cep] = coordenadas;
            encontrados.push({ ...cidade, latitude: coordenadas[0], longitude: coordenadas[1] });
            if (ativo) setPontosCidades([...encontrados]);
          } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              console.warn(`Não foi possível geolocalizar o CEP ${cep}.`, error);
            }
          }
        }
      });

      await Promise.all(trabalhadores);
      salvarCache(cache);
      if (ativo) setGeocodificando(false);
    };

    carregar();
    return () => {
      ativo = false;
      controller.abort();
    };
  }, [cidadesDaUf]);

  const pontosVisiveis = useMemo(
    () => pontosCidades.filter((ponto) => !cidadeSelecionada || ponto.cidade === cidadeSelecionada),
    [cidadeSelecionada, pontosCidades],
  );

  const estadosVisiveis = useMemo(
    () => Object.values(dadosEstados).filter((estado) => estado.votos > 0 && CENTROS_UF[estado.uf]),
    [dadosEstados],
  );

  const maxVotosCidade = Math.max(1, ...pontosVisiveis.map((ponto) => ponto.votos));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-xs text-slate-300 sm:px-5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-orange-400" />
          <span className="font-bold text-slate-400">Mapa real:</span>
          <span className="rounded-full border border-orange-500/30 bg-orange-500/15 px-2.5 py-1 text-[11px] font-extrabold text-orange-400">
            {cidadeSelecionada ? `${cidadeSelecionada} • ${ufSelecionada}` : ufSelecionada ? `Estado • ${ufSelecionada}` : 'Brasil • visão nacional'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {geocodificando && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Loader2 className="size-3.5 animate-spin text-orange-400" /> Localizando CEPs...
            </span>
          )}
          {(ufSelecionada || cidadeSelecionada) && (
            <button
              type="button"
              onClick={() => {
                onSelectCidade(null);
                onSelectUf(null);
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-bold hover:bg-slate-800"
            >
              <RotateCcw className="size-3" /> Ver Brasil
            </button>
          )}
        </div>
      </div>

      <div className="relative h-[480px] min-h-[360px] w-full sm:h-[560px]">
        <MapContainer
          center={CENTRO_BRASIL}
          zoom={4}
          minZoom={3}
          maxZoom={18}
          scrollWheelZoom
          zoomControl
          className="h-full w-full bg-slate-900"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <ScaleControl imperial={false} position="bottomleft" />
          <AjustarVisao pontos={pontosCidades} ufSelecionada={ufSelecionada} cidadeSelecionada={cidadeSelecionada} />

          {!ufSelecionada && estadosVisiveis.map((estado) => {
            const intensidade = Math.max(0.2, estado.votos / Math.max(1, maxVotos));
            const centro = CENTROS_UF[estado.uf];
            const raio = 14 + intensidade * 24;
            return (
              <React.Fragment key={estado.uf}>
                <CircleMarker
                  center={centro}
                  radius={raio * 1.65}
                  pathOptions={{ color: '#fb923c', fillColor: '#f97316', fillOpacity: 0.12, opacity: 0, weight: 0 }}
                />
                <CircleMarker
                  center={centro}
                  radius={raio}
                  pathOptions={{ color: '#ffffff', fillColor: '#f97316', fillOpacity: 0.78, opacity: 0.95, weight: 2 }}
                  eventHandlers={{ click: () => onSelectUf(estado.uf) }}
                >
                  <Popup>
                    <div className="min-w-44 space-y-1 text-slate-900">
                      <p className="font-extrabold">{estado.nome} ({estado.uf})</p>
                      <p><strong>{estado.votos}</strong> {estado.votos === 1 ? 'participação' : 'participações'}</p>
                      <p>{estado.percentual.toFixed(1)}% da camada atual</p>
                      <button type="button" className="mt-2 font-bold text-orange-600" onClick={() => onSelectUf(estado.uf)}>
                        Ampliar estado
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}

          {ufSelecionada && pontosVisiveis.map((ponto, indice) => {
            const intensidade = Math.max(0.2, ponto.votos / maxVotosCidade);
            const raio = 9 + intensidade * 19;
            return (
              <React.Fragment key={`${ponto.uf}_${ponto.cidade}_${ponto.bairro}_${ponto.cep}_${indice}`}>
                <CircleMarker
                  center={[ponto.latitude, ponto.longitude]}
                  radius={raio * 1.9}
                  pathOptions={{ color: '#fb923c', fillColor: '#f97316', fillOpacity: 0.13, opacity: 0, weight: 0 }}
                />
                <CircleMarker
                  center={[ponto.latitude, ponto.longitude]}
                  radius={raio}
                  pathOptions={{ color: '#ffffff', fillColor: '#ea580c', fillOpacity: 0.82, opacity: 0.95, weight: 2 }}
                >
                  <Popup>
                    <div className="min-w-52 space-y-1 text-slate-900">
                      <p className="flex items-center gap-1 font-extrabold"><Building2 className="size-4 text-orange-600" /> {ponto.cidade} • {ponto.uf}</p>
                      <p><strong>Bairro:</strong> {ponto.bairro && ponto.bairro !== 'Geral' ? ponto.bairro : 'Toda a cidade'}</p>
                      {ponto.cep && <p><strong>CEP:</strong> {ponto.cep}</p>}
                      <p><strong>{ponto.votos}</strong> {ponto.votos === 1 ? 'participação mapeada' : 'participações mapeadas'}</p>
                      <button type="button" className="mt-2 flex items-center gap-1 font-bold text-orange-600" onClick={() => onSelectCidade(ponto.cidade)}>
                        <MapPin className="size-3.5" /> Filtrar esta cidade
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-7 right-3 z-[500] rounded-xl border border-white/20 bg-slate-950/90 px-3 py-2 text-[10px] text-white shadow-xl backdrop-blur">
          <div className="mb-1 flex items-center gap-2 font-bold"><span className="size-2 rounded-full bg-orange-500" /> Concentração de participações</div>
          <div className="h-2 w-32 rounded-full bg-gradient-to-r from-orange-200 via-orange-500 to-red-600" />
          <div className="mt-1 flex justify-between text-slate-400"><span>Menor</span><span>Maior</span></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 sm:px-5">
        <span>Arraste o mapa, use a roda do mouse ou dois dedos para ampliar.</span>
        <span>{ufSelecionada ? `${pontosCidades.length} pontos geolocalizados por CEP` : `${estadosVisiveis.length} estados com dados`}</span>
      </div>
    </div>
  );
};

export default MapaEleitoralLeaflet;
