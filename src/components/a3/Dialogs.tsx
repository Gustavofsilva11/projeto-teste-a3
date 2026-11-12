import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canLoan, currentLoan, loanError, loansQuery, toLocalInput, type Loan } from "@/lib/a3";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function refresh(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["loans"] });
}

export function ReturnDialog({ loan, open, onOpenChange }: { loan: Loan | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDate(toLocalInput(new Date()));
      setNotes(loan?.notes ?? "");
    }
  }, [open, loan]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!loan) return;
    setBusy(true);
    const { error } = await supabase
      .from("loans")
      .update({ actual_return_date: new Date(date).toISOString(), notes: notes || null })
      .eq("id", loan.id);
    setBusy(false);
    if (error) { toast.error(loanError(error)); return; }
    toast.success("Devolução registrada");
    refresh(qc);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Devolução</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {loan?.employee_name} · {loan?.purpose}
          </p>
          <div className="space-y-2">
            <Label htmlFor="ret-date">Data/hora da devolução</Label>
            <Input id="ret-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ret-notes">Observações</Label>
            <Textarea id="ret-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>Confirmar devolução</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LoanForm({ loan, onDone }: { loan?: Loan | null; onDone?: () => void }) {
  const qc = useQueryClient();
  const loans = useQuery(loansQuery);
  const [returnOpen, setReturnOpen] = useState(false);
  const now = new Date();
  const [f, setF] = useState({
    employee_name: loan?.employee_name ?? "",
    department: loan?.department ?? "",
    purpose: loan?.purpose ?? "",
    checkout: toLocalInput(loan ? new Date(loan.checkout_date) : now),
    expected: toLocalInput(loan ? new Date(loan.expected_return_date) : new Date(now.getTime() + 4 * 3600_000)),
    notes: loan?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!loan && (loans.isPending || loans.isError || !canLoan(loans.data ?? []))) { toast.error("O A3 não está disponível para retirada."); return; }
    if (new Date(f.expected) <= new Date(f.checkout)) { toast.error("A previsão de devolução deve ser depois da retirada"); return; }
    setBusy(true);
    const payload = {
      employee_name: f.employee_name.trim(),
      department: f.department.trim(),
      purpose: f.purpose.trim(),
      checkout_date: new Date(f.checkout).toISOString(),
      expected_return_date: new Date(f.expected).toISOString(),
      notes: f.notes.trim() || null,
    };
    const { error } = loan
      ? await supabase.from("loans").update(payload).eq("id", loan.id)
      : await supabase.from("loans").insert(payload);
    setBusy(false);
    if (error) { toast.error(loanError(error)); return; }
    toast.success(loan ? "Empréstimo atualizado" : "Empréstimo registrado — A3 em uso");
    refresh(qc);
    onDone?.();
    if (!loan) setF((p) => ({ ...p, employee_name: "", department: "", purpose: "", notes: "" }));
  }

  const active = currentLoan(loans.data ?? []);
  if (!loan && loans.isPending) return <p className="text-muted-foreground">Consultando situação do A3…</p>;
  if (!loan && loans.isError) return <p role="alert" className="text-destructive">Não foi possível consultar a situação do A3.</p>;
  if (!loan && active) return <div className="space-y-3"><p className="font-medium">A3 atualmente com {active.employee_name}</p><p className="text-sm text-muted-foreground">{active.department} · {active.purpose}</p><ReturnDialog loan={active} open={returnOpen} onOpenChange={setReturnOpen} /><Button onClick={() => setReturnOpen(true)}>Registrar devolução</Button></div>;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="emp">Funcionário</Label>
        <Input id="emp" required maxLength={120} value={f.employee_name} onChange={(e) => set("employee_name")(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dep">Setor</Label>
        <Input id="dep" required maxLength={80} value={f.department} onChange={(e) => set("department")(e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="pur">Motivo</Label>
        <Input id="pur" required maxLength={200} value={f.purpose} onChange={(e) => set("purpose")(e.target.value)} placeholder="Ex.: Acesso ao e-CAC" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="co">Retirada</Label>
        <Input id="co" type="datetime-local" required value={f.checkout} onChange={(e) => set("checkout")(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ex">Previsão de devolução</Label>
        <Input id="ex" type="datetime-local" required value={f.expected} onChange={(e) => set("expected")(e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="nt">Observações</Label>
        <Textarea id="nt" maxLength={1000} value={f.notes} onChange={(e) => set("notes")(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {loan ? "Salvar alterações" : "Registrar empréstimo"}
        </Button>
      </div>
    </form>
  );
}

export function EditLoanDialog({ loan, open, onOpenChange }: { loan: Loan | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Editar empréstimo</DialogTitle></DialogHeader>
        {loan && <LoanForm key={loan.id} loan={loan} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
