import { createClient } from '@supabase/supabase-js';

// Credenciais obrigatórias via env (VITE_* no build do Vite).
// Nenhuma chave deve ser embutida no código-fonte.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[chat] Variáveis de ambiente ausentes: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Configure o arquivo .env do chat antes de compilar.',
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://api.democracias.org',
  SUPABASE_ANON_KEY || 'missing-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
