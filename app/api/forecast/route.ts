import { NextResponse } from "next/server";

type OpenMeteoForecast = {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_mean: number[];
    temperature_2m_min: number[];
  };
};

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json(
      { error: "latitude and longitude query parameters are required." },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: "Invalid coordinates. Latitude must be [-90, 90] and longitude [-180, 180]." },
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate query parameters are required." },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "startDate must be earlier than or equal to endDate." },
      { status: 400 }
    );
  }

  const today = localDateLabel(new Date());
  const maxEndDate = localDateLabel(addDays(new Date(), 15));

  if (endDate > maxEndDate) {
    return NextResponse.json(
      { error: `endDate cannot exceed ${maxEndDate}.` },
      { status: 400 }
    );
  }

  const forecastStartDate = startDate > today ? startDate : today;

  if (endDate < forecastStartDate) {
    return NextResponse.json([]);
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_mean,temperature_2m_min");
  url.searchParams.set("start_date", forecastStartDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch forecast data from Open-Meteo." },
        { status: response.status }
      );
    }

    const data = (await response.json()) as OpenMeteoForecast;
    const daily = data.daily;

    if (
      !daily ||
      !daily.time ||
      !daily.temperature_2m_max ||
      !daily.temperature_2m_mean ||
      !daily.temperature_2m_min
    ) {
      return NextResponse.json(
        { error: "Open-Meteo response is missing daily forecast fields." },
        { status: 502 }
      );
    }

    const normalized = daily.time.map((date, idx) => ({
      date,
      max_temp: daily.temperature_2m_max[idx],
      avg_temp: daily.temperature_2m_mean[idx],
      min_temp: daily.temperature_2m_min[idx],
    }));

    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({ error: "Forecast request failed." }, { status: 500 });
  }
}