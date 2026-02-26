import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../caldav/client';
import { parseICalEvent, generateICalEvent } from '../caldav/icalUtils';
import type { CalendarEvent, CreateEventBody, UpdateEventBody, DeleteEventBody } from '../types/index';

export const eventsRouter = Router();

// GET /api/events?calendarUrl=...&year=2026
eventsRouter.get('/api/events', async (req, res) => {
  try {
    const calendarUrl = req.query.calendarUrl as string;
    const year = req.query.year as string;
    if (!calendarUrl || !year) {
      res.status(400).json({ error: 'Missing calendarUrl or year' });
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      res.status(400).json({ error: 'Invalid year' });
      return;
    }

    const client = await getClient();
    const objects = await client.fetchCalendarObjects({
      calendar: { url: calendarUrl },
      timeRange: {
        start: `${yearNum}-01-01T00:00:00Z`,
        end: `${yearNum + 1}-01-01T00:00:00Z`,
      },
    });

    const events: CalendarEvent[] = [];
    for (const obj of objects) {
      if (!obj.data) continue;
      const event = parseICalEvent(
        obj.data,
        obj.url,
        obj.etag ?? '',
        calendarUrl
      );
      if (event) events.push(event);
    }

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events
eventsRouter.post('/api/events', async (req, res) => {
  try {
    const { calendarUrl, summary, description, location, startDate, endDate, allDay } = req.body as CreateEventBody;
    const uid = uuidv4();
    const iCalString = generateICalEvent({ uid, summary, description, location, startDate, endDate, allDay });

    const client = await getClient();
    await client.createCalendarObject({
      calendar: { url: calendarUrl },
      iCalString,
      filename: `${uid}.ics`,
    });

    res.status(201).json({ id: uid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events
eventsRouter.put('/api/events', async (req, res) => {
  try {
    const { url, etag, calendarUrl, summary, description, location, startDate, endDate, allDay } = req.body as UpdateEventBody;

    // Fetch existing to get UID
    const client = await getClient();
    const existing = await client.fetchCalendarObjects({
      calendar: { url: calendarUrl },
      objectUrls: [url],
    });
    const obj = existing[0];
    if (!obj?.data) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const parsed = parseICalEvent(obj.data, url, etag, calendarUrl);
    const uid = parsed?.id ?? uuidv4();

    const iCalString = generateICalEvent({ uid, summary, description, location, startDate, endDate, allDay });

    await client.updateCalendarObject({
      calendarObject: { url, etag, data: iCalString },
    });

    res.json({ ok: true });
  } catch (err: unknown) {
    console.error(err);
    const status = (err as { status?: number }).status === 412 ? 412 : 500;
    res.status(status).json({ error: status === 412 ? 'ETag conflict' : 'Failed to update event' });
  }
});

// DELETE /api/events
eventsRouter.delete('/api/events', async (req, res) => {
  try {
    const { url, etag } = req.body as DeleteEventBody;
    const client = await getClient();
    await client.deleteCalendarObject({
      calendarObject: { url, etag },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});
