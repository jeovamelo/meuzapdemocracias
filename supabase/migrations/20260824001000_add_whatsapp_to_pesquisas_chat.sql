-- Adiciona colunas de contato whatsapp/telefone na tabela pesquisas_chat
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS telefone TEXT;
