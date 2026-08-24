-- Atualizar tabela pesquisas_chat com suporte a todos os cargos da pesquisa eleitoral completa
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_estadual_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_estadual_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_estadual_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_estadual_partido TEXT;

ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_federal_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_federal_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_federal_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS dep_federal_partido TEXT;

ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador1_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador1_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador1_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador1_partido TEXT;

ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador2_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador2_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador2_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS senador2_partido TEXT;

ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS governador_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS governador_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS governador_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS governador_partido TEXT;

ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS presidente_numero TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS presidente_nome TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS presidente_foto TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS presidente_partido TEXT;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
