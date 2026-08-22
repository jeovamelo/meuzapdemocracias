/**
 * Type definitions and utilities for the Campaign Logistics system.
 * Data persistence is managed via Lovable Cloud (Supabase).
 */

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

export type TipoPessoa = "responsavel" | "apoiador";

export type Pessoa = {
  id: string;
  nome: string;
  cpf?: string;
  tipo: TipoPessoa;
  funcao: string;
  comite_id: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  telefone: string;
  zona: string;
  status: "ativo" | "inativo";
  meta_votos?: number;
  meta_votos_conquistados?: number;
  criado_em?: string;
};

export type SolicitacaoMaterial = {
  id: string;
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
  comite_id: string;
  pessoa_id: string;
  kits: { kit_id: string; quantidade: number }[];
  itens: SaidaItem[];
  criado_em: string;
};

export type MovimentacaoEstoque = {
  id: string;
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

export const isHoje = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

export const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
