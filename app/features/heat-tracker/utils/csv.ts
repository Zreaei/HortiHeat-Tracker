export function toCsv<T extends object>(rows: T[]): string {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const val = String((row as Record<string, unknown>)[header] ?? "");
        const escaped = val.replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  return [headers.join(","), ...body].join("\n");
}

export function downloadCsv<T extends object>(rows: T[], fileName: string): void {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
