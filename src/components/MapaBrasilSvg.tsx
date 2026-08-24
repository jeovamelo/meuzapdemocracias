import React from 'react';

export interface EstadoVotosData {
  uf: string;
  nome: string;
  regiao: string;
  votos: number;
  percentual: number;
  totalVotosEstado: number;
}

interface Props {
  dadosEstados: Record<string, EstadoVotosData>;
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
  corBase?: string; // ex: 'orange' | 'blue'
  maxVotos?: number;
}

// Coordenadas aproximadas em grade visual e paths vetoriais simplificados dos 27 estados do Brasil
const ESTADOS_INFO: Record<string, { nome: string; regiao: string; x: number; y: number; w: number; h: number; path?: string }> = {
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
  dadosEstados,
  ufSelecionada,
  onSelectUf,
  maxVotos = 1,
}) => {
  const getCorHeatmap = (votos: number) => {
    if (!votos || votos === 0) return '#1e293b'; // slate-800
    const intensidade = Math.min(1, Math.max(0.15, votos / Math.max(maxVotos, 1)));
    
    // Gradiente quente (laranja/âmbar para vermelho/fogo)
    if (intensidade < 0.25) return '#f9731640'; // Laranja bem suave
    if (intensidade < 0.5) return '#f9731680'; // Laranja médio
    if (intensidade < 0.75) return '#f97316cc'; // Laranja forte
    return '#ea580c'; // Laranja queimado intenso
  };

  return (
    <div className="relative w-full bg-slate-950/80 rounded-2xl border border-slate-800/80 p-4 overflow-hidden shadow-inner flex flex-col items-center">
      {/* LEGENDA DO MAPA DE CALOR */}
      <div className="w-full flex items-center justify-between gap-3 text-xs mb-3 text-slate-400">
        <div className="flex items-center gap-1.5 font-bold">
          <span>Densidade Eleitoral:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]">0 votos</span>
          <div className="h-3 w-32 rounded-full bg-gradient-to-r from-slate-800 via-orange-500/50 to-orange-500 border border-slate-700 shadow-sm" />
          <span className="text-[11px] font-bold text-orange-400">Maior concentração</span>
        </div>
      </div>

      {/* MAPA SVG INTERATIVO DO BRASIL */}
      <div className="w-full max-w-[680px] aspect-[720/720] relative">
        <svg
          viewBox="0 0 720 720"
          className="size-full select-none"
          role="img"
          aria-label="Mapa Georreferenciado do Brasil"
        >
          {/* FUNDO BRASIL SILHUETA SUAVE */}
          <rect width="720" height="720" fill="transparent" />

          {/* ESTADOS EM BLOCOS GEORREFERENCIADOS */}
          {Object.entries(ESTADOS_INFO).map(([sigla, info]) => {
            const estadoData = dadosEstados[sigla] || { votos: 0, percentual: 0 };
            const isSelected = ufSelecionada === sigla;
            const corFundo = getCorHeatmap(estadoData.votos);

            return (
              <g
                key={sigla}
                onClick={() => onSelectUf(isSelected ? null : sigla)}
                className="cursor-pointer transition-transform duration-200 group"
              >
                {/* BLOCO VETORIAL DO ESTADO */}
                <rect
                  x={info.x}
                  y={info.y}
                  width={info.w}
                  height={info.h}
                  rx={10}
                  fill={isSelected ? '#f97316' : corFundo}
                  stroke={isSelected ? '#ffffff' : estadoData.votos > 0 ? '#fb923c' : '#334155'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  className="transition-all duration-200 group-hover:stroke-white group-hover:brightness-125 shadow-md"
                />

                {/* SIGLA E CONTAGEM */}
                <text
                  x={info.x + info.w / 2}
                  y={info.y + info.h / 2 - (estadoData.votos > 0 ? 5 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? '#ffffff' : estadoData.votos > 0 ? '#ffffff' : '#94a3b8'}
                  className="font-mono font-black text-xs pointer-events-none drop-shadow"
                >
                  {sigla}
                </text>

                {estadoData.votos > 0 && (
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
                  {`${info.nome} (${sigla}) - ${estadoData.votos} votos (${estadoData.percentual.toFixed(1)}%)`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ESTADO SELECIONADO / BARRA INFORMATIVA INFERIOR */}
      {ufSelecionada && (
        <div className="w-full mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-3 animate-fadeIn">
          <div>
            <span className="text-xs font-black text-orange-400">
              📍 Estado Selecionado: {ESTADOS_INFO[ufSelecionada]?.nome || ufSelecionada} ({ufSelecionada})
            </span>
            <p className="text-[11px] text-slate-300">
              Votos do candidato nesta UF: <strong>{dadosEstados[ufSelecionada]?.votos || 0}</strong> • Representatividade:{' '}
              <strong>{(dadosEstados[ufSelecionada]?.percentual || 0).toFixed(1)}%</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectUf(null)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            Ver Brasil Todo
          </button>
        </div>
      )}
    </div>
  );
};
