import type { ReactNode } from "react";
import { DemocraciasLogoIcon } from "./DemocraciasLogoIcon";

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
  return (
    <header className="sticky top-0 z-30 flex items-end justify-between border-b border-border bg-background/90 px-5 pt-8 pb-4 backdrop-blur-md">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          {showLogo && (
            <DemocraciasLogoIcon size={13} className="opacity-60 text-muted-foreground" />
          )}
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

