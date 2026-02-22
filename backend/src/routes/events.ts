import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../caldav/client.js';
import { parseICalEvent, generateICalEvent } from '../caldav/icalUtils.js';
import type { CalendarEvent, CreateEventBody, UpdateEventBody, DeleteEventBody } from '../types/index.js';

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/events?calendarUrl=...&year=2026
  app.get<{ Querystring: { calendarUrl: string; year: string } }>(
    '/api/events',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['calendarUrl', 'year'],
          properties: {
            calendarUrl: { type: 'string' },
            year: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const { calendarUrl, year } = req.query;
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum)) {
          return reply.status(400).send({ error: 'Invalid year' });
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

        return reply.send(events);
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to fetch events' });
      }
    }
  );

  // POST /api/events
  app.post<{ Body: CreateEventBody }>(
    '/api/events',
    {
      schema: {
        body: {
          type: 'object',
          required: ['calendarUrl', 'summary', 'startDate', 'endDate', 'allDay'],
          properties: {
            calendarUrl: { type: 'string' },
            summary: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            allDay: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const { calendarUrl, summary, description, location, startDate, endDate, allDay } = req.body;
        const uid = uuidv4();
        const iCalString = generateICalEvent({ uid, summary, description, location, startDate, endDate, allDay });

        const client = await getClient();
        await client.createCalendarObject({
          calendar: { url: calendarUrl },
          iCalString,
          filename: `${uid}.ics`,
        });

        return reply.status(201).send({ id: uid });
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to create event' });
      }
    }
  );

  // PUT /api/events
  app.put<{ Body: UpdateEventBody }>(
    '/api/events',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url', 'etag', 'calendarUrl', 'summary', 'startDate', 'endDate', 'allDay'],
          properties: {
            url: { type: 'string' },
            etag: { type: 'string' },
            calendarUrl: { type: 'string' },
            summary: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            allDay: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const { url, etag, calendarUrl, summary, description, location, startDate, endDate, allDay } = req.body;

        // Fetch existing to get UID
        const client = await getClient();
        const existing = await client.fetchCalendarObjects({
          calendar: { url: calendarUrl },
          objectUrls: [url],
        });
        const obj = existing[0];
        if (!obj?.data) {
          return reply.status(404).send({ error: 'Event not found' });
        }

        const parsed = parseICalEvent(obj.data, url, etag, calendarUrl);
        const uid = parsed?.id ?? uuidv4();

        const iCalString = generateICalEvent({ uid, summary, description, location, startDate, endDate, allDay });

        await client.updateCalendarObject({
          calendarObject: { url, etag, data: iCalString },
        });

        return reply.send({ ok: true });
      } catch (err: unknown) {
        app.log.error(err);
        const status = (err as { status?: number }).status === 412 ? 412 : 500;
        return reply.status(status).send({ error: status === 412 ? 'ETag conflict' : 'Failed to update event' });
      }
    }
  );

  // DELETE /api/events
  app.delete<{ Body: DeleteEventBody }>(
    '/api/events',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url', 'etag'],
          properties: {
            url: { type: 'string' },
            etag: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const { url, etag } = req.body;
        const client = await getClient();
        await client.deleteCalendarObject({
          calendarObject: { url, etag },
        });
        return reply.status(204).send();
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to delete event' });
      }
    }
  );
}
