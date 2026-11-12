import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/a3/AppShell";
import { LoanForm } from "@/components/a3/Dialogs";
import { pageHead } from "@/components/a3/meta";

export const Route = createFileRoute("/emprestimos")({
  head: pageHead("Novo Empréstimo", "Registre quem está retirando o A3 compartilhado."),
  component: () => (
    <AppShell>
      <PageHeader title="Novo Empréstimo" subtitle="Retirada do A3 compartilhado." />
      <div className="glass-card max-w-3xl p-6"><LoanForm /></div>
    </AppShell>
  ),
});
