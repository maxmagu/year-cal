export interface CalendarEvent {
  id: string;
  url: string;
  etag: string;
  calendarUrl: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  allDay: boolean;
  icsData?: string;
}

export interface CalendarInfo {
  url: string;
  displayName: string;
  color: string;
  components: string[];
  ctag?: string;
}

export interface CreateEventBody {
  calendarUrl: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
}

export interface UpdateEventBody {
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

export interface DeleteEventBody {
  url: string;
  etag: string;
}
