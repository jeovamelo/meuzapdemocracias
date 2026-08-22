import express from 'express';
import cors from 'cors';
import { connectToWhatsApp, isConnected, waSocket } from './whatsapp';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Iniciar a conexão do WhatsApp
connectToWhatsApp();

// Endpoint de Status
app.get('/status', (req, res) => {
  res.json({
    online: isConnected,
    message: isConnected ? 'WhatsApp conectado' : 'Aguardando conexão / QR Code',
  });
});

// Endpoint para Envio de Mensagens
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: 'Os campos "number" e "message" são obrigatórios.' });
  }

  if (!isConnected || !waSocket) {
    return res.status(503).json({ error: 'WhatsApp não está conectado no momento.' });
  }

  try {
    // Formatar número para o padrão internacional do WhatsApp (JID)
    // Supondo que "number" venha no formato DDI+DDD+Numero (ex: 5511999999999)
    let formattedNumber = number;
    if (!formattedNumber.includes('@s.whatsapp.net')) {
      formattedNumber = `${formattedNumber}@s.whatsapp.net`;
    }

    // Disparar a mensagem
    const result = await waSocket.sendMessage(formattedNumber, { text: message });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Falha ao enviar mensagem pelo WhatsApp.' });
  }
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Democracias WhatsApp Service rodando`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`=================================`);
});
