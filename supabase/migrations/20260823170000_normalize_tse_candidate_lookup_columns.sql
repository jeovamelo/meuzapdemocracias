-- Normaliza os campos usados pela busca do onboarding.
-- A migração é segura para ambientes que já possuam as colunas na VPS.
ALTER TABLE public.tse_candidatos
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cargo TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Mantém os dados já importados disponíveis pela nomenclatura de consulta atual.
UPDATE public.tse_candidatos
SET
  uf = COALESCE(NULLIF(uf, ''), sg_uf),
  cargo = COALESCE(NULLIF(cargo, ''), ds_cargo)
WHERE uf IS NULL
   OR uf = ''
   OR cargo IS NULL
   OR cargo = '';

CREATE INDEX IF NOT EXISTS idx_tse_candidatos_lookup_onboarding
  ON public.tse_candidatos (uf, cargo, nr_candidato);
