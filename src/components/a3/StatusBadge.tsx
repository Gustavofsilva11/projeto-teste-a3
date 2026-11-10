import { cn } from "@/lib/utils";
import { STATUS_LABEL, type CertDisplayStatus, type LoanDisplayStatus } from "@/lib/a3";

const styles: Record<CertDisplayStatus | LoanDisplayStatus, string> = {
  disponivel: "bg-success/15 text-success border-success/25",
  devolvido: "bg-success/15 text-success border-success/25",
  em_uso: "bg-info/15 text-info border-info/25",
  atrasado: "bg-destructive/15 text-destructive border-destructive/30",
  inativo: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: CertDisplayStatus | LoanDisplayStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", styles[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
