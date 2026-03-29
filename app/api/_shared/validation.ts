export function areCoordinatesInvalid(latitude: number, longitude: number): boolean {
  return Number.isNaN(latitude) || Number.isNaN(longitude);
}

export function areCoordinatesOutOfRange(latitude: number, longitude: number): boolean {
  return latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180;
}

export function isDateRangeInvalid(startDate: string, endDate: string): boolean {
  return !startDate || !endDate || startDate > endDate;
}
