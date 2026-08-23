-- Metas de cidades são específicas de cada campanha. Este vínculo evita que
-- planejamentos de campanhas diferentes sejam exibidos ou alterados juntos.
ALTER TABLE public.cidade_metas
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS cidade_metas_campaign_municipio_unique
  ON public.cidade_metas (campaign_id, municipio);

CREATE INDEX IF NOT EXISTS cidade_metas_campaign_uf_idx
  ON public.cidade_metas (campaign_id, uf);
