import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, Target, Users, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import {
  activateCampaignAccess,
  getUserCampaignAccesses,
  type UserCampaignAccess,
} from "@/lib/userCampaignAccess";
import { toast } from "sonner";

export const Route = createFileRoute("/selecionar-campanha")({
  component: CampaignSelectorPage,
});

function CampaignSelectorPage() {
  const navigate = useNavigate();
  const { clearCampaign } = useCampaignScope();
  const [accesses, setAccesses] = useState<UserCampaignAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn(e);
    }
    clearCampaign();
    localStorage.removeItem("democracias-campaign-scope");
    localStorage.removeItem("democracias_membro_google_email");
    localStorage.removeItem("democracias_admin_google_email");
    sessionStorage.clear();
    toast.success("Sessão encerrada com sucesso!");
    navigate({ to: "/auth" });
  };

  useEffect(() => {
    let active = true;

    const loadAccesses = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          navigate({ to: "/auth" });
          return;
        }

        const result = await getUserCampaignAccesses(data.session.user.id);
        if (!active) return;
        
        const approvedCampaigns = result.filter(r => r.status === 'approved' || r.status === 'ativo' || r.status === 'aprovado');

        if (result.length === 0) {
          toast.info("Nenhuma campanha liberada para esta conta.");
          navigate({ to: "/onboarding" });
          return;
        }
        if (approvedCampaigns.length === 1 && result.length === 1 && approvedCampaigns[0]) {
          activateCampaignAccess(approvedCampaigns[0]);
          navigate({ to: "/dashboard" });
          return;
        }
        setAccesses(result);
      } catch (error) {
        console.error("Erro ao consultar campanhas do usuário:", error);
        toast.error("Não foi possível carregar suas campanhas. Tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAccesses();
    return () => {
      active = false;
    };
  }, [navigate]);

  const selectCampaign = (access: UserCampaignAccess) => {
    activateCampaignAccess(access);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-slate-200 hover:border-destructive/30 rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5"
          >
            <LogOut className="size-3.5 text-destructive/80" />
            <span>Sair da Conta</span>
          </Button>
        </div>
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Target className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Escolha a campanha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Selecione a campanha para acessar o painel administrativo.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border bg-white shadow-sm">
            <div className="text-center text-slate-600">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
              Consultando campanhas e permissões...
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accesses.map((access) => {
              const isApproved = access.status === 'approved' || access.status === 'ativo' || access.status === 'aprovado';
              
              return (
                <article
                  key={access.campaignId}
                  className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      {access.role === "admin" ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {!isApproved && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] font-bold">
                          Aguardando Liberação
                        </Badge>
                      )}
                      <Badge variant={access.role === "admin" ? "default" : "secondary"}>
                        {access.role === "admin" ? "Administrador" : "Membro"}
                      </Badge>
                    </div>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                    {access.campaignName}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {access.ballotName} {access.candidateNumber && `• ${access.candidateNumber}`}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {[access.office, access.uf, access.party].filter(Boolean).join(" • ")}
                  </p>
                  {isApproved ? (
                    <Button className="mt-6 w-full" onClick={() => selectCampaign(access)}>
                      Acessar campanha <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className="mt-6 w-full bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed" disabled>
                      Pendente de Aprovação
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
