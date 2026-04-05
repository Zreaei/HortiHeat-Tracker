"use client";

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

export default function HomePage() {
  const {
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
    onCommodityChange,
    onTbaseChange,
    onCumhuChange,
    loadLocationData,
  } = useHeatTracker();

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
              tbase={tbase}
              cumhu={cumhu}
              csvFileStartDate={csvFileStartDate}
              mapsLink={mapsLink}
              mapsLinkFeedback={mapsLinkFeedback}
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
              tbase={tbase}
              cumhu={cumhu}
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
        />

        <section className="mt-5 rounded-2xl border border-(--line) bg-white/65 p-4 md:p-6">
          {activeTab === "Data Preview" && (
            <DataPreviewPanel
              rows={pagedRawData}
              exportRows={rawData}
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
                downloadFileName="temperature-trends"
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
                downloadFileName="heat-units"
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

              <ForecastSummaryCard currentHu={currentHu} cumhu={cumhu} harvestInfo={harvestInfo} />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
