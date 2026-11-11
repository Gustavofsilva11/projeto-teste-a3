import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/a3/AppShell";
import { UsageCalendar } from "@/components/a3/UsageCalendar";
import { LoanTable } from "@/components/a3/LoanTable";
import { pageHead } from "@/components/a3/meta";
import { certificatesQuery, loansQuery } from "@/lib/a3";

export const Route = createFileRoute("/calendario")({
  head: pageHead("Calendário", "Calendário mensal de retiradas, devoluções e atrasos dos certificados A3."),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const certs = useQuery(certificatesQuery);
  const loans = useQuery(loansQuery);
  const [day, setDay] = useState<Date | null>(new Date());
  const L = loans.data ?? [];
  const same = (iso: string | null) => !!iso && !!day && new Date(iso).toDateString() === day.toDateString();
  const rows = L.filter((l) => same(l.checkout_date) || same(l.actual_return_date) || same(l.expected_return_date));
  return (
    <>
      <PageHeader title="Calendário" subtitle="Clique em um dia para ver os movimentos." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="glass-card p-5"><UsageCalendar loans={L} selected={day} onSelect={setDay} /></div>
        <div className="glass-card p-5">
          <h2 className="mb-3 font-semibold">{day?.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</h2>
          <LoanTable loans={rows} certs={certs.data ?? []} compact />
        </div>
      </div>
    </>
  );
}
