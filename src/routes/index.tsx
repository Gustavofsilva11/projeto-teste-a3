import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, Undo2, Usb } from "lucide-react";
import { AppShell, useGlobalSearch } from "@/components/a3/AppShell";
import { StatusBadge } from "@/components/a3/StatusBadge";
import { ReturnDialog } from "@/components/a3/Dialogs";
import { LoanTable } from "@/components/a3/LoanTable";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { a3Status, currentLoan, fmtDateTime, loansQuery, remainingLabel, type Loan } from "@/lib/a3";
import { matchLoan } from "@/lib/match";

export const Route = createFileRoute("/")({
  head: pageHead("Quem está com o A3?", "Responsável atual, situação e prazo de devolução do único A3 compartilhado."),
  component: () => <AppShell><Dashboard /></AppShell>,
});

function Dashboard() {
  const loans = useQuery(loansQuery);
  const q = useGlobalSearch();
  const [ret, setRet] = useState<Loan | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  if (loans.isPending) return <Skeleton className="h-80 w-full" />;
  if (loans.isError) return <p role="alert" className="text-destructive">Não foi possível consultar quem está com o A3.</p>;
  const L = loans.data;
  const active = currentLoan(L);
  const status = a3Status(L, now);
  const tone = status === "atrasado" ? "text-destructive" : status === "em_uso" ? "text-info" : "text-success";
  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Quem está com o A3?</h1>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-start gap-5">
          <div className={`grid size-16 shrink-0 place-items-center rounded-lg border border-current ${tone}`}><Usb className="size-8" /></div>
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">A3 compartilhado · Responsável atual</div>
            <h2 className="mt-1 break-words text-3xl font-semibold">{active?.employee_name ?? "Disponível"}</h2>
            <p className="mt-2 text-muted-foreground">{active?.department ?? "Nenhum funcionário está com o A3."}</p>
          </div>
        </div>
        <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Motivo" value={active?.purpose ?? "—"} />
          <Info label="Retirado em" value={fmtDateTime(active?.checkout_date)} />
          <Info label="Previsão de devolução" value={fmtDateTime(active?.expected_return_date)} />
          <div><dt className="text-xs text-muted-foreground">{status === "atrasado" ? "Tempo de atraso" : "Tempo restante"}</dt><dd className={`mt-2 flex items-start gap-2 font-medium ${tone}`}><Clock className="mt-0.5 size-4 shrink-0" />{active ? remainingLabel(active.expected_return_date, now) : "Pronto para retirada"}</dd></div>
        </dl>
        <div className="mt-7">
          {active ? <Button size="lg" onClick={() => setRet(active)}><Undo2 className="size-4" />Registrar devolução</Button> : <Button size="lg" asChild><Link to="/emprestimos">Novo empréstimo</Link></Button>}
        </div>
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Últimos empréstimos</h2><Link to="/historico" className="text-sm text-primary hover:underline">Ver histórico</Link></div>
        <LoanTable loans={L.filter((l) => matchLoan(l, q)).slice(0, 6)} compact />
      </section>
      <ReturnDialog loan={ret} open={!!ret} onOpenChange={(open) => !open && setRet(null)} />
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words font-medium">{value}</dd></div>;
}
