import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { loanStatus, type Loan } from "@/lib/a3";

const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function UsageCalendar({ loans, onSelect, selected }: { loans: Loan[]; onSelect?: (d: Date) => void; selected?: Date | null }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const marks = useMemo(() => {
    const m = new Map<string, Set<"loan" | "return" | "late">>();
    const add = (iso: string | null, t: "loan" | "return" | "late") => {
      if (!iso) return;
      const k = key(new Date(iso));
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(t);
    };
    for (const l of loans) {
      add(l.checkout_date, "loan");
      add(l.actual_return_date, "return");
      if (loanStatus(l) === "atrasado") add(l.expected_return_date, "late");
      else if (l.actual_return_date && new Date(l.actual_return_date) > new Date(l.expected_return_date)) add(l.actual_return_date, "late");
    }
    return m;
  }, [loans]);

  const start = new Date(cursor);
  start.setDate(1 - ((cursor.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const today = key(new Date());
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm capitalize text-muted-foreground">{monthLabel}</span>
        <div className="flex gap-1">
          <button aria-label="Mês anterior" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-md p-1.5 hover:bg-accent"><ChevronLeft className="size-4" /></button>
          <button aria-label="Próximo mês" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-md p-1.5 hover:bg-accent"><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEK.map((w) => <div key={w} className="py-2">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
        {days.map((d) => {
          const k = key(d);
          const set = marks.get(k);
          const out = d.getMonth() !== cursor.getMonth();
          const isSel = selected && key(selected) === k;
          return (
            <button
              key={k}
              onClick={() => onSelect?.(d)}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-1 border-b border-r border-border text-sm transition-colors hover:bg-accent",
                out && "text-muted-foreground/50",
                isSel && "bg-accent",
              )}
            >
              <span className={cn("grid size-7 place-items-center rounded-full", k === today && "bg-primary text-primary-foreground font-semibold")}>{d.getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {set?.has("loan") && <span className="size-1.5 rounded-full bg-info" />}
                {set?.has("return") && <span className="size-1.5 rounded-full bg-success" />}
                {set?.has("late") && <span className="size-1.5 rounded-full bg-destructive" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" />Empréstimo</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" />Devolvido</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" />Atrasado</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full ring-1 ring-primary" />Hoje</span>
      </div>
    </div>
  );
}
