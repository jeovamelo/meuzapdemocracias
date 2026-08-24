import React, { useEffect, useState } from 'react';
import { Loader2, MapPinned, RefreshCw } from 'lucide-react';
import { createClientOnlyFn } from '@tanstack/react-start';
import type { MapaEleitoralInterativoProps } from './MapaEleitoralInterativo.types';

type ComponenteMapa = React.ComponentType<MapaEleitoralInterativoProps>;
const carregarComponenteMapa = createClientOnlyFn(() => import('./MapaEleitoralLeaflet.client'));

export const MapaEleitoralInterativo: React.FC<MapaEleitoralInterativoProps> = (props) => {
  const [Componente, setComponente] = useState<ComponenteMapa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(null);
    setComponente(null);

    carregarComponenteMapa()
      .then((modulo) => {
        if (ativo) setComponente(() => modulo.MapaEleitoralLeaflet);
      })
      .catch((error) => {
        console.error('Falha ao carregar o mapa geográfico:', error);
        if (ativo) setErro('Não foi possível carregar o mapa geográfico agora.');
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  if (erro) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center text-white">
        <MapPinned className="size-9 text-orange-400" />
        <div>
          <p className="font-extrabold">{erro}</p>
          <p className="mt-1 text-xs text-slate-400">Os indicadores e a tabela continuam disponíveis.</p>
        </div>
        <button
          type="button"
          onClick={() => setTentativa((valor) => valor + 1)}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold hover:bg-orange-600"
        >
          <RefreshCw className="size-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!Componente) {
    return (
      <div className="flex min-h-[420px] items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 text-sm font-bold text-slate-300">
        <Loader2 className="size-5 animate-spin text-orange-400" /> Carregando mapa geográfico...
      </div>
    );
  }

  return <Componente {...props} />;
};

export default MapaEleitoralInterativo;
