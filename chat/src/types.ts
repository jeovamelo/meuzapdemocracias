export interface Candidato {
  id: string;
  nome: string;
  nomeUrna: string;
  numero: string;
  cargo: string;
  partido?: string;
  uf: string;
  fotoUrl?: string;
  campaign_id?: string;
}

export type EtapaChat =
  | 'boas_vindas'
  | 'nome'
  | 'cpf'
  | 'uf'
  | 'candidato_selecao'
  | 'candidato_confirmacao'
  | 'localizacao'
  | 'concluido';

export interface Mensagem {
  id: string;
  remetente: 'bot' | 'user';
  conteudo: string;
  tipo?: 'texto' | 'candidato_card' | 'candidato_grid' | 'localizacao' | 'share';
  dadosExtras?: any;
  timestamp: string;
}

export interface RespostaUsuario {
  nome: string;
  cpf?: string;
  uf: string;
  candidato?: Candidato;
  municipio: string;
  bairro: string;
  cep?: string;
}
