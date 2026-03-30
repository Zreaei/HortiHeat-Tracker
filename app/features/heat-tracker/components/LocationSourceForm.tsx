import { commodityOptions, commodityPreferences } from "../constants";
import type { Commodity } from "../types";
import { FormFieldCard } from "./FormFieldCard";

type LocationSourceFormProps = {
  commodity: Commodity;
  latitude: number;
  longitude: number;
  tbase: number;
  cumhu: number;
  plantingStartDate: string;
  plantingEndDate: string;
  maxPlantingEndDate: string;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onCommodityChange: (value: string) => void;
  onTbaseChange: (value: string) => void;
  onCumhuChange: (value: string) => void;
  onPlantingStartDateChange: (value: string) => void;
  onPlantingEndDateChange: (value: string) => void;
  onLoadData: () => void;
};

export function LocationSourceForm({
  commodity,
  latitude,
  longitude,
  tbase,
  cumhu,
  plantingStartDate,
  plantingEndDate,
  maxPlantingEndDate,
  onLatitudeChange,
  onLongitudeChange,
  onCommodityChange,
  onTbaseChange,
  onCumhuChange,
  onPlantingStartDateChange,
  onPlantingEndDateChange,
  onLoadData,
}: LocationSourceFormProps) {
  return (
    <div key="location-mode" className="grid gap-4 md:grid-cols-4">
      <FormFieldCard label="Latitude">
        <input
          type="number"
          step="any"
          value={Number.isFinite(latitude) ? latitude : -6.5574}
          onChange={(e) => onLatitudeChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Longitude">
        <input
          type="number"
          step="any"
          value={Number.isFinite(longitude) ? longitude : 106.7262}
          onChange={(e) => onLongitudeChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

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
          onChange={(e) => onPlantingStartDateChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Planting end date">
        <input
          type="date"
          value={plantingEndDate}
          max={maxPlantingEndDate}
          onChange={(e) => onPlantingEndDateChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <div className="flex items-end justify-end md:col-span-4">
        <button
          type="button"
          onClick={onLoadData}
          className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white"
        >
          Load Data
        </button>
      </div>
    </div>
  );
}
