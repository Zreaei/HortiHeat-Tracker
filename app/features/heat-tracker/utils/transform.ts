import type {
  CumHuRow,
  DailyHumidity,
  DailyTemp,
  ForecastRow,
  HeatUnitRow,
  PreprocessedRow,
  RawRow,
} from "../types";
import { localDateLabel, parseDate } from "./date";
import { round1 } from "./number";

export function sortRawRows(rows: RawRow[]): RawRow[] {
  return [...rows].sort((a, b) => {
    const d1 = parseDate(a.Date, a.Time)?.getTime() ?? 0;
    const d2 = parseDate(b.Date, b.Time)?.getTime() ?? 0;
    return d1 - d2;
  });
}

export function preprocessRows(rows: RawRow[], tbase: number): PreprocessedRow[] {
  return rows
    .map((row) => {
      const parsed = parseDate(row.Date, row.Time);
      if (!parsed) {
        return null;
      }

      return {
        timestamp: parsed,
        Temperature: row.Temperature,
        Humidity: row.Humidity,
        heatunit: row.Temperature - tbase,
      };
    })
    .filter((row): row is PreprocessedRow => row !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function computeDailyHumidity(rows: PreprocessedRow[]): DailyHumidity[] {
  const map = new Map<string, { sum: number; count: number; min: number; max: number }>();

  rows.forEach((row) => {
    const key = localDateLabel(row.timestamp);
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        sum: row.Humidity,
        count: 1,
        min: row.Humidity,
        max: row.Humidity,
      });
      return;
    }

    current.sum += row.Humidity;
    current.count += 1;
    current.min = Math.min(current.min, row.Humidity);
    current.max = Math.max(current.max, row.Humidity);
  });

  return Array.from(map.entries())
    .map(([date, stats]) => ({
      date,
      daily_avg_humid: round1(stats.sum / stats.count),
      daily_max_humid: stats.max,
      daily_min_humid: stats.min,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeDailyTemp(rows: PreprocessedRow[]): DailyTemp[] {
  const map = new Map<string, { sum: number; count: number; min: number; max: number }>();

  rows.forEach((row) => {
    const key = localDateLabel(row.timestamp);
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        sum: row.Temperature,
        count: 1,
        min: row.Temperature,
        max: row.Temperature,
      });
      return;
    }

    current.sum += row.Temperature;
    current.count += 1;
    current.min = Math.min(current.min, row.Temperature);
    current.max = Math.max(current.max, row.Temperature);
  });

  return Array.from(map.entries())
    .map(([date, stats]) => ({
      date,
      daily_avg_temp: round1(stats.sum / stats.count),
      daily_max_temp: stats.max,
      daily_min_temp: stats.min,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function toHeatUnitRows(tempRows: DailyTemp[], tbase: number): HeatUnitRow[] {
  return tempRows.map((row) => ({
    date: row.date,
    max_temp: row.daily_max_temp,
    avg_temp: row.daily_avg_temp,
    min_temp: row.daily_min_temp,
    hu_t: round1((row.daily_max_temp + row.daily_min_temp) / 2 - tbase),
  }));
}

export function toCumulativeRows(heatUnitRows: HeatUnitRow[]): CumHuRow[] {
  return heatUnitRows.reduce<CumHuRow[]>((acc, row) => {
    const previous = acc.length ? acc[acc.length - 1].cumul_hu : 0;
    return [...acc, { ...row, cumul_hu: round1(previous + row.hu_t) }];
  }, []);
}

export function toForecastRows(
  rows: Array<{ date: string; max_temp: number; avg_temp: number; min_temp: number }>,
  tbase: number
): ForecastRow[] {
  return rows.map((row) => ({
    ...row,
    hu_t: round1((row.max_temp + row.min_temp) / 2 - tbase),
  }));
}

export function buildCumulativeWithForecast(
  observed: HeatUnitRow[],
  forecastRows: ForecastRow[]
): Array<{ date: string; hu_t: number; cumul_hu: number }> {
  const merged = [
    ...observed.map((row) => ({ date: row.date, hu_t: row.hu_t })),
    ...forecastRows.map((row) => ({ date: row.date, hu_t: row.hu_t })),
  ];

  return merged.reduce<Array<{ date: string; hu_t: number; cumul_hu: number }>>((acc, row) => {
    const previous = acc.length ? acc[acc.length - 1].cumul_hu : 0;
    return [...acc, { ...row, cumul_hu: round1(previous + row.hu_t) }];
  }, []);
}
