export type Row = Record<string, string | number>;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function exportXlsx(rows: Row[], name: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export function exportCsv(rows: Row[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
  download(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
}

/** Opens a printable table; the browser's "Salvar como PDF" produces the file. */
export function exportPdf(rows: Row[], title: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f1f5f9}</style></head><body><h2>${esc(title)}</h2><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
