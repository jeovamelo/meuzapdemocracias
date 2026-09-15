import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { StepperHeader } from './components/StepperHeader';
import { Step1Conexao } from './components/Step1Conexao';
import { Step2Colinha } from './components/Step2Colinha';
import { Step3Contatos } from './components/Step3Contatos';
import { Step4Disparo } from './components/Step4Disparo';
import type { EtapaFluxo, ColinhaVotos, ContatoWhatsApp } from './types';

export function App() {
  const [etapa, setEtapa] = useState<EtapaFluxo>('conexao');
  const [voterName, setVoterName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voterPhone, setVoterPhone] = useState<string | undefined>();
  const [uf, setUf] = useState('CE');
  const [votos, setVotos] = useState<ColinhaVotos>({});
  const [contatos, setContatos] = useState<ContatoWhatsApp[]>([]);

  const handleSessionCreated = (id: string, phone?: string) => {
    setSessionId(id);
    if (phone) setVoterPhone(phone);
  };

  const handleConcluirGeral = () => {
    // Reset para novo ciclo
    setEtapa('conexao');
    setSessionId(null);
    setVoterPhone(undefined);
    setContatos([]);
    toast.success('Pronto para uma nova campanha de colinha!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Stepper Superior */}
      <StepperHeader etapaAtual={etapa} />

      {/* Corpo da Aplicação */}
      <main className="flex-1 pb-16">
        {etapa === 'conexao' && (
          <Step1Conexao
            voterName={voterName}
            onVoterNameChange={setVoterName}
            sessionId={sessionId}
            onSessionCreated={handleSessionCreated}
            onAvancar={() => setEtapa('colinha')}
          />
        )}

        {etapa === 'colinha' && (
          <Step2Colinha
            voterName={voterName}
            uf={uf}
            onUfChange={setUf}
            votos={votos}
            onVotosChange={setVotos}
            onVoltar={() => setEtapa('conexao')}
            onAvancar={() => setEtapa('contatos')}
          />
        )}

        {etapa === 'contatos' && (
          <Step3Contatos
            sessionId={sessionId || ''}
            contatos={contatos}
            onContatosChange={setContatos}
            onVoltar={() => setEtapa('colinha')}
            onAvancar={() => setEtapa('disparo')}
          />
        )}

        {etapa === 'disparo' && (
          <Step4Disparo
            sessionId={sessionId || ''}
            voterName={voterName}
            voterPhone={voterPhone}
            uf={uf}
            votos={votos}
            contatos={contatos}
            onVoltar={() => setEtapa('contatos')}
            onConcluir={handleConcluirGeral}
          />
        )}
      </main>

      {/* Rodapé Oficial */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>
          MeuZap • Democracias.org • Plataforma Aberta de Inteligência e Mobilização Eleitoral
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Sessões individuais efêmeras via Evolution API v2 • Proteção Antispam Ativa
        </p>
      </footer>
    </div>
  );
}

export default App;
