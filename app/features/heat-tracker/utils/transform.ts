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
       
        heatunit: Math.max(0, row.Temperature - tbase),
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

export function toHeatUnitRows(
  tempRows: DailyTemp[],
  preprocessedRows: PreprocessedRow[]
): HeatUnitRow[] {
  const sortedRows = [...preprocessedRows].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const huByDate = sortedRows.reduce<Map<string, number>>((acc, row, index, rows) => {
    const key = localDateLabel(row.timestamp);

    const next = rows[index + 1];
    const previousRow = rows[index - 1];

    const derivedHours = next
      ? (next.timestamp.getTime() - row.timestamp.getTime()) / 3_600_000
      : previousRow
        ? (row.timestamp.getTime() - previousRow.timestamp.getTime()) / 3_600_000
        : 1;

    const intervalHours = Number.isFinite(derivedHours) && derivedHours > 0 ? derivedHours : 1;
    
    const degreeDayEquivalent = (row.heatunit * intervalHours) / 24;

    const running = acc.get(key) ?? 0;
    acc.set(key, running + degreeDayEquivalent);
    return acc;
  }, new Map<string, number>());

  return tempRows.map((row) => ({
    date: row.date,
    max_temp: row.daily_max_temp,
    avg_temp: row.daily_avg_temp,
    min_temp: row.daily_min_temp,
    hu_t: round1(huByDate.get(row.date) ?? 0),
  }));
}

export function toCumulativeRows(heatUnitRows: HeatUnitRow[]): CumHuRow[] {
  return heatUnitRows.reduce<CumHuRow[]>((acc, row) => {
    const previous = acc.length ? acc[acc.length - 1].cumul_hu : 0;
    return [...acc, { ...row, cumul_hu: round1(previous + row.hu_t) }];
  }, []);
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
