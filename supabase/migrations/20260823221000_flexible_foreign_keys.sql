-- 1. Permitir que admin_user_id em campaigns seja nulo ou sem fkey restritivo se não houver usuário logado no Auth
ALTER TABLE public.campaigns ALTER COLUMN admin_user_id DROP NOT NULL;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_admin_user_id_fkey;

-- 2. Permitir comite_id e pessoa_id nulos em saidas
ALTER TABLE public.saidas ALTER COLUMN comite_id DROP NOT NULL;
ALTER TABLE public.saidas ALTER COLUMN pessoa_id DROP NOT NULL;

-- 3. Permitir comite_id nulo em pessoas
ALTER TABLE public.pessoas ALTER COLUMN comite_id DROP NOT NULL;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
