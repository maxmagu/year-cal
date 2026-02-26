import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';
import { calendarsRoutes } from './routes/calendars.js';
import { eventsRoutes } from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(calendarsRoutes);
  await app.register(eventsRoutes);

  // In production, serve the built frontend from frontend/dist/.
  // The SPA fallback ensures client-side routes return index.html.
  // In dev, Vite serves the frontend separately (no dist/ folder exists).
  const staticPath = join(__dirname, '../../frontend/dist');
  if (existsSync(staticPath)) {
    await app.register(fastifyStatic, { root: staticPath, wildcard: false });
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  return app;
}
