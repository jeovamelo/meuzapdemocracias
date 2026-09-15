import { createClient } from '@supabase/supabase-js';

function readServerKey(keyName: string): string {
  if (typeof process !== 'undefined' && process.env?.[keyName]) {
    return process.env[keyName]!;
  }
  try {
    const envFile = fs.readFileSync('/opt/democracias/.env', 'utf-8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\n]*)"?$/);
      if (match && match[1] === keyName) return match[2];
    }
  } catch {}
  return '';
}

function getEvolutionServerUrl(): string {
  const envUrl = readServerKey('EVOLUTION_API_URL') || readServerKey('VITE_EVOLUTION_API_URL');
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return 'http://127.0.0.1:8080';
  }
  return envUrl || 'http://127.0.0.1:8080';
}

function getEvolutionAdminKey(): string {
  return (
    readServerKey('EVOLUTION_GLOBAL_API_KEY') ||
    readServerKey('VITE_EVOLUTION_GLOBAL_API_KEY') ||
    readServerKey('EVOLUTION_API_KEY') ||
    readServerKey('EVOLUTION_MASTER_TOKEN') ||
    'democracias'
  );
}

function getSupabaseAdmin() {
  const url = readServerKey('SUPABASE_URL') || readServerKey('VITE_SUPABASE_URL');
  const key = readServerKey('SUPABASE_SERVICE_ROLE_KEY') || readServerKey('SUPABASE_PUBLISHABLE_KEY') || readServerKey('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function handleMeuzapApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/meuzap/')) {
    return null;
  }

  const evoUrl = getEvolutionServerUrl();
  const adminKey = getEvolutionAdminKey();
  const supabase = getSupabaseAdmin();
  const path = url.pathname.replace('/api/meuzap', '');

  // 1. POST /api/meuzap/session/create
  if (path === '/session/create' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const voterName = body.voterName;
      if (!voterName || !voterName.trim()) {
        return Response.json({ success: false, error: 'Nome do eleitor é obrigatório.' }, { status: 400 });
      }

      const hash = Math.random().toString(36).substring(2, 8);
      const sessionId = 'meuzap_' + Date.now() + '_' + hash;
      const instToken = sessionId + '_token';

      if (supabase) {
        await supabase.from('meuzap_sessions').insert({
          session_id: sessionId,
          voter_name: voterName.trim(),
          status: 'created'
        });
      }

      // Criar instância na Evolution API
      await fetch(evoUrl + '/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: adminKey },
        body: JSON.stringify({ name: sessionId, token: instToken })
      }).catch(() => {});

      // Iniciar conexão e buscar QR Code
      let qr: string | null = null;
      const connRes = await fetch(evoUrl + '/instance/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: instToken },
        body: JSON.stringify({ subscribe: ['MESSAGE', 'READ_RECEIPT'] })
      }).catch(() => null);

      if (connRes && connRes.ok) {
        const cJson = await connRes.json().catch(() => ({}));
        qr = cJson?.data?.qrcode || cJson?.data?.base64 || cJson?.qrcode || cJson?.base64;
      }

      if (!qr) {
        const qrRes = await fetch(evoUrl + '/instance/qr', {
          headers: { apikey: instToken }
        }).catch(() => null);
        if (qrRes && qrRes.ok) {
          const qrJson = await qrRes.json().catch(() => ({}));
          qr = qrJson?.data?.qrcode || qrJson?.data?.base64 || qrJson?.qrcode || qrJson?.base64;
        }
      }

      if (qr && !qr.startsWith('data:image') && !qr.startsWith('http')) {
        qr = 'data:image/png;base64,' + qr;
      }

      return Response.json({
        success: true,
        sessionId,
        qrCode: qr || null,
        connected: false
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Erro ao criar sessão' }, { status: 500 });
    }
  }

  // 2. GET /api/meuzap/session/:sessionId/status
  if (path.startsWith('/session/') && path.endsWith('/status') && request.method === 'GET') {
    const sessionId = path.replace('/session/', '').replace('/status', '').trim();
    const instToken = sessionId + '_token';

    try {
      let sRes = await fetch(evoUrl + '/instance/status', {
        headers: { apikey: instToken }
      }).catch(() => null);

      if (!sRes || !sRes.ok) {
        sRes = await fetch(evoUrl + '/instance/status', {
          headers: { apikey: adminKey }
        }).catch(() => null);
      }

      if (sRes && sRes.ok) {
        const json = await sRes.json().catch(() => ({}));
        const d = json?.data || json;
        const connected = d?.Connected === true || d?.connected === true || d?.state === 'open';
        const loggedIn = d?.LoggedIn === true || d?.loggedIn === true;
        const rawNumber = d?.Name || d?.name || d?.ownerJid || null;
        const voterPhone = rawNumber ? String(rawNumber).replace(/\D/g, '') : null;

        if (connected && voterPhone && supabase) {
          await supabase
            .from('meuzap_sessions')
            .update({ status: 'connected', voter_phone: voterPhone, updated_at: new Date().toISOString() })
            .eq('session_id', sessionId);
        }

        return Response.json({
          sessionId,
          connected: Boolean(connected),
          loggedIn: Boolean(loggedIn),
          state: (connected && loggedIn) || d?.state === 'open' ? 'open' : (connected ? 'connecting' : 'close'),
          phone: voterPhone
        });
      }

      return Response.json({ sessionId, connected: false, loggedIn: false, state: 'close', phone: null });
    } catch (err: any) {
      return Response.json({ error: err?.message }, { status: 500 });
    }
  }

  // 3. GET /api/meuzap/session/:sessionId/contacts
  if (path.startsWith('/session/') && path.endsWith('/contacts') && request.method === 'GET') {
    const sessionId = path.replace('/session/', '').replace('/contacts', '').trim();
    const instToken = sessionId + '_token';

    try {
      let chats: any[] = [];
      let resp = await fetch(evoUrl + '/chat/findChats', {
        headers: { apikey: instToken }
      }).catch(() => null);

      if (!resp || !resp.ok) {
        resp = await fetch(evoUrl + '/chat/all', {
          headers: { apikey: instToken }
        }).catch(() => null);
      }

      if (resp && resp.ok) {
        const cJson = await resp.json().catch(() => ([]));
        chats = Array.isArray(cJson) ? cJson : (Array.isArray(cJson?.data) ? cJson.data : []);
      }

      if (chats.length === 0) {
        const contResp = await fetch(evoUrl + '/contact/find', {
          headers: { apikey: instToken }
        }).catch(() => null);
        if (contResp && contResp.ok) {
          const contJson = await contResp.json().catch(() => ([]));
          chats = Array.isArray(contJson) ? contJson : (Array.isArray(contJson?.data) ? contJson.data : []);
        }
      }

      const oneYearAgoMs = Date.now() - (365 * 24 * 60 * 60 * 1000);
      const validContactsMap = new Map();

      for (const item of chats) {
        const jid = item.id || item.jid || item.remoteJid || '';
        if (!jid || jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter')) {
          continue;
        }

        const phone = jid.split('@')[0].replace(/\D/g, '');
        if (!phone || phone.length < 10 || phone.length > 15) continue;

        let rawTimestamp = item.conversationTimestamp || item.messageTimestamp || item.updatedAt || item.timestamp || 0;
        if (typeof rawTimestamp === 'string') {
          const parsed = Date.parse(rawTimestamp);
          rawTimestamp = !isNaN(parsed) ? parsed : Number(rawTimestamp);
        }
        if (rawTimestamp > 0 && rawTimestamp < 10000000000) {
          rawTimestamp = rawTimestamp * 1000;
        }

        const hasRecentInteraction = rawTimestamp === 0 || rawTimestamp >= oneYearAgoMs;
        if (!hasRecentInteraction) continue;

        const name = item.name || item.pushName || item.verifiedName || item.notify || phone;

        if (!validContactsMap.has(phone)) {
          validContactsMap.set(phone, {
            id: phone,
            phone,
            name,
            timestamp: rawTimestamp || Date.now(),
            isRecent: rawTimestamp >= oneYearAgoMs
          });
        }
      }

      const sorted = Array.from(validContactsMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);

      return Response.json({
        success: true,
        total: sorted.length,
        contacts: sorted
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message }, { status: 500 });
    }
  }

  // 4. POST /api/meuzap/session/:sessionId/send
  if (path.startsWith('/session/') && path.endsWith('/send') && request.method === 'POST') {
    const sessionId = path.replace('/session/', '').replace('/send', '').trim();
    const instToken = sessionId + '_token';

    try {
      const body = await request.json().catch(() => ({}));
      const { contactPhone, contactName, messageText, mediaBase64, voterPhone } = body;

      if (!contactPhone || !messageText) {
        return Response.json({ success: false, error: 'Telefone e mensagem são obrigatórios.' }, { status: 400 });
      }

      // Validação Anti-Spam via Supabase
      if (voterPhone && supabase) {
        const { data: limitCheck, error: errLimit } = await supabase.rpc('meuzap_check_rate_limit', {
          p_voter_phone: String(voterPhone).replace(/\D/g, '')
        });

        if (!errLimit && limitCheck && limitCheck.allowed === false) {
          return Response.json({
            success: false,
            error: limitCheck.reason || 'Limite de disparos atingido.',
            limitReached: true,
            details: limitCheck
          }, { status: 429 });
        }
      }

      let sendOk = false;
      let errorDetail = '';

      if (mediaBase64) {
        const mediaResp = await fetch(evoUrl + '/send/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: instToken },
          body: JSON.stringify({
            number: contactPhone,
            media: mediaBase64,
            caption: messageText,
            mediatype: 'image',
            fileName: 'colinha_2026.jpg'
          })
        }).catch((e) => { errorDetail = e.message; return null; });

        sendOk = mediaResp ? mediaResp.ok : false;
      } else {
        const textResp = await fetch(evoUrl + '/send/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: instToken },
          body: JSON.stringify({ number: contactPhone, text: messageText })
        }).catch((e) => { errorDetail = e.message; return null; });

        sendOk = textResp ? textResp.ok : false;
      }

      if (supabase) {
        await supabase.from('meuzap_dispatch_logs').insert({
          session_id: sessionId,
          voter_phone: voterPhone ? String(voterPhone).replace(/\D/g, '') : 'nao_identificado',
          contact_phone: String(contactPhone).replace(/\D/g, ''),
          contact_name: contactName || null,
          message_text: messageText,
          media_sent: Boolean(mediaBase64),
          status: sendOk ? 'sent' : 'failed',
          error_message: sendOk ? null : errorDetail
        });

        if (sendOk) {
          await supabase
            .from('meuzap_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('session_id', sessionId);
        }
      }

      return Response.json({ success: sendOk, error: sendOk ? null : (errorDetail || 'Falha no envio') });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message }, { status: 500 });
    }
  }

  // 5. DELETE /api/meuzap/session/:sessionId/cleanup
  if (path.startsWith('/session/') && path.endsWith('/cleanup') && request.method === 'DELETE') {
    const sessionId = path.replace('/session/', '').replace('/cleanup', '').trim();
    const instToken = sessionId + '_token';

    try {
      await fetch(evoUrl + '/instance/logout', {
        method: 'POST',
        headers: { apikey: instToken }
      }).catch(() => {});

      await fetch(evoUrl + '/instance/delete', {
        method: 'DELETE',
        headers: { apikey: instToken }
      }).catch(() => {});

      await fetch(evoUrl + '/instance/delete/' + sessionId, {
        method: 'DELETE',
        headers: { apikey: adminKey }
      }).catch(() => {});

      if (supabase) {
        await supabase
          .from('meuzap_sessions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('session_id', sessionId);
      }

      return Response.json({ success: true, message: 'Instância temporária encerrada e dados privados removidos.' });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message }, { status: 500 });
    }
  }

  return null;
}
