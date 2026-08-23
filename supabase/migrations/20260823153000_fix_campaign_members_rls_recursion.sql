-- Avoid evaluating campaign_members from inside its own RLS policy.
-- The SECURITY DEFINER helper executes the membership check outside RLS,
-- while the policy still limits access to the member or a campaign admin.
CREATE OR REPLACE FUNCTION public.is_campaign_admin(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_members
    WHERE campaign_id = target_campaign_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_campaign_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campaign_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS members_auth ON public.campaign_members;

CREATE POLICY members_auth
ON public.campaign_members
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_campaign_admin(campaign_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_campaign_admin(campaign_id)
);
