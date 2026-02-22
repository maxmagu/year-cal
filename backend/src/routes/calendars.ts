import type { FastifyInstance } from 'fastify';
import { getClient } from '../caldav/client.js';
import type { CalendarInfo } from '../types/index.js';

export async function calendarsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/calendars', async (_req, reply) => {
    try {
      const client = await getClient();
      const calendars = await client.fetchCalendars();

      const result: CalendarInfo[] = calendars.map((cal) => ({
        url: cal.url,
        displayName: (cal.displayName as string | undefined) ?? cal.url,
        color: ((cal.calendarColor as string | undefined) ?? '#4A90E2').slice(0, 7),
        components: (cal.components as string[] | undefined) ?? [],
        ctag: cal.ctag as string | undefined,
      }));

      return reply.send(result);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch calendars' });
    }
  });
}
