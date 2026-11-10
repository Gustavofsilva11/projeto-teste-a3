import { describe, expect, it } from "vitest";
import { canLoan, certStatus, loanStatus, type Certificate, type Loan } from "./a3";

const now = new Date("2026-11-10T12:00:00Z");
const cert = { id: "c1", status: "disponivel" } as Certificate;
const loan = (p: Partial<Loan>) => ({ certificate_id: "c1", actual_return_date: null, expected_return_date: "2026-11-10T15:00:00Z", ...p }) as Loan;

describe("regras de empréstimo", () => {
  it("empréstimo é atrasado quando passou da previsão e não foi devolvido", () => {
    expect(loanStatus(loan({ expected_return_date: "2026-11-10T11:00:00Z" }), now)).toBe("atrasado");
  });
  it("empréstimo devolvido nunca é atrasado", () => {
    expect(loanStatus(loan({ expected_return_date: "2026-11-10T11:00:00Z", actual_return_date: "2026-11-10T11:30:00Z" }), now)).toBe("devolvido");
  });
  it("certificado em uso não pode ser emprestado", () => {
    expect(certStatus(cert, [loan({})], now)).toBe("em_uso");
    expect(canLoan(cert, [loan({})])).toBe(false);
  });
  it("certificado disponível pode ser emprestado", () => {
    expect(canLoan(cert, [loan({ actual_return_date: "2026-11-10T10:00:00Z" })])).toBe(true);
  });
  it("certificado inativo não pode ser emprestado", () => {
    expect(canLoan({ ...cert, status: "inativo" }, [])).toBe(false);
  });
});
