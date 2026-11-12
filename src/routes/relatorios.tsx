import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { AppShell, PageHeader } from "@/components/a3/AppShell";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { durationLabel, loanStatus, loansQuery, type Loan } from "@/lib/a3";
import { exportCsv, exportPdf, exportXlsx } from "@/lib/export";

export const Route = createFileRoute("/relatorios")({
  head: pageHead("Relatórios", "Métricas de uso e desempenho do A3 compartilhado."),
  component: () => (<AppShell><Page /></AppShell>),
});

const count = (L: Loan[], k: (l: Loan) => string) => {
  const m = new Map<string, number>();
  L.forEach((l) => m.set(k(l), (m.get(k(l)) ?? 0) + 1));
  return [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
};

function Chart({ title, data, color }: { title: string; data: { name: string; total: number }[]; color: string }) {
  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data.slice(0, 8)}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={24} />
            <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="total" fill={color} radius={[6, 6, 0, 0]} name="Empréstimos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Page() {
  const loans = useQuery(loansQuery);
  const L = loans.data ?? [];
  const byMonth = count([...L].reverse(), (l) => new Date(l.checkout_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })).sort(() => 0);
  const byEmp = count(L, (l) => l.employee_name);
  const byDep = count(L, (l) => l.department || "—");
  const done = L.filter((l) => l.actual_return_date);
  const avg = done.length ? done.reduce((s, l) => s + (+new Date(l.actual_return_date ?? l.checkout_date) - +new Date(l.checkout_date)), 0) / done.length : 0;
  const lateCount = L.filter((l) => loanStatus(l) === "atrasado" || (l.actual_return_date && new Date(l.actual_return_date) > new Date(l.expected_return_date))).length;
  const rate = L.length ? Math.round((lateCount / L.length) * 100) : 0;
  const summary = [
    ...byEmp.map((r) => ({ Grupo: "Funcionário", Nome: r.name, Empréstimos: r.total })),
    ...byDep.map((r) => ({ Grupo: "Setor", Nome: r.name, Empréstimos: r.total })),
  ];
  const metric = (label: string, value: string) => (
    <div className="glass-card p-5"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>
  );
  return (
    <>
      <PageHeader title="Relatórios" actions={<div className="flex gap-2">
        <Button variant="outline" onClick={() => exportXlsx(summary, "relatorio-a3")}><Download className="size-4" />Excel</Button>
        <Button variant="outline" onClick={() => exportCsv(summary, "relatorio-a3")}>CSV</Button>
        <Button variant="outline" onClick={() => exportPdf(summary, "Relatório A3 Guardian")}>PDF</Button>
      </div>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metric("Tempo médio de empréstimo", durationLabel(avg))}
        {metric("Taxa de atraso", `${rate}%`)}
        {metric("Usuário mais ativo", byEmp[0]?.name ?? "—")}
        {metric("Empréstimos registrados", String(L.length))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Empréstimos por mês" data={byMonth} color="var(--primary)" />
        <Chart title="Empréstimos por funcionário" data={byEmp} color="var(--violet)" />
        <Chart title="Empréstimos por setor" data={byDep} color="var(--success)" />
      </div>
    </>
  );
}
