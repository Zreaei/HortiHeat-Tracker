export function localDateLabel(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDate(dateText: string, timeText: string): Date | null {
  const [month, day, year] = dateText.split("/").map((part) => Number(part));
  const [hh, mm, ss] = timeText.split(":").map((part) => Number(part));

  if ([month, day, year, hh, mm, ss].some((n) => Number.isNaN(n))) {
    return null;
  }

  const normalizedYear = year < 100 ? 2000 + year : year;
  return new Date(normalizedYear, month - 1, day, hh, mm, ss);
}
