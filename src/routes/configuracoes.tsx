import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/a3/AppShell";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/configuracoes")({
  head: pageHead("Configurações", "Preferências da conta e do sistema A3 Guardian."),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid max-w-3xl gap-4">
        <div className="glass-card p-6">
          <h2 className="font-semibold">Conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          <Button variant="outline" className="mt-4" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
        <div className="glass-card p-6">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mt-1 text-sm text-muted-foreground">Alertas visuais de atraso estão ativos no painel e no sino. Microsoft Teams e e-mail chegam em uma próxima versão.</p>
        </div>
      </div>
    </>
  );
}
