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
            <Button>
              Acessar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-6 max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Inteligência e Gestão para a sua <span className="text-primary">Campanha Eleitoral</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Plataforma completa para coordenar sua equipe, controlar distribuição de materiais, 
            e monitorar sua intenção de voto com precisão. Em tempo real e do seu celular.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/onboarding">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-md">
                Cadastrar Campanha (Admin)
              </Button>
            </Link>
            <Link to="/public/cadastro">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg h-14 px-8 bg-slate-900 text-white hover:bg-slate-800">
                Cadastre-se Geral (Membro / Apoiador)
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8">
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
