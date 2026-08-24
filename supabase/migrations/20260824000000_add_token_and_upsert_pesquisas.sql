-- Adicionar coluna respondente_token e atualizar lógica de sobrescrita
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS respondente_token TEXT;
ALTER TABLE public.pesquisas_chat ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pesquisas_chat_cpf ON public.pesquisas_chat(cpf);
CREATE INDEX IF NOT EXISTS idx_pesquisas_chat_token ON public.pesquisas_chat(respondente_token);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
