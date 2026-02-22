export interface CalendarEvent {
  id: string;
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

export interface CalendarInfo {
  url: string;
  displayName: string;
  color: string;
  components: string[];
  ctag?: string;
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
