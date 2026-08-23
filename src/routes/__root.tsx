import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { useCampaignScope } from "@/hooks/useCampaignScope";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Democracias — Gestão e Inteligência Eleitoral" },
      {
        name: "description",
        content:
          "Gestão de estoque, kits e distribuição de material de campanha eleitoral, feita para uso em campo pelo celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#f97316" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const location = router.state.location.pathname;
  const { campaign } = useCampaignScope();

  useEffect(() => {
    // Redireciona para /onboarding se tentar acessar rotas protegidas sem campanha
    const publicRoutes = ['/', '/auth', '/onboarding', '/pc', '/public/cadastro', '/bu'];
    const isPublic = publicRoutes.some(r => location === r || location.startsWith('/public') || location.startsWith('/bu'));

    if (!isPublic && !campaign) {
      router.navigate({ to: '/onboarding' });
    }
  }, [campaign, location, router]);

  const showBottomNav = !['/', '/auth', '/onboarding', '/pc'].includes(location) && !location.startsWith('/public');

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <div className="mx-auto flex min-h-screen w-full flex-col bg-background font-sans text-foreground shadow-2xl ring-1 ring-black/5 md:max-w-none lg:max-w-none">
          <div className="pointer-events-none fixed left-0 top-0 z-50 h-1 w-full bg-gradient-to-r from-primary to-accent" />
          {/* O container interno mantém a largura mobile para as páginas de campo, mas permite dashboard em tela cheia se necessário via classes nos filhos */}
          <main className="mx-auto flex-1 pb-16 w-full">
            <Outlet />
          </main>
          <Footer />
          {showBottomNav && <BottomNav />}
        </div>
        <Toaster position="top-center" />
      </StoreProvider>
    </QueryClientProvider>
  );
}

