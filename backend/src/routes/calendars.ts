import { Router } from 'express';
import { getClient } from '../caldav/client.js';
import type { CalendarInfo } from '../types/index.js';

export const calendarsRouter = Router();

calendarsRouter.get('/api/calendars', async (_req, res) => {
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

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});
