import type { TabLabel } from "../types";

type TabNavigationProps = {
  tabs: readonly TabLabel[];
  activeTab: TabLabel;
  forecastEnabled: boolean;
  onSelect: (tab: TabLabel) => void;
};

export function TabNavigation({ tabs, activeTab, forecastEnabled, onSelect }: TabNavigationProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const disabled = tab === "Forecast (15 days)" && !forecastEnabled;
        return (
          <button
            key={tab}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(tab)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-(--ink) bg-(--ink) text-white"
                : "border-(--line) bg-white/80 text-(--ink)"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
