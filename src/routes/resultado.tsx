import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/resultado')({
  component: ResultadoRedirectPage,
});

function ResultadoRedirectPage() {
  useEffect(() => {
    window.location.href = 'https://chat.democracias.org/resultado';
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-white">
      <div className="size-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-bold">Redirecionando para os Resultados Oficiais da Pesquisa...</h2>
      <p className="text-sm text-slate-400 mt-2">
        Se não for redirecionado automaticamente,{' '}
        <a href="https://chat.democracias.org/resultado" className="text-orange-400 font-bold underline">
          clique aqui
        </a>.
      </p>
    </div>
  );
}
