import { readFileSync } from 'node:fs';

export interface CandidateResult {
  id?: number;
  nome: string;
  nomeUrna: string;
  cargo: string;
  partido: string;
  numero: string;
  fotoUrl?: string;
  sqCandidato?: string;
  uf: string;
  municipio?: string;
}

function envValue(name: string) {
  const env = readFileSync('/opt/democracias/.env', 'utf8');
  return env.match(new RegExp(`^${name}="?([^"\\n]+)"?`, 'm'))?.[1];
}

export async function searchTseCandidate(uf: string, numero: string, ano = '2026', cargo = ''): Promise<CandidateResult | null> {
  const cleanUf = uf.toUpperCase().trim();
  const cleanNumero = numero.replace(/\\D/g, '');
  const url = envValue('VITE_SUPABASE_URL') || 'https://api.democracias.org';
  const key = envValue('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!key) throw new Error('Chave pública do Supabase não configurada.');
  const params = new URLSearchParams({
    sg_uf: `eq.${cleanUf}`,
    nr_candidato: `eq.${cleanNumero}`,
    select: 'id,ano_eleicao,sg_uf,ds_cargo,sq_candidato,nr_candidato,nm_candidato,nm_urna_candidato,sg_partido,foto_url',
  });
  if (cargo) params.set('ds_cargo', `ilike.*${cargo}*`);
  const response = await fetch(`${url}/rest/v1/tse_candidatos?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase retornou ${response.status}.`);
  const rows = await response.json() as any[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nm_candidato,
    nomeUrna: row.nm_urna_candidato,
    cargo: row.ds_cargo || 'Candidato',
    partido: row.sg_partido || '',
    numero: row.nr_candidato,
    uf: row.sg_uf,
    fotoUrl: row.sq_candidato ? `/tse/foto/2026/${row.sg_uf}/${row.sq_candidato}` : row.foto_url,
    sqCandidato: row.sq_candidato,
  };
}
