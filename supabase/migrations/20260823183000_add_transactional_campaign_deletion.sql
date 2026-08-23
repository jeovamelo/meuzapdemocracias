-- Remove uma campanha de forma atômica e limpa todas as tabelas que
-- declaram vínculo explícito por campaign_id/campanha_id. A busca dinâmica
-- também protege integrações criadas no futuro contra registros órfãos.
CREATE OR REPLACE FUNCTION public.delete_campaign_completely(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  related_table record;
  campaign_key text := p_campaign_id::text;
BEGIN
  -- Somente o administrador da campanha pode executar a remoção.
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.campaigns AS campaign
    WHERE campaign.id = p_campaign_id
      AND (
        campaign.admin_user_id = auth.uid()
        OR public.is_campaign_admin(campaign.id)
      )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para excluir esta campanha';
  END IF;

  -- Remove dependências de qualquer tabela que esteja formalmente vinculada
  -- à campanha. campaign_id pode ser UUID ou TEXT nas integrações legadas.
  FOR related_table IN
    SELECT columns.table_schema, columns.table_name, columns.column_name
    FROM information_schema.columns AS columns
    INNER JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
      AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND tables.table_type = 'BASE TABLE'
      AND columns.column_name IN ('campaign_id', 'campanha_id')
      AND columns.table_name <> 'campaigns'
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I::text = $1',
      related_table.table_schema,
      related_table.table_name,
      related_table.column_name
    ) USING campaign_key;
  END LOOP;

  -- A remoção da campanha encerra a transação. Se qualquer DELETE acima
  -- falhar, nada é persistido e a campanha continua intacta.
  DELETE FROM public.campaigns WHERE id = p_campaign_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_campaign_completely(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_campaign_completely(uuid) TO authenticated;
