-- 1. Adicionar colunas faltantes em pessoas
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS papel_campanha TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS papel_personalizado TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS is_admin_campanha BOOLEAN DEFAULT false;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS foto_validacao_url TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS titulo_eleitor TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS secao TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS zona TEXT;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS meta_votos INTEGER DEFAULT 1;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS meta_votos_conquistados INTEGER DEFAULT 0;

-- 2. Adicionar colunas faltantes em campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_nome TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_cpf TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_telefone TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_foto_validacao_url TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status_validacao TEXT DEFAULT 'aprovado';

-- 3. Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
