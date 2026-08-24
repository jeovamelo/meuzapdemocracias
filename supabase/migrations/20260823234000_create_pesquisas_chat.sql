-- Tabela de Pesquisas e Coletas do Chat Conversacional (chat.democracias.org)
CREATE TABLE IF NOT EXISTS public.pesquisas_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  uf TEXT,
  municipio TEXT,
  bairro TEXT,
  candidato_nome TEXT,
  candidato_urna TEXT,
  candidato_numero TEXT,
  candidato_cargo TEXT,
  candidato_partido TEXT,
  candidato_foto TEXT,
  origem_url TEXT DEFAULT 'chat.democracias.org',
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_pesquisas_chat_campaign_id ON public.pesquisas_chat(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_chat_uf_municipio ON public.pesquisas_chat(uf, municipio);
CREATE INDEX IF NOT EXISTS idx_pesquisas_chat_criado_em ON public.pesquisas_chat(criado_em DESC);

-- Habilitar RLS público
ALTER TABLE public.pesquisas_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em pesquisas_chat" ON public.pesquisas_chat;
CREATE POLICY "Permitir tudo em pesquisas_chat" ON public.pesquisas_chat FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
