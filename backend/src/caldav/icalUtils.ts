import ICAL from 'ical.js';
import icalGenerator from 'ical-generator';
import type { CalendarEvent } from '../types/index.js';

export function parseICalEvent(
  icsData: string,
  url: string,
  etag: string,
  calendarUrl: string
): CalendarEvent | null {
  try {
    const jcal = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent('vevent');
    if (!vevent) return null;

    const event = new ICAL.Event(vevent);
    const uid = event.uid;
    const summary = event.summary ?? '';
    const description = (vevent.getFirstPropertyValue('description') as string | null) ?? undefined;
    const location = (vevent.getFirstPropertyValue('location') as string | null) ?? undefined;

    const dtstart = event.startDate;
    const dtend = event.endDate;
    const allDay = dtstart.isDate;

    const startDate = allDay
      ? dtstart.toString()
      : dtstart.toJSDate().toISOString();

    // iCal all-day DTEND is exclusive (day after last day); subtract one day for display.
    let endDate: string;
    if (allDay) {
      // dtend.toString() yields 'YYYY-MM-DD'; use UTC arithmetic to avoid tz shift.
      const [y, m, d] = dtend.toString().split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d - 1));
      endDate = dt.toISOString().slice(0, 10);
    } else {
      endDate = dtend.toJSDate().toISOString();
    }

    return {
      id: uid,
      url,
      etag,
      calendarUrl,
      summary,
      description,
      location,
      startDate,
      endDate,
      allDay,
      icsData,
    };
  } catch (err) {
    console.error('Failed to parse iCal event:', err);
    return null;
  }
}

export function generateICalEvent(params: {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
}): string {
  const cal = icalGenerator({ name: 'YearCal' });
  let start: Date;
  let end: Date;
  if (params.allDay) {
    // Frontend sends 'YYYY-MM-DD'; parse as UTC to avoid server-tz shifting.
    const [sy, sm, sd] = params.startDate.slice(0, 10).split('-').map(Number);
    start = new Date(Date.UTC(sy, sm - 1, sd));
    // params.endDate is inclusive 'YYYY-MM-DD'; iCal DTEND is exclusive, so add one day.
    const [ey, em, ed] = params.endDate.slice(0, 10).split('-').map(Number);
    end = new Date(Date.UTC(ey, em - 1, ed + 1));
  } else {
    start = new Date(params.startDate);
    end = new Date(params.endDate);
  }
  cal.createEvent({
    id: params.uid,
    summary: params.summary,
    description: params.description,
    location: params.location,
    allDay: params.allDay,
    start,
    end,
  });
  return cal.toString();
}
