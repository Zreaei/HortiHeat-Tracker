"use client";

import { useMemo, useState } from "react";
import { CsvSourceForm } from "./features/heat-tracker/components/CsvSourceForm";
import { DataPreviewPanel } from "./features/heat-tracker/components/DataPreviewPanel";
import { DataTable } from "./features/heat-tracker/components/DataTable";
import { ForecastSummaryCard } from "./features/heat-tracker/components/ForecastSummaryCard";
import { LinePanel } from "./features/heat-tracker/components/LinePanel";
import { LocationSourceForm } from "./features/heat-tracker/components/LocationSourceForm";
import { SourceModeToggle } from "./features/heat-tracker/components/SourceModeToggle";
import { TabNavigation } from "./features/heat-tracker/components/TabNavigation";
import { tabs } from "./features/heat-tracker/constants";
import { useHeatTracker } from "./features/heat-tracker/hooks/useHeatTracker";
import type { DownloadOption } from "./features/heat-tracker/types";
import { downloadCsv } from "./features/heat-tracker/utils/csv";

export default function HomePage() {
  const TABLE_PAGE_SIZE = 50;

  const {
    activeTab,
    dataSourceMode,
    commodity,
    cumhu,
    tbaseInput,
    cumhuInput,
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
    preprocessedRows,
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
    onCommodityChange,
    onTbaseChange,
    onCumhuChange,
    loadLocationData,
  } = useHeatTracker();

  const [downloadOption, setDownloadOption] = useState<DownloadOption>("Raw Data");
  const [humidityPage, setHumidityPage] = useState<number>(1);
  const [temperaturePage, setTemperaturePage] = useState<number>(1);
  const [heatUnitsPage, setHeatUnitsPage] = useState<number>(1);

  const downloadableDatasets = useMemo<Record<DownloadOption, object[]>>(
    () => ({
      "Raw Data": rawData,
      "Humidity data": humidityRows,
      "Temperature data": tempRows,
      "Heat Units data": cumulativeHuRows,
      "Complete Dataset": preprocessedRows,
    }),
    [rawData, humidityRows, tempRows, cumulativeHuRows, preprocessedRows]
  );

  const downloadFileNames: Record<DownloadOption, string> = {
    "Raw Data": "raw-data.csv",
    "Humidity data": "humidity-data.csv",
    "Temperature data": "temperature-data.csv",
    "Heat Units data": "heat-units-data.csv",
    "Complete Dataset": "complete-dataset.csv",
  };

  const humidityTableRows = useMemo(
    () =>
      humidityRows.map((row) => ({
        Date: row.date,
        "Average Humidity (%)": row.daily_avg_humid,
        "Maximum Humidity (%)": row.daily_max_humid,
        "Minimum Humidity (%)": row.daily_min_humid,
      })),
    [humidityRows]
  );

  const temperatureTableRows = useMemo(
    () =>
      tempRows.map((row) => ({
        Date: row.date,
        "Average Temperature (C)": row.daily_avg_temp,
        "Maximum Temperature (C)": row.daily_max_temp,
        "Minimum Temperature (C)": row.daily_min_temp,
      })),
    [tempRows]
  );

  const heatUnitsTableRows = useMemo(
    () =>
      cumulativeHuRows.map((row) => ({
        Date: row.date,
        "Maximum Temperature (C)": row.max_temp,
        "Average Temperature (C)": row.avg_temp,
        "Minimum Temperature (C)": row.min_temp,
        "Daily Heat Units": row.hu_t,
        "Cumulative Heat Units": row.cumul_hu,
      })),
    [cumulativeHuRows]
  );

  const totalHumidityPages = Math.max(1, Math.ceil(humidityTableRows.length / TABLE_PAGE_SIZE));
  const safeHumidityPage = Math.min(humidityPage, totalHumidityPages);
  const pagedHumidityRows = useMemo(() => {
    const start = (safeHumidityPage - 1) * TABLE_PAGE_SIZE;
    return humidityTableRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [humidityTableRows, safeHumidityPage]);
  const humidityRange = useMemo(() => {
    if (!humidityTableRows.length) {
      return { start: 0, end: 0 };
    }
    const start = (safeHumidityPage - 1) * TABLE_PAGE_SIZE + 1;
    const end = Math.min(safeHumidityPage * TABLE_PAGE_SIZE, humidityTableRows.length);
    return { start, end };
  }, [humidityTableRows.length, safeHumidityPage]);

  const totalTemperaturePages = Math.max(1, Math.ceil(temperatureTableRows.length / TABLE_PAGE_SIZE));
  const safeTemperaturePage = Math.min(temperaturePage, totalTemperaturePages);
  const pagedTemperatureRows = useMemo(() => {
    const start = (safeTemperaturePage - 1) * TABLE_PAGE_SIZE;
    return temperatureTableRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [temperatureTableRows, safeTemperaturePage]);
  const temperatureRange = useMemo(() => {
    if (!temperatureTableRows.length) {
      return { start: 0, end: 0 };
    }
    const start = (safeTemperaturePage - 1) * TABLE_PAGE_SIZE + 1;
    const end = Math.min(safeTemperaturePage * TABLE_PAGE_SIZE, temperatureTableRows.length);
    return { start, end };
  }, [temperatureTableRows.length, safeTemperaturePage]);

  const totalHeatUnitsPages = Math.max(1, Math.ceil(heatUnitsTableRows.length / TABLE_PAGE_SIZE));
  const safeHeatUnitsPage = Math.min(heatUnitsPage, totalHeatUnitsPages);
  const pagedHeatUnitsRows = useMemo(() => {
    const start = (safeHeatUnitsPage - 1) * TABLE_PAGE_SIZE;
    return heatUnitsTableRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [heatUnitsTableRows, safeHeatUnitsPage]);
  const heatUnitsRange = useMemo(() => {
    if (!heatUnitsTableRows.length) {
      return { start: 0, end: 0 };
    }
    const start = (safeHeatUnitsPage - 1) * TABLE_PAGE_SIZE + 1;
    const end = Math.min(safeHeatUnitsPage * TABLE_PAGE_SIZE, heatUnitsTableRows.length);
    return { start, end };
  }, [heatUnitsTableRows.length, safeHeatUnitsPage]);

  const onDownloadDataset = () => {
    const rows = downloadableDatasets[downloadOption];
    if (!rows.length) {
      return;
    }

    downloadCsv(rows, downloadFileNames[downloadOption]);
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
          <SourceModeToggle dataSourceMode={dataSourceMode} onSwitch={switchDataSourceMode} />
          {dataSourceMode === "csv" ? (
            <CsvSourceForm
              commodity={commodity}
              latitude={latitude}
              longitude={longitude}
              tbaseInput={tbaseInput}
              cumhuInput={cumhuInput}
              csvFileStartDate={csvFileStartDate}
              mapsLink={mapsLink}
              mapsLinkFeedback={mapsLinkFeedback}
              hasResolvedMapsCoordinates={hasResolvedMapsCoordinates}
              hasCsvData={csvSourceRows.length > 0}
              onFileUpload={handleFileUpload}
              onMapsLinkChange={onMapsLinkChange}
              onApplyMapsLink={applyMapsLink}
              onCommodityChange={onCommodityChange}
              onTbaseChange={onTbaseChange}
              onCumhuChange={onCumhuChange}
              onReload={reloadCsvData}
            />
          ) : (
            <LocationSourceForm
              commodity={commodity}
              latitude={latitude}
              longitude={longitude}
              mapsLink={mapsLink}
              mapsLinkFeedback={mapsLinkFeedback}
              hasResolvedMapsCoordinates={hasResolvedMapsCoordinates}
              tbaseInput={tbaseInput}
              cumhuInput={cumhuInput}
              plantingStartDate={plantingStartDate}
              maxAvailableDate={maxAvailableDate}
              onMapsLinkChange={onMapsLinkChange}
              onApplyMapsLink={applyMapsLink}
              onCommodityChange={onCommodityChange}
              onTbaseChange={onTbaseChange}
              onCumhuChange={onCumhuChange}
              onPlantingStartDateChange={setPlantingStartDate}
              onLoadData={loadLocationData}
            />
          )}
        </section>

        <p className="mt-4 text-sm text-(--ink-soft)">{forecastStatus}</p>

        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          forecastEnabled={forecastEnabled}
          onSelect={setActiveTab}
          actions={
            <>
              <select
                value={downloadOption}
                onChange={(e) => setDownloadOption(e.target.value as DownloadOption)}
                className="rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
              >
                <option value="Raw Data">Raw Data</option>
                <option value="Humidity data">Humidity data</option>
                <option value="Temperature data">Temperature data</option>
                <option value="Heat Units data">Heat Units data</option>
                <option value="Complete Dataset">Complete Dataset</option>
              </select>
              <button
                type="button"
                onClick={onDownloadDataset}
                disabled={!downloadableDatasets[downloadOption].length}
                className="rounded-lg border border-(--line) bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Download Dataset
              </button>
            </>
          }
        />

        <section className="mt-5 rounded-2xl border border-(--line) bg-white/65 p-4 md:p-6">
          {activeTab === "Data Preview" && (
            <DataPreviewPanel
              rows={pagedRawData}
              totalRows={rawData.length}
              page={safeDataPreviewPage}
              totalPages={totalDataPreviewPages}
              rangeStart={dataPreviewRange.start}
              rangeEnd={dataPreviewRange.end}
              onPrevPage={() => setDataPreviewPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() =>
                setDataPreviewPage((prev) => Math.min(totalDataPreviewPages, prev + 1))
              }
            />
          )}

          {activeTab === "Humidity (%)" && (
            <>
              <LinePanel
                data={humidityRows}
                yDomain={[0, 100]}
                title="Daily Humidity Trends"
                downloadFileName="humidity-trends"
                todayMarkerDate={todayMarkerDate}
                lines={[
                  { dataKey: "daily_max_humid", name: "Max Humidity", color: "#d64532" },
                  { dataKey: "daily_avg_humid", name: "Avg Humidity", color: "#13212c" },
                  { dataKey: "daily_min_humid", name: "Min Humidity", color: "#3478b5" },
                ]}
              />
              <DataTable rows={pagedHumidityRows} />
              {humidityTableRows.length > TABLE_PAGE_SIZE ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-(--ink-soft)">
                  <p>
                    Showing {humidityRange.start}-{humidityRange.end} of {humidityTableRows.length} rows
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHumidityPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeHumidityPage <= 1}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="mono text-xs uppercase tracking-wide">
                      Page {safeHumidityPage} / {totalHumidityPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setHumidityPage((prev) => Math.min(totalHumidityPages, prev + 1))
                      }
                      disabled={safeHumidityPage >= totalHumidityPages}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {activeTab === "Temperature (C)" && (
            <>
              <LinePanel
                data={tempRows}
                yDomain={[0, 50]}
                title="Daily Temperature Trends"
                downloadFileName="temperature-trends"
                todayMarkerDate={todayMarkerDate}
                lines={[
                  { dataKey: "daily_max_temp", name: "Max Temperature", color: "#d64532" },
                  { dataKey: "daily_avg_temp", name: "Avg Temperature", color: "#13212c" },
                  { dataKey: "daily_min_temp", name: "Min Temperature", color: "#3478b5" },
                ]}
              />
              <DataTable rows={pagedTemperatureRows} />
              {temperatureTableRows.length > TABLE_PAGE_SIZE ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-(--ink-soft)">
                  <p>
                    Showing {temperatureRange.start}-{temperatureRange.end} of {temperatureTableRows.length} rows
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTemperaturePage((prev) => Math.max(1, prev - 1))}
                      disabled={safeTemperaturePage <= 1}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="mono text-xs uppercase tracking-wide">
                      Page {safeTemperaturePage} / {totalTemperaturePages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTemperaturePage((prev) => Math.min(totalTemperaturePages, prev + 1))
                      }
                      disabled={safeTemperaturePage >= totalTemperaturePages}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {activeTab === "Heat Units" && (
            <>
              <LinePanel
                data={cumulativeHuRows}
                yDomain={undefined}
                title="Cumulative Heat Units Over Time"
                downloadFileName="heat-units"
                todayMarkerDate={todayMarkerDate}
                lines={[{ dataKey: "cumul_hu", name: "Cumulative Heat Unit", color: "#d64532" }]}
                threshold={cumhu}
              />
              <DataTable rows={pagedHeatUnitsRows} />
              {heatUnitsTableRows.length > TABLE_PAGE_SIZE ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-(--ink-soft)">
                  <p>
                    Showing {heatUnitsRange.start}-{heatUnitsRange.end} of {heatUnitsTableRows.length} rows
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHeatUnitsPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeHeatUnitsPage <= 1}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="mono text-xs uppercase tracking-wide">
                      Page {safeHeatUnitsPage} / {totalHeatUnitsPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setHeatUnitsPage((prev) => Math.min(totalHeatUnitsPages, prev + 1))
                      }
                      disabled={safeHeatUnitsPage >= totalHeatUnitsPages}
                      className="rounded-md border border-(--line) bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
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
                    { dataKey: "cumul_hu", name: "Observed + Forecast Heat Unit", color: "#1d4ed8" },
                  ]}
                  threshold={cumhu}
                />
              </div>

              <ForecastSummaryCard currentHu={currentHu} cumhu={cumhu} harvestInfo={harvestInfo} />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
