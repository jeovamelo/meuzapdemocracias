/**
 * Local "database" layer.
 *
 * Every read/write goes through this module and returns Promises, so swapping
 * localStorage for Lovable Cloud (Supabase) later means replacing only the
 * bodies of these functions — the UI stays untouched.
 */

export type Comite = {
  id: string;
  nome: string;
  endereco: string;
  bairro: string;
  municipio: string;
  coordenador: string;
  observacoes: string;
  ativo: boolean;
  cep?: string;
};

export type TipoPessoa = "responsavel" | "apoiador";

export type Pessoa = {
  id: string;
  nome: string;
  cpf?: string;
  tipo: TipoPessoa;
  funcao: string;
  comite_id: string;
  municipio: string;
  telefone: string;
  zona: string;
};

export type CategoriaMaterial = "Papelaria" | "Grande Formato" | "Vestuário";

export type Material = {
  id: string;
  nome: string;
  categoria: CategoriaMaterial;
  estoque: number;
  estoque_minimo: number;
  unidade: string;
};

export type KitItem = { material_id: string; quantidade: number };

export type Kit = {
  id: string;
  nome: string;
  descricao: string;
  itens: KitItem[];
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

export type Database = {
  comites: Comite[];
  pessoas: Pessoa[];
  materiais: Material[];
  kits: Kit[];
  saidas: Saida[];
};

export const CATEGORIAS: CategoriaMaterial[] = [
  "Papelaria",
  "Grande Formato",
  "Vestuário",
];

const STORAGE_KEY = "campanha-logistica-db-v1";

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function hoje(hora: string) {
  const d = new Date();
  const [h, m] = hora.split(":").map(Number);
  d.setHours(h ?? 9, m ?? 0, 0, 0);
  return d.toISOString();
}

export function seed(): Database {
  const comites: Comite[] = [
    {
      id: "c1",
      nome: "Comitê Central Fortaleza",
      endereco: "Av. Desembargador Moreira, 1000",
      bairro: "Aldeota",
      municipio: "Fortaleza",
      coordenador: "Maria Oliveira",
      observacoes: "Base principal de distribuição. Abre às 07h.",
      ativo: true,
      cep: "60170-002",
    },
    {
      id: "c2",
      nome: "Base Caucaia - Centro",
      endereco: "Rua Juaci Sampaio Pontes, 88",
      bairro: "Centro",
      municipio: "Caucaia",
      coordenador: "Ana Paula Santos",
      observacoes: "Galpão com estoque de bandeiras.",
      ativo: true,
      cep: "61600-004",
    },
    {
      id: "c3",
      nome: "Ponto Maracanaú",
      endereco: "Av. Mendel Steinbruch, 12",
      bairro: "Pajuçara",
      municipio: "Maracanaú",
      coordenador: "Roberto Mendes",
      observacoes: "Ponto estratégico de rua.",
      ativo: true,
      cep: "61939-200",
    },
    {
      id: "c4",
      nome: "Base Juazeiro do Norte",
      endereco: "Rua Padre Cícero, 501",
      bairro: "Centro",
      municipio: "Juazeiro do Norte",
      coordenador: "Cleber Araújo",
      observacoes: "Chave com o coordenador local.",
      ativo: true,
      cep: "63010-020",
    },
  ];

  const pessoas: Pessoa[] = [
    {
      id: "p1",
      nome: "Maria Oliveira",
      cpf: "123.456.789-00",
      tipo: "responsavel",
      funcao: "Coordenadora Geral",
      comite_id: "c1",
      municipio: "Fortaleza",
      telefone: "85988770011",
      zona: "Zona 001",
    },
    {
      id: "p2",
      nome: "Ana Paula Santos",
      cpf: "234.567.890-11",
      tipo: "responsavel",
      funcao: "Coordenadora de Base",
      comite_id: "c2",
      municipio: "Caucaia",
      telefone: "85987661122",
      zona: "Zona 120",
    },
    {
      id: "p3",
      nome: "Roberto Mendes",
      cpf: "345.678.901-22",
      tipo: "responsavel",
      funcao: "Responsável de Ponto",
      comite_id: "c3",
      municipio: "Maracanaú",
      telefone: "85991234455",
      zona: "Zona 104",
    },
    {
      id: "p4",
      nome: "Roberto Silveira",
      cpf: "456.789.012-33",
      tipo: "apoiador",
      funcao: "Cabo Eleitoral",
      comite_id: "c4",
      municipio: "Juazeiro do Norte",
      telefone: "88994455667",
      zona: "Zona 028",
    },
    {
      id: "p5",
      nome: "Marcos Vinícius Lima",
      cpf: "567.890.123-44",
      tipo: "apoiador",
      funcao: "Panfletagem",
      comite_id: "c1",
      municipio: "Fortaleza",
      telefone: "85993322110",
      zona: "Zona 002",
    },
    {
      id: "p6",
      nome: "Juliana Ferraz",
      cpf: "678.901.234-55",
      tipo: "apoiador",
      funcao: "Cabo Eleitoral",
      comite_id: "c2",
      municipio: "Caucaia",
      telefone: "85985566778",
      zona: "Zona 120",
    },
    {
      id: "p7",
      nome: "Edson Ribeiro",
      cpf: "789.012.345-66",
      tipo: "apoiador",
      funcao: "Carro de Som",
      comite_id: "c3",
      municipio: "Maracanaú",
      telefone: "85996677889",
      zona: "Zona 104",
    },
    {
      id: "p8",
      nome: "Francisco Silva",
      cpf: "890.123.456-77",
      tipo: "apoiador",
      funcao: "Mobilizador",
      comite_id: "c1",
      municipio: "Sobral",
      telefone: "88998877665",
      zona: "Zona 024",
    },
  ];

  const materiais: Material[] = [
    {
      id: "m1",
      nome: "Santinho A5 - Candidato 01",
      categoria: "Papelaria",
      estoque: 125000,
      estoque_minimo: 50000,
      unidade: "un",
    },
    {
      id: "m2",
      nome: "Bandeira 1,0 x 0,7m",
      categoria: "Grande Formato",
      estoque: 1450,
      estoque_minimo: 500,
      unidade: "un",
    },
    {
      id: "m3",
      nome: "Adesivo Perfurado 20x10cm",
      categoria: "Papelaria",
      estoque: 8600,
      estoque_minimo: 3000,
      unidade: "un",
    },
    {
      id: "m4",
      nome: "Camiseta Branca Campanha",
      categoria: "Vestuário",
      estoque: 2400,
      estoque_minimo: 600,
      unidade: "un",
    },
    {
      id: "m5",
      nome: "Boné Campanha",
      categoria: "Vestuário",
      estoque: 380,
      estoque_minimo: 500,
      unidade: "un",
    },
    {
      id: "m6",
      nome: "Faixa 3x1m Lona",
      categoria: "Grande Formato",
      estoque: 220,
      estoque_minimo: 100,
      unidade: "un",
    },
    {
      id: "m7",
      nome: "Panfleto A4 Propostas",
      categoria: "Papelaria",
      estoque: 94000,
      estoque_minimo: 20000,
      unidade: "un",
    },
  ];

  const kits: Kit[] = [
    {
      id: "k1",
      nome: "Kit Rua Padrão",
      descricao: "Distribuição diária para cabos eleitorais",
      itens: [
        { material_id: "m1", quantidade: 500 },
        { material_id: "m2", quantidade: 2 },
        { material_id: "m3", quantidade: 10 },
      ],
    },
    {
      id: "k2",
      nome: "Kit Panfletagem Semáforo",
      descricao: "Material para pontos de tráfego",
      itens: [
        { material_id: "m7", quantidade: 300 },
        { material_id: "m4", quantidade: 1 },
      ],
    },
  ];

  const saidas: Saida[] = [
    {
      id: "s1",
      comite_id: "c1",
      pessoa_id: "p5",
      kits: [{ kit_id: "k1", quantidade: 100 }],
      itens: [
        { material_id: "m1", quantidade: 50000, kit_id: "k1" },
        { material_id: "m2", quantidade: 200, kit_id: "k1" },
        { material_id: "m3", quantidade: 1000, kit_id: "k1" },
      ],
      criado_em: hoje("08:40"),
    },
    {
      id: "s2",
      comite_id: "c2",
      pessoa_id: "p6",
      kits: [{ kit_id: "k2", quantidade: 50 }],
      itens: [
        { material_id: "m7", quantidade: 15000, kit_id: "k2" },
        { material_id: "m4", quantidade: 50, kit_id: "k2" },
      ],
      criado_em: hoje("11:15"),
    },
    {
      id: "s3",
      comite_id: "c3",
      pessoa_id: "p7",
      kits: [],
      itens: [{ material_id: "m6", quantidade: 50 }],
      criado_em: hoje("14:20"),
    },
    {
      id: "s4",
      comite_id: "c4",
      pessoa_id: "p4",
      kits: [],
      itens: [{ material_id: "m1", quantidade: 25000 }],
      criado_em: hoje("16:00"),
    },
  ];

  return { comites, pessoas, materiais, kits, saidas };
}

export function loadDb(): Database {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.comites || !parsed.materiais) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveDb(db: Database) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* quota */
  }
}

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
