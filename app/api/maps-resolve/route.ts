import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.maps.google.com",
  "goo.gl",
]);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCoordinates(text: string): { latitude: number; longitude: number } | null {
  const patterns: RegExp[] = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /center=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue;
    }

    return { latitude, longitude };
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = (searchParams.get("url") ?? "").trim();

  if (!rawUrl) {
    return NextResponse.json({ error: "url query parameter is required." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
  }

  if (!(targetUrl.protocol === "https:" || targetUrl.protocol === "http:")) {
    return NextResponse.json({ error: "Only HTTP(S) URLs are allowed." }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname.toLowerCase())) {
    return NextResponse.json({ error: "Only Google Maps links are supported." }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to resolve Google Maps link." },
        { status: response.status }
      );
    }

    const resolvedUrl = response.url || targetUrl.toString();
    const fromUrl = parseCoordinates(safeDecode(resolvedUrl));

    if (fromUrl) {
      return NextResponse.json({ resolvedUrl, ...fromUrl });
    }

    const bodyText = await response.text();
    const fromBody = parseCoordinates(bodyText) ?? parseCoordinates(safeDecode(bodyText));

    return NextResponse.json({
      resolvedUrl,
      latitude: fromBody?.latitude,
      longitude: fromBody?.longitude,
    });
  } catch {
    return NextResponse.json({ error: "Google Maps link resolution failed." }, { status: 502 });
  }
}
