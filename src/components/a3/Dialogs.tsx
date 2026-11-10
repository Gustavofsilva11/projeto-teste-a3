import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canLoan, certificatesQuery, loansQuery, toLocalInput, type Certificate, type Loan } from "@/lib/a3";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function refresh(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["loans"] });
  qc.invalidateQueries({ queryKey: ["certificates"] });
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
    if (error) return toast.error(error.message);
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
  const certs = useQuery(certificatesQuery);
  const loans = useQuery(loansQuery);
  const now = new Date();
  const [f, setF] = useState({
    certificate_id: loan?.certificate_id ?? "",
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
    if (!f.certificate_id) return toast.error("Selecione um certificado");
    if (new Date(f.expected) <= new Date(f.checkout)) return toast.error("A previsão de devolução deve ser depois da retirada");
    setBusy(true);
    const payload = {
      certificate_id: f.certificate_id,
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
    if (error) return toast.error(error.message);
    toast.success(loan ? "Empréstimo atualizado" : "Empréstimo registrado — certificado agora Em uso");
    refresh(qc);
    onDone?.();
    if (!loan) setF((p) => ({ ...p, certificate_id: "", employee_name: "", department: "", purpose: "", notes: "" }));
  }

  const list = certs.data ?? [];
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Certificado</Label>
        <Select value={f.certificate_id} onValueChange={set("certificate_id")} disabled={!!loan}>
          <SelectTrigger><SelectValue placeholder="Selecione o certificado" /></SelectTrigger>
          <SelectContent>
            {list.map((c: Certificate) => {
              const ok = canLoan(c, loans.data ?? []) || c.id === loan?.certificate_id;
              return (
                <SelectItem key={c.id} value={c.id} disabled={!ok}>
                  {c.name} {ok ? "" : "· indisponível"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
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

export function CertificateDialog({ cert, open, onOpenChange }: { cert: Certificate | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", serial_number: "", type: "e-CNPJ A3", notes: "", inativo: false });
  useEffect(() => {
    if (open)
      setF({
        name: cert?.name ?? "",
        serial_number: cert?.serial_number ?? "",
        type: cert?.type ?? "e-CNPJ A3",
        notes: cert?.notes ?? "",
        inativo: cert?.status === "inativo",
      });
  }, [open, cert]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: f.name.trim(),
      serial_number: f.serial_number.trim(),
      type: f.type.trim(),
      notes: f.notes.trim() || null,
      status: f.inativo ? "inativo" : cert?.status === "em_uso" ? "em_uso" : "disponivel",
    };
    const { error } = cert
      ? await supabase.from("certificates").update(payload).eq("id", cert.id)
      : await supabase.from("certificates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(cert ? "Certificado atualizado" : "Certificado cadastrado");
    refresh(qc);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cert ? "Editar certificado" : "Novo certificado"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="cn">Nome</Label><Input id="cn" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="cs">Número de série</Label><Input id="cs" maxLength={60} value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="ct">Tipo</Label><Input id="ct" maxLength={60} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="cno">Observações</Label><Textarea id="cno" maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.inativo} onChange={(e) => setF({ ...f, inativo: e.target.checked })} className="accent-primary" />
            Marcar como inativo
          </label>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
