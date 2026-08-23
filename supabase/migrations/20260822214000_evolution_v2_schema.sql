-- 1. Tabela de Instâncias de WhatsApp (Evolution API v2)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT, -- NULL ou 'SYSTEM_GENERAL' se for a instância Geral do Sistema (/pc)
  instance_type TEXT NOT NULL CHECK (instance_type IN ('system_general', 'campaign_single')),
  instance_name TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  profile_name TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connecting', 'open', 'close', 'refused', 'disconnected')),
  qr_code_base64 TEXT,
  pairing_code TEXT,
  is_active BOOLEAN DEFAULT true,
  daily_limit INT DEFAULT 150,
  mensagens_enviadas_hoje INT DEFAULT 0,
  taxa_sucesso NUMERIC DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fila de Disparos de Mensagens (Dispatch Queue com Anti-Ban e Delay Humano)
CREATE TABLE IF NOT EXISTS public.whatsapp_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  instance_name TEXT,
  campaign_id TEXT,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'media', 'template')),
  message_content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'paused')),
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  delay_applied_seconds INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Logs de Webhooks & Auditoria da Evolution API
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance para a fila e regras de unicidade de campanha
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_pending ON public.whatsapp_dispatch_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_instances_campaign ON public.whatsapp_instances(campaign_id, is_active);

-- Garantir que cada campanha tenha no máximo 1 instância ativa (Regra de Instância Única)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_campaign_instance_v2 
ON public.whatsapp_instances (campaign_id) 
WHERE campaign_id IS NOT NULL AND campaign_id != 'SYSTEM_GENERAL' AND is_active = true;

-- Habilitar RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_dispatch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Acesso publico whatsapp_instances" ON public.whatsapp_instances FOR ALL USING (true);
  CREATE POLICY "Acesso publico whatsapp_dispatch_queue" ON public.whatsapp_dispatch_queue FOR ALL USING (true);
  CREATE POLICY "Acesso publico whatsapp_webhook_logs" ON public.whatsapp_webhook_logs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
