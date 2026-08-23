-- 1. Adicionar campaign_id na tabela comites com chave estrangeira
ALTER TABLE public.comites 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- 2. Criar índice para performance de consultas de comitês por campanha
CREATE INDEX IF NOT EXISTS idx_comites_campaign_id ON public.comites(campaign_id);

-- 3. Garantir integridade na tabela campaign_members
CREATE TABLE IF NOT EXISTS public.campaign_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'membro',
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON public.campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user_id ON public.campaign_members(user_id);

-- 4. Habilitar RLS e Políticas
ALTER TABLE public.comites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de comites" ON public.comites;
CREATE POLICY "Permitir leitura pública de comites" ON public.comites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização de comites" ON public.comites;
CREATE POLICY "Permitir inserção e atualização de comites" ON public.comites FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de membros da campanha" ON public.campaign_members;
CREATE POLICY "Permitir leitura de membros da campanha" ON public.campaign_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gestão de membros da campanha" ON public.campaign_members;
CREATE POLICY "Permitir gestão de membros da campanha" ON public.campaign_members FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
