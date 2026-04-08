import type { RawRow } from "../types";
import { DataTable } from "./DataTable";

type DataPreviewPanelProps = {
  rows: RawRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function DataPreviewPanel({
  rows,
  totalRows,
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  onPrevPage,
  onNextPage,
}: DataPreviewPanelProps) {
  return (
    <>
      <DataTable rows={rows} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-(--ink-soft)">
        <p>
          Showing {rangeStart}-{rangeEnd} of {totalRows} rows
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={page <= 1 || !totalRows}
            className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
          >
            Prev
          </button>
          <span className="mono text-xs uppercase tracking-wide">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={page >= totalPages || !totalRows}
            className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
