CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.social_supporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instagram text NOT NULL,
  cargo text,
  partido text,
  municipio text,
  uf text,
  grupo text,
  origem text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instagram)
);

CREATE TABLE IF NOT EXISTS public.social_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instagram text,
  termos text[] NOT NULL DEFAULT '{}',
  hashtags text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  pergunta_original text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  total_apoiadores integer NOT NULL DEFAULT 0,
  total_publicacoes integer NOT NULL DEFAULT 0,
  total_mencoes integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.social_audits(id) ON DELETE CASCADE,
  supporter_id uuid REFERENCES public.social_supporters(id) ON DELETE SET NULL,
  plataforma text NOT NULL DEFAULT 'instagram',
  url text,
  publicado_em timestamptz,
  legenda text,
  hashtags text[] NOT NULL DEFAULT '{}',
  mencoes text[] NOT NULL DEFAULT '{}',
  tipo_mencao text,
  sentimento text,
  confianca numeric(5,4),
  analise_ia jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, plataforma, url)
);

CREATE TABLE IF NOT EXISTS public.social_collection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.social_audits(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente',
  fonte text NOT NULL DEFAULT 'instaloader',
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  total_perfis integer NOT NULL DEFAULT 0,
  processados integer NOT NULL DEFAULT 0,
  erro text
);

CREATE INDEX IF NOT EXISTS social_posts_audit_idx ON public.social_posts(audit_id);
CREATE INDEX IF NOT EXISTS social_posts_supporter_idx ON public.social_posts(supporter_id);
CREATE INDEX IF NOT EXISTS social_audits_status_idx ON public.social_audits(status);

ALTER TABLE public.social_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_collection_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_supporters_public ON public.social_supporters;
DROP POLICY IF EXISTS social_targets_public ON public.social_targets;
DROP POLICY IF EXISTS social_audits_public ON public.social_audits;
DROP POLICY IF EXISTS social_posts_public ON public.social_posts;
DROP POLICY IF EXISTS social_collection_runs_public ON public.social_collection_runs;

-- A rota é pública na primeira fase. Restringir estas políticas quando o login do módulo for ativado.
CREATE POLICY social_supporters_public ON public.social_supporters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY social_targets_public ON public.social_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY social_audits_public ON public.social_audits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY social_posts_public ON public.social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY social_collection_runs_public ON public.social_collection_runs FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_supporters, public.social_targets, public.social_audits, public.social_posts, public.social_collection_runs TO anon, authenticated;
