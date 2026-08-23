import express from 'express';
import path from 'node:path';
import cors from 'cors';
import { searchTseCandidate } from './tse';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const app = express();
const PORT = process.env.PORT || 3001;

const supabaseUrl = process.env.SUPABASE_URL || 'https://cwhwpwqoqrmvrwqouung.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_J09JcIO5AFTx8f6ucbqWBQ_C4w2uS2O';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: WebSocket as any,
  }
});

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'democracias_global_evolution_key_2026';

app.use(cors());
app.use(express.json());

/**
 * Endpoint /whatsapp (Renderiza Dashboard com todos os WhatsApps cadastrados, campanhas e status)
 */
app.get('/whatsapp', async (req, res) => {
  try {
    // 1. Consultar instâncias de WhatsApp no Supabase
    const { data: instances, error: errInst } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Consultar dados ao vivo da Evolution API para cada instância
    let evolutionInstancesLive: any[] = [];
    try {
      const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY }
      });
      if (evoRes.ok) {
        evolutionInstancesLive = await evoRes.json();
      }
    } catch (e) {
      console.warn("Falha ao comunicar com Evolution API:", e);
    }

    // 3. Consultar fila de mensagens e métricas
    const { data: queueStats } = await supabase
      .from('whatsapp_dispatch_queue')
      .select('status, count(*)', { count: 'exact' });

    // Combinar dados
    const listaInstancias = (instances || []).map((inst: any) => {
      const liveData = evolutionInstancesLive.find((e: any) => e.name === inst.instance_name || e.instance?.instanceName === inst.instance_name);
      const isOnline = liveData?.connectionStatus === 'open' || inst.connection_status === 'open';
      return {
        id: inst.id,
        instance_name: inst.instance_name,
        campaign_id: inst.campaign_id || 'Sistema Geral (/pc)',
        tipo: inst.instance_type,
        phone: inst.phone_number || liveData?.ownerJid?.split('@')[0] || 'Aguardando Pareamento',
        status: isOnline ? 'open' : (inst.connection_status || 'close'),
        is_active: inst.is_active,
        created_at: inst.created_at,
        mensagens_hoje: inst.mensagens_enviadas_hoje || 0,
        taxa_sucesso: inst.taxa_sucesso || 100,
        qr_code: inst.qr_code_base64
      };
    });

    // Se a requisição pedir JSON (API)
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.json({
        total: listaInstancias.length,
        instances: listaInstancias,
        evolution_live_status: 'online'
      });
    }

    // Renderizar página HTML completa moderna
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Painel de Instâncias WhatsApp — Democracias.org</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen p-6 md:p-12 font-sans">
      <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <i class="fa-solid fa-bolt"></i> Evolution API v2 + Supabase Integrado
            </div>
            <h1 class="text-3xl font-extrabold tracking-tight text-white">Central de Conexões WhatsApp</h1>
            <p class="text-slate-400 text-sm mt-1">Gerenciamento de instâncias únicas por campanha, status de pareamento e controle de disparos.</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.location.reload()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700 transition-all flex items-center gap-2">
              <i class="fa-solid fa-rotate"></i> Atualizar Status
            </button>
            <a href="https://democracias.org/pc" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2">
              <i class="fa-solid fa-shield"></i> Painel Master (/pc)
            </a>
          </div>
        </div>

        <!-- Cards de Métricas -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Instâncias</div>
            <div class="text-3xl font-extrabold text-white mt-1">${listaInstancias.length}</div>
            <div class="text-xs text-slate-500 mt-1">Campanhas e Sistema Master</div>
          </div>
          <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div class="text-slate-400 text-xs font-bold uppercase tracking-wider">Instâncias Conectadas</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-1">
              ${listaInstancias.filter((i: any) => i.status === 'open').length}
            </div>
            <div class="text-xs text-emerald-500/80 mt-1">Prontas para envio com Anti-Ban</div>
          </div>
          <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div class="text-slate-400 text-xs font-bold uppercase tracking-wider">Motor de Disparos</div>
            <div class="text-xl font-bold text-blue-400 mt-2 flex items-center gap-2">
              <span class="size-2.5 rounded-full bg-blue-500 animate-pulse"></span> Delay 8s - 15s Ativo
            </div>
            <div class="text-xs text-slate-500 mt-1">Validação prévia de número ativo</div>
          </div>
        </div>

        <!-- Lista de Instâncias -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div class="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <i class="fa-brands fa-whatsapp text-emerald-400 text-xl"></i> Instâncias e Campanhas Vinculadas
            </h2>
            <span class="text-xs text-slate-400 font-mono">Regra: 1 Instância Ativa por Campanha</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-4 px-6">Nome da Instância</th>
                  <th class="py-4 px-6">Campanha / Escopo</th>
                  <th class="py-4 px-6">Número Conectado</th>
                  <th class="py-4 px-6">Status Conexão</th>
                  <th class="py-4 px-6">Enviados Hoje</th>
                  <th class="py-4 px-6">Data de Criação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                ${listaInstancias.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-12 text-center text-slate-500">
                      <i class="fa-regular fa-folder-open text-3xl mb-3 block"></i>
                      Nenhuma instância cadastrada ainda. Crie uma campanha para gerar uma instância única.
                    </td>
                  </tr>
                ` : listaInstancias.map((inst: any) => `
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <td class="py-4 px-6 font-mono font-bold text-white flex items-center gap-2">
                      <i class="fa-solid fa-server text-slate-500 text-xs"></i>
                      ${inst.instance_name}
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${inst.tipo === 'system_general' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}">
                        ${inst.campaign_id}
                      </span>
                    </td>
                    <td class="py-4 px-6 font-mono text-slate-300">
                      ${inst.phone}
                    </td>
                    <td class="py-4 px-6">
                      ${inst.status === 'open' ? `
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span> Conectado 🟢
                        </span>
                      ` : inst.status === 'connecting' ? `
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span class="size-2 rounded-full bg-amber-500 animate-ping"></span> Aguardando QR Code 🟡
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <span class="size-2 rounded-full bg-rose-500"></span> Desconectado 🔴
                        </span>
                      `}
                    </td>
                    <td class="py-4 px-6 font-bold text-white">
                      ${inst.mensagens_hoje}
                    </td>
                    <td class="py-4 px-6 text-xs text-slate-500">
                      ${new Date(inst.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <footer class="text-center text-xs text-slate-600 pt-6 border-t border-slate-800/60">
          Plataforma Democracias • Integrado com Evolution API v2 & Supabase • democracias.org
        </footer>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("Erro no endpoint /whatsapp:", error);
    res.status(500).send("Erro interno ao carregar instâncias de WhatsApp.");
  }
});

// Endpoint de Status JSON simplificado
app.get('/whatsapp/status', async (req, res) => {
  try {
    const { data: inst } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('tipo', 'system_general')
      .maybeSingle();

    res.json({
      online: inst?.connection_status === 'open',
      message: inst?.connection_status === 'open' ? 'WhatsApp conectado' : 'Aguardando conexão',
      qr: inst?.qr_code_base64
    });
  } catch {
    res.json({ online: false, message: 'Serviço em sincronização' });
  }
});

// Fotos oficiais do TSE
app.get('/foto/:ano/:uf/:id', (req, res) => {
  const file = path.join('/opt/democracias/importados/fotos2026', `F${String(req.params.uf).toUpperCase()}${String(req.params.id).replace(/^\D+/, '')}_div.jpg`);
  return res.sendFile(file, err => { if (err && !res.headersSent) res.status(404).json({ error: 'Foto não encontrada.' }); });
});

// Consulta TSE no Supabase
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

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Democracias WhatsApp Service (Evolution API Integrada)`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`=================================`);
});
