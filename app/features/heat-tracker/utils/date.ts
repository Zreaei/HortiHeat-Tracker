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
  const trimWrappedQuotes = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  };

  const cleanedDate = trimWrappedQuotes(dateText);
  const cleanedTime = trimWrappedQuotes(timeText);

  if (!cleanedDate) {
    return null;
  }

  let datePart = cleanedDate;
  let timePart = cleanedTime;

  if (!timePart) {
    const combinedMatch = cleanedDate.match(
      /^(.+?)[ T](\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)$/i
    );

    if (combinedMatch) {
      datePart = combinedMatch[1].trim();
      timePart = combinedMatch[2].trim();
    }
  }

  const dateParts = datePart.split(/[/-]/).map((part) => Number(part));
  let year: number;
  let month: number;
  let day: number;

  if (dateParts.length === 3 && datePart.includes("-") && dateParts[0] > 31) {
    [year, month, day] = dateParts;
  } else if (dateParts.length === 3) {
    [month, day, year] = dateParts;
  } else {
    return null;
  }

  if ([year, month, day].some((n) => Number.isNaN(n))) {
    return null;
  }

  const normalizedYear = year < 100 ? 2000 + year : year;

  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i);
  if (!timeMatch) {
    return new Date(normalizedYear, month - 1, day);
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const meridiem = timeMatch[4]?.toUpperCase();

  if ([hour, minute, second].some((n) => Number.isNaN(n))) {
    return null;
  }

  if (meridiem === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else if (meridiem === "PM") {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return new Date(normalizedYear, month - 1, day, hour, minute, second);
}
