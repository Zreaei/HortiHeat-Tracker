type ForecastSummaryCardProps = {
  currentHu: number | null;
  cumhu: number;
  harvestInfo: string | null;
};

export function ForecastSummaryCard({ currentHu, cumhu, harvestInfo }: ForecastSummaryCardProps) {
  return (
    <aside className="lg:col-span-4 flex min-w-0 flex-col justify-center rounded-xl border border-(--line) bg-[#fffdf7] p-5 text-center">
      <p className="mono text-xs uppercase tracking-[0.15em] text-(--ink-soft)">Current Heat Units</p>
      <p className={`mt-2 text-4xl font-bold ${(currentHu ?? 0) < cumhu ? "text-[#d64532]" : "text-[#1f7a3f]"}`}>
        {currentHu ?? "-"}
      </p>

      {harvestInfo ? (
        <>
          <p className="mt-6 text-sm text-(--ink-soft)">Estimated harvest date</p>
          <p className="mt-1 text-2xl font-semibold">{harvestInfo}</p>
        </>
      ) : (
        <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-gray-500">
          Required heat units are not expected within the current forecast window.
        </p>
      )}

      <div className="mt-7 text-xs text-(--ink-soft)">
        Powered by{" "}
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo.com
        </a>
      </div>
    </aside>
  );
}
