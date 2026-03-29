import type { DataSourceMode } from "../types";

type SourceModeToggleProps = {
  dataSourceMode: DataSourceMode;
  onSwitch: (mode: DataSourceMode) => void;
};

export function SourceModeToggle({ dataSourceMode, onSwitch }: SourceModeToggleProps) {
  return (
    <>
      <p className="mono mb-3 text-xs uppercase tracking-[0.15em] text-(--ink-soft)">
        Initial Temperature Source
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSwitch("csv")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            dataSourceMode === "csv"
              ? "border-(--ink) bg-(--ink) text-white"
              : "border-(--line) bg-white text-(--ink)"
          }`}
        >
          Use CSV Files
        </button>
        <button
          type="button"
          onClick={() => onSwitch("location")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            dataSourceMode === "location"
              ? "border-(--ink) bg-(--ink) text-white"
              : "border-(--line) bg-white text-(--ink)"
          }`}
        >
          Use Location Coordinates
        </button>
      </div>
    </>
  );
}
