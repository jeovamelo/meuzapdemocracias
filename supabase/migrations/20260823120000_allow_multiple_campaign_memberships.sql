-- Um usuário pode participar de várias campanhas. A chave primária composta
-- (campaign_id, user_id) continua impedindo vínculos duplicados na mesma campanha.
ALTER TABLE public.campaign_members
  DROP CONSTRAINT IF EXISTS campaign_members_user_id_key;

CREATE INDEX IF NOT EXISTS idx_campaign_members_user_status
  ON public.campaign_members (user_id, status);
