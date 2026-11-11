import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/a3/AppShell";
import { LoanForm } from "@/components/a3/Dialogs";
import { pageHead } from "@/components/a3/meta";

export const Route = createFileRoute("/emprestimos")({
  head: pageHead("Novo Empréstimo", "Registre a retirada de um certificado digital A3."),
  component: () => (
    <AppShell>
      <PageHeader title="Novo Empréstimo" subtitle="Somente certificados disponíveis podem ser emprestados." />
      <div className="glass-card max-w-3xl p-6"><LoanForm /></div>
    </AppShell>
  ),
});
