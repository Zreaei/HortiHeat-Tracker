export type RawRow = {
  Date: string;
  Time: string;
  Temperature: number;
  Humidity: number;
};

export type PreprocessedRow = {
  timestamp: Date;
  Temperature: number;
  Humidity: number;
  heatunit: number;
};

export type DailyHumidity = {
  date: string;
  daily_avg_humid: number;
  daily_max_humid: number;
  daily_min_humid: number;
};

export type DailyTemp = {
  date: string;
  daily_avg_temp: number;
  daily_max_temp: number;
  daily_min_temp: number;
};

export type HeatUnitRow = {
  date: string;
  max_temp: number;
  avg_temp: number;
  min_temp: number;
  hu_t: number;
};

export type CumHuRow = HeatUnitRow & {
  cumul_hu: number;
};

export type ForecastRow = {
  date: string;
  max_temp: number;
  avg_temp: number;
  min_temp: number;
  hu_t: number;
};

export type DownloadOption =
  | "Raw Data"
  | "Humidity data"
  | "Temperature data"
  | "Heat Units data"
  | "Complete Dataset";

export type DataSourceMode = "csv" | "location";

export type Commodity = "Red Onion" | "Chili" | "Potato" | "Garlic";

export type TabLabel =
  | "Data Preview"
  | "Humidity (%)"
  | "Temperature (C)"
  | "Heat units"
  | "Forecast (15 days)";
