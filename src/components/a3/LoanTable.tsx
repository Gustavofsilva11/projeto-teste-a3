import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Pencil, Trash2, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, loanStatus, type Certificate, type Loan } from "@/lib/a3";
import { StatusBadge } from "./StatusBadge";
import { EditLoanDialog, ReturnDialog } from "./Dialogs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function LoanTable({ loans, certs, compact }: { loans: Loan[]; certs: Certificate[]; compact?: boolean }) {
  const qc = useQueryClient();
  const [ret, setRet] = useState<Loan | null>(null);
  const [edit, setEdit] = useState<Loan | null>(null);
  const [view, setView] = useState<Loan | null>(null);
  const [del, setDel] = useState<Loan | null>(null);
  const certName = (id: string) => certs.find((c) => c.id === id)?.name ?? "—";

  async function remove() {
    if (!del) return;
    const { error } = await supabase.from("loans").delete().eq("id", del.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Registro excluído");
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["certificates"] });
    setDel(null);
  }

  const iconBtn = "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Certificado</th>
              <th className="py-2 pr-3 font-medium">Funcionário</th>
              <th className="py-2 pr-3 font-medium">Setor</th>
              <th className="py-2 pr-3 font-medium">Motivo</th>
              <th className="py-2 pr-3 font-medium">Retirada</th>
              <th className="py-2 pr-3 font-medium">Previsão</th>
              {!compact && <th className="py-2 pr-3 font-medium">Devolução</th>}
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {loans.map((l) => {
                const st = loanStatus(l);
                return (
                  <motion.tr
                    key={l.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`border-b border-border/60 transition-colors hover:bg-accent/40 ${st === "atrasado" ? "bg-destructive/5" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">{certName(l.certificate_id)}</td>
                    <td className="py-2.5 pr-3">{l.employee_name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{l.department}</td>
                    <td className="max-w-[200px] truncate py-2.5 pr-3 text-muted-foreground">{l.purpose}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmtDateTime(l.checkout_date)}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmtDateTime(l.expected_return_date)}</td>
                    {!compact && <td className="py-2.5 pr-3 whitespace-nowrap">{fmtDateTime(l.actual_return_date)}</td>}
                    <td className="py-2.5 pr-3"><StatusBadge status={st} /></td>
                    <td className="py-2.5">
                      <div className="flex gap-0.5">
                        <button aria-label="Ver" className={iconBtn} onClick={() => setView(l)}><Eye className="size-4" /></button>
                        <button aria-label="Editar" className={iconBtn} onClick={() => setEdit(l)}><Pencil className="size-4" /></button>
                        {st !== "devolvido" && (
                          <button aria-label="Registrar devolução" className={iconBtn} onClick={() => setRet(l)}><Undo2 className="size-4" /></button>
                        )}
                        <button aria-label="Excluir" className={iconBtn} onClick={() => setDel(l)}><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {loans.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>}
      </div>

      <ReturnDialog loan={ret} open={!!ret} onOpenChange={(o) => !o && setRet(null)} />
      <EditLoanDialog loan={edit} open={!!edit} onOpenChange={(o) => !o && setEdit(null)} />
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do empréstimo</DialogTitle></DialogHeader>
          {view && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Certificado", certName(view.certificate_id)],
                ["Funcionário", view.employee_name],
                ["Setor", view.department],
                ["Motivo", view.purpose],
                ["Retirada", fmtDateTime(view.checkout_date)],
                ["Previsão", fmtDateTime(view.expected_return_date)],
                ["Devolução", fmtDateTime(view.actual_return_date)],
                ["Observações", view.notes || "—"],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
