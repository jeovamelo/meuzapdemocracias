export interface Candidato {
  id: string;
  nome: string;
  nomeUrna: string;
  numero: string;
  cargo: string;
  partido: string;
  uf: string;
  fotoUrl?: string;
  sq_candidato?: string;
  isBrancoNulo?: boolean;
}

export interface ColinhaVotos {
  deputado_federal?: Candidato | null;
  deputado_estadual?: Candidato | null;
  senador_1?: Candidato | null;
  senador_2?: Candidato | null;
  governador?: Candidato | null;
  presidente?: Candidato | null;
}

export interface ContatoWhatsApp {
  id: string;
  phone: string;
  name: string;
  timestamp: number;
  isRecent: boolean;
  selected?: boolean;
}

export type EtapaFluxo = 'conexao' | 'colinha' | 'contatos' | 'disparo' | 'concluido';

export interface MeuzapSession {
  sessionId: string;
  voterName: string;
  voterPhone?: string;
  colinha: ColinhaVotos;
  uf: string;
}

export interface DispatchProgress {
  total: number;
  current: number;
  percent: number;
  status: 'idle' | 'running' | 'paused' | 'waiting_delay' | 'completed' | 'cancelled' | 'error';
  countdownSeconds: number;
  currentContactName?: string;
  sentCount: number;
  failedCount: number;
  logs: { phone: string; name: string; status: 'sent' | 'failed'; timestamp: string; error?: string }[];
}
