import type { RawRow } from "../types";
import { parseDate } from "./date";
import Papa from "papaparse";

type CsvTable = string[][];

function normalizeCell(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeHeader(value: string | undefined): string {
  return normalizeCell(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsvNumber(value: string | undefined): number {
  const cleaned = normalizeCell(value).replace(/[%°\s]/g, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function findHeaderRow(rows: CsvTable): number {
  return rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    const hasDate = normalized.some((cell) => cell === "date" || cell.includes("date") || cell === "timestamp");
    const hasTime = normalized.some((cell) => cell === "time");
    const hasTemp = normalized.some((cell) => cell.includes("temp"));
    const hasHumidity = normalized.some((cell) => cell.includes("humid"));

    return hasTemp && hasHumidity && (hasDate || hasTime || normalized.some((cell) => cell.includes("datetime")));
  });
}

function parseRowFromColumns(columns: string[]): RawRow | null {
  const cleaned = columns.map(normalizeCell);

  if (cleaned.length < 3) {
    return null;
  }

  const dateCandidate = cleaned[0] ?? "";
  const timeCandidate = cleaned[1] ?? "";
  const temperatureCandidate = cleaned[2] ?? "";
  const humidityCandidate = cleaned[3] ?? "";

  const parsedDate = parseDate(dateCandidate, timeCandidate);
  const temperature = parseCsvNumber(temperatureCandidate);
  const humidity = parseCsvNumber(humidityCandidate);

  if (!parsedDate || Number.isNaN(temperature) || Number.isNaN(humidity)) {
    return null;
  }

  return {
    Date: dateCandidate,
    Time: timeCandidate,
    Temperature: temperature,
    Humidity: humidity,
  };
}

export async function parseCsvFiles(files: FileList): Promise<RawRow[]> {
  const parsedRows: RawRow[] = [];

  for (const file of Array.from(files)) {
    const text = await file.text();

    const table = Papa.parse<string[]>(text, {
      delimiter: "",
      skipEmptyLines: "greedy",
    }).data as CsvTable;

    const headerRowIndex = findHeaderRow(table);

    if (headerRowIndex >= 0) {
      const headers = table[headerRowIndex].map(normalizeHeader);
      const dateIndex = headers.findIndex((cell) => cell === "date" || cell.includes("date"));
      const timeIndex = headers.findIndex((cell) => cell === "time");
      const dateTimeIndex = headers.findIndex((cell) => cell.includes("datetime") || cell.includes("timestamp") || cell === "date time");
      const temperatureIndex = headers.findIndex((cell) => cell.includes("temp"));
      const humidityIndex = headers.findIndex((cell) => cell.includes("humid"));

      for (const row of table.slice(headerRowIndex + 1)) {
        const cleaned = row.map(normalizeCell);
        if (!cleaned.some(Boolean)) {
          continue;
        }

        const parsedDate = dateTimeIndex >= 0 ? parseDate(cleaned[dateTimeIndex], "") : parseDate(cleaned[dateIndex], cleaned[timeIndex]);
        const temperature = parseCsvNumber(cleaned[temperatureIndex]);
        const humidity = parseCsvNumber(cleaned[humidityIndex]);

        if (!parsedDate || Number.isNaN(temperature) || Number.isNaN(humidity)) {
          continue;
        }

        parsedRows.push({
          Date: cleaned[dateIndex] ?? cleaned[dateTimeIndex] ?? "",
          Time: cleaned[timeIndex] ?? "",
          Temperature: temperature,
          Humidity: humidity,
        });
      }

      continue;
    }

    for (const row of table) {
      const parsed = parseRowFromColumns(row);
      if (parsed) {
        parsedRows.push(parsed);
      }
    }
  }

  return parsedRows;
}
