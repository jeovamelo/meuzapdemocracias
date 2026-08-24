import { createFileRoute, Link } from '@tanstack/react-router';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, ExternalLink } from 'lucide-react';
import { PainelPesquisaEleitoral } from '@/components/PainelPesquisaEleitoral';

export const Route = createFileRoute('/pesquisa')({
  component: PesquisaStandalonePage,
});

function PesquisaStandalonePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* CABEÇALHO SUPERIOR */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/pc">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <ArrowLeft className="size-4 mr-1 text-orange-400" />
              Painel de Controle
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <BarChart3 className="size-6 text-orange-500" />
              Pesquisa Eleitoral & Inteligência
            </h1>
            <p className="text-xs text-slate-400">
              Ambiente de análise geoespacial e densidade eleitoral consolidada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://chat.democracias.org/resultado"
            target="_blank"
            rel="noreferrer"
            className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <span>Ver Tela Pública</span>
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* DASHBOARD & MAPA DE CALOR */}
      <div className="max-w-7xl mx-auto">
        <PainelPesquisaEleitoral />
      </div>
    </div>
  );
}

export default PesquisaStandalonePage;
