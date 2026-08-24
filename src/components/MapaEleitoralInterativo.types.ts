import type { CidadeVotosData, EstadoVotosData } from './MapaBrasilSvg';

export interface MapaEleitoralInterativoProps {
  dadosEstados?: Record<string, EstadoVotosData>;
  dadosCidades?: CidadeVotosData[];
  ufSelecionada?: string | null;
  cidadeSelecionada?: string | null;
  onSelectUf?: (uf: string | null) => void;
  onSelectCidade?: (cidade: string | null) => void;
  maxVotos?: number;
}
