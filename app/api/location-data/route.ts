import { NextResponse } from "next/server";
import { addDays, localDateLabel } from "../_shared/date";
import {
  areCoordinatesInvalid,
  areCoordinatesOutOfRange,
  isDateRangeInvalid,
} from "../_shared/validation";

type OpenMeteoHourly = {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
  };
};

function splitDateRange(startDate: string, endDate: string, chunkDays: number): Array<{ start: string; end: string }> {
  const ranges: Array<{ start: string; end: string }> = [];
  let cursor = new Date(`${startDate}T00:00:00`);
  const target = new Date(`${endDate}T00:00:00`);

  while (cursor <= target) {
    const chunkStart = new Date(cursor);
    const chunkEnd = addDays(chunkStart, chunkDays - 1);
    const boundedEnd = chunkEnd <= target ? chunkEnd : target;

    ranges.push({
      start: localDateLabel(chunkStart),
      end: localDateLabel(boundedEnd),
    });

    cursor = addDays(boundedEnd, 1);
  }

  return ranges;
}

function toUsDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function toTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (areCoordinatesInvalid(latitude, longitude)) {
    return NextResponse.json(
      { error: "latitude and longitude query parameters are required." },
      { status: 400 }
    );
  }

  if (areCoordinatesOutOfRange(latitude, longitude)) {
    return NextResponse.json(
      { error: "Invalid coordinates. Latitude must be [-90, 90] and longitude [-180, 180]." },
      { status: 400 }
    );
  }

  if (isDateRangeInvalid(startDate, endDate)) {
    return NextResponse.json(
      { error: "startDate and endDate must be provided and startDate <= endDate." },
      { status: 400 }
    );
  }

  const today = localDateLabel(new Date());
  const yesterday = localDateLabel(addDays(new Date(), -1));
  const maxEndDate = localDateLabel(addDays(new Date(), 15));

  if (endDate > maxEndDate) {
    return NextResponse.json(
      { error: `endDate cannot exceed ${maxEndDate}.` },
      { status: 400 }
    );
  }

  try {
    const rows: Array<{ Date: string; Time: string; Temperature: number; Humidity: number }> = [];

    if (startDate <= yesterday) {
      const archiveEndDate = endDate < yesterday ? endDate : yesterday;
      const archiveRanges = splitDateRange(startDate, archiveEndDate, 90);

      for (const range of archiveRanges) {
        const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive");
        archiveUrl.searchParams.set("latitude", String(latitude));
        archiveUrl.searchParams.set("longitude", String(longitude));
        archiveUrl.searchParams.set("hourly", "temperature_2m,relative_humidity_2m");
        archiveUrl.searchParams.set("start_date", range.start);
        archiveUrl.searchParams.set("end_date", range.end);
        archiveUrl.searchParams.set("timezone", "auto");

        const archiveResponse = await fetch(archiveUrl.toString(), { cache: "no-store" });

        if (!archiveResponse.ok) {
          return NextResponse.json(
            {
              error: `Failed to fetch historical hourly weather data from Open-Meteo archive for ${range.start} to ${range.end}.`,
            },
            { status: archiveResponse.status }
          );
        }

        const archiveData = (await archiveResponse.json()) as OpenMeteoHourly;
        const archiveHourly = archiveData.hourly;

        if (
          !archiveHourly ||
          !archiveHourly.time ||
          !archiveHourly.temperature_2m ||
          !archiveHourly.relative_humidity_2m
        ) {
          return NextResponse.json(
            { error: "Open-Meteo archive response is missing hourly fields." },
            { status: 502 }
          );
        }

        rows.push(
          ...archiveHourly.time.map((time, idx) => {
            const parsed = new Date(time);
            return {
              Date: toUsDate(parsed),
              Time: toTime(parsed),
              Temperature: archiveHourly.temperature_2m[idx],
              Humidity: archiveHourly.relative_humidity_2m[idx],
            };
          })
        );
      }
    }

    if (endDate >= today) {
      const forecastStartDate = startDate > today ? startDate : today;

      if (forecastStartDate <= endDate) {
        const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
        forecastUrl.searchParams.set("latitude", String(latitude));
        forecastUrl.searchParams.set("longitude", String(longitude));
        forecastUrl.searchParams.set("hourly", "temperature_2m,relative_humidity_2m");
        forecastUrl.searchParams.set("start_date", forecastStartDate);
        forecastUrl.searchParams.set("end_date", endDate);
        forecastUrl.searchParams.set("timezone", "auto");

        const forecastResponse = await fetch(forecastUrl.toString(), { cache: "no-store" });

        if (!forecastResponse.ok) {
          return NextResponse.json(
            { error: "Failed to fetch forecast hourly weather data from Open-Meteo." },
            { status: forecastResponse.status }
          );
        }

        const forecastData = (await forecastResponse.json()) as OpenMeteoHourly;
        const forecastHourly = forecastData.hourly;

        if (
          !forecastHourly ||
          !forecastHourly.time ||
          !forecastHourly.temperature_2m ||
          !forecastHourly.relative_humidity_2m
        ) {
          return NextResponse.json(
            { error: "Open-Meteo forecast response is missing hourly fields." },
            { status: 502 }
          );
        }

        rows.push(
          ...forecastHourly.time.map((time, idx) => {
            const parsed = new Date(time);
            return {
              Date: toUsDate(parsed),
              Time: toTime(parsed),
              Temperature: forecastHourly.temperature_2m[idx],
              Humidity: forecastHourly.relative_humidity_2m[idx],
            };
          })
        );
      }
    }

    const deduped = Array.from(
      new Map(
        rows.map((row) => [`${row.Date} ${row.Time}`, row])
      ).values()
    );

    const cleanRows = deduped.filter(
      (row) => Number.isFinite(row.Temperature) && Number.isFinite(row.Humidity)
    );

    return NextResponse.json(cleanRows);
  } catch {
    return NextResponse.json({ error: "Location weather request failed." }, { status: 500 });
  }
}
