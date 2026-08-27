import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { activateCampaignAccess, getUserCampaignAccesses } from "@/lib/userCampaignAccess";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("democracias_saved_password") || "" : "",
  );
  const [rememberMe, setRememberMe] = useState(
    () =>
      typeof window !== "undefined" && localStorage.getItem("democracias_remember_me") === "true",
  );
  const routingUser = useRef(false);

  const routeAuthenticatedUser = useCallback(
    async (userId: string) => {
      if (routingUser.current) return;
      routingUser.current = true;
      setIsLoading(true);

      try {
        const accesses = await getUserCampaignAccesses(userId);
        if (accesses.length === 1) {
          activateCampaignAccess(accesses[0]);
          navigate({ to: "/dashboard" });
          return;
        }
        if (accesses.length > 1) {
          navigate({ to: "/selecionar-campanha" });
          return;
        }

        toast.info("Sua conta ainda não possui uma campanha liberada.");
        navigate({ to: "/onboarding" });
      } catch (error) {
        console.error("Erro ao consultar os acessos do usuário:", error);
        toast.error(
          "Login concluído, mas não foi possível consultar suas campanhas. Tente novamente.",
        );
        routingUser.current = false;
        setIsLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) routeAuthenticatedUser(data.session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user) {
        window.setTimeout(() => void routeAuthenticatedUser(session.user.id), 0);
      }
    });

    const whatsapp = new URLSearchParams(window.location.search).get("whatsapp");
    if (whatsapp) {
      localStorage.setItem("democracias_whatsapp_validated", whatsapp);
      toast.success("WhatsApp validado. Você já pode continuar.");
    }

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [routeAuthenticatedUser]);

  // isLogin removido: a rota agora é exclusivamente para Login de usuários convidados ou aprovados.

  const handleWhatsAppAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !password) {
      toast.error("Preencha todos os campos!");
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const finalPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const email = `${finalPhone}@whatsapp.democracias.org`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Usuário autenticado não encontrado.");

      localStorage.setItem("democracias_remember_me", String(rememberMe));
      if (rememberMe) sessionStorage.setItem("democracias_saved_password", password);
      else sessionStorage.removeItem("democracias_saved_password");
      toast.success("Login efetuado com sucesso!");
      await routeAuthenticatedUser(data.user.id);
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro na autenticação.");
      routingUser.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?oauth=callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao fazer login com o Google.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-primary p-8 text-center text-primary-foreground">
          <div className="bg-primary-foreground/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Democracias</h1>
          <p className="text-primary-foreground/80 mt-2">Acesso Restrito ao Painel</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleWhatsAppAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                placeholder="Ex: 5511999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Lembrar de mim nesta sessão
            </label>

            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema <MessageCircle className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-6 h-12"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Conta Google
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-600">
            O cadastro de novos usuários é restrito e deve ser feito internamente por um
            Administrador da Campanha.
          </div>
        </div>
      </div>
    </div>
  );
}
