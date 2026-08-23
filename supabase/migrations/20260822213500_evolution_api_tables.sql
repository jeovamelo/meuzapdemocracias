-- Tabelas para Integração com Evolution API, Instâncias de Campanha e Controle de Mensageria Anti-Bloqueio

-- 1. Instâncias de WhatsApp (Geral e de Campanhas)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT UNIQUE NOT NULL,
    campaign_id TEXT, -- ID da campanha vinculada ou 'SYSTEM_GENERAL' para a instância do sistema (/pc)
    tipo TEXT NOT NULL DEFAULT 'campaign', -- 'system_general' ou 'campaign'
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected', -- 'connecting', 'connected', 'disconnected'
    qr_code_base64 TEXT,
    pairing_code TEXT,
    apikey TEXT,
    server_url TEXT DEFAULT 'https://api.democracias.org',
    mensagens_enviadas_hoje INTEGER DEFAULT 0,
    mensagens_enviadas_mes INTEGER DEFAULT 0,
    taxa_sucesso NUMERIC DEFAULT 100.0,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Garantir que cada campanha tenha no máximo 1 instância ativa (Regra de Instância Única)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_campaign_instance 
ON public.whatsapp_instances (campaign_id) 
WHERE campaign_id IS NOT NULL AND campaign_id != 'SYSTEM_GENERAL';

-- 2. Fila de Disparos de Mensagens (com Rate Limiting e Anti-Bloqueio)
CREATE TABLE IF NOT EXISTS public.whatsapp_message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT NOT NULL REFERENCES public.whatsapp_instances(instance_name) ON DELETE CASCADE,
    campaign_id TEXT,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_text TEXT NOT NULL,
    tipo_mensagem TEXT DEFAULT 'transacional', -- 'transacional', 'validacao', 'informativo'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'paused'
    delay_applied_seconds INTEGER DEFAULT 0, -- Delay humano aplicado (8 a 15s)
    tentativas INTEGER DEFAULT 0,
    erro_motivo TEXT,
    agendado_para TIMESTAMPTZ DEFAULT now(),
    enviado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Logs de Webhooks da Evolution API
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED'
    instance_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico para leitura de status de instancia" 
ON public.whatsapp_instances FOR SELECT USING (true);

CREATE POLICY "Acesso total para insercao e edicao de instancias" 
ON public.whatsapp_instances FOR ALL USING (true);

CREATE POLICY "Acesso total para fila de mensagens" 
ON public.whatsapp_message_queue FOR ALL USING (true);

CREATE POLICY "Acesso total para logs de webhook" 
ON public.whatsapp_webhook_logs FOR ALL USING (true);
