import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, PlusCircle, History, CalendarDays, BarChart3, Settings, KeyRound,
  Search, Bell, LogOut, Menu, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loansQuery, loanStatus, overdueLabel, useRealtimeSync } from "@/lib/a3";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SearchCtx = createContext("");
export const useGlobalSearch = () => useContext(SearchCtx);

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/emprestimos", label: "Novo Empréstimo", icon: PlusCircle },
  { to: "/certificados", label: "Certificados", icon: KeyRound },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <ShieldCheck className="size-5" />
      </div>
      <div>
        <div className="text-lg font-semibold leading-tight">A3 Guardian</div>
        <div className="text-xs text-muted-foreground">Controle do Certificado A3</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="mt-8 flex flex-col gap-1">
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          activeOptions={{ exact: n.to === "/" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-medium"
        >
          <n.icon className="size-4.5" />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useRealtimeSync();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const loans = useQuery({ ...loansQuery, enabled: !!user });
  const overdue = (loans.data ?? []).filter((l) => loanStatus(l) === "atrasado");

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Usuário";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const sidebarFooter = (
    <div className="mt-auto flex items-center gap-3 border-t border-sidebar-border px-2 pt-4">
      <div className="grid size-10 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary">{initials}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Administrador</div>
      </div>
      <button
        aria-label="Sair"
        onClick={() => supabase.auth.signOut()}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );

  return (
    <SearchCtx.Provider value={q}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
          <Brand />
          <NavList />
          {sidebarFooter}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menu" className="rounded-md p-2 hover:bg-accent lg:hidden">
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-4">
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
                {sidebarFooter}
              </SheetContent>
            </Sheet>
            <div className="relative max-w-lg flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por nome, setor, certificado, motivo…"
                className="h-10 w-full rounded-xl border border-border bg-surface/60 pl-9 pr-16 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button aria-label="Notificações" className="relative ml-auto rounded-lg p-2 hover:bg-accent">
                  <Bell className="size-5" />
                  {overdue.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="mb-2 text-sm font-semibold">Notificações</div>
                {overdue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum certificado atrasado. Tudo em ordem.</p>
                ) : (
                  <ul className="space-y-2">
                    {overdue.map((l) => (
                      <li key={l.id} className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm">
                        <div className="font-medium">⚠ {l.employee_name}</div>
                        <div className="text-xs text-muted-foreground">{overdueLabel(l.expected_return_date)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          </header>
          <motion.main
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 px-4 py-6 md:px-6"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </SearchCtx.Provider>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
