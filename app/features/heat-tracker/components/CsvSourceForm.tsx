import type { ChangeEvent } from "react";
import { commodityOptions } from "../constants";
import type { Commodity } from "../types";
import { FormFieldCard } from "./FormFieldCard";

type CsvSourceFormProps = {
  commodity: Commodity;
  latitude: number;
  longitude: number;
  tbase: number;
  cumhu: number;
  csvFileStartDate: string;
  plantingEndDate: string;
  maxPlantingEndDate: string;
  hasCsvData: boolean;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onCommodityChange: (value: string) => void;
  onTbaseChange: (value: string) => void;
  onCumhuChange: (value: string) => void;
  onPlantingEndDateChange: (value: string) => void;
  onReload: () => void;
};

export function CsvSourceForm({
  commodity,
  latitude,
  longitude,
  tbase,
  cumhu,
  csvFileStartDate,
  plantingEndDate,
  maxPlantingEndDate,
  hasCsvData,
  onFileUpload,
  onLatitudeChange,
  onLongitudeChange,
  onCommodityChange,
  onTbaseChange,
  onCumhuChange,
  onPlantingEndDateChange,
  onReload,
}: CsvSourceFormProps) {
  return (
    <div key="csv-mode" className="grid gap-4 md:grid-cols-4">
      <FormFieldCard label="CSV files">
        <input type="file" accept=".csv" multiple onChange={onFileUpload} className="block w-full text-sm underline" />
      </FormFieldCard>

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
          value={Number.isFinite(tbase) ? tbase : 10}
          onChange={(e) => onTbaseChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Cumulative HU target">
        <input
          type="number"
          value={Number.isFinite(cumhu) ? cumhu : 900}
          onChange={(e) => onCumhuChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Planting start date">
        <input
          type="date"
          value={csvFileStartDate}
          disabled
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <FormFieldCard label="Planting end date">
        <input
          type="date"
          value={plantingEndDate}
          min={csvFileStartDate || undefined}
          max={maxPlantingEndDate}
          onChange={(e) => onPlantingEndDateChange(e.target.value)}
          className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
        />
      </FormFieldCard>

      <div className="flex items-end justify-end md:col-span-4">
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!hasCsvData}
        >
          Reload Data
        </button>
      </div>
    </div>
  );
}
