import { DemocraciasLogoIcon } from './DemocraciasLogoIcon';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 py-6 px-4 text-center text-xs text-muted-foreground/70">
      <div className="flex flex-col items-center justify-center gap-2">
        <DemocraciasLogoIcon size={18} className="opacity-40 hover:opacity-80 transition-opacity" />
        <p className="font-mono text-[11px]">
          &copy; {new Date().getFullYear()} Democracias &bull; democracias.org
        </p>
      </div>
    </footer>
  );
}
