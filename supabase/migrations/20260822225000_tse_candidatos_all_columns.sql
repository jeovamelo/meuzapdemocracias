-- Migration: Esquema com as 50 colunas oficiais do TSE
CREATE TABLE IF NOT EXISTS public.tse_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "dt_geracao" TEXT,
  "hh_geracao" TEXT,
  "ano_eleicao" TEXT,
  "cd_tipo_eleicao" TEXT,
  "nm_tipo_eleicao" TEXT,
  "nr_turno" TEXT,
  "cd_eleicao" TEXT,
  "ds_eleicao" TEXT,
  "dt_eleicao" TEXT,
  "tp_abrangencia" TEXT,
  "sg_uf" TEXT,
  "sg_ue" TEXT,
  "nm_ue" TEXT,
  "cd_cargo" TEXT,
  "ds_cargo" TEXT,
  "sq_candidato" TEXT,
  "nr_candidato" TEXT,
  "nm_candidato" TEXT,
  "nm_urna_candidato" TEXT,
  "nm_social_candidato" TEXT,
  "nr_cpf_candidato" TEXT,
  "ds_email" TEXT,
  "cd_situacao_candidatura" TEXT,
  "ds_situacao_candidatura" TEXT,
  "tp_agremiacao" TEXT,
  "nr_partido" TEXT,
  "sg_partido" TEXT,
  "nm_partido" TEXT,
  "nr_federacao" TEXT,
  "nm_federacao" TEXT,
  "sg_federacao" TEXT,
  "ds_composicao_federacao" TEXT,
  "sq_coligacao" TEXT,
  "nm_coligacao" TEXT,
  "ds_composicao_coligacao" TEXT,
  "sg_uf_nascimento" TEXT,
  "dt_nascimento" TEXT,
  "nr_titulo_eleitoral_candidato" TEXT,
  "cd_genero" TEXT,
  "ds_genero" TEXT,
  "cd_grau_instrucao" TEXT,
  "ds_grau_instrucao" TEXT,
  "cd_estado_civil" TEXT,
  "ds_estado_civil" TEXT,
  "cd_cor_raca" TEXT,
  "ds_cor_raca" TEXT,
  "cd_ocupacao" TEXT,
  "ds_ocupacao" TEXT,
  "cd_sit_tot_turno" TEXT,
  "ds_sit_tot_turno" TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tse_candidatos_busca ON public.tse_candidatos (sg_uf, nr_candidato, ds_cargo);
CREATE INDEX IF NOT EXISTS idx_tse_candidatos_sq ON public.tse_candidatos (sq_candidato);

ALTER TABLE public.tse_candidatos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Acesso publico tse_candidatos" ON public.tse_candidatos FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
