import { STATUS_LABEL, loanStatus, type Certificate, type Loan } from "./a3";
export function matchLoan(l: Loan, q: string, certs: Certificate[]) {
  if (!q.trim()) return true;
  const cert = certs.find((c) => c.id === l.certificate_id)?.name ?? "";
  const hay = [l.employee_name, l.department, l.purpose, cert, STATUS_LABEL[loanStatus(l)], new Date(l.checkout_date).toLocaleDateString("pt-BR")].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
}
