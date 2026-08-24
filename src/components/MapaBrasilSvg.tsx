import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Building2, Layers, Sparkles } from 'lucide-react';

export interface EstadoVotosData {
  uf: string;
  nome: string;
  regiao: string;
  votos: number;
  percentual: number;
  totalVotosEstado: number;
}

export interface CidadeVotosData {
  cidade: string;
  uf: string;
  bairro?: string;
  cep?: string;
  votos: number;
  percentual?: number;
}

interface Props {
  dadosEstados?: Record<string, EstadoVotosData>;
  dadosCidades?: CidadeVotosData[];
  ufSelecionada?: string | null;
  cidadeSelecionada?: string | null;
  onSelectUf?: (uf: string | null) => void;
  onSelectCidade?: (cidade: string | null) => void;
  corBase?: string;
  maxVotos?: number;
}

const ESTADOS_INFO: Record<string, { nome: string; regiao: string; x: number; y: number; w: number; h: number }> = {
  RR: { nome: 'Roraima', regiao: 'Norte', x: 200, y: 30, w: 75, h: 65 },
  AP: { nome: 'Amapá', regiao: 'Norte', x: 385, y: 35, w: 55, h: 55 },
  AM: { nome: 'Amazonas', regiao: 'Norte', x: 90, y: 90, w: 155, h: 105 },
  PA: { nome: 'Pará', regiao: 'Norte', x: 290, y: 90, w: 135, h: 110 },
  MA: { nome: 'Maranhão', regiao: 'Nordeste', x: 440, y: 105, w: 75, h: 80 },
  PI: { nome: 'Piauí', regiao: 'Nordeste', x: 500, y: 145, w: 60, h: 80 },
  CE: { nome: 'Ceará', regiao: 'Nordeste', x: 545, y: 95, w: 65, h: 65 },
  RN: { nome: 'Rio Grande do Norte', regiao: 'Nordeste', x: 615, y: 110, w: 55, h: 40 },
  PB: { nome: 'Paraíba', regiao: 'Nordeste', x: 620, y: 150, w: 55, h: 35 },
  PE: { nome: 'Pernambuco', regiao: 'Nordeste', x: 605, y: 185, w: 75, h: 40 },
  AL: { nome: 'Alagoas', regiao: 'Nordeste', x: 630, y: 225, w: 45, h: 35 },
  SE: { nome: 'Sergipe', regiao: 'Nordeste', x: 620, y: 260, w: 45, h: 35 },
  AC: { nome: 'Acre', regiao: 'Norte', x: 25, y: 180, w: 75, h: 50 },
  RO: { nome: 'Rondônia', regiao: 'Norte', x: 140, y: 200, w: 75, h: 65 },
  MT: { nome: 'Mato Grosso', regiao: 'Centro-Oeste', x: 235, y: 205, w: 115, h: 110 },
  TO: { nome: 'Tocantins', regiao: 'Norte', x: 385, y: 195, w: 65, h: 85 },
  BA: { nome: 'Bahia', regiao: 'Nordeste', x: 490, y: 230, w: 115, h: 110 },
  GO: { nome: 'Goiás', regiao: 'Centro-Oeste', x: 360, y: 285, w: 80, h: 80 },
  DF: { nome: 'Distrito Federal', regiao: 'Centro-Oeste', x: 420, y: 310, w: 35, h: 30 },
  MS: { nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', x: 250, y: 330, w: 95, h: 90 },
  MG: { nome: 'Minas Gerais', regiao: 'Sudeste', x: 440, y: 335, w: 115, h: 100 },
  ES: { nome: 'Espírito Santo', regiao: 'Sudeste', x: 560, y: 360, w: 45, h: 50 },
  RJ: { nome: 'Rio de Janeiro', regiao: 'Sudeste', x: 515, y: 430, w: 60, h: 45 },
  SP: { nome: 'São Paulo', regiao: 'Sudeste', x: 375, y: 410, w: 105, h: 80 },
  PR: { nome: 'Paraná', regiao: 'Sul', x: 340, y: 485, w: 90, h: 65 },
  SC: { nome: 'Santa Catarina', regiao: 'Sul', x: 350, y: 550, w: 85, h: 55 },
  RS: { nome: 'Rio Grande do Sul', regiao: 'Sul', x: 320, y: 605, w: 105, h: 95 },
};

export const MapaBrasilSvg: React.FC<Props> = ({
  dadosEstados = {},
  dadosCidades = [],
  ufSelecionada = null,
  cidadeSelecionada = null,
  onSelectUf = () => {},
  onSelectCidade = () => {},
  maxVotos = 1,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const getCorHeatmap = (votos: number, max: number) => {
    if (!votos || votos === 0) return '#1e293b'; // slate-800
    const intensidade = Math.min(1, Math.max(0.2, votos / Math.max(max, 1)));
    
    if (intensidade < 0.25) return '#f9731640';
    if (intensidade < 0.5) return '#f9731680';
    if (intensidade < 0.75) return '#f97316cc';
    return '#ea580c';
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.3).toFixed(1)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.8, +(z - 0.3).toFixed(1)));
  const handleResetZoom = () => {
    setZoomLevel(1);
    onSelectUf(null);
    onSelectCidade(null);
  };

  // Cidades da UF selecionada
  const cidadesDaUf = React.useMemo(() => {
    if (!ufSelecionada || !Array.isArray(dadosCidades)) return [];
    return dadosCidades.filter((c) => (c?.uf || '').toUpperCase() === ufSelecionada.toUpperCase());
  }, [dadosCidades, ufSelecionada]);

  return (
    <div className="relative w-full bg-slate-950 rounded-3xl border border-slate-800 p-4 sm:p-6 overflow-hidden shadow-2xl flex flex-col items-center select-none">
      
      {/* BARRA SUPERIOR: CONTROLES DE ZOOM E CAMADAS */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs mb-4 text-slate-300 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="size-4 text-orange-400" />
            Nível:
          </span>
          <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[11px] bg-orange-500/20 text-orange-400 border border-orange-500/30">
            {cidadeSelecionada
              ? `Municipal • ${cidadeSelecionada} (${ufSelecionada})`
              : ufSelecionada
              ? `Estadual • ${ESTADOS_INFO[ufSelecionada]?.nome || ufSelecionada}`
              : 'Nacional • Brasil (27 UFs)'}
          </span>
        </div>

        {/* CONTROLES DE ZOOM */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={handleZoomIn}
            className="size-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Aproximar Zoom"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold px-1.5 text-slate-400">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="size-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Afastar Zoom"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer"
            title="Resetar para visão Brasil"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* MAPA SVG COM ESCALA DINÂMICA */}
      <div className="w-full max-w-[700px] aspect-[720/720] relative overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 720 720"
          className="size-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
          role="img"
          aria-label="Mapa de Calor Georreferenciado"
        >
          <rect width="720" height="720" fill="transparent" />

          {/* RENDERIZAÇÃO DOS 27 ESTADOS */}
          {Object.entries(ESTADOS_INFO).map(([sigla, info]) => {
            const estadoData = (dadosEstados && dadosEstados[sigla]) || { votos: 0, percentual: 0 };
            const isSelected = ufSelecionada === sigla;
            const corFundo = getCorHeatmap(estadoData.votos || 0, maxVotos);

            return (
              <g
                key={sigla}
                onClick={() => {
                  if (isSelected) {
                    onSelectUf(null);
                    onSelectCidade(null);
                  } else {
                    onSelectUf(sigla);
                    setZoomLevel(1.3);
                  }
                }}
                className="cursor-pointer transition-all duration-200 group"
              >
                <rect
                  x={info.x}
                  y={info.y}
                  width={info.w}
                  height={info.h}
                  rx={12}
                  fill={isSelected ? '#ea580c' : corFundo}
                  stroke={isSelected ? '#ffffff' : (estadoData.votos || 0) > 0 ? '#fb923c' : '#334155'}
                  strokeWidth={isSelected ? 3 : 1}
                  className="transition-all duration-200 group-hover:stroke-white group-hover:brightness-125 shadow-md"
                />

                {/* SIGLA DA UF */}
                <text
                  x={info.x + info.w / 2}
                  y={info.y + info.h / 2 - ((estadoData.votos || 0) > 0 ? 5 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  className="font-mono font-black text-xs pointer-events-none drop-shadow"
                >
                  {sigla}
                </text>

                {(estadoData.votos || 0) > 0 && (
                  <text
                    x={info.x + info.w / 2}
                    y={info.y + info.h / 2 + 11}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isSelected ? '#ffffff' : '#fb923c'}
                    className="font-mono font-bold text-[9px] pointer-events-none"
                  >
                    {estadoData.votos} {estadoData.votos === 1 ? 'voto' : 'votos'}
                  </text>
                )}

                <title>
                  {`${info.nome} (${sigla}) - ${estadoData.votos || 0} votos (${((estadoData.percentual || 0)).toFixed(1)}%)`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* LEGENDA DINÂMICA INFERIOR */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Escala de Densidade:</span>
          <span className="text-[10px]">0 votos</span>
          <div className="h-2.5 w-24 sm:w-36 rounded-full bg-gradient-to-r from-slate-800 via-orange-500/50 to-orange-500 border border-slate-700 shadow-inner" />
          <span className="text-[10px] font-bold text-orange-400">Alta Concentração</span>
        </div>

        {ufSelecionada && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition-all text-[11px]"
          >
            ← Voltar para Visão Brasil
          </button>
        )}
      </div>

      {/* PAINEL DE DETALHE POR CIDADE / BAIRRO QUANDO UMA UF ESTÁ ATIVA */}
      {ufSelecionada && cidadesDaUf.length > 0 && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              <Building2 className="size-4 text-orange-400" />
              Cidades e Bairros mapeados em {ESTADOS_INFO[ufSelecionada]?.nome || ufSelecionada}:
            </h4>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {cidadesDaUf.length} {cidadesDaUf.length === 1 ? 'localidade' : 'localidades'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {cidadesDaUf.map((cid, i) => {
              const isCidSelected = cidadeSelecionada === cid.cidade;
              return (
                <button
                  key={`${cid.cidade}_${cid.bairro}_${i}`}
                  type="button"
                  onClick={() => onSelectCidade(isCidSelected ? null : cid.cidade)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isCidSelected
                      ? 'bg-orange-500/20 border-orange-500/50 text-white'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold truncate">{cid.cidade}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {cid.bairro && cid.bairro !== 'Geral' ? cid.bairro : 'Toda a cidade'}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-black text-orange-400 shrink-0">
                    {cid.votos} {cid.votos === 1 ? 'voto' : 'votos'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaBrasilSvg;
