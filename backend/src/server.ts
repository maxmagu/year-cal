import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { calendarsRoutes } from './routes/calendars.js';
import { eventsRoutes } from './routes/events.js';

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(calendarsRoutes);
  await app.register(eventsRoutes);

  return app;
}
