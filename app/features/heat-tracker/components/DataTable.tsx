type DataTableProps<T extends object> = {
  rows: T[];
};

export function DataTable<T extends object>({ rows }: DataTableProps<T>) {
  const headers = rows.length ? Object.keys(rows[0]) : [];

  if (!rows.length) {
    return <p className="text-sm text-(--ink-soft)">No data to display.</p>;
  }

  return (
    <div className="mt-4 overflow-auto rounded-xl border border-(--line)">
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead className="mono bg-[#f5efe0] text-xs uppercase text-(--ink-soft)">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-(--line) px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-[#fffcf4]">
              {headers.map((header) => (
                <td key={header} className="border-b border-(--line) px-3 py-2 align-top">
                  {String((row as Record<string, unknown>)[header] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
