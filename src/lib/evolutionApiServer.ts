import fs from 'node:fs';

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
    // Se for URL externa na mesma máquina, tenta direto em localhost:8080
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

function normalizeQr(qr: any): string | null {
  if (!qr || typeof qr !== 'string') return null;
  if (qr.startsWith('data:image') || qr.startsWith('http')) return qr;
  return `data:image/png;base64,${qr}`;
}

export async function handleEvolutionApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/evolution/')) {
    return null;
  }

  const path = url.pathname.replace('/api/evolution', '');
  const evoUrl = getEvolutionServerUrl();
  const adminKey = getEvolutionAdminKey();

  // 1. POST /api/evolution/instance/create
  if (path === '/instance/create' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const instanceName = body.instanceName || body.name;
      const token = body.token || `${instanceName}_token`;

      if (!instanceName) {
        return Response.json({ success: false, error: 'instanceName é obrigatório' }, { status: 400 });
      }

      // Tentar criar no Evolution Go local
      const createRes = await fetch(`${evoUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: adminKey,
        },
        body: JSON.stringify({ name: instanceName, token }),
      }).catch(() => null);

      await createRes?.json().catch(() => ({}));

      // Iniciar conexão para gerar o QR Code
      let qr: string | null = null;
      const connRes = await fetch(`${evoUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: token,
        },
        body: JSON.stringify({ subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL'] }),
      }).catch(() => null);

      if (connRes && connRes.ok) {
        const connData = await connRes.json().catch(() => ({}));
        qr = normalizeQr(
          connData?.data?.qrcode || connData?.data?.base64 || connData?.qrcode || connData?.base64
        );
      }

      // Se ainda não veio, tenta /instance/qr
      if (!qr) {
        const qrRes = await fetch(`${evoUrl}/instance/qr`, {
          headers: { apikey: token },
        }).catch(() => null);

        if (qrRes && qrRes.ok) {
          const qrData = await qrRes.json().catch(() => ({}));
          qr = normalizeQr(
            qrData?.data?.qrcode || qrData?.data?.base64 || qrData?.qrcode || qrData?.base64
          );
        }
      }

      // Verificar status de conexão
      let connected = false;
      const statusRes = await fetch(`${evoUrl}/instance/status`, {
        headers: { apikey: token },
      }).catch(() => null);

      if (statusRes && statusRes.ok) {
        const sData = await statusRes.json().catch(() => ({}));
        const d = sData?.data || sData;
        connected = d?.Connected === true && d?.LoggedIn === true;
      }

      return Response.json({
        success: true,
        instanceName,
        qrCode: qr,
        connected,
      });
    } catch (err: any) {
      console.error('[EvolutionServer] Erro ao criar instância:', err);
      return Response.json({ success: false, error: err?.message || 'Erro interno' }, { status: 500 });
    }
  }

  // 2. GET /api/evolution/instance/qr/:instanceName
  if (path.startsWith('/instance/qr/') && request.method === 'GET') {
    const instanceName = path.replace('/instance/qr/', '').trim();
    const token = `${instanceName}_token`;

    try {
      let qrRes = await fetch(`${evoUrl}/instance/qr`, {
        headers: { apikey: token },
      }).catch(() => null);

      if (!qrRes || !qrRes.ok) {
        // Dispara connect e tenta novamente
        await fetch(`${evoUrl}/instance/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: token },
          body: JSON.stringify({ subscribe: ['MESSAGE', 'READ_RECEIPT', 'GROUP', 'CALL'] }),
        }).catch(() => {});

        qrRes = await fetch(`${evoUrl}/instance/qr`, {
          headers: { apikey: token },
        }).catch(() => null);
      }

      if (qrRes && qrRes.ok) {
        const qrData = await qrRes.json().catch(() => ({}));
        const qr = normalizeQr(
          qrData?.data?.qrcode || qrData?.data?.base64 || qrData?.qrcode || qrData?.base64
        );
        return Response.json({ qrcode: qr });
      }

      return Response.json({ qrcode: null });
    } catch (err: any) {
      return Response.json({ error: err?.message }, { status: 500 });
    }
  }

  // 3. GET /api/evolution/instance/status/:instanceName
  if (path.startsWith('/instance/status/') && request.method === 'GET') {
    const instanceName = path.replace('/instance/status/', '').trim();
    const token = `${instanceName}_token`;

    try {
      const statusRes = await fetch(`${evoUrl}/instance/status`, {
        headers: { apikey: token },
      }).catch(() => null);

      if (statusRes && statusRes.ok) {
        const sData = await statusRes.json().catch(() => ({}));
        const d = sData?.data || sData;
        const connected = d?.Connected === true || d?.connected === true || d?.state === 'open';
        const loggedIn = d?.LoggedIn === true || d?.loggedIn === true;
        return Response.json({
          instance: {
            state: (connected && loggedIn) || d?.state === 'open' ? 'open' : (connected ? 'connecting' : 'close'),
            connected,
            loggedIn,
            number: d?.Name || d?.name || d?.ownerJid || null,
          },
        });
      }

      return Response.json({
        instance: { state: 'close', connected: false, loggedIn: false, number: null },
      });
    } catch (err: any) {
      return Response.json({ error: err?.message }, { status: 500 });
    }
  }

  // 4. DELETE /api/evolution/instance/:instanceName
  if (path.startsWith('/instance/') && request.method === 'DELETE') {
    const instanceName = path.replace('/instance/', '').trim();
    const token = `${instanceName}_token`;

    try {
      await fetch(`${evoUrl}/instance/logout`, {
        method: 'POST',
        headers: { apikey: token },
      }).catch(() => {});

      await fetch(`${evoUrl}/instance/delete`, {
        method: 'DELETE',
        headers: { apikey: token },
      }).catch(() => {});

      await fetch(`${evoUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: adminKey },
      }).catch(() => {});

      return Response.json({ success: true });
    } catch (err: any) {
      return Response.json({ error: err?.message }, { status: 500 });
    }
  }

  // 5. POST /api/evolution/send/text
  if (path === '/send/text' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { instanceName, number, text } = body;
      const token = `${instanceName}_token`;

      const sendRes = await fetch(`${evoUrl}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: token,
        },
        body: JSON.stringify({ number, text }),
      });

      const data = await sendRes.json().catch(() => ({}));
      return Response.json(data, { status: sendRes.status });
    } catch (err: any) {
      return Response.json({ error: err?.message }, { status: 500 });
    }
  }

  return null;
}
