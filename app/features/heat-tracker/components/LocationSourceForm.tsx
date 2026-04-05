import { commodityOptions, commodityPreferences } from "../constants";
import type { Commodity } from "../types";
import { FormFieldCard } from "./FormFieldCard";

type LocationSourceFormProps = {
  commodity: Commodity;
  latitude: number;
  longitude: number;
  mapsLink: string;
  mapsLinkFeedback?: string;
  hasResolvedMapsCoordinates: boolean;
  tbase: number;
  cumhu: number;
  plantingStartDate: string;
  maxAvailableDate: string;
  onMapsLinkChange: (value: string) => void;
  onApplyMapsLink: () => void;
  onCommodityChange: (value: string) => void;
  onTbaseChange: (value: string) => void;
  onCumhuChange: (value: string) => void;
  onPlantingStartDateChange: (value: string) => void;
  onLoadData: () => void;
};

export function LocationSourceForm({
  commodity,
  latitude,
  longitude,
  mapsLink,
  mapsLinkFeedback,
  hasResolvedMapsCoordinates,
  tbase,
  cumhu,
  plantingStartDate,
  maxAvailableDate,
  onMapsLinkChange,
  onApplyMapsLink,
  onCommodityChange,
  onTbaseChange,
  onCumhuChange,
  onPlantingStartDateChange,
  onLoadData,
}: LocationSourceFormProps) {
  return (
    <div key="location-mode" className="grid gap-4 md:grid-cols-4">
      <div className="md:col-span-4 rounded-xl border border-[#dcc8a5] bg-[linear-gradient(135deg,#fff9ea_0%,#fffdf7_100%)] p-4">
        <p className="mono mb-2 text-xs uppercase tracking-wide text-(--ink-soft)">Google Maps link</p>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            type="url"
            value={mapsLink}
            onChange={(e) => onMapsLinkChange(e.target.value)}
            placeholder="Paste Google Maps link here"
            className="w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onApplyMapsLink}
            className="rounded-lg border border-(--line) bg-white px-4 py-2 text-sm font-semibold text-(--ink)"
          >
            Apply Link
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[#d9cfbb] bg-white px-2.5 py-1">
            Lat: {hasResolvedMapsCoordinates ? latitude.toFixed(5) : "Not set"}
          </span>
          <span className="rounded-full border border-[#d9cfbb] bg-white px-2.5 py-1">
            Long: {hasResolvedMapsCoordinates ? longitude.toFixed(5) : "Not set"}
          </span>
        </div>
        {mapsLinkFeedback ? <p className="mt-2 text-xs text-(--ink-soft)">{mapsLinkFeedback}</p> : null}
      </div>

      <FormFieldCard label="Commodity">
        <select
          value={commodity}
          onChange={(e) => onCommodityChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        >
          {commodityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormFieldCard>

      <FormFieldCard label="Tbase">
        <input
          type="number"
          value={Number.isFinite(tbase) ? tbase : commodityPreferences[commodity].tbase}
          onChange={(e) => onTbaseChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Cumulative HU target">
        <input
          type="number"
          value={Number.isFinite(cumhu) ? cumhu : commodityPreferences[commodity].cumhu}
          onChange={(e) => onCumhuChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Planting start date">
        <input
          type="date"
          value={plantingStartDate}
          max={maxAvailableDate}
          onChange={(e) => onPlantingStartDateChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <div className="flex items-end justify-end md:col-span-4">
        <button
          type="button"
          onClick={onLoadData}
          disabled={!hasResolvedMapsCoordinates}
          className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load Data
        </button>
      </div>
    </div>
  );
}