import express from 'express';
import cors from 'cors';
import { connectToWhatsApp, isConnected, waSocket } from './whatsapp';
import { searchTseCandidate } from './tse';

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

// Endpoint de Consulta ao TSE (DivulgaCandContas)
app.get('/tse/candidato', async (req, res) => {
  const { uf, numero, ano } = req.query;

  if (!uf || !numero) {
    return res.status(400).json({ error: 'UF e Número são obrigatórios.' });
  }

  try {
    const candidate = await searchTseCandidate(String(uf), String(numero), ano ? String(ano) : '2024');

    if (!candidate) {
      // Se não encontrou em 2024, tenta em 2022 (Eleições Gerais)
      const fallbackCandidate = await searchTseCandidate(String(uf), String(numero), '2022');
      if (fallbackCandidate) {
        return res.json({ success: true, candidate: fallbackCandidate });
      }
      return res.status(404).json({ success: false, message: 'Candidato não localizado na base do TSE.' });
    }

    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Erro na rota do TSE:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao consultar o TSE.' });
  }
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
