import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Target, Map, BarChart3, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img
            src="/democraciaslogo.png"
            alt="Democracias Logo"
            className="h-9 w-auto object-contain rounded-md"
          />
          <span className="font-bold text-xl tracking-tight text-slate-900">Democracias</span>
        </div>
        <div>
          <Link to="/auth">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-5 h-11 shadow-sm">
              Acessar Sistema
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 sm:py-20 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 text-xs font-black mb-6">
            <span>🗳️ Pesquisa Eleitoral Oficial 2026</span>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Inteligência e Gestão para a sua <span className="text-primary">Campanha Eleitoral</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Plataforma completa para coordenar sua equipe, controlar distribuição de materiais, 
            e monitorar sua intenção de voto com precisão. Em tempo real e do seu celular.
          </p>

          {/* BOTÕES PRINCIPAIS DE AÇÃO COM ALTO CONTRASTE */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap mb-4">
            {/* 1. RESULTADO DA PESQUISA */}
            <a
              href="https://chat.democracias.org/resultado"
              className="w-full sm:w-auto h-14 px-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-lg shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-orange-400/40"
            >
              <BarChart3 className="size-5 text-white" />
              <span>Resultado da Pesquisa</span>
            </a>

            {/* 2. VOTAR NO ASSISTENTE */}
            <a
              href="https://chat.democracias.org"
              className="w-full sm:w-auto h-14 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Votar no Assistente</span>
            </a>

            {/* 3. CADASTRAR CAMPANHA (ADMIN) */}
            <Link to="/onboarding" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-14 px-8 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-lg border-2 border-slate-300 shadow-sm flex items-center justify-center transition-all"
              >
                Cadastrar Campanha (Admin)
              </button>
            </Link>
          </div>

          {/* AÇÕES SECUNDÁRIAS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/public/cadastro">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-medium text-sm">
                Cadastre-se Geral (Membro / Apoiador)
              </Button>
            </Link>
            <span className="hidden sm:inline text-slate-300">•</span>
            <Link to="/auth">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-medium text-sm">
                Já tenho uma conta
              </Button>
            </Link>
          </div>
        </section>

        <section className="bg-white py-20 border-t">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Map className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Comitês</h3>
              <p className="text-slate-600">Coordene todas as suas bases de apoio e cabos eleitorais espalhados pelo estado.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Controle de Estoque</h3>
              <p className="text-slate-600">Nunca fique sem material. Controle exato de quem pegou o que, quando e onde.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Apuração Paralela</h3>
              <p className="text-slate-600">Acompanhamento e consolidação de resultados em tempo real no dia da eleição.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center">
        <p>© 2026 democracias.com. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
