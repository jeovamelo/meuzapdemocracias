import { supabase } from '@/integrations/supabase/client';
import { EVOLUTION_API_URL, EVOLUTION_GLOBAL_API_KEY } from '@/lib/env';

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

export interface CampaignInstanceResult {
  success: boolean;
  instanceName: string;
  qrCode?: string;
  connected?: boolean;
  error?: string;
}

/**
 * Utilitário para cálculo de delay randômico humano (8 a 15 segundos)
 */
export function getHumanDelayMs(minSec = 8, maxSec = 15): number {
  const seconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
  return seconds * 1000;
}

/**
 * Serviço de Integração com a Evolution API / Evolution Go e Controle Anti-Bloqueio
 */
export class EvolutionWhatsAppService {
  private static defaultUrl = EVOLUTION_API_URL;
  private static defaultApiKey = EVOLUTION_GLOBAL_API_KEY;
  private static serviceGatewayUrl = 'https://api.democracias.org/whatsapp';
  private static pendingCampaignInstances = new Map<string, Promise<CampaignInstanceResult>>();

  private static instanceToken(instanceName: string) {
    return `${instanceName}_token`;
  }

  private static normalizeQrCode(qr: unknown): string | undefined {
    if (typeof qr !== 'string' || !qr.trim()) return undefined;
    if (qr.startsWith('data:image')) return qr;
    if (qr.startsWith('http://') || qr.startsWith('https://')) return qr;
    return `data:image/png;base64,${qr}`;
  }

  private static responseError(payload: any, fallback: string) {
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.error === 'string') return payload.error;
    if (typeof payload?.data?.message === 'string') return payload.data.message;
    return fallback;
  }

  private static async listInstances(signal?: AbortSignal): Promise<any[]> {
    try {
      const response = await fetch(`${this.defaultUrl}/instance/all`, {
        signal,
        headers: { apikey: this.defaultApiKey },
      });
      if (!response.ok) return [];
      const payload = await response.json().catch(() => ({}));
      return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    } catch {
      return [];
    }
  }

  /**
   * 1. Regra de Instância Única por Campanha:
   * Cria ou conecta uma instância dedicada para a campanha na Evolution API / Evolution Go.
   * Se já existir, conecta nela e obtém o QR Code ou status de conexão.
   */
  static async createOrReplaceCampaignInstance(
    campaignId: string,
    campaignName: string,
    forceRecreate = false
  ): Promise<CampaignInstanceResult> {
    const cleanCampaignName = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const instanceName = `camp_${cleanCampaignName}_${campaignId.slice(0, 6)}`;
    const pending = this.pendingCampaignInstances.get(instanceName);
    if (pending && !forceRecreate) return pending;

    const request = this.createCampaignInstance(campaignId, instanceName, forceRecreate);
    this.pendingCampaignInstances.set(instanceName, request);
    try {
      return await request;
    } finally {
      this.pendingCampaignInstances.delete(instanceName);
    }
  }

  private static async createCampaignInstance(
    campaignId: string,
    instanceName: string,
    forceRecreate = false
  ): Promise<CampaignInstanceResult> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const token = this.instanceToken(instanceName);

    try {
      if (forceRecreate) {
        await this.deleteInstance(instanceName).catch(() => {});
      }

      // Tentativa 1: Via Gateway seguro do Servidor (whatsapp-service na VPS)
      try {
        const gwRes = await fetch(`${this.serviceGatewayUrl}/api/instance/create`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName, token })
        });
        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (gwData.success) {
            const qr = this.normalizeQrCode(gwData.qrCode);
            await this.persistCampaignInstance(
              campaignId,
              instanceName,
              token,
              qr || null,
              gwData.connected ? 'connected' : 'connecting'
            );
            return {
              success: true,
              instanceName,
              qrCode: qr,
              connected: !!gwData.connected
            };
          }
        }
      } catch (gwErr) {
        console.warn('Fallback para comunicação direta com Evolution Go:', gwErr);
      }

      // Tentativa 2: Fallback direto no endpoint /evolution
      let instances = await this.listInstances(controller.signal);
      let existing = instances.find(
        (item) =>
          (item?.name || item?.instanceName || item?.id || item?.instance?.name || item?.instance?.instanceName) === instanceName
      );

      if (!existing && !forceRecreate) {
        const response = await fetch(`${this.defaultUrl}/instance/create`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', apikey: this.defaultApiKey },
          body: JSON.stringify({ name: instanceName, token })
        });
        const created = await response.json().catch(() => ({}));

        if (!response.ok) {
          const isAlreadyExists =
            created?.message?.toLowerCase?.()?.includes('already exists') ||
            created?.error?.toLowerCase?.()?.includes('already exists') ||
            created?.message?.toLowerCase?.()?.includes('já existe') ||
            response.status === 400 ||
            response.status === 409;

          if (!isAlreadyExists) {
            instances = await this.listInstances(controller.signal);
            existing = instances.find(
              (item) =>
                (item?.name || item?.instanceName || item?.id || item?.instance?.name || item?.instance?.instanceName) === instanceName
            );
            if (!existing) {
              throw new Error(this.responseError(created, `Evolution Go HTTP ${response.status}`));
            }
          }
        }
      }

      // Verificar status atual da conexão
      const currentStatus = await this.getInstanceStatus(instanceName);
      if (currentStatus.instance.state === 'open') {
        await this.persistCampaignInstance(campaignId, instanceName, token, null, 'connected');
        return { success: true, instanceName, connected: true };
      }

      // Iniciar conexão e solicitar QR Code
      let qr: string | undefined;
      try {
        let connectResponse = await fetch(`${this.defaultUrl}/instance/connect`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', apikey: token },
          body: JSON.stringify({ subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL'] })
        });

        if (!connectResponse.ok && this.defaultApiKey) {
          connectResponse = await fetch(`${this.defaultUrl}/instance/connect`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', apikey: this.defaultApiKey },
            body: JSON.stringify({ name: instanceName, subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL'] })
          });
        }

        if (connectResponse.ok) {
          const connectPayload = await connectResponse.json().catch(() => ({}));
          qr = this.normalizeQrCode(
            connectPayload?.data?.qrcode ||
            connectPayload?.data?.base64 ||
            connectPayload?.qrcode ||
            connectPayload?.base64 ||
            connectPayload?.data?.qr ||
            connectPayload?.data?.code
          );
        }
      } catch (connErr) {
        console.warn('Tentativa de conexão da instância:', connErr);
      }

      // Se o connect não retornou o QR imediatamente, busca via /instance/qr
      if (!qr) {
        qr = await this.getInstanceQr(instanceName, controller.signal);
      }

      await this.persistCampaignInstance(campaignId, instanceName, token, qr || null, 'connecting');
      return { success: true, instanceName, qrCode: qr, connected: false };
    } catch (err: any) {
      const error =
        err?.name === 'AbortError'
          ? 'A Evolution Go demorou mais de 20 segundos para responder.'
          : (err?.message || 'Falha ao comunicar com a Evolution Go.');
      return { success: false, instanceName, error };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  static async deleteInstance(instanceName: string): Promise<boolean> {
    const token = this.instanceToken(instanceName);
    try {
      // 1. Tenta via gateway do servidor
      fetch(`${this.serviceGatewayUrl}/api/instance/${instanceName}`, { method: 'DELETE' }).catch(() => {});

      // 2. Fallback direto
      await fetch(`${this.defaultUrl}/instance/logout`, {
        method: 'POST',
        headers: { apikey: token }
      }).catch(() => {});

      let response = await fetch(`${this.defaultUrl}/instance/delete`, {
        method: 'DELETE',
        headers: { apikey: token }
      });

      if (!response.ok && this.defaultApiKey) {
        response = await fetch(`${this.defaultUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey: this.defaultApiKey }
        });
      }
      return response.ok;
    } catch {
      return false;
    }
  }

  private static async persistCampaignInstance(
    campaignId: string,
    instanceName: string,
    token: string,
    qrCode: string | null,
    status: 'connected' | 'connecting',
  ) {
    try {
      await (supabase as any).from('whatsapp_instances').delete().eq('campaign_id', campaignId);
      await (supabase as any).from('whatsapp_instances').insert([{
        instance_name: instanceName,
        campaign_id: campaignId,
        tipo: 'campaign',
        status,
        qr_code_base64: qrCode,
        server_url: this.defaultUrl,
        apikey: token,
      }]);
    } catch (e) {
      console.warn("Erro ao persistir instância no Supabase:", e);
    }
  }

  static async getInstanceQr(instanceName: string, signal?: AbortSignal): Promise<string | undefined> {
    const token = this.instanceToken(instanceName);
    try {
      // Tentativa 1: Gateway do servidor
      try {
        const gwRes = await fetch(`${this.serviceGatewayUrl}/api/instance/qr/${instanceName}`, { signal });
        if (gwRes.ok) {
          const gwJson = await gwRes.json();
          if (gwJson?.qrcode) {
            return this.normalizeQrCode(gwJson.qrcode);
          }
        }
      } catch {}

      // Tentativa 2: Direto Evolution
      let response = await fetch(`${this.defaultUrl}/instance/qr`, {
        signal,
        headers: { apikey: token },
      });
      if (!response.ok && this.defaultApiKey) {
        response = await fetch(`${this.defaultUrl}/instance/qr`, {
          signal,
          headers: { apikey: this.defaultApiKey },
        });
      }
      if (!response.ok) return undefined;
      const payload = await response.json().catch(() => ({}));
      return this.normalizeQrCode(
        payload?.data?.qrcode ||
        payload?.data?.base64 ||
        payload?.data?.qr ||
        payload?.qrcode ||
        payload?.base64 ||
        payload?.data?.code
      );
    } catch {
      return undefined;
    }
  }

  /**
   * 2. Obter Status e QR Code atual da instância
   */
  static async getInstanceStatus(instanceName: string) {
    try {
      // Tentativa 1: Gateway do servidor
      try {
        const gwRes = await fetch(`${this.serviceGatewayUrl}/api/instance/status/${instanceName}`);
        if (gwRes.ok) {
          const gwJson = await gwRes.json();
          if (gwJson?.instance) {
            return gwJson;
          }
        }
      } catch {}

      // Tentativa 2: Direto Evolution
      const token = this.instanceToken(instanceName);
      let response = await fetch(`${this.defaultUrl}/instance/status`, {
        headers: { apikey: token }
      });
      if (!response.ok && this.defaultApiKey) {
        response = await fetch(`${this.defaultUrl}/instance/status`, {
          headers: { apikey: this.defaultApiKey }
        });
      }
      if (!response.ok) return { instance: { state: 'close' as const, connected: false, loggedIn: false, number: null } };
      const payload = await response.json().catch(() => ({}));
      const data = payload?.data || payload;
      const connected = data?.Connected === true || data?.connected === true || data?.state === 'open';
      const loggedIn = data?.LoggedIn === true || data?.loggedIn === true;
      const isConnecting = !loggedIn && (data?.state === 'connecting' || data?.status === 'connecting' || !!data?.qrcode);
      const state: 'open' | 'connecting' | 'close' = (connected && loggedIn) || data?.state === 'open'
        ? 'open'
        : isConnecting
        ? 'connecting'
        : 'close';

      return {
        instance: {
          state,
          connected,
          loggedIn,
          number: data?.Name || data?.name || data?.ownerJid || data?.jid || null,
        }
      };
    } catch {
      return { instance: { state: 'close' as const, connected: false, loggedIn: false, number: null } };
    }
  }

  static async sendTestMessage(instanceName: string, recipientPhone: string, messageText: string) {
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Tentativa 1: Gateway do servidor
    try {
      const gwRes = await fetch(`${this.serviceGatewayUrl}/api/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, number: formattedPhone, text: messageText.trim() })
      });
      if (gwRes.ok) {
        return await gwRes.json().catch(() => ({}));
      }
    } catch {}

    // Tentativa 2: Direto Evolution
    const token = this.instanceToken(instanceName);
    let response = await fetch(`${this.defaultUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: token,
      },
      body: JSON.stringify({ number: formattedPhone, text: messageText.trim() }),
    });

    if (!response.ok && this.defaultApiKey) {
      response = await fetch(`${this.defaultUrl}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.defaultApiKey,
        },
        body: JSON.stringify({ number: formattedPhone, text: messageText.trim() }),
      });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(this.responseError(payload, `Evolution Go HTTP ${response.status}`));
    }
    return payload;
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

