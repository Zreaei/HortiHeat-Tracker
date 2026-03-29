import type { TabLabel } from "./types";

export const tabs: readonly TabLabel[] = [
  "Data Preview",
  "Humidity (%)",
  "Temperature (C)",
  "Heat units",
  "Forecast (15 days)",
] as const;

export const DEFAULTS = {
  tbase: 10,
  cumhu: 900,
  latitude: -6.5574,
  longitude: 106.7262,
  dataPreviewPageSize: 50,
} as const;
