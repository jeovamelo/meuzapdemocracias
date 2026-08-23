-- 1. Políticas RLS em campaigns e campaign_members
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em campaigns" ON public.campaigns;
CREATE POLICY "Permitir tudo em campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em campaign_members" ON public.campaign_members;
CREATE POLICY "Permitir tudo em campaign_members" ON public.campaign_members FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela Pessoas
ALTER TABLE public.pessoas ALTER COLUMN telefone DROP NOT NULL;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pessoas_campanha_id ON public.pessoas(campanha_id);
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em pessoas" ON public.pessoas;
CREATE POLICY "Permitir tudo em pessoas" ON public.pessoas FOR ALL USING (true) WITH CHECK (true);

-- 3. Tabela Materiais
ALTER TABLE public.materiais ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_materiais_campaign_id ON public.materiais(campaign_id);
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em materiais" ON public.materiais;
CREATE POLICY "Permitir tudo em materiais" ON public.materiais FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabela Saídas
ALTER TABLE public.saidas ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.saidas ADD COLUMN IF NOT EXISTS numero_pedido TEXT;
ALTER TABLE public.saidas ADD COLUMN IF NOT EXISTS entregador_id UUID;
CREATE INDEX IF NOT EXISTS idx_saidas_campaign_id ON public.saidas(campaign_id);
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em saidas" ON public.saidas;
CREATE POLICY "Permitir tudo em saidas" ON public.saidas FOR ALL USING (true) WITH CHECK (true);

-- 5. Tabela Kits
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_kits_campaign_id ON public.kits(campaign_id);
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em kits" ON public.kits;
CREATE POLICY "Permitir tudo em kits" ON public.kits FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabela Comitês
ALTER TABLE public.comites ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comites_campaign_id ON public.comites(campaign_id);
ALTER TABLE public.comites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em comites" ON public.comites;
CREATE POLICY "Permitir tudo em comites" ON public.comites FOR ALL USING (true) WITH CHECK (true);

-- 7. Tabela Solicitações
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_solicitacoes_campaign_id ON public.solicitacoes(campaign_id);
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em solicitacoes" ON public.solicitacoes;
CREATE POLICY "Permitir tudo em solicitacoes" ON public.solicitacoes FOR ALL USING (true) WITH CHECK (true);

-- 8. Tabela Histórico de Estoque
ALTER TABLE public.historico_estoque ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_historico_estoque_campaign_id ON public.historico_estoque(campaign_id);
ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em historico_estoque" ON public.historico_estoque;
CREATE POLICY "Permitir tudo em historico_estoque" ON public.historico_estoque FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
