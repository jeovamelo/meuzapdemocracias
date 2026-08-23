import { Link } from "@tanstack/react-router";
import { ArrowRightLeft, ChevronLeft, ChevronRight, Home, MapPin, Package, QrCode, Target, Users } from "lucide-react";
import { useState } from "react";

const items = [
  ["/dashboard", "Início", Home], ["/potencial", "Inteligência", Target],
  ["/comites", "Comitês", MapPin], ["/pessoas", "Pessoas", Users],
  ["/materiais", "Materiais", Package], ["/saidas", "Saídas", ArrowRightLeft],
  ["/bu", "Scanner BU", QrCode],
] as const;

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 hidden border-r border-border bg-background/95 shadow-sm backdrop-blur-md transition-[width] duration-200 lg:flex lg:flex-col ${collapsed ? "w-[72px]" : "w-60"}`}>
      <div className="flex h-20 items-center justify-between border-b border-border px-4">
        {!collapsed && <span className="font-black tracking-tight text-primary">DEMOCRACIAS</span>}
        <button aria-label={collapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setCollapsed(v => !v)} className="flex size-10 items-center justify-center rounded-xl hover:bg-muted">
          {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(([to, label, Icon]) => <Link key={to} to={to} activeOptions={{ exact: to === "/dashboard" }} title={collapsed ? label : undefined} className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary">
          <Icon className="size-5 shrink-0" />
          {!collapsed && <span>{label}</span>}
        </Link>)}
      </nav>
      {!collapsed && <div className="border-t border-border p-4 text-[10px] font-mono text-muted-foreground">Painel operacional</div>}
    </aside>
  );
}
