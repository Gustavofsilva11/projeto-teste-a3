import { STATUS_LABEL, loanStatus, type Loan } from "./a3";
export function matchLoan(l: Loan, q: string) {
  if (!q.trim()) return true;
  const hay = [l.employee_name, l.department, l.purpose, STATUS_LABEL[loanStatus(l)], new Date(l.checkout_date).toLocaleDateString("pt-BR")].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
}
