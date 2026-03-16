"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RawRow = {
  Date: string;
  Time: string;
  Temperature: number;
  Humidity: number;
};

type PreprocessedRow = {
  timestamp: Date;
  Temperature: number;
  Humidity: number;
  heatunit: number;
};

type DailyHumidity = {
  date: string;
  daily_avg_humid: number;
  daily_max_humid: number;
  daily_min_humid: number;
};

type DailyTemp = {
  date: string;
  daily_avg_temp: number;
  daily_max_temp: number;
  daily_min_temp: number;
};

type HeatUnitRow = {
  date: string;
  max_temp: number;
  avg_temp: number;
  min_temp: number;
  hu_t: number;
};

type CumHuRow = HeatUnitRow & {
  cumul_hu: number;
};

type ForecastRow = {
  date: string;
  max_temp: number;
  avg_temp: number;
  min_temp: number;
  hu_t: number;
};

type DownloadOption =
  | "Raw Data"
  | "Humidity data"
  | "Temperature data"
  | "Heat Units data"
  | "Complete Dataset";

type DataSourceMode = "csv" | "location";

const tabs = [
  "Data Preview",
  "Humidity (%)",
  "Temperature (C)",
  "Heat units",
  "Forecast (15 days)",
] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function dateLabel(value: Date): string {
  return localDateLabel(value);
}

function localDateLabel(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(dateText: string, timeText: string): Date | null {
  const [month, day, year] = dateText.split("/").map((part) => Number(part));
  const [hh, mm, ss] = timeText.split(":").map((part) => Number(part));

  if ([month, day, year, hh, mm, ss].some((n) => Number.isNaN(n))) {
    return null;
  }

  const normalizedYear = year < 100 ? 2000 + year : year;
  return new Date(normalizedYear, month - 1, day, hh, mm, ss);
}

function parseNumberInput(value: string, fallback: number): number {
  if (value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCsv<T extends object>(rows: T[]): string {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const val = String((row as Record<string, unknown>)[header] ?? "");
        const escaped = val.replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  return [headers.join(","), ...body].join("\n");
}

function downloadCsv<T extends object>(rows: T[], fileName: string) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function computeDailyHumidity(rows: PreprocessedRow[]): DailyHumidity[] {
  const map = new Map<string, { sum: number; count: number; min: number; max: number }>();

  rows.forEach((row) => {
    const key = dateLabel(row.timestamp);
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

function computeDailyTemp(rows: PreprocessedRow[]): DailyTemp[] {
  const map = new Map<string, { sum: number; count: number; min: number; max: number }>();

  rows.forEach((row) => {
    const key = dateLabel(row.timestamp);
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Data Preview");
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>("csv");
  const [tbase, setTbase] = useState<number>(10);
  const [cumhu, setCumhu] = useState<number>(900);
  const [latitude, setLatitude] = useState<number>(-6.5574);
  const [longitude, setLongitude] = useState<number>(106.7262);
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [csvSourceRows, setCsvSourceRows] = useState<RawRow[]>([]);
  const [csvFileStartDate, setCsvFileStartDate] = useState<string>("");
  const [csvFileEndDate, setCsvFileEndDate] = useState<string>("");
  const [dataPreviewPage, setDataPreviewPage] = useState<number>(1);
  const [downloadOption, setDownloadOption] = useState<DownloadOption>("Raw Data");
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
  const [forecastStatus, setForecastStatus] = useState<string>();

  const todayIso = localDateLabel(new Date());
  const maxPlantingEndDate = localDateLabel(addDays(new Date(), 15));
  const [plantingStartDate, setPlantingStartDate] = useState<string>(todayIso);
  const [plantingEndDate, setPlantingEndDate] = useState<string>(todayIso);
  const todayMarkerDate = localDateLabel(new Date());

  const dataPreviewPageSize = 50;

  const preprocessed = useMemo<PreprocessedRow[]>(() => {
    return rawData
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
  }, [rawData, tbase]);

  const humidityRows = useMemo(() => computeDailyHumidity(preprocessed), [preprocessed]);
  const tempRows = useMemo(() => computeDailyTemp(preprocessed), [preprocessed]);

  const heatUnitRows = useMemo<HeatUnitRow[]>(() => {
    return tempRows.map((row) => ({
      date: row.date,
      max_temp: row.daily_max_temp,
      avg_temp: row.daily_avg_temp,
      min_temp: row.daily_min_temp,
      hu_t: round1((row.daily_max_temp + row.daily_min_temp) / 2 - tbase),
    }));
  }, [tempRows, tbase]);

  const cumulativeHuRows = useMemo<CumHuRow[]>(() => {
    return heatUnitRows.reduce<CumHuRow[]>((acc, row) => {
      const previous = acc.length ? acc[acc.length - 1].cumul_hu : 0;
      return [...acc, { ...row, cumul_hu: round1(previous + row.hu_t) }];
    }, []);
  }, [heatUnitRows]);

  const forecastEnabled = useMemo(() => {
    return cumulativeHuRows.length > 0;
  }, [cumulativeHuRows]);

  const forecastCumulativeRows = useMemo(() => {
    const latestObserved = cumulativeHuRows.at(-1);
    if (!latestObserved || !forecastRows.length) {
      return [] as Array<{ date: string; cumul_hu: number }>;
    }

    return forecastRows.reduce<Array<{ date: string; cumul_hu: number }>>((acc, row) => {
      const previous = acc.length ? acc[acc.length - 1].cumul_hu : latestObserved.cumul_hu;
      return [...acc, { date: row.date, cumul_hu: round1(previous + row.hu_t) }];
    }, []);
  }, [cumulativeHuRows, forecastRows]);

  const completeWithForecast = useMemo(() => {
    const observed: Array<{ date: string; hu_t: number }> = heatUnitRows.map((row) => ({
      date: row.date,
      hu_t: row.hu_t,
    }));

    const joined = [...observed, ...forecastRows.map((row) => ({ date: row.date, hu_t: row.hu_t }))];
    return joined.reduce<Array<{ date: string; hu_t: number; cumul_hu: number }>>((acc, row) => {
      const previous = acc.length ? acc[acc.length - 1].cumul_hu : 0;
      return [
        ...acc,
        {
        date: row.date,
        hu_t: row.hu_t,
          cumul_hu: round1(previous + row.hu_t),
        },
      ];
    }, []);
  }, [heatUnitRows, forecastRows]);

  const currentHu = useMemo(() => {
    const exactToday = cumulativeHuRows.find((row) => row.date === todayMarkerDate);
    if (exactToday) {
      return exactToday.cumul_hu;
    }

    const upToToday = cumulativeHuRows.filter((row) => row.date <= todayMarkerDate);
    if (upToToday.length) {
      return upToToday[upToToday.length - 1].cumul_hu;
    }

    return null;
  }, [cumulativeHuRows, todayMarkerDate]);
  const harvestInfo = useMemo(() => {
    const match = completeWithForecast.find((row) => row.cumul_hu >= cumhu);
    if (!match) {
      return null;
    }

    const date = new Date(match.date);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [completeWithForecast, cumhu]);

  const completeDataset = useMemo(() => {
    return preprocessed.map((row) => ({
      timestamp: row.timestamp.toISOString(),
      Temperature: row.Temperature,
      Humidity: row.Humidity,
      heatunit: round1(row.heatunit),
    }));
  }, [preprocessed]);

  const totalDataPreviewPages = Math.max(1, Math.ceil(rawData.length / dataPreviewPageSize));
  const safeDataPreviewPage = Math.min(dataPreviewPage, totalDataPreviewPages);

  const pagedRawData = useMemo(() => {
    const start = (safeDataPreviewPage - 1) * dataPreviewPageSize;
    return rawData.slice(start, start + dataPreviewPageSize);
  }, [rawData, safeDataPreviewPage]);

  const dataPreviewRange = useMemo(() => {
    if (!rawData.length) {
      return { start: 0, end: 0 };
    }

    const start = (safeDataPreviewPage - 1) * dataPreviewPageSize + 1;
    const end = Math.min(safeDataPreviewPage * dataPreviewPageSize, rawData.length);
    return { start, end };
  }, [rawData.length, safeDataPreviewPage]);

  const applyCsvRange = async (
    sourceRows: RawRow[],
    rangeStartDate: string,
    rangeEndDate: string,
    sourceLastDate: string
  ) => {
    if (!sourceRows.length) {
      setRawData([]);
      setForecastRows([]);
      setForecastStatus("Please upload a CSV file first.");
      return;
    }

    let effectiveEndDate = rangeEndDate;
    if (effectiveEndDate < rangeStartDate) {
      effectiveEndDate = rangeStartDate;
    }
    if (effectiveEndDate > maxPlantingEndDate) {
      effectiveEndDate = maxPlantingEndDate;
    }

    if (effectiveEndDate !== rangeEndDate) {
      setPlantingEndDate(effectiveEndDate);
    }

    const csvRowsInRange = sourceRows.filter((row) => {
      const parsed = parseDate(row.Date, row.Time);
      if (!parsed) {
        return false;
      }

      const key = localDateLabel(parsed);
      return key >= rangeStartDate && key <= sourceLastDate;
    });

    let combinedRows = [...csvRowsInRange];
    let extensionCount = 0;
    let extensionNote = "";

    if (effectiveEndDate > sourceLastDate) {
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        extensionNote = " Open-Meteo continuation skipped due to invalid coordinates.";
      } else {
        const continuationStart = localDateLabel(addDays(new Date(`${sourceLastDate}T00:00:00`), 1));

        try {
          const params = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            startDate: continuationStart,
            endDate: effectiveEndDate,
          });

          const response = await fetch(`/api/location-data?${params.toString()}`, {
            cache: "no-store",
          });
          const payload = (await response.json()) as { error: string } | RawRow[];

          if (response.ok && Array.isArray(payload)) {
            extensionCount = payload.length;
            combinedRows = [...combinedRows, ...payload];
            extensionNote =
              extensionCount > 0
                ? ` Includes ${extensionCount} Open-Meteo continuation records.`
                : " No Open-Meteo continuation records were returned for the extension range.";
          } else {
            const message = Array.isArray(payload) ? "Unknown API error." : payload.error;
            extensionNote = ` Open-Meteo continuation failed: ${message}`;
          }
        } catch {
          extensionNote = " Open-Meteo continuation request failed.";
        }
      }
    }

    combinedRows.sort((a, b) => {
      const d1 = parseDate(a.Date, a.Time)?.getTime() ?? 0;
      const d2 = parseDate(b.Date, b.Time)?.getTime() ?? 0;
      return d1 - d2;
    });

    setRawData(combinedRows);
    setDataPreviewPage(1);
    setForecastRows([]);
    setForecastStatus(
      `${combinedRows.length} records loaded for ${rangeStartDate} to ${effectiveEndDate}.${extensionNote}`
    );
    setActiveTab("Data Preview");
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files.length) {
      return;
    }

    const parsedRows: RawRow[] = [];

    for (const file of Array.from(files as FileList)) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).slice(37);

      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }

        const cols = trimmed.split(",");
        if (cols.length < 4) {
          return;
        }

        const temp = Number(cols[2]);
        const humid = Number(cols[3]);
        if (Number.isNaN(temp) || Number.isNaN(humid)) {
          return;
        }

        parsedRows.push({
          Date: cols[0],
          Time: cols[1],
          Temperature: temp,
          Humidity: humid,
        });
      });
    }

    parsedRows.sort((a, b) => {
      const d1 = parseDate(a.Date, a.Time)?.getTime() ?? 0;
      const d2 = parseDate(b.Date, b.Time)?.getTime() ?? 0;
      return d1 - d2;
    });

    const datedRows = parsedRows
      .map((row) => {
        const parsed = parseDate(row.Date, row.Time);
        if (!parsed) {
          return null;
        }

        return {
          row,
          dateKey: localDateLabel(parsed),
        };
      })
      .filter((entry): entry is { row: RawRow; dateKey: string } => entry !== null);

    if (!datedRows.length) {
      setRawData([]);
      setForecastRows([]);
      setForecastStatus("No valid temperature/humidity rows found in CSV file.");
      return;
    }

    const fileStartDate = datedRows[0].dateKey;
    const fileEndDate = datedRows[datedRows.length - 1].dateKey;

    setCsvSourceRows(parsedRows);
    setCsvFileStartDate(fileStartDate);
    setCsvFileEndDate(fileEndDate);
    setPlantingStartDate(fileStartDate);
    setPlantingEndDate(fileEndDate);
    await applyCsvRange(parsedRows, fileStartDate, fileEndDate, fileEndDate);
  };

  const reloadCsvData = async () => {
    if (!csvSourceRows.length || !csvFileStartDate || !csvFileEndDate) {
      setForecastStatus("Please upload a CSV file first.");
      return;
    }

    await applyCsvRange(csvSourceRows, csvFileStartDate, plantingEndDate, csvFileEndDate);
  };

  const switchDataSourceMode = (nextMode: DataSourceMode) => {
    if (nextMode === dataSourceMode) {
      return;
    }

    setDataSourceMode(nextMode);

    // Clear loaded/derived data so each mode starts from a clean state.
    setRawData([]);
    setForecastRows([]);
    setCsvSourceRows([]);
    setCsvFileStartDate("");
    setCsvFileEndDate("");
    setDataPreviewPage(1);
    setPlantingStartDate(todayIso);
    setPlantingEndDate(todayIso);
    setForecastStatus(undefined);
    setActiveTab("Data Preview");
  };

  const loadLocationData = async () => {
    if (!plantingStartDate || !plantingEndDate) {
      setForecastStatus("Please select planting start and end dates.");
      return;
    }

    if (plantingStartDate > plantingEndDate) {
      setForecastStatus("Planting start date must be before or equal to end date.");
      return;
    }

    if (plantingEndDate > maxPlantingEndDate) {
      setForecastStatus(`Planting end date cannot exceed ${maxPlantingEndDate}.`);
      return;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setForecastStatus("Please provide valid latitude and longitude.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setForecastStatus("Coordinates out of range. Latitude [-90, 90], longitude [-180, 180].");
      return;
    }

    setForecastStatus("Loading hourly temperature and humidity from location...");

    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        startDate: plantingStartDate,
        endDate: plantingEndDate,
      });
      const response = await fetch(`/api/location-data?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { error: string } | RawRow[];

      if (!response.ok || !Array.isArray(payload)) {
        const message = Array.isArray(payload) ? "Unknown API error." : payload.error;
        setForecastStatus(`Location data unavailable: ${message}`);
        return;
      }

      setRawData(payload);
      setDataPreviewPage(1);
      setForecastRows([]);
      setForecastStatus(
        `${payload.length} location records loaded for (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).`
      );
      setActiveTab("Data Preview");
    } catch {
      setForecastStatus("Location data request failed.");
    }
  };

  const loadForecast = async () => {
    if (!plantingStartDate || !plantingEndDate) {
      setForecastStatus("Please select planting start and end dates.");
      return;
    }

    if (plantingStartDate > plantingEndDate) {
      setForecastStatus("Planting start date must be before or equal to end date.");
      return;
    }

    if (plantingEndDate > maxPlantingEndDate) {
      setForecastStatus(`Planting end date cannot exceed ${maxPlantingEndDate}.`);
      return;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setForecastStatus("Please provide valid latitude and longitude.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setForecastStatus("Coordinates out of range. Latitude [-90, 90], longitude [-180, 180].");
      return;
    }

    setForecastStatus("Loading 14-day forecast...");

    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        startDate: plantingStartDate,
        endDate: plantingEndDate,
      });
      const response = await fetch(`/api/forecast?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as
        | { error: string }
        | Array<{ date: string; max_temp: number; avg_temp: number; min_temp: number }>;

      if (!response.ok || !Array.isArray(payload)) {
        const message = Array.isArray(payload) ? "Unknown API error." : payload.error;
        setForecastStatus(`Forecast unavailable: ${message}`);
        return;
      }

      const rows = payload.map((row) => ({
        ...row,
        hu_t: round1((row.max_temp + row.min_temp) / 2 - tbase),
      }));

      setForecastRows(rows);
      setForecastStatus(`Forecast loaded for (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).`);
      setActiveTab("Forecast (15 days)");
    } catch {
      setForecastStatus("Forecast request failed.");
    }
  };

  const handleDownload = () => {
    if (!preprocessed.length) {
      return;
    }

    if (downloadOption === "Raw Data") {
      downloadCsv(rawData, "Raw Data.csv");
      return;
    }

    if (downloadOption === "Humidity data") {
      downloadCsv(humidityRows, "Humidity data.csv");
      return;
    }

    if (downloadOption === "Temperature data") {
      downloadCsv(tempRows, "Temperature data.csv");
      return;
    }

    if (downloadOption === "Heat Units data") {
      downloadCsv(heatUnitRows, "Heat Units data.csv");
      return;
    }

    downloadCsv(completeDataset, "Complete Dataset.csv");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-350 px-4 py-8 md:px-8">
      <section className="rise-up rounded-3xl border border-(--line) bg-(--panel) p-5 shadow-[0_30px_50px_-30px_rgba(19,33,44,0.6)] backdrop-blur md:p-8">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mono text-xs uppercase tracking-[0.18em] text-(--ink-soft)">Heat Unit Tracker</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">HortiHeat Tracker</h1>
          </div>
        </div>

        <section className="rounded-2xl border border-(--line) bg-white/65 p-4 md:p-5">
          <p className="mono mb-3 text-xs uppercase tracking-[0.15em] text-(--ink-soft)">Initial Temperature Source</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchDataSourceMode("csv")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                dataSourceMode === "csv"
                  ? "border-(--ink) bg-(--ink) text-white"
                  : "border-(--line) bg-white text-(--ink)"
              }`}
            >
              Use CSV Files
            </button>
            <button
              type="button"
              onClick={() => switchDataSourceMode("location")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                dataSourceMode === "location"
                  ? "border-(--ink) bg-(--ink) text-white"
                  : "border-(--line) bg-white text-(--ink)"
              }`}
            >
              Use Location Coordinates
            </button>
          </div>

          {dataSourceMode === "csv" ? (
            <div key="csv-mode" className="grid gap-4 md:grid-cols-4">
              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">CSV files</p>
                <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="block w-full text-sm underline" />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Latitude</p>
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(latitude) ? latitude : -6.5574}
                  onChange={(e) => setLatitude(parseNumberInput(e.target.value, -6.5574))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Longitude</p>
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(longitude) ? longitude : 106.7262}
                  onChange={(e) => setLongitude(parseNumberInput(e.target.value, 106.7262))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Tbase</p>
                <input
                  type="number"
                  value={Number.isFinite(tbase) ? tbase : 10}
                  onChange={(e) => setTbase(parseNumberInput(e.target.value, 10))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Cumulative HU target</p>
                <input
                  type="number"
                  value={Number.isFinite(cumhu) ? cumhu : 900}
                  onChange={(e) => setCumhu(parseNumberInput(e.target.value, 900))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Planting start date</p>
                <input
                  type="date"
                  value={csvFileStartDate || plantingStartDate}
                  disabled
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Planting end date</p>
                <input
                  type="date"
                  value={plantingEndDate}
                  min={csvFileStartDate || undefined}
                  max={maxPlantingEndDate}
                  onChange={(e) =>
                    setPlantingEndDate(
                      e.target.value > maxPlantingEndDate ? maxPlantingEndDate : e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <div className="flex items-end justify-end md:col-span-4">
                <button
                  type="button"
                  onClick={reloadCsvData}
                  className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={!csvSourceRows.length}
                >
                  Reload Data
                </button>
              </div>

              {/* <div className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Download dataset</p>
                <div className="flex gap-2">
                  <select
                    value={downloadOption ?? "Raw Data"}
                    onChange={(e) => setDownloadOption(e.target.value as DownloadOption)}
                    className="w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                  >
                    <option>Raw Data</option>
                    <option>Humidity data</option>
                    <option>Temperature data</option>
                    <option>Heat Units data</option>
                    <option>Complete Dataset</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg bg-(--mint) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={!rawData.length}
                  >
                    Download
                  </button>
                </div>
              </div> */}
            </div>
          ) : (
            <div key="location-mode" className="grid gap-4 md:grid-cols-4">
              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Latitude</p>
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(latitude) ? latitude : -6.5574}
                  onChange={(e) => setLatitude(parseNumberInput(e.target.value, -6.5574))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Longitude</p>
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(longitude) ? longitude : 106.7262}
                  onChange={(e) => setLongitude(parseNumberInput(e.target.value, 106.7262))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Tbase</p>
                <input
                  type="number"
                  value={Number.isFinite(tbase) ? tbase : 10}
                  onChange={(e) => setTbase(parseNumberInput(e.target.value, 10))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Cumulative HU target</p>
                <input
                  type="number"
                  value={Number.isFinite(cumhu) ? cumhu : 900}
                  onChange={(e) => setCumhu(parseNumberInput(e.target.value, 900))}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4 md:col-start-1">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Planting start date</p>
                <input
                  type="date"
                  value={plantingStartDate}
                  onChange={(e) => setPlantingStartDate(e.target.value)}
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Planting end date</p>
                <input
                  type="date"
                  value={plantingEndDate}
                  max={maxPlantingEndDate}
                  onChange={(e) =>
                    setPlantingEndDate(
                      e.target.value > maxPlantingEndDate ? maxPlantingEndDate : e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              {/* <div className="rounded-xl border border-(--line) bg-white/70 p-4">
                <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">Download dataset</p>
                <div className="flex gap-2">
                  <select
                    value={downloadOption ?? "Raw Data"}
                    onChange={(e) => setDownloadOption(e.target.value as DownloadOption)}
                    className="w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                  >
                    <option>Raw Data</option>
                    <option>Humidity data</option>
                    <option>Temperature data</option>
                    <option>Heat Units data</option>
                    <option>Complete Dataset</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg bg-(--mint) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={!rawData.length}
                  >
                    Download
                  </button>
                </div>
              </div> */}

              <div className="flex items-end justify-end md:col-span-4">
                <button
                  type="button"
                  onClick={loadLocationData}
                  className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white"
                >
                  Load Data
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="mt-4 text-sm text-(--ink-soft)">{forecastStatus}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const disabled = tab === "Forecast (15 days)" && !forecastEnabled;
            return (
              <button
                key={tab}
                type="button"
                disabled={disabled}
                onClick={() => setActiveTab(tab)}
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

        <section className="mt-5 rounded-2xl border border-(--line) bg-white/65 p-4 md:p-6">
          {activeTab === "Data Preview" && (
            <>
              <DataTable rows={pagedRawData} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-(--ink-soft)">
                <p>
                  Showing {dataPreviewRange.start}-{dataPreviewRange.end} of {rawData.length} rows
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDataPreviewPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeDataPreviewPage <= 1 || !rawData.length}
                    className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="mono text-xs uppercase tracking-wide">
                    Page {safeDataPreviewPage} / {totalDataPreviewPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDataPreviewPage((prev) => Math.min(totalDataPreviewPages, prev + 1))}
                    disabled={safeDataPreviewPage >= totalDataPreviewPages || !rawData.length}
                    className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "Humidity (%)" && (
            <>
              <LinePanel
                data={humidityRows}
                yDomain={[0, 100]}
                title="Daily Humidity Trends"
                todayMarkerDate={todayMarkerDate}
                lines={[
                  { dataKey: "daily_max_humid", name: "Max humid", color: "#d64532" },
                  { dataKey: "daily_avg_humid", name: "Avg humid", color: "#13212c" },
                  { dataKey: "daily_min_humid", name: "Min humid", color: "#3478b5" },
                ]}
              />
              <DataTable rows={humidityRows} />
            </>
          )}

          {activeTab === "Temperature (C)" && (
            <>
              <LinePanel
                data={tempRows}
                yDomain={[0, 50]}
                title="Daily Temperature Trends"
                todayMarkerDate={todayMarkerDate}
                lines={[
                  { dataKey: "daily_max_temp", name: "Max temp", color: "#d64532" },
                  { dataKey: "daily_avg_temp", name: "Avg temp", color: "#13212c" },
                  { dataKey: "daily_min_temp", name: "Min temp", color: "#3478b5" },
                ]}
              />
              <DataTable rows={tempRows} />
            </>
          )}

          {activeTab === "Heat units" && (
            <>
              <LinePanel
                data={cumulativeHuRows}
                yDomain={undefined}
                title="Cumulative Heat Units Over Time"
                todayMarkerDate={todayMarkerDate}
                lines={[{ dataKey: "cumul_hu", name: "Cumulative HU", color: "#d64532" }]}
                threshold={cumhu}
              />
              <DataTable rows={cumulativeHuRows} />
            </>
          )}

          {activeTab === "Forecast (15 days)" && (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <LinePanel
                  data={[
                    ...cumulativeHuRows,
                    ...forecastCumulativeRows.map((row) => ({ ...row, observed: undefined })),
                  ]}
                  yDomain={undefined}
                  title="Cumulative Heat Units Over Time"
                  todayMarkerDate={todayMarkerDate}
                  lines={[
                    { dataKey: "cumul_hu", name: "Observed + Forecast HU", color: "#1d4ed8" },
                  ]}
                  threshold={cumhu}
                />
              </div>

              <aside className="lg:col-span-4 flex min-w-0 flex-col justify-center rounded-xl border border-(--line) bg-[#fffdf7] p-5 text-center">
                <p className="mono text-xs uppercase tracking-[0.15em] text-(--ink-soft)">Current Heat Units</p>
                <p
                  className={`mt-2 text-4xl font-bold ${
                    (currentHu ?? 0) < cumhu ? "text-[#d64532]" : "text-[#1f7a3f]"
                  }`}
                >
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
                  Powered by <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>
                </div>
              </aside>

              {/* <div className="lg:col-span-12">
                <DataTable rows={forecastRows} />
              </div> */}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function DataTable<T extends object>({ rows }: { rows: T[] }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];

  if (!rows.length) {
    return <p className="text-sm text-(--ink-soft)">No data to display.</p>;
  }

  return (
    <div className="mt-4 overflow-auto rounded-xl border border-(--line)">
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead className="mono bg-[#f5efe0] text-xs uppercase text-(--ink-soft)">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-(--line) px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-[#fffcf4]">
              {headers.map((header) => (
                <td key={header} className="border-b border-(--line) px-3 py-2 align-top">
                  {String((row as Record<string, unknown>)[header] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinePanel({
  data,
  yDomain,
  title,
  lines,
  todayMarkerDate,
  threshold,
}: {
  data: Array<Record<string, number | string | undefined>>;
  yDomain?: [number, number] | undefined;
  title: string;
  lines: Array<{ dataKey: string; name: string; color: string }>;
  todayMarkerDate?: string;
  threshold?: number;
}) {
  const hasTodayMarker = Boolean(
    todayMarkerDate && data.some((row) => String(row.date ?? "") === todayMarkerDate)
  );

  return (
    <div className="h-90 rounded-xl border border-(--line) bg-white p-2 md:p-3">
      <p className="mb-2 px-2 text-sm font-semibold text-(--ink-soft)">{title}</p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfd5c0" />
          <XAxis dataKey="date" />
          <YAxis domain={yDomain} />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} stroke={line.color} strokeWidth={2} dot={false} name={line.name} />
          ))}
          {hasTodayMarker && todayMarkerDate ? (
            <ReferenceLine
              x={todayMarkerDate}
              stroke="#0f766e"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{ value: "Today", position: "insideTopRight", fill: "#0f766e", fontSize: 11 }}
            />
          ) : null}
          {typeof threshold === "number" ? (
            <Line type="linear" dataKey={() => threshold} stroke="#13212c" strokeDasharray="8 4" dot={false} name="Threshold" />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}