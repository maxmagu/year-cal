import type { CalendarEvent } from './types.js';

export interface EventDataItem {
  startDate: Date;
  endDate: Date;
  color?: string;
  calendarEvent: CalendarEvent;
  calendarUrl: string;
}

// Uses year/month/date components instead of toISOString() so the key is always
// based on local time — toISOString() would shift dates in UTC+ timezones.
export const fmtDayKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function isMultiDay(event: CalendarEvent): boolean {
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  return fmtDayKey(start) !== fmtDayKey(end);
}

// Returns a Mon-start flat array of cells for a month's grid.
// Cells before the 1st and after the last day are null (padding).
export function getMonthDays(year: number, month: number): (Date | null)[] {
  // getDay() returns 0=Sun; +6 % 7 converts to 0=Mon offset
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
