import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  BarChart3, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  User, 
  LogOut,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { PainelPesquisaEleitoral } from '@/components/PainelPesquisaEleitoral';

export const Route = createFileRoute('/pesquisa')({
  component: PesquisaStandalonePage,
});

function PesquisaStandalonePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return false;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('democracias_pc_auth') === 'true';
      setIsAuthenticated(auth);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    if (loginUser.trim() === 'jeovaabreu' && loginPass === 'tk90xz39@123E') {
      sessionStorage.setItem('democracias_pc_auth', 'true');
      setIsAuthenticated(true);
      toast.success('Acesso administrativo autorizado!');
    } else {
      setLoginError('Usuário ou senha de administrador incorretos.');
      toast.error('Credenciais inválidas.');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('democracias_pc_auth');
    setIsAuthenticated(false);
    toast.info('Sessão administrativa encerrada.');
  };

  // TELA DE AUTENTICAÇÃO ADMINISTRATIVA OBRIGATÓRIA (MESMAS CREDENCIAIS DO /pc)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="size-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto border border-orange-500/20 shadow-inner">
              <ShieldCheck className="size-8" />
            </div>
            <h1 className="text-xl font-black text-white">
              Painel de Inteligência Eleitoral
            </h1>
            <p className="text-xs text-slate-400">
              Acesso restrito exclusivamente a Administradores Gerais.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">
                Usuário Administrador
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Usuário..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="pl-10 h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">
                Senha Administrativa
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="pl-10 h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              {isLoggingIn ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="size-4 mr-2" />
              )}
              Entrar no Painel de Pesquisa
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <Link to="/pc" className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
              ← Voltar para o Painel de Controle (/pc)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* CABEÇALHO SUPERIOR AUTENTICADO */}
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-10 px-3 rounded-xl border-slate-800 bg-slate-900 hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-800/50 text-slate-400 text-xs font-bold"
            title="Encerrar Sessão"
          >
            <LogOut className="size-3.5 mr-1" />
            Sair
          </Button>
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
