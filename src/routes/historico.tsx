import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { AppShell, PageHeader, useGlobalSearch } from "@/components/a3/AppShell";
import { LoanTable } from "@/components/a3/LoanTable";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUS_LABEL, certificatesQuery, fmtDateTime, loanStatus, loansQuery } from "@/lib/a3";
import { matchLoan } from "@/lib/match";
import { exportCsv, exportPdf, exportXlsx } from "@/lib/export";

export const Route = createFileRoute("/historico")({
  head: pageHead("Histórico", "Trilha completa de empréstimos e devoluções dos certificados A3."),
  component: () => (<AppShell><Page /></AppShell>),
});

const sel = "h-10 rounded-md border border-input bg-surface/60 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Page() {
  const certs = useQuery(certificatesQuery);
  const loans = useQuery(loansQuery);
  const q = useGlobalSearch();
  const C = certs.data ?? [], L = loans.data ?? [];
  const [f, setF] = useState({ emp: "", dep: "", cert: "", status: "", from: "", to: "" });
  const emps = [...new Set(L.map((l) => l.employee_name))].sort();
  const deps = [...new Set(L.map((l) => l.department).filter(Boolean))].sort();
  const rows = L.filter((l) =>
    matchLoan(l, q, C) &&
    (!f.emp || l.employee_name === f.emp) && (!f.dep || l.department === f.dep) &&
    (!f.cert || l.certificate_id === f.cert) && (!f.status || loanStatus(l) === f.status) &&
    (!f.from || new Date(l.checkout_date) >= new Date(f.from)) &&
    (!f.to || new Date(l.checkout_date) <= new Date(f.to + "T23:59:59")));
  const data = rows.map((l) => ({
    Certificado: C.find((c) => c.id === l.certificate_id)?.name ?? "", Funcionário: l.employee_name, Setor: l.department, Motivo: l.purpose,
    Retirada: fmtDateTime(l.checkout_date), Previsão: fmtDateTime(l.expected_return_date), Devolução: fmtDateTime(l.actual_return_date), Status: STATUS_LABEL[loanStatus(l)],
  }));
  return (
    <>
      <PageHeader title="Histórico" subtitle={`${rows.length} registro(s)`} actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="size-4" />Exportar</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportXlsx(data, "historico-a3")}>Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportCsv(data, "historico-a3")}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdf(data, "Histórico A3 Guardian")}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>} />
      <div className="glass-card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <select aria-label="Funcionário" className={sel} value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value })}><option value="">Todos os funcionários</option>{emps.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Setor" className={sel} value={f.dep} onChange={(e) => setF({ ...f, dep: e.target.value })}><option value="">Todos os setores</option>{deps.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Certificado" className={sel} value={f.cert} onChange={(e) => setF({ ...f, cert: e.target.value })}><option value="">Todos os certificados</option>{C.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Status" className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Todos os status</option><option value="em_uso">Em uso</option><option value="atrasado">Atrasado</option><option value="devolvido">Devolvido</option></select>
        <Input aria-label="De" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <Input aria-label="Até" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </div>
      <div className="glass-card p-5"><LoanTable loans={rows} certs={C} /></div>
    </>
  );
}
