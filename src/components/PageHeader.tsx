import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-end justify-between border-b border-border bg-background/90 px-5 pt-8 pb-4 backdrop-blur-md">
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
