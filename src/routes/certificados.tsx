import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, useGlobalSearch } from "@/components/a3/AppShell";
import { CertificateDialog } from "@/components/a3/Dialogs";
import { StatusBadge } from "@/components/a3/StatusBadge";
import { pageHead } from "@/components/a3/meta";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, activeLoanFor, certStatus, certificatesQuery, fmtDateTime, loansQuery, type Certificate } from "@/lib/a3";

export const Route = createFileRoute("/certificados")({
  head: pageHead("Certificados", "Cadastro e situação de todos os certificados digitais A3."),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const qc = useQueryClient();
  const certs = useQuery(certificatesQuery);
  const loans = useQuery(loansQuery);
  const q = useGlobalSearch().toLowerCase();
  const [edit, setEdit] = useState<Certificate | null>(null);
  const [open, setOpen] = useState(false);
  const L = loans.data ?? [];
  const rows = (certs.data ?? []).filter((c) => {
    const a = activeLoanFor(c.id, L);
    return !q || [c.name, c.serial_number, c.type, a?.employee_name, STATUS_LABEL[certStatus(c, L)]].join(" ").toLowerCase().includes(q);
  });
  async function del(c: Certificate) {
    if (!confirm(`Excluir ${c.name} e todo o seu histórico?`)) return;
    const { error } = await supabase.from("certificates").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Certificado excluído");
    qc.invalidateQueries({ queryKey: ["certificates"] }); qc.invalidateQueries({ queryKey: ["loans"] });
  }
  return (
    <>
      <PageHeader title="Certificados" subtitle={`${rows.length} certificado(s)`} actions={<Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="size-4" />Novo certificado</Button>} />
      <div className="glass-card overflow-x-auto p-5">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
            {["Nome", "Nº de série", "Tipo", "Status", "Usuário atual", "Último uso", "Ações"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((c) => {
              const a = activeLoanFor(c.id, L);
              const last = L.find((l) => l.certificate_id === c.id);
              return (
                <tr key={c.id} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{c.serial_number}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{c.type}</td>
                  <td className="py-2.5 pr-3"><StatusBadge status={certStatus(c, L)} /></td>
                  <td className="py-2.5 pr-3">{a?.employee_name ?? "—"}</td>
                  <td className="py-2.5 pr-3">{fmtDateTime(last?.checkout_date)}</td>
                  <td className="py-2.5"><div className="flex gap-1">
                    <button aria-label="Editar" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => { setEdit(c); setOpen(true); }}><Pencil className="size-4" /></button>
                    <button aria-label="Excluir" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => del(c)}><Trash2 className="size-4" /></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <CertificateDialog cert={edit} open={open} onOpenChange={setOpen} />
    </>
  );
}
