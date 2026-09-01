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
  private static internalApiUrl = '/api/evolution';
  private static defaultUrl = EVOLUTION_API_URL || 'https://evolution.democracias.org';
  private static defaultApiKey = EVOLUTION_GLOBAL_API_KEY;
  private static serviceGatewayUrl = 'https://api.democracias.org/whatsapp';
  private static pendingCampaignInstances = new Map<string, Promise<CampaignInstanceResult>>();

  private static instanceToken(instanceName: string) {
    return `${instanceName}_token`;
  }

  private static getCandidateUrls(): string[] {
    // O navegador deve falar somente com o proxy interno da aplicação. Ele
    // mantém a chave da Evolution no servidor e evita 401 em gateways distintos.
    return [this.internalApiUrl];
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
    for (const url of this.getCandidateUrls()) {
      try {
        const response = await fetch(`${url}/instance/all`, {
          signal,
          headers: { apikey: this.defaultApiKey || 'democracias' },
        });
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
          if (list.length > 0 || response.ok) return list;
        }
      } catch {}
    }
    return [];
  }

  /**
   * 1. Regra de Instância Única por Campanha:
   * Cria ou conecta uma instância dedicada para a campanha na Evolution API / Evolution Go.
   */
  static async createOrReplaceCampaignInstance(
    campaignId: string,
    campaignName: string,
    forceRecreate = false
  ): Promise<CampaignInstanceResult> {
    const cleanCampaignName = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const instanceName = `camp_${cleanCampaignName}_${campaignId.slice(0, 6)}`;
    if (!forceRecreate) {
      const { data: existing } = await (supabase as any)
        .from('whatsapp_instances')
        .select('instance_name, connection_status, qr_code_base64')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .maybeSingle();
      if (existing?.instance_name) {
        return {
          success: true,
          instanceName: existing.instance_name,
          qrCode: this.normalizeQrCode(existing.qr_code_base64),
          connected: existing.connection_status === 'open' || existing.connection_status === 'connected',
        };
      }
    }
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
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    const token = this.instanceToken(instanceName);

    try {
      if (forceRecreate) {
        await this.deleteInstance(instanceName).catch(() => {});
      }

      // Tentativa 1: Endpoint Interno do Servidor (/api/evolution/instance/create)
      try {
        const internalRes = await fetch(`${this.internalApiUrl}/instance/create`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName, token })
        });
        if (internalRes.ok) {
          const internalData = await internalRes.json();
          if (internalData.success) {
            let qr = this.normalizeQrCode(internalData.qrCode);
            if (!qr) {
              qr = await this.getInstanceQr(instanceName, controller.signal);
            }
            await this.persistCampaignInstance(
              campaignId,
              instanceName,
              token,
              qr || null,
              internalData.connected ? 'connected' : 'connecting'
            );
            return {
              success: true,
              instanceName,
              qrCode: qr,
              connected: !!internalData.connected
            };
          }
        }
      } catch (internalErr) {
        console.warn('Fallback do endpoint interno:', internalErr);
      }

      // Tentativa 2: Via Gateway seguro do Servidor (whatsapp-service na VPS)
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
            let qr = this.normalizeQrCode(gwData.qrCode);
            if (!qr) {
              qr = await this.getInstanceQr(instanceName, controller.signal);
            }
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
      } catch {}

      // Tentativa 3: Endpoints Evolution diretos
      let lastError = '';
      for (const baseUrl of this.getCandidateUrls()) {
        try {
          const response = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              apikey: this.defaultApiKey || token
            },
            body: JSON.stringify({ name: instanceName, token })
          });
          const created = await response.json().catch(() => ({}));

          const isAlreadyExists =
            created?.message?.toLowerCase?.()?.includes('already exists') ||
            created?.error?.toLowerCase?.()?.includes('already exists') ||
            created?.message?.toLowerCase?.()?.includes('já existe') ||
            response.status === 400 ||
            response.status === 409;

          if (response.ok || isAlreadyExists) {
            this.defaultUrl = baseUrl;

            // Iniciar conexão e solicitar QR Code
            let qr: string | undefined;
            const connectResponse = await fetch(`${baseUrl}/instance/connect`, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                apikey: this.defaultApiKey || token
              },
              body: JSON.stringify({ subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL'] })
            });

            if (connectResponse.ok) {
              const connectPayload = await connectResponse.json().catch(() => ({}));
              qr = this.normalizeQrCode(
                connectPayload?.data?.qrcode ||
                connectPayload?.data?.base64 ||
                connectPayload?.qrcode ||
                connectPayload?.base64 ||
                connectPayload?.data?.qr
              );
            }

            if (!qr) {
              qr = await this.getInstanceQr(instanceName, controller.signal);
            }

            const currentStatus = await this.getInstanceStatus(instanceName);
            const connected = currentStatus.instance.state === 'open';

            await this.persistCampaignInstance(
              campaignId,
              instanceName,
              token,
              qr || null,
              connected ? 'connected' : 'connecting'
            );

            return { success: true, instanceName, qrCode: qr, connected };
          } else {
            lastError = this.responseError(created, `HTTP ${response.status}`);
          }
        } catch (e: any) {
          lastError = e?.message || 'Falha de conexão';
        }
      }

      return { success: false, instanceName, error: lastError || 'Não foi possível comunicar com a Evolution Go.' };
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

  static async createCustomInstance(
    campaignId: string,
    customInstanceName: string,
    forceRecreate = false
  ): Promise<CampaignInstanceResult> {
    const cleanInstanceName = customInstanceName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    return await this.createCampaignInstance(campaignId, cleanInstanceName, forceRecreate);
  }

  static async deleteAndUnlinkInstance(campaignId: string, instanceName: string): Promise<boolean> {
    const ok = await this.deleteInstance(instanceName);
    try {
      await (supabase as any).from('whatsapp_instances').delete().eq('campaign_id', campaignId);
    } catch (e) {
      console.warn('Erro ao desvincular instancia no Supabase:', e);
    }
    return ok;
  }

  static async fetchCampaignInstance(campaignId: string): Promise<any | null> {
    try {
      const { data } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      return data;
    } catch {
      return null;
    }
  }

  static async deleteInstance(instanceName: string): Promise<boolean> {
    const token = this.instanceToken(instanceName);
    try {
      fetch(`${this.internalApiUrl}/instance/${instanceName}`, { method: 'DELETE' }).catch(() => {});
      fetch(`${this.serviceGatewayUrl}/api/instance/${instanceName}`, { method: 'DELETE' }).catch(() => {});
      for (const baseUrl of this.getCandidateUrls()) {
        if (baseUrl.startsWith('/api')) continue;
        await fetch(`${baseUrl}/instance/logout`, {
          method: 'POST',
          headers: { apikey: this.defaultApiKey || token }
        }).catch(() => {});
        await fetch(`${baseUrl}/instance/delete`, {
          method: 'DELETE',
          headers: { apikey: this.defaultApiKey || token }
        }).catch(() => {});
        await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey: this.defaultApiKey || token }
        }).catch(() => {});
      }
      return true;
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
      await (supabase as any).from('whatsapp_instances').upsert([{
        campaign_id: campaignId,
        instance_type: 'campaign_single',
        instance_name: instanceName,
        connection_status: status === 'connected' ? 'open' : 'connecting',
        qr_code_base64: qrCode,
        is_active: true,
      }], { onConflict: 'campaign_id' });
    } catch (e) {
      console.warn("Erro ao persistir instância no Supabase:", e);
    }
  }

  static async getInstanceQr(instanceName: string, signal?: AbortSignal): Promise<string | undefined> {
    const token = this.instanceToken(instanceName);

    // Tentativa 1: Endpoint Interno do Servidor (/api/evolution/instance/qr/:instanceName)
    try {
      const internalRes = await fetch(`${this.internalApiUrl}/instance/qr/${instanceName}`, { signal });
      if (internalRes.ok) {
        const internalData = await internalRes.json().catch(() => ({}));
        if (internalData?.qrcode) {
          return this.normalizeQrCode(internalData.qrcode);
        }
      }
    } catch {}

    return undefined;
  }

  /**
   * 2. Obter Status e QR Code atual da instância
   */
  static async getInstanceStatus(instanceName: string) {
    // Tentativa 1: Endpoint Interno do Servidor (/api/evolution/instance/status/:instanceName)
    try {
      const internalRes = await fetch(`${this.internalApiUrl}/instance/status/${instanceName}`);
      if (internalRes.ok) {
        const internalData = await internalRes.json().catch(() => ({}));
        if (internalData?.instance) {
          return internalData;
        }
      }
    } catch {}

    // Tentativa 2: Gateway do servidor
    try {
      const gwRes = await fetch(`${this.serviceGatewayUrl}/api/instance/status/${instanceName}`);
      if (gwRes.ok) {
        const gwJson = await gwRes.json();
        if (gwJson?.instance) {
          return gwJson;
        }
      }
    } catch {}

    // Tentativa 3: Direct Evolution candidates
    const token = this.instanceToken(instanceName);
    for (const baseUrl of this.getCandidateUrls()) {
      if (baseUrl.startsWith('/api')) continue;
      try {
        const response = await fetch(`${baseUrl}/instance/status`, {
          headers: { apikey: this.defaultApiKey || token }
        });
        if (response.ok) {
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
        }
      } catch {}
    }

    return { instance: { state: 'close' as const, connected: false, loggedIn: false, number: null } };
  }

  static async sendTestMessage(instanceName: string, recipientPhone: string, messageText: string) {
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Tentativa 1: Endpoint Interno do Servidor (/api/evolution/send/text)
    try {
      const internalRes = await fetch(`${this.internalApiUrl}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, number: formattedPhone, text: messageText.trim() })
      });
      if (internalRes.ok) {
        return await internalRes.json().catch(() => ({}));
      }
    } catch {}

    // Tentativa 2: Gateway do servidor
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

    // Tentativa 3: Direct Evolution candidates
    const token = this.instanceToken(instanceName);
    for (const baseUrl of this.getCandidateUrls()) {
      if (baseUrl.startsWith('/api')) continue;
      try {
        const response = await fetch(`${baseUrl}/send/text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.defaultApiKey || token,
          },
          body: JSON.stringify({ number: formattedPhone, text: messageText.trim() }),
        });
        if (response.ok) {
          return await response.json().catch(() => ({}));
        }
      } catch {}
    }

    throw new Error('Não foi possível enviar a mensagem de teste.');
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

