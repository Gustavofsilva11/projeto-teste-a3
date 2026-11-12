import { useEffect } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";


export type Loan = Omit<Database["public"]["Tables"]["loans"]["Row"], "certificate_id">;

/** Display status of a loan: overdue is derived, never stored. */
export type LoanDisplayStatus = "em_uso" | "atrasado" | "devolvido";
export type CertDisplayStatus = "disponivel" | "em_uso" | "atrasado";

export function loanStatus(loan: Pick<Loan, "actual_return_date" | "expected_return_date">, now = new Date()): LoanDisplayStatus {
  if (loan.actual_return_date) return "devolvido";
  return new Date(loan.expected_return_date).getTime() < now.getTime() ? "atrasado" : "em_uso";
}

export function currentLoan(loans: Loan[]) {
  return loans.find((l) => !l.actual_return_date);
}

export function a3Status(loans: Loan[], now = new Date()): CertDisplayStatus {
  const active = currentLoan(loans);
  return active ? loanStatus(active, now) === "atrasado" ? "atrasado" : "em_uso" : "disponivel";
}

export function canLoan(loans: Loan[]) {
  return !currentLoan(loans);
}

export function remainingLabel(expected: string, now = new Date()) {
  const ms = new Date(expected).getTime() - now.getTime();
  return ms < 0 ? overdueLabel(expected, now) : `Restam ${durationLabel(ms)}`;
}

export function loanError(error: { code?: string; message: string }) {
  return error.code === "23505" ? "O A3 já está em uso. Registre a devolução antes de um novo empréstimo." : error.message;
}

export function overdueLabel(expected: string, now = new Date()) {
  const diffMs = now.getTime() - new Date(expected).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return `Atrasado há ${Math.max(1, Math.floor(diffMs / 60_000))} min`;
  if (h < 24) return `Atrasado há ${h} hora${h > 1 ? "s" : ""}`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Atrasado desde ontem" : `Atrasado há ${d} dias`;
}

export const STATUS_LABEL: Record<CertDisplayStatus | LoanDisplayStatus, string> = {
  disponivel: "Disponível",
  em_uso: "Em Uso",
  atrasado: "Atrasado",
  devolvido: "Devolvido",
};

export const loansQuery = queryOptions({
  queryKey: ["loans"],
  queryFn: async () => {
    const { data, error } = await supabase.from("loans").select("id, employee_name, department, purpose, notes, checkout_date, expected_return_date, actual_return_date, status, created_at, updated_at").order("checkout_date", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`a3-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, () => {
        qc.invalidateQueries({ queryKey: ["loans"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";
export const fmtTime = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
export const fmtDateTime = (d?: string | null) => (d ? `${fmtDate(d)} ${fmtTime(d)}` : "—");

export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function durationLabel(ms: number) {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}min` : `${m}min`;
}
