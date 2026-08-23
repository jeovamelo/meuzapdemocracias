import { supabase } from '@/integrations/supabase/client';

export interface EvolutionInstanceConfig {
  serverUrl?: string;
  globalApiKey?: string;
}

export interface SendMessageOptions {
  campaignId?: string;
  instanceName: string;
  recipientPhone: string;
  recipientName?: string;
  messageText: string;
  tipoMensagem?: 'transacional' | 'validacao' | 'informativo';
}

/**
 * Utilitário para cálculo de delay randômico humano (8 a 15 segundos)
 */
export function getHumanDelayMs(minSec = 8, maxSec = 15): number {
  const seconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
  return seconds * 1000;
}

/**
 * Serviço de Integração com a Evolution API e Controle Anti-Bloqueio
 */
export class EvolutionWhatsAppService {
  private static defaultUrl = 'https://api.democracias.org';
  private static defaultApiKey = 'democracias_global_evolution_key';

  /**
   * 1. Regra de Instância Única por Campanha:
   * Cria uma instância dedicada para a campanha na Evolution API.
   * Se já existir uma instância anterior para esta campanha, ela é removida para evitar concorrência.
   */
  static async createOrReplaceCampaignInstance(campaignId: string, campaignName: string): Promise<{ success: boolean; instanceName: string; qrCode?: string; error?: string }> {
    const cleanCampaignName = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const instanceName = `camp_${cleanCampaignName}_${campaignId.slice(0, 6)}`;

    try {
      // 1. Remover registro anterior da campanha no banco local
      await (supabase as any)
        .from('whatsapp_instances')
        .delete()
        .eq('campaign_id', campaignId);

      // 2. Chamar endpoint da Evolution API para criar instância
      const response = await fetch(`${this.defaultUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({
          instanceName,
          token: `${instanceName}_token`,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: `${this.defaultUrl}/webhooks/evolution`,
          webhook_by_events: true,
          events: [
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT'
          ]
        })
      });

      const resData = await response.json().catch(() => ({}));

      // 3. Salvar registro da instância no Supabase
      await (supabase as any).from('whatsapp_instances').insert([{
        instance_name: instanceName,
        campaign_id: campaignId,
        tipo: 'campaign',
        status: resData?.instance?.status || 'connecting',
        qr_code_base64: resData?.qrcode?.base64 || null,
        server_url: this.defaultUrl,
        apikey: `${instanceName}_token`
      }]);

      return {
        success: true,
        instanceName,
        qrCode: resData?.qrcode?.base64 || null
      };

    } catch (err: any) {
      console.warn("Evolution API create instance fallback:", err);
      // Fallback para permitir continuar fluxo em ambiente de desenvolvimento
      await (supabase as any).from('whatsapp_instances').insert([{
        instance_name: instanceName,
        campaign_id: campaignId,
        tipo: 'campaign',
        status: 'connecting',
        server_url: this.defaultUrl,
      }]);

      return {
        success: true,
        instanceName,
      };
    }
  }

  /**
   * 2. Obter Status e QR Code atual da instância
   */
  static async getInstanceStatus(instanceName: string) {
    try {
      const response = await fetch(`${this.defaultUrl}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': this.defaultApiKey }
      });
      const data = await response.json();
      return data;
    } catch {
      return { state: 'disconnected' };
    }
  }

  /**
   * 3. Validação de Destinatário (Anti-Bloqueio):
   * Verifica se o número de destino possui WhatsApp ativo antes de enviar.
   */
  static async verifyNumberExists(instanceName: string, phoneNumber: string): Promise<boolean> {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const response = await fetch(`${this.defaultUrl}/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({
          numbers: [cleanPhone]
        })
      });
      const data = await response.json();
      return Array.isArray(data) && data[0]?.exists === true;
    } catch {
      return true; // Fallback permissivo caso endpoint offline
    }
  }

  /**
   * 4. Envio com Fila Controlada, Delay Randômico Humano e Anti-Bloqueio
   */
  static async enqueueMessage(options: SendMessageOptions): Promise<{ success: boolean; queueId?: string; error?: string }> {
    const delaySec = Math.floor(Math.random() * (15 - 8 + 1)) + 8; // 8 a 15 segundos

    try {
      // 1. Enfileirar mensagem
      const { data, error } = await (supabase as any)
        .from('whatsapp_message_queue')
        .insert([{
          instance_name: options.instanceName,
          campaign_id: options.campaignId || null,
          recipient_phone: options.recipientPhone.replace(/\D/g, ''),
          recipient_name: options.recipientName || null,
          message_text: options.messageText,
          tipo_mensagem: options.tipoMensagem || 'transacional',
          status: 'pending',
          delay_applied_seconds: delaySec,
        }])
        .select('id')
        .single();

      if (error) throw error;

      // 2. Disparar processamento assíncrono respeitando o delay
      this.processQueueItem(data.id, options, delaySec);

      return { success: true, queueId: data.id };
    } catch (err: any) {
      console.error("Erro ao enfileirar mensagem:", err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Processador individual com Delay Humano
   */
  private static async processQueueItem(queueId: string, options: SendMessageOptions, delaySec: number) {
    // Aplicar delay humano antes do disparo
    await new Promise(resolve => setTimeout(resolve, delaySec * 1000));

    try {
      await (supabase as any).from('whatsapp_message_queue').update({ status: 'processing' }).eq('id', queueId);

      const cleanPhone = options.recipientPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const response = await fetch(`${this.defaultUrl}/message/sendText/${options.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.defaultApiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: options.messageText,
          delay: 1200,
          linkPreview: false
        })
      });

      if (response.ok) {
        await (supabase as any).from('whatsapp_message_queue').update({
          status: 'sent',
          enviado_em: new Date().toISOString()
        }).eq('id', queueId);

        // Incrementar métricas
        await (supabase as any).rpc('increment_whatsapp_metrics', { inst_name: options.instanceName }).catch(() => {});
      } else {
        const errJson = await response.json().catch(() => ({}));
        await (supabase as any).from('whatsapp_message_queue').update({
          status: 'failed',
          erro_motivo: JSON.stringify(errJson)
        }).eq('id', queueId);
      }
    } catch (e: any) {
      await (supabase as any).from('whatsapp_message_queue').update({
        status: 'failed',
        erro_motivo: e?.message || 'Erro de rede'
      }).eq('id', queueId);
    }
  }
}
