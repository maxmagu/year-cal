export interface CalendarEvent {
  id: string;
  url: string;       // CalDAV resource URL — used as stable identifier for updates/deletes
  etag: string;      // Opaque concurrency token — must be echoed back on write (412 on conflict)
  calendarUrl: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string; // ISO 8601; date-only (YYYY-MM-DD) for all-day, full UTC datetime otherwise
  endDate: string;
  allDay: boolean;
}

export interface CalendarInfo {
  url: string;
  displayName: string;
  color: string;
  components: string[]; // e.g. ['VEVENT'] for calendars, ['VTODO'] for reminders
  ctag?: string;        // collection change tag (unused by frontend currently)
}

export interface CreateEventPayload {
  calendarUrl: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
}

export interface UpdateEventPayload {
  url: string;
  etag: string;
  calendarUrl: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
}
