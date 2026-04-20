type DataTableProps<T extends object> = {
  rows: T[];
};

export function DataTable<T extends object>({ rows }: DataTableProps<T>) {
  const headers = rows.length ? Object.keys(rows[0]) : [];

  if (!rows.length) {
    return <p className="text-sm text-(--ink-soft)">No data to display.</p>;
  }

  return (
    <div className="mt-4 overflow-auto rounded-xl border border-[#9fbe9f] bg-[#f6fbf5] shadow-[0_10px_24px_-18px_rgba(15,27,36,0.45)]">
      <table className="min-w-full border-collapse bg-[#fbfef9] text-sm text-(--ink)">
        <thead className="mono bg-[#dbead6] text-xs uppercase text-[#23412f]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-[#9fbe9f] px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="odd:bg-[#fbfef9] even:bg-[#edf6ea] hover:bg-[#e2f0de]">
              {headers.map((header) => (
                <td key={header} className="border-b border-[#c9dcc4] px-3 py-2 align-top">
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
