import type { ReactNode } from "react";
import { DemocraciasLogoIcon } from "./DemocraciasLogoIcon";
import { useCampaignScope } from "@/hooks/useCampaignScope";

export function PageHeader({
  eyebrow,
  title,
  right,
  showLogo = true,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  showLogo?: boolean;
}) {
  const { campaign } = useCampaignScope();

  return (
    <header className="sticky top-0 z-30 flex items-end justify-between border-b border-border bg-background/90 px-5 pt-7 pb-3.5 backdrop-blur-md">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {showLogo && (
              <DemocraciasLogoIcon size={12} className="opacity-60 text-muted-foreground" />
            )}
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </p>
          </div>

          {campaign && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-foreground tracking-tight shadow-sm">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {campaign.nomeUrna || campaign.candidato_nome || "Campanha"}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono font-black text-primary">{campaign.numero}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono font-bold text-muted-foreground uppercase">{campaign.uf}</span>
            </span>
          )}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
