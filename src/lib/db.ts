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
  coordenador: string;
  observacoes: string;
  ativo: boolean;
};

export type TipoPessoa = "responsavel" | "apoiador";

export type Pessoa = {
  id: string;
  nome: string;
  tipo: TipoPessoa;
  funcao: string;
  comite_id: string;
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
      nome: "Comitê Central",
      endereco: "Av. Paulista, 1420 - Loja 3",
      bairro: "Centro / Zona Central",
      coordenador: "Maria Oliveira",
      observacoes: "Base principal de distribuição. Abre às 07h.",
      ativo: true,
    },
    {
      id: "c2",
      nome: "Base Leste - Jardim Ipê",
      endereco: "Rua das Acácias, 88",
      bairro: "Jardim Ipê / Zona Leste",
      coordenador: "Ana Paula Santos",
      observacoes: "Galpão com estoque de bandeiras.",
      ativo: true,
    },
    {
      id: "c3",
      nome: "Ponto 04 - Centro Velho",
      endereco: "Praça da Sé, 12",
      bairro: "Sé / Zona Central",
      coordenador: "Roberto Mendes",
      observacoes: "Ponto de rua, sem estoque fixo.",
      ativo: true,
    },
    {
      id: "c4",
      nome: "Base Sul - Vila Nova",
      endereco: "Rua Domingos Ferraz, 501",
      bairro: "Vila Nova / Zona Sul",
      coordenador: "Cleber Araújo",
      observacoes: "Chave com o coordenador.",
      ativo: true,
    },
  ];

  const pessoas: Pessoa[] = [
    {
      id: "p1",
      nome: "Maria Oliveira",
      tipo: "responsavel",
      funcao: "Coordenadora Geral",
      comite_id: "c1",
      telefone: "11988770011",
      zona: "Zona Central",
    },
    {
      id: "p2",
      nome: "Ana Paula Santos",
      tipo: "responsavel",
      funcao: "Coordenadora de Base",
      comite_id: "c2",
      telefone: "11987661122",
      zona: "Zona Leste",
    },
    {
      id: "p3",
      nome: "Roberto Mendes",
      tipo: "responsavel",
      funcao: "Responsável de Ponto",
      comite_id: "c3",
      telefone: "11991234455",
      zona: "Zona Central",
    },
    {
      id: "p4",
      nome: "Roberto Silveira",
      tipo: "apoiador",
      funcao: "Cabo Eleitoral",
      comite_id: "c4",
      telefone: "11994455667",
      zona: "Zona Sul",
    },
    {
      id: "p5",
      nome: "Marcos Vinícius Lima",
      tipo: "apoiador",
      funcao: "Panfletagem",
      comite_id: "c1",
      telefone: "11993322110",
      zona: "Zona Central",
    },
    {
      id: "p6",
      nome: "Juliana Ferraz",
      tipo: "apoiador",
      funcao: "Cabo Eleitoral",
      comite_id: "c2",
      telefone: "11985566778",
      zona: "Zona Leste",
    },
    {
      id: "p7",
      nome: "Edson Ribeiro",
      tipo: "apoiador",
      funcao: "Carro de Som",
      comite_id: "c3",
      telefone: "11996677889",
      zona: "Zona Norte",
    },
  ];

  const materiais: Material[] = [
    {
      id: "m1",
      nome: "Santinho A5 - Candidato 01",
      categoria: "Papelaria",
      estoque: 1200,
      estoque_minimo: 5000,
      unidade: "un",
    },
    {
      id: "m2",
      nome: "Bandeira 1,0 x 0,7m",
      categoria: "Grande Formato",
      estoque: 4,
      estoque_minimo: 20,
      unidade: "un",
    },
    {
      id: "m3",
      nome: "Adesivo Perfurado 20x10cm",
      categoria: "Papelaria",
      estoque: 860,
      estoque_minimo: 300,
      unidade: "un",
    },
    {
      id: "m4",
      nome: "Camiseta Branca Campanha",
      categoria: "Vestuário",
      estoque: 140,
      estoque_minimo: 60,
      unidade: "un",
    },
    {
      id: "m5",
      nome: "Boné Campanha",
      categoria: "Vestuário",
      estoque: 38,
      estoque_minimo: 50,
      unidade: "un",
    },
    {
      id: "m6",
      nome: "Faixa 3x1m Lona",
      categoria: "Grande Formato",
      estoque: 22,
      estoque_minimo: 10,
      unidade: "un",
    },
    {
      id: "m7",
      nome: "Panfleto A4 Propostas",
      categoria: "Papelaria",
      estoque: 9400,
      estoque_minimo: 2000,
      unidade: "un",
    },
    {
      id: "m8",
      nome: "Colete Refletivo",
      categoria: "Vestuário",
      estoque: 12,
      estoque_minimo: 15,
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
      nome: "Kit Panfletagem",
      descricao: "Semáforo e feiras",
      itens: [
        { material_id: "m7", quantidade: 300 },
        { material_id: "m4", quantidade: 1 },
        { material_id: "m8", quantidade: 1 },
      ],
    },
    {
      id: "k3",
      nome: "Kit Evento",
      descricao: "Comício e caminhada",
      itens: [
        { material_id: "m2", quantidade: 6 },
        { material_id: "m6", quantidade: 2 },
        { material_id: "m5", quantidade: 10 },
      ],
    },
  ];

  const saidas: Saida[] = [
    {
      id: "s1",
      comite_id: "c1",
      pessoa_id: "p5",
      kits: [{ kit_id: "k1", quantidade: 2 }],
      itens: [
        { material_id: "m1", quantidade: 1000, kit_id: "k1" },
        { material_id: "m2", quantidade: 4, kit_id: "k1" },
        { material_id: "m3", quantidade: 20, kit_id: "k1" },
      ],
      criado_em: hoje("08:40"),
    },
    {
      id: "s2",
      comite_id: "c2",
      pessoa_id: "p6",
      kits: [{ kit_id: "k2", quantidade: 3 }],
      itens: [
        { material_id: "m7", quantidade: 900, kit_id: "k2" },
        { material_id: "m4", quantidade: 3, kit_id: "k2" },
        { material_id: "m8", quantidade: 3, kit_id: "k2" },
      ],
      criado_em: hoje("11:15"),
    },
    {
      id: "s3",
      comite_id: "c3",
      pessoa_id: "p7",
      kits: [],
      itens: [{ material_id: "m6", quantidade: 2 }],
      criado_em: hoje("14:20"),
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
