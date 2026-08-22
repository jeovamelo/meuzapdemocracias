import { Link } from "@tanstack/react-router";
import { Home, MapPin, Users, Package, ArrowRightLeft, Target, QrCode } from "lucide-react";
 
 const tabs = [
   { to: "/", label: "Início", icon: Home, exact: true },
   { to: "/potencial", label: "Inteligência", icon: Target, exact: false },
   { to: "/comites", label: "Comitês", icon: MapPin, exact: false },
   { to: "/pessoas", label: "Pessoas", icon: Users, exact: false },
   { to: "/materiais", label: "Materiais", icon: Package, exact: false },
   { to: "/saidas", label: "Saídas", icon: ArrowRightLeft, exact: false },
 ] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-border bg-background px-2 pt-2 pb-6">
      {tabs.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          className="group flex flex-1 flex-col items-center gap-1 py-1 text-muted-foreground data-[status=active]:text-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-lg group-data-[status=active]:bg-primary/10">
            <Icon className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-[10px] font-bold">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
