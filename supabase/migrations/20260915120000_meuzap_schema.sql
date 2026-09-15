-- Migracao do modulo meuzap.democracias.org
-- Gerencia sessoes efemeras de WhatsApp do eleitor e auditoria minima de envios de colinhas

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabela de Sessoes Temporarias
CREATE TABLE IF NOT EXISTS public.meuzap_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  voter_name text NOT NULL,
  voter_phone text,
  colinha_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_target_contacts integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'created', -- 'created', 'connected', 'dispatching', 'completed', 'cancelled', 'expired'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indices para buscas rapidas por sessao e status
CREATE INDEX IF NOT EXISTS idx_meuzap_sessions_session_id ON public.meuzap_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_meuzap_sessions_voter_phone ON public.meuzap_sessions(voter_phone);

-- 2. Tabela de Logs e Auditoria de Disparos
CREATE TABLE IF NOT EXISTS public.meuzap_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.meuzap_sessions(session_id) ON DELETE CASCADE,
  voter_phone text NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  message_text text NOT NULL,
  media_sent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed'
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indices para validacao rapida de limites diarios e totais
CREATE INDEX IF NOT EXISTS idx_meuzap_dispatch_logs_voter_phone ON public.meuzap_dispatch_logs(voter_phone);
CREATE INDEX IF NOT EXISTS idx_meuzap_dispatch_logs_sent_at ON public.meuzap_dispatch_logs(sent_at);

-- 3. Funcao Anti-Spam / Rate Limit
-- Regras de compliance: maximo 50 mensagens nas ultimas 24h e teto absoluto de 100 mensagens no total
CREATE OR REPLACE FUNCTION public.meuzap_check_rate_limit(p_voter_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_24h integer;
  v_count_total integer;
  v_allowed boolean;
  v_reason text := null;
BEGIN
  IF p_voter_phone IS NULL OR trim(p_voter_phone) = '' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Telefone do eleitor nao identificado',
      'count_24h', 0,
      'count_total', 0
    );
  END IF;

  -- Contagem das ultimas 24 horas
  SELECT count(*)
  INTO v_count_24h
  FROM public.meuzap_dispatch_logs
  WHERE voter_phone = p_voter_phone
    AND status = 'sent'
    AND sent_at >= (now() - interval '24 hours');

  -- Contagem total absoluta
  SELECT count(*)
  INTO v_count_total
  FROM public.meuzap_dispatch_logs
  WHERE voter_phone = p_voter_phone
    AND status = 'sent';

  IF v_count_24h >= 50 THEN
    v_allowed := false;
    v_reason := 'Limite diario de 50 mensagens atingido para este WhatsApp. Tente novamente apos 24 horas.';
  ELSIF v_count_total >= 100 THEN
    v_allowed := false;
    v_reason := 'Teto absoluto de 100 mensagens atingido para este eleitor.';
  ELSE
    v_allowed := true;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'count_24h', v_count_24h,
    'count_total', v_count_total,
    'remaining_today', GREATEST(0, 50 - v_count_24h),
    'remaining_total', GREATEST(0, 100 - v_count_total)
  );
END;
$$;

-- 4. Habilitar RLS
ALTER TABLE public.meuzap_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meuzap_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Politicas de acesso anonimo para o fluxo publico de meuzap
DROP POLICY IF EXISTS "Anon select meuzap_sessions" ON public.meuzap_sessions;
CREATE POLICY "Anon select meuzap_sessions"
  ON public.meuzap_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon insert meuzap_sessions" ON public.meuzap_sessions;
CREATE POLICY "Anon insert meuzap_sessions"
  ON public.meuzap_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon update meuzap_sessions" ON public.meuzap_sessions;
CREATE POLICY "Anon update meuzap_sessions"
  ON public.meuzap_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon insert meuzap_dispatch_logs" ON public.meuzap_dispatch_logs;
CREATE POLICY "Anon insert meuzap_dispatch_logs"
  ON public.meuzap_dispatch_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon select meuzap_dispatch_logs" ON public.meuzap_dispatch_logs;
CREATE POLICY "Anon select meuzap_dispatch_logs"
  ON public.meuzap_dispatch_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);
