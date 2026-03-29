export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseNumberInput(value: string, fallback: number): number {
  if (value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
