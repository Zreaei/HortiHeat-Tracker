import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { commodityOptions, commodityPreferences, DEFAULTS } from "../constants";
import type { Commodity, DataSourceMode, ForecastRow, RawRow, TabLabel } from "../types";
import { addDays, localDateLabel, parseDate } from "../utils/date";
import { parseCsvFiles } from "../utils/csv-parser";
import { parseNumberInput, round1 } from "../utils/number";
import {
  buildCumulativeWithForecast,
  computeDailyHumidity,
  computeDailyTemp,
  preprocessRows,
  sortRawRows,
  toCumulativeRows,
  toHeatUnitRows,
} from "../utils/transform";

export function useHeatTracker() {
  const [activeTab, setActiveTab] = useState<TabLabel>("Data Preview");
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>("csv");
  const [commodity, setCommodity] = useState<Commodity>(DEFAULTS.commodity);
  const [tbase, setTbase] = useState<number>(DEFAULTS.tbase);
  const [cumhu, setCumhu] = useState<number>(DEFAULTS.cumhu);
  const [latitude, setLatitude] = useState<number>(DEFAULTS.latitude);
  const [longitude, setLongitude] = useState<number>(DEFAULTS.longitude);
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [csvSourceRows, setCsvSourceRows] = useState<RawRow[]>([]);
  const [csvFileStartDate, setCsvFileStartDate] = useState<string>("");
  const [csvFileEndDate, setCsvFileEndDate] = useState<string>("");
  const [dataPreviewPage, setDataPreviewPage] = useState<number>(1);
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
  const [forecastStatus, setForecastStatus] = useState<string>();

  const todayIso = localDateLabel(new Date());
  const maxPlantingEndDate = localDateLabel(addDays(new Date(), 15));
  const [plantingStartDate, setPlantingStartDate] = useState<string>(todayIso);
  const [plantingEndDate, setPlantingEndDate] = useState<string>(todayIso);
  const todayMarkerDate = localDateLabel(new Date());

  const preprocessed = useMemo(() => preprocessRows(rawData, tbase), [rawData, tbase]);
  const humidityRows = useMemo(() => computeDailyHumidity(preprocessed), [preprocessed]);
  const tempRows = useMemo(() => computeDailyTemp(preprocessed), [preprocessed]);
  const heatUnitRows = useMemo(() => toHeatUnitRows(tempRows, tbase), [tempRows, tbase]);
  const cumulativeHuRows = useMemo(() => toCumulativeRows(heatUnitRows), [heatUnitRows]);

  const forecastEnabled = useMemo(() => cumulativeHuRows.length > 0, [cumulativeHuRows]);

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

  const completeWithForecast = useMemo(
    () => buildCumulativeWithForecast(heatUnitRows, forecastRows),
    [heatUnitRows, forecastRows]
  );

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

  const totalDataPreviewPages = Math.max(1, Math.ceil(rawData.length / DEFAULTS.dataPreviewPageSize));
  const safeDataPreviewPage = Math.min(dataPreviewPage, totalDataPreviewPages);

  const pagedRawData = useMemo(() => {
    const start = (safeDataPreviewPage - 1) * DEFAULTS.dataPreviewPageSize;
    return rawData.slice(start, start + DEFAULTS.dataPreviewPageSize);
  }, [rawData, safeDataPreviewPage]);

  const dataPreviewRange = useMemo(() => {
    if (!rawData.length) {
      return { start: 0, end: 0 };
    }

    const start = (safeDataPreviewPage - 1) * DEFAULTS.dataPreviewPageSize + 1;
    const end = Math.min(safeDataPreviewPage * DEFAULTS.dataPreviewPageSize, rawData.length);
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

    combinedRows = sortRawRows(combinedRows);

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

    const parsedRows = sortRawRows(await parseCsvFiles(files));

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
    setPlantingEndDate(fileEndDate > maxPlantingEndDate ? maxPlantingEndDate : fileEndDate);
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

  const onLatitudeChange = (value: string) => {
    setLatitude(parseNumberInput(value, DEFAULTS.latitude));
  };

  const onLongitudeChange = (value: string) => {
    setLongitude(parseNumberInput(value, DEFAULTS.longitude));
  };

  const onTbaseChange = (value: string) => {
    setTbase(parseNumberInput(value, DEFAULTS.tbase));
  };

  const onCumhuChange = (value: string) => {
    setCumhu(parseNumberInput(value, DEFAULTS.cumhu));
  };

  const onCommodityChange = (value: string) => {
    if (!commodityOptions.includes(value as Commodity)) {
      return;
    }

    const nextCommodity = value as Commodity;
    const prefs = commodityPreferences[nextCommodity];
    setCommodity(nextCommodity);
    setTbase(prefs.tbase);
    setCumhu(prefs.cumhu);
  };

  const onPlantingEndDateChange = (value: string) => {
    setPlantingEndDate(value > maxPlantingEndDate ? maxPlantingEndDate : value);
  };

  return {
    activeTab,
    dataSourceMode,
    commodity,
    tbase,
    cumhu,
    latitude,
    longitude,
    csvSourceRows,
    csvFileStartDate,
    plantingStartDate,
    plantingEndDate,
    maxPlantingEndDate,
    todayMarkerDate,
    pagedRawData,
    rawData,
    safeDataPreviewPage,
    totalDataPreviewPages,
    dataPreviewRange,
    humidityRows,
    tempRows,
    cumulativeHuRows,
    forecastCumulativeRows,
    forecastEnabled,
    currentHu,
    harvestInfo,
    forecastStatus,
    setActiveTab,
    setPlantingStartDate,
    setDataPreviewPage,
    switchDataSourceMode,
    handleFileUpload,
    reloadCsvData,
    onLatitudeChange,
    onLongitudeChange,
    onTbaseChange,
    onCumhuChange,
    onCommodityChange,
    onPlantingEndDateChange,
    loadLocationData,
  };
}
