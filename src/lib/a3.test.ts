import { describe, expect, it } from "vitest";
import { a3Status, canLoan, currentLoan, loanStatus, remainingLabel, type Loan } from "./a3";
const now = new Date("2026-11-10T12:00:00Z");
const loan = (p: Partial<Loan> = {}) => ({ id: "l1", employee_name: "Mariana Silva", actual_return_date: null, expected_return_date: "2026-11-10T15:00:00Z", ...p }) as Loan;
describe("único A3 compartilhado", () => {
  it("sem empréstimo aberto o A3 está disponível", () => {
    expect(a3Status([], now)).toBe("disponivel");
    expect(canLoan([])).toBe(true);
  });
  it("qualquer empréstimo aberto impede outra retirada", () => {
    expect(canLoan([loan()])).toBe(false);
    expect(a3Status([loan()], now)).toBe("em_uso");
  });
  it("identifica Mariana como responsável atual sem catálogo", () => {
    expect(currentLoan([loan({ actual_return_date: "2026-11-10T10:00:00Z" }), loan({ id: "l2" })])?.employee_name).toBe("Mariana Silva");
    expect(currentLoan([loan({ actual_return_date: "2026-11-10T10:00:00Z" })])).toBeUndefined();
  });
  it("deriva atraso quando o prazo passou", () => {
    expect(a3Status([loan({ expected_return_date: "2026-11-10T11:00:00Z" })], now)).toBe("atrasado");
    expect(remainingLabel("2026-11-10T11:00:00Z", now)).toBe("Atrasado há 1 hora");
  });
  it("exibe tempo restante antes do prazo", () => {
    expect(remainingLabel("2026-11-10T15:00:00Z", now)).toBe("Restam 3h 00min");
  });
  it("uma devolução libera o A3 mesmo quando ocorreu atrasada", () => {
    const returned = loan({ expected_return_date: "2026-11-10T11:00:00Z", actual_return_date: "2026-11-10T11:30:00Z" });
    expect(loanStatus(returned, now)).toBe("devolvido");
    expect(canLoan([returned])).toBe(true);
    expect(a3Status([returned], now)).toBe("disponivel");
  });
});
