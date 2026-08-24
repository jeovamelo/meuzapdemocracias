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
  isBrancoNulo?: boolean;
}

export type CargoEtapa =
  | 'deputado_estadual'
  | 'deputado_federal'
  | 'senador_1'
  | 'senador_2'
  | 'governador'
  | 'presidente';

export type EtapaChat =
  | 'boas_vindas'
  | 'nome'
  | 'cpf'
  | 'whatsapp'
  | 'uf'
  | 'voto_dep_federal'
  | 'confirm_dep_federal'
  | 'voto_dep_estadual'
  | 'confirm_dep_estadual'
  | 'voto_senador_1'
  | 'confirm_senador_1'
  | 'voto_senador_2'
  | 'confirm_senador_2'
  | 'voto_governador'
  | 'confirm_governador'
  | 'voto_presidente'
  | 'confirm_presidente'
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

export interface VotosPesquisa {
  deputado_estadual?: Candidato | null;
  deputado_federal?: Candidato | null;
  senador_1?: Candidato | null;
  senador_2?: Candidato | null;
  governador?: Candidato | null;
  presidente?: Candidato | null;
}

export interface RespostaUsuario {
  nome: string;
  cpf?: string;
  whatsapp?: string;
  uf: string;
  municipio: string;
  bairro: string;
  cep?: string;
  votos: VotosPesquisa;
}
