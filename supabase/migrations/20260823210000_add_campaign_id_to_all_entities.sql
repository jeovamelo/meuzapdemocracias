-- Adicionar campaign_id com chave estrangeira e índices em todas as entidades transacionais

-- 1. Materiais
ALTER TABLE public.materiais 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_materiais_campaign_id ON public.materiais(campaign_id);

-- 2. Kits
ALTER TABLE public.kits 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_kits_campaign_id ON public.kits(campaign_id);

-- 3. Saídas de Materiais
ALTER TABLE public.saidas 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_saidas_campaign_id ON public.saidas(campaign_id);

-- 4. Solicitações de Materiais
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_solicitacoes_campaign_id ON public.solicitacoes(campaign_id);

-- 5. Histórico de Estoque
ALTER TABLE public.historico_estoque 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_historico_estoque_campaign_id ON public.historico_estoque(campaign_id);

-- 6. Pessoas / Equipe de Campo
ALTER TABLE public.pessoas 
ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pessoas_campanha_id ON public.pessoas(campanha_id);

-- 7. Metas por Cidade
ALTER TABLE public.cidade_metas 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cidade_metas_campaign_id ON public.cidade_metas(campaign_id);

-- Habilitar RLS e Políticas Públicas de Leitura e Escrita
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cidade_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em materiais" ON public.materiais;
CREATE POLICY "Permitir tudo em materiais" ON public.materiais FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em kits" ON public.kits;
CREATE POLICY "Permitir tudo em kits" ON public.kits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em saidas" ON public.saidas;
CREATE POLICY "Permitir tudo em saidas" ON public.saidas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em solicitacoes" ON public.solicitacoes;
CREATE POLICY "Permitir tudo em solicitacoes" ON public.solicitacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em historico_estoque" ON public.historico_estoque;
CREATE POLICY "Permitir tudo em historico_estoque" ON public.historico_estoque FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em pessoas" ON public.pessoas;
CREATE POLICY "Permitir tudo em pessoas" ON public.pessoas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em cidade_metas" ON public.cidade_metas;
CREATE POLICY "Permitir tudo em cidade_metas" ON public.cidade_metas FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
