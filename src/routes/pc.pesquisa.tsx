import { createFileRoute, Link } from '@tanstack/react-router';
import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  Layers
} from 'lucide-react';
import { PainelPesquisaEleitoral } from '@/components/PainelPesquisaEleitoral';

class PesquisaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Erro na rota /pc/pesquisa:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white border border-rose-200 rounded-3xl text-center space-y-4 shadow-sm max-w-xl mx-auto my-12">
          <div className="size-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Instabilidade momentânea ao carregar a Pesquisa
          </h3>
          <p className="text-sm text-slate-600">
            Não foi possível carregar os gráficos eleitorais no momento. Verifique sua conexão e tente novamente.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button 
              onClick={() => this.setState({ hasError: false })} 
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              <RefreshCw className="mr-2 size-4" /> Tentar Novamente
            </Button>
            <Link to="/pc">
              <Button variant="outline">Voltar ao Painel de Controle</Button>
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute('/pc/pesquisa')({
  component: PcPesquisaPage,
});

function PcPesquisaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* CABEÇALHO SUPERIOR COM BOTÃO DE VOLTAR */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/pc">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <ArrowLeft className="size-4 mr-1 text-orange-400" />
              Voltar ao PC
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
          </a>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO DASHBOARD E MAPA DE CALOR */}
      <div className="max-w-7xl mx-auto">
        <PesquisaErrorBoundary>
          <PainelPesquisaEleitoral />
        </PesquisaErrorBoundary>
      </div>
    </div>
  );
}

export default PcPesquisaPage;
