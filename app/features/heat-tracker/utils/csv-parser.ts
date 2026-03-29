import type { RawRow } from "../types";

const CSV_DATA_START_LINE = 37;

export async function parseCsvFiles(files: FileList): Promise<RawRow[]> {
  const parsedRows: RawRow[] = [];

  for (const file of Array.from(files)) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).slice(CSV_DATA_START_LINE);

    lines.forEach((line) => {
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

  return parsedRows;
}
