/**
 * Type definitions and utilities for the Campaign Logistics system.
 * Data persistence is managed via Lovable Cloud (Supabase).
 */

export type PapelCampanha =
  | "Candidato(a)"
  | "Coordenador(a) Geral / Chefe de Campanha"
  | "Marqueteiro(a) / Estrategista Chefe"
  | "Advogado(a) Eleitoral (Jurídico)"
  | "Contador(a) Eleitoral"
  | "Coordenador(a) de Comunicação e Redes Sociais"
  | "Coordenador(a) de Articulação Política / Alianças"
  | "Tesoureiro(a) / Diretor(a) Financeiro(a)"
  | "Coordenador(a) de Mobilização / Rua"
  | "Lideranças Comunitárias"
  | "Lideranças Religiosas"
  | "Eleitor e Outros";

export const PAPEIS_CAMPANHA_OPCOES: { label: string; value: PapelCampanha }[] = [
  { label: "Candidato(a)", value: "Candidato(a)" },
  { label: "Coordenador(a) Geral / Chefe de Campanha", value: "Coordenador(a) Geral / Chefe de Campanha" },
  { label: "Marqueteiro(a) / Estrategista Chefe", value: "Marqueteiro(a) / Estrategista Chefe" },
  { label: "Advogado(a) Eleitoral (Jurídico)", value: "Advogado(a) Eleitoral (Jurídico)" },
  { label: "Contador(a) Eleitoral", value: "Contador(a) Eleitoral" },
  { label: "Coordenador(a) de Comunicação e Redes Sociais", value: "Coordenador(a) de Comunicação e Redes Sociais" },
  { label: "Coordenador(a) de Articulação Política / Alianças", value: "Coordenador(a) de Articulação Política / Alianças" },
  { label: "Tesoureiro(a) / Diretor(a) Financeiro(a)", value: "Tesoureiro(a) / Diretor(a) Financeiro(a)" },
  { label: "Coordenador(a) de Mobilização / Rua", value: "Coordenador(a) de Mobilização / Rua" },
  { label: "Lideranças Comunitárias", value: "Lideranças Comunitárias" },
  { label: "Lideranças Religiosas", value: "Lideranças Religiosas" },
  { label: "Eleitor e Outros", value: "Eleitor e Outros" },
];

export type ComiteStatus = "ativo" | "pendente_validacao";

export type Comite = {
  id: string;
  nome: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  coordenador: string;
  whatsapp_coordenador?: string;
  observacoes: string;
  status: ComiteStatus;
  ativo: boolean;
  cep?: string;
  ponto_referencia?: string;
  foto?: string;
  meta_votos?: number;
  meta_votos_conquistados?: number;
  criado_em?: string;
};

export type TipoPessoa = "responsavel" | "apoiador" | "membro_campanha" | "eleitor";

export type Pessoa = {
  id: string;
  nome: string;
  cpf: string;
  tipo: TipoPessoa;
  funcao?: string;
  papel_campanha?: PapelCampanha;
  papel_personalizado?: string;
  comite_id?: string;
  campanha_id?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  titulo_eleitor?: string;
  zona?: string;
  secao?: string;
  status: "ativo" | "pendente_aprovacao" | "inativo";
  foto_validacao_url?: string;
  is_admin_campanha?: boolean;
  meta_votos?: number;
  meta_votos_conquistados?: number;
  criado_em?: string;
};

export type SolicitacaoMaterial = {
  id: string;
  campaign_id?: string;
  numero_pedido?: string;
  nome: string;
  comite_id: string;
  lideranca_id?: string;
  municipio?: string;
  itens: { material_id: string; quantidade: number }[];
  tipo_logistica: "retirada" | "entrega";
  endereco_entrega?: string;
  status: "pendente" | "separando" | "pronto" | "entregue" | "cancelado";
  criado_em: string;
};

export type CategoriaMaterial =
  | "Adesivo (Sanfonado / Pequeno)"
  | "Adesivo de Carro (Perfurado)"
  | "Adesivo pára-choque"
  | "Bóton"
  | "Bandeira"
  | "Folder / Santinho / Material Gráfico"
  | "Santinho"
  | "Santão"
  | "Revista dobrada"
  | "Banner / Lona / Grande Formato"
  | "Vestuário (Camiseta, Boné, Colete)"
  | "Sons / Eletrônicos / Equipamentos"
  | "Outros";

export type Material = {
  id: string;
  campaign_id?: string;
  nome: string;
  categoria: CategoriaMaterial;
  estoque: number;
  estoque_minimo: number;
  unidade: string;
  descricao?: string;
  foto?: string;
  arquivado: boolean;
  criado_em?: string;
};

export type KitItem = { material_id: string; quantidade: number };

export type Kit = {
  id: string;
  campaign_id?: string;
  nome: string;
  descricao: string;
  itens: KitItem[];
  arquivado: boolean;
  criado_em?: string;
};

export type SaidaItem = {
  material_id: string;
  quantidade: number;
  kit_id?: string;
};

export type Saida = {
  id: string;
  numero_pedido?: string;
  campaign_id?: string;
  comite_id: string;
  pessoa_id?: string | null;
  entregador_id?: string;
  kits: { kit_id: string; quantidade: number }[];
  itens: SaidaItem[];
  criado_em: string;
};

export type MovimentacaoEstoque = {
  id: string;
  campaign_id?: string;
  material_id: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  diferenca: number;
  tipo: "saida" | "entrada" | "ajuste_inventario";
  observacao?: string;
  criado_em: string;
};

export type CidadeMeta = {
  id: string;
  campaign_id?: string;
  municipio: string;
  uf: string;
  meta_campanha: number;
  realidade_votos: number;
  criado_em?: string;
};

export type BoletimUrna = {
  id: string;
  secao: string;
  zona: string;
  municipio: string;
  uf: string;
  total_votos: number;
  votos_candidato: number;
  data_leitura: string;
  fiscal_id?: string;
  foto?: string;
  pleito: string;
  assinatura_digital: string;
};

export type CampanhaRegistro = {
  id: string;
  uf: string;
  cargo: string;
  numero: string;
  candidato_nome: string;
  candidato_urna: string;
  partido_coligacao: string;
  foto_candidato_url?: string;
  admin_nome: string;
  admin_cpf: string;
  admin_telefone?: string;
  admin_foto_validacao_url: string;
  status_validacao: "pendente_aprovacao_admin_geral" | "aprovado" | "rejeitado";
  criado_em: string;
};

export type SolicitacaoAdesaoCampanha = {
  id: string;
  campanha_id: string;
  pessoa_id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  papel_campanha: PapelCampanha;
  papel_personalizado?: string;
  status: "pendente" | "aprovado" | "rejeitado";
  criado_em: string;
};

export type ConfigCampanha = {
  id: string;
  candidato_nome: string;
  candidato_urna: string;
  numero: string;
  cargo: string;
  partido_coligacao: string;
  uf: string;
  meta_eleicao: number;
  meta_expectativa: number;
  configurada: boolean;
  total_secoes?: number;
};

export type Database = {
  comites: Comite[];
  pessoas: Pessoa[];
  materiais: Material[];
  kits: Kit[];
  saidas: Saida[];
  solicitacoes: SolicitacaoMaterial[];
  cidade_metas: CidadeMeta[];
  config: ConfigCampanha;
  boletins: BoletimUrna[];
  historico_estoque: MovimentacaoEstoque[];
  campanhas_registradas: CampanhaRegistro[];
  solicitacoes_adesao: SolicitacaoAdesaoCampanha[];
};

export const CATEGORIAS: CategoriaMaterial[] = [
  "Adesivo (Sanfonado / Pequeno)",
  "Adesivo de Carro (Perfurado)",
  "Adesivo pára-choque",
  "Bóton",
  "Bandeira",
  "Folder / Santinho / Material Gráfico",
  "Santinho",
  "Santão",
  "Revista dobrada",
  "Banner / Lona / Grande Formato",
  "Vestuário (Camiseta, Boné, Colete)",
  "Sons / Eletrônicos / Equipamentos",
  "Outros",
];

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const isCritico = (m: Material) => m.estoque <= m.estoque_minimo;

export const formatNumero = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const whatsappLink = (telefone: string) =>
  `https://wa.me/55${telefone.replace(/\D/g, "")}`;

export const formatTelefone = (t: string) => {
  const d = t.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
};

export { formatHora, formatData, formatDataHora, formatDataCompleta, isHoje, APP_TIMEZONE } from "./date";
