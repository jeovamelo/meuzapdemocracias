import express from 'express';
import path from 'node:path';
import cors from 'cors';
import { connectToWhatsApp, isConnected, waSocket, currentQr } from './whatsapp';
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
    qr: currentQr,
  });
});

// Fotos oficiais importadas localmente a partir dos pacotes do TSE
app.get('/foto/:ano/:uf/:id', (req, res) => {
  const file = path.join('/opt/democracias/importados/fotos2026', `F${String(req.params.uf).toUpperCase()}${String(req.params.id).replace(/^\D+/, '')}_div.jpg`);
  return res.sendFile(file, err => { if (err && !res.headersSent) res.status(404).json({ error: 'Foto não encontrada.' }); });
});

// Consulta local no Supabase, importado a partir dos dados oficiais do TSE
app.get('/tse/:uf/:numero', async (req, res) => {
  const { uf, numero } = req.params;
  const cargo = String(req.query.cargo || '');
  if (!uf || !numero || !cargo) return res.status(400).json({ error: 'UF, cargo e número são obrigatórios.' });
  try {
    const candidate = await searchTseCandidate(uf, numero, '2026', cargo);
    if (!candidate) return res.status(404).json({ error: 'Candidato não encontrado na base do Supabase.' });
    return res.json(candidate);
  } catch (error) {
    console.error('Erro na busca local:', error);
    return res.status(502).json({ error: 'Falha ao consultar a base local do Supabase.' });
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
