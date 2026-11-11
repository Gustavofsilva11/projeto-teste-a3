import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, FileText, KeyRound, TrendingUp, Undo2, Usb } from "lucide-react";
import { AppShell, useGlobalSearch } from "@/components/a3/AppShell";
import { StatusBadge } from "@/components/a3/StatusBadge";
import { ReturnDialog } from "@/components/a3/Dialogs";
import { UsageCalendar } from "@/components/a3/UsageCalendar";
import { LoanTable } from "@/components/a3/LoanTable";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activeLoanFor, certStatus, certificatesQuery, fmtDate, fmtTime, loanStatus, loansQuery, overdueLabel, type Loan } from "@/lib/a3";
import { matchLoan } from "@/lib/match";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: pageHead("Painel", "Situação atual dos certificados digitais A3: disponíveis, em uso e atrasados."),
  component: () => (<AppShell><Dashboard /></AppShell>),
});

function Kpi({ icon: Icon, value, label, tone, trend, i }: { icon: typeof Clock; value: string | number; label: string; tone: string; trend?: string; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}
      className={`glass-card p-5 transition-colors ${tone}`}>
      <div className="flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-current/10"><Icon className="size-5" /></div>
        {trend && <span className="flex items-center gap-1 text-xs"><TrendingUp className="size-3" />{trend}</span>}
      </div>
      <div className="mt-4 text-3xl font-semibold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function Dashboard() {
  const certs = useQuery(certificatesQuery);
  const loans = useQuery(loansQuery);
  const { user } = useAuth();
  const q = useGlobalSearch();
  const [ret, setRet] = useState<Loan | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);

  const C = certs.data ?? [], L = loans.data ?? [];
  const stats = useMemo(() => {
    const st = C.map((c) => certStatus(c, L, now));
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = L.filter((l) => new Date(l.checkout_date) >= m).length;
    const prev = L.filter((l) => { const d = new Date(l.checkout_date); return d >= pm && d < m; }).length;
    return {
      avail: st.filter((s) => s === "disponivel").length,
      inUse: st.filter((s) => s === "em_uso").length,
      late: st.filter((s) => s === "atrasado").length,
      month, trend: prev ? `${Math.round(((month - prev) / prev) * 100)}%` : undefined,
    };
  }, [C, L, now]);

  if (certs.isLoading || loans.isLoading) return <div className="grid gap-4 md:grid-cols-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>;

  const overdue = L.filter((l) => loanStatus(l, now) === "atrasado");
  const featured = C.find((c) => certStatus(c, L, now) === "atrasado") ?? C.find((c) => certStatus(c, L, now) === "em_uso") ?? C[0];
  const fLoan = featured ? activeLoanFor(featured.id, L) : undefined;
  const fStatus = featured ? certStatus(featured, L, now) : "disponivel";
  const first = ((user?.user_metadata?.full_name as string) || user?.email || "").split(/[ @]/)[0];
  const filtered = L.filter((l) => matchLoan(l, q, C));
  const certName = (id: string) => C.find((c) => c.id === id)?.name ?? "";
  const heroTone = fStatus === "atrasado" ? "text-destructive" : fStatus === "em_uso" ? "text-success" : "text-info";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {first || "bem-vindo"}!</h1>
          <p className="text-sm text-muted-foreground">Aqui está a situação atual dos seus certificados A3.</p>
        </div>
        <div className="text-right">
          <div className="text-sm capitalize text-muted-foreground">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtTime(now.toISOString())}</div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="space-y-2">
          {overdue.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <AlertTriangle className="size-4 text-destructive" />
              <span><b>{certName(l.certificate_id)}</b> com {l.employee_name} — {overdueLabel(l.expected_return_date, now)}</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRet(l)}>Registrar Devolução</Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {featured ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card p-6 ${fStatus === "atrasado" ? "ring-1 ring-destructive/40" : ""}`}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className={`grid size-32 shrink-0 place-items-center rounded-full border-2 border-current/40 bg-current/5 ${heroTone}`}>
                <Usb className="size-14" />
              </div>
              <div>
                <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${heroTone}`}><span className="size-2 rounded-full bg-current" />{featured.name}</div>
                <div className={`mt-1 text-4xl font-bold ${heroTone}`}>{fStatus === "disponivel" ? "DISPONÍVEL" : fStatus === "atrasado" ? "ATRASADO" : fStatus === "inativo" ? "INATIVO" : "EM USO"}</div>
                {fLoan ? (<>
                  <div className="mt-3 text-sm text-muted-foreground">Atualmente com</div>
                  <div className="text-xl font-semibold">{fLoan.employee_name}</div>
                  <div className="text-sm text-muted-foreground">{fLoan.department}</div>
                </>) : <p className="mt-3 text-sm text-muted-foreground">Pronto para ser retirado.</p>}
              </div>
            </div>
            {fLoan && (
              <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
                <Info icon={CalendarClock} label="Retirado em" value={fmtDate(fLoan.checkout_date)} sub={fmtTime(fLoan.checkout_date)} />
                <Info icon={Clock} label="Previsão de devolução" value={fmtDate(fLoan.expected_return_date)} sub={fmtTime(fLoan.expected_return_date)} />
                <Info icon={FileText} label="Motivo" value={fLoan.purpose} sub={fLoan.notes ?? ""} />
              </div>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {fLoan ? <Button size="lg" onClick={() => setRet(fLoan)}><Undo2 className="size-4" />Registrar Devolução</Button>
                : <Button size="lg" asChild><Link to="/emprestimos">Novo empréstimo</Link></Button>}
              <Button size="lg" variant="outline" asChild><Link to="/certificados">Ver certificados</Link></Button>
            </div>
          </motion.div>
        ) : (
          <div className="glass-card grid place-items-center p-10 text-center">
            <p className="text-muted-foreground">Nenhum certificado cadastrado.</p>
            <Button className="mt-4" asChild><Link to="/certificados">Cadastrar certificado</Link></Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Kpi i={0} icon={CheckCircle2} value={stats.avail} label="Disponíveis" tone="text-success" />
          <Kpi i={1} icon={KeyRound} value={stats.inUse} label="Em uso" tone="text-info" />
          <Kpi i={2} icon={AlertTriangle} value={stats.late} label="Atrasados" tone={`text-destructive ${stats.late ? "ring-1 ring-destructive/40" : ""}`} />
          <Kpi i={3} icon={TrendingUp} value={stats.month} label="Empréstimos no mês" tone="text-violet" trend={stats.trend} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Atividade recente</h2><Link to="/historico" className="text-sm text-primary hover:underline">Ver todos</Link></div>
          <Timeline loans={L} certName={certName} />
        </div>
        <div className="glass-card p-5">
          <h2 className="mb-2 font-semibold">Calendário de utilização</h2>
          <UsageCalendar loans={L} />
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Últimos empréstimos{q && ` · busca: "${q}"`}</h2><Link to="/historico" className="text-sm text-primary hover:underline">Ver todos</Link></div>
        <LoanTable loans={filtered.slice(0, 6)} certs={C} compact />
      </div>
      <ReturnDialog loan={ret} open={!!ret} onOpenChange={(o) => !o && setRet(null)} />
    </div>
  );
}

function Info({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value: string; sub: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
    </div>
  );
}

function Timeline({ loans, certName }: { loans: Loan[]; certName: (id: string) => string }) {
  const events = loans.flatMap((l) => {
    const st = loanStatus(l);
    const ev = [{ id: l.id + "o", at: l.checkout_date, text: `${l.employee_name} retirou ${certName(l.certificate_id)}`, sub: `Motivo: ${l.purpose}`, status: st === "devolvido" ? ("em_uso" as const) : st }];
    if (l.actual_return_date) ev.push({ id: l.id + "r", at: l.actual_return_date, text: `${l.employee_name} devolveu ${certName(l.certificate_id)}`, sub: l.department, status: "devolvido" as const });
    if (st === "atrasado") ev.push({ id: l.id + "a", at: l.expected_return_date, text: `${l.employee_name} está com certificado atrasado`, sub: overdueLabel(l.expected_return_date), status: "atrasado" as const });
    return ev;
  }).sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 6);
  if (!events.length) return <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>;
  const dot = { em_uso: "bg-info", devolvido: "bg-success", atrasado: "bg-destructive" };
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-background ${dot[e.status]}`} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="text-sm">{e.text}</div><div className="truncate text-xs text-muted-foreground">{fmtDate(e.at)} {fmtTime(e.at)} · {e.sub}</div></div>
            <StatusBadge status={e.status} />
          </div>
        </li>
      ))}
    </ol>
  );
}
