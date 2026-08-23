ALTER TABLE public.saidas DROP CONSTRAINT IF EXISTS saidas_comite_id_fkey;
ALTER TABLE public.saidas DROP CONSTRAINT IF EXISTS saidas_pessoa_id_fkey;
ALTER TABLE public.saidas DROP CONSTRAINT IF EXISTS saidas_entregador_id_fkey;
NOTIFY pgrst, 'reload schema';
