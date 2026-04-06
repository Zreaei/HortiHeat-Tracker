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
  const [tbase, setTbase] = useState<number>(commodityPreferences[DEFAULTS.commodity].tbase);
  const [cumhu, setCumhu] = useState<number>(commodityPreferences[DEFAULTS.commodity].cumhu);
  const [latitude, setLatitude] = useState<number>(Number.NaN);
  const [longitude, setLongitude] = useState<number>(Number.NaN);
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [csvSourceRows, setCsvSourceRows] = useState<RawRow[]>([]);
  const [csvFileStartDate, setCsvFileStartDate] = useState<string>("");
  const [csvFileEndDate, setCsvFileEndDate] = useState<string>("");
  const [mapsLink, setMapsLink] = useState<string>("");
  const [mapsLinkFeedback, setMapsLinkFeedback] = useState<string>();
  const [hasResolvedMapsCoordinates, setHasResolvedMapsCoordinates] = useState<boolean>(false);
  const [dataPreviewPage, setDataPreviewPage] = useState<number>(1);
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
  const [forecastStatus, setForecastStatus] = useState<string>();

  const todayIso = localDateLabel(new Date());
  const maxAvailableDate = localDateLabel(addDays(new Date(), 15));
  const [plantingStartDate, setPlantingStartDate] = useState<string>(todayIso);
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

  const applyCsvRange = async (sourceRows: RawRow[], rangeStartDate: string, sourceLastDate: string) => {
    if (!sourceRows.length) {
      setRawData([]);
      setForecastRows([]);
      setForecastStatus("Please upload a CSV file first.");
      return;
    }

    if (rangeStartDate > maxAvailableDate) {
      setForecastStatus(`Planting start date cannot exceed ${maxAvailableDate}.`);
      return;
    }

    const effectiveEndDate = maxAvailableDate;

    const csvRowsInRange = sourceRows.filter((row) => {
      const parsed = parseDate(row.Date, row.Time);
      if (!parsed) {
        return false;
      }

      const key = localDateLabel(parsed);
      return key >= rangeStartDate && key <= sourceLastDate && key <= effectiveEndDate;
    });

    let combinedRows = [...csvRowsInRange];
    let extensionCount = 0;
    let extensionNote = "";

    if (effectiveEndDate > sourceLastDate) {
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        extensionNote = " Open-Meteo continuation skipped due to invalid coordinates.";
      } else {
        const continuationStart =
          rangeStartDate > sourceLastDate
            ? rangeStartDate
            : localDateLabel(addDays(new Date(`${sourceLastDate}T00:00:00`), 1));

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
    setForecastStatus(`${combinedRows.length} records loaded for ${rangeStartDate} to ${effectiveEndDate}.${extensionNote}`);
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
    await applyCsvRange(parsedRows, fileStartDate, fileEndDate);
  };

  const reloadCsvData = async () => {
    if (!csvSourceRows.length || !csvFileStartDate || !csvFileEndDate) {
      setForecastStatus("Please upload a CSV file first.");
      return;
    }

    await applyCsvRange(csvSourceRows, csvFileStartDate, csvFileEndDate);
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
    setForecastStatus(undefined);
    setActiveTab("Data Preview");
  };

  const loadLocationData = async () => {
    if (!plantingStartDate) {
      setForecastStatus("Please select planting start date.");
      return;
    }

    if (plantingStartDate > maxAvailableDate) {
      setForecastStatus(`Planting start date cannot exceed ${maxAvailableDate}.`);
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
        endDate: maxAvailableDate,
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
        `${payload.length} location records loaded for (${latitude.toFixed(5)}, ${longitude.toFixed(5)}).`
      );
    } catch {
      setForecastStatus("Location data request failed.");
    }
  };

  const parseCoordinatesFromText = (value: string): { lat: number; lon: number } | null => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const plainPair = normalized.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (plainPair) {
      const lat = Number(plainPair[1]);
      const lon = Number(plainPair[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
      return null;
    }

    const patterns: RegExp[] = [
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      /\/maps\/search\/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/,
      /\/maps\/search\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (!match) {
        continue;
      }

      const lat = Number(match[1]);
      const lon = Number(match[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
      }

      return { lat, lon };
    }

    return null;
  };

  const onMapsLinkChange = (value: string) => {
    setMapsLink(value);
    setMapsLinkFeedback(undefined);
    setHasResolvedMapsCoordinates(false);
  };

  const applyMapsLink = async () => {
    const directParsed = parseCoordinatesFromText(mapsLink);
    if (directParsed) {
      setLatitude(directParsed.lat);
      setLongitude(directParsed.lon);
      setMapsLinkFeedback(`Coordinates detected: ${directParsed.lat.toFixed(5)}, ${directParsed.lon.toFixed(5)}`);
      setHasResolvedMapsCoordinates(true);
      return;
    }

    setMapsLinkFeedback("Resolving shortened Google Maps link...");

    try {
      const params = new URLSearchParams({ url: mapsLink.trim() });
      const response = await fetch(`/api/maps-resolve?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        error?: string;
        resolvedUrl?: string;
        latitude?: number;
        longitude?: number;
      };

      if (!response.ok || !payload.resolvedUrl) {
        setMapsLinkFeedback(payload.error ?? "Unable to resolve Google Maps link.");
        setHasResolvedMapsCoordinates(false);
        return;
      }

      if (Number.isFinite(payload.latitude) && Number.isFinite(payload.longitude)) {
        const lat = Number(payload.latitude);
        const lon = Number(payload.longitude);
        setLatitude(lat);
        setLongitude(lon);
        setMapsLinkFeedback(`Coordinates detected: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        setHasResolvedMapsCoordinates(true);
        return;
      }

      const resolvedParsed = parseCoordinatesFromText(payload.resolvedUrl);
      if (!resolvedParsed) {
        setMapsLinkFeedback("Link resolved, but coordinates were not found. Try opening the pin in Google Maps and copy the full URL.");
        setHasResolvedMapsCoordinates(false);
        return;
      }

      setLatitude(resolvedParsed.lat);
      setLongitude(resolvedParsed.lon);
      setMapsLinkFeedback(
        `Coordinates detected: ${resolvedParsed.lat.toFixed(5)}, ${resolvedParsed.lon.toFixed(5)}`
      );
      setHasResolvedMapsCoordinates(true);
    } catch {
      setMapsLinkFeedback("Unable to resolve Google Maps link right now. Please try again.");
      setHasResolvedMapsCoordinates(false);
    }
  };

  const onTbaseChange = (value: string) => {
    setTbase(parseNumberInput(value, commodityPreferences[commodity].tbase));
  };

  const onCumhuChange = (value: string) => {
    setCumhu(parseNumberInput(value, commodityPreferences[commodity].cumhu));
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

  return {
    activeTab,
    dataSourceMode,
    commodity,
    tbase,
    cumhu,
    latitude,
    longitude,
    mapsLink,
    mapsLinkFeedback,
    hasResolvedMapsCoordinates,
    csvSourceRows,
    csvFileStartDate,
    plantingStartDate,
    maxAvailableDate,
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
    onMapsLinkChange,
    applyMapsLink,
    onTbaseChange,
    onCumhuChange,
    onCommodityChange,
    loadLocationData,
  };
}
