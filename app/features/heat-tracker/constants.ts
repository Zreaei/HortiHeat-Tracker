import type { Commodity, TabLabel } from "./types";

export const tabs: readonly TabLabel[] = [
  "Data Preview",
  "Humidity (%)",
  "Temperature (C)",
  "Heat units",
  "Forecast (15 days)",
] as const;

export const DEFAULTS = {
  commodity: "Red Onion",
  tbase: 10,
  cumhu: 900,
  latitude: -6.5574,
  longitude: 106.7262,
  dataPreviewPageSize: 50,
} as const;

export const commodityOptions: readonly Commodity[] = ["Red Onion", "Chili", "Potato", "Garlic"];

export const commodityPreferences: Record<Commodity, { tbase: number; cumhu: number }> = {
  "Red Onion": { tbase: 10, cumhu: 740 },
  Chili: { tbase: 10, cumhu: 2400 },
  Potato: { tbase: 7, cumhu: 1000 },
  Garlic: { tbase: 5, cumhu: 1200 },
};
