// Typed wrappers around the backend REST API.
// All requests go through Vite's /api proxy → http://localhost:3000.
import type { CalendarInfo, CalendarEvent, CreateEventPayload, UpdateEventPayload, ExtractedEvent } from './types.js';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listCalendars(): Promise<CalendarInfo[]> {
    return fetchJson('/api/calendars');
  },

  listEvents(calendarUrl: string, year: number): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({ calendarUrl, year: String(year) });
    return fetchJson(`/api/events?${params}`);
  },

  createEvent(payload: CreateEventPayload): Promise<{ id: string }> {
    return fetchJson('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateEvent(payload: UpdateEventPayload): Promise<void> {
    return fetchJson('/api/events', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteEvent(url: string, etag: string): Promise<void> {
    return fetchJson('/api/events', {
      method: 'DELETE',
      body: JSON.stringify({ url, etag }),
    });
  },

  async importFile(file: File | null, text: string, year: number): Promise<ExtractedEvent[]> {
    const form = new FormData();
    if (file) form.append('file', file);
    if (text.trim()) form.append('text', text.trim());
    form.append('year', String(year));
    // No Content-Type header — browser sets multipart/form-data with boundary automatically
    const res = await fetch('/api/import', { method: 'POST', body: form });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HTTP ${res.status}: ${t}`);
    }
    const data = await res.json() as { events: ExtractedEvent[] };
    return data.events;
  },
};
