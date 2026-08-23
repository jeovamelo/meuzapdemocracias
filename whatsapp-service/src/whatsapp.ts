import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';

// Singleton para guardar a instância do socket e permitir envios pela API
export let waSocket: WASocket | null = null;
export let isConnected = false;
export let currentQr: string | null = null;

// Logger configurado para o Baileys (nível silent para não poluir o terminal, ou info para debug)
const logger = pino({ level: 'silent' });

export const connectToWhatsApp = async () => {
  // Salva a sessão na pasta auth_info_baileys para não precisar ler o QR code toda hora
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  // Puxa a versão mais recente do WhatsApp Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // Vamos imprimir manualmente para ter mais controle
    auth: state,
    browser: ['Democracias Bot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = await QRCode.toDataURL(qr);
      console.log(' Escaneie o QR Code abaixo com o seu WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      currentQr = null;
      isConnected = false;
      waSocket = null;
      
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
        
      console.log(
        'Conexão fechada devido a ',
        lastDisconnect?.error,
        ', reconectando:',
        shouldReconnect
      );
      
      // Reconectar se não foi um "deslogar" explícito
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log('Você foi desconectado. Apague a pasta auth_info_baileys e reinicie para escanear novamente.');
      }
    } else if (connection === 'open') {
      currentQr = null;
      console.log('Conexão aberta com sucesso!');
      isConnected = true;
      waSocket = sock;
    }
  });

  // Listener opcional para ler mensagens recebidas
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.message) {
          const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
          console.log(`Recebeu mensagem de ${msg.key.remoteJid}: ${text}`);
          // Futuro: Implementar chatbot aqui
        }
      }
    }
  });

  return sock;
};
