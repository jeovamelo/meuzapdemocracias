import { supabase } from '@/integrations/supabase/client';
import { EVOLUTION_API_URL, EVOLUTION_GLOBAL_API_KEY } from '@/lib/env';

export interface DispatchMessageJob {
  campaignId?: string;
  carreataId?: string;
  instanceName?: string;
  recipientPhone: string;
  recipientName?: string;
  text: string;
  messageType?: 'text' | 'media' | 'template';
  scheduledFor?: string;
}

export class WhatsAppDispatcherService {
  private static isRunning: boolean = false;
  private static isEmergencyPaused: boolean = false;
  private static defaultUrl = EVOLUTION_API_URL;
  private static defaultApiKey = EVOLUTION_GLOBAL_API_KEY;

  // 1. Random Human Delay (8 a 15 segundos entre mensagens)
  static getRandomDelay(minSeconds = 8, maxSeconds = 15): Promise<number> {
    const seconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds);
    return new Promise((resolve) => setTimeout(() => resolve(seconds), seconds * 1000));
  }

  // 2. Validação se o número existe no WhatsApp (Anti-Ban)
  static async validateRecipient(instanceName: string, phone: string): Promise<boolean> {
    try {
      const formattedNumber = phone.replace(/\D/g, '');
      const response = await fetch(`${this.defaultUrl}/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({ numbers: [formattedNumber] }),
      });
      const data = await response.json().catch(() => null);
      return Array.isArray(data) && data[0]?.exists === true;
    } catch {
      return true; // Fallback tolerante caso endpoint offline
    }
  }

  // 3. Regra de Instância Única por Campanha e Substituição Limpa
  static async createOrReplaceCampaignInstance(campaignId: string, campaignName: string): Promise<{ success: boolean; instanceName: string; qrCode?: string; pairingCode?: string; error?: string }> {
    const timestamp = Date.now();
    const cleanName = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
    const newInstanceName = `camp_${cleanName}_${timestamp}`;

    try {
      // 1. Buscar se já existe instância ativa para a campanha
      const { data: existingInstances } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true);

      // 2. Desconectar e deletar instâncias antigas na Evolution API
      if (existingInstances && existingInstances.length > 0) {
        for (const oldInst of existingInstances) {
          try {
            await fetch(`${this.defaultUrl}/instance/logout/${oldInst.instance_name}`, {
              method: 'DELETE',
              headers: { apikey: this.defaultApiKey }
            }).catch(() => {});

            await fetch(`${this.defaultUrl}/instance/delete/${oldInst.instance_name}`, {
              method: 'DELETE',
              headers: { apikey: this.defaultApiKey }
            }).catch(() => {});
          } catch (e) {
            console.warn("Erro ao expurgar instância antiga:", e);
          }
        }

        // Marcar instâncias anteriores como inativas
        await (supabase as any)
          .from('whatsapp_instances')
          .update({ is_active: false, connection_status: 'close' })
          .eq('campaign_id', campaignId);
      }

      // 3. Criar a nova instância na Evolution API v2
      const createRes = await fetch(`${this.defaultUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({
          instanceName: newInstanceName,
          token: `${newInstanceName}_token`,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: `${this.defaultUrl}/api/webhooks/evolution`,
          webhook_by_events: true,
          events: [
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT'
          ]
        })
      });

      const resJson = await createRes.json().catch(() => ({}));

      // 4. Persistir a nova instância no Supabase
      const { data: savedInstance } = await (supabase as any)
        .from('whatsapp_instances')
        .insert([{
          campaign_id: campaignId,
          instance_type: 'campaign_single',
          instance_name: newInstanceName,
          connection_status: resJson?.instance?.status || 'connecting',
          qr_code_base64: resJson?.qrcode?.base64 || null,
          pairing_code: resJson?.qrcode?.pairingCode || null,
          is_active: true,
        }])
        .select()
        .single();

      return {
        success: true,
        instanceName: newInstanceName,
        qrCode: resJson?.qrcode?.base64 || null,
        pairingCode: resJson?.qrcode?.pairingCode || null
      };

    } catch (err: any) {
      console.warn("Fallback de criação de instância:", err);
      // Fallback para persistência local e continuação
      await (supabase as any).from('whatsapp_instances').insert([{
        campaign_id: campaignId,
        instance_type: 'campaign_single',
        instance_name: newInstanceName,
        connection_status: 'connecting',
        is_active: true,
      }]);

      return {
        success: true,
        instanceName: newInstanceName
      };
    }
  }

  // 4. Enfileirar mensagem no Dispatcher Anti-Ban
  static async enqueueMessage(job: DispatchMessageJob): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      const targetInstanceName = job.instanceName || await this.resolveInstanceName(job);

      if (!targetInstanceName) {
        throw new Error('Nenhuma instância ativa configurada para o envio.');
      }

      const { data: queued, error } = await (supabase as any)
        .from('whatsapp_dispatch_queue')
        .insert([{
          campaign_id: job.campaignId || null,
          instance_name: targetInstanceName,
          recipient_phone: job.recipientPhone.replace(/\D/g, ''),
          recipient_name: job.recipientName || null,
          message_type: job.messageType || 'text',
          message_content: { text: job.text },
          status: 'pending',
          scheduled_for: job.scheduledFor || new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) throw error;

      // Aciona o worker em segundo plano
      this.processQueue();

      return { success: true, queueId: queued.id };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao enfileirar mensagem' };
    }
  }

  /** Resolve sempre na ordem: carreata ativa, campanha ativa e geral da plataforma. */
  private static async resolveInstanceName(job: DispatchMessageJob): Promise<string | undefined> {
    if (job.carreataId) {
      const { data } = await (supabase as any)
        .from('carreatas')
        .select('whatsapp_instance_name, whatsapp_instance_id')
        .eq('id', job.carreataId)
        .maybeSingle();
      if (data?.whatsapp_instance_name) return data.whatsapp_instance_name;
      if (data?.whatsapp_instance_id) {
        const { data: instance } = await (supabase as any).from('whatsapp_instances')
          .select('instance_name').eq('id', data.whatsapp_instance_id).eq('is_active', true).maybeSingle();
        if (instance?.instance_name) return instance.instance_name;
      }
    }
    if (job.campaignId) {
      const { data } = await (supabase as any).from('whatsapp_instances')
        .select('instance_name').eq('campaign_id', job.campaignId).eq('is_active', true).maybeSingle();
      if (data?.instance_name) return data.instance_name;
    }
    const { data } = await (supabase as any).from('whatsapp_instances')
      .select('instance_name').is('campaign_id', null).eq('instance_type', 'system_general')
      .eq('is_active', true).maybeSingle();
    return data?.instance_name;
  }

  // 5. Worker de Processamento da Fila com Anti-Ban e Delay Humano
  static async processQueue() {
    if (this.isRunning || this.isEmergencyPaused) return;
    this.isRunning = true;

    try {
      // Pega o próximo job pendente
      const { data: job } = await (supabase as any)
        .from('whatsapp_dispatch_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!job) {
        this.isRunning = false;
        return;
      }

      // 1. Marca como 'processing'
      await (supabase as any)
        .from('whatsapp_dispatch_queue')
        .update({ status: 'processing' })
        .eq('id', job.id);

      // 2. Validação prévia de existência no WhatsApp
      const isValid = await this.validateRecipient(job.instance_name, job.recipient_phone);
      if (!isValid) {
        await (supabase as any)
          .from('whatsapp_dispatch_queue')
          .update({ status: 'failed', error_message: 'Número não possui WhatsApp ativo (Anti-Ban reject)' })
          .eq('id', job.id);
        this.isRunning = false;
        // Processa próximo
        setTimeout(() => this.processQueue(), 1000);
        return;
      }

      // 3. Disparo via Evolution API
      const cleanPhone = job.recipient_phone.replace(/\D/g, '');
      const formattedNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const response = await fetch(`${this.defaultUrl}/message/sendText/${job.instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: job.message_content?.text || '',
          delay: 1200 // Digitação simulada
        })
      });

      if (response.ok) {
        await (supabase as any)
          .from('whatsapp_dispatch_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      } else {
        const errorJson = await response.json().catch(() => ({}));
        await (supabase as any)
          .from('whatsapp_dispatch_queue')
          .update({
            status: 'failed',
            error_message: JSON.stringify(errorJson)
          })
          .eq('id', job.id);
      }

      // 4. Delay Humano Obrigatório (8 a 15 segundos) antes de processar o próximo item da fila
      const delaySecondsApplied = await this.getRandomDelay(8, 15);
      await (supabase as any)
        .from('whatsapp_dispatch_queue')
        .update({ delay_applied_seconds: delaySecondsApplied })
        .eq('id', job.id);

    } catch (err: any) {
      console.error('Erro no ciclo de disparo:', err);
    } finally {
      this.isRunning = false;
      // Continua o loop caso haja mais itens na fila
      if (!this.isEmergencyPaused) {
        this.processQueue();
      }
    }
  }

  // 6. Parada de Emergência (Kill Switch)
  static setKillSwitch(pause: boolean) {
    this.isEmergencyPaused = pause;
  }

  static getKillSwitchState(): boolean {
    return this.isEmergencyPaused;
  }
}
