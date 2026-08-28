import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { DemocraciasLogoIcon } from "./DemocraciasLogoIcon";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
  showLogo = true,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: ReactNode;
  showLogo?: boolean;
}) {
  const { campaign, clearCampaign } = useCampaignScope();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao fazer logout:", e);
    }
    clearCampaign();
    localStorage.removeItem("democracias-campaign-scope");
    localStorage.removeItem("democracias_membro_google_email");
    localStorage.removeItem("democracias_admin_google_email");
    sessionStorage.clear();
    toast.success("Sessão encerrada com sucesso!");
    navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 sm:px-6 pt-5 pb-3.5 backdrop-blur-md transition-all">
      {/* Barra superior de identificação, campanha e logoff */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {showLogo && (
              <DemocraciasLogoIcon size={13} className="opacity-70 text-primary" />
            )}
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              {eyebrow}
            </p>
          </div>

          {campaign && (
            <Link
              to="/selecionar-campanha"
              title="Clique para alternar de campanha"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-foreground tracking-tight shadow-xs transition-all cursor-pointer"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {(campaign as any).nomeUrna || (campaign as any).candidato_nome || "Campanha"}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono font-black text-primary">{campaign.numero}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono font-bold text-muted-foreground uppercase">{campaign.uf}</span>
              <ArrowLeftRight className="size-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5 text-primary" />
            </Link>
          )}
        </div>

        {/* Botão Global de Sair / Logoff */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Encerrar sessão com segurança"
            className="h-7 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/40 hover:border-destructive/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="size-3.5 text-destructive/80" />
            <span className="inline">Sair</span>
          </Button>
        </div>
      </div>

      {/* Título da página e Ações Específicas */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
